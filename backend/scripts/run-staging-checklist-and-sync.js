#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const backendDir = path.resolve(__dirname, '..');

const docsRootCandidates = [
    path.join(repoRoot, '.github', 'docs'),
    path.join(repoRoot, 'docs')
];

const docsRoot = docsRootCandidates.find((dir) => fs.existsSync(dir));
if (!docsRoot) {
    console.error('No docs directory found. Expected .github/docs or docs at repository root.');
    process.exit(1);
}

const checklistPath = path.join(docsRoot, 'staging-rollout-checklist-execution.md');
if (!fs.existsSync(checklistPath)) {
    console.error(`Checklist file not found: ${checklistPath}`);
    process.exit(1);
}

const evidenceDir = path.join(docsRoot, 'evidence');
fs.mkdirSync(evidenceDir, { recursive: true });

const now = new Date();
const timestampIso = now.toISOString();
const timestampFile = timestampIso.replace(/[:]/g, '-').replace(/\..+$/, 'Z');

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = ['run', 'checklist:staging'];

const run = spawnSync(command, args, {
    cwd: backendDir,
    env: process.env,
    encoding: 'utf8'
});

const stdout = run.stdout || '';
const stderr = run.stderr || '';
const mergedOutput = [stdout, stderr].filter(Boolean).join('\n');
const exitCode = typeof run.status === 'number' ? run.status : 1;

const checks = {
    health: parseCheck(mergedOutput, 'GET \\/api\\/health'),
    forgotPassword: parseCheck(mergedOutput, 'POST \\/api\\/auth\\/forgot-password'),
    verifyResetOtp: parseCheck(mergedOutput, 'POST \\/api\\/auth\\/verify-reset-otp returns 429 after threshold'),
    shiprocket503: parseCheck(mergedOutput, 'POST \\/webhooks\\/shiprocket missing secret returns 503'),
    shiprocket400: parseCheck(mergedOutput, 'POST \\/webhooks\\/shiprocket invalid signature')
};

const evidenceName = `staging-checklist-${timestampFile}.md`;
const evidencePath = path.join(evidenceDir, evidenceName);
const evidenceRelPath = path.relative(repoRoot, evidencePath).split(path.sep).join('/');

const evidence = [
    '# Staging Checklist Evidence Report',
    '',
    `- Timestamp (UTC): ${timestampIso}`,
    `- Command: npm run checklist:staging`,
    `- Exit code: ${exitCode}`,
    `- Docs root: ${path.relative(repoRoot, docsRoot)}`,
    '',
    '## Parsed Results',
    '',
    `- GET /api/health returns 200: ${formatStatus(checks.health)}`,
    `- POST /api/auth/forgot-password works for valid test user: ${formatStatus(checks.forgotPassword)}`,
    `- POST /api/auth/verify-reset-otp returns 429 after threshold: ${formatStatus(checks.verifyResetOtp)}`,
    `- POST /webhooks/shiprocket returns 503 when secret intentionally unset in staging test run: ${formatStatus(checks.shiprocket503)}`,
    `- POST /webhooks/shiprocket returns 400 for bad signature when secret is set: ${formatStatus(checks.shiprocket400)}`,
    '',
    '## Raw Output',
    '',
    '```text',
    mergedOutput.trim() || '(no output)',
    '```',
    ''
].join('\n');

fs.writeFileSync(evidencePath, evidence, 'utf8');

let checklist = fs.readFileSync(checklistPath, 'utf8');
checklist = updateSectionBCheckboxes(checklist, checks);
checklist = updateExecutionStatus(checklist, timestampIso, exitCode, evidenceRelPath);
fs.writeFileSync(checklistPath, checklist, 'utf8');

console.log(`Evidence written: ${evidenceRelPath}`);
console.log(`Checklist updated: ${path.relative(repoRoot, checklistPath)}`);
console.log(`Checklist command exit code: ${exitCode}`);

process.exit(exitCode);

function parseCheck(output, escapedLabel) {
    const passRe = new RegExp(`\\[PASS\\]\\s+${escapedLabel}`, 'i');
    const failRe = new RegExp(`\\[FAIL\\]\\s+${escapedLabel}`, 'i');
    if (passRe.test(output)) return 'pass';
    if (failRe.test(output)) return 'fail';
    return 'unknown';
}

function formatStatus(status) {
    if (status === 'pass') return 'PASS';
    if (status === 'fail') return 'FAIL';
    return 'NOT EXECUTED';
}

function replaceCheckboxLine(markdown, contains, status) {
    if (status === 'unknown') return markdown;
    const mark = status === 'pass' ? 'x' : ' ';
    const lines = markdown.split('\n');
    const idx = lines.findIndex((line) => line.includes(contains));
    if (idx >= 0) {
        lines[idx] = lines[idx].replace(/^- \[[ x]\]/, `- [${mark}]`);
    }
    return lines.join('\n');
}

function updateSectionBCheckboxes(markdown, results) {
    let next = markdown;
    next = replaceCheckboxLine(next, '`GET /api/health` returns 200', results.health);
    next = replaceCheckboxLine(next, '`POST /api/auth/forgot-password` works for valid test user', results.forgotPassword);
    next = replaceCheckboxLine(next, '`POST /api/auth/verify-reset-otp` returns 429 after threshold', results.verifyResetOtp);
    next = replaceCheckboxLine(next, '`POST /webhooks/shiprocket` returns 503 when secret intentionally unset in staging test run', results.shiprocket503);
    next = replaceCheckboxLine(next, '`POST /webhooks/shiprocket` returns 400 for bad signature when secret is set', results.shiprocket400);
    return next;
}

function updateExecutionStatus(markdown, iso, exitCode, evidenceRelPath) {
    const statusText = exitCode === 0 ? 'PASS' : 'FAIL';
    const line = `Execution status (${iso}): ${statusText}. Evidence: ${evidenceRelPath}`;
    return markdown.replace(
        /^Execution status \([^\n]+\):[^\n]*$/m,
        line
    );
}

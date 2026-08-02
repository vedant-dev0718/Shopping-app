import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const appBaselineDir = path.join(rootDir, "qa", "ui-regression", "screenshots", "baseline", "app");
const appCurrentDir = path.join(rootDir, "qa", "ui-regression", "screenshots", "current", "app");
const stitchCurrentDir = path.join(rootDir, "qa", "ui-regression", "screenshots", "current", "stitch");
const diffDir = path.join(rootDir, "qa", "ui-regression", "diff");

fs.mkdirSync(diffDir, { recursive: true });

const pairs = [
    { name: "buyer_app_vs_baseline", expected: path.join(appBaselineDir, "buyer.png"), actual: path.join(appCurrentDir, "buyer.png") },
    { name: "seller_app_vs_baseline", expected: path.join(appBaselineDir, "seller.png"), actual: path.join(appCurrentDir, "seller.png") },
    { name: "admin_app_vs_baseline", expected: path.join(appBaselineDir, "admin.png"), actual: path.join(appCurrentDir, "admin.png") },
    { name: "buyer_app_vs_stitch", expected: path.join(stitchCurrentDir, "buyer.png"), actual: path.join(appCurrentDir, "buyer.png") },
    { name: "seller_app_vs_stitch", expected: path.join(stitchCurrentDir, "seller.png"), actual: path.join(appCurrentDir, "seller.png") },
];

const summary = [];

async function loadPngNormalized(inputPath, width, height) {
    const buf = await sharp(inputPath).resize(width, height, { fit: "fill" }).png().toBuffer();
    return PNG.sync.read(buf);
}

for (const pair of pairs) {
    if (!fs.existsSync(pair.expected) || !fs.existsSync(pair.actual)) {
        summary.push({ name: pair.name, status: "skipped", reason: "missing_input" });
        console.log(`[skip] ${pair.name} (missing input)`);
        continue;
    }

    const expectedMeta = await sharp(pair.expected).metadata();
    const width = expectedMeta.width;
    const height = expectedMeta.height;

    if (!width || !height) {
        summary.push({ name: pair.name, status: "skipped", reason: "invalid_expected_image" });
        continue;
    }

    const expectedPng = await loadPngNormalized(pair.expected, width, height);
    const actualPng = await loadPngNormalized(pair.actual, width, height);
    const diffPng = new PNG({ width, height });

    const mismatched = pixelmatch(
        expectedPng.data,
        actualPng.data,
        diffPng.data,
        width,
        height,
        { threshold: 0.1 }
    );

    const totalPixels = width * height;
    const mismatchPct = Number(((mismatched / totalPixels) * 100).toFixed(2));
    const diffPath = path.join(diffDir, `${pair.name}.png`);
    fs.writeFileSync(diffPath, PNG.sync.write(diffPng));

    summary.push({
        name: pair.name,
        status: "ok",
        mismatchedPixels: mismatched,
        totalPixels,
        mismatchPct,
        diffPath,
    });

    console.log(`[ok] ${pair.name}: ${mismatchPct}% mismatch`);
}

const summaryPath = path.join(diffDir, "summary.json");
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`[done] Comparison summary: ${summaryPath}`);

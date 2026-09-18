import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const baselineDir = path.join(rootDir, "qa", "ui-regression", "screenshots", "baseline", "seller");
const currentDir = path.join(rootDir, "qa", "ui-regression", "screenshots", "current", "seller");
const stitchDir = path.join(rootDir, "qa", "ui-regression", "screenshots", "current", "stitch-seller");
const diffDir = path.join(rootDir, "qa", "ui-regression", "diff", "seller");
const hardGatePct = Number(process.env.BASELINE_THRESHOLD_PCT || "1.0");

fs.mkdirSync(diffDir, { recursive: true });

const checkpoints = ["dashboard", "insights", "orders", "products", "returns", "upload_reel"];
const pairs = [];
for (const checkpoint of checkpoints) {
    pairs.push({
        name: `seller_${checkpoint}_app_vs_baseline`,
        expected: path.join(baselineDir, `${checkpoint}.png`),
        actual: path.join(currentDir, `${checkpoint}.png`),
        gate: "hard",
    });
    pairs.push({
        name: `seller_${checkpoint}_app_vs_stitch`,
        expected: path.join(stitchDir, `${checkpoint}.png`),
        actual: path.join(currentDir, `${checkpoint}.png`),
        gate: "soft",
    });
}

async function loadPngNormalized(inputPath, width, height) {
    const buf = await sharp(inputPath).resize(width, height, { fit: "fill" }).png().toBuffer();
    return PNG.sync.read(buf);
}

const summary = [];
let hardGateFailed = false;

for (const pair of pairs) {
    if (!fs.existsSync(pair.expected) || !fs.existsSync(pair.actual)) {
        summary.push({ name: pair.name, status: "skipped", reason: "missing_input", gate: pair.gate });
        console.log(`[skip] ${pair.name} missing input`);
        continue;
    }

    const expectedMeta = await sharp(pair.expected).metadata();
    const width = expectedMeta.width;
    const height = expectedMeta.height;
    if (!width || !height) {
        summary.push({ name: pair.name, status: "skipped", reason: "invalid_expected_image", gate: pair.gate });
        continue;
    }

    const expected = await loadPngNormalized(pair.expected, width, height);
    const actual = await loadPngNormalized(pair.actual, width, height);
    const diff = new PNG({ width, height });

    const mismatchedPixels = pixelmatch(expected.data, actual.data, diff.data, width, height, { threshold: 0.1 });
    const totalPixels = width * height;
    const mismatchPct = Number(((mismatchedPixels / totalPixels) * 100).toFixed(2));

    const diffPath = path.join(diffDir, `${pair.name}.png`);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    if (pair.gate === "hard" && mismatchPct > hardGatePct) {
        hardGateFailed = true;
    }

    summary.push({
        name: pair.name,
        status: "ok",
        gate: pair.gate,
        mismatchedPixels,
        totalPixels,
        mismatchPct,
        thresholdPct: pair.gate === "hard" ? hardGatePct : null,
        pass: pair.gate === "hard" ? mismatchPct <= hardGatePct : true,
        diffPath,
    });

    console.log(`[ok] ${pair.name}: ${mismatchPct}% mismatch`);
}

const summaryPath = path.join(diffDir, "summary.json");
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`[done] seller comparison summary: ${summaryPath}`);

if (hardGateFailed) {
    console.error(`[fail] Seller hard gate breached. baseline mismatch exceeded ${hardGatePct}% on at least one checkpoint.`);
    process.exit(2);
}

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const baselineDir = path.join(rootDir, "qa", "ui-regression", "screenshots", "baseline", "seller-e2e");
const currentDir = path.join(rootDir, "qa", "ui-regression", "screenshots", "current", "seller-e2e");
const stitchDir = path.join(rootDir, "qa", "ui-regression", "screenshots", "current", "stitch-seller-e2e");
const diffDir = path.join(rootDir, "qa", "ui-regression", "diff", "seller-e2e");
const hardGatePct = Number(process.env.BASELINE_THRESHOLD_PCT || "1.0");
const stitchGatePct = process.env.STITCH_THRESHOLD_PCT ? Number(process.env.STITCH_THRESHOLD_PCT) : null;
const appCropTopPx = Number(process.env.APP_CROP_TOP_PX || "96");
const appCropBottomPx = Number(process.env.APP_CROP_BOTTOM_PX || "120");
const uploadCropTopPx = Number(process.env.UPLOAD_APP_CROP_TOP_PX || "220");
const uploadCropBottomPx = Number(process.env.UPLOAD_APP_CROP_BOTTOM_PX || "220");

fs.mkdirSync(diffDir, { recursive: true });

const checkpoints = ["auth_login", "dashboard", "insights", "orders", "products", "returns", "upload_reel"];
const pairs = [];
for (const checkpoint of checkpoints) {
    pairs.push({
        name: `seller_e2e_${checkpoint}_app_vs_baseline`,
        expected: path.join(baselineDir, `${checkpoint}.png`),
        actual: path.join(currentDir, `${checkpoint}.png`),
        gate: "hard",
    });
    pairs.push({
        name: `seller_e2e_${checkpoint}_app_vs_stitch`,
        expected: path.join(stitchDir, `${checkpoint}.png`),
        actual: path.join(currentDir, `${checkpoint}.png`),
        gate: stitchGatePct === null ? "soft" : "stitch-hard",
    });
}

function shouldCropSystemBars(inputPath) {
    return inputPath.includes(`${path.sep}screenshots${path.sep}baseline${path.sep}seller-e2e${path.sep}`)
        || inputPath.includes(`${path.sep}screenshots${path.sep}current${path.sep}seller-e2e${path.sep}`);
}

function resolveCropForInput(inputPath) {
    if (inputPath.endsWith(`${path.sep}upload_reel.png`)) {
        return { top: uploadCropTopPx, bottom: uploadCropBottomPx };
    }
    return { top: appCropTopPx, bottom: appCropBottomPx };
}

async function loadPngNormalized(inputPath, width, height) {
    let pipeline = sharp(inputPath);
    if (shouldCropSystemBars(inputPath)) {
        const meta = await pipeline.metadata();
        const srcWidth = meta.width || width;
        const srcHeight = meta.height || height;
        const crop = resolveCropForInput(inputPath);
        const cropTop = Math.min(crop.top, Math.max(srcHeight - 1, 0));
        const cropBottom = Math.min(crop.bottom, Math.max(srcHeight - cropTop - 1, 0));
        const cropHeight = Math.max(1, srcHeight - cropTop - cropBottom);
        pipeline = pipeline.extract({ left: 0, top: cropTop, width: srcWidth, height: cropHeight });
    }

    const buf = await pipeline.resize(width, height, { fit: "fill" }).png().toBuffer();
    return PNG.sync.read(buf);
}

const summary = [];
let hardGateFailed = false;
let stitchGateFailed = false;

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

    let pass = true;
    if (pair.gate === "hard") {
        pass = mismatchPct <= hardGatePct;
        if (!pass) hardGateFailed = true;
    } else if (pair.gate === "stitch-hard") {
        pass = mismatchPct <= stitchGatePct;
        if (!pass) stitchGateFailed = true;
    }

    summary.push({
        name: pair.name,
        status: "ok",
        gate: pair.gate,
        mismatchedPixels,
        totalPixels,
        mismatchPct,
        thresholdPct: pair.gate === "hard" ? hardGatePct : stitchGatePct,
        pass,
        diffPath,
    });

    console.log(`[ok] ${pair.name}: ${mismatchPct}% mismatch`);
}

const summaryPath = path.join(diffDir, "summary.json");
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`[done] seller e2e comparison summary: ${summaryPath}`);

if (hardGateFailed) {
    console.error(`[fail] Seller e2e hard gate breached. Baseline mismatch exceeded ${hardGatePct}% on at least one checkpoint.`);
    process.exit(2);
}

if (stitchGateFailed) {
    console.error(`[fail] Seller e2e stitch gate breached. Stitch mismatch exceeded ${stitchGatePct}% on at least one checkpoint.`);
    process.exit(3);
}

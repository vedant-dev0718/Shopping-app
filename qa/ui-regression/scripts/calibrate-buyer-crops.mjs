import sharp from "sharp";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const checkpoints = process.argv.slice(2);
if (checkpoints.length === 0) {
    console.error("Usage: node scripts/calibrate-buyer-crops.mjs <checkpoint> [checkpoint...]");
    process.exit(1);
}

async function mismatchPct({ appPath, stitchPath, appTop, appBottom, stitchTop, stitchBottom }) {
    const appMeta = await sharp(appPath).metadata();
    const stitchMeta = await sharp(stitchPath).metadata();
    const appHeight = (appMeta.height || 0) - appTop - appBottom;
    const stitchHeight = (stitchMeta.height || 0) - stitchTop - stitchBottom;
    if (appHeight < 200 || stitchHeight < 200) return Number.POSITIVE_INFINITY;

    const appBuf = await sharp(appPath)
        .extract({ left: 0, top: appTop, width: appMeta.width || 390, height: appHeight })
        .resize(390, 844, { fit: "fill" })
        .png()
        .toBuffer();

    const stitchBuf = await sharp(stitchPath)
        .extract({ left: 0, top: stitchTop, width: stitchMeta.width || 390, height: stitchHeight })
        .resize(390, 844, { fit: "fill" })
        .png()
        .toBuffer();

    const app = PNG.sync.read(appBuf);
    const stitch = PNG.sync.read(stitchBuf);
    const diff = new PNG({ width: 390, height: 844 });
    const mismatched = pixelmatch(stitch.data, app.data, diff.data, 390, 844, { threshold: 0.1 });
    return (mismatched / (390 * 844)) * 100;
}

for (const cp of checkpoints) {
    const appPath = `screenshots/current/buyer-e2e/${cp}.png`;
    const stitchPath = `screenshots/current/stitch-buyer-e2e/${cp}.png`;
    let best = { pct: Number.POSITIVE_INFINITY, appTop: 96, appBottom: 120, stitchTop: 0, stitchBottom: 0 };

    for (let appTop = 60; appTop <= 260; appTop += 20) {
        for (let appBottom = 60; appBottom <= 360; appBottom += 20) {
            for (let stitchTop = 0; stitchTop <= 180; stitchTop += 20) {
                for (let stitchBottom = 0; stitchBottom <= 220; stitchBottom += 20) {
                    const pct = await mismatchPct({ appPath, stitchPath, appTop, appBottom, stitchTop, stitchBottom });
                    if (pct < best.pct) {
                        best = { pct, appTop, appBottom, stitchTop, stitchBottom };
                    }
                }
            }
        }
    }

    console.log(`${cp}: ${best.pct.toFixed(2)}% appTop=${best.appTop} appBottom=${best.appBottom} stitchTop=${best.stitchTop} stitchBottom=${best.stitchBottom}`);
}
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.join(rootDir, "qa", "ui-regression", "screenshots", "current", "stitch");

fs.mkdirSync(outDir, { recursive: true });

const targets = [
    {
        name: "buyer",
        htmlPath: path.join(rootDir, "stitch_notwhat_design_system_onboarding", "buyer_home_screen", "code.html"),
    },
    {
        name: "seller",
        htmlPath: path.join(rootDir, "stitch_notwhat_design_system_onboarding", "seller_dashboard", "code.html"),
    },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

for (const target of targets) {
    if (!fs.existsSync(target.htmlPath)) {
        console.warn(`[skip] Missing stitch file: ${target.htmlPath}`);
        continue;
    }

    const url = `file://${target.htmlPath}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(outDir, `${target.name}.png`), fullPage: true });
    console.log(`[ok] Captured stitch screenshot: ${target.name}`);
}

await browser.close();
console.log(`[done] Stitch screenshots saved in ${outDir}`);

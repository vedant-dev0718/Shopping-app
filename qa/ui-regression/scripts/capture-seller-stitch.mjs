import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.join(rootDir, "qa", "ui-regression", "screenshots", "current", "stitch-seller");

fs.mkdirSync(outDir, { recursive: true });

const targets = [
    { name: "dashboard", html: "seller_dashboard/code.html" },
    { name: "insights", html: "seller_insights_analytics/code.html" },
    { name: "orders", html: "seller_orders_management/code.html" },
    { name: "products", html: "seller_products_list/code.html" },
    { name: "returns", html: "returns_refunds/code.html" },
    { name: "upload_reel", html: "upload_reel/code.html" },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

for (const target of targets) {
    const htmlPath = path.join(rootDir, "stitch_notwhat_design_system_onboarding", target.html);
    if (!fs.existsSync(htmlPath)) {
        console.warn(`[skip] missing stitch file for ${target.name}: ${htmlPath}`);
        continue;
    }

    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(outDir, `${target.name}.png`), fullPage: true });
    console.log(`[ok] captured stitch seller ${target.name}`);
}

await browser.close();
console.log(`[done] stitch seller screenshots saved in ${outDir}`);

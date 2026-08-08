import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const outDir = path.join(rootDir, "qa", "ui-regression", "screenshots", "current", "stitch-buyer-e2e");

fs.mkdirSync(outDir, { recursive: true });

const targets = [
    { name: "auth_login", html: "login/code.html" },
    { name: "home", html: "buyer_home_screen/code.html" },
    { name: "search", html: "search_hub/code.html" },
    { name: "bargains", html: "reels_feed/code.html" },
    { name: "cart", html: "cart/code.html" },
    { name: "store_profile", html: "store_profile/code.html" },
    { name: "accepted_bid_bargains", html: "active_bargains/code.html" },
    { name: "accepted_bid_cart", html: "cart/code.html" },
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
    await page.screenshot({ path: path.join(outDir, `${target.name}.png`), fullPage: false });
    console.log(`[ok] captured stitch buyer e2e ${target.name}`);
}

await browser.close();
console.log(`[done] stitch buyer e2e screenshots saved in ${outDir}`);

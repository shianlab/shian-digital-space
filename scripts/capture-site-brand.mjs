import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
try {
    fs.mkdirSync('public/images/share', { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:5175/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('.preloader').waitFor({ state: 'hidden', timeout: 60000 });
    const entry = page.getByRole('button', { name: '进入时安的数字空间', exact: true });
    await entry.focus(); await entry.press('Enter');
    await page.getByRole('button', { name: '打开地图', exact: true }).waitFor();
    await page.waitForTimeout(4500);
    // Capture the real approved scene; hide only navigation chrome for the share card.
    await page.addStyleTag({ content: '.navigation-ui,.achievement-popup,.sr-overlay { visibility:hidden!important; }' });
    await page.screenshot({ path: 'public/images/share/shian-digital-space.png' });
    await page.close();
    const icon = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
    await icon.setContent('<style>html,body{margin:0}</style>' + fs.readFileSync('.cache/brand/icon-source.svg','utf8'));
    await icon.screenshot({ path: 'public/images/brand/shian-touch-icon.png' });
    await icon.close();
    fs.writeFileSync('.cache/brand/brand-provenance.json', JSON.stringify({
        share: { source: 'actual local corridor screenshot', width: 1200, height: 630 },
        icon: { source: 'approved corridor/05.webp embedded in an SVG viewport', width: 180, height: 180 },
    }, null, 2));
    console.log('Captured actual 1200×630 scene and 180×180 approved-IP touch icon.');
} finally { await browser.close(); }


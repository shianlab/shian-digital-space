import fs from 'node:fs';

const base = process.env.SHIAN_SITE_TEST_URL;
if (!base?.startsWith('https://') || !base.endsWith('.tcloudbaseapp.com')) {
    throw new Error('Provide the exact verified CloudBase test origin in SHIAN_SITE_TEST_URL');
}
const out = 'docs/planning/materials/cloudbase-deployment-2026-10-07/browser';
fs.mkdirSync(out, { recursive: true });

// Reuse the room, history, content and no-JS checks against the real deployment.
// Accept the platform notice with its normal UI; share only that visitor consent
// between test contexts, including contexts with JavaScript disabled.
let source = fs.readFileSync('scripts/check-stage-thirteen-browser.mjs', 'utf8')
    .replaceAll('docs/planning/materials/stage-13', out)
    .replace('let active;', `let active;
// The platform notice has its own HTTP status. Visit it before attaching the
// application error listeners, and record it separately instead of hiding errors.
const consentPage = await browser.newPage();
const noticeResponse = await consentPage.goto(base, {waitUntil:'domcontentloaded', timeout:120000});
const notice = consentPage.getByRole('button', {name:/确定访问/});
report.platformNotice = {status:noticeResponse.status(), title:await consentPage.title(), accepted:false};
if (await notice.isVisible()) {
    assert.match(report.platformNotice.title, /风险提醒|页面访问提示/);
    await consentPage.waitForFunction(() => [...document.querySelectorAll('button')]
        .some(button => button.textContent.trim() === '确定访问' && !button.disabled),
        undefined, {timeout:15000});
    await notice.click();
    await consentPage.getByRole('button', {name:'进入时安的数字空间', exact:true})
        .waitFor({timeout:120000});
    report.platformNotice.accepted = true;
}
const consentCookies = (await consentPage.context().cookies(base))
    .filter(cookie => cookie.name === 'cloudbase_confirm_domain_access');
assert.ok(consentCookies.length, 'platform visitor consent must be obtained through its UI');
await consentPage.close();`)
    .replace('const page = await browser.newPage(options);', `
    const page = await browser.newPage(options);
    if (consentCookies.length) await page.context().addCookies(consentCookies);
    `)
    .replaceAll('timeout: 60000', 'timeout: 120000');
source = source.replace(/from '([^']+)'/g, (_, module) =>
    `from '${module.startsWith('node:') ? module : import.meta.resolve(module)}'`);
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

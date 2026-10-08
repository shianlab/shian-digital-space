import fs from 'node:fs';

if (process.env.SHIAN_SITE_TEST_URL !== 'https://www.shian.life') {
    throw new Error('The custom-domain inspection must use the confirmed https://www.shian.life origin');
}
const out = 'docs/planning/materials/cloudbase-deployment-2026-10-07/custom-browser';
fs.mkdirSync(out, {recursive:true});
// Ordinary browser DNS and TLS; no resolver override, certificate bypass or
// default-domain consent cookie is used for formal-domain acceptance.
let source = fs.readFileSync('scripts/check-stage-thirteen-browser.mjs', 'utf8')
    .replaceAll('docs/planning/materials/stage-13', out)
    .replaceAll('timeout: 60000', 'timeout: 120000');
source = source.replace(/from '([^']+)'/g, (_, module) =>
    `from '${module.startsWith('node:') ? module : import.meta.resolve(module)}'`);
await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const manifest = JSON.parse(fs.readFileSync('public/textures/shian/manifest.json', 'utf8'));
const records = [];
function walk(value) {
    if (!value || typeof value !== 'object') return;
    if (value.url && value.sha256) records.push(value);
    else for (const item of Object.values(value)) walk(item);
}
walk(manifest);
const assets = records.map(item => {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(`public${item.url}`)).digest('hex');
    assert.equal(hash, item.sha256, item.url);
    return { url: item.url, unchanged: true };
});
assert.equal(assets.length, 11);
const sign = 'public/textures/shian/entrance/sign-blank.webp';
const meta = await sharp(sign).metadata();
assert.equal(meta.hasAlpha, true);
const decoded = await sharp(sign).ensureAlpha().raw().toBuffer();
const master = await sharp('docs/planning/materials/stage-07/sign-blank.png').ensureAlpha().raw().toBuffer();
assert.equal(decoded.length, master.length);
let visibleDifferences = 0, alphaDifferences = 0;
// Lossless WebP may discard RGB beneath fully transparent pixels; those colors are invisible.
for (let i = 0; i < master.length; i += 4) {
    if (decoded[i + 3] !== master[i + 3]) alphaDifferences++;
    if (master[i + 3] > 0 && (decoded[i] !== master[i] || decoded[i + 1] !== master[i + 1] || decoded[i + 2] !== master[i + 2])) visibleDifferences++;
}
assert.equal(alphaDifferences, 0);
assert.equal(visibleDifferences, 0);
fs.writeFileSync('docs/planning/materials/stage-07/asset-inspection.json', JSON.stringify({
    assets, sign: { width: meta.width, height: meta.height, alpha: meta.hasAlpha, alphaDifferences, visibleDifferences, bytes: fs.statSync(sign).size },
}, null, 2));
console.log('PASS: 11 unchanged Stage 5 IP assets; blank sign preserves alpha and all visible pixels.');

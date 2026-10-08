// Extract the pixels of the user's approved B sample, without redrawing glyphs.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const source = process.argv[2];
if (!source) throw Error('Pass the approved B sample PNG path.');
const out = 'public/textures/shian/handwriting';
fs.mkdirSync(out, { recursive: true });
const crops = {
    'digital-space': [907, 125, 761, 145],
    gallery: [907, 302, 267, 99],
    studio: [1210, 302, 276, 103],
    about: [907, 405, 247, 99],
    contact: [1180, 405, 250, 100],
    'llm-engineer': [907, 540, 328, 65],
    'software-engineer': [907, 606, 367, 73],
    'content-creator': [907, 678, 283, 73],
};
const manifest = {
    direction: 'B', method: 'exact bitmap crop and paper-to-alpha extraction; no glyph synthesis',
    sourceSHA256: crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
    assets: {},
};
for (const [name, [left, top, width, height]] of Object.entries(crops)) {
    const { data } = await sharp(source).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const rgba = Buffer.alloc(width * height * 4);
    let xMin = width, xMax = 0, yMin = height, yMax = 0;
    for (let i = 0; i < width * height; i++) {
        const gray = (data[i * 3] + data[i * 3 + 1] + data[i * 3 + 2]) / 3;
        // The source paper is ~245; recover a tintable ink mask with soft edges.
        const alpha = Math.max(0, Math.min(255, Math.round((238 - gray) / 238 * 255)));
        rgba.fill(255, i * 4, i * 4 + 3);
        rgba[i * 4 + 3] = alpha;
        if (alpha > 16) {
            const x = i % width, y = Math.floor(i / width);
            xMin = Math.min(xMin, x); xMax = Math.max(xMax, x);
            yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
        }
    }
    const padding = 3;
    const cut = { left: Math.max(0, xMin - padding), top: Math.max(0, yMin - padding),
        width: Math.min(width, xMax + padding + 1) - Math.max(0, xMin - padding),
        height: Math.min(height, yMax + padding + 1) - Math.max(0, yMin - padding) };
    const target = path.join(out, name + '.png');
    await sharp(rgba, { raw: { width, height, channels: 4 } }).extract(cut).png().toFile(target);
    manifest.assets[name] = { width: cut.width, height: cut.height, crop: { left, top, width, height }, bytes: fs.statSync(target).size };
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));

// Format packaging and read-only pixel checks. Artwork is created with image_gen.
// No cropping, resizing, retouching, recoloring, compositing or motion synthesis.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const masters = 'docs/planning/materials/stage-05/masters';
const output = 'public/textures/shian';
// Order observed hand positions, rather than assuming generated angles are exact.
const sourceOrder = [3, 2, 4, 1, 5, 6, 7, 8, 9];
const report = { checks: [], files: [], artworkTool: 'built-in image_gen', packaging: 'lossless WebP, original dimensions and alpha' };

async function readPixels(file) {
    return sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function bounds(data, width, height, threshold, yStart = 0) {
    let left = width, top = height, right = -1, bottom = -1;
    for (let y = yStart; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] < threshold) continue;
            left = Math.min(left, x); top = Math.min(top, y);
            right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
    }
    return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}

async function pack(sourceName, destination, kind) {
    const source = `${masters}/${sourceName}`;
    const target = `${output}/${destination}`;
    const sourcePath = path.join(root, source);
    const { data, info } = await readPixels(sourcePath);
    const box = bounds(data, info.width, info.height, 32);
    const solidBox = bounds(data, info.width, info.height, 240);
    let zero = 0, nonzero = 0, nearlyOpaque = 0, edgeVisible = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        const alpha = data[(y * info.width + x) * 4 + 3];
        if (alpha === 0) zero++; else nonzero++;
        if (alpha >= 250) nearlyOpaque++;
        if ((x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) && alpha >= 32) edgeVisible++;
    }
    assert.ok(zero / (info.width * info.height) > 0.2, `${sourceName}: real exterior alpha required`);
    assert.equal(edgeVisible, 0, `${sourceName}: silhouette touches the canvas edge`);
    assert.ok(nearlyOpaque / nonzero > 0.8, `${sourceName}: character interiors must remain filled`);
    await fs.mkdir(path.dirname(path.join(root, target)), { recursive: true });
    await sharp(sourcePath).webp({ lossless: true, effort: 6 }).toFile(path.join(root, target));
    const decoded = await readPixels(path.join(root, target));
    assert.equal(decoded.info.width, info.width);
    assert.equal(decoded.info.height, info.height);
    let alphaDifferences = 0, visibleRgbDifferences = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] !== decoded.data[i + 3]) alphaDifferences++;
        if (data[i + 3] > 0 && (data[i] !== decoded.data[i] || data[i + 1] !== decoded.data[i + 1] || data[i + 2] !== decoded.data[i + 2])) visibleRgbDifferences++;
    }
    assert.equal(alphaDifferences, 0, `${sourceName}: alpha changed during encoding`);
    assert.equal(visibleRgbDifferences, 0, `${sourceName}: visible RGB changed during lossless encoding`);
    const buffer = await fs.readFile(path.join(root, target));
    const entry = {
        kind, url: `/textures/shian/${destination}`, png: `/${source}`,
        width: info.width, height: info.height, aspectRatio: info.width / info.height,
        visibleBounds: box, solidBounds: solidBox, bytes: buffer.length,
        sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    };
    if (kind === 'wave') {
        const foot = bounds(data, info.width, info.height, 240, Math.floor(info.height * 0.88));
        entry.footAnchor = { x: (foot.left + foot.right) / 2, y: foot.bottom };
        let handX = 0, handY = 0, samples = 0;
        for (let y = 280; y < 420; y++) for (let x = 840; x < 1040; x++) {
            if (data[(y * info.width + x) * 4 + 3] < 200) continue;
            handX += x; handY += y; samples++;
        }
        entry.handCentroid = { x: handX / samples, y: handY / samples };
        entry.gestureSortAngle = Math.atan2(entry.handCentroid.x - 917, 434 - entry.handCentroid.y) * 180 / Math.PI;
    }
    report.files.push({ source, output: target, width: info.width, height: info.height, transparentPixels: zero, nearOpaqueInteriorFraction: nearlyOpaque / nonzero, visibleEdgePixels: edgeVisible, alphaDifferences, visibleRgbDifferences, bytes: buffer.length });
    return entry;
}

const frames = [];
for (const [index, sourceNumber] of sourceOrder.entries()) {
    frames.push({
        index: index + 1, sourceNumber,
        ...await pack(`wave-${String(sourceNumber).padStart(2, '0')}.png`, `corridor/${String(index + 1).padStart(2, '0')}.webp`, 'wave'),
    });
}
const windowAsset = await pack('window-peek-final.png', 'entrance/window-peek.webp', 'window');
const cloudAsset = await pack('cloud-rest-final.png', 'about/cloud-rest.webp', 'cloud');
assert.ok(frames.every(frame => frame.width === 1254 && frame.height === 1254));
const spread = values => Math.max(...values) - Math.min(...values);
report.stability = {
    soleSpreadPx: spread(frames.map(f => f.footAnchor.y)),
    footCenterSpreadPx: spread(frames.map(f => f.footAnchor.x)),
    crownSpreadPx: spread(frames.map(f => f.solidBounds.top)),
    gestureAngles: frames.map(f => Number(f.gestureSortAngle.toFixed(2))),
};
assert.ok(report.stability.soleSpreadPx <= 2);
assert.ok(report.stability.footCenterSpreadPx <= 3);
assert.ok(report.stability.crownSpreadPx <= 3);
assert.ok(frames.slice(1).every((f, i) => f.gestureSortAngle >= frames[i].gestureSortAngle));

const manifest = {
    version: 1, stage: 5, style: 'monochrome graphite line art',
    identityLabels: ['大模型工程师', '软件开发工程师', '内容创作者'],
    corridor: {
        frames, fps: 12, originalProjectFps: 20,
        playback: 'ping-pong', sequence: [1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2],
        stillFrame: 5, sharedFootAnchor: { x: 612, y: 1220 },
        anchorOrigin: 'top-left in image pixels; normalize by width/height',
    },
    entrance: windowAsset, about: cloudAsset,
    integration: {
        status: 'assets prepared; original scene components not yet wired',
        preserveCanvasPadding: true,
        cloudAspectRatio: cloudAsset.aspectRatio,
        note: 'Use supplied image dimensions and foot anchor. Do not substitute the old hardcoded cloud ratio or auto-crop frame whitespace.',
    },
};
report.totalWebpBytes = report.files.reduce((sum, file) => sum + file.bytes, 0);
report.checks.push('11 lossless WebP assets have true exterior alpha, filled interiors and no clipped edge');
report.checks.push('All visible RGBA pixels preserved from image_gen PNG originals');
report.checks.push('Nine frames have a fixed canvas, stable feet/crown, and monotonically ordered hand gestures');
report.status = 'passed';
await fs.writeFile(path.join(root, output, 'manifest.json'), JSON.stringify(manifest, null, 2));
await fs.writeFile(path.join(root, 'docs/planning/materials/stage-05/asset-inspection.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, files: report.files.length, totalWebpBytes: report.totalWebpBytes, stability: report.stability, window: { width: windowAsset.width, height: windowAsset.height, bounds: windowAsset.visibleBounds }, cloud: { width: cloudAsset.width, height: cloudAsset.height, bounds: cloudAsset.visibleBounds } }, null, 2));

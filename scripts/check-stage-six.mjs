import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SHIAN_IP, getAvatarLayout, getDodgeTarget, advanceWave } from '../src/config/shian-ip.js';

const manifest = JSON.parse(fs.readFileSync(new URL('../public/textures/shian/manifest.json', import.meta.url)));
assert.deepEqual(SHIAN_IP.frames, manifest.corridor.frames.map(f => f.url));
assert.deepEqual(SHIAN_IP.labels, manifest.identityLabels);
assert.deepEqual(SHIAN_IP.foot, manifest.corridor.sharedFootAnchor);
assert.deepEqual(SHIAN_IP.sequence, manifest.corridor.sequence);
const layout = getAvatarLayout();
const pixelY = y => SHIAN_IP.floorY + layout.offsetY + (0.5 - y / 1254) * layout.height;
for (const frame of manifest.corridor.frames) {
    assert.ok(Math.abs(pixelY(frame.footAnchor.y) - SHIAN_IP.floorY) < 0.003, 'Each frame must remain grounded');
}
assert.ok(Math.abs(pixelY(SHIAN_IP.crownY) - SHIAN_IP.floorY - 2.1) < 1e-9);
assert.ok(Math.abs(layout.offsetX + (SHIAN_IP.foot.x / 1254 - 0.5) * layout.width) < 1e-9);
for (const fps of [12, 20]) {
    const seen = new Set();
    let motion = {index: 0, elapsed: 0};
    for (let i = 0; i < 240; i++) { motion = advanceWave(motion.index, motion.elapsed, 1/60, fps); seen.add(SHIAN_IP.sequence[motion.index]); }
    assert.equal(seen.size, 9);
    const single = advanceWave(0, 0, 4, fps);
    assert.equal(motion.index, single.index, 'Playback timing must preserve remainder between renders');
}
assert.equal(getDodgeTarget(4), 0);
assert.equal(getDodgeTarget(-3), 0);
assert.equal(getDodgeTarget(0), -1.5);
assert.ok(Math.abs(getDodgeTarget(0.00001) - getDodgeTarget(-0.00001)) < 0.001);
for (let z = -3; z <= 4; z += 0.1) assert.ok(getDodgeTarget(z) >= -1.5 && getDodgeTarget(z) <= 0);
console.log('Passed: manifest agreement, all-frame grounding, image scale, 12/20 FPS timing, bounded continuous dodge.');

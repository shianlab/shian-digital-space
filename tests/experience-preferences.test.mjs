import test from 'node:test';
import assert from 'node:assert/strict';
import { detectDeviceTier, TIERS } from '../src/config/performance.js';
import { normalizeVolume } from '../src/utils/audioPreferences.js';

test('device tier respects constrained phones and touch devices before first render', () => {
    assert.equal(detectDeviceTier({ userAgent:'Android', cores:4, memory:8 }), TIERS.LOW);
    assert.equal(detectDeviceTier({ cores:8, memory:4 }), TIERS.LOW);
    assert.equal(detectDeviceTier({ coarsePointer:true, cores:8, memory:8 }), TIERS.MEDIUM);
    assert.equal(detectDeviceTier({ cores:4, memory:8 }), TIERS.MEDIUM);
    assert.equal(detectDeviceTier({ userAgent:'iPhone' }), TIERS.MEDIUM);
    assert.equal(detectDeviceTier({}), TIERS.HIGH);
});
test('stored audio preferences cannot send invalid or out-of-range volume to HTML audio', () => {
    for (const value of [null, undefined, '', 'broken', 'NaN', Infinity]) assert.equal(normalizeVolume(value, .3), .3);
    assert.equal(normalizeVolume('0', .3), 0);
    assert.equal(normalizeVolume('0.42', .3), .42);
    assert.equal(normalizeVolume(-2, .3), 0);
    assert.equal(normalizeVolume(3, .3), 1);
});

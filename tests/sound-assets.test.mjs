import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SOUND_PATHS } from '../src/config/sound-paths.js';

const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);

test('Every named audio call resolves to a shipped clip or an explicitly silent effect', () => {
    for (const file of walk('src').filter(file => /\.jsx?$/.test(file))) {
        for (const [, name] of fs.readFileSync(file, 'utf8').matchAll(/\bplay\(\s*['"]([^'"]+)['"]/g)) {
            assert.ok(Object.hasOwn(SOUND_PATHS, name), file + ': ' + name);
            const url = SOUND_PATHS[name];
            if (url !== null) assert.ok(fs.existsSync('public' + url), url);
        }
    }
    assert.equal(SOUND_PATHS.pencil, null);
    assert.equal(SOUND_PATHS.tear, '/sounds/papersound.mp3');
});

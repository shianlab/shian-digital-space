import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS, ROOM_BY_LABEL, MAP_ROOMS, roomFromPath } from '../src/config/rooms.js';
import { limitText, textLength } from '../src/utils/textInput.js';

test('Chinese display names do not change original routes or texture keys', () => {
    for (const [id, label, name] of [['gallery', 'THE GALLERY', '作品展厅'], ['studio', 'THE STUDIO', '工作室'], ['about', 'THE ABOUT', '关于我'], ['contact', "LET'S CONNECT", '联系我']]) {
        assert.equal(roomFromPath(`/${id}`), id);
        assert.equal(roomFromPath(`/${id}/`), id);
        assert.equal(ROOM_BY_LABEL[label].id, id);
        assert.equal(ROOMS[id].name, name);
    }
    assert.deepEqual(MAP_ROOMS.map(room => [room.id, room.x, room.y]), [['about', 43, 38], ['gallery', 43, 72], ['contact', 57, 25], ['studio', 57, 55]]);
    assert.equal(roomFromPath('/'), null);
    assert.equal(roomFromPath('/unknown'), null);
});

test('Editing preserves Chinese punctuation, whitespace and line breaks', () => {
    const value = '你好，时安！\n  想聊聊 AI、Agent 和知识库。';
    assert.equal(limitText(value, 300), value);
    assert.equal(limitText('中'.repeat(301), 300), '中'.repeat(300));
});

test('Length limits never split combined characters or supplementary Han glyphs', () => {
    assert.equal(textLength('𠮷e\u0301👨‍👩‍👧‍👦'), 3);
    assert.equal(limitText('𠮷e\u0301👨‍👩‍👧‍👦你好', 3), '𠮷e\u0301👨‍👩‍👧‍👦');
});

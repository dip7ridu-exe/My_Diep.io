const test = require('node:test');
const assert = require('node:assert/strict');
const GameRoom = require('../game/GameRoom');

test('getState returns the shape expected by the client', () => {
  const room = new GameRoom('test-room');
  const state = room.getState('missing-player');

  assert.ok(state.p, 'expected players array in state.p');
  assert.ok(Array.isArray(state.p));
  assert.ok(state.s, 'expected shapes array in state.s');
  assert.ok(Array.isArray(state.s));
  assert.ok(state.b, 'expected bullets array in state.b');
  assert.ok(Array.isArray(state.b));
  assert.equal(state.me, null);
  assert.ok(Array.isArray(state.lb));
  assert.ok(Array.isArray(state.kf));
});

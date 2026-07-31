const test = require('node:test');
const assert = require('node:assert/strict');
const GameRoom = require('../game/GameRoom');

test('twin class creates multiple bullets when shooting', () => {
  const room = new GameRoom('test-room');
  const player = room.addPlayer('socket-1', 'Tester');
  player.alive = true;
  player.cls = 'twin';
  player.angle = 0;
  player.r = 24;
  player.x = 0;
  player.y = 0;
  room.playerShoot('socket-1');

  assert.equal(room.bullets.length, 2);
});

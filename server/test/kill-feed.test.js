const test = require('node:test');
const assert = require('node:assert/strict');
const GameRoom = require('../game/GameRoom');

test('kill feed records shape and player eliminations', () => {
  const room = new GameRoom('test-room');
  const killer = room.addPlayer('killer', 'Killer');
  killer.alive = true;
  killer.x = 0;
  killer.y = 0;
  killer.angle = 0;
  killer.r = 24;
  killer.cls = 'basic';
  killer.invuln = 0;

  const victim = room.addPlayer('victim', 'Victim');
  victim.alive = true;
  victim.x = 20;
  victim.y = 0;
  victim.r = 24;
  victim.hp = 10;
  victim.mhp = 10;
  victim.invuln = 0;

  const shape = room.shapes[0];
  shape.alive = true;
  shape.x = 18;
  shape.y = 0;
  shape.r = 10;
  shape.hp = 1;
  shape.type = 'sq';

  room.bullets.push({ ownerId: 'killer', x: 0, y: 0, r: 8, dmg: 999, hp: 1, alive: true, tp: false });

  room.checkBulletShapeCollisions();
  room.checkBulletPlayerCollisions();

  const state = room.getState('killer');
  assert.ok(Array.isArray(state.kf));
  assert.ok(state.kf.some(entry => entry.includes('Killer') || entry.includes('Victim')));
});

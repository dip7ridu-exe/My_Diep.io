const test = require('node:test');
const assert = require('node:assert/strict');
const Player = require('../game/Player');

test('player levels up with the configured xp curve', () => {
  const player = new Player('p1', 'Tester');
  player.xp = 999;
  const leveled = player.addXp(100);

  assert.equal(leveled, true);
  assert.ok(player.lv >= 2);
  assert.ok(player.sp >= 1);
});

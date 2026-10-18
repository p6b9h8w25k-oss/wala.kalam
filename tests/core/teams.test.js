import test from 'node:test';
import assert from 'node:assert/strict';
import { assignTeams, validateName } from '../../js/core/teams.js';
import { buildSchedule } from '../../js/core/turns.js';
import { seeded } from '../../js/core/rng.js';
import { mkPlayers } from './helpers.js';

test('even counts split equally, nobody shared, no duplicates', () => {
  for (const n of [2, 4, 6, 8, 16]) for (let s = 1; s <= 40; s++) {
    const { teams, sharedId } = assignTeams(mkPlayers(n), seeded(s));
    assert.equal(sharedId, null);
    assert.equal(teams.A.members.length, n / 2);
    assert.equal(teams.B.members.length, n / 2);
    assert.equal(new Set([...teams.A.members, ...teams.B.members]).size, n);
  }
});

test('odd counts: exactly one shared player, in both teams once each, teams equal size', () => {
  for (const n of [3, 5, 7, 9, 15]) for (let s = 1; s <= 60; s++) {
    const { teams, sharedId } = assignTeams(mkPlayers(n), seeded(s));
    assert.ok(sharedId);
    assert.equal(teams.A.members.length, (n + 1) / 2);
    assert.equal(teams.B.members.length, (n + 1) / 2);
    for (const t of [teams.A, teams.B]) {
      assert.equal(new Set(t.members).size, t.members.length, 'no duplicate inside a team');
      assert.equal(t.members.filter((id) => id === sharedId).length, 1);
    }
    const all = new Set([...teams.A.members, ...teams.B.members]);
    assert.equal(all.size, n, 'every real person appears');
    assert.equal(teams.A.members[0], sharedId);
    assert.equal(teams.B.members.at(-1), sharedId);
  }
});

test('five players example: A = 2 + shared, B = shared + 2', () => {
  const { teams, sharedId } = assignTeams(mkPlayers(5), seeded(7));
  assert.equal(teams.A.members.length, 3);
  assert.equal(teams.B.members.length, 3);
  assert.ok(teams.A.members.includes(sharedId) && teams.B.members.includes(sharedId));
});

test('repeated randomisation really varies', () => {
  const seen = new Set();
  for (let s = 1; s <= 30; s++) seen.add(assignTeams(mkPlayers(6), seeded(s)).teams.A.members.join(','));
  assert.ok(seen.size > 5);
});

test('schedule alternates A1 B1 A2 B2 ... and the shared player gets one turn per team, never back to back', () => {
  for (const n of [2, 3, 5, 6, 7]) {
    const { teams, sharedId } = assignTeams(mkPlayers(n), seeded(n));
    const sch = buildSchedule(teams);
    assert.equal(sch.length, teams.A.members.length * 2);
    sch.forEach((t, i) => assert.equal(t.teamId, i % 2 === 0 ? 'A' : 'B'));
    if (sharedId) {
      const mine = sch.filter((t) => t.playerId === sharedId);
      assert.equal(mine.length, 2);
      assert.deepEqual(mine.map((t) => t.teamId).sort(), ['A', 'B']);
      if (sch.length > 2) assert.ok(Math.abs(mine[0].index - mine[1].index) > 1);
    }
  }
});

test('name validation', () => {
  assert.equal(validateName('   ').ok, false);
  assert.equal(validateName('!!!').ok, false);
  assert.equal(validateName('x'.repeat(21)).ok, false);
  assert.equal(validateName('<b>').ok, false);
  assert.equal(validateName('أحمد', ['احمد']).ok, false, 'duplicate ignoring hamza');
  assert.equal(validateName('  سارة   علي ').name, 'سارة علي');
  assert.equal(validateName('سارة', ['سارة'], 0).ok, true, 'editing own name is fine');
});

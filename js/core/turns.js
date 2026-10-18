// Builds the basic-turn schedule. Steals are NOT part of it - they never consume a slot.
export function buildSchedule(teams) {
  const A = teams.A.members;
  const B = teams.B.members;
  if (A.length !== B.length) throw new Error('teams must have the same number of positions');
  const out = [];
  for (let i = 0; i < A.length; i++) {
    out.push({ index: out.length, teamId: 'A', playerId: A[i], round: i });
    out.push({ index: out.length, teamId: 'B', playerId: B[i], round: i });
  }
  return out;
}
export const otherTeam = (id) => (id === 'A' ? 'B' : 'A');

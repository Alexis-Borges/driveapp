// ⚠️ DESTRUCTIF — supprime TOUS les comptes et toutes les données métier.
// Conserve uniquement _app_config (config push) et le schéma.
//
// Usage :
//   node scripts/wipe-all.mjs --dry-run   # affiche ce qui serait supprimé
//   node scripts/wipe-all.mjs --yes       # supprime pour de bon
//
// À n'utiliser que sur un environnement sans données réelles.

import { adminClient } from './_lib.mjs';

const sb = adminClient();
const dryRun = process.argv.includes('--dry-run');
const confirmed = process.argv.includes('--yes');

if (!dryRun && !confirmed) {
  console.error('Refus : relance avec --dry-run pour simuler, ou --yes pour supprimer.');
  process.exit(1);
}

// Tables purgées explicitement : celles qui peuvent survivre à la suppression
// des comptes (FK sans ON DELETE CASCADE) ou qui ne référencent pas auth.users.
// `key` = une colonne NOT NULL de la table, utilisée comme filtre « tout sauf
// rien » (PostgREST refuse un DELETE sans clause WHERE). student_competences a
// une clé composite et donc pas de colonne `id`.
const TABLES = [
  { name: 'audit_log', key: 'id' },
  { name: 'invoices', key: 'id' },
  { name: 'referrals', key: 'id' },
  { name: 'student_competences', key: 'student_id' },
  { name: 'instructor_leaves', key: 'id' },
  { name: 'recurring_slots', key: 'id' },
  { name: 'messages', key: 'id' },
  { name: 'payments', key: 'id' },
  { name: 'lessons', key: 'id' },
  { name: 'push_tokens', key: 'id' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// L'API admin renvoie par intermittence « unrecognized JWT kid » sous cadence
// soutenue : on réessaie avec une pause croissante.
async function deleteUserWithRetry(id, label, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    const { error } = await sb.auth.admin.deleteUser(id);
    if (!error) return true;
    if (i === attempts) {
      console.warn(`  ${label} : ${error.message}`);
      return false;
    }
    await sleep(400 * i);
  }
  return false;
}

async function count(table) {
  const { count: c } = await sb.from(table).select('*', { count: 'exact', head: true });
  return c ?? 0;
}

console.log(dryRun ? '=== SIMULATION (rien ne sera supprimé) ===\n' : '=== SUPPRESSION ===\n');

const { data: users, error: uErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (uErr) throw new Error(`Lecture des comptes : ${uErr.message}`);
console.log(`Comptes auth à supprimer : ${users.users.length}`);
for (const u of users.users) {
  console.log(`   - ${(u.email ?? u.id).replace(/^(.{2}).*@/, '$1***@')}`);
}

console.log('\nLignes à supprimer :');
for (const t of TABLES) console.log(`   ${t.name.padEnd(22)} ${await count(t.name)}`);

if (dryRun) {
  console.log('\nSimulation terminée. Relance avec --yes pour appliquer.');
  process.exit(0);
}

// Deux FK bloquent la suppression des comptes si on ne les neutralise pas
// d'abord : students.referred_by (auto-référent) et students.instructor_id
// (un moniteur encore référencé par un élève est indéboulonnable).
await sb.from('students').update({ referred_by: null }).not('id', 'is', null);
await sb.from('students').update({ instructor_id: null }).not('id', 'is', null);

console.log('\nPurge des tables métier…');
for (const t of TABLES) {
  const { error } = await sb.from(t.name).delete().not(t.key, 'is', null);
  if (error) console.warn(`  ${t.name} : ${error.message}`);
}

// Ordre : élèves d'abord, puis moniteurs, puis le reste — les FK pointent
// toujours de l'élève vers le moniteur.
const { data: roles } = await sb.from('profiles').select('id, role');
const roleOf = new Map((roles ?? []).map((r) => [r.id, r.role]));
const rank = { student: 0, instructor: 1, admin: 2 };
const ordered = [...users.users].sort(
  (a, b) => (rank[roleOf.get(a.id)] ?? 3) - (rank[roleOf.get(b.id)] ?? 3)
);

console.log('Suppression des comptes…');
let ok = 0;
for (const u of ordered) {
  if (await deleteUserWithRetry(u.id, u.email ?? u.id)) ok++;
  await sleep(120);
}
console.log(`  ${ok}/${users.users.length} compte(s) supprimé(s).`);

console.log('\n=== Vérification finale ===');
for (const t of [...TABLES.map((t) => t.name), 'profiles', 'students', 'instructors']) {
  console.log(`   ${t.padEnd(22)} ${await count(t)}`);
}
const { data: cfg } = await sb.from('_app_config').select('key');
console.log(`   _app_config (conservé)  ${(cfg ?? []).length} clé(s)`);

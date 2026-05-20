// Génère un flux d'activité réaliste en continu sur les données de dev :
// réservations de créneaux, confirmations, messages, ouverture de créneaux,
// paiements. Laisse l'app ouverte (Expo Go) et regarde le realtime, les
// AlertCards et la logique slot CRITIQUE réagir en direct.
//
// Usage :
//   node scripts/simulate-activity.mjs                 # 1 action toutes les 5s
//   node scripts/simulate-activity.mjs --interval=2    # toutes les 2s
//   node scripts/simulate-activity.mjs --interval=2 --max=50   # s'arrête après 50 actions
//
// Ctrl+C pour arrêter. N'agit que sur les comptes @driveapp.dev — lance
// d'abord `npm run seed:dev`.

import {
  adminClient,
  DEV_DOMAIN,
  BOOKABLE_HOURS,
  PACK_PRICE,
  LESSON_TYPES,
  rint,
  pick,
  chance,
  sleep,
  atHour,
  fmtDate,
} from './_lib.mjs';

const MSG_FROM_STUDENT = [
  'Bonjour, on confirme bien pour la prochaine séance ?',
  'Merci pour le cours, c\'était top !',
  'Petite question sur les créneaux, on en parle ?',
  'Je me sens plus à l\'aise, merci pour les conseils.',
  'Est-ce qu\'on peut ajouter une séance cette semaine ?',
];
const MSG_FROM_INSTRUCTOR = [
  'Bonjour, oui c\'est confirmé de mon côté.',
  'Très bien, continuez comme ça !',
  'Pensez à réviser les manœuvres pour la prochaine fois.',
  'Je vous ai ouvert un créneau supplémentaire, regardez le planning.',
  'Bon travail aujourd\'hui, on progresse bien.',
];

function nowTime() {
  return new Date().toLocaleTimeString('fr-FR');
}

async function main() {
  const sb = adminClient();

  const intervalArg = process.argv.find((a) => a.startsWith('--interval='));
  const maxArg = process.argv.find((a) => a.startsWith('--max='));
  const interval = (intervalArg ? Number(intervalArg.split('=')[1]) : 5) * 1000;
  const maxActions = maxArg ? Number(maxArg.split('=')[1]) : Infinity;

  const { data: profiles, error } = await sb
    .from('profiles')
    .select('id, role, first_name')
    .like('email', '%@' + DEV_DOMAIN);
  if (error) throw new Error(`Lecture profiles : ${error.message}`);

  const instructor = (profiles ?? []).find((p) => p.role === 'instructor');
  const students = (profiles ?? []).filter((p) => p.role === 'student');
  if (!instructor || students.length === 0) {
    console.error('Aucune donnée de dev trouvée. Lance d\'abord :  npm run seed:dev');
    process.exit(1);
  }

  // --- Actions possibles ---

  // Un élève réserve un créneau libre.
  async function bookSlot() {
    const { data: free } = await sb
      .from('lessons')
      .select('id, scheduled_at')
      .eq('instructor_id', instructor.id)
      .is('student_id', null)
      .not('status', 'in', '(cancelled,auto_cancelled)')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(25);
    if (!free || free.length === 0) return null;
    const target = pick(free);
    const student = pick(students);
    const { error: e } = await sb
      .from('lessons')
      .update({ student_id: student.id, status: 'pending' })
      .eq('id', target.id)
      .is('student_id', null);
    if (e) return null;
    return `${student.first_name} a réservé un créneau le ${fmtDate(target.scheduled_at)}`;
  }

  // Le moniteur confirme une séance en attente.
  async function confirmLesson() {
    const { data: pending } = await sb
      .from('lessons')
      .select('id, scheduled_at, student_id')
      .eq('instructor_id', instructor.id)
      .eq('status', 'pending')
      .not('student_id', 'is', null)
      .gte('scheduled_at', new Date().toISOString())
      .limit(25);
    if (!pending || pending.length === 0) return null;
    const l = pick(pending);
    const { error: e } = await sb.from('lessons').update({ status: 'confirmed' }).eq('id', l.id);
    if (e) return null;
    const s = students.find((x) => x.id === l.student_id);
    return `Séance confirmée pour ${s?.first_name ?? 'un élève'} le ${fmtDate(l.scheduled_at)}`;
  }

  // Un message est échangé (élève ↔ moniteur).
  async function sendMessage() {
    const s = pick(students);
    const fromStudent = chance(0.5);
    const content = fromStudent ? pick(MSG_FROM_STUDENT) : pick(MSG_FROM_INSTRUCTOR);
    const { error: e } = await sb.from('messages').insert({
      sender_id: fromStudent ? s.id : instructor.id,
      recipient_id: fromStudent ? instructor.id : s.id,
      content,
    });
    if (e) return null;
    return fromStudent
      ? `${s.first_name} → moniteur : « ${content} »`
      : `moniteur → ${s.first_name} : « ${content} »`;
  }

  // Le moniteur ouvre un nouveau créneau libre.
  async function openSlot() {
    const { data: existing } = await sb
      .from('lessons')
      .select('scheduled_at')
      .eq('instructor_id', instructor.id)
      .not('status', 'in', '(cancelled,auto_cancelled)')
      .gte('scheduled_at', new Date().toISOString());
    const used = new Set((existing ?? []).map((r) => new Date(r.scheduled_at).toISOString()));
    for (let t = 0; t < 50; t++) {
      const d = atHour(rint(1, 21), pick(BOOKABLE_HOURS));
      if (used.has(d.toISOString())) continue;
      const { error: e } = await sb.from('lessons').insert({
        instructor_id: instructor.id,
        student_id: null,
        scheduled_at: d.toISOString(),
        duration_minutes: 60,
        type: pick(LESSON_TYPES),
        status: 'pending',
      });
      if (e) return null;
      return `Nouveau créneau libre ouvert le ${fmtDate(d.toISOString())}`;
    }
    return null;
  }

  // Un élève achète un pack d'heures.
  async function buyPack() {
    const s = pick(students);
    const hours = pick([1, 5, 10]);
    const { error: e } = await sb.from('payments').insert({
      student_id: s.id,
      amount_cents: PACK_PRICE[hours],
      hours_purchased: hours,
      plan: chance(0.3) ? 'three_x' : 'one_shot',
      status: 'succeeded',
      stripe_payment_intent_id: 'pi_sim_' + Math.random().toString(36).slice(2, 12),
      paid_at: new Date().toISOString(),
    });
    if (e) return null;
    return `${s.first_name} a acheté un pack ${hours}h (${(PACK_PRICE[hours] / 100).toFixed(0)} €)`;
  }

  const ACTIONS = [
    { weight: 25, fn: bookSlot, tag: '[RESA]' },
    { weight: 20, fn: confirmLesson, tag: '[CONF]' },
    { weight: 30, fn: sendMessage, tag: '[MSG] ' },
    { weight: 15, fn: openSlot, tag: '[SLOT]' },
    { weight: 10, fn: buyPack, tag: '[PAY] ' },
  ];
  const totalWeight = ACTIONS.reduce((a, x) => a + x.weight, 0);
  function weightedPick() {
    let r = Math.random() * totalWeight;
    for (const a of ACTIONS) {
      if ((r -= a.weight) < 0) return a;
    }
    return ACTIONS[0];
  }

  let stopped = false;
  process.on('SIGINT', () => {
    stopped = true;
    console.log('\nSimulation arrêtée.');
    process.exit(0);
  });

  console.log(
    `Simulation démarrée — 1 action toutes les ${interval / 1000}s ` +
      `(${students.length} élèves). Ctrl+C pour arrêter.\n`
  );

  let count = 0;
  while (!stopped && count < maxActions) {
    const action = weightedPick();
    try {
      const msg = await action.fn();
      count++;
      console.log(
        `${nowTime()}  ${action.tag}  ${msg ?? '(rien à faire — relance le seed ?)'}`
      );
    } catch (e) {
      console.warn(`${nowTime()}  ${action.tag}  erreur : ${e.message}`);
    }
    if (count < maxActions) await sleep(interval);
  }
  if (count >= maxActions) console.log(`\n${count} actions générées — simulation terminée.`);
}

main().catch((e) => {
  console.error('\nÉchec de la simulation :', e.message);
  process.exit(1);
});

// Peuple le projet Supabase de dev avec un jeu de données réaliste :
//   1 admin, 1 monitrice (vérifiée), ~12 élèves aux états volontairement
//   variés — soldes positifs/négatifs, séances critiques (<48h impayées),
//   alertes amber (48-72h), nouveaux élèves sans séance.
//   + leçons passées/futures/annulées, paiements, messages, compétences REMC,
//   parrainages, créneaux récurrents, congés, créneaux libres réservables.
//
// Tous les comptes utilisent le domaine @driveapp.dev (mot de passe commun)
// pour pouvoir les identifier et les purger.
//
// Usage :
//   node scripts/seed-dev.mjs            # seed (refuse si données dev déjà présentes)
//   node scripts/seed-dev.mjs --reset    # purge les comptes @driveapp.dev puis seed
//
// Prérequis : .env (URL Supabase) + .env.seed (SUPABASE_SERVICE_ROLE_KEY).
// À ne JAMAIS lancer sur le projet de production.

import {
  adminClient,
  DEV_DOMAIN,
  DEV_PASSWORD,
  BOOKABLE_HOURS,
  PACK_PRICE,
  LESSON_TYPES,
  rint,
  pick,
  chance,
  sleep,
  atHour,
  hoursFromNow,
  randomPhone,
} from './_lib.mjs';

const FIRST_NAMES = [
  'Léa', 'Hugo', 'Manon', 'Lucas', 'Camille', 'Nathan',
  'Chloé', 'Théo', 'Inès', 'Maxime', 'Sarah', 'Yanis',
];
const LAST_NAMES = [
  'Martin', 'Bernard', 'Dubois', 'Petit', 'Robert', 'Richard',
  'Durand', 'Moreau', 'Laurent', 'Simon', 'Garcia', 'Roux',
];

// Archétypes d'élèves — `paid` heures payées, `active` leçons comptées dans
// le solde. balance = paid - active (la vue student_balance).
const STUDENT_PLAN = [
  { tag: 'sain', paid: 10, active: 4 }, // +6
  { tag: 'sain', paid: 10, active: 4 }, // +6
  { tag: 'sain', paid: 5, active: 3 }, //  +2
  { tag: 'sain', paid: 5, active: 3 }, //  +2
  { tag: 'sain', paid: 5, active: 2 }, //  +3
  { tag: 'depassement', paid: 5, active: 9 }, // -4
  { tag: 'depassement', paid: 5, active: 8 }, // -3
  { tag: 'depassement', paid: 1, active: 5 }, // -4
  { tag: 'critique', paid: 1, active: 4, critical: true }, // -3 + séance <48h
  { tag: 'critique', paid: 1, active: 4, critical: true }, // -3 + séance <48h
  { tag: 'amber', paid: 1, active: 3, amber: true }, //       -2 + séance 48-72h
  { tag: 'nouveau', paid: 0, active: 0 }, //                   tout neuf
];

const FEEDBACKS = [
  'Bonne séance, progrès sur les créneaux. Continue à anticiper davantage.',
  'Belle maîtrise de l\'embrayage. À travailler : les angles morts.',
  'Conduite plus fluide aujourd\'hui. Attention aux priorités à droite.',
  'Très bon contrôle de l\'allure. On passe aux ronds-points la prochaine fois.',
  'Quelques hésitations en intersection, rien d\'inquiétant. Bon état d\'esprit.',
];
const STUDENT_COMMENTS = [
  'Merci, je vais réviser les angles morts !',
  'D\'accord, je me sens plus à l\'aise effectivement.',
  'Noté pour les priorités, je ferai attention.',
];
const CANCEL_REASONS = ['Élève absent', 'Mauvais temps', 'Conflit de planning', 'Maladie'];

const MSG_FROM_STUDENT = [
  'Bonjour, est-ce qu\'on peut décaler la séance de demain ?',
  'Merci beaucoup pour le cours d\'aujourd\'hui !',
  'Je serai peut-être 5 min en retard, désolé.',
  'Est-ce que je suis prêt(e) pour l\'examen d\'après vous ?',
];
const MSG_FROM_INSTRUCTOR = [
  'Bonjour, oui pas de souci, je vous propose un autre créneau.',
  'Très bien, continuez comme ça, vous progressez bien.',
  'Pensez à réviser les manœuvres pour la prochaine fois.',
  'On en reparle de vive voix à la prochaine séance.',
];

const SUB_COMPETENCES = [
  'C1.1', 'C1.2', 'C1.3', 'C1.4',
  'C2.1', 'C2.2', 'C2.3', 'C2.4',
  'C3.1', 'C3.2', 'C3.3', 'C3.4',
  'C4.1', 'C4.2', 'C4.3', 'C4.4',
];
const COMPETENCE_STATUSES = ['not_started', 'in_progress', 'acquired'];

const RECURRING_RULES = [
  { weekday: 1, hour: 9 },
  { weekday: 1, hour: 14 },
  { weekday: 3, hour: 10 },
  { weekday: 5, hour: 16 },
  { weekday: 6, hour: 11 },
];

function slug(s) {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

// Pioche des créneaux horaires uniques pour le moniteur (l'index unique
// unique_instructor_slot interdit deux leçons non annulées à la même heure).
function makeSlotPicker() {
  const used = new Set();
  return {
    range(minDay, maxDay) {
      for (let t = 0; t < 400; t++) {
        const d = atHour(rint(minDay, maxDay), pick(BOOKABLE_HOURS));
        const iso = d.toISOString();
        if (!used.has(iso)) {
          used.add(iso);
          return d;
        }
      }
      throw new Error('Plus de créneau horaire libre');
    },
    exact(date) {
      let d = new Date(date);
      let guard = 0;
      while (used.has(d.toISOString()) && guard < 24) {
        d = new Date(d.getTime() + 3600 * 1000);
        guard++;
      }
      used.add(d.toISOString());
      return d;
    },
  };
}

async function createUser(sb, { email, role, firstName, lastName, extra = {} }) {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { role, first_name: firstName, last_name: lastName, ...extra },
  });
  if (error) throw new Error(`createUser ${email} : ${error.message}`);
  return data.user;
}

// Le trigger handle_new_user crée les lignes profiles/students/instructors.
// On attend qu'elles soient visibles avant de les compléter.
async function waitForRow(sb, table, id) {
  for (let i = 0; i < 15; i++) {
    const { data } = await sb.from(table).select('id').eq('id', id).maybeSingle();
    if (data) return;
    await sleep(200);
  }
  throw new Error(`Ligne ${table}/${id} introuvable (trigger handle_new_user appliqué ?)`);
}

async function resetDevData(sb) {
  const { data: devProfiles, error } = await sb
    .from('profiles')
    .select('id')
    .like('email', '%@' + DEV_DOMAIN);
  if (error) throw error;
  const ids = (devProfiles ?? []).map((p) => p.id);
  if (ids.length === 0) return;

  // students.referred_by est auto-référent sans ON DELETE — on le neutralise
  // avant la suppression en cascade.
  await sb.from('students').update({ referred_by: null }).in('id', ids);

  let deleted = 0;
  for (const id of ids) {
    const { error: delErr } = await sb.auth.admin.deleteUser(id);
    if (delErr) console.warn(`  suppression ${id} échouée : ${delErr.message}`);
    else deleted++;
  }
  console.log(`Purge : ${deleted} compte(s) @${DEV_DOMAIN} supprimé(s).`);
}

async function main() {
  const sb = adminClient();
  const reset = process.argv.includes('--reset');

  const { data: existing, error: exErr } = await sb
    .from('profiles')
    .select('id')
    .like('email', '%@' + DEV_DOMAIN)
    .limit(1);
  if (exErr) {
    throw new Error(
      `Lecture de la table profiles impossible — les migrations sont-elles appliquées ?\n${exErr.message}`
    );
  }
  if (existing && existing.length > 0) {
    if (!reset) {
      console.error(
        'Des données de dev existent déjà.\n' +
          'Relance avec --reset pour repartir propre :  npm run seed:reset'
      );
      process.exit(1);
    }
    await resetDevData(sb);
  }

  const slot = makeSlotPicker();

  // --- Admin ---
  console.log('Création admin…');
  await createUser(sb, {
    email: `admin@${DEV_DOMAIN}`,
    role: 'admin',
    firstName: 'Admin',
    lastName: 'DriveApp',
  });

  // --- Monitrice ---
  console.log('Création monitrice…');
  const instructor = await createUser(sb, {
    email: `feryel@${DEV_DOMAIN}`,
    role: 'instructor',
    firstName: 'Feryel',
    lastName: 'Z.',
    extra: { agreement_number: 'AGR-2021-00427' },
  });
  await waitForRow(sb, 'instructors', instructor.id);
  await sb
    .from('instructors')
    .update({
      is_verified: true,
      stripe_account_id: 'acct_devmock01',
      zone_geo: 'Lyon et périphérie',
      experience_years: 8,
      hourly_rate: 3500,
    })
    .eq('id', instructor.id);
  await sb
    .from('profiles')
    .update({ phone: randomPhone(), bio: 'Monitrice indépendante, pédagogue et patiente.' })
    .eq('id', instructor.id);

  // --- Élèves ---
  console.log(`Création de ${STUDENT_PLAN.length} élèves…`);
  const students = [];
  for (let i = 0; i < STUDENT_PLAN.length; i++) {
    const plan = STUDENT_PLAN[i];
    const firstName = FIRST_NAMES[i];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const user = await createUser(sb, {
      email: `${slug(firstName)}@${DEV_DOMAIN}`,
      role: 'student',
      firstName,
      lastName,
      extra: { invited_by: instructor.id },
    });
    await waitForRow(sb, 'students', user.id);
    await sb
      .from('students')
      .update({
        package_total_hours: plan.paid,
        package_started_at: plan.paid > 0 ? atHour(-rint(10, 40), 10).toISOString() : null,
      })
      .eq('id', user.id);
    await sb.from('profiles').update({ phone: randomPhone() }).eq('id', user.id);
    students.push({ ...plan, id: user.id, firstName, lastName });
    await sleep(80);
  }

  // --- Leçons ---
  console.log('Génération des leçons…');
  const lessons = [];
  for (const s of students) {
    const pastCount = Math.round(s.active * 0.6);
    let futureCount = s.active - pastCount;

    for (let i = 0; i < pastCount; i++) {
      lessons.push({
        instructor_id: instructor.id,
        student_id: s.id,
        scheduled_at: slot.range(-30, -1).toISOString(),
        duration_minutes: 60,
        type: pick(LESSON_TYPES),
        status: 'completed',
        feedback: pick(FEEDBACKS),
        rating: rint(3, 5),
        student_comment: chance(0.4) ? pick(STUDENT_COMMENTS) : null,
      });
    }

    // Séance critique (<48h) ou amber (48-72h) : remplace une séance future.
    if (s.critical) {
      futureCount = Math.max(0, futureCount - 1);
      lessons.push({
        instructor_id: instructor.id,
        student_id: s.id,
        scheduled_at: slot.exact(hoursFromNow(30)).toISOString(),
        duration_minutes: 60,
        type: 'city',
        status: chance(0.5) ? 'confirmed' : 'pending',
      });
    } else if (s.amber) {
      futureCount = Math.max(0, futureCount - 1);
      lessons.push({
        instructor_id: instructor.id,
        student_id: s.id,
        scheduled_at: slot.exact(hoursFromNow(58)).toISOString(),
        duration_minutes: 60,
        type: 'city',
        status: 'confirmed',
      });
    }

    for (let i = 0; i < futureCount; i++) {
      lessons.push({
        instructor_id: instructor.id,
        student_id: s.id,
        scheduled_at: slot.range(2, 25).toISOString(),
        duration_minutes: 60,
        type: pick(LESSON_TYPES),
        status: chance(0.6) ? 'confirmed' : 'pending',
      });
    }

    // 0 à 2 séances annulées (ne comptent pas dans le solde, testent le
    // filtrage des leçons annulées dans le planning).
    for (let i = 0, n = rint(0, 2); i < n; i++) {
      lessons.push({
        instructor_id: instructor.id,
        student_id: s.id,
        scheduled_at: slot.range(-20, 20).toISOString(),
        duration_minutes: 60,
        type: pick(LESSON_TYPES),
        status: chance(0.5) ? 'cancelled' : 'auto_cancelled',
        cancelled_reason: pick(CANCEL_REASONS),
      });
    }
  }

  // Créneaux libres réservables (student_id null) sur les 14 prochains jours.
  for (let i = 0; i < 18; i++) {
    lessons.push({
      instructor_id: instructor.id,
      student_id: null,
      scheduled_at: slot.range(1, 14).toISOString(),
      duration_minutes: 60,
      type: pick(LESSON_TYPES),
      status: 'pending',
    });
  }
  {
    const { error } = await sb.from('lessons').insert(lessons);
    if (error) throw new Error(`Insertion leçons : ${error.message}`);
  }

  // --- Paiements ---
  console.log('Génération des paiements…');
  const payments = [];
  for (const s of students) {
    if (s.paid > 0) {
      payments.push({
        student_id: s.id,
        amount_cents: PACK_PRICE[s.paid],
        hours_purchased: s.paid,
        plan: chance(0.3) ? 'three_x' : 'one_shot',
        status: 'succeeded',
        stripe_payment_intent_id: 'pi_dev_' + Math.random().toString(36).slice(2, 12),
        paid_at: atHour(-rint(5, 40), rint(9, 18)).toISOString(),
      });
    }
  }
  // Quelques paiements en attente / remboursés pour peupler le back-office.
  for (const s of [students[0], students[3]]) {
    payments.push({
      student_id: s.id,
      amount_cents: PACK_PRICE[5],
      hours_purchased: 5,
      plan: 'one_shot',
      status: 'pending',
      stripe_payment_intent_id: 'pi_dev_' + Math.random().toString(36).slice(2, 12),
    });
  }
  payments.push({
    student_id: students[1].id,
    amount_cents: PACK_PRICE[1],
    hours_purchased: 1,
    plan: 'one_shot',
    status: 'refunded',
    stripe_payment_intent_id: 'pi_dev_' + Math.random().toString(36).slice(2, 12),
    paid_at: atHour(-rint(15, 30), 11).toISOString(),
  });
  {
    const { error } = await sb.from('payments').insert(payments);
    if (error) throw new Error(`Insertion paiements : ${error.message}`);
  }

  // --- Messages ---
  console.log('Génération des messages…');
  const messages = [];
  for (const s of students.slice(0, 6)) {
    const threadLen = rint(2, 4);
    for (let i = 0; i < threadLen; i++) {
      const fromStudent = i % 2 === 0;
      const last = i === threadLen - 1;
      messages.push({
        sender_id: fromStudent ? s.id : instructor.id,
        recipient_id: fromStudent ? instructor.id : s.id,
        content: fromStudent ? pick(MSG_FROM_STUDENT) : pick(MSG_FROM_INSTRUCTOR),
        // dernier message non lu une fois sur deux → badges + realtime à tester
        read_at: last && chance(0.5) ? null : atHour(-rint(1, 6), rint(9, 20)).toISOString(),
        created_at: atHour(-rint(1, 8), rint(9, 20)).toISOString(),
      });
    }
  }
  {
    const { error } = await sb.from('messages').insert(messages);
    if (error) console.warn(`  messages ignorés : ${error.message}`);
  }

  // --- Compétences REMC ---
  console.log('Génération des compétences REMC…');
  const competences = [];
  for (const s of students) {
    if (s.tag === 'nouveau') continue;
    // élèves avancés : plus de compétences acquises
    const advanced = s.active >= 5;
    for (const cId of SUB_COMPETENCES) {
      const status = advanced
        ? pick(['acquired', 'acquired', 'in_progress', 'not_started'])
        : pick(['not_started', 'not_started', 'in_progress', 'acquired']);
      if (status === 'not_started' && chance(0.5)) continue; // on n'insère pas tout
      competences.push({
        student_id: s.id,
        competence_id: cId,
        status,
        updated_by: instructor.id,
      });
    }
  }
  if (competences.length > 0) {
    const { error } = await sb.from('student_competences').insert(competences);
    if (error) console.warn(`  compétences ignorées : ${error.message}`);
  }

  // --- Parrainage ---
  console.log('Génération du parrainage…');
  {
    const referrer = students[0];
    const referred = students[STUDENT_PLAN.length - 1]; // le nouvel élève
    await sb.from('students').update({ referred_by: referrer.id }).eq('id', referred.id);
    const { error } = await sb.from('referrals').insert({
      referrer_id: referrer.id,
      referred_id: referred.id,
      reward_type: 'free_hour',
      reward_claimed: false,
    });
    if (error) console.warn(`  parrainage ignoré : ${error.message}`);
  }

  // --- Créneaux récurrents ---
  console.log('Génération des créneaux récurrents…');
  {
    const { error } = await sb.from('recurring_slots').insert(
      RECURRING_RULES.map((r) => ({
        instructor_id: instructor.id,
        weekday: r.weekday,
        hour: r.hour,
        type: 'city',
        active: true,
      }))
    );
    if (error) console.warn(`  créneaux récurrents ignorés : ${error.message}`);
  }

  // --- Congés ---
  console.log('Génération des congés…');
  {
    const { error } = await sb.from('instructor_leaves').insert({
      instructor_id: instructor.id,
      starts_at: atHour(21, 0).toISOString(),
      ends_at: atHour(25, 23).toISOString(),
      reason: 'Congés',
    });
    if (error) console.warn(`  congés ignorés : ${error.message}`);
  }

  console.log('\n=== Seed terminé ===');
  console.log(`Admin     : admin@${DEV_DOMAIN}`);
  console.log(`Monitrice : feryel@${DEV_DOMAIN}`);
  console.log(
    `Élèves    : ${students.length} comptes — ` +
      students.map((s) => `${slug(s.firstName)}@${DEV_DOMAIN}`).join(', ')
  );
  console.log(`Mot de passe commun : ${DEV_PASSWORD}`);
  console.log(`Leçons : ${lessons.length} · Paiements : ${payments.length} · Messages : ${messages.length}`);
  console.log('\nLance `npm run simulate` pour générer un flux d\'activité en direct.');
}

main().catch((e) => {
  console.error('\nÉchec du seed :', e.message);
  process.exit(1);
});

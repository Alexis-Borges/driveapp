// Cron : à exécuter chaque dimanche soir.
// Pour chaque règle de récurrence active, crée les leçons (status pending,
// student_id null) sur les 4 prochaines semaines, en évitant doublons (unique
// index 007) et congés (instructor_leaves).

import { adminClient } from '../_shared/supabase.ts';

const WEEKS_AHEAD = 4;

Deno.serve(async (_req) => {
  const admin = adminClient();

  const { data: rules, error } = await admin
    .from('recurring_slots')
    .select('*')
    .eq('active', true);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const created: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const rule of rules ?? []) {
    const r = rule as {
      id: string;
      instructor_id: string;
      weekday: number;
      hour: number;
      type: string;
      valid_from: string | null;
      valid_until: string | null;
    };
    for (let w = 0; w < WEEKS_AHEAD; w++) {
      const target = new Date(today);
      const dayDelta = (r.weekday - target.getDay() + 7) % 7;
      target.setDate(target.getDate() + dayDelta + w * 7);
      target.setHours(r.hour, 0, 0, 0);
      if (target <= today) continue;
      if (r.valid_from && new Date(r.valid_from) > target) continue;
      if (r.valid_until && new Date(r.valid_until) < target) continue;

      // Skip si pendant un congé
      const { data: leave } = await admin
        .from('instructor_leaves')
        .select('id')
        .eq('instructor_id', r.instructor_id)
        .lte('starts_at', target.toISOString())
        .gte('ends_at', target.toISOString())
        .maybeSingle();
      if (leave) continue;

      const { error: insErr } = await admin.from('lessons').insert({
        instructor_id: r.instructor_id,
        student_id: null,
        scheduled_at: target.toISOString(),
        duration_minutes: 60,
        type: r.type,
        status: 'pending',
      });
      // 23505 = unique violation = créneau déjà existant → ok, on ignore
      if (!insErr || insErr.code === '23505') {
        if (!insErr) created.push(target.toISOString());
        continue;
      }
    }
  }

  return new Response(JSON.stringify({ created: created.length, slots: created }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

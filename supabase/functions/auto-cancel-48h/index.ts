// Cron : à exécuter toutes les heures
// Annule automatiquement les leçons dans <48h si l'élève a un solde négatif

import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async (_req) => {
  const admin = adminClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: lessons, error } = await admin
    .from('lessons')
    .select('id, student_id, scheduled_at')
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', cutoff.toISOString())
    .not('student_id', 'is', null);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const cancelled: string[] = [];
  for (const l of lessons ?? []) {
    if (!l.student_id) continue;
    const { data: bal } = await admin
      .from('student_balance')
      .select('balance_hours')
      .eq('student_id', l.student_id)
      .maybeSingle();

    if (bal && bal.balance_hours < 0) {
      await admin
        .from('lessons')
        .update({
          status: 'auto_cancelled',
          cancelled_reason: 'Solde impayé 48h avant la séance',
        })
        .eq('id', l.id);
      cancelled.push(l.id);

      // notifie élève + moniteur via la function send-push
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            user_id: l.student_id,
            title: 'Séance annulée',
            body: 'Solde impayé 48h avant la séance.',
          }),
        });
      } catch {
        // silencieux
      }
    }
  }

  return new Response(JSON.stringify({ cancelled: cancelled.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

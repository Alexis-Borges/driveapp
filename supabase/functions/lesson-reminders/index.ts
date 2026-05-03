// Cron : à exécuter toutes les heures
// Envoie un rappel push aux élèves dont la séance est dans ~24h (entre 23h et 25h)

import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async (_req) => {
  const admin = adminClient();
  const now = new Date();
  const start = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: lessons, error } = await admin
    .from('lessons')
    .select('id, student_id, instructor_id, scheduled_at, type, reminder_sent_at')
    .in('status', ['confirmed'])
    .gte('scheduled_at', start.toISOString())
    .lt('scheduled_at', end.toISOString())
    .is('reminder_sent_at', null)
    .not('student_id', 'is', null);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const sent: string[] = [];
  for (const l of lessons ?? []) {
    if (!l.student_id) continue;
    const when = new Date(l.scheduled_at).toLocaleString('fr-FR', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          user_id: l.student_id,
          title: '⏰ Rappel : séance demain',
          body: `Ta séance est prévue ${when}.`,
        }),
      });
      await admin
        .from('lessons')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', l.id);
      sent.push(l.id);
    } catch {
      // silencieux
    }
  }

  return new Response(JSON.stringify({ sent: sent.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

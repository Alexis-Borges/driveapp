// RGPD art. 20 — Export de toutes les données personnelles d'un user
// Auth requise. Renvoie un JSON complet (profil, lessons, payments, messages,
// referrals, competences, push_tokens).

import { corsHeaders } from '../_shared/cors.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) throw new Error('Missing Authorization');
    const supa = userClient(auth);
    const { data: userRes, error: userErr } = await supa.auth.getUser();
    if (userErr || !userRes.user) throw new Error('Unauthenticated');
    const userId = userRes.user.id;

    const admin = adminClient();
    const tables: Record<string, string> = {
      profile: `select * from profiles where id = '${userId}'`,
      instructor: `select * from instructors where id = '${userId}'`,
      student: `select * from students where id = '${userId}'`,
      lessons_as_student: `select * from lessons where student_id = '${userId}'`,
      lessons_as_instructor: `select * from lessons where instructor_id = '${userId}'`,
      payments: `select * from payments where student_id = '${userId}'`,
      invoices: `select * from invoices where student_id = '${userId}'`,
      messages: `select * from messages where sender_id = '${userId}' or recipient_id = '${userId}'`,
      referrals: `select * from referrals where referrer_id = '${userId}' or referred_id = '${userId}'`,
      competences: `select * from student_competences where student_id = '${userId}'`,
      push_tokens: `select * from push_tokens where user_id = '${userId}'`,
    };

    const result: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      email: userRes.user.email,
    };

    // Pas de SQL brut côté client → on utilise les tables une par une
    const queries = await Promise.all([
      admin.from('profiles').select('*').eq('id', userId),
      admin.from('instructors').select('*').eq('id', userId),
      admin.from('students').select('*').eq('id', userId),
      admin.from('lessons').select('*').eq('student_id', userId),
      admin.from('lessons').select('*').eq('instructor_id', userId),
      admin.from('payments').select('*').eq('student_id', userId),
      admin.from('invoices').select('*').eq('student_id', userId),
      admin.from('messages').select('*').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
      admin.from('referrals').select('*').or(`referrer_id.eq.${userId},referred_id.eq.${userId}`),
      admin.from('student_competences').select('*').eq('student_id', userId),
      admin.from('push_tokens').select('*').eq('user_id', userId),
    ]);

    const keys = Object.keys(tables);
    queries.forEach((q, i) => {
      result[keys[i]] = q.data ?? [];
    });

    await admin.from('audit_log').insert({
      actor_id: userId,
      action: 'rgpd_export',
      target_type: 'user',
      target_id: userId,
    });

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="driveapp-export-${userId}.json"`,
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

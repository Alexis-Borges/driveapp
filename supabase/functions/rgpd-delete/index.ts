// RGPD art. 17 — Suppression compte + données associées
// Auth requise. Soft-delete : anonymise et supprime auth.user.
// Conserve les paiements/factures (obligation comptable 10 ans) mais
// détache l'identité.

import { corsHeaders } from '../_shared/cors.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) throw new Error('Missing Authorization');
    const supa = userClient(auth);
    const { data: userRes, error } = await supa.auth.getUser();
    if (error || !userRes.user) throw new Error('Unauthenticated');
    const userId = userRes.user.id;

    const admin = adminClient();

    // Anonymise profile (RGPD : nom/email/avatar effacés ; id conservé pour FK paiements)
    await admin
      .from('profiles')
      .update({
        first_name: 'Compte',
        last_name: 'supprimé',
        email: `deleted+${userId}@driveapp.local`,
        phone: null,
        avatar_url: null,
        bio: null,
      })
      .eq('id', userId);

    // Supprime données pures (pas d'obligation conservation)
    await admin.from('messages').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
    await admin.from('push_tokens').delete().eq('user_id', userId);
    await admin.from('student_competences').delete().eq('student_id', userId);

    // Annule les leçons futures
    await admin
      .from('lessons')
      .update({ status: 'cancelled', cancelled_reason: 'Compte supprimé' })
      .eq('student_id', userId)
      .gte('scheduled_at', new Date().toISOString())
      .in('status', ['pending', 'confirmed']);

    // Audit AVANT suppression auth.user
    await admin.from('audit_log').insert({
      actor_id: userId,
      action: 'rgpd_delete',
      target_type: 'user',
      target_id: userId,
    });

    // Supprime le compte auth (l'utilisateur ne peut plus se connecter)
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

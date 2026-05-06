// Refund un paiement Stripe + reverse balance élève + audit log
// Body: { payment_id: string, reason?: string }
// Auth requise : admin uniquement

import Stripe from 'https://esm.sh/stripe@14?target=denonext';
import { corsHeaders } from '../_shared/cors.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) throw new Error('Missing Authorization');

    const supa = userClient(auth);
    const { data: userRes, error: userErr } = await supa.auth.getUser();
    if (userErr || !userRes.user) throw new Error('Unauthenticated');

    const admin = adminClient();
    const { data: actor } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userRes.user.id)
      .maybeSingle();
    if (!actor || actor.role !== 'admin') throw new Error('Forbidden — admin only');

    const { payment_id, reason } = await req.json();
    if (!payment_id) throw new Error('payment_id required');

    const { data: payment, error: pErr } = await admin
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();
    if (pErr || !payment) throw new Error('Paiement introuvable');
    if (payment.status !== 'succeeded') throw new Error('Paiement non remboursable');
    if (!payment.stripe_payment_intent_id) throw new Error('PaymentIntent manquant');

    // Refund Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      reason: 'requested_by_customer',
      metadata: { admin_id: userRes.user.id, custom_reason: reason ?? '' },
    });

    // Marque payment refunded
    await admin
      .from('payments')
      .update({ status: 'refunded' })
      .eq('id', payment_id);

    // Décrément du forfait élève
    await admin.rpc('refund_student_hours', {
      p_student_id: payment.student_id,
      p_hours: payment.hours_purchased,
    }).catch(() => {});

    // Audit
    await admin.from('audit_log').insert({
      actor_id: userRes.user.id,
      action: 'refund',
      target_type: 'payment',
      target_id: payment_id,
      meta: { reason, stripe_refund_id: refund.id, hours: payment.hours_purchased },
    });

    return new Response(JSON.stringify({ ok: true, refund_id: refund.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

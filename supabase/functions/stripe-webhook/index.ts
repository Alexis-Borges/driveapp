// Webhook Stripe : valide les paiements et met à jour le forfait élève
// Configurer l'endpoint dans Stripe Dashboard avec STRIPE_WEBHOOK_SECRET

import Stripe from 'https://esm.sh/stripe@14?target=denonext';
import { adminClient } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('No signature', { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (e) {
    return new Response(
      `Invalid signature: ${e instanceof Error ? e.message : ''}`,
      { status: 400 }
    );
  }

  const admin = adminClient();

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const studentId = intent.metadata.student_id;
    const hours = Number(intent.metadata.hours);

    await admin
      .from('payments')
      .update({
        status: 'succeeded',
        paid_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', intent.id);

    // Cumule au forfait élève
    if (studentId && hours > 0) {
      const { data: s } = await admin
        .from('students')
        .select('package_total_hours, package_started_at')
        .eq('id', studentId)
        .single();
      await admin
        .from('students')
        .update({
          package_total_hours: (s?.package_total_hours ?? 0) + hours,
          package_started_at: s?.package_started_at ?? new Date().toISOString(),
        })
        .eq('id', studentId);
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    await admin
      .from('payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', intent.id);
  }

  return new Response('ok', { status: 200 });
});

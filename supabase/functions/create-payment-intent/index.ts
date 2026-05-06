// Crée un PaymentIntent Stripe avec commission 15% (Stripe Connect destination charges)
// Body: { hours: 1 | 5 | 10, plan: 'one_shot' | 'three_x' }
// Renvoie : { clientSecret, ephemeralKey, customer, paymentId }

import Stripe from 'https://esm.sh/stripe@14?target=denonext';
import { corsHeaders } from '../_shared/cors.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const PRICING: Record<number, number> = {
  1: 3000,
  5: 14000,
  10: 25000,
};

const COMMISSION_BPS = 1500; // 15.00%

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) throw new Error('Missing Authorization');

    const supa = userClient(auth);
    const { data: userRes, error: userErr } = await supa.auth.getUser();
    if (userErr || !userRes.user) throw new Error('Unauthenticated');
    const userId = userRes.user.id;

    const body = await req.json();
    const hours = Number(body.hours);
    const plan = body.plan === 'three_x' ? 'three_x' : 'one_shot';
    const amount = PRICING[hours];
    if (!amount) throw new Error('Pack invalide');

    const admin = adminClient();

    // Récupère l'élève + son moniteur
    const { data: student, error: sErr } = await admin
      .from('students')
      .select('id, instructor_id, profiles(email)')
      .eq('id', userId)
      .single();
    if (sErr || !student) throw new Error('Élève introuvable');
    if (!student.instructor_id) throw new Error('Moniteur non lié');

    const { data: instr } = await admin
      .from('instructors')
      .select('stripe_account_id')
      .eq('id', student.instructor_id)
      .single();

    // Stripe customer
    const email = (student.profiles as { email: string } | null)?.email ?? userRes.user.email;
    const customer = await stripe.customers.create({ email: email ?? undefined });
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-06-20' }
    );

    const fee = Math.round((amount * COMMISSION_BPS) / 10_000);
    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: 'eur',
      customer: customer.id,
      metadata: {
        student_id: userId,
        hours: String(hours),
        plan,
      },
    };
    if (plan === 'three_x') {
      // Klarna "Pay in 3" sur le marché FR : split automatique en 3 mensualités
      // sans frais pour l'élève. Nécessite l'activation Klarna dans le
      // dashboard Stripe (Settings → Payment methods).
      intentParams.payment_method_types = ['klarna'];
      intentParams.payment_method_options = {
        klarna: {
          preferred_locale: 'fr-FR',
        },
      };
    } else {
      intentParams.automatic_payment_methods = { enabled: true };
    }
    if (instr?.stripe_account_id) {
      intentParams.application_fee_amount = fee;
      intentParams.transfer_data = { destination: instr.stripe_account_id };
    }
    const intent = await stripe.paymentIntents.create(intentParams);

    // Pré-enregistre un paiement en pending
    const { data: payment } = await admin
      .from('payments')
      .insert({
        student_id: userId,
        amount_cents: amount,
        hours_purchased: hours,
        plan,
        status: 'pending',
        stripe_payment_intent_id: intent.id,
      })
      .select('id')
      .single();

    return new Response(
      JSON.stringify({
        clientSecret: intent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: customer.id,
        paymentId: payment?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

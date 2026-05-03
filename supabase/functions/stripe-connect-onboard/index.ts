// Crée (ou réutilise) un compte Stripe Connect Express pour le moniteur
// et renvoie une URL d'onboarding (AccountLink) à ouvrir dans un WebBrowser.

import Stripe from 'https://esm.sh/stripe@14?target=denonext';
import { corsHeaders } from '../_shared/cors.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const RETURN_URL = Deno.env.get('STRIPE_CONNECT_RETURN_URL') ?? 'driveapp://stripe/return';
const REFRESH_URL = Deno.env.get('STRIPE_CONNECT_REFRESH_URL') ?? 'driveapp://stripe/refresh';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) throw new Error('Missing Authorization');
    const supa = userClient(auth);
    const { data: userRes, error: e1 } = await supa.auth.getUser();
    if (e1 || !userRes.user) throw new Error('Unauthenticated');
    const userId = userRes.user.id;

    const admin = adminClient();
    const { data: instr, error: e2 } = await admin
      .from('instructors')
      .select('stripe_account_id, id')
      .eq('id', userId)
      .single();
    if (e2 || !instr) throw new Error('Profil moniteur introuvable');

    let accountId = instr.stripe_account_id as string | null;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: userRes.user.email ?? undefined,
        country: 'FR',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
      });
      accountId = account.id;
      await admin
        .from('instructors')
        .update({ stripe_account_id: accountId })
        .eq('id', userId);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: REFRESH_URL,
      return_url: RETURN_URL,
      type: 'account_onboarding',
    });

    // Vérifie l'état de complétion
    const account = await stripe.accounts.retrieve(accountId);
    const verified = !!(account.details_submitted && account.charges_enabled);
    if (verified !== instr) {
      await admin.from('instructors').update({ is_verified: verified }).eq('id', userId);
    }

    return new Response(
      JSON.stringify({ url: link.url, account_id: accountId, verified }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

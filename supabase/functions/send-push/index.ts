// Envoie une notification push Expo aux tokens d'un user_id
// Body: { user_id: string, title: string, body: string, data?: object }

import { corsHeaders } from '../_shared/cors.ts';
import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, data } = await req.json();
    if (!user_id || !title || !body) throw new Error('Missing fields');

    const admin = adminClient();

    // Historique d'abord, envoi ensuite : une notification doit rester
    // consultable même sans token push (permission refusée, appareil éteint)
    // ou si Expo échoue. C'est le seul point de passage de tous les envois,
    // triggers DB compris.
    const { error: histErr } = await admin.from('notifications').insert({
      user_id,
      title,
      body,
      data: data ?? {},
    });
    // Un historique en échec ne doit pas empêcher la notification de partir.
    if (histErr) console.error('notification history insert failed:', histErr.message);

    const { data: tokens } = await admin
      .from('push_tokens')
      .select('token')
      .eq('user_id', user_id);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, stored: !histErr }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data: data ?? {},
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const json = await res.json();

    return new Response(JSON.stringify({ sent: messages.length, expo: json }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Génère une facture PDF (HTML → renvoi data URL ou upload Storage)
// Body: { payment_id: string }
// Auth requise — élève propriétaire ou moniteur lié ou admin.
//
// Implémentation : on génère un HTML auto-portant qu'on upload comme HTML dans
// le bucket "invoices" (Supabase Storage) puis on renvoie une URL signée.
// Pour un vrai PDF il faut un renderer (Puppeteer/Browserless) — voir TODO.

import { corsHeaders } from '../_shared/cors.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';

const VAT_BPS = 2000; // 20.00 %

function htmlInvoice(params: {
  number: string;
  date: string;
  buyer: { name: string; email: string };
  seller: { name: string; address: string; siret?: string };
  lines: { label: string; qty: number; unit_ht: number; total_ht: number }[];
  total_ht: number;
  vat: number;
  total_ttc: number;
}) {
  const fmt = (cents: number) => (cents / 100).toFixed(2) + ' €';
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Facture ${params.number}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;padding:32px;color:#222;max-width:720px;margin:auto}
  h1{font-size:22px;margin:0 0 4px}
  .muted{color:#666;font-size:12px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th,td{text-align:left;padding:8px;border-bottom:1px solid #eee;font-size:13px}
  tfoot td{font-weight:700;border:none}
  .right{text-align:right}
</style></head><body>
  <h1>Facture ${params.number}</h1>
  <div class="muted">Émise le ${params.date}</div>

  <div class="grid">
    <div>
      <div class="muted">Vendeur</div>
      <strong>${params.seller.name}</strong><br/>
      ${params.seller.address}<br/>
      ${params.seller.siret ? 'SIRET : ' + params.seller.siret : ''}
    </div>
    <div>
      <div class="muted">Acheteur</div>
      <strong>${params.buyer.name}</strong><br/>
      ${params.buyer.email}
    </div>
  </div>

  <table>
    <thead><tr><th>Désignation</th><th>Qté</th><th class="right">PU HT</th><th class="right">Total HT</th></tr></thead>
    <tbody>
      ${params.lines
        .map(
          (l) =>
            `<tr><td>${l.label}</td><td>${l.qty}</td><td class="right">${fmt(l.unit_ht)}</td><td class="right">${fmt(l.total_ht)}</td></tr>`
        )
        .join('')}
    </tbody>
    <tfoot>
      <tr><td colspan="3" class="right">Total HT</td><td class="right">${fmt(params.total_ht)}</td></tr>
      <tr><td colspan="3" class="right">TVA (20 %)</td><td class="right">${fmt(params.vat)}</td></tr>
      <tr><td colspan="3" class="right">Total TTC</td><td class="right">${fmt(params.total_ttc)}</td></tr>
    </tfoot>
  </table>

  <p class="muted" style="margin-top:32px">
    Pénalités de retard : 3× le taux d'intérêt légal. Indemnité forfaitaire de
    recouvrement : 40 €. TVA acquittée sur les débits.
  </p>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) throw new Error('Missing Authorization');
    const supa = userClient(auth);
    const { data: userRes, error } = await supa.auth.getUser();
    if (error || !userRes.user) throw new Error('Unauthenticated');

    const { payment_id } = await req.json();
    if (!payment_id) throw new Error('payment_id required');

    const admin = adminClient();
    const { data: payment, error: pErr } = await admin
      .from('payments')
      .select('*, students!inner(id, instructor_id, profiles!inner(first_name, last_name, email))')
      .eq('id', payment_id)
      .single();
    if (pErr || !payment) throw new Error('Paiement introuvable');

    const studentId = (payment as { student_id: string }).student_id;
    const instructorId = (payment as { students: { instructor_id: string } }).students.instructor_id;

    if (
      userRes.user.id !== studentId &&
      userRes.user.id !== instructorId
    ) {
      const { data: actor } = await admin
        .from('profiles')
        .select('role')
        .eq('id', userRes.user.id)
        .maybeSingle();
      if (!actor || actor.role !== 'admin') throw new Error('Forbidden');
    }

    // Réutilise une facture existante
    const { data: existing } = await admin
      .from('invoices')
      .select('*')
      .eq('payment_id', payment_id)
      .maybeSingle();

    let invoice = existing;
    if (!invoice) {
      const { data: numRow } = await admin.rpc('next_invoice_number');
      const number = (numRow as string) ?? `FA-TMP-${Date.now()}`;
      const ttc = (payment as { amount_cents: number }).amount_cents;
      const ht = Math.round(ttc / (1 + VAT_BPS / 10000));
      const vat = ttc - ht;

      const { data: ins, error: insErr } = await admin
        .from('invoices')
        .insert({
          number,
          payment_id,
          student_id: studentId,
          amount_cents_ht: ht,
          vat_rate_bps: VAT_BPS,
          amount_cents_ttc: ttc,
        })
        .select('*')
        .single();
      if (insErr) throw insErr;
      invoice = ins;
    }

    const buyer = (payment as { students: { profiles: { first_name: string; last_name: string; email: string } } })
      .students.profiles;

    // Récup vendeur (moniteur)
    const { data: sellerInstr } = await admin
      .from('instructors')
      .select('agreement_number, profiles!inner(first_name, last_name)')
      .eq('id', instructorId)
      .maybeSingle();
    const sellerName =
      sellerInstr
        ? `${(sellerInstr as { profiles: { first_name: string; last_name: string } }).profiles.first_name} ${(sellerInstr as { profiles: { first_name: string; last_name: string } }).profiles.last_name}`
        : 'Moniteur DriveApp';

    const inv = invoice as {
      number: string;
      issued_at: string;
      amount_cents_ht: number;
      amount_cents_ttc: number;
    };
    const html = htmlInvoice({
      number: inv.number,
      date: new Date(inv.issued_at).toLocaleDateString('fr-FR'),
      buyer: {
        name: `${buyer.first_name} ${buyer.last_name}`,
        email: buyer.email,
      },
      seller: {
        name: sellerName,
        address: 'France',
        siret: (sellerInstr as { agreement_number: string } | null)?.agreement_number,
      },
      lines: [
        {
          label: `Forfait ${(payment as { hours_purchased: number }).hours_purchased} h de conduite`,
          qty: (payment as { hours_purchased: number }).hours_purchased,
          unit_ht: Math.round(inv.amount_cents_ht / (payment as { hours_purchased: number }).hours_purchased),
          total_ht: inv.amount_cents_ht,
        },
      ],
      total_ht: inv.amount_cents_ht,
      vat: inv.amount_cents_ttc - inv.amount_cents_ht,
      total_ttc: inv.amount_cents_ttc,
    });

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Tarifs des packs d'heures de conduite, en centimes. Source de vérité unique
// entre le client et l'edge function create-payment-intent (duplication
// inévitable côté Deno mais alignée par convention de revue).

export type PackHours = 1 | 5 | 10;

export const PACKS: ReadonlyArray<{ hours: PackHours; amountCents: number }> = [
  { hours: 1, amountCents: 3000 },
  { hours: 5, amountCents: 14000 },
  { hours: 10, amountCents: 25000 },
];

// Prix en centimes pour un nombre d'heures donné, ou null si le pack
// n'existe pas (à valider côté appelant pour bloquer un montant arbitraire).
export function priceForPack(hours: number): number | null {
  return PACKS.find((p) => p.hours === hours)?.amountCents ?? null;
}

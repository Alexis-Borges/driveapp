import { PACKS, priceForPack } from '../lib/pricing';

describe('PACKS', () => {
  test('expose 3 packs : 1h, 5h, 10h', () => {
    expect(PACKS.map((p) => p.hours)).toEqual([1, 5, 10]);
  });

  test('tarifs FR en centimes (30 € / 140 € / 250 €)', () => {
    expect(PACKS).toEqual([
      { hours: 1, amountCents: 3000 },
      { hours: 5, amountCents: 14000 },
      { hours: 10, amountCents: 25000 },
    ]);
  });
});

describe('priceForPack', () => {
  test('renvoie le prix en centimes pour un pack valide', () => {
    expect(priceForPack(1)).toBe(3000);
    expect(priceForPack(5)).toBe(14000);
    expect(priceForPack(10)).toBe(25000);
  });

  test('renvoie null pour une valeur inconnue (anti-injection)', () => {
    expect(priceForPack(0)).toBeNull();
    expect(priceForPack(2)).toBeNull();
    expect(priceForPack(100)).toBeNull();
    expect(priceForPack(-1)).toBeNull();
  });
});

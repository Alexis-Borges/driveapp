import {
  PLANNING_HOURS,
  BOOKABLE_HOURS,
  PAUSE_HOUR,
  hoursUntil,
  isLessonCritical,
  isInAmberWindow,
  bookableHoursFor,
  isLunchBreak,
} from '../lib/planning';

const NOW = new Date('2026-06-01T08:00:00.000Z').getTime();
// Décalages depuis NOW, en millisecondes.
const inHours = (h: number) => new Date(NOW + h * 60 * 60 * 1000).toISOString();

describe('plage horaire planning', () => {
  test('PLANNING_HOURS couvre 8h → 21h en continu', () => {
    expect(PLANNING_HOURS[0]).toBe(8);
    expect(PLANNING_HOURS[PLANNING_HOURS.length - 1]).toBe(21);
    expect(PLANNING_HOURS).toHaveLength(14);
  });

  test('BOOKABLE_HOURS = grille sans la pause déjeuner', () => {
    expect(BOOKABLE_HOURS).not.toContain(PAUSE_HOUR);
    expect(PLANNING_HOURS).toContain(PAUSE_HOUR);
    expect(BOOKABLE_HOURS).toHaveLength(PLANNING_HOURS.length - 1);
  });
});

describe('hoursUntil', () => {
  test('séance dans 5 h → +5', () => {
    expect(hoursUntil(inHours(5), NOW)).toBeCloseTo(5);
  });
  test('séance passée → négatif', () => {
    expect(hoursUntil(inHours(-3), NOW)).toBeCloseTo(-3);
  });
  test('accepte un objet Date', () => {
    expect(hoursUntil(new Date(NOW + 2 * 3600 * 1000), NOW)).toBeCloseTo(2);
  });
});

describe('isLessonCritical', () => {
  const base = { scheduledAt: inHours(24), status: 'confirmed', now: NOW };

  test('solde négatif + séance <48h + active → critique', () => {
    expect(isLessonCritical({ ...base, balanceHours: -2 })).toBe(true);
  });

  test('solde positif → jamais critique', () => {
    expect(isLessonCritical({ ...base, balanceHours: 3 })).toBe(false);
  });

  test('solde nul → pas critique', () => {
    expect(isLessonCritical({ ...base, balanceHours: 0 })).toBe(false);
  });

  test('séance au-delà de 48h → pas critique', () => {
    expect(
      isLessonCritical({ balanceHours: -2, scheduledAt: inHours(60), status: 'confirmed', now: NOW })
    ).toBe(false);
  });

  test('séance passée → pas critique', () => {
    expect(
      isLessonCritical({ balanceHours: -2, scheduledAt: inHours(-5), status: 'confirmed', now: NOW })
    ).toBe(false);
  });

  test('séance pile à 48h → critique (borne incluse)', () => {
    expect(
      isLessonCritical({ balanceHours: -1, scheduledAt: inHours(48), status: 'confirmed', now: NOW })
    ).toBe(true);
  });

  test('statut annulé/terminé → pas critique', () => {
    for (const status of ['cancelled', 'auto_cancelled', 'completed']) {
      expect(isLessonCritical({ ...base, balanceHours: -2, status })).toBe(false);
    }
  });

  test('statut pending → critique si conditions réunies', () => {
    expect(isLessonCritical({ ...base, balanceHours: -2, status: 'pending' })).toBe(true);
  });
});

describe('isInAmberWindow (48-72h)', () => {
  test('séance à 60h → dans la fenêtre', () => {
    expect(isInAmberWindow(inHours(60), NOW)).toBe(true);
  });
  test('séance à 24h → trop proche (relève du critique)', () => {
    expect(isInAmberWindow(inHours(24), NOW)).toBe(false);
  });
  test('séance à 96h → trop loin', () => {
    expect(isInAmberWindow(inHours(96), NOW)).toBe(false);
  });
  test('bornes 48h et 72h incluses', () => {
    expect(isInAmberWindow(inHours(48), NOW)).toBe(true);
    expect(isInAmberWindow(inHours(72), NOW)).toBe(true);
  });
});

describe('pause déjeuner configurable par moniteur', () => {
  test('par défaut 13h est fermé', () => {
    expect(bookableHoursFor(false)).not.toContain(PAUSE_HOUR);
    expect(bookableHoursFor(false)).toEqual(BOOKABLE_HOURS);
  });

  test('moniteur qui travaille à 13h → créneau ouvert', () => {
    expect(bookableHoursFor(true)).toContain(PAUSE_HOUR);
    expect(bookableHoursFor(true)).toEqual(PLANNING_HOURS);
  });

  // Le réglage arrive d'une requête réseau : il est undefined au premier
  // rendu et null si la ligne instructors manque. Les deux doivent se
  // comporter comme "pause fermée", jamais ouvrir le créneau par accident.
  test('valeur absente → comportement par défaut (fermé)', () => {
    expect(bookableHoursFor(undefined)).not.toContain(PAUSE_HOUR);
    expect(bookableHoursFor(null)).not.toContain(PAUSE_HOUR);
  });

  test('isLunchBreak ne concerne que 13h', () => {
    expect(isLunchBreak(PAUSE_HOUR, false)).toBe(true);
    expect(isLunchBreak(PAUSE_HOUR, true)).toBe(false);
    expect(isLunchBreak(10, false)).toBe(false);
    expect(isLunchBreak(10, true)).toBe(false);
  });
});

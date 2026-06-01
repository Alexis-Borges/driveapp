import { isActiveLesson } from '../lib/lessons';

describe('isActiveLesson', () => {
  test('compte les leçons utiles dans le solde', () => {
    expect(isActiveLesson('pending')).toBe(true);
    expect(isActiveLesson('confirmed')).toBe(true);
    expect(isActiveLesson('completed')).toBe(true);
  });

  test('exclut les leçons annulées (libèrent le créneau)', () => {
    expect(isActiveLesson('cancelled')).toBe(false);
    expect(isActiveLesson('auto_cancelled')).toBe(false);
  });

  test('tolère un statut inconnu (considéré actif)', () => {
    // côté serveur on a un enum strict, mais en cas de drift on préfère
    // afficher la leçon plutôt que la masquer silencieusement.
    expect(isActiveLesson('unknown_status')).toBe(true);
  });
});

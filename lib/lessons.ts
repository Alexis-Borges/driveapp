// Helpers purs autour des séances. Centralise filtres et libellés répétés
// à travers les écrans (planning jour, semaine, accueil, fiche élève).

import type { LessonStatus, LessonType } from '../hooks/useLessons';

// Une séance "active" est celle qui occupe réellement un créneau : ni
// annulée par l'élève, ni auto-annulée par la règle 48h. Sert à filtrer les
// grilles du planning et à compter les heures bookées dans le solde.
export function isActiveLesson(status: LessonStatus | string): boolean {
  return status !== 'cancelled' && status !== 'auto_cancelled';
}

// Libellé FR uniforme du statut. Accord féminin (« séance »).
// Source de vérité unique : remplace les variantes "En attente" / "À valider"
// /  "En attente de validation" éparpillées dans l'UI.
export function statusLabel(status: LessonStatus | string): string {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'confirmed':
      return 'Confirmée';
    case 'completed':
      return 'Terminée';
    case 'cancelled':
      return 'Annulée';
    case 'auto_cancelled':
      return 'Annulée (48h)';
    default:
      return status;
  }
}

// Libellé FR uniforme du type de séance. Remplace les TYPE_LABEL dupliqués
// dans (instructor)/planning, (student)/planning, et le seed.
export function typeLabel(type: LessonType | string): string {
  switch (type) {
    case 'city':
      return 'Ville';
    case 'highway':
      return 'Autoroute';
    case 'parking':
      return 'Parking';
    case 'evaluation':
      return 'Évaluation';
    case 'mock_exam':
      return 'Examen blanc';
    case 'other':
      return 'Autre';
    default:
      return type;
  }
}

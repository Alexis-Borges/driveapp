// Helpers purs autour des leçons. Centralise les filtres répétés à travers
// les écrans (planning jour, semaine, élève).

import type { LessonStatus } from '../hooks/useLessons';

// Une leçon "active" est celle qui occupe réellement un créneau : ni annulée
// par l'élève, ni auto-annulée par la règle 48h. Sert à filtrer les grilles
// du planning et à compter les heures bookées dans le solde.
export function isActiveLesson(status: LessonStatus | string): boolean {
  return status !== 'cancelled' && status !== 'auto_cancelled';
}

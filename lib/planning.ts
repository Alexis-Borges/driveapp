// Source de vérité unique pour la plage horaire du planning.
// Toute grille (jour, semaine), création de créneau et règle récurrente
// doivent s'appuyer sur ces constantes pour rester cohérentes.

export const PLANNING_START_HOUR = 8;
export const PLANNING_END_HOUR = 21;
export const PAUSE_HOUR = 13; // pause déjeuner

// Heures affichées dans la grille du planning (8h → 21h, pause incluse).
export const PLANNING_HOURS: number[] = Array.from(
  { length: PLANNING_END_HOUR - PLANNING_START_HOUR + 1 },
  (_, i) => PLANNING_START_HOUR + i
);

// Heures réservables : grille moins la pause déjeuner.
// Utilisée pour la création de créneau et les règles récurrentes.
export const BOOKABLE_HOURS: number[] = PLANNING_HOURS.filter(
  (h) => h !== PAUSE_HOUR
);

// Fenêtres temporelles de la règle 48 h.
export const CRITICAL_WINDOW_HOURS = 48; // séance impayée < 48 h = annulation auto
export const AMBER_WINDOW_START_HOURS = 48; // alerte préventive 48 h → 72 h
export const AMBER_WINDOW_END_HOURS = 72;

const HOUR_MS = 60 * 60 * 1000;

// Nombre d'heures (signé) entre maintenant et la séance.
// Négatif si la séance est passée.
export function hoursUntil(scheduledAt: string | Date, now: number = Date.now()): number {
  const ts = scheduledAt instanceof Date ? scheduledAt.getTime() : new Date(scheduledAt).getTime();
  return (ts - now) / HOUR_MS;
}

// Une séance est CRITIQUE quand l'élève est en dépassement (solde < 0), que la
// séance est dans les 48 h à venir et qu'elle est encore active
// (pending/confirmed). C'est elle qui sera auto-annulée si l'impayé persiste.
export function isLessonCritical(params: {
  balanceHours: number;
  scheduledAt: string | Date;
  status: string;
  now?: number;
}): boolean {
  const { balanceHours, scheduledAt, status, now = Date.now() } = params;
  if (balanceHours >= 0) return false;
  if (status !== 'pending' && status !== 'confirmed') return false;
  const delta = hoursUntil(scheduledAt, now);
  return delta >= 0 && delta <= CRITICAL_WINDOW_HOURS;
}

// Alerte amber (préventive) : séance dans la fenêtre 48 h → 72 h. Combinée à un
// solde négatif côté appelant, elle signale un règlement à venir imminent.
export function isInAmberWindow(scheduledAt: string | Date, now: number = Date.now()): boolean {
  const delta = hoursUntil(scheduledAt, now);
  return delta >= AMBER_WINDOW_START_HOURS && delta <= AMBER_WINDOW_END_HOURS;
}


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

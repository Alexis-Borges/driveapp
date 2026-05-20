// Helpers partagés pour les scripts de seed / simulation de données dev.
// Scripts standalone (.mjs) : exécutés avec `node`, hors du bundle Expo.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Charge un fichier .env dans process.env sans écraser les variables déjà définies.
function loadEnvFile(name) {
  const path = join(ROOT, name);
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.seed');

// Client Supabase avec la clé service_role (bypass RLS). Réservé aux scripts.
export function adminClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL manquant — vérifie ton fichier .env.');
  }
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY manquant.\n' +
        'Copie .env.seed.example vers .env.seed et colle ta clé service_role\n' +
        '(Supabase Dashboard > Project Settings > API > service_role).'
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Tous les comptes de dev partagent ce domaine — permet de les purger sans risque.
export const DEV_DOMAIN = 'driveapp.dev';
export const DEV_PASSWORD = process.env.SEED_PASSWORD || 'DriveDev2026!';

// Plage horaire réservable (identique à lib/planning.ts : 8h-21h sans la pause 13h).
export const BOOKABLE_HOURS = [8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21];

// Tarifs des packs, en centimes (cf. create-payment-intent).
export const PACK_PRICE = { 1: 3000, 5: 14000, 10: 25000 };

// Pool de types de leçon, pondéré vers la conduite en ville.
export const LESSON_TYPES = [
  'city',
  'city',
  'city',
  'highway',
  'parking',
  'evaluation',
  'mock_exam',
];

export const rint = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Date à `daysFromNow` jours (négatif = passé), à l'heure pile indiquée.
export function atHour(daysFromNow, hour) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// Date à `hoursFromNow` heures, ramenée dans la plage 8h-21h pour rester
// visible dans la grille du planning.
export function hoursFromNow(h) {
  const d = new Date(Date.now() + h * 3600 * 1000);
  let hr = d.getHours();
  if (hr < 8) hr = 8;
  else if (hr > 21) hr = 21;
  d.setHours(hr, 0, 0, 0);
  return d;
}

// Format date FR court pour les logs.
export function fmtDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function randomPhone() {
  return '06' + String(rint(10000000, 99999999));
}

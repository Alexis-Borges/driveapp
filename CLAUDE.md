# DriveApp — Brief Claude Code

Application mobile pour mettre en relation moniteurs d'auto-école indépendants
et élèves : planning, paiement Stripe Connect, messagerie, suivi pédagogique
REMC.

## Stack

- **Mobile** : Expo SDK 54 (React Native 0.81, React 19)
- **Navigation** : Expo Router (file-based)
- **State** : Zustand + React Query (TanStack)
- **Backend** : Supabase (Auth + Postgres + Realtime + Storage + Edge Functions)
- **Paiement** : Stripe Connect (destination charges, commission 15 %)
- **Push** : Expo Notifications
- **Style** : NativeWind (Tailwind RN)
- **Forms** : React Hook Form + Zod
- **Build** : EAS Build (iOS + Android)
- **Observability** : Sentry + PostHog (lazy init, no-op si DSN absent)

## Structure dossiers

```
driveapp/
├── app/                          # Expo Router
│   ├── (auth)/                   # login, signup, reset, verify
│   ├── (instructor)/             # rôle moniteur
│   │   ├── (tabs)/               # home, planning, messages, profile
│   │   ├── chat/[studentId].tsx  # chat individuel
│   │   ├── student/[id].tsx      # fiche élève + REMC
│   │   ├── recurring.tsx         # créneaux récurrents
│   │   └── leaves.tsx            # congés
│   ├── (student)/                # rôle élève
│   │   ├── (tabs)/               # home, planning, messages, shop, profile
│   │   ├── competences.tsx       # vue REMC
│   │   └── invoices.tsx          # factures PDF
│   ├── (admin)/                  # back-office
│   │   └── home.tsx              # stats + refund inline
│   ├── legal/                    # CGU, privacy, mentions
│   └── _layout.tsx               # auth gate + email-verify gate
├── components/{ui,instructor,student,shared}/
├── hooks/                        # useLessons, useBalance, useMessages, etc.
├── lib/                          # supabase, validation, observability, theme
├── stores/                       # authStore (Zustand)
├── types/                        # database.ts (Supabase types)
└── supabase/
    ├── migrations/               # 002 → 013, à appliquer dans l'ordre
    └── functions/                # 11 edge functions
```

## Design system

```ts
colors = {
  bg:      '#0C0D0F',
  card:    '#191C20',
  text:    '#EEEEF0',
  muted:   '#878D9A',
  instructor: '#7C75FF',  // accent moniteur (violet)
  student:    '#00C896',  // accent élève (vert)
  danger:  '#FF4F4F',
  warning: '#FFB230',
  border:  'rgba(255,255,255,0.07)',
}
fonts = { sans: 'DMSans', mono: 'DMMono' }
```

## Rôles & flows

**3 rôles** : `instructor`, `student`, `admin` (enum `user_role`).
Routage automatique par rôle dans `app/_layout.tsx`.

### Auth + onboarding
- Signup avec choix rôle (élève / moniteur).
- Élève : code parrainage optionnel, lien d'invitation moniteur.
- Moniteur : N° agrément requis (verrouillé après création).
- **Email verification obligatoire** avant réservation (gate `/(auth)/verify`).

### Liaison élève ↔ moniteur
- Moniteur invite via email (`InviteStudentSheet`).
- Élève peut aussi initier la liaison via `LinkInstructorSheet`.
- `students.instructor_id` rempli après acceptation.

### Réservation séance (élève)
- Voit créneaux libres du planning de son moniteur.
- Tap créneau → `useBookSlot` → status `pending`.
- Moniteur reçoit push → confirme (status `confirmed`) ou refuse.
- Bouton désactivé si pas d'heures payées disponibles.

### Paiement (Stripe Connect)
- **Destination charges** avec commission 15 %.
- 3 packs : 1 h (30 €), 5 h (140 €), 10 h (250 €).
- Modal 1× ou 3× sans frais (3× actuellement traité comme 1× — TODO BNPL).
- Edge function `create-payment-intent` → webhook `stripe-webhook`.
- Webhook met à jour `payments.status = 'succeeded'` et incrémente le forfait.

### Règle 48 h (auto-cancel)
- Cron pg_cron `driveapp-auto-cancel-48h` toutes les heures à h:05.
- Edge function `auto-cancel-48h` : annule les leçons < 48 h avec `balance_hours < 0`.
- Notif push automatique élève + moniteur.

### Slot CRITIQUE auto
- Une séance est marquée **critique** quand : `balance_hours < 0` ET séance dans
  les 48 h prochaines ET status `pending`/`confirmed`.
- Calculé côté client dans `home.tsx` et `planning.tsx` du moniteur.

### Alertes Accueil moniteur
- **Rouge** : élève en dépassement d'heures (any).
- **Amber** : élève en dépassement avec séance dans 48–72 h (warning préventif).
- Bouton "Relancer" / "Rappeler" → `usePaymentReminder` (insère un message,
  trigger DB envoie le push).

### Tri élèves
- Par solde croissant (négatif → positif) dans `useStudents.ts:62`.
- Permet au moniteur de voir en haut les élèves en dépassement.

### Chat realtime
- Channel Supabase `messages:${userId}:${otherId}`.
- Trigger DB `notify_new_message` → push notif au destinataire.
- Long-press sur thread (moniteur) = marquer non lu.

### Messages élève
- Pas de liste de threads : ouvre directement le chat avec sa monitrice.
- Conversation 1-1 unique.

### Parrainage
- Bloc UNIQUEMENT en Boutique (retiré de l'Accueil).
- Code auto-généré au signup : `PRENOM` + 2 chiffres aléatoires.
- 1 filleul payant = 1 séance offerte (pack ≥ 5 h) ou −50 €.
- Trigger DB `grant_referral_reward` au premier paiement réussi.

### Compétences REMC
- 4 compétences générales × 4 sous-compétences chacune (16 total).
- Status : `not_started`, `in_progress`, `acquired`.
- Moniteur édite depuis `/(instructor)/student/[id].tsx`.
- Élève consulte depuis `/(student)/competences`.

### RGPD
- Export JSON complet via `useRgpdExport` → edge function `rgpd-export`.
- Suppression compte via `useRgpdDelete` → anonymise profil + supprime
  `auth.user`. Paiements/factures conservés 10 ans (obligation comptable).

## Schéma DB — vue d'ensemble

Tables principales :
- `profiles` (extension de `auth.users`)
- `instructors` (agreement, hourly_rate, zone_geo, experience_years, stripe_account_id, is_verified)
- `students` (instructor_id, package_total_hours, referral_code, referred_by)
- `lessons` (instructor_id, student_id, scheduled_at, status, type, feedback, rating, student_comment, cancelled_reason, pickup_address)
- `payments` (stripe_payment_intent_id, plan, status, hours_purchased)
- `messages` (sender, recipient, content, read_at)
- `referrals` (referrer, referred, reward_type, reward_claimed)
- `recurring_slots` (weekday, hour, type, active)
- `instructor_leaves` (starts_at, ends_at, reason)
- `competences` + `student_competences`
- `invoices` (number FA-YYYY-XXXXXX, vat_rate_bps)
- `audit_log`
- `push_tokens`

Vue : `student_balance` (hours_paid - hours_booked).

RLS strict sur toutes les tables. Helper `is_admin(uid)` pour les
super-policies admin.

## Edge Functions (`supabase/functions/`)

- `create-payment-intent` — Stripe payment intent + commission 15 %
- `stripe-webhook` — handle payment_intent.succeeded
- `stripe-connect-onboard` — Account Link Connect Express
- `auto-cancel-48h` — cron règle 48 h
- `lesson-reminders` — cron rappels J-1
- `send-push` — envoi notifs Expo
- `admin-refund` — refund Stripe + reverse hours + audit
- `rgpd-export` — export JSON RGPD art. 20
- `rgpd-delete` — anonymise + supprime user
- `invoice-pdf` — facture HTML/PDF FR
- `generate-recurring-slots` — cron dimanche 23 h, génère 4 semaines

## Variables d'environnement

```env
# Mobile (.env)
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_SENTRY_DSN=          # optionnel
EXPO_PUBLIC_POSTHOG_KEY=         # optionnel
EXPO_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
EXPO_PUBLIC_CAPTCHA_TOKEN=       # token hCaptcha (optionnel)
EXPO_PUBLIC_ENV=production

# Edge functions (supabase secrets set)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_RETURN_URL=driveapp://stripe/return
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Voir `PRODUCTION_SETUP.md` pour la procédure complète de déploiement.

## Notes pour Claude Code

1. **Branche de dev** : `claude/onboarding-validation-ui-Z4O9E` puis merge sur `main`.
2. Toujours lire `PRODUCTION_SETUP.md` avant de modifier les migrations ou
   les edge functions — l'ordre des migrations 002 → 013 est important.
3. Stripe : tester avec `pk_test_*` et `sk_test_*` avant de basculer.
4. Régénérer les types après tout changement DB :
   `npm run supabase:types`.
5. Pour les flows critiques (paiement, auto-cancel, push), valider en E2E sur
   un device physique via Expo Go avant de merger.
6. Respecter le tri élèves (négatif → positif) et la logique slot CRITIQUE
   (balance < 0 ET séance < 48 h).
7. Ne pas réintroduire le bloc parrainage sur l'Accueil élève — il est
   exclusivement en Boutique.

## Liens utiles

- Expo Router : https://docs.expo.dev/router/introduction/
- Supabase Auth RN : https://supabase.com/docs/guides/auth/quickstarts/react-native
- Stripe Connect Destination Charges : https://docs.stripe.com/connect/destination-charges
- NativeWind : https://www.nativewind.dev/
- EAS Build : https://docs.expo.dev/build/introduction/
- pg_cron : https://supabase.com/docs/guides/database/extensions/pg_cron

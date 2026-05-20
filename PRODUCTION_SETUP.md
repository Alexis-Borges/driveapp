# DriveApp — Setup production

Étapes manuelles à compléter pour passer en prod après ce sprint.

## 1. Dépendances

```bash
npm install
```

Nouveaux packages : `expo-clipboard`, `@sentry/react-native`, `posthog-react-native`,
`lucide-react-native`, `react-native-svg`, `jest`, `jest-expo`, `@types/jest`.

## 2. Variables d'environnement

Dans `.env` (et `EAS Secrets` pour les builds) :

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...   # ⚠ live, plus test_

# Observability
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/yyy
EXPO_PUBLIC_POSTHOG_KEY=phc_xxx
EXPO_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
EXPO_PUBLIC_ENV=production

# hCaptcha (optionnel — Supabase Auth → Settings → Captcha)
EXPO_PUBLIC_CAPTCHA_TOKEN=  # token généré côté UI par <HCaptcha />
```

Côté Supabase Edge Functions (`supabase secrets set`) :

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_RETURN_URL=driveapp://stripe/return
STRIPE_CONNECT_REFRESH_URL=driveapp://stripe/refresh
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 3. Migrations DB

À exécuter dans l'ordre dans Supabase Dashboard → SQL Editor :

```
supabase/migrations/008_rls_audit.sql
supabase/migrations/009_pg_cron.sql
supabase/migrations/010_recurring_and_leaves.sql
supabase/migrations/011_competences_remc.sql
supabase/migrations/012_invoices_admin_audit.sql
supabase/migrations/013_refund_helper_and_cron.sql
supabase/migrations/014_push_config_fix.sql
supabase/migrations/015_handle_new_user.sql
supabase/migrations/016_fix_handle_new_user.sql
```

Puis activer la **réplication realtime** sur la table `lessons` (Database →
Replication → cocher `lessons`).

Configurer les credentials push (⚠️ étape manuelle obligatoire — à faire
après avoir appliqué la migration 014) :

```sql
-- Remplace les valeurs par tes vraies credentials Supabase
INSERT INTO _app_config (key, value)
VALUES
  ('supabase_url', 'https://TON_PROJECT_ID.supabase.co'),
  ('service_role_key', 'eyJ...ta_service_role_key...')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

⚠️ `ALTER DATABASE postgres SET app.*` n'est **pas** supporté sur Supabase
hébergé — la migration 014 remplace cette approche par la table `_app_config`.

## 4. Edge Functions

```bash
npm run supabase:deploy:fns
```

Déploie : `create-payment-intent`, `stripe-webhook`, `stripe-connect-onboard`,
`auto-cancel-48h`, `lesson-reminders`, `send-push`, `admin-refund`,
`rgpd-export`, `rgpd-delete`, `invoice-pdf`, `generate-recurring-slots`.

## 5. Stripe

### Activation du 3× sans frais (Klarna)
Le code utilise **Klarna Pay-in-3** (split natif en 3 mensualités sans frais
côté client) quand l'élève choisit `3× sans frais`.

Étapes obligatoires côté Stripe Dashboard :
1. Settings → Payment methods → activer **Klarna**
2. Accepter les conditions Klarna pour la France
3. Vérifier que le compte Connect du moniteur supporte aussi Klarna
   (sinon le paiement échouera avec une erreur "payment method not available")

Tant que Klarna n'est pas activé, le bouton 3× tombe en erreur "method not
available". Pour basculer en mode dégradé, modifier
`supabase/functions/create-payment-intent/index.ts` et retirer le bloc
`if (plan === 'three_x')`.

### Webhook
- Créer le webhook prod : `https://xxx.supabase.co/functions/v1/stripe-webhook`
  (events : `payment_intent.succeeded`, `payment_intent.payment_failed`,
  `account.updated`).
- Activer Stripe Connect Express en mode live, accepter les conditions.
- Pour le **3× sans frais** : activer Klarna ou Affirm dans le dashboard
  Stripe (selon marché). Le code actuel envoie `plan: 'three_x'` au backend ;
  il faudra adapter `create-payment-intent` pour ouvrir un PaymentMethod BNPL.

## 6. App Stores

- App Store Connect : créer l'app, remplir la fiche, uploader les screenshots
  (5 × iPhone 6.7", 5 × iPhone 5.5").
- Google Play Console : idem (8 screenshots min, 1 graphique de fonctionnalité
  1024×500).
- `eas build --profile production --platform all`
- `eas submit --platform all`

## 7. Légal

Les pages `/legal/cgu`, `/legal/privacy`, `/legal/mentions` sont des
brouillons à faire valider par un avocat / DPO avant publication. Compléter
notamment :

- Mentions légales (raison sociale, SIRET, capital, RCS, TVA)
- Adresse du DPO
- Tribunal compétent
- Conditions des plans 3× (mentions Stripe BNPL obligatoires)

## 8. Tests

```bash
# Tests unitaires (validation schemas)
npm test
npm run typecheck

# Tests UI automatisés avec Maestro (sur device/émulateur)
# Prérequis : maestro installé, app lancée dans Expo Go
maestro test .maestro/

# Voir .maestro/README.md pour les identifiants de test et les flows disponibles
```

## 9. Monitoring post-launch

- Sentry : surveiller le taux d'erreur < 0.5 %.
- PostHog : créer un dashboard avec `signup`, `link_instructor`,
  `pack_purchased`, `lesson_booked`. (Les événements sont à wrapper avec
  `track('lesson_booked', { … })` aux endroits clés — j'ai laissé l'API
  prête, à brancher.)
- Audit log : `select * from audit_log order by created_at desc limit 50`
  visible côté admin.

## 10. Rôle admin

Pour créer le premier admin :

```sql
update profiles set role = 'admin' where email = 'toi@driveapp.fr';
```

Il sera alors redirigé vers `/(admin)/home` au prochain login.

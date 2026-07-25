# Commandes du projet

Toutes les commandes utiles, regroupées par tâche. Les scripts sont définis
dans `package.json` — préfère-les aux commandes brutes, ils portent déjà les
bons arguments (identifiant du projet Supabase, profil EAS, canal…).

---

## Développement quotidien

| Commande | Ce qu'elle fait |
|---|---|
| `npm start` | Lance Metro. QR code sur le réseau local — testeurs sur le **même Wi-Fi**. |
| `npm run tunnel` | Idem via ngrok : marche depuis n'importe quel réseau. **C'est ce qu'il faut pour les testeurs iPhone.** |
| `npm run android` | Lance et ouvre sur un appareil / émulateur Android. |
| `npm run ios` | Idem sur simulateur iOS (macOS uniquement). |
| `npm run web` | Ouvre l'app dans le navigateur. Pratique pour un coup d'œil rapide, mais ni les push ni Stripe n'y fonctionnent. |

Le terminal doit **rester ouvert** : dès qu'il se ferme, les testeurs Expo Go
ne peuvent plus charger l'app. L'URL `exp://` change à chaque relance.

Si le tunnel refuse de démarrer avec `Cannot read properties of undefined
(reading 'body')`, le token ngrok en cache est périmé :

```bash
rm ~/.expo/ngrok.yml     # Expo en redemande un neuf au prochain lancement
```

## Vérifications avant de livrer

| Commande | Ce qu'elle fait |
|---|---|
| `npm run typecheck` | TypeScript, sans émettre de fichiers. Doit sortir sans aucune erreur. |
| `npm test` | Suite Jest. |

## Livrer aux testeurs

Deux mécanismes, à ne pas confondre.

### Mise à jour à distance (OTA) — la voie normale

```bash
npm run update:preview
```

Publie le JavaScript sur le canal `preview`. Les testeurs qui ont déjà l'APK
la reçoivent **au prochain lancement**, sans rien réinstaller. Compter deux
ouvertures : la première télécharge, la seconde applique.

Suffit pour tout ce qui est écrans, hooks, composants, logique métier.

`npm run update:prod` fait la même chose sur le canal `production` — à
n'utiliser qu'une fois l'app réellement publiée.

Une mise à jour n'atteint que les appareils dont la `runtimeVersion`
correspond (ici `1.0.0`, alignée sur la version de `app.json`). Après un
changement de version, les anciens builds cessent de recevoir les OTA.

⚠️ **Expo Go ne reçoit pas les mises à jour OTA.** Les testeurs iPhone
chargent le code directement depuis ton Metro : pour eux, il suffit de
recharger l'app pendant que `npm run tunnel` tourne.

### Build natif — seulement quand c'est nécessaire

```bash
npm run build:preview     # APK Android à distribuer aux testeurs, ~16 min
npm run build:dev         # build de développement (dev client), iOS + Android
npm run build:prod        # iOS + Android, profil production
```

`build:dev` produit un *development client* : une app qui remplace Expo Go et
accepte, elle, les modules natifs tiers comme Stripe. C'est la voie à prendre
le jour où il faudra tester le paiement sur un vrai appareil.

Obligatoire dès que le natif change : nouvelle dépendance native, permission
Android, modification de `app.json`, mise à jour du SDK Expo. L'OTA ne peut
pas transporter ça.

⚠️ **Un build EAS expire au bout de 13 jours.** Passé ce délai le lien de
téléchargement est mort et il faut relancer `build:preview`.

Récupérer le lien du dernier build :

```bash
npx eas-cli build:list --platform android --limit 3
npx eas-cli build:view <build-id>        # contient l'URL directe du .apk
```

## Base de données

| Commande | Ce qu'elle fait |
|---|---|
| `npm run supabase:status` | Compare migrations locales et distantes. À lancer en premier en cas de doute. |
| `npm run supabase:push` | Applique les migrations non encore appliquées. |
| `npm run supabase:types` | Régénère `types/database.generated.ts`. **À lancer après tout changement de schéma.** |
| `npm run supabase:link` | Relie le dépôt au projet Supabase (une fois par machine). |
| `npm run supabase:deploy:fns` | Déploie les 11 edge functions. |

L'ordre des migrations compte : `002` → `023`, jamais renumérotées.

Vérifier qu'une edge function répond (401 = déployée, 404 = absente) :

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "https://gaqivtanxcqcekfdzlfk.supabase.co/functions/v1/send-push"
```

## Données de test

| Commande | Ce qu'elle fait |
|---|---|
| `npm run seed:dev` | Crée le jeu de démo : 1 monitrice, 12 élèves, leçons, paiements, messages, compétences. Refuse si des données `@driveapp.dev` existent déjà. |
| `npm run seed:reset` | Purge les comptes `@driveapp.dev` puis reseede. |
| `npm run simulate` | Génère un flux d'activité en direct. |
| `npm run db:wipe:dry` | **Simulation** : affiche ce qui serait supprimé, ne touche à rien. |
| `npm run db:wipe` | ⛔ **Vide toute la base** — tous les comptes, toutes les tables métier. Conserve `_app_config`. |

⛔ `db:wipe` ne fait aucune distinction entre comptes de test et comptes
réels. **Lance toujours `db:wipe:dry` d'abord** et lis la liste.

Ces scripts ont besoin de `.env.seed` contenant `SUPABASE_SERVICE_ROLE_KEY`
(modèle : `.env.seed.example`).

---

## À savoir avant une mise en production

Deux dispositifs temporaires de la phase de bêta sont à retirer.

**Le crédit de 5 h offert à chaque inscription** — sinon chaque nouvel
inscrit reçoit 150 € d'heures gratuites. Procédure documentée en tête de
`supabase/migrations/021_beta_welcome_credit.sql` :

```sql
DROP TRIGGER students_beta_credit ON students;
DELETE FROM payments WHERE stripe_payment_intent_id LIKE 'pi_beta_credit_%';
```

**La vérification d'email**, désactivée pour la bêta. À réactiver dans le
dashboard Supabase → Authentication → Sign In / Providers → **Confirm email**.
Sans elle, n'importe qui peut s'inscrire avec l'adresse d'un tiers.

Et il reste à brancher Stripe : les secrets `STRIPE_SECRET_KEY` et
`STRIPE_WEBHOOK_SECRET` ne sont pas encore posés, donc le paiement échoue.

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase secrets list      # vérifier
```

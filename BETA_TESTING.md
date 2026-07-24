# DriveApp — Bêta fermée

Objectif : tester l'app avec 3 moniteurs et 9 élèves avant déploiement plus large.

**Important** : pas encore de compte Apple Developer, donc pas de vraie
installation iOS pour l'instant (pas de TestFlight, pas d'icône sur l'écran
d'accueil). Les testeurs iPhone passent par **Expo Go** (voir plus bas) — sur
ce mode, tout fonctionne **sauf l'achat de forfait** (paiement Stripe), qui
affiche un message d'indisponibilité. Les testeurs Android ont l'APK complet,
paiement inclus.

## 1. Installation de l'app

### Android — APK direct (app complète, paiement inclus)
1. Télécharger le fichier APK reçu par lien.
2. Autoriser "installer depuis cette source" si Android le demande.
3. Ouvrir l'app puis se connecter avec le compte de test fourni.

### iPhone — via Expo Go (bêta limitée, sans paiement)
1. Installer l'app **Expo Go** depuis l'App Store (gratuite).
2. Ouvrir Expo Go, puis scanner le QR code envoyé par message/email
   (ou ouvrir le lien `exp://...` directement depuis l'iPhone).
3. L'app DriveApp se charge dans Expo Go — se connecter avec le compte de
   test fourni.
4. Autoriser les notifications si demandé (comportement légèrement différent
   d'une vraie app installée — c'est normal en mode Expo Go).

Note : il faut relancer Expo Go et rescanner le QR à chaque nouvelle session
de test tant qu'on n'a pas de vraie build iOS (TestFlight).

## 2. Checklist test en une page

### Connexion et rôles
- [ ] Je me connecte avec mon compte de test.
- [ ] Je vois le bon portail : moniteur ou élève.
- [ ] Je ne vois pas les écrans du mauvais rôle.

### Profil
- [ ] Mon prénom / nom s'affichent correctement.
- [ ] Mon téléphone / email / description s'affichent correctement.
- [ ] Je peux modifier mon profil si c'est prévu pour mon rôle.

### Créneaux / planning
- [ ] Moniteur : je peux créer un créneau.
- [ ] Moniteur : je peux modifier un créneau.
- [ ] Moniteur : je peux supprimer un créneau.
- [ ] Élève : je vois les créneaux libres de mon moniteur.
- [ ] Élève : je peux réserver un créneau libre.
- [ ] Élève : la réservation passe en attente de validation.
- [ ] Moniteur : je peux confirmer ou refuser la réservation.
- [ ] Séance confirmée : elle apparaît dans les deux plannings.
- [ ] Une séance à moins de 48h avec solde négatif apparaît bien en "critique".

### Paiement (Android uniquement pour l'instant)
- [ ] Élève : j'ouvre la boutique et je vois les 3 packs (1h / 5h / 10h).
- [ ] Élève : je peux payer un pack et mon solde d'heures augmente.
- [ ] Élève (iPhone/Expo Go) : le bouton de paiement affiche un message clair
      d'indisponibilité au lieu de planter l'app.

### Suivi pédagogique (REMC)
- [ ] Moniteur : je peux modifier le statut d'une compétence d'un élève.
- [ ] Élève : je vois mes compétences et leur statut à jour.

### Messagerie
- [ ] Élève : j'ouvre uniquement la conversation avec mon moniteur.
- [ ] Moniteur : je vois la liste de mes élèves / conversations.
- [ ] J'envoie un message et il apparaît bien chez l'autre personne.
- [ ] Les messages arrivent en temps réel ou quasi temps réel.

### Fin de test
- [ ] Je signale tout bug avec une capture d'écran.
- [ ] J'écris ce que j'ai fait, ce que j'ai vu, et ce que j'attendais.

## 3. Consigne simple pour les testeurs

Merci de tester seulement vos actions normales de tous les jours : connexion,
profil, créneaux, réservation, messages, (paiement si Android).
Si quelque chose bloque, notez :
- votre appareil et version iOS/Android
- l'écran où le problème arrive
- les étapes pour le reproduire
- une capture écran si possible

## 4. Message type à envoyer aux testeurs Android

"Voici ton accès bêta DriveApp.

Télécharge l'APK ici : [LIEN_APK], installe-le (autorise l'installation
depuis cette source si demandé), puis connecte-toi avec le compte de test
fourni. Teste tes actions habituelles : profil, créneaux, réservation,
paiement et messages.

Si tu trouves un bug, envoie-moi une capture écran avec ce que tu as fait et
ce que tu attendais."

## 5. Message type à envoyer aux testeurs iPhone

"Voici ton accès bêta DriveApp (version test, pas encore la vraie app du
store).

1. Installe l'app gratuite **Expo Go** depuis l'App Store.
2. Ouvre Expo Go et scanne ce QR code : [QR_CODE] (ou ouvre ce lien
   directement depuis ton iPhone : [LIEN_EXPO]).
3. Connecte-toi avec le compte de test fourni.

Tout fonctionne sauf l'achat de forfait (paiement), qui n'est pas encore
disponible dans cette version test — c'est normal. Teste le reste : profil,
créneaux, réservation, messages.

Si tu trouves un bug, envoie-moi une capture écran avec ce que tu as fait et
ce que tu attendais."

## 6. Côté équipe

- Créer 3 comptes moniteur et 9 comptes élève.
- Associer 3 élèves par moniteur.
- Vérifier les permissions et les redirections de portail.
- Vérifier un parcours complet élève + moniteur sur Android (complet) et
  iPhone/Expo Go (sans paiement).
- Lancer `npx expo start --tunnel` avant une session de test iPhone si les
  testeurs ne sont pas sur le même réseau Wi-Fi que toi (le mode par défaut
  `--lan` exige d'être sur le même réseau).

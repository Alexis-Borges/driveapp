# DriveApp · Checklist de tests manuels

Suivi des fonctionnalités à tester avant chaque release.
Cocher avec `[x]` au fur et à mesure.

## 1 · Authentification

- [ ] Splash s'affiche au lancement
- [ ] Login : email invalide → erreur claire
- [ ] Login : mauvais mot de passe → erreur claire
- [ ] Login : champs vides → message "Champs invalides"
- [ ] Login OK → redirige sur accueil rôle
- [ ] Signup élève : tous champs requis validés (Zod)
- [ ] Signup moniteur : n° agrément requis
- [ ] Signup élève avec code parrainage valide → liaison parrainage
- [ ] Signup avec invitedBy (deep link) → lie auto au moniteur
- [ ] Reset password → email reçu

## 2 · Profil

- [ ] Affichage avatar (initiales ou photo)
- [ ] Upload photo profil (galerie) → s'affiche partout
- [ ] Édition prénom/nom/téléphone/bio → sauve
- [ ] Banner "complète ton profil" disparaît une fois rempli
- [ ] Logout → dialog confirmation → revient sur login
- [ ] Version app affichée en bas du profil
- [ ] Lien support email ouvre Mail

## 3 · Liaison Élève ↔ Moniteur

- [ ] Élève sans moniteur : checklist "Lier ton moniteur" visible sur accueil
- [ ] Saisie email moniteur → liaison OK
- [ ] Email inconnu → erreur claire
- [ ] Moniteur invite par email d'un user existant → rattaché
- [ ] Moniteur invite par email d'un user inconnu → share link généré

## 4 · Planning (moniteur)

- [ ] Affichage grille 8h–21h
- [ ] Navigation jour précédent/suivant
- [ ] Création créneau : heure + type sélectionnables
- [ ] Création créneau heure déjà prise → erreur claire (conflict)
- [ ] Tap sur créneau réservé → sheet actions
- [ ] Confirmer séance → status passe à "Confirmé"
- [ ] Annuler séance avec motif → status passe à "Annulé"
- [ ] Marquer terminée + feedback + note → status passe à "Terminé"
- [ ] Pull-to-refresh fonctionne

## 5 · Planning (élève)

- [ ] Solde heures affiché
- [ ] Règle 48h visible
- [ ] Créneaux libres du moniteur visibles
- [ ] Tap créneau libre → demande envoyée (status pending)
- [ ] Tap sa propre séance → confirm annulation
- [ ] Annulation < 48h → bloquée avec message
- [ ] Annulation > 48h → passe (cancelled)
- [ ] Solde insuffisant → empêche réservation
- [ ] Sans moniteur lié → écran "lie ton moniteur"

## 6 · Boutique (élève)

- [ ] 3 packs affichés (1h/5h/10h)
- [ ] Stripe pas configuré moniteur → CTA Pay désactivé + msg
- [ ] Stripe OK → tap pack → modal paiement
- [ ] Choix 1× / 3× sans frais
- [ ] Paiement test (carte 4242 4242 4242 4242) → succès
- [ ] Solde mis à jour après succès
- [ ] Code parrainage affiché
- [ ] Copier code → toast/feedback
- [ ] Stats parrainage à jour

## 7 · Chat

- [ ] Moniteur : liste threads triée par date
- [ ] Moniteur : badge unread point violet
- [ ] Moniteur : long-press thread → marquer non lu
- [ ] Tap thread → chat ouvert
- [ ] Élève : tap onglet Messages → chat direct moniteur ouvert
- [ ] Envoi message → bulle apparaît
- [ ] Réception realtime → autre côté voit le message instantanément
- [ ] Tap notif message → ouvre le bon chat

## 8 · Accueil moniteur

- [ ] Checklist onboarding affichée si incomplet
- [ ] Alertes élèves en dépassement
- [ ] KPIs : élèves actifs / séances semaine / impayés / parrainages
- [ ] Liste élèves triée par solde négatif d'abord
- [ ] Tap élève → page détail
- [ ] Bouton "Inviter" ouvre sheet
- [ ] Pull-to-refresh actualise

## 9 · Accueil élève

- [ ] Checklist onboarding affichée si incomplet
- [ ] Banner paiement si solde négatif → ouvre boutique
- [ ] Règle 48h visible
- [ ] Évaluation : verrouillée par défaut, déverrouillée si planifiée
- [ ] Barre progression heures cohérente
- [ ] Prochain RDV affiché
- [ ] Dernier feedback affiché + bouton "Répondre"
- [ ] Pull-to-refresh actualise

## 10 · Détail élève (moniteur)

- [ ] Avatar + nom + solde
- [ ] Progression
- [ ] Bouton "Envoyer message" → chat
- [ ] Bouton "Planifier évaluation" → sheet 3j/1sem/2sem
- [ ] Liste paiements
- [ ] Liste séances récentes + feedback

## 11 · Stripe Connect (moniteur)

- [ ] Card "Activer paiements" sur profil
- [ ] Tap → ouvre WebBrowser onboarding Stripe
- [ ] Retour app → state mis à jour
- [ ] is_verified = true → card devient verte

## 12 · Notifications push

- [ ] Demande permission au 1er lancement
- [ ] Token enregistré dans push_tokens (vérifier en DB)
- [ ] Réservation élève → notif moniteur
- [ ] Confirmation moniteur → notif élève
- [ ] Annulation → notif des 2 côtés
- [ ] Nouveau message → notif destinataire
- [ ] Tap notif → ouvre la bonne route
- [ ] Cron J-1 → notif rappel (manuel : invoke edge function)

## 13 · UI / UX divers

- [ ] Clavier ne cache plus les champs dans les sheets
- [ ] Loading skeletons pendant les fetchs lents
- [ ] Empty states informatifs (pas juste "—")
- [ ] Pull-to-refresh visible sur les 4 écrans principaux
- [ ] Dark mode cohérent (aucun blanc parasite)
- [ ] Police DM Sans/Mono partout

## 14 · Edge cases

- [ ] Coupure réseau → erreur réseau claire
- [ ] Session expirée → redirect login auto
- [ ] App en arrière-plan > 1h → reconnexion realtime OK
- [ ] Suppression user en DB → app gère le logout propre

# DriveApp · Tests UI automatisés avec Maestro

Maestro (mobile.dev) joue ces flows sur ton iPhone/Android pour tester
automatiquement les fonctionnalités de DriveApp.

## Installation Maestro (1 fois)

**macOS / Linux :**
```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

**Windows (PowerShell) :**
```powershell
iwr https://get.maestro.mobile.dev -useb | iex
```

Plus d'infos : https://maestro.mobile.dev/getting-started/installing-maestro

## Pré-requis

- Expo Go installé sur ton device
- L'app DriveApp lancée via `npm start` et chargée dans Expo Go
- L'app affiche l'écran **Login**

## Lancer un flow

Depuis la racine du projet :

```bash
maestro test .maestro/01_signup_student.yaml
```

Pour lancer la suite complète :

```bash
maestro test .maestro/
```

## Flows disponibles

| Fichier | Scénario |
|---|---|
| `01_signup_student.yaml` | Création compte élève + vérif accueil |
| `02_signup_instructor.yaml` | Création compte moniteur + vérif accueil |
| `03_login_logout.yaml` | Login + logout + confirmation |
| `04_edit_profile.yaml` | Édition profil (téléphone, bio) |
| `05_instructor_create_slot.yaml` | Moniteur crée un créneau |
| `06_student_link_instructor.yaml` | Élève lie son moniteur |
| `07_student_browse_shop.yaml` | Élève parcourt la Boutique |

## Identifiants de test

Crée ces 2 comptes à la main une fois (ou via flows 01/02), puis les autres
flows les réutilisent :

- `moniteur.test@driveapp.local` / `Test1234!`
- `eleve.test@driveapp.local` / `Test1234!`

## Conseil

Lance Maestro avec `--continuous` pour qu'il rejoue automatiquement le flow
à chaque modification du yaml :

```bash
maestro test .maestro/01_signup_student.yaml --continuous
```

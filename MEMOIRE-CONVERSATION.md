# Mémoire du projet TalentCI (à coller au début d'une nouvelle conversation)

## Qui et quoi
- Propriétaire : Amadou Traoré, non technicien. Il parle français, il faut lui répondre en français et simplement.
- Il m'autorise à tout faire sur GitHub : commit, push, création et fusion des PR.
- Le projet : **TalentCI**, une plateforme en Côte d'Ivoire où les étudiants trouvent des missions payées proposées par des entreprises.
- Dépôt GitHub : `Amadoutraore-debug/talentci`. Branche de travail : `claude/gracious-pasteur-hizxot`.
- Pour mettre une modification en ligne :
  1. Repartir de `main`.
  2. Commit, puis push.
  3. Créer une PR et la fusionner.
- Le site est publié automatiquement sur GitHub Pages à chaque push sur `main` (workflow `.github/workflows/deploy-pages.yml`).

## Technique
- Site statique HTML/CSS/JS, sans étape de build. C'est aussi une application installable (PWA : `manifest.webmanifest` et `sw.js`).
- **Service worker :** passer `VERSION` à la valeur suivante à chaque modification de `sw.js` ou de `APP_SHELL`. Valeur actuelle : `talentci-v13`.
- Navigation par hash (`#/page`) et barre d'onglets en bas sur téléphone.
- Les scripts sont des scripts classiques qui partagent la même portée globale. Ordre de chargement : `js/config.js` → `js/core/*` → `js/modules/*` → `js/main.js`.
- **Supabase** (projet `zqjzcuttmocmwjesvwdw`, la clé publique est dans `js/config.js`) :
  - connexion par email, Google et Facebook ;
  - base Postgres protégée par RLS ;
  - stockage : avatars, images de missions, pièces d'identité privées.
- **Base de données :** un seul script idempotent, `sql/installation.sql`. Il faut le relancer dans Supabase (SQL Editor) après chaque modification. Les anciens scripts sont dans `sql/historique/`.
- **Thème orange et noir :** `--vert:#E8620C` (orange), `--vert-fonce:#B54708`, `--noir:#141414`.
- **Polices :** Plus Jakarta Sans pour les titres, DM Sans pour le texte.
- **Photo d'accueil :** `images/hero.jpg`, générée avec Canva (média `MAHW4j20yxQ`). La version actuelle est petite et un peu floue. Amadou peut la remplacer par la version HD en la téléchargeant sur GitHub sous le même nom.

## Fonctionnalités déjà faites (PR #1 à #15, toutes fusionnées)
- Inscription et connexion fiables sur téléphone : email, Google et Facebook (les boutons n'apparaissent que si le fournisseur est activé dans Supabase).
- **Mini-CV obligatoire à l'inscription :**
  - Étudiant : spécialité, présentation, formation et expériences, compétences, téléphone. Pas de pièce d'identité, pas de lien portfolio.
  - Entreprise : pièce d'identité ou RCCM, que l'administrateur vérifie.
- **Offre publiée par l'entreprise :** attentes ou profil recherché, nombre de places, montant par personne, date, heure et lieu de la prestation.
  - Les candidatures sont illimitées.
  - Une place est retirée à chaque candidat validé.
- **Étudiant :**
  - sa candidature reste « en attente » jusqu'à la décision de l'entreprise ;
  - s'il est retenu, il reçoit une notification avec la date, l'heure et le lieu.
- **Espace recrutement de l'entreprise** (`#/recrutement`) : chaque profil est comparé à l'offre (compétences correspondantes), puis l'entreprise le valide ou le rejette.
- Panneau administrateur pour vérifier les pièces des entreprises.
- Maquette Claude Design (téléphone et ordinateur) : https://claude.ai/artifact/8dVcRYGXyZdg8Uz17dVp8K

## Réglages Supabase à garder
- « Confirm email » doit rester désactivé.
- Site URL et Redirect URLs : l'adresse github.io du site.
- Le projet ne doit pas être en pause. Le remettre en route s'il s'est arrêté.
- Désactiver la traduction automatique du navigateur sur le tableau de bord Supabase, sinon la page plante.

## Choix d'Amadou à respecter
- Ne jamais écrire de mot de passe dans le code.
- Ne pas utiliser de photos prises sur les réseaux sociaux (droits d'auteur) : générer des images originales.
- Couleurs orange et noir uniquement, pas de bleu.

## Idées proposées, pas encore faites
1. Un bouton « Donner mon avis » dans l'application pour les amis testeurs.
2. Remplacer les faux témoignages et la phrase « Plateforme étudiante #1 en Côte d'Ivoire » par des textes honnêtes.
3. Des boutons orange un peu plus foncés (#C9510A) pour une meilleure lisibilité.

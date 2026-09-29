# TalentCI

Plateforme web qui connecte les étudiant(e)s de Côte d'Ivoire à des missions rémunérées proposées par des PME et startups locales.

Application statique (HTML / CSS / JS, aucun build requis) utilisant [Supabase](https://supabase.com) comme backend (authentification + base de données Postgres).

## 🗂️ Structure du projet

```
.
├── index.html          → page unique (SPA), toutes les vues
├── css/style.css        → styles
├── js/app.js             → logique applicative (auth, missions, admin...)
├── sql/schema.sql        → tables Supabase + policies de sécurité (RLS)
├── sql/migration-2026-09-securite-candidatures.sql → correctif sécurité + notifications de candidature
├── manifest.webmanifest  → description de l'application installable (nom, icônes, couleurs)
├── sw.js                 → service worker (démarrage rapide, mode hors-ligne)
├── icons/                → icônes de l'application
└── README.md
```

## 🚀 Démarrer en local

Aucune dépendance ni installation : ouvre simplement `index.html` dans un navigateur, ou lance un petit serveur local (recommandé pour éviter les restrictions de certains navigateurs sur `file://`) :

```bash
python -m http.server 8080
# puis ouvre http://localhost:8080
```

Tant que Supabase n'est pas configuré, le site s'affiche en **mode dégradé** : navigation et design visibles, mais inscriptions/connexions/missions désactivées, avec une bannière qui invite à configurer la base de données.

## 🗄️ Configurer Supabase (obligatoire pour une utilisation réelle)

1. **Crée un projet** sur [supabase.com/dashboard](https://supabase.com/dashboard) (gratuit).
2. **Crée les tables et les règles de sécurité** : ouvre l'onglet **SQL Editor** du projet, colle le contenu de [`sql/schema.sql`](sql/schema.sql) et exécute-le, **puis** fais de même avec [`sql/migration-2026-09-securite-candidatures.sql`](sql/migration-2026-09-securite-candidatures.sql). Ce script crée les 4 tables (`profils`, `missions`, `candidatures`, `notifications`) et active la **Row Level Security (RLS)** sur chacune — c'est cette partie qui empêche un visiteur d'accéder aux données des autres utilisateurs.
3. **Récupère tes clés** : `Settings → API` → copie la **Project URL** et la clé **`anon` / `public`** (jamais la clé `service_role`, qui donne un accès total et ne doit jamais être exposée côté client).
4. **Connecte l'app** — deux options :
   - **Interface (recommandé)** : ouvre le site, clique sur la bannière "Configurer maintenant", colle l'URL et la clé. Elles sont stockées dans le `localStorage` du navigateur.
   - **En dur dans le code** : édite les deux lignes en haut de [`js/app.js`](js/app.js) :
     ```js
     const CONFIG_SUPABASE = {
       url: "https://xxxxxxxxxxxx.supabase.co",
       key: "eyJhbGciOi..."
     };
     ```
     Pratique pour un déploiement où tu ne veux pas que chaque visiteur configure sa propre base — c'est bien la clé `anon` (publique par nature), donc pas un problème de sécurité de la committer.

### 🆕 Offres avec nombre de places — migration à exécuter

Exécute aussi [`sql/migration-2026-10-offres-places.sql`](sql/migration-2026-10-offres-places.sql) dans **SQL Editor** (menu **Database**). Il ajoute aux offres le **nombre de personnes** recherchées, le **montant par personne**, le compteur de **places prises** (mis à jour automatiquement quand une candidature est acceptée, et qui empêche d'accepter plus de personnes que prévu) et le stockage des **photos de couverture**. Sans cette migration, la publication d'une offre affiche un message demandant de l'exécuter.

### ⚠️ Base déjà en place ? Exécute la migration de sécurité

Si `schema.sql` a été exécuté **avant** l'ajout de [`sql/migration-2026-09-securite-candidatures.sql`](sql/migration-2026-09-securite-candidatures.sql), exécute ce fichier une fois dans **SQL Editor**. Il :
- **ferme une faille** qui permettait à n'importe quel utilisateur connecté de se donner lui-même le rôle `admin` (en modifiant la colonne `type` de son profil via l'API) ;
- réserve la publication de missions aux comptes **Entreprise** ;
- envoie automatiquement une notification à l'entreprise quand un étudiant postule, et à l'étudiant quand sa candidature est acceptée ou refusée.

Le script peut être relancé sans risque.

## 📱 Application mobile (PWA)

TalentCI est une **Progressive Web App** : elle s'installe sur l'écran d'accueil d'un téléphone comme une application, sans passer par un store.
- **Android (Chrome)** : un bandeau « Installer l'application TalentCI » apparaît sur la page d'accueil (ou menu ⋮ → *Installer l'application*).
- **iPhone (Safari)** : bouton *Partager* → *Sur l'écran d'accueil*. Le bouton « Installer » du site affiche ces instructions.

Une fois installée : icône dédiée, plein écran, barre d'onglets en bas, bouton *Retour* du téléphone qui revient à la page précédente, et raccourcis (appui long sur l'icône → Missions / Alertes / Profil). L'interface s'ouvre même sans connexion ; les données (missions, candidatures) nécessitent Internet.

L'installation exige que le site soit servi en **HTTPS** (c'est le cas sur GitHub Pages, Netlify, Vercel). En local, `http://localhost` fonctionne aussi.

> Après toute modification de `sw.js` ou de la liste des fichiers mis en cache, incrémente `VERSION` en haut de `sw.js` pour que les téléphones récupèrent la nouvelle version.

**Publier sur le Google Play Store (optionnel)** : la PWA peut être emballée en application Android avec [PWABuilder](https://www.pwabuilder.com) (entrer l'URL du site → *Package for stores → Android*). Il faut un compte développeur Google Play (frais unique de 25 $).

## 🔑 Activer la connexion Google

Le bouton "Continuer avec Google" est déjà dans l'interface, mais il ne fonctionnera qu'une fois le provider Google configuré côté Supabase (sinon Google renvoie une erreur "provider is not enabled").

1. **Crée des identifiants OAuth Google** :
   - Va sur [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Crée un projet (ou utilise un projet existant), puis `Créer des identifiants → ID client OAuth`
   - Type d'application : **Application Web**
   - Dans **Origines JavaScript autorisées**, ajoute l'URL de ton site (ex : `https://amadoutraore-debug.github.io`)
   - Dans **URI de redirection autorisés**, ajoute exactement : `https://<ton-projet>.supabase.co/auth/v1/callback` (remplace `<ton-projet>` par la référence de ton projet Supabase — visible dans l'URL du dashboard ou dans `Settings → API`)
   - Récupère le **Client ID** et le **Client Secret** générés
2. **Configure le provider dans Supabase** :
   - Dashboard Supabase → `Authentication → Providers` → trouve **Google** dans la liste
   - Active-le, colle le Client ID et le Client Secret, sauvegarde
3. C'est tout — pas de changement de code nécessaire. Le profil (nom + photo) est créé automatiquement via le trigger `on_auth_user_created` de `sql/schema.sql`, à partir des informations fournies par Google.

⚠️ Google ne dit pas si un utilisateur est "étudiant" ou "entreprise" : un compte créé via Google est toujours classé `étudiant` par défaut (modifiable ensuite manuellement via `update profils set type = 'entreprise' where user_id = '...';` si besoin).

## 🛠️ Réparer les comptes et devenir administrateur

Exécute [`sql/migration-2026-10-reparation-comptes.sql`](sql/migration-2026-10-reparation-comptes.sql) dans **SQL Editor** (menu **Database**). Il confirme les comptes restés bloqués, crée les fiches profil manquantes, interdit de se créer un profil admin soi-même et permet de passer son compte Étudiant ↔ Entreprise depuis « Modifier mon profil ».

Pour devenir administrateur, exécute ensuite (avec l'e-mail de ton compte) :

```sql
update profils set type = 'admin'
where user_id = (select id from auth.users where email = 'ton-email@exemple.com')
returning nom, type;
```

Depuis le panneau Admin, tu peux ensuite changer le rôle de n'importe quel compte (Étudiant / Entreprise / Admin), masquer ou réafficher une offre, ou la supprimer.

## 📧 Connexion par e-mail : réglages Supabase indispensables

Si les utilisateurs ne reçoivent pas l'e-mail de confirmation ou n'arrivent pas à se connecter, vérifie ces 3 réglages :

1. **URL du site** — `Authentication → URL Configuration` :
   - **Site URL** : `https://amadoutraore-debug.github.io/talentci/`
   - **Redirect URLs** : ajoute `https://amadoutraore-debug.github.io/talentci/**`
   Sans ça, les liens des e-mails (confirmation, mot de passe oublié) et le retour de Google/Facebook renvoient vers `localhost`.
2. **Envoi d'e-mails** — le service d'e-mail intégré de Supabase est limité (quelques e-mails par heure, et parfois uniquement vers les membres de l'équipe du projet). Deux options :
   - **Simple** : `Authentication → Sign In / Providers → Email` → désactive **Confirm email**. Les comptes sont utilisables immédiatement après l'inscription.
   - **Recommandé en production** : configure un vrai serveur d'envoi (`Authentication → Emails → SMTP Settings`), par exemple [Brevo](https://www.brevo.com) ou [Resend](https://resend.com), qui ont des offres gratuites.
3. Le site propose désormais **« Mot de passe oublié ? »** et **« Renvoyer l'e-mail de confirmation »** — ces deux fonctions dépendent aussi du point 2.

## 📘 Activer la connexion Facebook

1. Va sur [developers.facebook.com](https://developers.facebook.com/apps) → **Créer une app** → cas d'usage **« Authentifier et demander des données aux utilisateurs avec Facebook Login »**.
2. Dans **Facebook Login → Paramètres**, ajoute dans **URI de redirection OAuth valides** : `https://zqjzcuttmocmwjesvwdw.supabase.co/auth/v1/callback`
3. Dans **Paramètres de l'app → Général**, récupère l'**ID de l'app** et la **Clé secrète**. Renseigne aussi une URL de politique de confidentialité, puis passe l'app en mode **Live** (En ligne).
4. Dans Supabase → `Authentication → Sign In / Providers → Facebook` : active-le, colle l'ID et la clé secrète, sauvegarde.

Tant que ce n'est pas fait, le bouton « Continuer avec Facebook » affiche « Ce mode de connexion n'est pas encore activé ».

## 👑 Devenir administrateur

Il n'y a **aucun** moyen de devenir admin depuis le site (le formulaire d'inscription ne propose que "Étudiant" / "Entreprise" — c'est volontaire). Pour promouvoir un compte existant :

1. Crée-toi un compte normal depuis le site.
2. Dans Supabase → **SQL Editor**, exécute :
   ```sql
   update profils set type = 'admin' where user_id = '<uuid-du-compte>';
   ```
   (l'UUID se trouve dans `Authentication → Users`)
3. Reconnecte-toi : le lien "⚙️ Admin" apparaît dans la barre de navigation.

L'accès au panneau admin est protégé à deux niveaux : le lien n'est visible que pour un profil `admin` (confort d'UI), et les actions (lecture de tous les utilisateurs, suppression de n'importe quelle mission) ne fonctionnent que grâce aux policies RLS du fichier `schema.sql` — même en trafiquant le JavaScript, un compte non-admin ne peut pas obtenir ces données.

## 🌐 Déployer

Le site est 100% statique : n'importe quel hébergeur de fichiers statiques fonctionne.

### Option A — GitHub Pages (le plus simple, déjà configuré)

Un workflow GitHub Actions (`.github/workflows/deploy-pages.yml`) est inclus : à chaque push sur `main`, le site est publié automatiquement.

Pour l'activer une seule fois :
1. Sur GitHub → `Settings` → `Pages` → **Source : GitHub Actions**.
2. Pousse un commit sur `main` — le site sera en ligne sur `https://<ton-compte>.github.io/talentci/` en 1-2 minutes.

### Option B — Netlify / Vercel

Glisse-dépose le dossier du projet sur [app.netlify.com/drop](https://app.netlify.com/drop), ou connecte le dépôt GitHub sur Netlify/Vercel avec :
- **Build command** : (aucune)
- **Publish directory** : `.` (racine)

## ⚠️ Sécurité — ce qui a changé depuis la version initiale

L'ancienne version contenait un mot de passe administrateur codé en dur et visible dans le code source (`ADMIN_USER` / `ADMIN_PASS`), sans aucune vérification côté serveur. Ça permettait à n'importe qui de :
- lire le mot de passe admin en faisant "Afficher le code source",
- ou d'ouvrir le panneau admin directement depuis la console du navigateur, sans même connaître le mot de passe.

Ces identifiants ont été supprimés. L'accès admin repose maintenant sur :
1. le champ `profils.type = 'admin'`, attribué manuellement en base (jamais via le site),
2. les **policies RLS** de `sql/schema.sql`, qui sont la vraie barrière de sécurité — le code JavaScript ne fait que masquer/afficher des boutons par confort.

**Avant toute mise en production**, vérifie dans Supabase (`Authentication → Policies`) que RLS est bien **activée** sur les 4 tables et que les policies de `schema.sql` sont en place. Sans ça, la clé `anon` exposée dans le navigateur permettrait à n'importe qui de lire/modifier toutes les données via l'API Supabase, indépendamment du site.

## 🧭 Fonctionnalités

- Inscription / connexion (étudiant ou entreprise) via Supabase Auth
- Accueil façon place de marché : bandeau défilant des offres à la une, recherche, catégories, rangées « À la une » / « Nouvelles offres »
- Offres avec photo de couverture, **nombre de personnes** et **montant par personne** (budget total calculé), places restantes, fiche détaillée
- Fil d'offres avec recherche, filtres par catégorie, tri par montant ou par places
- Publication de missions par les entreprises, suppression de ses propres missions
- Candidature des étudiants aux missions, suivi dans "Mon profil"
- Côté entreprise : liste des candidats par mission (nom, école, compétences) avec **Accepter / Refuser**
- Missions favorites (étoile) conservées sur l'appareil, filtre "Favoris"
- Application installable sur téléphone (PWA), utilisable hors-ligne pour l'interface
- Édition de profil (nom, université, compétences)
- Notifications par utilisateur
- Panneau admin (tableau de bord, gestion des utilisateurs et des missions)

## 🛣️ Limites connues / pistes d'amélioration

- Navigation par affichage/masquage de blocs ; chaque page a une adresse `#/missions`, `#/profil`… (liens directs possibles), mais le référencement Google reste limité.
- Pas de tests automatisés.
- Le panneau admin n'implémente pas encore la suspension de compte ni la vue détaillée d'un utilisateur (boutons présents, action réelle à ajouter si besoin).

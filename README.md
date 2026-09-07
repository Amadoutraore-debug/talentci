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
2. **Crée les tables et les règles de sécurité** : ouvre l'onglet **SQL Editor** du projet, colle le contenu de [`sql/schema.sql`](sql/schema.sql) et exécute-le. Ce script crée les 4 tables (`profils`, `missions`, `candidatures`, `notifications`) et active la **Row Level Security (RLS)** sur chacune — c'est cette partie qui empêche un visiteur d'accéder aux données des autres utilisateurs.
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
- Fil de missions avec recherche, filtres par catégorie, tri par budget
- Publication de missions par les entreprises, suppression de ses propres missions
- Candidature des étudiants aux missions, suivi dans "Mon profil"
- Édition de profil (nom, université, compétences)
- Notifications par utilisateur
- Panneau admin (tableau de bord, gestion des utilisateurs et des missions)

## 🛣️ Limites connues / pistes d'amélioration

- Navigation par affichage/masquage de blocs, sans mise à jour de l'URL (pas de deep-linking, SEO limité).
- Pas de tests automatisés.
- Le panneau admin n'implémente pas encore la suspension de compte ni la vue détaillée d'un utilisateur (boutons présents, action réelle à ajouter si besoin).

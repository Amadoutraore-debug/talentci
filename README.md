# TalentCI

Plateforme qui connecte les étudiant(e)s de Côte d'Ivoire à des offres rémunérées publiées par des PME et startups locales.

- **Site en ligne** : https://amadoutraore-debug.github.io/talentci/
- **Application mobile** : installable depuis le site (Android et iPhone), sans passer par un store
- **Technologies** : HTML / CSS / JavaScript sans étape de compilation, [Supabase](https://supabase.com) pour l'authentification, la base de données et le stockage des images

---

## 🗂️ Organisation du projet

```
.
├── index.html                 → la page unique (toutes les vues de l'application)
├── manifest.webmanifest       → description de l'application installable (nom, icônes, couleurs)
├── sw.js                      → service worker : démarrage rapide, mode hors-ligne
│
├── css/                       → styles, chargés dans cet ordre :
│   ├── base.css               →   couleurs de la marque, boutons, barre de navigation
│   ├── pages.css              →   pages : accueil, profil, entreprise, notifications, admin
│   ├── offres.css             →   place de marché : bandeau, cartes d'offre, fiche détaillée
│   ├── composants.css         →   connexion, fenêtres, installation, barre du bas
│   └── responsive.css         →   adaptations téléphone / tablette (toujours en dernier)
│
├── js/                        → scripts, chargés dans cet ordre :
│   ├── config.js              →   URL + clé publique Supabase
│   ├── vendor/supabase.min.js →   bibliothèque Supabase (hébergée avec le site)
│   ├── core/                  →   socle partagé
│   │   ├── icones.js          →     icônes SVG
│   │   ├── supabase.js        →     client Supabase, fenêtre de configuration
│   │   ├── etat.js            →     état global (utilisateur connecté, offres...)
│   │   └── utils.js           →     toast, formatage, sécurité (échappement), erreurs
│   ├── modules/               →   une fonctionnalité par fichier
│   │   ├── auth.js            →     inscription, connexion (e-mail, Google, Facebook), mot de passe oublié
│   │   ├── profil.js          →     « Mon profil » et son édition
│   │   ├── offres.js          →     offres : accueil, cartes, fiche, favoris, filtres, publication
│   │   ├── candidatures.js    →     postuler ; accepter / refuser (entreprise)
│   │   ├── notifications.js   →     notifications
│   │   ├── entreprise.js      →     page Entreprises
│   │   ├── admin.js           →     panneau d'administration
│   │   ├── navigation.js      →     pages (#/missions...), bouton Retour, menus
│   │   └── pwa.js             →     installation de l'application
│   └── main.js                →   démarrage (toujours en dernier)
│
├── icons/                     → icônes de l'application
├── sql/
│   ├── installation.sql       → ⭐ LE script de base de données (tables, sécurité, automatismes)
│   └── historique/            →   anciens scripts, pour mémoire (ne pas exécuter)
└── .github/workflows/         → mise en ligne automatique sur GitHub Pages
```

**Règles à respecter en modifiant le code** :
- Les scripts sont des fichiers JavaScript classiques qui partagent le même espace global (les boutons du HTML appellent directement les fonctions via `onclick`). Un nouveau fichier doit être ajouté dans `index.html` **et** dans la liste `APP_SHELL` de `sw.js`.
- Après toute modification des fichiers du site, incrémente `VERSION` en haut de `sw.js` : c'est ce qui force les téléphones à récupérer la nouvelle version.
- Tout texte venant d'un utilisateur doit passer par `escHtml()` (ou `cssUrl()` pour une image) avant d'être inséré dans la page.

---

## 🚀 Démarrer en local

Aucune installation nécessaire :

```bash
python -m http.server 8080
# puis ouvrir http://localhost:8080
```

---

## 🗄️ Configurer Supabase

### 1. La base de données — un seul script

Dans Supabase → **SQL Editor** (vérifie que le menu en haut indique **Database**, pas « Logs ») → colle le contenu de [`sql/installation.sql`](sql/installation.sql) → **Run**.

Ce script :
- crée ou met à jour les tables `profils`, `missions`, `candidatures`, `notifications` et leurs **règles de sécurité (RLS)** ;
- installe les automatismes : création du profil à l'inscription, compteur de places, notifications de candidature, interdiction de s'auto-promouvoir admin ;
- crée les espaces de stockage des photos (profil, couverture d'offre) ;
- répare les comptes existants (confirmation, profils manquants).

Il fonctionne sur une base neuve **comme** sur une base existante, et peut être relancé sans risque.

> 💡 Si le tableau de bord Supabase affiche « Une extension de navigateur a pu provoquer une erreur », désactive la **traduction automatique** du navigateur pour supabase.com.

### 2. Les réglages de connexion (indispensables)

Dans Supabase → **Authentication** :

| Réglage | Où | Valeur |
|---|---|---|
| Confirmation d'e-mail | **Sign In / Providers → Email → Confirm email** | **Désactivé** (sinon les nouveaux inscrits restent bloqués : l'envoi d'e-mails gratuit de Supabase est très limité) |
| Adresse du site | **URL Configuration → Site URL** | `https://amadoutraore-debug.github.io/talentci/` |
| Adresses de retour | **URL Configuration → Redirect URLs** | `https://amadoutraore-debug.github.io/talentci/**` |

Pour réactiver plus tard la confirmation d'e-mail, configure d'abord un vrai service d'envoi (**Authentication → Emails → SMTP Settings**, par exemple [Brevo](https://www.brevo.com) ou [Resend](https://resend.com), gratuits pour de petits volumes).

### 3. Les clés

Elles sont déjà renseignées dans [`js/config.js`](js/config.js). C'est la clé **`anon` / publique** : elle est faite pour être visible dans le navigateur. Ne mets **jamais** la clé `service_role` dans le code.

### 4. Devenir administrateur

Il n'existe volontairement aucun moyen de devenir admin depuis le site. Dans **SQL Editor**, avec l'e-mail de ton compte :

```sql
update profils set type = 'admin'
where user_id = (select id from auth.users where email = 'ton-email@exemple.com')
returning nom, type;
```

Reconnecte-toi : **Administration** apparaît dans le menu de ton avatar. Tu peux y changer le rôle des comptes (Étudiant / Entreprise / Admin), masquer, réafficher ou supprimer une offre.

### 5. Connexion Google et Facebook (optionnel)

Les boutons n'apparaissent sur le site **que** lorsque le fournisseur est activé dans Supabase.

**Google**
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Créer des identifiants → ID client OAuth** → type **Application Web**.
2. **Origines JavaScript autorisées** : `https://amadoutraore-debug.github.io`
3. **URI de redirection autorisés** : `https://zqjzcuttmocmwjesvwdw.supabase.co/auth/v1/callback`
4. Supabase → **Authentication → Sign In / Providers → Google** : active-le, colle le Client ID et le Client Secret.

**Facebook**
1. [developers.facebook.com](https://developers.facebook.com/apps) → **Créer une app** → cas d'usage **Facebook Login**.
2. **URI de redirection OAuth valides** : `https://zqjzcuttmocmwjesvwdw.supabase.co/auth/v1/callback`
3. Récupère l'**ID de l'app** et la **clé secrète**, renseigne une URL de politique de confidentialité, passe l'app en mode **Live**.
4. Supabase → **Authentication → Sign In / Providers → Facebook** : active-le, colle l'ID et la clé.

Un compte créé via Google ou Facebook est « Étudiant » par défaut ; l'utilisateur peut passer en « Entreprise » depuis **Modifier mon profil**.

### 6. Éviter la mise en pause

Sur l'offre gratuite, Supabase **met le projet en pause après environ une semaine sans activité**. Le site ne peut alors plus se connecter. Pour le relancer : tableau de bord Supabase → projet → **Restore project** (« Projet CV » si la page est traduite automatiquement).

---

## 🌐 Mise en ligne

Le site est publié **automatiquement** sur GitHub Pages à chaque modification de la branche `main` (workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)), en 1 à 2 minutes.

Réglage à faire une seule fois : GitHub → **Settings → Pages → Source : GitHub Actions**.

Autres hébergeurs possibles (Netlify, Vercel...) : aucune commande de build, dossier publié = la racine du projet.

---

## 📱 Application mobile

- **Android (Chrome)** : bandeau « Installer l'application TalentCI » sur l'accueil (ou menu ⋮ → *Installer l'application*).
- **iPhone (Safari)** : bouton *Partager* → *Sur l'écran d'accueil*.

Une fois installée : icône dédiée, plein écran, barre d'onglets en bas, bouton *Retour* fonctionnel, raccourcis (appui long sur l'icône). L'interface s'ouvre même hors-ligne ; les données nécessitent Internet.

**Google Play Store (optionnel)** : emballer le site avec [PWABuilder](https://www.pwabuilder.com) (*Package for stores → Android*). Nécessite un compte développeur Google Play (25 $ une fois).

---

## 🧭 Fonctionnalités

**Étudiants**
- Accueil façon place de marché : bandeau des offres à la une, recherche, catégories, rangées « À la une » / « Nouvelles offres »
- Fiche détaillée d'une offre : montant par personne, places restantes, compétences
- Candidature en un clic, suivi dans « Mon profil », notifications d'acceptation / refus
- Favoris conservés sur l'appareil

**Entreprises**
- Publication d'offres : nombre de personnes, montant par personne (budget total calculé), photo de couverture
- Liste des candidats (nom, école, compétences) avec **Accepter / Refuser** ; impossible d'accepter plus de personnes que de places
- Notification à chaque nouvelle candidature

**Administration**
- Statistiques, gestion des rôles, modération des offres (masquer / supprimer)

**Sécurité**
- Toutes les protections sont côté base de données (RLS + triggers) : le JavaScript ne fait qu'afficher ou masquer des boutons.
- Personne ne peut se donner le rôle admin depuis le site ou l'API.

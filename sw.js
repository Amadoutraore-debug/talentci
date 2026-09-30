/* ══════════════════════════════════════════════════════════════
   TALENTCI — SERVICE WORKER (application installable / hors-ligne)
   ─────────────────────────────────────────────────────────────
   - Fichiers de l'application (HTML/CSS/JS/icônes) : "réseau d'abord",
     avec repli sur le cache si le téléphone est hors connexion. Une
     mise à jour du site est donc visible dès le prochain chargement.
   - Bibliothèques externes (supabase-js, polices Google) : "cache
     d'abord", elles changent rarement.
   - Appels à l'API Supabase (données, connexion) : JAMAIS mis en
     cache — toujours les données fraîches, et aucune donnée privée
     stockée sur l'appareil par ce fichier.

   ⚠️ Changer VERSION à chaque modification de ce fichier ou de la
   liste APP_SHELL pour forcer le renouvellement du cache.
══════════════════════════════════════════════════════════════ */
const VERSION = 'talentci-v7';
const APP_SHELL = [
  './',
  'index.html',
  'css/base.css',
  'css/pages.css',
  'css/offres.css',
  'css/composants.css',
  'css/responsive.css',
  'js/vendor/supabase.min.js',
  'js/config.js',
  'js/core/icones.js',
  'js/core/supabase.js',
  'js/core/etat.js',
  'js/core/utils.js',
  'js/modules/auth.js',
  'js/modules/profil.js',
  'js/modules/offres.js',
  'js/modules/candidatures.js',
  'js/modules/notifications.js',
  'js/modules/entreprise.js',
  'js/modules/admin.js',
  'js/modules/navigation.js',
  'js/modules/pwa.js',
  'js/main.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];
const HOTES_EXTERNES_CACHABLES = [
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(c => c !== VERSION).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fichiers de l'application (même origine)
  if (url.origin === self.location.origin) {
    event.respondWith(reseauDAbord(req));
    return;
  }

  // Bibliothèques et polices externes
  if (HOTES_EXTERNES_CACHABLES.includes(url.hostname)) {
    event.respondWith(cacheDAbord(req));
    return;
  }

  // Tout le reste (API Supabase, Google OAuth, photos de profil...) :
  // on laisse passer sans intervenir.
});

async function reseauDAbord(req) {
  const cache = await caches.open(VERSION);
  try {
    const rep = await fetch(req);
    if (rep.ok) cache.put(req, rep.clone());
    return rep;
  } catch (e) {
    const enCache = await cache.match(req, { ignoreSearch: true });
    if (enCache) return enCache;
    // Navigation hors-ligne vers une adresse inconnue → page principale
    if (req.mode === 'navigate') {
      const accueil = await cache.match('index.html') || await cache.match('./');
      if (accueil) return accueil;
    }
    throw e;
  }
}

async function cacheDAbord(req) {
  const cache = await caches.open(VERSION);
  const enCache = await cache.match(req);
  if (enCache) return enCache;
  const rep = await fetch(req);
  // Les réponses "opaques" (status 0) des CDN sans CORS sont acceptées.
  if (rep.ok || rep.type === 'opaque') cache.put(req, rep.clone());
  return rep;
}

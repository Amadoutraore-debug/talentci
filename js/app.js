/* ══════════════════════════════════════════════════════════════
   TALENTCI — LOGIQUE APPLICATIVE
   ═══════════════════════════════════════════════════════════════

   🔐 SÉCURITÉ : il n'y a plus d'identifiant admin codé en dur ici.
   L'accès admin est déterminé par le champ `type` du profil de
   l'utilisateur connecté (`profils.type = 'admin'`), et surtout
   par les policies RLS définies côté Supabase (voir sql/schema.sql).
   Cacher le bouton "Admin" côté client n'est qu'un confort d'UI :
   la vraie protection doit toujours venir de la base de données.
══════════════════════════════════════════════════════════════ */

/* ┌─────────────────────────────────────────────────────────┐
   │  COLLE TES CLÉS ICI  ↓↓↓  (ou laisse "" pour config UI) │
   └─────────────────────────────────────────────────────────┘ */
const CONFIG_SUPABASE = {
  url: "https://zqjzcuttmocmwjesvwdw.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxanpjdXR0bW9jbXdqZXN2d2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjM0MDcsImV4cCI6MjA5MTMzOTQwN30.Suw4HBPl3JNn_xIYmbm6MaxEAmkL9JuHrjiMcz1-1EY"
  // Clé "anon / public" — conçue pour être visible côté client, ce n'est pas un secret.
  // Codée en dur ici pour que le site fonctionne sur tout appareil sans qu'un
  // visiteur ait besoin de reconfigurer Supabase lui-même (auparavant stockée
  // en localStorage = à refaire à chaque nouveau navigateur/téléphone).
};
/* ┌─────────────────────────────────────────────────────────┐
   │  FIN DE LA CONFIGURATION                                 │
   └─────────────────────────────────────────────────────────┘ */

/* ══════════════════════════════════════════
   INIT CLIENT SUPABASE
══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   ICÔNES SVG (remplace les emojis — traits fins, currentColor)
══════════════════════════════════════════ */
const ICON_ATTRS = 'class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  check:        `<svg ${ICON_ATTRS}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error:        `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  warning:      `<svg ${ICON_ATTRS}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info:         `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  party:        `<svg ${ICON_ATTRS}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  lock:         `<svg ${ICON_ATTRS}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  login:        `<svg ${ICON_ATTRS}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`,
  logout:       `<svg ${ICON_ATTRS}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  settings:     `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`,
  database:     `<svg ${ICON_ATTRS}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/></svg>`,
  camera:       `<svg ${ICON_ATTRS}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>`,
  search:       `<svg ${ICON_ATTRS}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  bell:         `<svg ${ICON_ATTRS}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  lightbulb:    `<svg ${ICON_ATTRS}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z"/></svg>`,
  mail:         `<svg ${ICON_ATTRS}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2Z"/><polyline points="22 6 12 13 2 6"/></svg>`,
  zap:          `<svg ${ICON_ATTRS}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  save:         `<svg ${ICON_ATTRS}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  clipboard:    `<svg ${ICON_ATTRS}><path d="M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`,
  trash:        `<svg ${ICON_ATTRS}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  users:        `<svg ${ICON_ATTRS}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  target:       `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  inbox:        `<svg ${ICON_ATTRS}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>`,
  clock:        `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  eye:          `<svg ${ICON_ATTRS}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  user:         `<svg ${ICON_ATTRS}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  pencil:       `<svg ${ICON_ATTRS}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
  chart:        `<svg ${ICON_ATTRS}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  code:         `<svg ${ICON_ATTRS}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  palette:      `<svg ${ICON_ATTRS}><circle cx="13.5" cy="6.5" r="1.3"/><circle cx="17.5" cy="10.5" r="1.3"/><circle cx="8.5" cy="7.5" r="1.3"/><circle cx="6.5" cy="12.5" r="1.3"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h2.4c2.3 0 4.1-1.8 4.1-4.1C21.5 6 17.2 2 12 2Z"/></svg>`,
  smartphone:   `<svg ${ICON_ATTRS}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  fileText:     `<svg ${ICON_ATTRS}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  trendingUp:   `<svg ${ICON_ATTRS}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  video:        `<svg ${ICON_ATTRS}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
  globe:        `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>`,
  graduationCap:`<svg ${ICON_ATTRS}><path d="M2 9 12 4l10 5-10 5L2 9Z"/><path d="M6 11.5v4c0 1.1 2.7 2 6 2s6-.9 6-2v-4"/><path d="M22 9v6"/></svg>`,
  building:     `<svg ${ICON_ATTRS}><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4"/><line x1="9" y1="7" x2="9.01" y2="7"/><line x1="14" y1="7" x2="14.01" y2="7"/><line x1="9" y1="11" x2="9.01" y2="11"/><line x1="14" y1="11" x2="14.01" y2="11"/><line x1="9" y1="15" x2="9.01" y2="15"/><line x1="14" y1="15" x2="14.01" y2="15"/></svg>`,
  bars:         `<svg ${ICON_ATTRS}><line x1="4" y1="20" x2="4" y2="14"/><line x1="10" y1="20" x2="10" y2="10"/><line x1="16" y1="20" x2="16" y2="6"/></svg>`,
  mapPin:       `<svg ${ICON_ATTRS}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  starOutline:  `<svg ${ICON_ATTRS}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  starFilled:   `<svg class="icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};
function icon(name) { return ICONS[name] || ''; }

// La bibliothèque supabase-js vient d'un CDN : si le réseau est mauvais
// (ou hors-ligne) elle peut ne pas être chargée. On ne doit pas planter
// tout le script pour autant — la navigation doit continuer à marcher.
const createClient = window.supabase?.createClient;
let db = null;
let dbPret = false;

function initSupabase(url, key) {
  if (!url || !key) return false;
  if (!createClient) { console.error('supabase-js non chargé (problème réseau ?)'); return false; }
  try {
    db = createClient(url, key);
    dbPret = true;
    return true;
  } catch(e) {
    console.error('Erreur init Supabase:', e);
    dbPret = false;
    return false;
  }
}

// Charger la config : priorité au code, puis localStorage
function chargerConfig() {
  let url = CONFIG_SUPABASE.url.trim();
  let key = CONFIG_SUPABASE.key.trim();

  if (!url || !key) {
    const saved = localStorage.getItem('talentci_supabase_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        url = parsed.url || '';
        key = parsed.key || '';
      } catch(e) {}
    }
  }
  return { url, key };
}

/* ══════════════════════════════════════════
   INTERFACE CONFIG DB
══════════════════════════════════════════ */
function ouvrirConfigDB() {
  const { url, key } = chargerConfig();
  const inputUrl = document.getElementById('input-supabase-url');
  const inputKey = document.getElementById('input-supabase-key');
  if (inputUrl) inputUrl.value = url || '';
  if (inputKey) inputKey.value = key || '';
  validerChampURL(inputUrl);
  validerChampKey(inputKey);
  document.getElementById('config-status').className = 'config-status';
  document.getElementById('modal-config-db').classList.add('visible');
}

function fermerConfigDB() {
  document.getElementById('modal-config-db').classList.remove('visible');
}

document.getElementById('modal-config-db').addEventListener('click', e => {
  if (e.target === e.currentTarget) fermerConfigDB();
});

function validerChampURL(input) {
  if (!input) return;
  const val = input.value.trim();
  const iconEl = document.getElementById('icon-url');
  if (!val) { input.className = 'config-input'; if(iconEl) iconEl.textContent = ''; return; }
  const ok = val.startsWith('https://') && val.includes('.supabase.co');
  input.className = 'config-input ' + (ok ? 'ok' : 'err');
  if(iconEl) iconEl.innerHTML = ok ? ICONS.check : ICONS.error;
}

function validerChampKey(input) {
  if (!input) return;
  const val = input.value.trim();
  const iconEl = document.getElementById('icon-key');
  if (!val) { input.className = 'config-input'; if(iconEl) iconEl.textContent = ''; return; }
  const ok = val.startsWith('eyJ') && val.length > 50;
  input.className = 'config-input ' + (ok ? 'ok' : 'err');
  if(iconEl) iconEl.innerHTML = ok ? ICONS.check : ICONS.error;
}

async function testerConnexion() {
  const url = document.getElementById('input-supabase-url').value.trim();
  const key = document.getElementById('input-supabase-key').value.trim();
  const statusEl = document.getElementById('config-status');

  if (!url || !key) {
    statusEl.textContent = 'Remplis les deux champs avant de tester.';
    statusEl.className = 'config-status err';
    return;
  }

  statusEl.textContent = 'Test en cours...';
  statusEl.className = 'config-status ok';

  try {
    const testClient = createClient(url, key);
    const { error } = await testClient.from('profils').select('id').limit(1);
    if (error && !error.message.includes('does not exist') && !error.message.includes('relation')) {
      statusEl.textContent = 'Erreur : ' + error.message;
      statusEl.className = 'config-status err';
    } else {
      statusEl.textContent = 'Connexion réussie ! Supabase répond correctement.';
      statusEl.className = 'config-status ok';
    }
  } catch(e) {
    statusEl.textContent = 'Impossible de joindre Supabase. Vérifie l\'URL.';
    statusEl.className = 'config-status err';
  }
}

function sauvegarderConfig() {
  const url = document.getElementById('input-supabase-url').value.trim();
  const key = document.getElementById('input-supabase-key').value.trim();
  const statusEl = document.getElementById('config-status');

  if (!url || !key) {
    statusEl.textContent = 'Remplis les deux champs obligatoires.';
    statusEl.className = 'config-status err';
    return;
  }
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    statusEl.textContent = 'URL invalide. Elle doit commencer par https:// et se terminer par .supabase.co';
    statusEl.className = 'config-status err';
    return;
  }
  if (!key.startsWith('eyJ')) {
    statusEl.textContent = 'Clé invalide. Elle doit commencer par eyJ';
    statusEl.className = 'config-status err';
    return;
  }

  localStorage.setItem('talentci_supabase_config', JSON.stringify({ url, key }));

  const ok = initSupabase(url, key);
  if (ok) {
    fermerConfigDB();
    document.getElementById('config-banner').style.display = 'none';
    afficherToast('check', 'Base de données connectée avec succès !', 'vert');
    setTimeout(async () => {
      await demarrerApp();
    }, 300);
  } else {
    statusEl.textContent = 'Impossible d\'initialiser le client Supabase.';
    statusEl.className = 'config-status err';
  }
}

/* ══════════════════════════════════════════
   ÉTAT GLOBAL
══════════════════════════════════════════ */
let utilisateurConnecte = null;
let profilConnecte      = null;
let toutesLesMissions   = [];
let filtreCourant       = 'Tous';
let filtreCourantNotif  = 'tous';
let competencesSaisies  = [];
let competencesEditProfil = [];
let toastTimer          = null;

function estAdmin() {
  return profilConnecte?.type === 'admin';
}

/* ══════════════════════════════════════════
   INITIALISATION
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  const { url, key } = chargerConfig();

  if (url && key && !createClient) {
    afficherAlerteReseau();
  } else if (url && key) {
    const ok = initSupabase(url, key);
    if (!ok) {
      montrerAlertDB();
    } else {
      await demarrerApp();
    }
  } else {
    montrerAlertDB();
    afficherAlerteAccueil();
  }

  afficherErreurRetourAuth();

  // Lien direct (#/missions...) ou application rouverte sur une page.
  const pageInitiale = pageDepuisHash();
  if (pageInitiale && pageInitiale !== 'accueil') allerVers(pageInitiale, { historique: false });
});

/* ══════════════════════════════════════════
   APPLICATION INSTALLABLE (PWA)
   ─────────────────────────────────────────
   manifest.webmanifest + sw.js permettent d'installer TalentCI sur
   l'écran d'accueil du téléphone comme une vraie application (icône,
   plein écran, démarrage rapide, page hors-ligne).
   - Android / Chrome / Edge : le navigateur émet `beforeinstallprompt`,
     qu'on garde pour déclencher l'installation depuis notre bouton.
   - iPhone / iPad (Safari) : pas d'API d'installation → on affiche
     les instructions "Partager → Sur l'écran d'accueil".
══════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker non enregistré :', err));
  });
}

let invitationInstallation = null;

function estAppInstallee() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function estIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function mettreAJourBoutonsInstallation() {
  const visible = !estAppInstallee() && (invitationInstallation || estIOS());
  document.querySelectorAll('.btn-installer').forEach(b => { b.style.display = visible ? '' : 'none'; });
  const banniere = document.getElementById('banniere-installation');
  let masquee = false;
  try { masquee = localStorage.getItem('talentci_install_masquee') === '1'; } catch {}
  if (banniere) banniere.style.display = visible && !masquee ? 'flex' : 'none';
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  invitationInstallation = e;
  mettreAJourBoutonsInstallation();
});

window.addEventListener('appinstalled', () => {
  invitationInstallation = null;
  mettreAJourBoutonsInstallation();
  afficherToast('party', 'TalentCI est installée sur ton téléphone !', 'vert');
});

document.addEventListener('DOMContentLoaded', mettreAJourBoutonsInstallation);

async function installerApplication() {
  if (invitationInstallation) {
    invitationInstallation.prompt();
    const { outcome } = await invitationInstallation.userChoice;
    invitationInstallation = null;
    mettreAJourBoutonsInstallation();
    if (outcome === 'accepted') afficherToast('check', 'Installation en cours...', 'vert');
    return;
  }
  document.getElementById('modal-installation').classList.add('visible');
}

function fermerInstallation() {
  document.getElementById('modal-installation').classList.remove('visible');
}

function masquerBanniereInstallation() {
  try { localStorage.setItem('talentci_install_masquee', '1'); } catch {}
  mettreAJourBoutonsInstallation();
}

function montrerAlertDB() {
  document.getElementById('config-banner').style.display = 'flex';
}

function afficherAlerteAccueil() {
  const el = document.getElementById('alerte-db-accueil');
  if (el) {
    el.innerHTML = `<div class="db-alerte">
      <div class="db-alerte-icone">${icon('database')}</div>
      <div class="db-alerte-texte"><strong>Base de données non configurée</strong><br>
      Configure Supabase pour activer les inscriptions, les missions en temps réel et les candidatures.</div>
      <button class="db-alerte-btn" onclick="ouvrirConfigDB()">Configurer →</button>
    </div>`;
  }
}

function afficherAlerteReseau() {
  const el = document.getElementById('alerte-db-accueil');
  if (el) {
    el.innerHTML = `<div class="db-alerte">
      <div class="db-alerte-icone">${icon('warning')}</div>
      <div class="db-alerte-texte"><strong>Connexion impossible</strong><br>
      Vérifie ta connexion Internet puis réessaie.</div>
      <button class="db-alerte-btn" onclick="location.reload()">Réessayer</button>
    </div>`;
  }
}

async function demarrerApp() {
  if (!dbPret || !db) return;
  chargerReglagesAuth();

  // ⚠️ Le callback ne doit PAS attendre (await) d'autres appels Supabase :
  // supabase-js garde un verrou pendant son exécution, et chargerProfil()
  // a besoin de ce même verrou → blocage de l'app (connexion qui "tourne"
  // indéfiniment). On diffère donc le travail avec setTimeout.
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') setTimeout(ouvrirNouveauMotDePasse, 0);
    setTimeout(async () => {
      const etaitConnecte = !!utilisateurConnecte;
      if (session && session.user) {
        utilisateurConnecte = session.user;
        profilConnecte = await chargerProfil(session.user.id);
      } else {
        utilisateurConnecte = null;
        profilConnecte = null;
      }
      mettreAJourNavbar();
      mettreAJourProfil();
      // Retour de Google OAuth ou connexion dans un autre onglet :
      // recharger ce qui dépend de l'utilisateur.
      if (etaitConnecte !== !!utilisateurConnecte) {
        chargerNotifications();
        chargerMissions();
      }
    }, 0);
  });

  const { data: { session } } = await db.auth.getSession();
  if (session) {
    utilisateurConnecte = session.user;
    profilConnecte = await chargerProfil(session.user.id);
    mettreAJourNavbar();
    mettreAJourProfil();
  }

  await chargerMissions();
  await chargerStats();
  await chargerNotifications();

  const el = document.getElementById('alerte-db-accueil');
  if (el) el.innerHTML = '';
}

/* ══════════════════════════════════════════
   VÉRIFICATION DB AVANT CHAQUE OPÉRATION
══════════════════════════════════════════ */
function verifierDB(action) {
  if (!dbPret || !db) {
    if (!createClient) { afficherToast('warning', 'Pas de connexion Internet — réessaie plus tard', 'rouge'); return false; }
    afficherToast('settings', 'Configure d\'abord la base de données !', 'rouge');
    ouvrirConfigDB();
    return false;
  }
  return true;
}

/* ══════════════════════════════════════════
   PROFILS
══════════════════════════════════════════ */
async function chargerProfil(userId) {
  if (!verifierDB()) return null;
  const { data, error } = await db
    .from('profils')
    .select('id, user_id, nom, type, universite, competences, avatar_url, created_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.warn('Erreur profil:', error.message); return null; }
  if (data) return data;
  // Compte sans fiche profil (créé avant le trigger on_auth_user_created,
  // ou trigger absent) : on la crée maintenant, sinon l'utilisateur est
  // "connecté sans compte" (pas de nom, pas de type, rien ne marche).
  if (utilisateurConnecte && utilisateurConnecte.id === userId) return await reparerProfil(utilisateurConnecte);
  return null;
}

// Une seule réparation à la fois (la connexion et onAuthStateChange
// peuvent la déclencher en même temps).
let reparationProfilEnCours = null;
function reparerProfil(user) {
  if (!reparationProfilEnCours) {
    reparationProfilEnCours = creerProfilManquant(user).finally(() => { reparationProfilEnCours = null; });
  }
  return reparationProfilEnCours;
}

async function creerProfilManquant(user) {
  const meta = user.user_metadata || {};
  const profil = {
    user_id: user.id,
    nom: meta.full_name || meta.name || (user.email || 'Utilisateur').split('@')[0],
    type: meta.role === 'entreprise' ? 'entreprise' : 'etudiant',
    universite: meta.universite || '',
    avatar_url: meta.avatar_url || meta.picture || null
  };
  const { data, error } = await db.from('profils').insert(profil)
    .select('id, user_id, nom, type, universite, competences, avatar_url, created_at').maybeSingle();
  if (error) {
    console.warn('Création du profil impossible :', error.message);
    // Conflit = le profil existe (créé entre-temps) : on le relit.
    const { data: existant } = await db.from('profils')
      .select('id, user_id, nom, type, universite, competences, avatar_url, created_at')
      .eq('user_id', user.id).maybeSingle();
    return existant || null;
  }
  return data;
}

// Réglages publics du serveur d'authentification Supabase : quels modes
// de connexion sont activés, confirmation d'e-mail obligatoire ou non.
// Permet de ne montrer que les boutons qui fonctionnent vraiment
// (un bouton Google non activé mène sinon à une page d'erreur brute).
let reglagesAuth = null;
async function chargerReglagesAuth() {
  const { url, key } = chargerConfig();
  if (!url || !key) return;
  try {
    const rep = await avecDelai(fetch(url.replace(/\/$/, '') + '/auth/v1/settings', { headers: { apikey: key } }), 8000);
    if (rep.ok) reglagesAuth = await rep.json();
  } catch (e) { console.warn('Réglages auth indisponibles :', e.message); }
  appliquerReglagesAuth();
}
function appliquerReglagesAuth() {
  if (!reglagesAuth || !reglagesAuth.external) return;
  const google = !!reglagesAuth.external.google;
  const facebook = !!reglagesAuth.external.facebook;
  const g = document.getElementById('btn-oauth-google');
  const f = document.getElementById('btn-oauth-facebook');
  if (g) g.style.display = google ? '' : 'none';
  if (f) f.style.display = facebook ? '' : 'none';
  const bloc = document.getElementById('auth-oauth');
  if (bloc) bloc.style.display = google || facebook ? '' : 'none';
}

// Évite un bouton qui "tourne" indéfiniment sur un réseau mobile instable.
function avecDelai(promesse, ms) {
  return Promise.race([
    promesse,
    new Promise((_, rejeter) => setTimeout(() => rejeter(new Error('Délai dépassé')), ms))
  ]);
}

function basculerMdp(id, bouton) {
  const input = document.getElementById(id);
  if (!input) return;
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  bouton.innerHTML = `<svg class="icon"><use href="#i-${visible ? 'eye' : 'eye-off'}"/></svg>`;
  bouton.setAttribute('aria-label', visible ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
}

/* ══════════════════════════════════════════
   INSCRIPTION
══════════════════════════════════════════ */
async function sInscrire() {
  if (!verifierDB()) return;
  const nom   = document.getElementById('ins-nom').value.trim();
  const email = document.getElementById('ins-email').value.trim().toLowerCase();
  const pass  = document.getElementById('ins-pass').value;
  const type  = document.getElementById('ins-type').value;
  const univ  = document.getElementById('ins-univ').value.trim();

  if (!nom || !email || !pass) { afficherMsgAuth('Remplis tous les champs obligatoires.', 'erreur'); return; }
  if (pass.length < 6) { afficherMsgAuth('Le mot de passe doit faire au moins 6 caractères.', 'erreur'); return; }

  setBtnLoading('btn-sinscrire', true, 'Création...');

  let authData = null, authErr = null;
  try {
    ({ data: authData, error: authErr } = await avecDelai(db.auth.signUp({
    email, password: pass,
    options: {
      data: { full_name: nom, role: type, universite: type === 'etudiant' ? univ : '' },
      // Le lien de l'e-mail de confirmation ramène sur le site (sinon Supabase
      // utilise la "Site URL" du projet, souvent restée sur localhost).
      emailRedirectTo: urlRetourSite()
    }
  }), 20000));
  } catch (e) { authErr = e; }

  if (authErr) {
    afficherMsgAuth(tradErreur(authErr.message), 'erreur');
    setBtnLoading('btn-sinscrire', false, 'Créer mon compte →');
    return;
  }

  // Quand l'e-mail a DÉJÀ un compte, Supabase ne renvoie pas d'erreur (pour
  // ne pas révéler qui est inscrit) mais un utilisateur sans "identities" et
  // n'envoie aucun e-mail. Sans ce test, l'inscription semblait réussir
  // alors que rien ne se passait.
  if (authData?.user && Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
    setBtnLoading('btn-sinscrire', false, 'Créer mon compte →');
    basculerAuth('connexion');
    document.getElementById('cx-email').value = email;
    afficherMsgAuth('Cet e-mail a déjà un compte TalentCI. Connecte-toi avec ton mot de passe, ou clique sur « Mot de passe oublié ? ».', 'erreur');
    return;
  }

  // Le profil (table `profils`) est créé automatiquement côté serveur par
  // le trigger `on_auth_user_created` (voir sql/schema.sql) à partir des
  // métadonnées passées ci-dessus. Ça fonctionne même si la confirmation
  // d'email est activée et qu'aucune session n'existe encore côté client.

  setBtnLoading('btn-sinscrire', false, 'Créer mon compte →');

  if (!authData.session) {
    // Confirmation d'e-mail requise : on reste dans la fenêtre avec des
    // instructions claires au lieu d'un message qui disparaît.
    document.getElementById('cx-email').value = email;
    document.getElementById('inscription-ok-email').textContent = email;
    basculerAuth('inscription-ok');
  } else {
    fermerAuth();
    utilisateurConnecte = authData.session.user;
    profilConnecte = await chargerProfil(authData.session.user.id);
    mettreAJourNavbar();
    mettreAJourProfil();
    afficherToast('party', 'Bienvenue ' + nom + ' !', 'vert');
    await ajouterNotification({
      user_id: authData.user.id,
      type:'systeme', icone:'party', icone_bg:'#E1F5EE', icone_color:'#0F6E56',
      texte: 'Bienvenue sur TalentCI, <b>' + escHtml(nom) + '</b> !', lue: false
    });
  }
}

/* ══════════════════════════════════════════
   CONNEXION
══════════════════════════════════════════ */
async function seConnecter() {
  if (!verifierDB()) return;
  // Les claviers de téléphone mettent souvent une majuscule au début
  // de l'e-mail ou un espace à la fin : on normalise.
  const email = document.getElementById('cx-email').value.trim().toLowerCase();
  const pass  = document.getElementById('cx-pass').value;
  if (!email || !pass) { afficherMsgAuth('Remplis tous les champs.', 'erreur'); return; }
  setBtnLoading('btn-seconnecter', true, 'Connexion...');
  let data = null, error = null;
  try {
    ({ data, error } = await avecDelai(db.auth.signInWithPassword({ email, password: pass }), 20000));
  } catch (e) { error = e; }
  if (error) {
    afficherMsgAuth(tradErreur(error.message), 'erreur');
    if (error.message.includes('Email not confirmed')) afficherActionAuth('Renvoyer l\'e-mail de confirmation', () => renvoyerConfirmation());
    else if (error.message.includes('Invalid login')) afficherActionAuth('Mot de passe oublié ? Recevoir un lien', motDePasseOublie);
    setBtnLoading('btn-seconnecter', false, 'Se connecter →');
    return;
  }
  setBtnLoading('btn-seconnecter', false, 'Se connecter →');
  fermerAuth();
  utilisateurConnecte = data.user;
  profilConnecte = await chargerProfil(data.user.id);
  mettreAJourNavbar();
  mettreAJourProfil();
  const nom = profilConnecte?.nom || data.user.email.split('@')[0];
  afficherToast('login', 'Bienvenue ' + nom + ' !', 'vert');
  await chargerMissions();
  await chargerNotifications();
}

/* ══════════════════════════════════════════
   CONNEXION GOOGLE (OAuth)
   ─────────────────────────────────────────
   Redirige vers Google puis revient sur le site avec une session
   active ; onAuthStateChange (voir demarrerApp) prend le relais.
   Le profil (table profils) est créé automatiquement par le trigger
   on_auth_user_created, qui récupère aussi la photo Google si dispo.
   Nécessite d'avoir activé le provider Google dans Supabase
   (Authentication → Providers → Google) — voir le README.
══════════════════════════════════════════ */
function urlRetourSite() {
  return window.location.origin + window.location.pathname;
}

// provider : 'google' ou 'facebook'. Chaque fournisseur doit être activé
// dans Supabase (Authentication → Sign In / Providers) — voir le README.
async function connecterAvecFournisseur(provider) {
  if (!verifierDB()) return;
  const noms = { google: 'Google', facebook: 'Facebook' };
  const { error } = await db.auth.signInWithOAuth({
    provider,
    options: { redirectTo: urlRetourSite() }
  });
  if (error) afficherToast('error', 'Erreur ' + (noms[provider] || provider) + ' : ' + tradErreur(error.message), 'rouge');
}
function connecterAvecGoogle() { return connecterAvecFournisseur('google'); }

// Supabase renvoie les erreurs de connexion (Google/Facebook refusé,
// lien e-mail expiré...) dans l'adresse de retour : on les affiche au
// lieu de laisser l'utilisateur sans explication.
function afficherErreurRetourAuth() {
  const params = new URLSearchParams(location.hash.slice(1) + '&' + location.search.slice(1));
  const desc = params.get('error_description');
  if (!desc) return;
  afficherToast('error', 'Connexion impossible : ' + tradErreur(desc.replace(/\+/g, ' ')), 'rouge');
  history.replaceState(null, '', location.pathname);
}

/* ══════════════════════════════════════════
   MOT DE PASSE OUBLIÉ / E-MAIL DE CONFIRMATION
══════════════════════════════════════════ */
async function motDePasseOublie() {
  if (!verifierDB()) return;
  const email = document.getElementById('cx-email').value.trim().toLowerCase();
  if (!email) { afficherMsgAuth('Écris ton adresse e-mail ci-dessus, puis clique à nouveau sur « Mot de passe oublié ».', 'erreur'); return; }
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: urlRetourSite() });
  if (error) { afficherMsgAuth(tradErreur(error.message), 'erreur'); return; }
  afficherMsgAuth('Si un compte existe pour ' + email + ', un e-mail pour choisir un nouveau mot de passe vient d\'être envoyé. Pense à regarder dans les spams.', 'ok');
}

async function renvoyerConfirmation(emailForce) {
  const email = (typeof emailForce === 'string' && emailForce) || document.getElementById('cx-email').value.trim().toLowerCase();
  if (!email) return;
  const { error } = await db.auth.resend({ type: 'signup', email, options: { emailRedirectTo: urlRetourSite() } });
  if (error) { afficherMsgAuth(tradErreur(error.message), 'erreur'); return; }
  afficherMsgAuth('E-mail de confirmation renvoyé à ' + email + '. Regarde aussi dans les spams.', 'ok');
}

// Appelé quand l'utilisateur revient via le lien "nouveau mot de passe".
function ouvrirNouveauMotDePasse() {
  document.getElementById('modal-nouveau-mdp').classList.add('visible');
}
async function enregistrerNouveauMotDePasse() {
  const pass = document.getElementById('nouveau-mdp').value;
  if (pass.length < 6) { afficherToast('warning', 'Au moins 6 caractères', 'rouge'); return; }
  setBtnLoading('btn-nouveau-mdp', true, 'Enregistrement...');
  const { error } = await db.auth.updateUser({ password: pass });
  setBtnLoading('btn-nouveau-mdp', false, 'Enregistrer →');
  if (error) { afficherToast('error', tradErreur(error.message), 'rouge'); return; }
  document.getElementById('modal-nouveau-mdp').classList.remove('visible');
  afficherToast('check', 'Mot de passe modifié, tu es connecté(e) !', 'vert');
}

/* ══════════════════════════════════════════
   DÉCONNEXION
══════════════════════════════════════════ */
async function seDeconnecter() {
  if (!verifierDB()) return;
  await db.auth.signOut();
  utilisateurConnecte = null; profilConnecte = null;
  mesCandidaturesIds = new Set();
  mettreAJourNavbar();
  filtrerMissions();
  allerVers('accueil');
  afficherToast('logout', 'Tu es déconnecté(e)', '');
}

/* ══════════════════════════════════════════
   ÉDITION DE PROFIL
══════════════════════════════════════════ */
let fichierAvatarSelectionne = null;

async function ouvrirEditProfil() {
  if (!utilisateurConnecte) return;
  if (!profilConnecte) profilConnecte = await chargerProfil(utilisateurConnecte.id);
  if (!profilConnecte) { afficherToast('error', 'Profil introuvable — réessaie dans un instant', 'rouge'); return; }
  document.getElementById('edit-nom').value = profilConnecte.nom || '';
  document.getElementById('edit-univ').value = profilConnecte.universite || '';
  // Étudiant ↔ Entreprise : modifiable par l'utilisateur (utile pour les
  // comptes Google, créés "Étudiant" par défaut). Le rôle admin, lui, ne
  // se gère que depuis le panneau d'administration.
  const wrapType = document.getElementById('edit-type-wrap');
  if (wrapType) wrapType.style.display = profilConnecte.type === 'admin' ? 'none' : 'block';
  const selType = document.getElementById('edit-type');
  if (selType && profilConnecte.type !== 'admin') selType.value = profilConnecte.type;
  const wrapUniv = document.getElementById('edit-univ-wrap');
  if (wrapUniv) wrapUniv.style.display = profilConnecte.type === 'etudiant' ? 'block' : 'none';
  competencesEditProfil = Array.isArray(profilConnecte.competences) ? [...profilConnecte.competences] : [];
  afficherChipsEditProfil();

  fichierAvatarSelectionne = null;
  const preview = document.getElementById('edit-avatar-preview');
  const placeholder = document.getElementById('edit-avatar-placeholder');
  if (profilConnecte.avatar_url) {
    if (preview) { preview.src = profilConnecte.avatar_url; preview.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
  } else {
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    if (placeholder) {
      placeholder.style.display = 'flex';
      const nom = profilConnecte.nom || '';
      placeholder.textContent = nom.split(' ').map(m=>m[0]).join('').substring(0,2).toUpperCase() || '?';
    }
  }

  document.getElementById('modal-edit-profil').classList.add('visible');
}

function fermerEditProfil() {
  document.getElementById('modal-edit-profil').classList.remove('visible');
}

function previewAvatarProfil(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { afficherToast('warning','Choisis une image (JPG, PNG...)','rouge'); event.target.value = ''; return; }
  if (file.size > 3 * 1024 * 1024) { afficherToast('warning','Image trop lourde (max 3 Mo)','rouge'); event.target.value = ''; return; }
  fichierAvatarSelectionne = file;
  const preview = document.getElementById('edit-avatar-preview');
  const placeholder = document.getElementById('edit-avatar-placeholder');
  if (preview) { preview.src = URL.createObjectURL(file); preview.style.display = 'block'; }
  if (placeholder) placeholder.style.display = 'none';
}

function ajouterCompetenceProfil(event) {
  // Sur certains claviers virtuels mobiles, "Entrée" ne déclenche pas
  // toujours un vrai keydown avec key==='Enter' — le bouton "+ Ajouter"
  // (ajouterCompetenceProfilDepuisInput) est le chemin fiable, celui-ci
  // n'est qu'un raccourci clavier pour desktop.
  if (event.key !== 'Enter') return;
  event.preventDefault();
  ajouterCompetenceProfilDepuisInput();
}
function ajouterCompetenceProfilDepuisInput() {
  const input = document.getElementById('edit-competence-input');
  const val = input.value.trim();
  if (!val || competencesEditProfil.includes(val)) { input.value = ''; return; }
  if (competencesEditProfil.length >= 10) { afficherToast('warning','Maximum 10 compétences',''); return; }
  competencesEditProfil.push(val);
  input.value = '';
  afficherChipsEditProfil();
}
function supprimerCompetenceProfil(i) { competencesEditProfil.splice(i,1); afficherChipsEditProfil(); }
function afficherChipsEditProfil() {
  const c = document.getElementById('edit-chips-competences');
  if (c) c.innerHTML = competencesEditProfil.map((comp,i) =>
    `<span class="chip">${escHtml(comp)} <span class="chip-suppr" onclick="supprimerCompetenceProfil(${i})">×</span></span>`
  ).join('');
}

async function enregistrerProfil() {
  if (!verifierDB() || !utilisateurConnecte) return;
  const nom  = document.getElementById('edit-nom').value.trim();
  const univ = document.getElementById('edit-univ').value.trim();
  if (!nom) { afficherToast('warning','Le nom est obligatoire','rouge'); return; }
  setBtnLoading('btn-enregistrer-profil', true, 'Enregistrement...');

  let avatarUrl = profilConnecte?.avatar_url || null;
  if (fichierAvatarSelectionne) {
    const ext = (fichierAvatarSelectionne.name.split('.').pop() || 'jpg').toLowerCase();
    const chemin = `${utilisateurConnecte.id}/avatar.${ext}`;
    const { error: uploadErr } = await db.storage.from('avatars')
      .upload(chemin, fichierAvatarSelectionne, { upsert: true, cacheControl: '3600' });
    if (uploadErr) {
      setBtnLoading('btn-enregistrer-profil', false, 'Enregistrer →');
      afficherToast('error', 'Erreur photo : ' + uploadErr.message, 'rouge');
      return;
    }
    const { data: urlData } = db.storage.from('avatars').getPublicUrl(chemin);
    avatarUrl = urlData.publicUrl + '?t=' + Date.now(); // cache-busting : même chemin réutilisé à chaque changement
  }

  const maj = { nom, competences: competencesEditProfil, avatar_url: avatarUrl };
  const typeChoisi = document.getElementById('edit-type')?.value;
  const nouveauType = profilConnecte?.type === 'admin' ? 'admin'
    : (typeChoisi === 'entreprise' || typeChoisi === 'etudiant' ? typeChoisi : profilConnecte?.type);
  if (nouveauType !== profilConnecte?.type) maj.type = nouveauType;
  maj.universite = nouveauType === 'etudiant' ? univ : '';
  const { error } = await db.from('profils').update(maj).eq('user_id', utilisateurConnecte.id);
  setBtnLoading('btn-enregistrer-profil', false, 'Enregistrer →');
  if (error) {
    const msg = /type de compte/i.test(error.message)
      ? 'Changement de type refusé : exécute sql/migration-2026-10-reparation-comptes.sql dans Supabase.'
      : 'Erreur : ' + error.message;
    afficherToast('error', msg, 'rouge'); return;
  }
  fichierAvatarSelectionne = null;
  profilConnecte = await chargerProfil(utilisateurConnecte.id);
  fermerEditProfil();
  mettreAJourNavbar();
  await mettreAJourProfil();
  afficherToast('check','Profil mis à jour !','vert');
}

/* ══════════════════════════════════════════
   MISSIONS — LECTURE
══════════════════════════════════════════ */
async function chargerMissions() {
  if (!verifierDB()) {
    toutesLesMissions = [];
    const grille = document.getElementById('missions-grille');
    if (grille) grille.innerHTML = `<div class="aucun-resultat"><div style="font-size:48px">${icon('database')}</div><p>Configure la base de données pour voir les missions.</p><button class="btn btn-vert" style="margin-top:16px;" onclick="ouvrirConfigDB()">Configurer →</button></div>`;
    return;
  }
  const { data, error } = await db
    .from('missions')
    .select('*')
    .eq('actif', true)
    .order('created_at', { ascending: false });
  if (error) { console.error('Erreur missions:', error.message); toutesLesMissions = []; }
  else toutesLesMissions = Array.isArray(data) ? data : [];
  await chargerMesCandidaturesIds();
  filtrerMissions();
  rendreAccueil();
}

// Missions auxquelles l'étudiant connecté a déjà postulé : permet
// d'afficher "Candidature envoyée" au lieu de "Postuler" sur la carte.
let mesCandidaturesIds = new Set();
async function chargerMesCandidaturesIds() {
  mesCandidaturesIds = new Set();
  if (!dbPret || !db || !utilisateurConnecte) return;
  const { data } = await db.from('candidatures').select('mission_id').eq('user_id', utilisateurConnecte.id);
  (data || []).forEach(c => mesCandidaturesIds.add(c.mission_id));
}

/* ══════════════════════════════════════════
   MISSIONS — PUBLICATION
══════════════════════════════════════════ */
async function publierMission() {
  if (!verifierDB()) return;
  if (!utilisateurConnecte) { afficherToast('lock', 'Connecte-toi pour publier', 'rouge'); ouvrirAuth('connexion'); return; }
  if (profilConnecte?.type !== 'entreprise' && !estAdmin()) {
    afficherToast('warning', 'Seuls les comptes Entreprise peuvent publier des missions', 'rouge'); return;
  }
  const titre      = document.getElementById('champ-titre').value.trim();
  const categorie   = document.getElementById('champ-categorie').value;
  const description = document.getElementById('champ-description').value.trim();
  const places      = parseInt(document.getElementById('champ-places').value, 10);
  const montant     = parseInt(document.getElementById('champ-montant').value, 10);
  const duree       = document.getElementById('champ-duree').value;
  const niveau      = document.getElementById('champ-niveau').value;
  if (!titre)                   { afficherToast('warning','Titre obligatoire','rouge'); return; }
  if (!categorie)               { afficherToast('warning','Choisis une catégorie','rouge'); return; }
  if (description.length < 30) { afficherToast('warning','Description trop courte (min 30 car.)','rouge'); return; }
  if (!places || places < 1 || places > 500) { afficherToast('warning','Nombre de personnes : entre 1 et 500','rouge'); return; }
  if (!montant || montant < 1000) { afficherToast('warning','Montant minimum : 1 000 FCFA par personne','rouge'); return; }
  const budget = places * montant;
  if (budget < 5000) { afficherToast('warning','Budget total minimum : 5 000 FCFA','rouge'); return; }
  const nomEntreprise = profilConnecte?.nom || utilisateurConnecte.email.split('@')[0];
  const ini = nomEntreprise.split(' ').map(m => m[0]).join('').substring(0,2).toUpperCase();
  const bgMap  = {Design:'#EEEDFE',Développement:'#E6F1FB',Marketing:'#E1F5EE',Comptabilité:'#FAEEDA',Data:'#FAEEDA',Rédaction:'#E1F5EE',Vidéo:'#FBEAF0'};
  const txtMap = {Design:'#534AB7',Développement:'#185FA5',Marketing:'#0F6E56',Comptabilité:'#BA7517',Data:'#BA7517',Rédaction:'#0F6E56',Vidéo:'#993556'};
  setBtnLoading('btn-publier', true, 'Publication...');

  let imageUrl = null;
  if (fichierCouverture) {
    const ext = (fichierCouverture.name.split('.').pop() || 'jpg').toLowerCase();
    const chemin = `${utilisateurConnecte.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await db.storage.from('missions').upload(chemin, fichierCouverture, { cacheControl: '31536000' });
    if (upErr) {
      setBtnLoading('btn-publier', false, 'Publier l\'offre →');
      afficherToast('error', 'Erreur image : ' + upErr.message, 'rouge');
      return;
    }
    imageUrl = db.storage.from('missions').getPublicUrl(chemin).data.publicUrl;
  }

  const { error } = await db.from('missions').insert({
    titre, entreprise: nomEntreprise, initiales: ini,
    couleur_bg: bgMap[categorie]||'#E1F5EE', couleur_txt: txtMap[categorie]||'#0F6E56',
    categorie, description, salaire: budget, duree, niveau,
    nb_places: places, montant_par_personne: montant, image_url: imageUrl,
    actif: true, user_id: utilisateurConnecte.id,
    competences: competencesSaisies, created_at: new Date().toISOString()
  });
  setBtnLoading('btn-publier', false, 'Publier l\'offre →');
  if (error) {
    // Colonnes absentes = la migration SQL des places n'a pas été exécutée.
    const msg = /nb_places|montant_par_personne|image_url|column/i.test(error.message)
      ? 'La base doit être mise à jour : exécute sql/migration-2026-10-offres-places.sql dans Supabase.'
      : 'Erreur : ' + error.message;
    afficherToast('error', msg, 'rouge'); return;
  }
  document.getElementById('succes-publication').classList.add('visible');
  document.querySelector('.form-actions').style.display = 'none';
  afficherToast('party','Offre publiée avec succès !','vert');
  await chargerMissions();
  await chargerMissionsEntreprise();
}

/* ══════════════════════════════════════════
   CANDIDATURES
══════════════════════════════════════════ */
async function postuler(missionId) {
  if (!verifierDB()) return;
  if (!utilisateurConnecte) { afficherToast('lock','Connecte-toi pour postuler','rouge'); ouvrirAuth('connexion'); return; }
  if (profilConnecte?.type !== 'etudiant') { afficherToast('warning','Seuls les étudiants peuvent postuler',''); return; }
  const cible = toutesLesMissions.find(m => m.id === missionId);
  if (cible && placesRestantes(cible) === 0) { afficherToast('info','Toutes les places de cette offre sont prises',''); return; }
  const { data: existant } = await db.from('candidatures').select('id').eq('mission_id', missionId).eq('user_id', utilisateurConnecte.id).maybeSingle();
  if (existant) { afficherToast('info','Tu as déjà postulé à cette mission !',''); return; }
  const mission = toutesLesMissions.find(m => m.id === missionId);
  const { error } = await db.from('candidatures').insert({
    mission_id: missionId, user_id: utilisateurConnecte.id,
    statut: 'en_attente', created_at: new Date().toISOString()
  });
  if (error) { afficherToast('error','Erreur : ' + error.message,'rouge'); return; }
  mesCandidaturesIds.add(missionId);
  filtrerMissions();
  rendreAccueil();
  if (document.getElementById('modal-offre').classList.contains('visible')) ouvrirOffre(missionId);
  await ajouterNotification({
    user_id: utilisateurConnecte.id, type: 'candidature',
    icone:'check', icone_bg:'#E1F5EE', icone_color:'#0F6E56',
    texte: 'Candidature envoyée pour "<b>' + escHtml(mission?.titre||'cette mission') + '</b>" !',
    montant: mission ? fcfa(montantParPersonne(mission)) : null, lue: false
  });
  afficherToast('check','Candidature envoyée !','vert');
  if (document.getElementById('page-profil').classList.contains('active')) await mettreAJourProfil();
}

/* ══════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════ */
async function ajouterNotification(notif) {
  if (!verifierDB()) return;
  if (!utilisateurConnecte && !notif.user_id) return;
  await db.from('notifications').insert({
    ...notif, user_id: notif.user_id || utilisateurConnecte?.id || null,
    created_at: new Date().toISOString()
  });
  await chargerNotifications();
}

async function chargerNotifications() {
  const liste = document.getElementById('notif-liste');
  if (!liste) return;
  if (!dbPret || !db) {
    liste.innerHTML = `<div style="text-align:center;padding:48px;color:var(--texte-3);"><div style="font-size:40px;margin-bottom:12px;">${icon('database')}</div><p>Configure la base de données pour voir tes notifications.</p><button class="btn btn-vert" style="margin-top:12px;" onclick="ouvrirConfigDB()">Configurer →</button></div>`;
    return;
  }
  if (!utilisateurConnecte) {
    liste.innerHTML = `<div style="text-align:center;padding:48px;color:var(--texte-3);"><div style="font-size:40px;margin-bottom:12px;">${icon('lock')}</div><p>Connecte-toi pour voir tes notifications.</p></div>`;
    return;
  }
  let query = db.from('notifications')
    .select('id, user_id, type, icone, icone_bg, icone_color, texte, montant, lue, created_at')
    .eq('user_id', utilisateurConnecte.id)
    .order('created_at', { ascending: false }).limit(30);
  if (filtreCourantNotif !== 'tous') query = query.eq('type', filtreCourantNotif);
  const { data, error } = await query;
  if (error) { liste.innerHTML = '<div style="text-align:center;padding:32px;color:var(--texte-3);">Impossible de charger les notifications.</div>'; return; }
  const notifs = data || [];
  const nbNonLues = notifs.filter(n => !n.lue).length;
  const elBadge = document.getElementById('nb-non-lues');
  if (elBadge) elBadge.textContent = nbNonLues > 0 ? `(${nbNonLues} non lues)` : '(tout lu)';
  const btnNotifNav = document.getElementById('btn-notif-nav');
  if (btnNotifNav) btnNotifNav.classList.toggle('notif-badge-nav', nbNonLues > 0);
  document.getElementById('bottom-nav-notif')?.classList.toggle('a-des-alertes', nbNonLues > 0);
  if (notifs.length === 0) {
    liste.innerHTML = `<div style="text-align:center;padding:48px;color:var(--texte-3);"><div style="font-size:40px;margin-bottom:12px;">${icon('bell')}</div><p>Aucune notification pour l'instant.</p></div>`;
    return;
  }
  liste.innerHTML = notifs.map(n => `
    <div class="notif-item${n.lue ? '' : ' non-lue'}" onclick="marquerLu(${n.id})">
      <div class="notif-point ${n.lue ? 'invisible' : ''}"></div>
      <div class="notif-icone-rond" style="background:${escAttr(n.icone_bg)};color:${escAttr(n.icone_color)}">${icon(n.icone) || escHtml(n.icone||'')}</div>
      <div class="notif-corps">
        <div class="notif-texte">${n.texte}</div>
        <div class="notif-temps">${formatDate(n.created_at)}</div>
      </div>
      ${n.montant ? `<div class="notif-badge-montant">${escHtml(n.montant)}</div>` : ''}
    </div>`).join('');
}

async function marquerLu(id) {
  if (!verifierDB()) return;
  await db.from('notifications').update({ lue: true }).eq('id', id);
  await chargerNotifications();
}

async function toutMarquerLu() {
  if (!verifierDB()) return;
  if (!utilisateurConnecte) return;
  await db.from('notifications').update({ lue: true }).eq('user_id', utilisateurConnecte.id).eq('lue', false);
  await chargerNotifications();
  afficherToast('check','Toutes les notifications sont lues !','vert');
}

/* ══════════════════════════════════════════
   STATS ACCUEIL
══════════════════════════════════════════ */
async function chargerStats() {
  if (!verifierDB()) {
    setText('stat-etudiants', '—');
    setText('stat-entreprises', '—');
    setText('stat-missions', '—');
    return;
  }
  const [r1, r2, r3] = await Promise.all([
    db.from('profils').select('id', { count: 'exact', head: true }).eq('type', 'etudiant'),
    db.from('profils').select('id', { count: 'exact', head: true }).eq('type', 'entreprise'),
    db.from('missions').select('id', { count: 'exact', head: true }).eq('actif', true)
  ]);
  setText('stat-etudiants',   (r1.count||0) + '+');
  setText('stat-entreprises', (r2.count||0) + '+');
  setText('stat-missions',    (r3.count||0) + '+');
}

/* ══════════════════════════════════════════
   AFFICHAGE MISSIONS
══════════════════════════════════════════ */
function labelType(type) {
  if (type === 'etudiant') return 'Étudiant';
  if (type === 'admin') return 'Admin';
  return 'Entreprise';
}
function badgeType(type) {
  if (type === 'etudiant') return 'vert';
  if (type === 'admin') return 'amber';
  return 'bleu';
}

function couleurCategorie(cat) {
  const map = {Design:'violet',Développement:'bleu',Marketing:'vert',Comptabilité:'amber',Data:'amber',Rédaction:'vert',Vidéo:'bleu'};
  return map[cat] || 'vert';
}

function iconCategorie(cat) {
  const map = {Design:'palette',Développement:'code',Marketing:'smartphone',Comptabilité:'chart',Data:'trendingUp',Rédaction:'fileText',Vidéo:'video',Traduction:'globe'};
  return icon(map[cat] || 'clipboard');
}

/* ══════════════════════════════════════════
   OFFRES — DONNÉES CALCULÉES
   Compatibles avec les anciennes missions (avant la migration des
   places) : 1 place, tout le budget pour une personne.
══════════════════════════════════════════ */
function nbPlaces(m) { return Math.max(1, parseInt(m.nb_places, 10) || 1); }
function montantParPersonne(m) { return parseInt(m.montant_par_personne, 10) || parseInt(m.salaire, 10) || 0; }
function placesRestantes(m) { return Math.max(0, nbPlaces(m) - (parseInt(m.places_prises, 10) || 0)); }
function fcfa(n) { return (Number(n) || 0).toLocaleString('fr-FR') + ' FCFA'; }

const MOIS_COURTS = ['JANV','FÉVR','MARS','AVR','MAI','JUIN','JUIL','AOÛT','SEPT','OCT','NOV','DÉC'];
function badgeDate(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d)) return '';
  return `<div class="offre-date"><span>${d.getDate()}</span><small>${MOIS_COURTS[d.getMonth()]}</small></div>`;
}

// Couverture : photo de l'offre si fournie, sinon dégradé aux couleurs
// de la catégorie avec son icône.
function couvertureOffre(m) {
  const bg  = escAttr(m.couleur_bg || '#E1F5EE');
  const txt = escAttr(m.couleur_txt || '#0F6E56');
  if (m.image_url) {
    return `<div class="offre-couverture" style="background-image:url('${cssUrl(m.image_url)}')"></div>`;
  }
  return `<div class="offre-couverture offre-couverture-vide" style="background:linear-gradient(135deg, ${bg} 0%, #fff 140%);color:${txt}">${iconCategorie(m.categorie)}</div>`;
}

function pastillePlaces(m) {
  const reste = placesRestantes(m), total = nbPlaces(m);
  if (reste === 0) return `<span class="offre-places complet">Complet</span>`;
  return `<span class="offre-places">${icon('users')} ${reste === total ? total + (total > 1 ? ' places' : ' place') : reste + '/' + total + ' restantes'}</span>`;
}

function rendreCarte(m) {
  const complet = placesRestantes(m) === 0;
  return `<article class="offre-carte${complet ? ' est-complet' : ''}" onclick="ouvrirOffre(${m.id})">
    <div class="offre-media">
      ${couvertureOffre(m)}
      ${badgeDate(m.created_at)}
      <button class="offre-fav" onclick="event.stopPropagation();toggleFav(${m.id})" aria-label="${m.fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}" style="color:${m.fav ? '#F5A623' : 'var(--texte-2)'};">${icon(m.fav ? 'starFilled' : 'starOutline')}</button>
      ${mesCandidaturesIds.has(m.id) ? `<span class="offre-postule">${icon('check')} Postulé</span>` : ''}
    </div>
    <div class="offre-corps">
      <div class="offre-cat">${iconCategorie(m.categorie)}<span>${escHtml(m.categorie)}</span></div>
      <h3 class="offre-titre">${escHtml(m.titre)}</h3>
      <div class="offre-entreprise">${icon('building')}<span>${escHtml(m.entreprise)}</span></div>
      <div class="offre-pied">
        <div class="offre-prix"><small>Par personne</small><strong>${fcfa(montantParPersonne(m))}</strong></div>
        ${pastillePlaces(m)}
      </div>
    </div>
  </article>`;
}

/* ══════════════════════════════════════════
   DÉTAIL D'UNE OFFRE
══════════════════════════════════════════ */
function ouvrirOffre(id) {
  const m = toutesLesMissions.find(x => x.id === id);
  if (!m) return;
  const reste = placesRestantes(m);
  const dejaPostule = mesCandidaturesIds.has(m.id);
  const comps = Array.isArray(m.competences) ? m.competences : [];
  const bouton = dejaPostule
    ? `<button class="btn-postuler-large deja-postule" disabled>${icon('check')} Candidature envoyée</button>`
    : reste === 0
    ? `<button class="btn-postuler-large deja-postule" disabled>Toutes les places sont prises</button>`
    : `<button class="btn-postuler-large" onclick="postuler(${m.id})">Postuler →</button>`;
  document.getElementById('offre-detail').innerHTML = `
    <button class="offre-modal-fermer" onclick="fermerOffre()" aria-label="Fermer">×</button>
    <div class="offre-modal-media">${couvertureOffre(m)}${badgeDate(m.created_at)}</div>
    <div class="offre-modal-corps">
      <div class="offre-cat">${iconCategorie(m.categorie)}<span>${escHtml(m.categorie)}</span></div>
      <h2 class="offre-modal-titre">${escHtml(m.titre)}</h2>
      <div class="offre-entreprise">${icon('building')}<span>Publié par <strong>${escHtml(m.entreprise)}</strong> · ${formatDate(m.created_at)}</span></div>
      <div class="offre-chiffres">
        <div><small>Par personne</small><strong>${fcfa(montantParPersonne(m))}</strong></div>
        <div><small>Personnes recherchées</small><strong>${nbPlaces(m)}</strong></div>
        <div><small>Places restantes</small><strong>${reste}</strong></div>
      </div>
      <div class="offre-infos">
        <span>${icon('clock')} ${escHtml(m.duree || '—')}</span>
        <span>${icon('bars')} ${escHtml(m.niveau || '—')}</span>
      </div>
      <p class="offre-description">${escHtml(m.description)}</p>
      ${comps.length ? `<div class="offre-comps">${comps.map(c => `<span class="comp-pill">${escHtml(c)}</span>`).join('')}</div>` : ''}
      <div class="offre-modal-actions">${bouton}</div>
    </div>`;
  document.getElementById('modal-offre').classList.add('visible');
}
function fermerOffre() { document.getElementById('modal-offre').classList.remove('visible'); }

/* ══════════════════════════════════════════
   ACCUEIL : BANDEAU À LA UNE + RANGÉES
══════════════════════════════════════════ */
let carrouselTimer = null;
let carrouselIndex = 0;

function rendreAccueil() {
  const piste = document.getElementById('carrousel-piste');
  const une = document.getElementById('rangee-une');
  const recentes = document.getElementById('rangee-recentes');
  if (!piste || !une || !recentes) return;
  const favoris = lireFavoris();
  toutesLesMissions.forEach(m => { m.fav = favoris.has(m.id); });

  const dispo = toutesLesMissions.filter(m => placesRestantes(m) > 0);
  const alaune = [...dispo].sort((a, b) => (montantParPersonne(b) * nbPlaces(b)) - (montantParPersonne(a) * nbPlaces(a))).slice(0, 8);
  const vide = `<div class="rangee-vide">Aucune offre pour l'instant. <button class="rangee-voir-tout" onclick="allerVers('entreprise')">Publier la première →</button></div>`;
  une.innerHTML = alaune.length ? alaune.map(rendreCarte).join('') : vide;
  recentes.innerHTML = toutesLesMissions.length ? toutesLesMissions.slice(0, 8).map(rendreCarte).join('') : vide;

  // Bandeau : diapo d'accueil + jusqu'à 4 offres à la une
  const intro = piste.querySelector('.carrousel-slide-intro');
  piste.querySelectorAll('.carrousel-slide:not(.carrousel-slide-intro)').forEach(el => el.remove());
  alaune.slice(0, 4).forEach(m => {
    const slide = document.createElement('div');
    slide.className = 'carrousel-slide';
    if (m.image_url) slide.style.backgroundImage = `linear-gradient(90deg, rgba(15,110,86,.92) 0%, rgba(15,110,86,.55) 55%, rgba(15,110,86,.15) 100%), url('${cssUrl(m.image_url)}')`;
    slide.innerHTML = `<div class="carrousel-contenu">
        <div class="carrousel-label">${escHtml(m.categorie)} · À la une</div>
        <h2>${escHtml(m.titre)}</h2>
        <p>${escHtml(m.entreprise)} recherche ${nbPlaces(m)} ${nbPlaces(m) > 1 ? 'personnes' : 'personne'} — <strong>${fcfa(montantParPersonne(m))}</strong> chacune</p>
        <div class="hero-boutons"><button class="btn btn-blanc-plein" onclick="ouvrirOffre(${m.id})">Voir l'offre →</button></div>
      </div>
      ${m.image_url ? '' : `<div class="carrousel-deco">${iconCategorie(m.categorie)}</div>`}`;
    piste.appendChild(slide);
  });
  if (intro) piste.prepend(intro);

  const nb = piste.children.length;
  const points = document.getElementById('carrousel-points');
  points.innerHTML = nb > 1 ? Array.from({ length: nb }, (_, i) =>
    `<button class="carrousel-point${i === 0 ? ' actif' : ''}" onclick="allerDiapo(${i})" aria-label="Diapo ${i + 1}"></button>`).join('') : '';
  carrouselIndex = 0;
  piste.scrollTo({ left: 0 });
  demarrerCarrousel();
}

function allerDiapo(i) {
  const piste = document.getElementById('carrousel-piste');
  if (!piste || !piste.children.length) return;
  carrouselIndex = (i + piste.children.length) % piste.children.length;
  piste.scrollTo({ left: piste.clientWidth * carrouselIndex, behavior: 'smooth' });
  demarrerCarrousel();
}

function demarrerCarrousel() {
  clearInterval(carrouselTimer);
  const piste = document.getElementById('carrousel-piste');
  if (!piste || piste.children.length < 2) return;
  carrouselTimer = setInterval(() => {
    if (!document.getElementById('page-accueil')?.classList.contains('active') || document.hidden) return;
    allerDiapo(carrouselIndex + 1);
  }, 6000);
}

// Suivre le glissement au doigt pour mettre à jour les points.
document.getElementById('carrousel-piste')?.addEventListener('scroll', (e) => {
  const piste = e.currentTarget;
  const i = Math.round(piste.scrollLeft / Math.max(1, piste.clientWidth));
  if (i !== carrouselIndex) { carrouselIndex = i; demarrerCarrousel(); }
  document.querySelectorAll('.carrousel-point').forEach((p, j) => p.classList.toggle('actif', j === i));
}, { passive: true });

function rechercherDepuisAccueil() {
  const q = document.getElementById('accueil-recherche-input').value;
  allerVersCategorie('Tous');
  const input = document.getElementById('recherche-input');
  if (input) input.value = q;
  filtrerMissions();
}

/* ══════════════════════════════════════════
   FORMULAIRE : TOTAL + COUVERTURE
══════════════════════════════════════════ */
function majTotalOffre() {
  const places = parseInt(document.getElementById('champ-places').value, 10) || 0;
  const montant = parseInt(document.getElementById('champ-montant').value, 10) || 0;
  const el = document.getElementById('total-offre');
  if (!el) return;
  el.innerHTML = places && montant
    ? `Budget total : <strong>${fcfa(places * montant)}</strong> <span>(${places} × ${fcfa(montant)})</span>`
    : 'Budget total : <strong>—</strong>';
}

let fichierCouverture = null;
function choisirCouverture(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { afficherToast('warning','Choisis une image (JPG, PNG...)','rouge'); event.target.value=''; return; }
  if (file.size > 3 * 1024 * 1024) { afficherToast('warning','Image trop lourde (max 3 Mo)','rouge'); event.target.value=''; return; }
  fichierCouverture = file;
  const img = document.getElementById('couverture-apercu');
  img.src = URL.createObjectURL(file); img.style.display = 'block';
  document.getElementById('couverture-texte').innerHTML = `${icon('camera')} Changer l'image`;
}

function filtrerMissions() {
  const input     = document.getElementById('recherche-input');
  const triSelect = document.getElementById('tri-select');
  const grille    = document.getElementById('missions-grille');
  const nbEl      = document.getElementById('nb-resultats');
  if (!grille) return;
  const recherche = input ? input.value.toLowerCase() : '';
  const tri       = triSelect ? triSelect.value : 'recent';
  const favoris   = lireFavoris();
  toutesLesMissions.forEach(m => { m.fav = favoris.has(m.id); });
  let resultats = toutesLesMissions.filter(m => {
    const matchCat  = filtreCourant === 'Tous'
      || (filtreCourant === 'Favoris' ? m.fav : m.categorie === filtreCourant);
    const comps = Array.isArray(m.competences) ? m.competences.join(' ') : '';
    const matchRech = [m.titre, m.entreprise, m.categorie, m.description, comps].join(' ').toLowerCase().includes(recherche);
    return matchCat && matchRech;
  });
  if (tri === 'salaire-desc') resultats.sort((a,b) => montantParPersonne(b) - montantParPersonne(a));
  if (tri === 'salaire-asc')  resultats.sort((a,b) => montantParPersonne(a) - montantParPersonne(b));
  if (tri === 'places')       resultats.sort((a,b) => placesRestantes(b) - placesRestantes(a));
  if (nbEl) nbEl.textContent = resultats.length;
  if (resultats.length === 0) {
    grille.innerHTML = toutesLesMissions.length === 0
      ? `<div class="aucun-resultat"><div style="font-size:48px">${icon('clipboard')}</div><p>Aucune mission disponible pour l'instant.<br><span style="font-size:13px">Sois le premier à publier une mission !</span></p></div>`
      : filtreCourant === 'Favoris' && !recherche
      ? `<div class="aucun-resultat"><div style="font-size:48px">${icon('starOutline')}</div><p>Aucun favori pour l'instant.<br><span style="font-size:13px">Touche l'étoile d'une mission pour la retrouver ici.</span></p></div>`
      : `<div class="aucun-resultat"><div style="font-size:48px">${icon('search')}</div><p>Aucune mission trouvée pour cette recherche.</p></div>`;
  } else {
    grille.innerHTML = resultats.map(rendreCarte).join('');
  }
}

function changerFiltre(btn) {
  document.querySelectorAll('#filtres-ligne .filtre-cat-btn').forEach(b => b.classList.remove('actif'));
  btn.classList.add('actif');
  filtreCourant = btn.getAttribute('data-cat');
  filtrerMissions();
}

function allerVersCategorie(cat) {
  allerVers('missions');
  filtreCourant = cat;
  document.querySelectorAll('#filtres-ligne .filtre-cat-btn').forEach(b => {
    b.classList.toggle('actif', b.getAttribute('data-cat') === cat);
  });
  filtrerMissions();
}

// Favoris gardés dans le navigateur (localStorage) pour survivre au
// rechargement de la page / à la fermeture de l'application.
function lireFavoris() {
  try { return new Set(JSON.parse(localStorage.getItem('talentci_favoris') || '[]')); }
  catch { return new Set(); }
}
function ecrireFavoris(set) {
  try { localStorage.setItem('talentci_favoris', JSON.stringify([...set])); } catch {}
}

function toggleFav(id) {
  const favoris = lireFavoris();
  const estFav = !favoris.has(id);
  if (estFav) favoris.add(id); else favoris.delete(id);
  ecrireFavoris(favoris);
  afficherToast(estFav ? 'starFilled' : 'starOutline', estFav ? 'Offre sauvegardée !' : 'Retirée des favoris', estFav ? 'vert' : '');
  filtrerMissions();
  rendreAccueil();
}

/* ══════════════════════════════════════════
   PROFIL UTILISATEUR
══════════════════════════════════════════ */
async function mettreAJourProfil() {
  const nonCx = document.getElementById('profil-non-connecte');
  const cx    = document.getElementById('profil-connecte');
  if (!utilisateurConnecte) {
    if (nonCx) nonCx.style.display = 'block';
    if (cx)    cx.style.display    = 'none';
    return;
  }
  if (nonCx) nonCx.style.display = 'none';
  if (cx)    cx.style.display    = 'block';
  const p   = profilConnecte;
  const nom = p?.nom || utilisateurConnecte.email.split('@')[0];
  const ini = nom.split(' ').map(m => m[0]).join('').substring(0,2).toUpperCase();
  appliquerAvatarVisuel(document.getElementById('profil-avatar'), p?.avatar_url, ini);
  setText('profil-nom-affiche', nom);
  setText('profil-type-affiche', p?.type === 'entreprise' ? 'Entreprise' : p?.type === 'admin' ? 'Administrateur' : 'Étudiant(e)');
  setText('profil-univ-affiche', p?.universite || '');

  const compEl = document.getElementById('profil-competences');
  if (compEl) {
    const comps = Array.isArray(p?.competences) ? p.competences : [];
    compEl.innerHTML = comps.length > 0
      ? comps.map(c => `<span class="comp-pill">${escHtml(c)}</span>`).join('')
      : '<span class="comp-pill">Non renseigné</span>';
  }

  if (!verifierDB()) return;

  const { data: cands, error } = await db
    .from('candidatures')
    .select('id, mission_id, user_id, statut, created_at, missions(*)')
    .eq('user_id', utilisateurConnecte.id)
    .order('created_at', { ascending: false });
  if (!error && cands) {
    setText('kpi-terminees', cands.filter(c => c.statut === 'acceptee').length);
    setText('kpi-encours',   cands.filter(c => c.statut === 'en_attente').length);
    setText('kpi-total',     cands.length);
    const listeCands = document.getElementById('liste-candidatures');
    if (listeCands) {
      if (cands.length === 0) {
        listeCands.innerHTML = '<div style="text-align:center;padding:32px;color:var(--texte-3);">Aucune candidature.<br><button class="btn btn-vert" style="margin-top:12px;" onclick="allerVers(\'missions\')">Voir les missions →</button></div>';
      } else {
        listeCands.innerHTML = cands.map(c => {
          const titreM   = c.missions?.titre || 'Mission supprimée';
          const montantM = c.missions ? fcfa(montantParPersonne(c.missions)) : '—';
          const icone = c.statut === 'acceptee' ? icon('check') : c.statut === 'refusee' ? icon('error') : icon('clock');
          const bg    = c.statut === 'acceptee' ? 'var(--vert-clair)' : c.statut === 'refusee' ? '#FCEBEB' : 'var(--amber-clair)';
          const txt   = c.statut === 'acceptee' ? 'Acceptée' : c.statut === 'refusee' ? 'Refusée' : 'En attente';
          return `<div class="historique-item">
            <div class="hist-statut" style="background:${bg};font-size:16px;">${icone}</div>
            <div class="hist-info"><div class="hist-titre">${escHtml(titreM)}</div><div class="hist-meta">${formatDate(c.created_at)} · ${txt}</div></div>
            <div class="hist-montant">${montantM}</div>
          </div>`;
        }).join('');
      }
    }
  }
}

/* ══════════════════════════════════════════
   PAGE ENTREPRISE
══════════════════════════════════════════ */
// Page "Entreprises" : le formulaire n'a de sens que pour un compte
// Entreprise (ou admin). Sinon, on explique quoi faire au lieu de laisser
// remplir tout le formulaire pour un refus au dernier moment.
function majAccesEntreprise() {
  const gate = document.getElementById('entreprise-acces');
  const form = document.getElementById('form-carte-offre');
  if (!gate || !form) return;
  const peutPublier = !!utilisateurConnecte && (profilConnecte?.type === 'entreprise' || estAdmin());
  form.style.display = peutPublier ? '' : 'none';
  gate.style.display = peutPublier ? 'none' : 'block';
  if (peutPublier) return;
  gate.innerHTML = !utilisateurConnecte
    ? `<div class="acces-icone">${icon('building')}</div>
       <h3>Publie tes offres sur TalentCI</h3>
       <p>Connecte-toi avec un compte <strong>Entreprise</strong> pour publier une offre et recevoir des candidatures d'étudiants.</p>
       <div class="acces-boutons"><button class="btn btn-vert" onclick="ouvrirAuth('inscription');document.getElementById('ins-type').value='entreprise';document.getElementById('champ-univ-wrap').style.display='none';">Créer un compte Entreprise</button>
       <button class="btn btn-outline" onclick="ouvrirAuth('connexion')">Se connecter</button></div>`
    : `<div class="acces-icone">${icon('building')}</div>
       <h3>Ton compte est un compte Étudiant</h3>
       <p>Pour publier des offres, passe ton compte en <strong>Entreprise</strong> (tu pourras revenir en arrière à tout moment).</p>
       <div class="acces-boutons"><button class="btn btn-vert" onclick="ouvrirEditProfil().then(() => { const t = document.getElementById('edit-type'); if (t) { t.value = 'entreprise'; t.onchange(); } })">Passer en compte Entreprise</button></div>`;
}

async function chargerMissionsEntreprise() {
  majAccesEntreprise();
  const conteneur = document.getElementById('liste-missions-publiees');
  if (!conteneur) return;
  if (!verifierDB()) {
    conteneur.innerHTML = '<div style="text-align:center;padding:24px;color:var(--texte-3);">Configure la base de données pour voir tes missions.</div>';
    return;
  }
  if (!utilisateurConnecte) {
    conteneur.innerHTML = '<div style="text-align:center;padding:24px;color:var(--texte-3);">Connecte-toi pour voir tes missions.</div>';
    return;
  }
  const { data: missions, error } = await db
    .from('missions')
    .select('*')
    .eq('user_id', utilisateurConnecte.id)
    .order('created_at', { ascending: false });
  if (error || !missions || missions.length === 0) {
    conteneur.innerHTML = '<div style="text-align:center;padding:24px;color:var(--texte-3);">Aucune mission publiée encore.</div>';
    setText('ent-publiees', 0); setText('ent-candidatures', 0); return;
  }
  const missionIds = missions.map(m => m.id);
  const { data: toutesLescands } = await db.from('candidatures').select('mission_id').in('mission_id', missionIds);
  const compterCands = (id) => (toutesLescands||[]).filter(c => c.mission_id === id).length;
  setText('ent-publiees', missions.length);
  setText('ent-candidatures', (toutesLescands||[]).length);
  const nomEntreprise = profilConnecte?.nom || utilisateurConnecte.email.split('@')[0];
  setText('ent-logo', nomEntreprise.split(' ').map(m=>m[0]).join('').substring(0,2).toUpperCase());
  setText('ent-nom', nomEntreprise);
  conteneur.innerHTML = missions.map(m => {
    const nb = compterCands(m.id);
    return `<div class="mission-publiee">
      <div class="pub-icone" style="background:${escAttr(m.couleur_bg||'#E1F5EE')}">${iconCategorie(m.categorie)}</div>
      <div class="pub-info">
        <div class="pub-titre">${escHtml(m.titre)}</div>
        <div class="pub-meta">${escHtml(m.duree)} · ${nb} candidature(s) · ${nbPlaces(m) - placesRestantes(m)}/${nbPlaces(m)} place(s) pourvue(s)</div>
        <div class="pub-tags"><span class="pub-statut statut-actif">● Active</span><span class="badge badge-vert">${escHtml(m.categorie)}</span></div>
      </div>
      <div class="pub-actions">
        <div class="pub-montant">${fcfa(montantParPersonne(m))}<small> / pers.</small></div>
        <button class="btn-mini" onclick="voirCandidatures(${m.id})">Candidatures (${nb})</button>
        <button class="btn-mini" style="color:#A32D2D;" onclick="supprimerMission(${m.id})">Supprimer</button>
      </div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════
   CANDIDATURES REÇUES (côté entreprise)
   ─────────────────────────────────────────
   Lecture autorisée par la policy "candidatures_lecture" (propriétaire
   de la mission) ; le changement de statut par
   "candidatures_maj_par_entreprise_ou_admin". L'étudiant est notifié
   par le trigger notifier_statut_candidature (voir sql/).
══════════════════════════════════════════ */
let missionCandidaturesOuverte = null;

async function voirCandidatures(missionId) {
  if (!verifierDB() || !utilisateurConnecte) return;
  missionCandidaturesOuverte = missionId;
  const modal = document.getElementById('modal-candidatures');
  const liste = document.getElementById('candidatures-recues-liste');
  liste.innerHTML = '<div style="text-align:center;padding:24px;color:var(--texte-3);">Chargement...</div>';
  modal.classList.add('visible');

  const { data: mission } = await db.from('missions').select('titre').eq('id', missionId).maybeSingle();
  setText('candidatures-mission-titre', mission?.titre || '');

  const { data: cands, error } = await db
    .from('candidatures')
    .select('id, user_id, statut, created_at')
    .eq('mission_id', missionId)
    .order('created_at', { ascending: false });
  if (error) { liste.innerHTML = '<div style="text-align:center;padding:24px;color:var(--texte-3);">Impossible de charger les candidatures.</div>'; return; }
  if (!cands || cands.length === 0) {
    liste.innerHTML = `<div style="text-align:center;padding:32px;color:var(--texte-3);"><div style="font-size:36px;margin-bottom:8px;">${icon('inbox')}</div>Aucune candidature pour l'instant.</div>`;
    return;
  }

  const ids = cands.map(c => c.user_id);
  const { data: profils } = await db.from('profils')
    .select('user_id, nom, universite, competences, avatar_url')
    .in('user_id', ids);
  const parUser = Object.fromEntries((profils || []).map(p => [p.user_id, p]));

  liste.innerHTML = cands.map(c => {
    const p = parUser[c.user_id] || {};
    const nom = p.nom || 'Étudiant';
    const ini = nom.split(' ').map(x => x[0]).join('').substring(0,2).toUpperCase();
    const comps = Array.isArray(p.competences) ? p.competences : [];
    const statut = c.statut === 'acceptee'
      ? '<span class="badge badge-vert">Acceptée</span>'
      : c.statut === 'refusee'
      ? '<span class="badge" style="background:#FCEBEB;color:#A32D2D;">Refusée</span>'
      : '<span class="badge badge-amber">En attente</span>';
    const avatarStyle = p.avatar_url
      ? `background-image:url('${cssUrl(p.avatar_url)}');background-size:cover;background-position:center;`
      : '';
    return `<div class="candidat-item">
      <div class="candidat-avatar" style="${avatarStyle}">${p.avatar_url ? '' : escHtml(ini)}</div>
      <div class="candidat-info">
        <div class="candidat-nom">${escHtml(nom)} ${statut}</div>
        <div class="candidat-meta">${escHtml(p.universite || '')}${p.universite ? ' · ' : ''}Postulé le ${formatDate(c.created_at)}</div>
        ${comps.length ? `<div class="candidat-comps">${comps.map(x => `<span class="comp-pill">${escHtml(x)}</span>`).join('')}</div>` : ''}
        ${c.statut === 'en_attente' ? `<div class="candidat-actions">
          <button class="btn btn-vert" onclick="changerStatutCandidature(${c.id}, 'acceptee')">Accepter</button>
          <button class="btn btn-blanc" style="color:#A32D2D;" onclick="changerStatutCandidature(${c.id}, 'refusee')">Refuser</button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function fermerCandidatures() {
  document.getElementById('modal-candidatures').classList.remove('visible');
  missionCandidaturesOuverte = null;
}

async function changerStatutCandidature(candidatureId, statut) {
  if (!verifierDB()) return;
  if (statut === 'refusee' && !confirm('Refuser cette candidature ? L\'étudiant sera prévenu.')) return;
  const { error } = await db.from('candidatures').update({ statut }).eq('id', candidatureId);
  if (error) { afficherToast('error', 'Erreur : ' + error.message, 'rouge'); return; }
  afficherToast(statut === 'acceptee' ? 'check' : 'info',
    statut === 'acceptee' ? 'Candidature acceptée — l\'étudiant est prévenu' : 'Candidature refusée', statut === 'acceptee' ? 'vert' : '');
  if (missionCandidaturesOuverte) await voirCandidatures(missionCandidaturesOuverte);
  chargerMissionsEntreprise();
  chargerMissions();
}

async function supprimerMission(id) {
  if (!verifierDB() || !utilisateurConnecte) return;
  if (!confirm('Supprimer cette mission ? Cette action est irréversible.')) return;
  const { error } = await db.from('missions').delete().eq('id', id).eq('user_id', utilisateurConnecte.id);
  if (!error) { afficherToast('trash','Mission supprimée','rouge'); await chargerMissions(); await chargerMissionsEntreprise(); }
  else { afficherToast('error','Erreur lors de la suppression','rouge'); }
}

/* ══════════════════════════════════════════
   PANNEAU ADMIN
   ─────────────────────────────────────────
   L'accès n'est plus protégé par un mot de passe
   côté client : il dépend de profilConnecte.type === 'admin'
   (voir estAdmin()) et des policies RLS Supabase, qui sont
   la seule barrière fiable. Pour promouvoir un compte en
   admin : exécuter dans Supabase SQL Editor
     update profils set type = 'admin' where user_id = '<uuid>';
══════════════════════════════════════════ */
async function ouvrirAdmin() {
  if (!estAdmin()) {
    afficherToast('error','Accès réservé aux administrateurs','rouge');
    return;
  }
  allerVers('admin');
  setText('admin-nom-affiche', profilConnecte?.nom || 'Administrateur');
  await chargerDonneesAdmin();
}

function deconnecterAdmin() { allerVers('accueil'); }

function changerPanneau(nom, bouton) {
  document.querySelectorAll('.admin-panneau').forEach(p => p.classList.remove('actif'));
  document.querySelectorAll('.admin-menu-item').forEach(b => b.classList.remove('actif'));
  const panneau = document.getElementById('admin-' + nom);
  if (panneau) panneau.classList.add('actif');
  if (bouton) bouton.classList.add('actif');
}

async function chargerDonneesAdmin() {
  if (!verifierDB()) {
    ['adm-etudiants','adm-entreprises','adm-missions','adm-candidatures'].forEach(id => setText(id,'—'));
    return;
  }
  const [r1, r2, r3, r4] = await Promise.all([
    db.from('profils').select('id', { count: 'exact', head: true }).eq('type', 'etudiant'),
    db.from('profils').select('id', { count: 'exact', head: true }).eq('type', 'entreprise'),
    db.from('missions').select('id', { count: 'exact', head: true }).eq('actif', true),
    db.from('candidatures').select('id', { count: 'exact', head: true })
  ]);
  setText('adm-etudiants',    r1.count||0);
  setText('adm-entreprises',  r2.count||0);
  setText('adm-missions',     r3.count||0);
  setText('adm-candidatures', r4.count||0);
  const { data: users } = await db.from('profils').select('id, user_id, nom, type, universite, created_at').order('created_at', { ascending: false }).limit(200);
  const tbody = document.getElementById('admin-users-recents');
  if (tbody && users) {
    tbody.innerHTML = users.slice(0,5).map(u => {
      const ini = (u.nom||'?').split(' ').map(m=>m[0]).join('').substring(0,2).toUpperCase();
      return `<tr><td><div class="user-cell"><div class="user-avatar-mini" style="background:var(--vert-clair);color:var(--vert-fonce)">${ini}</div><div><div class="user-nom-mini">${escHtml(u.nom||'—')}</div></div></div></td><td><span class="badge badge-${badgeType(u.type)}">${labelType(u.type)}</span></td><td>${formatDate(u.created_at)}</td><td><span class="statut-pill pill-actif">● Actif</span></td></tr>`;
    }).join('');
  }
  const tablU = document.getElementById('table-users');
  const nbUsersEl = document.getElementById('admin-nb-users');
  if (tablU && users) {
    if (nbUsersEl) nbUsersEl.textContent = users.length + ' comptes';
    tablU.dataset.charge = '1';
    tablU.innerHTML = users.map(u => {
      const ini = (u.nom||'?').split(' ').map(m=>m[0]).join('').substring(0,2).toUpperCase();
      const moi = u.user_id === utilisateurConnecte?.id;
      const options = ['etudiant','entreprise','admin'].map(t => `<option value="${t}"${u.type === t ? ' selected' : ''}>${labelType(t)}</option>`).join('');
      return `<tr><td><div class="user-cell"><div class="user-avatar-mini" style="background:var(--vert-clair);color:var(--vert-fonce)">${escHtml(ini)}</div><div><div class="user-nom-mini">${escHtml(u.nom||'—')}${moi ? ' <small>(toi)</small>' : ''}</div><div class="user-email-mini">ID: ${u.user_id?u.user_id.substring(0,8):'—'}</div></div></div></td><td><span class="badge badge-${badgeType(u.type)}">${labelType(u.type)}</span></td><td>${escHtml(u.universite||'—')}</td><td>${formatDate(u.created_at)}</td><td><select class="admin-select-type" ${moi ? 'disabled title="Tu ne peux pas changer ton propre rôle ici"' : ''} onchange="changerTypeUtilisateur('${escAttr(u.user_id)}', this)">${options}</select></td></tr>`;
    }).join('');
  }
  const { data: missionsList } = await db.from('missions').select('*').order('created_at', { ascending: false }).limit(200);
  const tablM   = document.getElementById('table-missions-admin');
  const nbMissEl = document.getElementById('admin-nb-missions');
  if (tablM && missionsList) {
    if (nbMissEl) nbMissEl.textContent = missionsList.length + ' offres';
    tablM.innerHTML = missionsList.map(m => `<tr${m.actif ? '' : ' class="ligne-masquee"'}><td><strong>${escHtml(m.titre)}</strong>${m.actif ? '' : ' <span class="badge" style="background:#FCEBEB;color:#A32D2D;">Masquée</span>'}<div class="user-email-mini">${nbPlaces(m) - placesRestantes(m)}/${nbPlaces(m)} place(s) pourvue(s)</div></td><td>${escHtml(m.entreprise)}</td><td style="color:var(--vert);font-weight:600;">${fcfa(montantParPersonne(m))}<small style="color:var(--texte-3);font-weight:400;"> / pers.</small></td><td><span class="badge badge-vert">${escHtml(m.categorie)}</span></td><td>${formatDate(m.created_at)}</td><td><div class="action-btns"><button class="btn-action" onclick="basculerMissionActive(${m.id}, ${m.actif ? 'false' : 'true'})">${m.actif ? 'Masquer' : 'Réafficher'}</button><button class="btn-action danger" onclick="supprimerMissionAdmin(${m.id})">Supprimer</button></div></td></tr>`).join('');
  }
}

async function changerTypeUtilisateur(userId, select) {
  if (!verifierDB() || !estAdmin()) return;
  const type = select.value;
  const libelle = labelType(type);
  if (!confirm(`Passer ce compte en « ${libelle} » ?` + (type === 'admin' ? '\n\n⚠️ Il aura accès à toute l\'administration.' : ''))) {
    await chargerDonneesAdmin(); return;
  }
  const { error } = await db.from('profils').update({ type }).eq('user_id', userId);
  if (error) { afficherToast('error', 'Erreur : ' + error.message, 'rouge'); await chargerDonneesAdmin(); return; }
  afficherToast('check', 'Compte passé en ' + libelle, 'vert');
  await chargerDonneesAdmin();
}

async function basculerMissionActive(id, actif) {
  if (!verifierDB() || !estAdmin()) return;
  const { error } = await db.from('missions').update({ actif }).eq('id', id);
  if (error) { afficherToast('error', 'Erreur : ' + error.message, 'rouge'); return; }
  afficherToast(actif ? 'eye' : 'info', actif ? 'Offre de nouveau visible' : 'Offre masquée du public', actif ? 'vert' : '');
  await chargerDonneesAdmin();
  await chargerMissions();
}

async function supprimerMissionAdmin(id) {
  if (!verifierDB()) return;
  if (!confirm('Supprimer cette mission ?')) return;
  const { error } = await db.from('missions').delete().eq('id', id);
  if (!error) { afficherToast('trash','Mission supprimée','rouge'); await chargerDonneesAdmin(); await chargerMissions(); }
  else { afficherToast('error','Erreur : ' + error.message,'rouge'); }
}

/* ══════════════════════════════════════════
   FORMULAIRE ENTREPRISE — HELPERS
══════════════════════════════════════════ */
function ajouterCompetence(event) {
  // Voir la note sur ajouterCompetenceProfil : le bouton "+ Ajouter"
  // (ajouterCompetenceDepuisInput) est le chemin fiable sur mobile.
  if (event.key !== 'Enter') return;
  event.preventDefault();
  ajouterCompetenceDepuisInput();
}
function ajouterCompetenceDepuisInput() {
  const input = document.getElementById('champ-competence-input');
  const val = input.value.trim();
  if (!val || competencesSaisies.includes(val)) { input.value = ''; return; }
  if (competencesSaisies.length >= 6) { afficherToast('warning','Maximum 6 compétences',''); return; }
  competencesSaisies.push(val);
  input.value = '';
  afficherChips();
}
function supprimerCompetence(i) { competencesSaisies.splice(i,1); afficherChips(); }
function afficherChips() {
  const c = document.getElementById('chips-competences');
  if (c) c.innerHTML = competencesSaisies.map((comp,i) =>
    `<span class="chip">${escHtml(comp)} <span class="chip-suppr" onclick="supprimerCompetence(${i})">×</span></span>`
  ).join('');
}
function reinitialiserFormulaire() {
  ['champ-titre','champ-description','champ-montant'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  const placesEl = document.getElementById('champ-places'); if (placesEl) placesEl.value = '1';
  majTotalOffre();
  fichierCouverture = null;
  const couv = document.getElementById('champ-couverture'); if (couv) couv.value = '';
  const apercu = document.getElementById('couverture-apercu'); if (apercu) { apercu.src = ''; apercu.style.display = 'none'; }
  const couvTxt = document.getElementById('couverture-texte'); if (couvTxt) couvTxt.innerHTML = `${icon('camera')} Ajouter une image (JPG/PNG, 3 Mo max)`;
  const catEl = document.getElementById('champ-categorie'); if(catEl) catEl.value='';
  const compEl = document.getElementById('champ-competence-input'); if(compEl) compEl.value='';
  competencesSaisies = [];
  afficherChips();
  document.getElementById('succes-publication').classList.remove('visible');
  const fa = document.querySelector('.form-actions'); if(fa) fa.style.display = 'flex';
}

/* ══════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════ */
const PAGES = ['accueil','missions','profil','entreprise','notifications','admin'];

// Chaque page a son adresse (#/missions, #/profil...) : le bouton
// "Retour" du téléphone revient à la page précédente au lieu de
// quitter l'application, et on peut partager/ouvrir un lien direct.
function pageDepuisHash() {
  const m = location.hash.match(/^#\/([a-z]+)/);
  return m && PAGES.includes(m[1]) ? m[1] : null;
}
window.addEventListener('popstate', () => {
  fermerModalesOuvertes();
  allerVers(pageDepuisHash() || 'accueil', { historique: false });
});

function fermerModalesOuvertes() {
  document.querySelectorAll('.admin-overlay.visible, .modal-overlay.visible')
    .forEach(el => el.classList.remove('visible'));
}

function allerVers(nomPage, options = {}) {
  fermerMobileMenu();
  if (nomPage === 'admin' && !estAdmin()) {
    afficherToast('error','Accès réservé aux administrateurs','rouge');
    nomPage = 'accueil';
  }
  if (options.historique !== false && pageDepuisHash() !== nomPage
      && !(nomPage === 'accueil' && !location.hash)) {
    history.pushState(null, '', '#/' + nomPage);
  }
  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.classList.toggle('actif', btn.getAttribute('data-page') === nomPage);
  });
  PAGES.forEach(p => { const el = document.getElementById('page-' + p); if (el) el.classList.remove('active'); });
  const cible = document.getElementById('page-' + nomPage);
  if (cible) cible.classList.add('active');
  document.querySelectorAll('.nav-lien').forEach(btn => {
    const oc = btn.getAttribute('onclick') || '';
    btn.classList.toggle('actif', oc.includes("'" + nomPage + "'"));
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (nomPage === 'missions')      chargerMissions();
  if (nomPage === 'notifications') chargerNotifications();
  if (nomPage === 'profil')        mettreAJourProfil();
  if (nomPage === 'entreprise')    chargerMissionsEntreprise();
}

/* ══════════════════════════════════════════
   AUTH MODAL
══════════════════════════════════════════ */
function ouvrirAuth(onglet) {
  if (!verifierDB()) return;
  document.getElementById('modal-auth').classList.add('visible');
  const msg = document.getElementById('auth-message');
  if (msg) msg.style.display = 'none';
  basculerAuth(onglet || 'connexion');
}
function fermerAuth() { document.getElementById('modal-auth').classList.remove('visible'); }
document.getElementById('modal-auth').addEventListener('click', e => { if (e.target === e.currentTarget) fermerAuth(); });
function basculerAuth(onglet) {
  const msgAuth = document.getElementById('auth-message');
  if (msgAuth) msgAuth.style.display = 'none';
  const estCx = onglet === 'connexion';
  const estOk = onglet === 'inscription-ok';
  document.getElementById('form-connexion').style.display  = estCx ? 'block' : 'none';
  document.getElementById('form-inscription').style.display = !estCx && !estOk ? 'block' : 'none';
  document.getElementById('form-inscription-ok').style.display = estOk ? 'block' : 'none';
  const oauth = document.getElementById('auth-oauth');
  if (oauth) oauth.classList.toggle('masque-temporaire', estOk);
  const tabCx  = document.getElementById('tab-connexion');
  const tabIns = document.getElementById('tab-inscription');
  tabCx.style.color = estCx ? 'var(--vert)' : 'var(--texte-3)';
  tabCx.style.borderBottom = estCx ? '2px solid var(--vert)' : '2px solid transparent';
  tabIns.style.color = estCx ? 'var(--texte-3)' : 'var(--vert)';
  tabIns.style.borderBottom = estCx ? '2px solid transparent' : '2px solid var(--vert)';
}
// Ajoute un bouton sous le message d'erreur (ex : renvoyer l'e-mail).
function afficherActionAuth(libelle, action) {
  const el = document.getElementById('auth-message');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'auth-message-action';
  btn.textContent = libelle;
  btn.onclick = action;
  el.appendChild(document.createElement('br'));
  el.appendChild(btn);
}

function afficherMsgAuth(texte, type) {
  const el = document.getElementById('auth-message');
  el.textContent = texte;
  el.style.display = 'block';
  if (type === 'erreur') { el.style.background='#FCEBEB'; el.style.color='#A32D2D'; el.style.border='1px solid #F09595'; }
  else { el.style.background='var(--vert-clair)'; el.style.color='var(--vert-fonce)'; el.style.border='1px solid var(--vert)'; }
}

/* ══════════════════════════════════════════
   ONGLETS PROFIL & NOTIFS
══════════════════════════════════════════ */
function changerOnglet(nom, bouton) {
  document.querySelectorAll('.panneau-profil').forEach(p => p.classList.remove('actif'));
  document.querySelectorAll('.onglet-profil').forEach(b => b.classList.remove('actif'));
  const p = document.getElementById('panneau-' + nom);
  if (p) p.classList.add('actif');
  if (bouton) bouton.classList.add('actif');
}
function filtrerNotifs(btn) {
  document.querySelectorAll('.notif-filtres .filtre-btn').forEach(b => b.classList.remove('actif'));
  btn.classList.add('actif');
  filtreCourantNotif = btn.getAttribute('data-filtre');
  chargerNotifications();
}

/* ══════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════ */
// Affiche une photo de profil (si avatar_url est défini) ou les initiales en repli.
function appliquerAvatarVisuel(el, url, initiales) {
  if (!el) return;
  if (url) {
    el.style.backgroundImage = `url('${cssUrl(url)}')`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.textContent = '';
  } else {
    el.style.backgroundImage = '';
    el.textContent = initiales;
  }
}

function mettreAJourNavbar() {
  const btnCx      = document.getElementById('btn-cx');
  const btnIns     = document.getElementById('btn-ins');
  const avatarWrap = document.getElementById('avatar-nav-wrap');
  const avatar     = document.getElementById('avatar-nav');
  const btnAdmin   = document.getElementById('nav-lien-admin');
  if (utilisateurConnecte) {
    if (btnCx)  btnCx.style.display  = 'none';
    if (btnIns) btnIns.style.display = 'none';
    if (avatarWrap) avatarWrap.style.display = 'block';
    if (avatar) {
      const nom = profilConnecte?.nom || utilisateurConnecte.email;
      const ini = nom.split(' ').map(m=>m[0]).join('').substring(0,2).toUpperCase();
      appliquerAvatarVisuel(avatar, profilConnecte?.avatar_url, ini);
      avatar.title = nom;
    }
  } else {
    if (btnCx)  btnCx.style.display  = 'inline-flex';
    if (btnIns) btnIns.style.display = 'inline-flex';
    if (avatarWrap) avatarWrap.style.display = 'none';
    fermerAvatarMenu();
  }
  // Le lien Admin n'apparaît que pour un profil de type 'admin'.
  // Rappel : ceci est un confort d'UI, pas une protection — la
  // vraie barrière est la policy RLS côté Supabase.
  if (btnAdmin) btnAdmin.style.display = estAdmin() ? 'inline-flex' : 'none';
  const dropAdmin = document.getElementById('dropdown-admin');
  if (dropAdmin) dropAdmin.style.display = estAdmin() ? '' : 'none';
  majAccesEntreprise();
}

function toggleAvatarMenu(event) {
  if (event) event.stopPropagation();
  document.getElementById('avatar-dropdown')?.classList.toggle('visible');
}
function fermerAvatarMenu() {
  document.getElementById('avatar-dropdown')?.classList.remove('visible');
}
document.addEventListener('click', fermerAvatarMenu);

// Fermer les fenêtres en touchant le fond sombre.
['modal-candidatures', 'modal-installation', 'modal-offre'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('visible'); });
});

function toggleMobileMenu(event) {
  if (event) event.stopPropagation();
  document.querySelector('.navbar')?.classList.toggle('mobile-ouvert');
}
function fermerMobileMenu() {
  document.querySelector('.navbar')?.classList.remove('mobile-ouvert');
}
document.addEventListener('click', (e) => {
  const navbar = document.querySelector('.navbar');
  if (navbar && navbar.classList.contains('mobile-ouvert') && !navbar.contains(e.target)) {
    fermerMobileMenu();
  }
});

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function afficherToast(icone, texte, couleur) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.classList.remove('vert','rouge');
  if (couleur) toast.classList.add(couleur);
  document.getElementById('toast-icone').innerHTML = ICONS[icone] || '';
  document.getElementById('toast-texte').textContent = texte;
  toast.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}

/* ══════════════════════════════════════════
   UTILITAIRES
══════════════════════════════════════════ */
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function setBtnLoading(id, loading, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? `<span class="spinner"></span>${label}` : label;
}

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'}); }
  catch { return iso; }
}

// Protection XSS
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
// Rend une URL sûre à placer dans url('...') en CSS (évite qu'une URL
// piégée ne ferme la chaîne et injecte du style/HTML).
function cssUrl(url) {
  if (!url) return '';
  return String(url).replace(/["'()\\\s<>]/g,
    c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
}
function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function tradErreur(msg) {
  if (!msg) return 'Erreur inconnue';
  if (msg.includes('Invalid login')) return 'E-mail ou mot de passe incorrect. Vérifie les majuscules du mot de passe (touche l\'œil pour l\'afficher). Si tu t\'es inscrit avec Google, utilise le bouton Google.';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'Cet email est déjà utilisé. Connecte-toi !';
  if (msg.includes('Password should be')) return 'Le mot de passe doit faire au moins 6 caractères.';
  if (msg.includes('Unable to validate email')) return 'Adresse email invalide.';
  if (msg.includes('Email not confirmed')) return 'Confirme ton email avant de te connecter.';
  if (msg.includes('rate limit')) return 'Trop de tentatives ou d\'e-mails envoyés. Réessaie dans une heure.';
  if (msg.includes('provider is not enabled') || msg.includes('Unsupported provider')) return 'Ce mode de connexion n\'est pas encore activé sur TalentCI.';
  if (msg.includes('Error sending') || msg.includes('sending confirmation') || msg.includes('sending recovery')) return 'L\'e-mail n\'a pas pu être envoyé. Réessaie plus tard ou utilise Google.';
  if (msg.includes('expired') || msg.includes('otp_expired')) return 'Le lien a expiré. Demande un nouvel e-mail.';
  if (msg.includes('Signups not allowed')) return 'Les inscriptions sont fermées pour le moment.';
  if (msg.includes('Délai dépassé') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) return 'Le serveur ne répond pas. Vérifie ta connexion Internet et réessaie.';
  if (msg.includes('not authorized') || msg.includes('Email address not authorized')) return 'L\'e-mail de confirmation n\'a pas pu être envoyé à cette adresse. Utilise Google ou contacte TalentCI.';
  if (msg.includes('User already registered')) return 'Cet email est déjà utilisé. Connecte-toi !';
  return msg;
}

/* TalentCI — modules/pwa.js
   Application installable (PWA) : service worker, bouton / bannière d'installation. */

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

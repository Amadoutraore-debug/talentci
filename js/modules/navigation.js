/* TalentCI — modules/navigation.js
   Navigation entre les pages (#/page, bouton Retour), barre de navigation, menus. */

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
    // Le CV obligatoire ne se ferme pas avec le bouton Retour.
    .forEach(el => { if (!(el.id === 'modal-edit-profil' && cvObligatoireOuvert)) el.classList.remove('visible'); });
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
['modal-candidatures', 'modal-installation', 'modal-offre', 'modal-piece'].forEach(id => {
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

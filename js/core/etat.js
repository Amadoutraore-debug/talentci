/* TalentCI — core/etat.js
   État global partagé par tous les modules (utilisateur connecté, profil, offres chargées...). */

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

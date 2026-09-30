/* TalentCI — modules/profil.js
   Profil : édition (photo, compétences, type de compte), page « Mon profil », onglets. */

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
      ? 'Changement de type refusé : exécute sql/installation.sql dans Supabase.'
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

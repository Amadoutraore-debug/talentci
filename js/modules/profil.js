/* TalentCI — modules/profil.js
   Profil : mini-CV obligatoire (identité, parcours, compétences, téléphone,
   pièce d'identité), page « Mon profil », onglets. */

/* ══════════════════════════════════════════
   MINI-CV OBLIGATOIRE
   ─────────────────────────────────────────
   CV public dans `profils` ; téléphone (`coordonnees`) et pièce
   d'identité (`pieces_identite` + bucket privé "pieces") dans des
   tables protégées. La même règle "profil complet" est appliquée
   côté serveur (profil_est_complet dans sql/installation.sql) : ici,
   c'est seulement pour guider l'utilisateur.
══════════════════════════════════════════ */
let fichierAvatarSelectionne = null;
let fichierPiece = null;
let donneesPrivees = { telephone: '', piece: null };
let cvDisponible = true;   // false si la base n'a pas encore les tables du CV
let cvObligatoireOuvert = false;

async function chargerDonneesPrivees() {
  donneesPrivees = { telephone: '', piece: null };
  if (!dbPret || !db || !utilisateurConnecte) return;
  const uid = utilisateurConnecte.id;
  const [c, p] = await Promise.all([
    db.from('coordonnees').select('telephone').eq('user_id', uid).maybeSingle(),
    db.from('pieces_identite').select('type_piece, numero, chemin, statut, motif_refus').eq('user_id', uid).maybeSingle()
  ]);
  // Tables absentes : sql/installation.sql pas encore exécuté → on
  // n'impose pas le CV (sinon personne ne pourrait plus rien faire).
  const tableAbsente = r => r.error && /does not exist|schema cache|relation/i.test(r.error.message);
  if (tableAbsente(c) || tableAbsente(p)) { cvDisponible = false; return; }
  cvDisponible = true;
  donneesPrivees.telephone = c.data?.telephone || '';
  donneesPrivees.piece = p.data || null;
}

function chiffres(t) { return String(t || '').replace(/\D/g, ''); }

// Liste des éléments manquants (vide = profil complet). Même règle que
// profil_est_complet() côté serveur.
function elementsManquantsProfil(p, priv) {
  if (!p) return ['profil'];
  const manque = [];
  const t = s => String(s || '').trim();
  if (t(p.nom).length < 2) manque.push('nom');
  if (t(p.ville).length < 2) manque.push('ville');
  if (t(p.specialite).length < 2) manque.push(p.type === 'entreprise' ? "secteur d'activité" : 'spécialité');
  if (t(p.bio).length < 40) manque.push('présentation (40 caractères minimum)');
  if (p.type === 'etudiant') {
    if (t(p.parcours).length < 10) manque.push('formation et expériences');
    if (!Array.isArray(p.competences) || p.competences.length < 1) manque.push('au moins une compétence');
  }
  if (chiffres(priv?.telephone).length < 8) manque.push('téléphone');
  if (!priv?.piece) manque.push("pièce d'identité (type, numéro et photo)");
  return manque;
}

function profilEstComplet() {
  if (!cvDisponible || estAdmin()) return true;
  return elementsManquantsProfil(profilConnecte, donneesPrivees).length === 0;
}

// Appelé à chaque affichage du profil : ouvre le CV en mode obligatoire
// tant qu'il n'est pas complet.
async function exigerProfilComplet() {
  if (!utilisateurConnecte || !profilConnecte || estAdmin() || cvObligatoireOuvert) return;
  await chargerDonneesPrivees();
  if (!profilEstComplet()) ouvrirEditProfil({ obligatoire: true });
}

// Adapte les libellés : un étudiant présente son parcours, une
// entreprise son activité.
function majLibellesProfil(type) {
  const ent = type === 'entreprise';
  setText('lbl-section-cv', ent ? 'Mon entreprise' : 'Mon profil professionnel');
  setText('lbl-specialite', ent ? "Secteur d'activité" : 'Spécialité / domaine');
  setText('lbl-bio', ent ? 'Présente ton entreprise' : 'Présente-toi');
  document.getElementById('lbl-nom').innerHTML = (ent ? "Nom de l'entreprise" : 'Nom complet') + ' <span class="requis">*</span>';
  document.getElementById('edit-specialite').placeholder = ent
    ? 'ex : Commerce, Restauration, Informatique...'
    : 'ex : Design graphique, Développement web, Comptabilité...';
  document.getElementById('edit-bio').placeholder = ent
    ? 'Votre activité, vos clients, les profils que vous recherchez... (40 caractères minimum)'
    : 'Qui es-tu, ce que tu sais faire, ce que tu recherches... (40 caractères minimum)';
  const afficher = (id, oui) => { const el = document.getElementById(id); if (el) el.style.display = oui ? '' : 'none'; };
  afficher('edit-univ-wrap', !ent);
  afficher('requis-parcours', !ent);
  afficher('requis-competences', !ent);
}

function majCompteur(idChamp, idCompteur, min) {
  const n = (document.getElementById(idChamp).value || '').trim().length;
  const el = document.getElementById(idCompteur);
  if (!el) return;
  el.textContent = n >= min ? `${n} caractères ✓` : `${n} / ${min} caractères minimum`;
  el.style.color = n >= min ? 'var(--vert-fonce)' : '';
}

function choisirPhotoPiece(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { afficherToast('warning','Choisis une photo (JPG, PNG...)','rouge'); event.target.value=''; return; }
  if (file.size > 5 * 1024 * 1024) { afficherToast('warning','Photo trop lourde (max 5 Mo)','rouge'); event.target.value=''; return; }
  fichierPiece = file;
  const img = document.getElementById('edit-piece-apercu');
  img.src = URL.createObjectURL(file); img.style.display = 'block';
  document.getElementById('edit-piece-texte').innerHTML = `${icon('camera')} Changer la photo`;
}

function texteStatutPiece(piece) {
  if (!piece) return '';
  if (piece.statut === 'verifiee') return '✓ Pièce vérifiée par TalentCI.';
  if (piece.statut === 'refusee') return '✗ Pièce refusée' + (piece.motif_refus ? ' : ' + piece.motif_refus : '') + '. Envoie une nouvelle photo.';
  return 'Pièce reçue — en attente de vérification par TalentCI. Tu peux déjà utiliser la plateforme.';
}

/* ══════════════════════════════════════════
   ÉDITION DU PROFIL (fenêtre « Mon mini-CV »)
══════════════════════════════════════════ */
async function ouvrirEditProfil(options = {}) {
  if (!utilisateurConnecte) return;
  if (!profilConnecte) profilConnecte = await chargerProfil(utilisateurConnecte.id);
  if (!profilConnecte) { afficherToast('error', 'Profil introuvable — réessaie dans un instant', 'rouge'); return; }
  await chargerDonneesPrivees();
  const p = profilConnecte;
  const obligatoire = !!options.obligatoire && !estAdmin();
  cvObligatoireOuvert = obligatoire;

  const val = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  val('edit-nom', p.nom); val('edit-univ', p.universite); val('edit-ville', p.ville);
  val('edit-specialite', p.specialite); val('edit-bio', p.bio); val('edit-parcours', p.parcours);
  val('edit-lien', p.lien); val('edit-telephone', donneesPrivees.telephone);
  val('edit-piece-type', donneesPrivees.piece?.type_piece); val('edit-piece-numero', donneesPrivees.piece?.numero);
  majCompteur('edit-bio', 'compteur-bio', 40);

  // Étudiant ↔ Entreprise : modifiable par l'utilisateur (utile pour les
  // comptes Google, créés "Étudiant" par défaut). Le rôle admin, lui, ne
  // se gère que depuis le panneau d'administration.
  const wrapType = document.getElementById('edit-type-wrap');
  if (wrapType) wrapType.style.display = p.type === 'admin' ? 'none' : 'block';
  const selType = document.getElementById('edit-type');
  if (selType && p.type !== 'admin') selType.value = p.type;
  majLibellesProfil(p.type === 'admin' ? 'entreprise' : p.type);

  competencesEditProfil = Array.isArray(p.competences) ? [...p.competences] : [];
  afficherChipsEditProfil();

  fichierPiece = null;
  const pieceImg = document.getElementById('edit-piece-apercu');
  pieceImg.src = ''; pieceImg.style.display = 'none';
  document.getElementById('edit-piece-fichier').value = '';
  document.getElementById('edit-piece-texte').innerHTML = donneesPrivees.piece
    ? `${icon('camera')} Photo déjà envoyée — toucher pour la remplacer`
    : `${icon('camera')} Prendre ou choisir une photo (5 Mo max)`;
  setText('edit-piece-statut', texteStatutPiece(donneesPrivees.piece));

  document.getElementById('edit-obligatoire').style.display = obligatoire ? 'block' : 'none';
  document.getElementById('btn-annuler-profil').style.display = obligatoire ? 'none' : '';
  document.getElementById('btn-deconnexion-profil').style.display = obligatoire ? '' : 'none';
  setText('edit-titre', obligatoire ? 'Complète ton profil' : 'Mon mini-CV');

  fichierAvatarSelectionne = null;
  const preview = document.getElementById('edit-avatar-preview');
  const placeholder = document.getElementById('edit-avatar-placeholder');
  if (p.avatar_url) {
    if (preview) { preview.src = p.avatar_url; preview.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
  } else {
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    if (placeholder) {
      placeholder.style.display = 'flex';
      const nom = p.nom || '';
      placeholder.textContent = nom.split(' ').map(m=>m[0]).join('').substring(0,2).toUpperCase() || '?';
    }
  }

  document.getElementById('modal-edit-profil').classList.add('visible');
}

// En mode obligatoire, la fenêtre ne se ferme pas (sauf déconnexion).
function fermerEditProfil(force) {
  if (cvObligatoireOuvert && !force) return;
  cvObligatoireOuvert = false;
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
  // Compétence tapée mais pas encore ajoutée : on l'ajoute (oubli fréquent sur mobile)
  if ((document.getElementById('edit-competence-input')?.value || '').trim()) ajouterCompetenceProfilDepuisInput();

  const v = id => (document.getElementById(id)?.value || '').trim();
  const typeChoisi = v('edit-type');
  const nouveauType = profilConnecte?.type === 'admin' ? 'admin'
    : (typeChoisi === 'entreprise' || typeChoisi === 'etudiant' ? typeChoisi : profilConnecte?.type);

  const brouillon = {
    nom: v('edit-nom'), ville: v('edit-ville'), specialite: v('edit-specialite'),
    bio: v('edit-bio'), parcours: v('edit-parcours'), lien: v('edit-lien'),
    type: nouveauType, competences: competencesEditProfil
  };
  const telephone = v('edit-telephone');
  const pieceType = v('edit-piece-type');
  const pieceNumero = v('edit-piece-numero');
  const pieceExistante = donneesPrivees.piece;

  // Contrôles (admins dispensés du CV complet)
  if (!brouillon.nom) { afficherToast('warning', 'Le nom est obligatoire', 'rouge'); return; }
  if (nouveauType !== 'admin' && cvDisponible) {
    const pieceOk = pieceType && pieceNumero.length >= 4 && (fichierPiece || pieceExistante?.chemin);
    const manque = elementsManquantsProfil(brouillon, { telephone, piece: pieceOk ? {} : null });
    if (manque.length) { afficherToast('warning', 'À compléter : ' + manque.join(', '), 'rouge'); return; }
  }
  if (brouillon.lien && !/^https?:\/\//i.test(brouillon.lien)) brouillon.lien = 'https://' + brouillon.lien;

  setBtnLoading('btn-enregistrer-profil', true, 'Enregistrement...');
  const echec = (msg) => { setBtnLoading('btn-enregistrer-profil', false, 'Enregistrer mon profil →'); afficherToast('error', msg, 'rouge'); };
  const uid = utilisateurConnecte.id;

  // Photo de profil (publique)
  let avatarUrl = profilConnecte?.avatar_url || null;
  if (fichierAvatarSelectionne) {
    const ext = (fichierAvatarSelectionne.name.split('.').pop() || 'jpg').toLowerCase();
    const chemin = `${uid}/avatar.${ext}`;
    const { error: uploadErr } = await db.storage.from('avatars')
      .upload(chemin, fichierAvatarSelectionne, { upsert: true, cacheControl: '3600' });
    if (uploadErr) return echec('Erreur photo : ' + uploadErr.message);
    const { data: urlData } = db.storage.from('avatars').getPublicUrl(chemin);
    avatarUrl = urlData.publicUrl + '?t=' + Date.now(); // cache-busting : même chemin réutilisé à chaque changement
  }

  // CV public
  const maj = {
    nom: brouillon.nom, ville: brouillon.ville, specialite: brouillon.specialite,
    bio: brouillon.bio, parcours: brouillon.parcours, lien: brouillon.lien,
    competences: competencesEditProfil, avatar_url: avatarUrl,
    universite: nouveauType === 'etudiant' ? v('edit-univ') : ''
  };
  if (nouveauType !== profilConnecte?.type) maj.type = nouveauType;
  const { error } = await db.from('profils').update(maj).eq('user_id', uid);
  if (error) {
    return echec(/type de compte/i.test(error.message) || /column/i.test(error.message)
      ? 'La base doit être mise à jour : exécute sql/installation.sql dans Supabase.'
      : 'Erreur : ' + error.message);
  }

  // Téléphone (privé)
  if (telephone && telephone !== donneesPrivees.telephone) {
    const { error: e } = await db.from('coordonnees').upsert({ user_id: uid, telephone, updated_at: new Date().toISOString() });
    if (e) return echec('Erreur téléphone : ' + tradErreur(e.message));
  }

  // Pièce d'identité (privée) : fichier dans le bucket privé "pieces"
  const pieceModifiee = fichierPiece || !pieceExistante
    || pieceType !== pieceExistante.type_piece || pieceNumero !== pieceExistante.numero;
  if (pieceType && pieceNumero && pieceModifiee) {
    let chemin = pieceExistante?.chemin || null;
    if (fichierPiece) {
      const ext = (fichierPiece.name.split('.').pop() || 'jpg').toLowerCase();
      chemin = `${uid}/piece-${Date.now()}.${ext}`;
      const { error: upErr } = await db.storage.from('pieces').upload(chemin, fichierPiece, { upsert: false });
      if (upErr) return echec('Erreur envoi de la pièce : ' + upErr.message);
    }
    if (chemin) {
      const { error: e } = await db.from('pieces_identite').upsert({ user_id: uid, type_piece: pieceType, numero: pieceNumero, chemin });
      if (e) return echec('Erreur pièce : ' + tradErreur(e.message));
    }
  }

  setBtnLoading('btn-enregistrer-profil', false, 'Enregistrer mon profil →');
  fichierAvatarSelectionne = null; fichierPiece = null;
  profilConnecte = await chargerProfil(uid);
  await chargerDonneesPrivees();
  fermerEditProfil(true);
  mettreAJourNavbar();
  await mettreAJourProfil();
  afficherToast('check', 'Profil enregistré !', 'vert');
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

  const verifEl = document.getElementById('profil-verif');
  if (verifEl) verifEl.innerHTML = p?.verifie ? `<span class="badge-verifie">${icon('check')} Profil vérifié</span>` : '';
  const cvEl = document.getElementById('profil-cv');
  if (cvEl) {
    const lignes = [];
    if (p?.specialite) lignes.push(`<div class="cv-ligne"><small>${p.type === 'entreprise' ? "Secteur d'activité" : 'Spécialité'}</small>${escHtml(p.specialite)}${p.ville ? ' · ' + escHtml(p.ville) : ''}</div>`);
    if (p?.bio) lignes.push(`<div class="cv-ligne"><small>Présentation</small><p>${escHtml(p.bio)}</p></div>`);
    if (p?.parcours) lignes.push(`<div class="cv-ligne"><small>Formation et expériences</small><p>${escHtml(p.parcours)}</p></div>`);
    if (p?.lien) lignes.push(`<div class="cv-ligne"><small>Lien</small><a href="${escAttr(p.lien)}" target="_blank" rel="noopener">${escHtml(p.lien)}</a></div>`);
    cvEl.innerHTML = lignes.length ? lignes.join('')
      : `<p style="font-size:13px;">Ton CV est vide.</p><button class="btn btn-vert" style="margin-top:10px;" onclick="ouvrirEditProfil()">Remplir mon CV →</button>`;
  }

  const compEl = document.getElementById('profil-competences');
  if (compEl) {
    const comps = Array.isArray(p?.competences) ? p.competences : [];
    compEl.innerHTML = comps.length > 0
      ? comps.map(c => `<span class="comp-pill">${escHtml(c)}</span>`).join('')
      : '<span class="comp-pill">Non renseigné</span>';
  }

  // Un compte Entreprise n'a pas de candidatures à suivre ici.
  const estEnt = p?.type === 'entreprise';
  const zoneEnt = document.getElementById('profil-zone-entreprise');
  const zoneEtu = document.getElementById('profil-zone-etudiant');
  if (zoneEnt) zoneEnt.style.display = estEnt ? '' : 'none';
  if (zoneEtu) zoneEtu.style.display = estEnt ? 'none' : '';

  if (!verifierDB()) return;
  exigerProfilComplet();
  chargerDonneesPrivees().then(() => {
    setText('kpi-profil', !cvDisponible ? '—' : p?.verifie ? 'Vérifié' : profilEstComplet() ? 'Complet' : 'À compléter');
  });
  if (estEnt) return;

  const { data: cands, error } = await db
    .from('candidatures')
    .select('id, mission_id, user_id, statut, created_at, missions(*)')
    .eq('user_id', utilisateurConnecte.id)
    .order('created_at', { ascending: false });
  if (!error && cands) {
    setText('kpi-terminees', cands.filter(c => c.statut === 'acceptee').length);
    setText('kpi-encours',   cands.filter(c => c.statut === 'en_attente').length);
    setText('kpi-total',     cands.length);
    const ligne = c => {
      const titreM   = c.missions?.titre || 'Offre supprimée';
      const montantM = c.missions ? fcfa(montantParPersonne(c.missions)) : '—';
      const icone = c.statut === 'acceptee' ? icon('check') : c.statut === 'refusee' ? icon('error') : icon('clock');
      const bg    = c.statut === 'acceptee' ? 'var(--vert-clair)' : c.statut === 'refusee' ? '#FCEBEB' : 'var(--amber-clair)';
      const txt   = c.statut === 'acceptee' ? 'Acceptée — l\'entreprise va te contacter' : c.statut === 'refusee' ? 'Non retenue' : 'En attente de réponse';
      return `<div class="historique-item">
        <div class="hist-statut" style="background:${bg};font-size:16px;">${icone}</div>
        <div class="hist-info"><div class="hist-titre">${escHtml(titreM)}</div><div class="hist-meta">${formatDate(c.created_at)} · ${txt}</div></div>
        <div class="hist-montant">${montantM}</div>
      </div>`;
    };
    const vide = (t, bouton) => `<div style="text-align:center;padding:32px;color:var(--texte-3);">${t}${bouton ? '<br><button class="btn btn-vert" style="margin-top:12px;" onclick="allerVers(\'missions\')">Voir les offres →</button>' : ''}</div>`;
    const enCours = cands.filter(c => c.statut === 'en_attente');
    const terminees = cands.filter(c => c.statut !== 'en_attente');
    const elCours = document.getElementById('liste-candidatures');
    const elFin = document.getElementById('liste-historique');
    if (elCours) elCours.innerHTML = enCours.length ? enCours.map(ligne).join('') : vide('Aucune candidature en cours.', true);
    if (elFin) elFin.innerHTML = terminees.length ? terminees.map(ligne).join('') : vide('Tes candidatures acceptées ou refusées apparaîtront ici.');
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

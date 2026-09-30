/* TalentCI — modules/admin.js
   Panneau d'administration : statistiques, rôles des comptes, modération des offres. */

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
  db.from('pieces_identite').select('user_id', { count: 'exact', head: true }).eq('statut', 'en_attente')
    .then(r => setText('admin-nb-attente', r.count ? String(r.count) : ''));
  const { data: users } = await db.from('profils').select('*').order('created_at', { ascending: false }).limit(200);
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
      return `<tr><td><div class="user-cell"><div class="user-avatar-mini" style="background:var(--vert-clair);color:var(--vert-fonce)">${escHtml(ini)}</div><div><div class="user-nom-mini">${escHtml(u.nom||'—')}${moi ? ' <small>(toi)</small>' : ''}${u.verifie ? ' <span class="badge-verifie petit">✓</span>' : ''}</div><div class="user-email-mini">ID: ${u.user_id?u.user_id.substring(0,8):'—'}</div></div></div></td><td><span class="badge badge-${badgeType(u.type)}">${labelType(u.type)}</span></td><td>${escHtml(u.universite||'—')}</td><td>${formatDate(u.created_at)}</td><td><select class="admin-select-type" ${moi ? 'disabled title="Tu ne peux pas changer ton propre rôle ici"' : ''} onchange="changerTypeUtilisateur('${escAttr(u.user_id)}', this)">${options}</select></td></tr>`;
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

/* ══════════════════════════════════════════
   VÉRIFICATION DES PIÈCES D'IDENTITÉ
   ─────────────────────────────────────────
   Les photos sont dans le bucket PRIVÉ "pieces" : on les affiche via un
   lien signé valable 5 minutes (lecture autorisée aux admins par la
   policy "pieces_fichiers_lecture"). Valider / refuser met à jour
   pieces_identite.statut ; le trigger synchroniser_badge_verifie pose
   ou retire le badge "Vérifié" du profil.
══════════════════════════════════════════ */
async function chargerVerifications() {
  const liste = document.getElementById('liste-verifications');
  if (!liste || !verifierDB() || !estAdmin()) return;
  const { data: pieces, error } = await db.from('pieces_identite')
    .select('user_id, type_piece, numero, chemin, statut, motif_refus, updated_at')
    .order('updated_at', { ascending: false });
  if (error) {
    liste.innerHTML = `<div class="rangee-vide">Impossible de charger les pièces. Exécute sql/installation.sql dans Supabase.<br><small>${escHtml(error.message)}</small></div>`;
    return;
  }
  const attente = (pieces || []).filter(x => x.statut === 'en_attente').length;
  setText('admin-nb-attente', attente ? String(attente) : '');
  if (!pieces || !pieces.length) { liste.innerHTML = '<div class="rangee-vide">Aucune pièce envoyée pour l\'instant.</div>'; return; }
  const { data: profils } = await db.from('profils').select('user_id, nom, type, specialite, ville').in('user_id', pieces.map(x => x.user_id));
  const parUser = Object.fromEntries((profils || []).map(p => [p.user_id, p]));
  const ordre = { en_attente: 0, refusee: 1, verifiee: 2 };
  pieces.sort((a, b) => ordre[a.statut] - ordre[b.statut]);
  liste.innerHTML = pieces.map(x => {
    const p = parUser[x.user_id] || {};
    const badge = x.statut === 'verifiee' ? '<span class="badge badge-vert">Vérifiée</span>'
      : x.statut === 'refusee' ? '<span class="badge" style="background:#FCEBEB;color:#A32D2D;">Refusée</span>'
      : '<span class="badge badge-amber">À vérifier</span>';
    return `<div class="verif-item">
      <div class="verif-info">
        <div class="candidat-nom">${escHtml(p.nom || '—')} ${badge}</div>
        <div class="candidat-meta">${escHtml(labelType(p.type))}${p.specialite ? ' · ' + escHtml(p.specialite) : ''}${p.ville ? ' · ' + escHtml(p.ville) : ''}</div>
        <div class="verif-piece"><strong>${escHtml(x.type_piece)}</strong> n° <code>${escHtml(x.numero)}</code> · envoyée le ${formatDate(x.updated_at)}</div>
        ${x.statut === 'refusee' && x.motif_refus ? `<div class="candidat-meta">Motif : ${escHtml(x.motif_refus)}</div>` : ''}
      </div>
      <div class="action-btns verif-actions">
        <button class="btn-action" onclick="voirPiece('${escAttr(x.chemin)}', '${escAttr((p.nom || '').replace(/'/g, ''))}')">Voir la pièce</button>
        ${x.statut !== 'verifiee' ? `<button class="btn-action" style="color:var(--vert-fonce);" onclick="decisionPiece('${escAttr(x.user_id)}', 'verifiee')">Valider</button>` : ''}
        ${x.statut !== 'refusee' ? `<button class="btn-action danger" onclick="decisionPiece('${escAttr(x.user_id)}', 'refusee')">Refuser</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function voirPiece(chemin, nom) {
  const { data, error } = await db.storage.from('pieces').createSignedUrl(chemin, 300);
  if (error) { afficherToast('error', 'Pièce introuvable : ' + error.message, 'rouge'); return; }
  setText('piece-titre', 'Pièce d\'identité' + (nom ? ' — ' + nom : ''));
  document.getElementById('piece-image').src = data.signedUrl;
  document.getElementById('modal-piece').classList.add('visible');
}

async function decisionPiece(userId, statut) {
  if (!verifierDB() || !estAdmin()) return;
  let motif = null;
  if (statut === 'refusee') {
    motif = prompt('Motif du refus (visible par l\'utilisateur) :', 'Photo illisible');
    if (motif === null) return;
  }
  const { error } = await db.from('pieces_identite').update({ statut, motif_refus: motif }).eq('user_id', userId);
  if (error) { afficherToast('error', 'Erreur : ' + error.message, 'rouge'); return; }
  afficherToast(statut === 'verifiee' ? 'check' : 'info', statut === 'verifiee' ? 'Profil vérifié ✓' : 'Pièce refusée', statut === 'verifiee' ? 'vert' : '');
  await chargerVerifications();
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

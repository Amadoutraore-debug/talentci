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

/* TalentCI — modules/candidatures.js
   Candidatures : postuler (étudiant), consulter / accepter / refuser (entreprise). */

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

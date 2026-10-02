/* TalentCI — modules/candidatures.js
   Candidatures : postuler (étudiant), consulter / accepter / refuser (entreprise). */

/* ══════════════════════════════════════════
   CANDIDATURES
══════════════════════════════════════════ */
async function postuler(missionId) {
  if (!verifierDB()) return;
  if (!utilisateurConnecte) { afficherToast('lock','Connecte-toi pour postuler','rouge'); ouvrirAuth('connexion'); return; }
  if (profilConnecte?.type !== 'etudiant') { afficherToast('warning','Seuls les étudiants peuvent postuler',''); return; }
  await chargerDonneesPrivees();
  if (!profilEstComplet()) {
    afficherToast('warning', 'Complète ton CV avant de postuler', 'rouge');
    ouvrirEditProfil({ obligatoire: true }); return;
  }
  const cible = toutesLesMissions.find(m => m.id === missionId);
  if (cible && placesRestantes(cible) === 0) { afficherToast('info','Toutes les places de cette offre sont prises',''); return; }
  const { data: existant } = await db.from('candidatures').select('id').eq('mission_id', missionId).eq('user_id', utilisateurConnecte.id).maybeSingle();
  if (existant) { afficherToast('info','Tu as déjà postulé à cette mission !',''); return; }
  const mission = toutesLesMissions.find(m => m.id === missionId);
  const { error } = await db.from('candidatures').insert({
    mission_id: missionId, user_id: utilisateurConnecte.id,
    statut: 'en_attente', created_at: new Date().toISOString()
  });
  if (error) {
    // Refus RLS = profil incomplet côté serveur (profil_est_complet)
    if (/row-level security/i.test(error.message)) { afficherToast('warning', 'Complète ton CV avant de postuler', 'rouge'); ouvrirEditProfil({ obligatoire: true }); return; }
    afficherToast('error','Erreur : ' + error.message,'rouge'); return;
  }
  mesCandidaturesIds.add(missionId);
  filtrerMissions();
  rendreAccueil();
  if (document.getElementById('modal-offre').classList.contains('visible')) ouvrirOffre(missionId);
  await ajouterNotification({
    user_id: utilisateurConnecte.id, type: 'candidature',
    icone:'check', icone_bg:'#FFF1E6', icone_color:'#B54708',
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
const recrut = { cands: [], profils: {}, tels: {}, statut: 'en_attente', offre: '' };

// Raccourci depuis une offre (page Entreprises) : espace recrutement
// filtré sur cette offre.
function voirCandidatures(missionId) {
  recrut.offre = String(missionId);
  recrut.statut = 'tous';
  allerVers('recrutement');
}

async function chargerRecrutement() {
  const liste = document.getElementById('recrut-liste');
  if (!liste) return;
  if (!verifierDB()) return;
  if (!utilisateurConnecte) { liste.innerHTML = '<div class="rangee-vide">Connecte-toi pour voir les candidatures reçues.</div>'; return; }
  if (profilConnecte?.type !== 'entreprise' && !estAdmin()) {
    liste.innerHTML = `<div class="rangee-vide">L'espace recrutement est réservé aux comptes Entreprise.<br><button class="rangee-voir-tout" onclick="allerVers('entreprise')">Passer en compte Entreprise →</button></div>`;
    return;
  }
  liste.innerHTML = '<div class="rangee-vide">Chargement des candidatures...</div>';

  // Candidatures reçues sur MES offres (la policy "candidatures_lecture"
  // le garantit aussi côté serveur).
  const { data: cands, error } = await db.from('candidatures')
    .select('id, user_id, mission_id, statut, created_at, missions!inner(id, titre, categorie, competences, niveau, user_id, nb_places, places_prises, montant_par_personne, salaire)')
    .eq('missions.user_id', utilisateurConnecte.id)
    .order('created_at', { ascending: false });
  if (error) { liste.innerHTML = `<div class="rangee-vide">Impossible de charger les candidatures.<br><small>${escHtml(error.message)}</small></div>`; return; }
  recrut.cands = cands || [];

  const ids = [...new Set(recrut.cands.map(c => c.user_id))];
  if (ids.length) {
    const [{ data: profils }, { data: tels }] = await Promise.all([
      db.from('profils').select('*').in('user_id', ids),
      // Autorisé par la policy "coordonnees_lecture" : le candidat a postulé à MON offre
      db.from('coordonnees').select('user_id, telephone').in('user_id', ids)
    ]);
    recrut.profils = Object.fromEntries((profils || []).map(p => [p.user_id, p]));
    recrut.tels = Object.fromEntries((tels || []).map(t => [t.user_id, t.telephone]));
  }

  // Liste des offres pour le filtre
  const sel = document.getElementById('recrut-offre');
  const { data: offres } = await db.from('missions').select('id, titre').eq('user_id', utilisateurConnecte.id).order('created_at', { ascending: false });
  if (sel) {
    sel.innerHTML = '<option value="">Toutes mes offres</option>' + (offres || []).map(o => `<option value="${o.id}">${escHtml(o.titre)}</option>`).join('');
    sel.value = recrut.offre;
    if (sel.value !== recrut.offre) recrut.offre = '';
  }
  afficherRecrutement();
}

function filtrerRecrutement(type, valeur) {
  recrut[type] = valeur;
  afficherRecrutement();
}

/* Correspondance profil ↔ offre : chaque compétence demandée par l'offre
   est cherchée dans les compétences du candidat, puis dans sa spécialité,
   sa présentation et son parcours (« mentionné dans le CV »). */
function sansAccents(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
function correspondance(mission, p) {
  const demandees = (Array.isArray(mission?.competences) ? mission.competences : []).filter(Boolean);
  const siennes = (Array.isArray(p?.competences) ? p.competences : []).map(sansAccents);
  const texteCV = sansAccents([p?.specialite, p?.bio, p?.parcours, p?.universite].join(' '));
  const details = demandees.map(c => {
    const n = sansAccents(c);
    if (siennes.some(s => s && (s.includes(n) || n.includes(s)))) return { nom: c, etat: 'oui' };
    if (n && texteCV.includes(n)) return { nom: c, etat: 'cv' };
    return { nom: c, etat: 'non' };
  });
  const memeDomaine = !!mission?.categorie && texteCV.includes(sansAccents(mission.categorie));
  if (!demandees.length) return { score: null, details, memeDomaine };
  const points = details.reduce((t, d) => t + (d.etat === 'oui' ? 1 : d.etat === 'cv' ? 0.5 : 0), 0);
  return { score: Math.round(100 * points / demandees.length), details, memeDomaine };
}
function pastilleScore(score) {
  if (score === null) return '<span class="score-pastille neutre">Compétences non précisées</span>';
  const cls = score >= 70 ? 'fort' : score >= 40 ? 'moyen' : 'faible';
  return `<span class="score-pastille ${cls}">${score} % de correspondance</span>`;
}
function badgeStatut(statut) {
  return statut === 'acceptee' ? '<span class="badge badge-vert">Validée</span>'
    : statut === 'refusee' ? '<span class="badge" style="background:#FCEBEB;color:#A32D2D;">Rejetée</span>'
    : '<span class="badge badge-amber">À traiter</span>';
}
function avatarCandidat(p, taille) {
  const nom = p?.nom || 'Étudiant';
  const ini = nom.split(' ').map(x => x[0]).join('').substring(0,2).toUpperCase();
  const style = p?.avatar_url ? `background-image:url('${cssUrl(p.avatar_url)}');background-size:cover;background-position:center;` : '';
  return `<div class="candidat-avatar${taille ? ' grand' : ''}" style="${style}">${p?.avatar_url ? '' : escHtml(ini)}</div>`;
}

function afficherRecrutement() {
  const liste = document.getElementById('recrut-liste');
  if (!liste) return;
  const parOffre = recrut.offre ? recrut.cands.filter(c => String(c.mission_id) === recrut.offre) : recrut.cands;
  ['en_attente', 'acceptee', 'refusee'].forEach(st => {
    const n = parOffre.filter(c => c.statut === st).length;
    setText('rc-' + st, n ? String(n) : '');
  });
  document.querySelectorAll('#recrut-onglets .recrut-onglet').forEach(b => b.classList.toggle('actif', b.dataset.statut === recrut.statut));
  const visibles = recrut.statut === 'tous' ? parOffre : parOffre.filter(c => c.statut === recrut.statut);

  if (!recrut.cands.length) {
    liste.innerHTML = `<div class="rangee-vide"><div style="font-size:34px;margin-bottom:6px;">${icon('inbox')}</div>Aucune candidature reçue pour l'instant.<br>Elles apparaîtront ici dès qu'un étudiant postulera à tes offres.</div>`;
    return;
  }
  if (!visibles.length) {
    liste.innerHTML = `<div class="rangee-vide">${recrut.statut === 'en_attente' ? 'Rien à traiter : toutes les candidatures ont reçu une réponse 👍' : 'Aucune candidature dans cette catégorie.'}</div>`;
    return;
  }
  liste.innerHTML = visibles.map(c => {
    const p = recrut.profils[c.user_id] || {};
    const m = correspondance(c.missions, p);
    return `<div class="recrut-carte" onclick="ouvrirFicheCandidat(${c.id})">
      ${avatarCandidat(p)}
      <div class="recrut-carte-info">
        <div class="candidat-nom">${escHtml(p.nom || 'Étudiant')} ${p.verifie ? `<span class="badge-verifie petit">✓</span>` : ''}</div>
        <div class="candidat-meta">${[p.specialite, p.ville].filter(Boolean).map(escHtml).join(' · ') || 'Profil non renseigné'}</div>
        <div class="recrut-carte-offre">Pour : <strong>${escHtml(c.missions?.titre || '')}</strong> · ${formatDate(c.created_at)}</div>
        <div class="recrut-carte-tags">${badgeStatut(c.statut)} ${pastilleScore(m.score)}</div>
      </div>
      <button class="btn btn-vert recrut-voir" onclick="event.stopPropagation();ouvrirFicheCandidat(${c.id})">Voir le profil</button>
    </div>`;
  }).join('');
}

function ouvrirFicheCandidat(candidatureId) {
  const c = recrut.cands.find(x => x.id === candidatureId);
  if (!c) return;
  const p = recrut.profils[c.user_id] || {};
  const tel = recrut.tels[c.user_id];
  const mission = c.missions || {};
  const m = correspondance(mission, p);
  const comps = Array.isArray(p.competences) ? p.competences : [];
  const restantes = Math.max(0, (parseInt(mission.nb_places, 10) || 1) - (parseInt(mission.places_prises, 10) || 0));
  const icones = { oui: '✓', cv: '≈', non: '✗' };
  const libelles = { oui: 'dans ses compétences', cv: 'mentionné dans son CV', non: 'absent du profil' };

  document.getElementById('candidat-detail').innerHTML = `
    <button class="offre-modal-fermer" onclick="fermerFicheCandidat()" aria-label="Fermer">×</button>
    <div class="fiche-entete">
      ${avatarCandidat(p, true)}
      <div>
        <h2 class="fiche-nom">${escHtml(p.nom || 'Étudiant')}</h2>
        <div class="candidat-meta">${[p.specialite, p.ville, p.universite].filter(Boolean).map(escHtml).join(' · ')}</div>
        <div class="recrut-carte-tags">${p.verifie ? `<span class="badge-verifie">${icon('check')} Vérifié</span>` : ''} ${badgeStatut(c.statut)}</div>
      </div>
    </div>

    <div class="fiche-bloc fiche-match">
      <div class="fiche-bloc-titre">Correspondance avec ton offre</div>
      <div class="fiche-offre">« ${escHtml(mission.titre || '')} » · ${escHtml(mission.categorie || '')}${mission.niveau ? ' · ' + escHtml(mission.niveau) : ''}</div>
      ${m.score === null
        ? `<p class="fiche-note">Ton offre ne précise pas de compétences : compare avec la présentation et le parcours ci-dessous.${m.memeDomaine ? ' Le profil mentionne le domaine <strong>' + escHtml(mission.categorie) + '</strong>.' : ''}</p>`
        : `<div class="score-barre"><div class="score-barre-remplie ${m.score >= 70 ? 'fort' : m.score >= 40 ? 'moyen' : 'faible'}" style="width:${m.score}%"></div></div>
           <div class="fiche-score">${pastilleScore(m.score)}</div>
           <ul class="fiche-competences">${m.details.map(d => `<li class="${d.etat}"><span>${icones[d.etat]}</span> <strong>${escHtml(d.nom)}</strong> — ${libelles[d.etat]}</li>`).join('')}</ul>`}
      <div class="fiche-note">Places restantes sur cette offre : <strong>${restantes}</strong></div>
    </div>

    ${p.bio ? `<div class="fiche-bloc"><div class="fiche-bloc-titre">Présentation</div><p>${escHtml(p.bio)}</p></div>` : ''}
    ${p.parcours ? `<div class="fiche-bloc"><div class="fiche-bloc-titre">Formation et expériences</div><p>${escHtml(p.parcours)}</p></div>` : ''}
    ${comps.length ? `<div class="fiche-bloc"><div class="fiche-bloc-titre">Compétences</div><div class="candidat-comps">${comps.map(x => `<span class="comp-pill">${escHtml(x)}</span>`).join('')}</div></div>` : ''}

    <div class="candidat-contacts">
      ${tel ? `<a class="btn btn-blanc" href="tel:${escAttr(chiffresTel(tel))}">${icon('smartphone')} ${escHtml(tel)}</a>
      <a class="btn btn-whatsapp" href="https://wa.me/${escAttr(numeroWhatsApp(tel))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
      ${p.lien ? `<a class="btn btn-blanc" href="${escAttr(p.lien)}" target="_blank" rel="noopener">${icon('globe')} Portfolio</a>` : ''}
    </div>

    <div class="fiche-decision">
      ${c.statut === 'en_attente' ? `
        <button class="btn btn-vert" onclick="changerStatutCandidature(${c.id}, 'acceptee')">${icon('check')} Valider la candidature</button>
        <button class="btn btn-rejeter" onclick="changerStatutCandidature(${c.id}, 'refusee')">${icon('error')} Rejeter</button>`
      : c.statut === 'acceptee' ? `
        <div class="fiche-note">Tu as <strong>validé</strong> cette candidature. Contacte l'étudiant pour démarrer la mission.</div>
        <button class="btn btn-rejeter" onclick="changerStatutCandidature(${c.id}, 'refusee')">Changer d'avis : rejeter</button>`
      : `
        <div class="fiche-note">Tu as <strong>rejeté</strong> cette candidature.</div>
        <button class="btn btn-blanc" onclick="changerStatutCandidature(${c.id}, 'acceptee')">Changer d'avis : valider</button>`}
    </div>`;
  document.getElementById('modal-candidat').classList.add('visible');
}

function fermerFicheCandidat() {
  document.getElementById('modal-candidat').classList.remove('visible');
}

// Numéro pour tel: (garde le + initial) et pour WhatsApp (indicatif
// international sans +). Numéros ivoiriens à 10 chiffres → +225.
function chiffresTel(t) { const s = String(t || '').trim(); return (s.startsWith('+') ? '+' : '') + s.replace(/\D/g, ''); }
function numeroWhatsApp(t) {
  let d = String(t || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('0')) d = '225' + d;
  return d;
}

// Valider / rejeter. L'étudiant est notifié par le trigger
// notifier_statut_candidature ; le trigger verifier_places_disponibles
// refuse une validation quand l'offre est complète.
async function changerStatutCandidature(candidatureId, statut) {
  if (!verifierDB()) return;
  if (statut === 'refusee' && !confirm('Rejeter cette candidature ? L\'étudiant sera prévenu.')) return;
  const { error } = await db.from('candidatures').update({ statut }).eq('id', candidatureId);
  if (error) {
    afficherToast('error', /places/i.test(error.message) ? 'Toutes les places de cette offre sont déjà prises' : 'Erreur : ' + error.message, 'rouge');
    return;
  }
  afficherToast(statut === 'acceptee' ? 'check' : 'info',
    statut === 'acceptee' ? 'Candidature validée — l\'étudiant est prévenu' : 'Candidature rejetée — l\'étudiant est prévenu', statut === 'acceptee' ? 'vert' : '');
  const c = recrut.cands.find(x => x.id === candidatureId);
  if (c) c.statut = statut;
  await chargerRecrutement();
  if (document.getElementById('modal-candidat').classList.contains('visible')) ouvrirFicheCandidat(candidatureId);
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

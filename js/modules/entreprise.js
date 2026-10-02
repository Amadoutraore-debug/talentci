/* TalentCI — modules/entreprise.js
   Page Entreprises : accès réservé, offres publiées. */

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

// En-tête de la page Entreprises : nom, logo (photo de profil), secteur et ville.
function majEnteteEntreprise() {
  if (!utilisateurConnecte) return;
  const p = profilConnecte || {};
  const nom = p.nom || utilisateurConnecte.email.split('@')[0];
  setText('ent-nom', nom);
  appliquerAvatarVisuel(document.getElementById('ent-logo'), p.avatar_url, nom.split(' ').map(m => m[0]).join('').substring(0,2).toUpperCase());
  setText('ent-secteur', [p.specialite, p.ville].filter(Boolean).join(' — ') || 'Complète ton profil pour afficher ton secteur');
}

async function chargerMissionsEntreprise() {
  majAccesEntreprise();
  const conteneur = document.getElementById('liste-missions-publiees');
  if (!conteneur) return;
  const vide = (texte) => `<div style="text-align:center;padding:24px;color:var(--texte-3);">${texte}</div>`;
  if (!verifierDB()) { conteneur.innerHTML = vide('Configure la base de données pour voir tes offres.'); return; }
  if (!utilisateurConnecte) { conteneur.innerHTML = vide('Connecte-toi pour voir tes offres.'); return; }
  majEnteteEntreprise();

  const { data: missions, error } = await db
    .from('missions')
    .select('*')
    .eq('user_id', utilisateurConnecte.id)
    .order('created_at', { ascending: false });
  if (error) { conteneur.innerHTML = vide('Impossible de charger tes offres. Réessaie dans un instant.'); return; }
  if (!missions || missions.length === 0) {
    conteneur.innerHTML = vide('Aucune offre publiée pour l\'instant.');
    setText('ent-publiees', 0); setText('ent-candidatures', 0); return;
  }
  const missionIds = missions.map(m => m.id);
  const { data: toutesLesCands } = await db.from('candidatures').select('mission_id, statut').in('mission_id', missionIds);
  const cands = toutesLesCands || [];
  const compter = (id, statut) => cands.filter(c => c.mission_id === id && (!statut || c.statut === statut)).length;
  setText('ent-publiees', missions.length);
  setText('ent-candidatures', cands.length);
  const aTraiter = cands.filter(c => c.statut === 'en_attente').length;
  const banniere = document.getElementById('ent-recrut-banniere');
  if (banniere) {
    banniere.style.display = cands.length ? 'flex' : 'none';
    banniere.innerHTML = `<div class="recrut-banniere-icone">${icon('users')}</div>
      <div class="recrut-banniere-texte"><strong>Espace recrutement</strong><br>${aTraiter ? `<span class="recrut-banniere-alerte">${aTraiter} candidature(s) à traiter</span>` : 'Toutes les candidatures ont reçu une réponse'} · ${cands.length} au total</div>
      <span class="btn btn-vert">Ouvrir →</span>`;
  }
  conteneur.innerHTML = missions.map(m => {
    const nb = compter(m.id);
    const enAttente = compter(m.id, 'en_attente');
    const { bg, txt } = couleursCategorie(m.categorie);
    const statut = !m.actif
      ? '<span class="pub-statut statut-pause">● En pause</span>'
      : placesRestantes(m) === 0 ? '<span class="pub-statut statut-complet">● Complète</span>'
      : '<span class="pub-statut statut-actif">● En ligne</span>';
    return `<div class="mission-publiee${m.actif ? '' : ' ligne-masquee'}">
      <div class="pub-icone" style="background:${bg};color:${txt}">${iconCategorie(m.categorie)}</div>
      <div class="pub-info">
        <div class="pub-titre">${escHtml(m.titre)}</div>
        <div class="pub-meta">${escHtml(m.duree || '')} · ${nb} candidature(s)${enAttente ? ` dont <strong>${enAttente} à traiter</strong>` : ''} · ${nbPlaces(m) - placesRestantes(m)}/${nbPlaces(m)} place(s) pourvue(s)</div>
        <div class="pub-tags">${statut}<span class="badge badge-vert">${escHtml(m.categorie)}</span></div>
      </div>
      <div class="pub-actions">
        <div class="pub-montant">${fcfa(montantParPersonne(m))}<small> / pers.</small></div>
        <button class="btn-mini" onclick="voirCandidatures(${m.id})">Candidatures (${nb})</button>
        <button class="btn-mini" onclick="basculerMaMission(${m.id}, ${m.actif ? 'false' : 'true'})">${m.actif ? 'Mettre en pause' : 'Remettre en ligne'}</button>
        <button class="btn-mini" style="color:#A32D2D;" onclick="supprimerMission(${m.id})">Supprimer</button>
      </div>
    </div>`;
  }).join('');
}

// L'entreprise peut retirer temporairement son offre (policy
// "missions_modification_proprietaire_ou_admin").
async function basculerMaMission(id, actif) {
  if (!verifierDB() || !utilisateurConnecte) return;
  const { error } = await db.from('missions').update({ actif }).eq('id', id).eq('user_id', utilisateurConnecte.id);
  if (error) { afficherToast('error', 'Erreur : ' + error.message, 'rouge'); return; }
  afficherToast(actif ? 'eye' : 'info', actif ? 'Offre remise en ligne' : 'Offre mise en pause : elle n\'est plus visible', actif ? 'vert' : '');
  await chargerMissionsEntreprise();
  await chargerMissions();
}

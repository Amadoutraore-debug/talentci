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

async function chargerMissionsEntreprise() {
  majAccesEntreprise();
  const conteneur = document.getElementById('liste-missions-publiees');
  if (!conteneur) return;
  if (!verifierDB()) {
    conteneur.innerHTML = '<div style="text-align:center;padding:24px;color:var(--texte-3);">Configure la base de données pour voir tes missions.</div>';
    return;
  }
  if (!utilisateurConnecte) {
    conteneur.innerHTML = '<div style="text-align:center;padding:24px;color:var(--texte-3);">Connecte-toi pour voir tes missions.</div>';
    return;
  }
  const { data: missions, error } = await db
    .from('missions')
    .select('*')
    .eq('user_id', utilisateurConnecte.id)
    .order('created_at', { ascending: false });
  if (error || !missions || missions.length === 0) {
    conteneur.innerHTML = '<div style="text-align:center;padding:24px;color:var(--texte-3);">Aucune mission publiée encore.</div>';
    setText('ent-publiees', 0); setText('ent-candidatures', 0); return;
  }
  const missionIds = missions.map(m => m.id);
  const { data: toutesLescands } = await db.from('candidatures').select('mission_id').in('mission_id', missionIds);
  const compterCands = (id) => (toutesLescands||[]).filter(c => c.mission_id === id).length;
  setText('ent-publiees', missions.length);
  setText('ent-candidatures', (toutesLescands||[]).length);
  const nomEntreprise = profilConnecte?.nom || utilisateurConnecte.email.split('@')[0];
  setText('ent-logo', nomEntreprise.split(' ').map(m=>m[0]).join('').substring(0,2).toUpperCase());
  setText('ent-nom', nomEntreprise);
  conteneur.innerHTML = missions.map(m => {
    const nb = compterCands(m.id);
    return `<div class="mission-publiee">
      <div class="pub-icone" style="background:${escAttr(m.couleur_bg||'#E1F5EE')}">${iconCategorie(m.categorie)}</div>
      <div class="pub-info">
        <div class="pub-titre">${escHtml(m.titre)}</div>
        <div class="pub-meta">${escHtml(m.duree)} · ${nb} candidature(s) · ${nbPlaces(m) - placesRestantes(m)}/${nbPlaces(m)} place(s) pourvue(s)</div>
        <div class="pub-tags"><span class="pub-statut statut-actif">● Active</span><span class="badge badge-vert">${escHtml(m.categorie)}</span></div>
      </div>
      <div class="pub-actions">
        <div class="pub-montant">${fcfa(montantParPersonne(m))}<small> / pers.</small></div>
        <button class="btn-mini" onclick="voirCandidatures(${m.id})">Candidatures (${nb})</button>
        <button class="btn-mini" style="color:#A32D2D;" onclick="supprimerMission(${m.id})">Supprimer</button>
      </div>
    </div>`;
  }).join('');
}

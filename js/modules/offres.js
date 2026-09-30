/* TalentCI — modules/offres.js
   Offres : chargement, publication, cartes, fiche détaillée, accueil (bandeau, rangées), favoris, filtres, formulaire. */

/* ══════════════════════════════════════════
   MISSIONS — LECTURE
══════════════════════════════════════════ */
async function chargerMissions() {
  if (!verifierDB()) {
    toutesLesMissions = [];
    const grille = document.getElementById('missions-grille');
    if (grille) grille.innerHTML = `<div class="aucun-resultat"><div style="font-size:48px">${icon('database')}</div><p>Configure la base de données pour voir les missions.</p><button class="btn btn-vert" style="margin-top:16px;" onclick="ouvrirConfigDB()">Configurer →</button></div>`;
    return;
  }
  const { data, error } = await db
    .from('missions')
    .select('*')
    .eq('actif', true)
    .order('created_at', { ascending: false });
  if (error) { console.error('Erreur missions:', error.message); toutesLesMissions = []; }
  else toutesLesMissions = Array.isArray(data) ? data : [];
  await chargerMesCandidaturesIds();
  filtrerMissions();
  rendreAccueil();
}

// Missions auxquelles l'étudiant connecté a déjà postulé : permet
// d'afficher "Candidature envoyée" au lieu de "Postuler" sur la carte.
let mesCandidaturesIds = new Set();
async function chargerMesCandidaturesIds() {
  mesCandidaturesIds = new Set();
  if (!dbPret || !db || !utilisateurConnecte) return;
  const { data } = await db.from('candidatures').select('mission_id').eq('user_id', utilisateurConnecte.id);
  (data || []).forEach(c => mesCandidaturesIds.add(c.mission_id));
}

/* ══════════════════════════════════════════
   MISSIONS — PUBLICATION
══════════════════════════════════════════ */
async function publierMission() {
  if (!verifierDB()) return;
  if (!utilisateurConnecte) { afficherToast('lock', 'Connecte-toi pour publier', 'rouge'); ouvrirAuth('connexion'); return; }
  if (profilConnecte?.type !== 'entreprise' && !estAdmin()) {
    afficherToast('warning', 'Seuls les comptes Entreprise peuvent publier des missions', 'rouge'); return;
  }
  const titre      = document.getElementById('champ-titre').value.trim();
  const categorie   = document.getElementById('champ-categorie').value;
  const description = document.getElementById('champ-description').value.trim();
  const places      = parseInt(document.getElementById('champ-places').value, 10);
  const montant     = parseInt(document.getElementById('champ-montant').value, 10);
  const duree       = document.getElementById('champ-duree').value;
  const niveau      = document.getElementById('champ-niveau').value;
  if (!titre)                   { afficherToast('warning','Titre obligatoire','rouge'); return; }
  if (!categorie)               { afficherToast('warning','Choisis une catégorie','rouge'); return; }
  if (description.length < 30) { afficherToast('warning','Description trop courte (min 30 car.)','rouge'); return; }
  if (!places || places < 1 || places > 500) { afficherToast('warning','Nombre de personnes : entre 1 et 500','rouge'); return; }
  if (!montant || montant < 1000) { afficherToast('warning','Montant minimum : 1 000 FCFA par personne','rouge'); return; }
  const budget = places * montant;
  if (budget < 5000) { afficherToast('warning','Budget total minimum : 5 000 FCFA','rouge'); return; }
  const nomEntreprise = profilConnecte?.nom || utilisateurConnecte.email.split('@')[0];
  const ini = nomEntreprise.split(' ').map(m => m[0]).join('').substring(0,2).toUpperCase();
  const bgMap  = {Design:'#EEEDFE',Développement:'#E6F1FB',Marketing:'#E1F5EE',Comptabilité:'#FAEEDA',Data:'#FAEEDA',Rédaction:'#E1F5EE',Vidéo:'#FBEAF0'};
  const txtMap = {Design:'#534AB7',Développement:'#185FA5',Marketing:'#0F6E56',Comptabilité:'#BA7517',Data:'#BA7517',Rédaction:'#0F6E56',Vidéo:'#993556'};
  setBtnLoading('btn-publier', true, 'Publication...');

  let imageUrl = null;
  if (fichierCouverture) {
    const ext = (fichierCouverture.name.split('.').pop() || 'jpg').toLowerCase();
    const chemin = `${utilisateurConnecte.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await db.storage.from('missions').upload(chemin, fichierCouverture, { cacheControl: '31536000' });
    if (upErr) {
      setBtnLoading('btn-publier', false, 'Publier l\'offre →');
      afficherToast('error', 'Erreur image : ' + upErr.message, 'rouge');
      return;
    }
    imageUrl = db.storage.from('missions').getPublicUrl(chemin).data.publicUrl;
  }

  const { error } = await db.from('missions').insert({
    titre, entreprise: nomEntreprise, initiales: ini,
    couleur_bg: bgMap[categorie]||'#E1F5EE', couleur_txt: txtMap[categorie]||'#0F6E56',
    categorie, description, salaire: budget, duree, niveau,
    nb_places: places, montant_par_personne: montant, image_url: imageUrl,
    actif: true, user_id: utilisateurConnecte.id,
    competences: competencesSaisies, created_at: new Date().toISOString()
  });
  setBtnLoading('btn-publier', false, 'Publier l\'offre →');
  if (error) {
    // Colonnes absentes = la migration SQL des places n'a pas été exécutée.
    const msg = /nb_places|montant_par_personne|image_url|column/i.test(error.message)
      ? 'La base doit être mise à jour : exécute sql/installation.sql dans Supabase.'
      : 'Erreur : ' + error.message;
    afficherToast('error', msg, 'rouge'); return;
  }
  document.getElementById('succes-publication').classList.add('visible');
  document.querySelector('.form-actions').style.display = 'none';
  afficherToast('party','Offre publiée avec succès !','vert');
  await chargerMissions();
  await chargerMissionsEntreprise();
}

/* ══════════════════════════════════════════
   STATS ACCUEIL
══════════════════════════════════════════ */
async function chargerStats() {
  if (!verifierDB()) {
    setText('stat-etudiants', '—');
    setText('stat-entreprises', '—');
    setText('stat-missions', '—');
    return;
  }
  const [r1, r2, r3] = await Promise.all([
    db.from('profils').select('id', { count: 'exact', head: true }).eq('type', 'etudiant'),
    db.from('profils').select('id', { count: 'exact', head: true }).eq('type', 'entreprise'),
    db.from('missions').select('id', { count: 'exact', head: true }).eq('actif', true)
  ]);
  setText('stat-etudiants',   (r1.count||0) + '+');
  setText('stat-entreprises', (r2.count||0) + '+');
  setText('stat-missions',    (r3.count||0) + '+');
}

/* ══════════════════════════════════════════
   AFFICHAGE MISSIONS
══════════════════════════════════════════ */
function labelType(type) {
  if (type === 'etudiant') return 'Étudiant';
  if (type === 'admin') return 'Admin';
  return 'Entreprise';
}
function badgeType(type) {
  if (type === 'etudiant') return 'vert';
  if (type === 'admin') return 'amber';
  return 'bleu';
}

function couleurCategorie(cat) {
  const map = {Design:'violet',Développement:'bleu',Marketing:'vert',Comptabilité:'amber',Data:'amber',Rédaction:'vert',Vidéo:'bleu'};
  return map[cat] || 'vert';
}

function iconCategorie(cat) {
  const map = {Design:'palette',Développement:'code',Marketing:'smartphone',Comptabilité:'chart',Data:'trendingUp',Rédaction:'fileText',Vidéo:'video',Traduction:'globe'};
  return icon(map[cat] || 'clipboard');
}

/* ══════════════════════════════════════════
   OFFRES — DONNÉES CALCULÉES
   Compatibles avec les anciennes missions (avant la migration des
   places) : 1 place, tout le budget pour une personne.
══════════════════════════════════════════ */
function nbPlaces(m) { return Math.max(1, parseInt(m.nb_places, 10) || 1); }
function montantParPersonne(m) { return parseInt(m.montant_par_personne, 10) || parseInt(m.salaire, 10) || 0; }
function placesRestantes(m) { return Math.max(0, nbPlaces(m) - (parseInt(m.places_prises, 10) || 0)); }
function fcfa(n) { return (Number(n) || 0).toLocaleString('fr-FR') + ' FCFA'; }

const MOIS_COURTS = ['JANV','FÉVR','MARS','AVR','MAI','JUIN','JUIL','AOÛT','SEPT','OCT','NOV','DÉC'];
function badgeDate(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d)) return '';
  return `<div class="offre-date"><span>${d.getDate()}</span><small>${MOIS_COURTS[d.getMonth()]}</small></div>`;
}

// Couverture : photo de l'offre si fournie, sinon dégradé aux couleurs
// de la catégorie avec son icône.
function couvertureOffre(m) {
  const bg  = escAttr(m.couleur_bg || '#E1F5EE');
  const txt = escAttr(m.couleur_txt || '#0F6E56');
  if (m.image_url) {
    return `<div class="offre-couverture" style="background-image:url('${cssUrl(m.image_url)}')"></div>`;
  }
  return `<div class="offre-couverture offre-couverture-vide" style="background:linear-gradient(135deg, ${bg} 0%, #fff 140%);color:${txt}">${iconCategorie(m.categorie)}</div>`;
}

function pastillePlaces(m) {
  const reste = placesRestantes(m), total = nbPlaces(m);
  if (reste === 0) return `<span class="offre-places complet">Complet</span>`;
  return `<span class="offre-places">${icon('users')} ${reste === total ? total + (total > 1 ? ' places' : ' place') : reste + '/' + total + ' restantes'}</span>`;
}

function rendreCarte(m) {
  const complet = placesRestantes(m) === 0;
  return `<article class="offre-carte${complet ? ' est-complet' : ''}" onclick="ouvrirOffre(${m.id})">
    <div class="offre-media">
      ${couvertureOffre(m)}
      ${badgeDate(m.created_at)}
      <button class="offre-fav" onclick="event.stopPropagation();toggleFav(${m.id})" aria-label="${m.fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}" style="color:${m.fav ? '#F5A623' : 'var(--texte-2)'};">${icon(m.fav ? 'starFilled' : 'starOutline')}</button>
      ${mesCandidaturesIds.has(m.id) ? `<span class="offre-postule">${icon('check')} Postulé</span>` : ''}
    </div>
    <div class="offre-corps">
      <div class="offre-cat">${iconCategorie(m.categorie)}<span>${escHtml(m.categorie)}</span></div>
      <h3 class="offre-titre">${escHtml(m.titre)}</h3>
      <div class="offre-entreprise">${icon('building')}<span>${escHtml(m.entreprise)}</span></div>
      <div class="offre-pied">
        <div class="offre-prix"><small>Par personne</small><strong>${fcfa(montantParPersonne(m))}</strong></div>
        ${pastillePlaces(m)}
      </div>
    </div>
  </article>`;
}

/* ══════════════════════════════════════════
   DÉTAIL D'UNE OFFRE
══════════════════════════════════════════ */
function ouvrirOffre(id) {
  const m = toutesLesMissions.find(x => x.id === id);
  if (!m) return;
  const reste = placesRestantes(m);
  const dejaPostule = mesCandidaturesIds.has(m.id);
  const comps = Array.isArray(m.competences) ? m.competences : [];
  const bouton = dejaPostule
    ? `<button class="btn-postuler-large deja-postule" disabled>${icon('check')} Candidature envoyée</button>`
    : reste === 0
    ? `<button class="btn-postuler-large deja-postule" disabled>Toutes les places sont prises</button>`
    : `<button class="btn-postuler-large" onclick="postuler(${m.id})">Postuler →</button>`;
  document.getElementById('offre-detail').innerHTML = `
    <button class="offre-modal-fermer" onclick="fermerOffre()" aria-label="Fermer">×</button>
    <div class="offre-modal-media">${couvertureOffre(m)}${badgeDate(m.created_at)}</div>
    <div class="offre-modal-corps">
      <div class="offre-cat">${iconCategorie(m.categorie)}<span>${escHtml(m.categorie)}</span></div>
      <h2 class="offre-modal-titre">${escHtml(m.titre)}</h2>
      <div class="offre-entreprise">${icon('building')}<span>Publié par <strong>${escHtml(m.entreprise)}</strong> · ${formatDate(m.created_at)}</span></div>
      <div class="offre-chiffres">
        <div><small>Par personne</small><strong>${fcfa(montantParPersonne(m))}</strong></div>
        <div><small>Personnes recherchées</small><strong>${nbPlaces(m)}</strong></div>
        <div><small>Places restantes</small><strong>${reste}</strong></div>
      </div>
      <div class="offre-infos">
        <span>${icon('clock')} ${escHtml(m.duree || '—')}</span>
        <span>${icon('bars')} ${escHtml(m.niveau || '—')}</span>
      </div>
      <p class="offre-description">${escHtml(m.description)}</p>
      ${comps.length ? `<div class="offre-comps">${comps.map(c => `<span class="comp-pill">${escHtml(c)}</span>`).join('')}</div>` : ''}
      <div class="offre-modal-actions">${bouton}</div>
    </div>`;
  document.getElementById('modal-offre').classList.add('visible');
}
function fermerOffre() { document.getElementById('modal-offre').classList.remove('visible'); }

/* ══════════════════════════════════════════
   ACCUEIL : BANDEAU À LA UNE + RANGÉES
══════════════════════════════════════════ */
let carrouselTimer = null;
let carrouselIndex = 0;

function rendreAccueil() {
  const piste = document.getElementById('carrousel-piste');
  const une = document.getElementById('rangee-une');
  const recentes = document.getElementById('rangee-recentes');
  if (!piste || !une || !recentes) return;
  const favoris = lireFavoris();
  toutesLesMissions.forEach(m => { m.fav = favoris.has(m.id); });

  const dispo = toutesLesMissions.filter(m => placesRestantes(m) > 0);
  const alaune = [...dispo].sort((a, b) => (montantParPersonne(b) * nbPlaces(b)) - (montantParPersonne(a) * nbPlaces(a))).slice(0, 8);
  const vide = `<div class="rangee-vide">Aucune offre pour l'instant. <button class="rangee-voir-tout" onclick="allerVers('entreprise')">Publier la première →</button></div>`;
  une.innerHTML = alaune.length ? alaune.map(rendreCarte).join('') : vide;
  recentes.innerHTML = toutesLesMissions.length ? toutesLesMissions.slice(0, 8).map(rendreCarte).join('') : vide;

  // Bandeau : diapo d'accueil + jusqu'à 4 offres à la une
  const intro = piste.querySelector('.carrousel-slide-intro');
  piste.querySelectorAll('.carrousel-slide:not(.carrousel-slide-intro)').forEach(el => el.remove());
  alaune.slice(0, 4).forEach(m => {
    const slide = document.createElement('div');
    slide.className = 'carrousel-slide';
    if (m.image_url) slide.style.backgroundImage = `linear-gradient(90deg, rgba(15,110,86,.92) 0%, rgba(15,110,86,.55) 55%, rgba(15,110,86,.15) 100%), url('${cssUrl(m.image_url)}')`;
    slide.innerHTML = `<div class="carrousel-contenu">
        <div class="carrousel-label">${escHtml(m.categorie)} · À la une</div>
        <h2>${escHtml(m.titre)}</h2>
        <p>${escHtml(m.entreprise)} recherche ${nbPlaces(m)} ${nbPlaces(m) > 1 ? 'personnes' : 'personne'} — <strong>${fcfa(montantParPersonne(m))}</strong> chacune</p>
        <div class="hero-boutons"><button class="btn btn-blanc-plein" onclick="ouvrirOffre(${m.id})">Voir l'offre →</button></div>
      </div>
      ${m.image_url ? '' : `<div class="carrousel-deco">${iconCategorie(m.categorie)}</div>`}`;
    piste.appendChild(slide);
  });
  if (intro) piste.prepend(intro);

  const nb = piste.children.length;
  const points = document.getElementById('carrousel-points');
  points.innerHTML = nb > 1 ? Array.from({ length: nb }, (_, i) =>
    `<button class="carrousel-point${i === 0 ? ' actif' : ''}" onclick="allerDiapo(${i})" aria-label="Diapo ${i + 1}"></button>`).join('') : '';
  carrouselIndex = 0;
  piste.scrollTo({ left: 0 });
  demarrerCarrousel();
}

function allerDiapo(i) {
  const piste = document.getElementById('carrousel-piste');
  if (!piste || !piste.children.length) return;
  carrouselIndex = (i + piste.children.length) % piste.children.length;
  piste.scrollTo({ left: piste.clientWidth * carrouselIndex, behavior: 'smooth' });
  demarrerCarrousel();
}

function demarrerCarrousel() {
  clearInterval(carrouselTimer);
  const piste = document.getElementById('carrousel-piste');
  if (!piste || piste.children.length < 2) return;
  carrouselTimer = setInterval(() => {
    if (!document.getElementById('page-accueil')?.classList.contains('active') || document.hidden) return;
    allerDiapo(carrouselIndex + 1);
  }, 6000);
}

// Suivre le glissement au doigt pour mettre à jour les points.
document.getElementById('carrousel-piste')?.addEventListener('scroll', (e) => {
  const piste = e.currentTarget;
  const i = Math.round(piste.scrollLeft / Math.max(1, piste.clientWidth));
  if (i !== carrouselIndex) { carrouselIndex = i; demarrerCarrousel(); }
  document.querySelectorAll('.carrousel-point').forEach((p, j) => p.classList.toggle('actif', j === i));
}, { passive: true });

function rechercherDepuisAccueil() {
  const q = document.getElementById('accueil-recherche-input').value;
  allerVersCategorie('Tous');
  const input = document.getElementById('recherche-input');
  if (input) input.value = q;
  filtrerMissions();
}

/* ══════════════════════════════════════════
   FORMULAIRE : TOTAL + COUVERTURE
══════════════════════════════════════════ */
function majTotalOffre() {
  const places = parseInt(document.getElementById('champ-places').value, 10) || 0;
  const montant = parseInt(document.getElementById('champ-montant').value, 10) || 0;
  const el = document.getElementById('total-offre');
  if (!el) return;
  el.innerHTML = places && montant
    ? `Budget total : <strong>${fcfa(places * montant)}</strong> <span>(${places} × ${fcfa(montant)})</span>`
    : 'Budget total : <strong>—</strong>';
}

let fichierCouverture = null;
function choisirCouverture(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { afficherToast('warning','Choisis une image (JPG, PNG...)','rouge'); event.target.value=''; return; }
  if (file.size > 3 * 1024 * 1024) { afficherToast('warning','Image trop lourde (max 3 Mo)','rouge'); event.target.value=''; return; }
  fichierCouverture = file;
  const img = document.getElementById('couverture-apercu');
  img.src = URL.createObjectURL(file); img.style.display = 'block';
  document.getElementById('couverture-texte').innerHTML = `${icon('camera')} Changer l'image`;
}

function filtrerMissions() {
  const input     = document.getElementById('recherche-input');
  const triSelect = document.getElementById('tri-select');
  const grille    = document.getElementById('missions-grille');
  const nbEl      = document.getElementById('nb-resultats');
  if (!grille) return;
  const recherche = input ? input.value.toLowerCase() : '';
  const tri       = triSelect ? triSelect.value : 'recent';
  const favoris   = lireFavoris();
  toutesLesMissions.forEach(m => { m.fav = favoris.has(m.id); });
  let resultats = toutesLesMissions.filter(m => {
    const matchCat  = filtreCourant === 'Tous'
      || (filtreCourant === 'Favoris' ? m.fav : m.categorie === filtreCourant);
    const comps = Array.isArray(m.competences) ? m.competences.join(' ') : '';
    const matchRech = [m.titre, m.entreprise, m.categorie, m.description, comps].join(' ').toLowerCase().includes(recherche);
    return matchCat && matchRech;
  });
  if (tri === 'salaire-desc') resultats.sort((a,b) => montantParPersonne(b) - montantParPersonne(a));
  if (tri === 'salaire-asc')  resultats.sort((a,b) => montantParPersonne(a) - montantParPersonne(b));
  if (tri === 'places')       resultats.sort((a,b) => placesRestantes(b) - placesRestantes(a));
  if (nbEl) nbEl.textContent = resultats.length;
  if (resultats.length === 0) {
    grille.innerHTML = toutesLesMissions.length === 0
      ? `<div class="aucun-resultat"><div style="font-size:48px">${icon('clipboard')}</div><p>Aucune mission disponible pour l'instant.<br><span style="font-size:13px">Sois le premier à publier une mission !</span></p></div>`
      : filtreCourant === 'Favoris' && !recherche
      ? `<div class="aucun-resultat"><div style="font-size:48px">${icon('starOutline')}</div><p>Aucun favori pour l'instant.<br><span style="font-size:13px">Touche l'étoile d'une mission pour la retrouver ici.</span></p></div>`
      : `<div class="aucun-resultat"><div style="font-size:48px">${icon('search')}</div><p>Aucune mission trouvée pour cette recherche.</p></div>`;
  } else {
    grille.innerHTML = resultats.map(rendreCarte).join('');
  }
}

function changerFiltre(btn) {
  document.querySelectorAll('#filtres-ligne .filtre-cat-btn').forEach(b => b.classList.remove('actif'));
  btn.classList.add('actif');
  filtreCourant = btn.getAttribute('data-cat');
  filtrerMissions();
}

function allerVersCategorie(cat) {
  allerVers('missions');
  filtreCourant = cat;
  document.querySelectorAll('#filtres-ligne .filtre-cat-btn').forEach(b => {
    b.classList.toggle('actif', b.getAttribute('data-cat') === cat);
  });
  filtrerMissions();
}

// Favoris gardés dans le navigateur (localStorage) pour survivre au
// rechargement de la page / à la fermeture de l'application.
function lireFavoris() {
  try { return new Set(JSON.parse(localStorage.getItem('talentci_favoris') || '[]')); }
  catch { return new Set(); }
}
function ecrireFavoris(set) {
  try { localStorage.setItem('talentci_favoris', JSON.stringify([...set])); } catch {}
}

function toggleFav(id) {
  const favoris = lireFavoris();
  const estFav = !favoris.has(id);
  if (estFav) favoris.add(id); else favoris.delete(id);
  ecrireFavoris(favoris);
  afficherToast(estFav ? 'starFilled' : 'starOutline', estFav ? 'Offre sauvegardée !' : 'Retirée des favoris', estFav ? 'vert' : '');
  filtrerMissions();
  rendreAccueil();
}

/* ══════════════════════════════════════════
   FORMULAIRE ENTREPRISE — HELPERS
══════════════════════════════════════════ */
function ajouterCompetence(event) {
  // Voir la note sur ajouterCompetenceProfil : le bouton "+ Ajouter"
  // (ajouterCompetenceDepuisInput) est le chemin fiable sur mobile.
  if (event.key !== 'Enter') return;
  event.preventDefault();
  ajouterCompetenceDepuisInput();
}
function ajouterCompetenceDepuisInput() {
  const input = document.getElementById('champ-competence-input');
  const val = input.value.trim();
  if (!val || competencesSaisies.includes(val)) { input.value = ''; return; }
  if (competencesSaisies.length >= 6) { afficherToast('warning','Maximum 6 compétences',''); return; }
  competencesSaisies.push(val);
  input.value = '';
  afficherChips();
}
function supprimerCompetence(i) { competencesSaisies.splice(i,1); afficherChips(); }
function afficherChips() {
  const c = document.getElementById('chips-competences');
  if (c) c.innerHTML = competencesSaisies.map((comp,i) =>
    `<span class="chip">${escHtml(comp)} <span class="chip-suppr" onclick="supprimerCompetence(${i})">×</span></span>`
  ).join('');
}
function reinitialiserFormulaire() {
  ['champ-titre','champ-description','champ-montant'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  const placesEl = document.getElementById('champ-places'); if (placesEl) placesEl.value = '1';
  majTotalOffre();
  fichierCouverture = null;
  const couv = document.getElementById('champ-couverture'); if (couv) couv.value = '';
  const apercu = document.getElementById('couverture-apercu'); if (apercu) { apercu.src = ''; apercu.style.display = 'none'; }
  const couvTxt = document.getElementById('couverture-texte'); if (couvTxt) couvTxt.innerHTML = `${icon('camera')} Ajouter une image (JPG/PNG, 3 Mo max)`;
  const catEl = document.getElementById('champ-categorie'); if(catEl) catEl.value='';
  const compEl = document.getElementById('champ-competence-input'); if(compEl) compEl.value='';
  competencesSaisies = [];
  afficherChips();
  document.getElementById('succes-publication').classList.remove('visible');
  const fa = document.querySelector('.form-actions'); if(fa) fa.style.display = 'flex';
}

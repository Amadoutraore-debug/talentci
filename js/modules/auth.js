/* TalentCI — modules/auth.js
   Authentification : profils, inscription, connexion (e-mail, Google, Facebook), mot de passe oublié, déconnexion, fenêtre de connexion. */

/* ══════════════════════════════════════════
   VÉRIFICATION DB AVANT CHAQUE OPÉRATION
══════════════════════════════════════════ */
function verifierDB(action) {
  if (!dbPret || !db) {
    if (!createClient) { afficherToast('warning', 'Pas de connexion Internet — réessaie plus tard', 'rouge'); return false; }
    afficherToast('settings', 'Configure d\'abord la base de données !', 'rouge');
    ouvrirConfigDB();
    return false;
  }
  return true;
}

/* ══════════════════════════════════════════
   PROFILS
══════════════════════════════════════════ */
async function chargerProfil(userId) {
  if (!verifierDB()) return null;
  const { data, error } = await db
    .from('profils')
    .select('id, user_id, nom, type, universite, competences, avatar_url, created_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.warn('Erreur profil:', error.message); return null; }
  if (data) return data;
  // Compte sans fiche profil (créé avant le trigger on_auth_user_created,
  // ou trigger absent) : on la crée maintenant, sinon l'utilisateur est
  // "connecté sans compte" (pas de nom, pas de type, rien ne marche).
  if (utilisateurConnecte && utilisateurConnecte.id === userId) return await reparerProfil(utilisateurConnecte);
  return null;
}

// Une seule réparation à la fois (la connexion et onAuthStateChange
// peuvent la déclencher en même temps).
let reparationProfilEnCours = null;
function reparerProfil(user) {
  if (!reparationProfilEnCours) {
    reparationProfilEnCours = creerProfilManquant(user).finally(() => { reparationProfilEnCours = null; });
  }
  return reparationProfilEnCours;
}

async function creerProfilManquant(user) {
  const meta = user.user_metadata || {};
  const profil = {
    user_id: user.id,
    nom: meta.full_name || meta.name || (user.email || 'Utilisateur').split('@')[0],
    type: meta.role === 'entreprise' ? 'entreprise' : 'etudiant',
    universite: meta.universite || '',
    avatar_url: meta.avatar_url || meta.picture || null
  };
  const { data, error } = await db.from('profils').insert(profil)
    .select('id, user_id, nom, type, universite, competences, avatar_url, created_at').maybeSingle();
  if (error) {
    console.warn('Création du profil impossible :', error.message);
    // Conflit = le profil existe (créé entre-temps) : on le relit.
    const { data: existant } = await db.from('profils')
      .select('id, user_id, nom, type, universite, competences, avatar_url, created_at')
      .eq('user_id', user.id).maybeSingle();
    return existant || null;
  }
  return data;
}

// Réglages publics du serveur d'authentification Supabase : quels modes
// de connexion sont activés, confirmation d'e-mail obligatoire ou non.
// Permet de ne montrer que les boutons qui fonctionnent vraiment
// (un bouton Google non activé mène sinon à une page d'erreur brute).
let reglagesAuth = null;
async function chargerReglagesAuth() {
  const { url, key } = chargerConfig();
  if (!url || !key) return;
  try {
    const rep = await avecDelai(fetch(url.replace(/\/$/, '') + '/auth/v1/settings', { headers: { apikey: key } }), 8000);
    if (rep.ok) reglagesAuth = await rep.json();
  } catch (e) { console.warn('Réglages auth indisponibles :', e.message); }
  appliquerReglagesAuth();
}
function appliquerReglagesAuth() {
  if (!reglagesAuth || !reglagesAuth.external) return;
  const google = !!reglagesAuth.external.google;
  const facebook = !!reglagesAuth.external.facebook;
  const g = document.getElementById('btn-oauth-google');
  const f = document.getElementById('btn-oauth-facebook');
  if (g) g.style.display = google ? '' : 'none';
  if (f) f.style.display = facebook ? '' : 'none';
  const bloc = document.getElementById('auth-oauth');
  if (bloc) bloc.style.display = google || facebook ? '' : 'none';
}

// Évite un bouton qui "tourne" indéfiniment sur un réseau mobile instable.
function avecDelai(promesse, ms) {
  return Promise.race([
    promesse,
    new Promise((_, rejeter) => setTimeout(() => rejeter(new Error('Délai dépassé')), ms))
  ]);
}

function basculerMdp(id, bouton) {
  const input = document.getElementById(id);
  if (!input) return;
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  bouton.innerHTML = `<svg class="icon"><use href="#i-${visible ? 'eye' : 'eye-off'}"/></svg>`;
  bouton.setAttribute('aria-label', visible ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
}

/* ══════════════════════════════════════════
   INSCRIPTION
══════════════════════════════════════════ */
async function sInscrire() {
  if (!verifierDB()) return;
  const nom   = document.getElementById('ins-nom').value.trim();
  const email = document.getElementById('ins-email').value.trim().toLowerCase();
  const pass  = document.getElementById('ins-pass').value;
  const type  = document.getElementById('ins-type').value;
  const univ  = document.getElementById('ins-univ').value.trim();

  if (!nom || !email || !pass) { afficherMsgAuth('Remplis tous les champs obligatoires.', 'erreur'); return; }
  if (pass.length < 6) { afficherMsgAuth('Le mot de passe doit faire au moins 6 caractères.', 'erreur'); return; }

  setBtnLoading('btn-sinscrire', true, 'Création...');

  let authData = null, authErr = null;
  try {
    ({ data: authData, error: authErr } = await avecDelai(db.auth.signUp({
    email, password: pass,
    options: {
      data: { full_name: nom, role: type, universite: type === 'etudiant' ? univ : '' },
      // Le lien de l'e-mail de confirmation ramène sur le site (sinon Supabase
      // utilise la "Site URL" du projet, souvent restée sur localhost).
      emailRedirectTo: urlRetourSite()
    }
  }), 20000));
  } catch (e) { authErr = e; }

  if (authErr) {
    afficherMsgAuth(tradErreur(authErr.message), 'erreur', authErr.message);
    setBtnLoading('btn-sinscrire', false, 'Créer mon compte →');
    return;
  }

  // Quand l'e-mail a DÉJÀ un compte, Supabase ne renvoie pas d'erreur (pour
  // ne pas révéler qui est inscrit) mais un utilisateur sans "identities" et
  // n'envoie aucun e-mail. Sans ce test, l'inscription semblait réussir
  // alors que rien ne se passait.
  if (authData?.user && Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
    setBtnLoading('btn-sinscrire', false, 'Créer mon compte →');
    basculerAuth('connexion');
    document.getElementById('cx-email').value = email;
    afficherMsgAuth('Cet e-mail a déjà un compte TalentCI. Connecte-toi avec ton mot de passe, ou clique sur « Mot de passe oublié ? ».', 'erreur');
    return;
  }

  // Le profil (table `profils`) est créé automatiquement côté serveur par
  // le trigger `on_auth_user_created` (voir sql/installation.sql) à partir des
  // métadonnées passées ci-dessus. Ça fonctionne même si la confirmation
  // d'email est activée et qu'aucune session n'existe encore côté client.

  setBtnLoading('btn-sinscrire', false, 'Créer mon compte →');

  if (!authData.session) {
    // Confirmation d'e-mail requise : on reste dans la fenêtre avec des
    // instructions claires au lieu d'un message qui disparaît.
    document.getElementById('cx-email').value = email;
    document.getElementById('inscription-ok-email').textContent = email;
    basculerAuth('inscription-ok');
  } else {
    fermerAuth();
    utilisateurConnecte = authData.session.user;
    profilConnecte = await chargerProfil(authData.session.user.id);
    mettreAJourNavbar();
    mettreAJourProfil();
    afficherToast('party', 'Bienvenue ' + nom + ' !', 'vert');
    await ajouterNotification({
      user_id: authData.user.id,
      type:'systeme', icone:'party', icone_bg:'#FFF1E6', icone_color:'#B54708',
      texte: 'Bienvenue sur TalentCI, <b>' + escHtml(nom) + '</b> !', lue: false
    });
  }
}

/* ══════════════════════════════════════════
   CONNEXION
══════════════════════════════════════════ */
async function seConnecter() {
  if (!verifierDB()) return;
  // Les claviers de téléphone mettent souvent une majuscule au début
  // de l'e-mail ou un espace à la fin : on normalise.
  const email = document.getElementById('cx-email').value.trim().toLowerCase();
  const pass  = document.getElementById('cx-pass').value;
  if (!email || !pass) { afficherMsgAuth('Remplis tous les champs.', 'erreur'); return; }
  setBtnLoading('btn-seconnecter', true, 'Connexion...');
  let data = null, error = null;
  try {
    ({ data, error } = await avecDelai(db.auth.signInWithPassword({ email, password: pass }), 20000));
  } catch (e) { error = e; }
  if (error) {
    afficherMsgAuth(tradErreur(error.message), 'erreur', error.message);
    if (error.message.includes('Email not confirmed')) afficherActionAuth('Renvoyer l\'e-mail de confirmation', () => renvoyerConfirmation());
    else if (error.message.includes('Invalid login')) afficherActionAuth('Mot de passe oublié ? Recevoir un lien', motDePasseOublie);
    setBtnLoading('btn-seconnecter', false, 'Se connecter →');
    return;
  }
  setBtnLoading('btn-seconnecter', false, 'Se connecter →');
  fermerAuth();
  utilisateurConnecte = data.user;
  profilConnecte = await chargerProfil(data.user.id);
  mettreAJourNavbar();
  mettreAJourProfil();
  const nom = profilConnecte?.nom || data.user.email.split('@')[0];
  afficherToast('login', 'Bienvenue ' + nom + ' !', 'vert');
  await chargerMissions();
  await chargerNotifications();
}

/* ══════════════════════════════════════════
   CONNEXION GOOGLE (OAuth)
   ─────────────────────────────────────────
   Redirige vers Google puis revient sur le site avec une session
   active ; onAuthStateChange (voir demarrerApp) prend le relais.
   Le profil (table profils) est créé automatiquement par le trigger
   on_auth_user_created, qui récupère aussi la photo Google si dispo.
   Nécessite d'avoir activé le provider Google dans Supabase
   (Authentication → Providers → Google) — voir le README.
══════════════════════════════════════════ */
function urlRetourSite() {
  return window.location.origin + window.location.pathname;
}

// provider : 'google' ou 'facebook'. Chaque fournisseur doit être activé
// dans Supabase (Authentication → Sign In / Providers) — voir le README.
async function connecterAvecFournisseur(provider) {
  if (!verifierDB()) return;
  const noms = { google: 'Google', facebook: 'Facebook' };
  const { error } = await db.auth.signInWithOAuth({
    provider,
    options: { redirectTo: urlRetourSite() }
  });
  if (error) afficherToast('error', 'Erreur ' + (noms[provider] || provider) + ' : ' + tradErreur(error.message), 'rouge');
}
function connecterAvecGoogle() { return connecterAvecFournisseur('google'); }

// Supabase renvoie les erreurs de connexion (Google/Facebook refusé,
// lien e-mail expiré...) dans l'adresse de retour : on les affiche au
// lieu de laisser l'utilisateur sans explication.
function afficherErreurRetourAuth() {
  const params = new URLSearchParams(location.hash.slice(1) + '&' + location.search.slice(1));
  const desc = params.get('error_description');
  if (!desc) return;
  afficherToast('error', 'Connexion impossible : ' + tradErreur(desc.replace(/\+/g, ' ')), 'rouge');
  history.replaceState(null, '', location.pathname);
}

/* ══════════════════════════════════════════
   MOT DE PASSE OUBLIÉ / E-MAIL DE CONFIRMATION
══════════════════════════════════════════ */
async function motDePasseOublie() {
  if (!verifierDB()) return;
  const email = document.getElementById('cx-email').value.trim().toLowerCase();
  if (!email) { afficherMsgAuth('Écris ton adresse e-mail ci-dessus, puis clique à nouveau sur « Mot de passe oublié ».', 'erreur'); return; }
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: urlRetourSite() });
  if (error) { afficherMsgAuth(tradErreur(error.message), 'erreur'); return; }
  afficherMsgAuth('Si un compte existe pour ' + email + ', un e-mail pour choisir un nouveau mot de passe vient d\'être envoyé. Pense à regarder dans les spams.', 'ok');
}

async function renvoyerConfirmation(emailForce) {
  const email = (typeof emailForce === 'string' && emailForce) || document.getElementById('cx-email').value.trim().toLowerCase();
  if (!email) return;
  const { error } = await db.auth.resend({ type: 'signup', email, options: { emailRedirectTo: urlRetourSite() } });
  if (error) { afficherMsgAuth(tradErreur(error.message), 'erreur'); return; }
  afficherMsgAuth('E-mail de confirmation renvoyé à ' + email + '. Regarde aussi dans les spams.', 'ok');
}

// Appelé quand l'utilisateur revient via le lien "nouveau mot de passe".
function ouvrirNouveauMotDePasse() {
  document.getElementById('modal-nouveau-mdp').classList.add('visible');
}
async function enregistrerNouveauMotDePasse() {
  const pass = document.getElementById('nouveau-mdp').value;
  if (pass.length < 6) { afficherToast('warning', 'Au moins 6 caractères', 'rouge'); return; }
  setBtnLoading('btn-nouveau-mdp', true, 'Enregistrement...');
  const { error } = await db.auth.updateUser({ password: pass });
  setBtnLoading('btn-nouveau-mdp', false, 'Enregistrer →');
  if (error) { afficherToast('error', tradErreur(error.message), 'rouge'); return; }
  document.getElementById('modal-nouveau-mdp').classList.remove('visible');
  afficherToast('check', 'Mot de passe modifié, tu es connecté(e) !', 'vert');
}

/* ══════════════════════════════════════════
   DÉCONNEXION
══════════════════════════════════════════ */
async function seDeconnecter() {
  if (!verifierDB()) return;
  await db.auth.signOut();
  utilisateurConnecte = null; profilConnecte = null;
  mesCandidaturesIds = new Set();
  mettreAJourNavbar();
  filtrerMissions();
  allerVers('accueil');
  afficherToast('logout', 'Tu es déconnecté(e)', '');
}

/* ══════════════════════════════════════════
   AUTH MODAL
══════════════════════════════════════════ */
function ouvrirAuth(onglet) {
  if (!verifierDB()) return;
  document.getElementById('modal-auth').classList.add('visible');
  const msg = document.getElementById('auth-message');
  if (msg) msg.style.display = 'none';
  basculerAuth(onglet || 'connexion');
}
function fermerAuth() { document.getElementById('modal-auth').classList.remove('visible'); }
document.getElementById('modal-auth').addEventListener('click', e => { if (e.target === e.currentTarget) fermerAuth(); });
function basculerAuth(onglet) {
  const msgAuth = document.getElementById('auth-message');
  if (msgAuth) msgAuth.style.display = 'none';
  const estCx = onglet === 'connexion';
  const estOk = onglet === 'inscription-ok';
  document.getElementById('form-connexion').style.display  = estCx ? 'block' : 'none';
  document.getElementById('form-inscription').style.display = !estCx && !estOk ? 'block' : 'none';
  document.getElementById('form-inscription-ok').style.display = estOk ? 'block' : 'none';
  const oauth = document.getElementById('auth-oauth');
  if (oauth) oauth.classList.toggle('masque-temporaire', estOk);
  const tabCx  = document.getElementById('tab-connexion');
  const tabIns = document.getElementById('tab-inscription');
  tabCx.style.color = estCx ? 'var(--vert)' : 'var(--texte-3)';
  tabCx.style.borderBottom = estCx ? '2px solid var(--vert)' : '2px solid transparent';
  tabIns.style.color = estCx ? 'var(--texte-3)' : 'var(--vert)';
  tabIns.style.borderBottom = estCx ? '2px solid transparent' : '2px solid var(--vert)';
}
// Ajoute un bouton sous le message d'erreur (ex : renvoyer l'e-mail).
function afficherActionAuth(libelle, action) {
  const el = document.getElementById('auth-message');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'auth-message-action';
  btn.textContent = libelle;
  btn.onclick = action;
  el.appendChild(document.createElement('br'));
  el.appendChild(btn);
}

function afficherMsgAuth(texte, type, detail) {
  const el = document.getElementById('auth-message');
  el.textContent = texte;
  // Message technique d'origine (petit, en dessous) : permet de
  // diagnostiquer un problème à partir d'une simple capture d'écran.
  if (detail && detail !== texte) {
    const d = document.createElement('small');
    d.className = 'auth-message-detail';
    d.textContent = 'Détail : ' + detail;
    el.appendChild(d);
  }
  el.style.display = 'block';
  if (type === 'erreur') { el.style.background='#FCEBEB'; el.style.color='#A32D2D'; el.style.border='1px solid #F09595'; }
  else { el.style.background='var(--vert-clair)'; el.style.color='var(--vert-fonce)'; el.style.border='1px solid var(--vert)'; }
}

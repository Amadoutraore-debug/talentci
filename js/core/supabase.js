/* TalentCI — core/supabase.js
   Client Supabase (db, dbPret), chargement de la configuration et fenêtre « Configuration Supabase ». */

// La bibliothèque supabase-js vient d'un CDN : si le réseau est mauvais
// (ou hors-ligne) elle peut ne pas être chargée. On ne doit pas planter
// tout le script pour autant — la navigation doit continuer à marcher.
const createClient = window.supabase?.createClient;
let db = null;
let dbPret = false;

function initSupabase(url, key) {
  if (!url || !key) return false;
  if (!createClient) { console.error('supabase-js non chargé (problème réseau ?)'); return false; }
  try {
    db = createClient(url, key);
    dbPret = true;
    return true;
  } catch(e) {
    console.error('Erreur init Supabase:', e);
    dbPret = false;
    return false;
  }
}

// Charger la config : priorité au code, puis localStorage
function chargerConfig() {
  let url = CONFIG_SUPABASE.url.trim();
  let key = CONFIG_SUPABASE.key.trim();

  if (!url || !key) {
    const saved = localStorage.getItem('talentci_supabase_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        url = parsed.url || '';
        key = parsed.key || '';
      } catch(e) {}
    }
  }
  return { url, key };
}

/* ══════════════════════════════════════════
   INTERFACE CONFIG DB
══════════════════════════════════════════ */
function ouvrirConfigDB() {
  const { url, key } = chargerConfig();
  const inputUrl = document.getElementById('input-supabase-url');
  const inputKey = document.getElementById('input-supabase-key');
  if (inputUrl) inputUrl.value = url || '';
  if (inputKey) inputKey.value = key || '';
  validerChampURL(inputUrl);
  validerChampKey(inputKey);
  document.getElementById('config-status').className = 'config-status';
  document.getElementById('modal-config-db').classList.add('visible');
}

function fermerConfigDB() {
  document.getElementById('modal-config-db').classList.remove('visible');
}

document.getElementById('modal-config-db').addEventListener('click', e => {
  if (e.target === e.currentTarget) fermerConfigDB();
});

function validerChampURL(input) {
  if (!input) return;
  const val = input.value.trim();
  const iconEl = document.getElementById('icon-url');
  if (!val) { input.className = 'config-input'; if(iconEl) iconEl.textContent = ''; return; }
  const ok = val.startsWith('https://') && val.includes('.supabase.co');
  input.className = 'config-input ' + (ok ? 'ok' : 'err');
  if(iconEl) iconEl.innerHTML = ok ? ICONS.check : ICONS.error;
}

function validerChampKey(input) {
  if (!input) return;
  const val = input.value.trim();
  const iconEl = document.getElementById('icon-key');
  if (!val) { input.className = 'config-input'; if(iconEl) iconEl.textContent = ''; return; }
  const ok = val.startsWith('eyJ') && val.length > 50;
  input.className = 'config-input ' + (ok ? 'ok' : 'err');
  if(iconEl) iconEl.innerHTML = ok ? ICONS.check : ICONS.error;
}

async function testerConnexion() {
  const url = document.getElementById('input-supabase-url').value.trim();
  const key = document.getElementById('input-supabase-key').value.trim();
  const statusEl = document.getElementById('config-status');

  if (!url || !key) {
    statusEl.textContent = 'Remplis les deux champs avant de tester.';
    statusEl.className = 'config-status err';
    return;
  }

  statusEl.textContent = 'Test en cours...';
  statusEl.className = 'config-status ok';

  try {
    const testClient = createClient(url, key);
    const { error } = await testClient.from('profils').select('id').limit(1);
    if (error && !error.message.includes('does not exist') && !error.message.includes('relation')) {
      statusEl.textContent = 'Erreur : ' + error.message;
      statusEl.className = 'config-status err';
    } else {
      statusEl.textContent = 'Connexion réussie ! Supabase répond correctement.';
      statusEl.className = 'config-status ok';
    }
  } catch(e) {
    statusEl.textContent = 'Impossible de joindre Supabase. Vérifie l\'URL.';
    statusEl.className = 'config-status err';
  }
}

function sauvegarderConfig() {
  const url = document.getElementById('input-supabase-url').value.trim();
  const key = document.getElementById('input-supabase-key').value.trim();
  const statusEl = document.getElementById('config-status');

  if (!url || !key) {
    statusEl.textContent = 'Remplis les deux champs obligatoires.';
    statusEl.className = 'config-status err';
    return;
  }
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    statusEl.textContent = 'URL invalide. Elle doit commencer par https:// et se terminer par .supabase.co';
    statusEl.className = 'config-status err';
    return;
  }
  if (!key.startsWith('eyJ')) {
    statusEl.textContent = 'Clé invalide. Elle doit commencer par eyJ';
    statusEl.className = 'config-status err';
    return;
  }

  localStorage.setItem('talentci_supabase_config', JSON.stringify({ url, key }));

  const ok = initSupabase(url, key);
  if (ok) {
    fermerConfigDB();
    document.getElementById('config-banner').style.display = 'none';
    afficherToast('check', 'Base de données connectée avec succès !', 'vert');
    setTimeout(async () => {
      await demarrerApp();
    }, 300);
  } else {
    statusEl.textContent = 'Impossible d\'initialiser le client Supabase.';
    statusEl.className = 'config-status err';
  }
}

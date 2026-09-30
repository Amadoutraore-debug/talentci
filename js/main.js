/* TalentCI — main.js
   Point d'entrée : démarrage de l'application au chargement de la page. Chargé EN DERNIER. */

/* ══════════════════════════════════════════
   INITIALISATION
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  const { url, key } = chargerConfig();

  if (url && key && !createClient) {
    afficherAlerteReseau();
  } else if (url && key) {
    const ok = initSupabase(url, key);
    if (!ok) {
      montrerAlertDB();
    } else {
      await demarrerApp();
    }
  } else {
    montrerAlertDB();
    afficherAlerteAccueil();
  }

  afficherErreurRetourAuth();

  // Lien direct (#/missions...) ou application rouverte sur une page.
  const pageInitiale = pageDepuisHash();
  if (pageInitiale && pageInitiale !== 'accueil') allerVers(pageInitiale, { historique: false });
});

function montrerAlertDB() {
  document.getElementById('config-banner').style.display = 'flex';
}

function afficherAlerteAccueil() {
  const el = document.getElementById('alerte-db-accueil');
  if (el) {
    el.innerHTML = `<div class="db-alerte">
      <div class="db-alerte-icone">${icon('database')}</div>
      <div class="db-alerte-texte"><strong>Base de données non configurée</strong><br>
      Configure Supabase pour activer les inscriptions, les missions en temps réel et les candidatures.</div>
      <button class="db-alerte-btn" onclick="ouvrirConfigDB()">Configurer →</button>
    </div>`;
  }
}

function afficherAlerteReseau() {
  const el = document.getElementById('alerte-db-accueil');
  if (el) {
    el.innerHTML = `<div class="db-alerte">
      <div class="db-alerte-icone">${icon('warning')}</div>
      <div class="db-alerte-texte"><strong>Connexion impossible</strong><br>
      Vérifie ta connexion Internet puis réessaie.</div>
      <button class="db-alerte-btn" onclick="location.reload()">Réessayer</button>
    </div>`;
  }
}

async function demarrerApp() {
  if (!dbPret || !db) return;
  chargerReglagesAuth();

  // ⚠️ Le callback ne doit PAS attendre (await) d'autres appels Supabase :
  // supabase-js garde un verrou pendant son exécution, et chargerProfil()
  // a besoin de ce même verrou → blocage de l'app (connexion qui "tourne"
  // indéfiniment). On diffère donc le travail avec setTimeout.
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') setTimeout(ouvrirNouveauMotDePasse, 0);
    setTimeout(async () => {
      const etaitConnecte = !!utilisateurConnecte;
      if (session && session.user) {
        utilisateurConnecte = session.user;
        profilConnecte = await chargerProfil(session.user.id);
      } else {
        utilisateurConnecte = null;
        profilConnecte = null;
      }
      mettreAJourNavbar();
      mettreAJourProfil();
      // Retour de Google OAuth ou connexion dans un autre onglet :
      // recharger ce qui dépend de l'utilisateur.
      if (etaitConnecte !== !!utilisateurConnecte) {
        chargerNotifications();
        chargerMissions();
      }
    }, 0);
  });

  const { data: { session } } = await db.auth.getSession();
  if (session) {
    utilisateurConnecte = session.user;
    profilConnecte = await chargerProfil(session.user.id);
    mettreAJourNavbar();
    mettreAJourProfil();
  }

  await chargerMissions();
  await chargerStats();
  await chargerNotifications();

  const el = document.getElementById('alerte-db-accueil');
  if (el) el.innerHTML = '';
}

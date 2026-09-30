/* TalentCI — core/utils.js
   Utilitaires : toast, formatage, échappement HTML/CSS, traduction des erreurs. */

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function afficherToast(icone, texte, couleur) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.classList.remove('vert','rouge');
  if (couleur) toast.classList.add(couleur);
  document.getElementById('toast-icone').innerHTML = ICONS[icone] || '';
  document.getElementById('toast-texte').textContent = texte;
  toast.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}

/* ══════════════════════════════════════════
   UTILITAIRES
══════════════════════════════════════════ */
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function setBtnLoading(id, loading, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? `<span class="spinner"></span>${label}` : label;
}

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'}); }
  catch { return iso; }
}

// Protection XSS
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
// Rend une URL sûre à placer dans url('...') en CSS (évite qu'une URL
// piégée ne ferme la chaîne et injecte du style/HTML).
function cssUrl(url) {
  if (!url) return '';
  return String(url).replace(/["'()\\\s<>]/g,
    c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
}
function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function tradErreur(msg) {
  if (!msg) return 'Erreur inconnue';
  if (msg.includes('Invalid login')) return 'E-mail ou mot de passe incorrect. Vérifie les majuscules du mot de passe (touche l\'œil pour l\'afficher). Si tu t\'es inscrit avec Google, utilise le bouton Google.';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'Cet email est déjà utilisé. Connecte-toi !';
  if (msg.includes('Password should be')) return 'Le mot de passe doit faire au moins 6 caractères.';
  if (msg.includes('Unable to validate email')) return 'Adresse email invalide.';
  if (msg.includes('Email not confirmed')) return 'Confirme ton email avant de te connecter.';
  if (msg.includes('rate limit')) return 'Trop de tentatives ou d\'e-mails envoyés. Réessaie dans une heure.';
  if (msg.includes('provider is not enabled') || msg.includes('Unsupported provider')) return 'Ce mode de connexion n\'est pas encore activé sur TalentCI.';
  if (msg.includes('Error sending') || msg.includes('sending confirmation') || msg.includes('sending recovery')) return 'L\'e-mail n\'a pas pu être envoyé. Réessaie plus tard ou utilise Google.';
  if (msg.includes('expired') || msg.includes('otp_expired')) return 'Le lien a expiré. Demande un nouvel e-mail.';
  if (msg.includes('Signups not allowed')) return 'Les inscriptions sont fermées pour le moment.';
  if (msg.includes('Délai dépassé') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) return 'Le serveur ne répond pas. Vérifie ta connexion Internet et réessaie.';
  if (msg.includes('not authorized') || msg.includes('Email address not authorized')) return 'L\'e-mail de confirmation n\'a pas pu être envoyé à cette adresse. Utilise Google ou contacte TalentCI.';
  if (msg.includes('User already registered')) return 'Cet email est déjà utilisé. Connecte-toi !';
  return msg;
}

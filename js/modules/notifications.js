/* TalentCI — modules/notifications.js
   Notifications de l'utilisateur connecté. */

/* ══════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════ */
async function ajouterNotification(notif) {
  if (!verifierDB()) return;
  if (!utilisateurConnecte && !notif.user_id) return;
  await db.from('notifications').insert({
    ...notif, user_id: notif.user_id || utilisateurConnecte?.id || null,
    created_at: new Date().toISOString()
  });
  await chargerNotifications();
}

async function chargerNotifications() {
  const liste = document.getElementById('notif-liste');
  if (!liste) return;
  if (!dbPret || !db) {
    liste.innerHTML = `<div style="text-align:center;padding:48px;color:var(--texte-3);"><div style="font-size:40px;margin-bottom:12px;">${icon('database')}</div><p>Configure la base de données pour voir tes notifications.</p><button class="btn btn-vert" style="margin-top:12px;" onclick="ouvrirConfigDB()">Configurer →</button></div>`;
    return;
  }
  if (!utilisateurConnecte) {
    liste.innerHTML = `<div style="text-align:center;padding:48px;color:var(--texte-3);"><div style="font-size:40px;margin-bottom:12px;">${icon('lock')}</div><p>Connecte-toi pour voir tes notifications.</p></div>`;
    return;
  }
  let query = db.from('notifications')
    .select('id, user_id, type, icone, icone_bg, icone_color, texte, montant, lue, created_at')
    .eq('user_id', utilisateurConnecte.id)
    .order('created_at', { ascending: false }).limit(30);
  if (filtreCourantNotif !== 'tous') query = query.eq('type', filtreCourantNotif);
  const { data, error } = await query;
  if (error) { liste.innerHTML = '<div style="text-align:center;padding:32px;color:var(--texte-3);">Impossible de charger les notifications.</div>'; return; }
  const notifs = data || [];
  // Compteur "non lues" sur TOUTES les notifications (et non sur la page
  // filtrée / limitée à 30), sinon le badge était faux avec un filtre actif.
  const { count } = await db.from('notifications').select('id', { count: 'exact', head: true })
    .eq('user_id', utilisateurConnecte.id).eq('lue', false);
  const nbNonLues = count || 0;
  const elBadge = document.getElementById('nb-non-lues');
  if (elBadge) elBadge.textContent = nbNonLues > 0 ? `(${nbNonLues} non lues)` : '(tout lu)';
  const btnNotifNav = document.getElementById('btn-notif-nav');
  if (btnNotifNav) btnNotifNav.classList.toggle('notif-badge-nav', nbNonLues > 0);
  document.getElementById('bottom-nav-notif')?.classList.toggle('a-des-alertes', nbNonLues > 0);
  if (notifs.length === 0) {
    liste.innerHTML = `<div style="text-align:center;padding:48px;color:var(--texte-3);"><div style="font-size:40px;margin-bottom:12px;">${icon('bell')}</div><p>Aucune notification pour l'instant.</p></div>`;
    return;
  }
  liste.innerHTML = notifs.map(n => `
    <div class="notif-item${n.lue ? '' : ' non-lue'}" onclick="marquerLu(${n.id}, ${n.icone === 'inbox' ? 'true' : 'false'})">
      <div class="notif-point ${n.lue ? 'invisible' : ''}"></div>
      <div class="notif-icone-rond ${classeIconeNotif(n.icone)}">${icon(n.icone) || icon('bell')}</div>
      <div class="notif-corps">
        <div class="notif-texte">${texteNotifSur(n.texte)}</div>
        <div class="notif-temps">${formatDate(n.created_at)}</div>
      </div>
      ${n.montant ? `<div class="notif-badge-montant">${escHtml(n.montant)}</div>` : ''}
    </div>`).join('');
}

// Le texte des notifications peut contenir du gras (<b>) ; tout le reste
// est échappé, pour qu'aucune balise ni script ne puisse s'y glisser.
function texteNotifSur(texte) {
  return escHtml(texte || '').replace(/&lt;(\/?)b&gt;/g, '<$1b>');
}

// Couleurs des icônes selon le type (charte orange / noir), au lieu des
// couleurs enregistrées en base avec chaque notification.
function classeIconeNotif(nomIcone) {
  if (nomIcone === 'party' || nomIcone === 'check') return 'notif-ic-succes';
  if (nomIcone === 'info' || nomIcone === 'error' || nomIcone === 'warning') return 'notif-ic-info';
  return 'notif-ic-neutre';
}

// versRecrutement : notification "X a postulé à ton offre" (icône inbox,
// envoyée par le trigger notifier_nouvelle_candidature) → on ouvre
// directement l'espace recrutement.
async function marquerLu(id, versRecrutement) {
  if (!verifierDB()) return;
  if (versRecrutement && (profilConnecte?.type === 'entreprise' || estAdmin())) allerVers('recrutement');
  await db.from('notifications').update({ lue: true }).eq('id', id);
  await chargerNotifications();
}

async function toutMarquerLu() {
  if (!verifierDB()) return;
  if (!utilisateurConnecte) return;
  await db.from('notifications').update({ lue: true }).eq('user_id', utilisateurConnecte.id).eq('lue', false);
  await chargerNotifications();
  afficherToast('check','Toutes les notifications sont lues !','vert');
}

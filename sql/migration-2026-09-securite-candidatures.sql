-- ══════════════════════════════════════════════════════════════
--  TALENTCI — MIGRATION : sécurité + gestion des candidatures
-- ══════════════════════════════════════════════════════════════
--  À exécuter UNE FOIS dans : Supabase Dashboard → SQL Editor,
--  sur une base où `schema.sql` a déjà été exécuté. Le script est
--  ré-exécutable sans erreur (drop ... if exists / create or replace).
--
--  Ce que ça corrige / ajoute :
--   1. 🔐 FAILLE : la policy "profils_modification_soi_meme" laissait
--      chaque utilisateur modifier TOUTES les colonnes de son profil,
--      y compris `type`. N'importe qui pouvait donc faire, depuis la
--      console du navigateur :
--        db.from('profils').update({ type: 'admin' }).eq('user_id', monId)
--      et obtenir les droits administrateur. Un trigger bloque
--      désormais tout changement de `type` qui ne vient pas d'un admin.
--   2. Seuls les comptes "entreprise" (et admin) peuvent publier une
--      mission — avant, un étudiant pouvait aussi en publier.
--   3. Notifications automatiques côté serveur :
--      - l'entreprise est prévenue quand un étudiant postule ;
--      - l'étudiant est prévenu quand sa candidature est acceptée
--        ou refusée.
--      (Le client ne peut créer des notifications que pour lui-même,
--       donc ces envois doivent passer par des triggers.)
-- ══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- 1. Interdire l'auto-promotion (changement de `type`)
-- ─────────────────────────────────────────
create or replace function public.proteger_type_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() est NULL quand la requête vient du SQL Editor / service_role :
  -- l'administrateur de la base garde donc la main via SQL.
  if new.type is distinct from old.type
     and auth.uid() is not null
     and not is_admin() then
    raise exception 'Modification du type de compte non autorisée';
  end if;
  -- user_id ne doit jamais changer (il relie le profil au compte).
  if new.user_id is distinct from old.user_id then
    raise exception 'Modification de user_id non autorisée';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_type_profil on profils;
create trigger proteger_type_profil
  before update on profils
  for each row execute function public.proteger_type_profil();

-- ─────────────────────────────────────────
-- 2. Publication de missions réservée aux entreprises (et admins)
-- ─────────────────────────────────────────
drop policy if exists "missions_creation_proprietaire" on missions;
create policy "missions_creation_proprietaire" on missions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from profils p
      where p.user_id = auth.uid() and p.type in ('entreprise','admin')
    )
  );

-- ─────────────────────────────────────────
-- 3. Notifications automatiques sur les candidatures
-- ─────────────────────────────────────────
-- Le texte des notifications est affiché en HTML côté client (pour le
-- gras) : tout contenu saisi par un utilisateur doit donc être échappé.
create or replace function public.echapper_html(t text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(replace(replace(coalesce(t, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#039;');
$$;

-- Nouvelle candidature → notifier l'entreprise propriétaire de la mission
create or replace function public.notifier_nouvelle_candidature()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  nom_etudiant text;
begin
  select id, user_id, titre into m from missions where id = new.mission_id;
  if m is null then return new; end if;
  select nom into nom_etudiant from profils where user_id = new.user_id;

  insert into notifications (user_id, type, icone, icone_bg, icone_color, texte)
  values (
    m.user_id, 'candidature', 'inbox', '#E6F1FB', '#185FA5',
    '<b>' || echapper_html(coalesce(nom_etudiant, 'Un étudiant')) || '</b> a postulé à « <b>'
      || echapper_html(m.titre) || '</b> ».'
  );
  return new;
end;
$$;

drop trigger if exists notifier_nouvelle_candidature on candidatures;
create trigger notifier_nouvelle_candidature
  after insert on candidatures
  for each row execute function public.notifier_nouvelle_candidature();

-- Candidature acceptée / refusée → notifier l'étudiant
create or replace function public.notifier_statut_candidature()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
begin
  if new.statut is not distinct from old.statut or new.statut = 'en_attente' then
    return new;
  end if;
  select titre, entreprise, salaire into m from missions where id = new.mission_id;

  if new.statut = 'acceptee' then
    insert into notifications (user_id, type, icone, icone_bg, icone_color, texte, montant)
    values (
      new.user_id, 'candidature', 'party', '#E1F5EE', '#0F6E56',
      'Bonne nouvelle ! <b>' || echapper_html(m.entreprise) || '</b> a accepté ta candidature pour « <b>'
        || echapper_html(m.titre) || '</b> ».',
      to_char(m.salaire, 'FM999G999G999') || ' FCFA'
    );
  else
    insert into notifications (user_id, type, icone, icone_bg, icone_color, texte)
    values (
      new.user_id, 'candidature', 'info', '#FAEEDA', '#BA7517',
      'Ta candidature pour « <b>' || echapper_html(m.titre)
        || '</b> » n''a pas été retenue. Continue, d''autres missions t''attendent !'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notifier_statut_candidature on candidatures;
create trigger notifier_statut_candidature
  after update of statut on candidatures
  for each row execute function public.notifier_statut_candidature();

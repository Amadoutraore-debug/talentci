-- ══════════════════════════════════════════════════════════════
--  TALENTCI — INSTALLATION / MISE À JOUR COMPLÈTE DE LA BASE
-- ══════════════════════════════════════════════════════════════
--  LE SEUL fichier à exécuter : Supabase Dashboard → SQL Editor
--  (menu "Database" sélectionné) → coller → Run.
--
--  ✔ Nouvelle base : crée tout (tables, sécurité, automatismes, stockage).
--  ✔ Base existante : met à jour sans rien supprimer.
--  ✔ Ré-exécutable autant de fois que nécessaire.
--
--  ⚠️ La sécurité de l'application repose sur ces règles RLS, pas sur
--  le JavaScript : le site utilise la clé "anon" (publique). Sans RLS,
--  n'importe qui pourrait lire/modifier toutes les données via l'API.
--
--  Sommaire
--    1. Fonction utilitaire (échappement HTML)
--    2. Table profils (+ création automatique à l'inscription)
--    3. Table missions (offres)
--    4. Table candidatures (+ places, notifications automatiques)
--    5. Table notifications
--    6. Stockage (photos de profil, couvertures d'offres)
--    7. Mini-CV obligatoire, téléphone et pièce d'identité (privés)
--    8. Réparation des comptes existants
--    9. Devenir administrateur (à faire à la main)
-- ══════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════
-- 1. FONCTION UTILITAIRE
-- ══════════════════════════════════════════

-- Le texte des notifications est affiché en HTML (pour le gras) :
-- tout contenu saisi par un utilisateur doit être échappé.
create or replace function public.echapper_html(t text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(replace(replace(coalesce(t, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#039;');
$$;


-- ══════════════════════════════════════════
-- 2. PROFILS
-- ══════════════════════════════════════════
create table if not exists profils (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  nom          text not null,
  type         text not null check (type in ('etudiant','entreprise','admin')),
  universite   text default '',
  competences  text[] default '{}',
  avatar_url   text,
  created_at   timestamptz not null default now(),
  unique (user_id)
);
alter table profils add column if not exists avatar_url text;
-- Mini-CV (public : visible par les entreprises)
alter table profils add column if not exists specialite text default '';  -- niche / domaine (étudiant) ou secteur (entreprise)
alter table profils add column if not exists ville      text default '';
alter table profils add column if not exists bio        text default '';  -- présentation
alter table profils add column if not exists parcours   text default '';  -- formation, expériences
alter table profils add column if not exists lien       text default '';  -- portfolio, LinkedIn, site...
alter table profils add column if not exists verifie    boolean not null default false; -- pièce d'identité vérifiée par un admin

-- L'utilisateur courant est-il admin ? (définie après la table, qu'elle lit) SECURITY DEFINER : s'exécute avec
-- les droits du propriétaire (contourne RLS), ce qui évite une récursion
-- infinie quand la fonction est utilisée dans une policy de `profils`.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profils
    where user_id = auth.uid() and type = 'admin'
  );
$$;

alter table profils enable row level security;

-- Lecture publique (nom d'entreprise sur une offre, liste admin...).
-- Aucune donnée sensible ici : l'e-mail reste dans auth.users.
drop policy if exists "profils_lecture_publique" on profils;
create policy "profils_lecture_publique" on profils
  for select using (true);

-- On ne peut créer que SON profil, et jamais en admin.
drop policy if exists "profils_creation_soi_meme" on profils;
create policy "profils_creation_soi_meme" on profils
  for insert with check (auth.uid() = user_id and type in ('etudiant', 'entreprise') and verifie = false);

drop policy if exists "profils_modification_soi_meme" on profils;
create policy "profils_modification_soi_meme" on profils
  for update using (auth.uid() = user_id or is_admin());

drop policy if exists "profils_suppression_admin" on profils;
create policy "profils_suppression_admin" on profils
  for delete using (is_admin());

-- Changement de type : Étudiant ↔ Entreprise autorisé pour soi-même ;
-- tout ce qui touche au rôle admin est réservé aux admins (ou au SQL
-- Editor, où auth.uid() est NULL). Empêche l'auto-promotion via l'API.
create or replace function public.proteger_type_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type is distinct from old.type
     and auth.uid() is not null
     and not is_admin()
     and (new.type = 'admin' or old.type = 'admin') then
    raise exception 'Modification du type de compte non autorisée';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'Modification de user_id non autorisée';
  end if;
  -- Le badge "vérifié" ne peut être posé que par un admin (ou par les
  -- automatismes de la section 7, qui lèvent le drapeau ci-dessous).
  if new.verifie is distinct from old.verifie
     and auth.uid() is not null
     and not is_admin()
     and coalesce(current_setting('talentci.maj_systeme', true), '') <> '1' then
    new.verifie := old.verifie;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_type_profil on profils;
create trigger proteger_type_profil
  before update on profils
  for each row execute function public.proteger_type_profil();

-- Création automatique du profil à l'inscription (e-mail ou Google /
-- Facebook), côté serveur : fonctionne même sans session côté client
-- (confirmation d'e-mail activée). Nom et photo récupérés des
-- métadonnées ; type par défaut "etudiant" si non fourni.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profils (user_id, nom, type, universite, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data->>'role' in ('etudiant','entreprise')
         then new.raw_user_meta_data->>'role' else 'etudiant' end,
    coalesce(new.raw_user_meta_data->>'universite', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ══════════════════════════════════════════
-- 3. MISSIONS (OFFRES)
-- ══════════════════════════════════════════
--  salaire               = budget TOTAL (nb_places × montant_par_personne)
--  nb_places             = nombre de personnes recherchées
--  montant_par_personne  = somme reçue par chaque personne
--  places_prises         = candidatures acceptées (tenu à jour automatiquement)
create table if not exists missions (
  id                    bigint generated always as identity primary key,
  user_id               uuid not null references auth.users(id) on delete cascade,
  titre                 text not null,
  entreprise            text not null,
  initiales             text,
  couleur_bg            text,
  couleur_txt           text,
  categorie             text not null,
  description           text not null,
  salaire               integer not null check (salaire >= 5000),
  nb_places             integer not null default 1,
  montant_par_personne  integer,
  places_prises         integer not null default 0,
  image_url             text,
  duree                 text,
  niveau                text,
  competences           text[] default '{}',
  actif                 boolean not null default true,
  created_at            timestamptz not null default now()
);
-- Bases créées avant l'ajout des places / photos
alter table missions add column if not exists nb_places integer not null default 1;
alter table missions add column if not exists montant_par_personne integer;
alter table missions add column if not exists places_prises integer not null default 0;
alter table missions add column if not exists image_url text;
-- Ce que l'entreprise attend des candidats + quand et où se fait la prestation
alter table missions add column if not exists profil_recherche  text;
alter table missions add column if not exists date_prestation    date;
alter table missions add column if not exists heure_prestation   text;
alter table missions add column if not exists lieu_prestation    text;
update missions set montant_par_personne = salaire where montant_par_personne is null;

alter table missions drop constraint if exists missions_nb_places_check;
alter table missions add constraint missions_nb_places_check check (nb_places between 1 and 500);
alter table missions drop constraint if exists missions_montant_par_personne_check;
alter table missions add constraint missions_montant_par_personne_check check (montant_par_personne is null or montant_par_personne >= 1000);

create index if not exists idx_missions_actif on missions (actif);
create index if not exists idx_missions_user on missions (user_id);

alter table missions enable row level security;

-- Tout le monde voit les offres actives ; le propriétaire et l'admin
-- voient aussi les offres masquées.
drop policy if exists "missions_lecture" on missions;
create policy "missions_lecture" on missions
  for select using (actif = true or auth.uid() = user_id or is_admin());

-- Publication : policy "missions_creation_proprietaire" définie en section 7
-- (elle exige un profil complet).

drop policy if exists "missions_modification_proprietaire_ou_admin" on missions;
create policy "missions_modification_proprietaire_ou_admin" on missions
  for update using (auth.uid() = user_id or is_admin());

drop policy if exists "missions_suppression_proprietaire_ou_admin" on missions;
create policy "missions_suppression_proprietaire_ou_admin" on missions
  for delete using (auth.uid() = user_id or is_admin());


-- ══════════════════════════════════════════
-- 4. CANDIDATURES
-- ══════════════════════════════════════════
create table if not exists candidatures (
  id          bigint generated always as identity primary key,
  mission_id  bigint not null references missions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  statut      text not null default 'en_attente' check (statut in ('en_attente','acceptee','refusee')),
  created_at  timestamptz not null default now(),
  unique (mission_id, user_id)
);
-- Rendez-vous fixé par l'entreprise quand elle retient le candidat
alter table candidatures add column if not exists date_prestation    date;
alter table candidatures add column if not exists heure_prestation   text;
alter table candidatures add column if not exists lieu_prestation    text;
alter table candidatures add column if not exists message_entreprise text;
create index if not exists idx_candidatures_user on candidatures (user_id);
create index if not exists idx_candidatures_mission on candidatures (mission_id);

alter table candidatures enable row level security;

-- L'étudiant voit ses candidatures, l'entreprise celles reçues sur SES
-- offres, l'admin tout.
drop policy if exists "candidatures_lecture" on candidatures;
create policy "candidatures_lecture" on candidatures
  for select using (
    auth.uid() = user_id
    or auth.uid() = (select m.user_id from missions m where m.id = candidatures.mission_id)
    or is_admin()
  );

-- Postuler : policy "candidatures_creation_soi_meme" définie en section 7
-- (elle exige un profil complet).

-- Seule l'entreprise propriétaire de l'offre (ou l'admin) accepte / refuse.
drop policy if exists "candidatures_maj_par_entreprise_ou_admin" on candidatures;
create policy "candidatures_maj_par_entreprise_ou_admin" on candidatures
  for update using (
    auth.uid() = (select m.user_id from missions m where m.id = candidatures.mission_id)
    or is_admin()
  );

drop policy if exists "candidatures_suppression_soi_meme_ou_admin" on candidatures;
create policy "candidatures_suppression_soi_meme_ou_admin" on candidatures
  for delete using (auth.uid() = user_id or is_admin());

-- Refuse d'accepter une candidature quand l'offre est complète.
create or replace function public.verifier_places_disponibles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  places integer;
  acceptees integer;
begin
  if new.statut = 'acceptee' and (tg_op = 'INSERT' or old.statut is distinct from 'acceptee') then
    select nb_places into places from missions where id = new.mission_id for update;
    select count(*) into acceptees from candidatures
      where mission_id = new.mission_id and statut = 'acceptee' and id <> new.id;
    if acceptees >= coalesce(places, 1) then
      raise exception 'Toutes les places de cette offre sont déjà prises';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists verifier_places_disponibles on candidatures;
create trigger verifier_places_disponibles
  before insert or update of statut on candidatures
  for each row execute function public.verifier_places_disponibles();

-- places_prises = nombre de candidatures acceptées.
create or replace function public.recompter_places_prises()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mid bigint;
begin
  mid := coalesce(new.mission_id, old.mission_id);
  update missions
    set places_prises = (select count(*) from candidatures where mission_id = mid and statut = 'acceptee')
    where id = mid;
  return null;
end;
$$;

drop trigger if exists recompter_places_prises on candidatures;
create trigger recompter_places_prises
  after insert or update of statut or delete on candidatures
  for each row execute function public.recompter_places_prises();

update missions m
  set places_prises = (select count(*) from candidatures c where c.mission_id = m.id and c.statut = 'acceptee');

-- Nouvelle candidature → notifier l'entreprise.
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
    m.user_id, 'candidature', 'inbox', '#141414', '#E8620C',
    '<b>' || echapper_html(coalesce(nom_etudiant, 'Un étudiant')) || '</b> a postulé à « <b>'
      || echapper_html(m.titre) || '</b> ».'
  );
  return new;
end;
$$;

-- Candidature acceptée / refusée → notifier l'étudiant.
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
  select titre, entreprise, salaire, montant_par_personne,
         date_prestation, heure_prestation, lieu_prestation
    into m from missions where id = new.mission_id;

  -- Rendez-vous annoncé dans le message : celui de la candidature s'il a
  -- été précisé, sinon celui fixé dans l'offre lors de la publication.
  -- (Trigger AFTER : ces affectations ne servent qu'au texte du message.)
  new.date_prestation  := coalesce(new.date_prestation, m.date_prestation);
  new.heure_prestation := coalesce(nullif(trim(new.heure_prestation), ''), m.heure_prestation);
  new.lieu_prestation  := coalesce(nullif(trim(new.lieu_prestation), ''), m.lieu_prestation);

  if new.statut = 'acceptee' then
    insert into notifications (user_id, type, icone, icone_bg, icone_color, texte, montant)
    values (
      new.user_id, 'candidature', 'party', '#FFF1E6', '#B54708',
      'Félicitations, tu es retenu(e) ! <b>' || echapper_html(m.entreprise) || '</b> t''a choisi(e) pour « <b>'
        || echapper_html(m.titre) || '</b> ».'
        || case when new.date_prestation is not null then
             ' Rendez-vous le <b>' || to_char(new.date_prestation, 'DD/MM/YYYY') || '</b>'
             || coalesce(' à <b>' || nullif(echapper_html(trim(new.heure_prestation)), '') || '</b>', '')
             || coalesce(', lieu : <b>' || nullif(echapper_html(trim(new.lieu_prestation)), '') || '</b>', '')
             || '. Présente-toi à la date prévue pour la prestation.'
           else '' end
        || coalesce(' Consignes : ' || nullif(echapper_html(trim(new.message_entreprise)), ''), ''),
      replace(to_char(coalesce(m.montant_par_personne, m.salaire), 'FM999,999,999'), ',', ' ') || ' FCFA'
    );
  else
    insert into notifications (user_id, type, icone, icone_bg, icone_color, texte)
    values (
      new.user_id, 'candidature', 'info', '#FEF3C7', '#B45309',
      'Ta candidature pour « <b>' || echapper_html(m.titre)
        || '</b> » n''a pas été retenue. Continue, d''autres missions t''attendent !'
    );
  end if;
  return new;
end;
$$;


-- ══════════════════════════════════════════
-- 5. NOTIFICATIONS
-- ══════════════════════════════════════════
create table if not exists notifications (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null,
  icone        text,
  icone_bg     text,
  icone_color  text,
  texte        text not null,
  montant      text,
  lue          boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications (user_id);

alter table notifications enable row level security;

drop policy if exists "notifications_lecture_soi_meme_ou_admin" on notifications;
create policy "notifications_lecture_soi_meme_ou_admin" on notifications
  for select using (auth.uid() = user_id or is_admin());

drop policy if exists "notifications_creation_soi_meme" on notifications;
create policy "notifications_creation_soi_meme" on notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists "notifications_maj_soi_meme" on notifications;
create policy "notifications_maj_soi_meme" on notifications
  for update using (auth.uid() = user_id);

drop policy if exists "notifications_suppression_soi_meme" on notifications;
create policy "notifications_suppression_soi_meme" on notifications
  for delete using (auth.uid() = user_id);

-- Déclencheurs de notification (créés ici car ils écrivent dans `notifications`)
drop trigger if exists notifier_nouvelle_candidature on candidatures;
create trigger notifier_nouvelle_candidature
  after insert on candidatures
  for each row execute function public.notifier_nouvelle_candidature();

drop trigger if exists notifier_statut_candidature on candidatures;
create trigger notifier_statut_candidature
  after update of statut on candidatures
  for each row execute function public.notifier_statut_candidature();


-- ══════════════════════════════════════════
-- 6. STOCKAGE
-- ══════════════════════════════════════════
-- Buckets publics en lecture ; chacun n'écrit que dans son dossier
-- (préfixé par son UUID, vérifié via storage.foldername()).
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('missions', 'missions', true)
on conflict (id) do nothing;

drop policy if exists "avatars_lecture_publique" on storage.objects;
create policy "avatars_lecture_publique" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "avatars_upload_soi_meme" on storage.objects;
create policy "avatars_upload_soi_meme" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_maj_soi_meme" on storage.objects;
create policy "avatars_maj_soi_meme" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_suppression_soi_meme" on storage.objects;
create policy "avatars_suppression_soi_meme" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "missions_images_lecture" on storage.objects;
create policy "missions_images_lecture" on storage.objects
  for select using (bucket_id = 'missions');
drop policy if exists "missions_images_upload" on storage.objects;
create policy "missions_images_upload" on storage.objects
  for insert with check (bucket_id = 'missions' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "missions_images_maj" on storage.objects;
create policy "missions_images_maj" on storage.objects
  for update using (bucket_id = 'missions' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "missions_images_suppression" on storage.objects;
create policy "missions_images_suppression" on storage.objects
  for delete using (bucket_id = 'missions' and (storage.foldername(name))[1] = auth.uid()::text);


-- ══════════════════════════════════════════
-- 7. MINI-CV OBLIGATOIRE, TÉLÉPHONE ET PIÈCE D'IDENTITÉ
-- ══════════════════════════════════════════
-- Le CV public est dans `profils` (section 2). Les données sensibles
-- sont dans des tables séparées, car RLS filtre des LIGNES, pas des
-- colonnes : `profils` étant lisible par tous, y mettre un téléphone
-- ou un numéro de pièce les rendrait publics.

-- Téléphone : visible par soi-même, l'admin, et les entreprises auprès
-- desquelles la personne a postulé (pour pouvoir la contacter).
create table if not exists coordonnees (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  telephone   text not null check (length(regexp_replace(telephone, '\D', '', 'g')) >= 8),
  updated_at  timestamptz not null default now()
);
alter table coordonnees enable row level security;

drop policy if exists "coordonnees_lecture" on coordonnees;
create policy "coordonnees_lecture" on coordonnees
  for select using (
    auth.uid() = user_id
    or is_admin()
    or exists (
      select 1 from candidatures c join missions m on m.id = c.mission_id
      where c.user_id = coordonnees.user_id and m.user_id = auth.uid()
    )
  );
drop policy if exists "coordonnees_creation_soi_meme" on coordonnees;
create policy "coordonnees_creation_soi_meme" on coordonnees
  for insert with check (auth.uid() = user_id);
drop policy if exists "coordonnees_maj_soi_meme" on coordonnees;
create policy "coordonnees_maj_soi_meme" on coordonnees
  for update using (auth.uid() = user_id);

-- Pièce d'identité : visible UNIQUEMENT par soi-même et l'admin.
create table if not exists pieces_identite (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  type_piece   text not null,
  numero       text not null check (length(trim(numero)) >= 4),
  chemin       text not null,   -- fichier dans le bucket privé "pieces"
  statut       text not null default 'en_attente' check (statut in ('en_attente','verifiee','refusee')),
  motif_refus  text,
  updated_at   timestamptz not null default now()
);
alter table pieces_identite enable row level security;

drop policy if exists "pieces_lecture_soi_meme_ou_admin" on pieces_identite;
create policy "pieces_lecture_soi_meme_ou_admin" on pieces_identite
  for select using (auth.uid() = user_id or is_admin());
drop policy if exists "pieces_creation_soi_meme" on pieces_identite;
create policy "pieces_creation_soi_meme" on pieces_identite
  for insert with check (auth.uid() = user_id and statut = 'en_attente');
drop policy if exists "pieces_maj_soi_meme_ou_admin" on pieces_identite;
create policy "pieces_maj_soi_meme_ou_admin" on pieces_identite
  for update using (auth.uid() = user_id or is_admin());

-- Toute modification par l'utilisateur remet la pièce "en attente" de
-- vérification ; seul un admin peut la déclarer vérifiée ou refusée.
create or replace function public.proteger_piece()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if auth.uid() is not null and not is_admin() then
    new.statut := 'en_attente';
    new.motif_refus := null;
  end if;
  return new;
end;
$$;
drop trigger if exists proteger_piece on pieces_identite;
create trigger proteger_piece
  before insert or update on pieces_identite
  for each row execute function public.proteger_piece();

-- Le badge "vérifié" du profil suit le statut de la pièce.
create or replace function public.synchroniser_badge_verifie()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('talentci.maj_systeme', '1', true);
  update profils set verifie = (new.statut = 'verifiee') where user_id = new.user_id;
  perform set_config('talentci.maj_systeme', '', true);
  return new;
end;
$$;
drop trigger if exists synchroniser_badge_verifie on pieces_identite;
create trigger synchroniser_badge_verifie
  after insert or update on pieces_identite
  for each row execute function public.synchroniser_badge_verifie();

-- Profil complet ? (règle unique, utilisée par les policies ci-dessous)
--   tous : nom, spécialité, ville, présentation (40 car. min.), téléphone
--   étudiant en plus : parcours et au moins une compétence
--   entreprise en plus : pièce d'identité / RCCM (numéro + photo)
create or replace function public.profil_est_complet(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profils p
    where p.user_id = uid
      and length(trim(coalesce(p.nom, ''))) >= 2
      and length(trim(coalesce(p.specialite, ''))) >= 2
      and length(trim(coalesce(p.ville, ''))) >= 2
      and length(trim(coalesce(p.bio, ''))) >= 40
      and (p.type <> 'etudiant' or (
            length(trim(coalesce(p.parcours, ''))) >= 10
            and coalesce(cardinality(p.competences), 0) >= 1))
  )
  and exists (select 1 from coordonnees c where c.user_id = uid)
  -- Pièce d'identité exigée uniquement pour les entreprises (qui publient)
  and (
    exists (select 1 from profils p where p.user_id = uid and p.type = 'etudiant')
    or exists (select 1 from pieces_identite pi where pi.user_id = uid)
  );
$$;

-- Postuler exige un profil complet.
drop policy if exists "candidatures_creation_soi_meme" on candidatures;
create policy "candidatures_creation_soi_meme" on candidatures
  for insert with check (
    auth.uid() = user_id
    and profil_est_complet(auth.uid())
    -- Une candidature est toujours créée EN ATTENTE : c'est l'entreprise
    -- qui décide (sinon un étudiant pourrait s'auto-accepter via l'API).
    and statut = 'en_attente'
    and date_prestation is null and lieu_prestation is null and message_entreprise is null
  );

-- Publier une offre exige un compte Entreprise au profil complet (ou admin).
drop policy if exists "missions_creation_proprietaire" on missions;
create policy "missions_creation_proprietaire" on missions
  for insert with check (
    auth.uid() = user_id
    and (
      is_admin()
      or (exists (select 1 from profils p where p.user_id = auth.uid() and p.type = 'entreprise')
          and profil_est_complet(auth.uid()))
    )
  );

-- Bucket PRIVÉ des pièces d'identité : chacun dépose dans son dossier,
-- seuls le propriétaire et l'admin peuvent lire (via lien temporaire).
insert into storage.buckets (id, name, public) values ('pieces', 'pieces', false)
on conflict (id) do update set public = false;

drop policy if exists "pieces_fichiers_lecture" on storage.objects;
create policy "pieces_fichiers_lecture" on storage.objects
  for select using (bucket_id = 'pieces' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
drop policy if exists "pieces_fichiers_upload" on storage.objects;
create policy "pieces_fichiers_upload" on storage.objects
  for insert with check (bucket_id = 'pieces' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "pieces_fichiers_maj" on storage.objects;
create policy "pieces_fichiers_maj" on storage.objects
  for update using (bucket_id = 'pieces' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "pieces_fichiers_suppression" on storage.objects;
create policy "pieces_fichiers_suppression" on storage.objects
  for delete using (bucket_id = 'pieces' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));


-- ══════════════════════════════════════════
-- 8. RÉPARATION DES COMPTES EXISTANTS
-- ══════════════════════════════════════════
-- Comptes jamais confirmés par e-mail → confirmés (ils restaient bloqués).
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;

-- Comptes sans fiche profil → profil créé.
insert into public.profils (user_id, nom, type, universite, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Utilisateur'),
  case when u.raw_user_meta_data->>'role' = 'entreprise' then 'entreprise' else 'etudiant' end,
  coalesce(u.raw_user_meta_data->>'universite', ''),
  coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
left join public.profils p on p.user_id = u.id
where p.user_id is null
on conflict (user_id) do nothing;


-- ══════════════════════════════════════════
-- 9. DEVENIR ADMINISTRATEUR
-- ══════════════════════════════════════════
-- Aucun moyen de devenir admin depuis le site (volontaire). Remplace
-- l'adresse par celle de TON compte, puis exécute cette requête seule :
--
--   update profils set type = 'admin'
--   where user_id = (select id from auth.users where email = 'ton-email@exemple.com')
--   returning nom, type;
--
-- Une ligne doit apparaître. Déconnecte-toi puis reconnecte-toi : le
-- menu « Administration » apparaît.

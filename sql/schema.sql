-- ══════════════════════════════════════════════════════════════
--  TALENTCI — SCHÉMA SUPABASE (tables + Row Level Security)
-- ══════════════════════════════════════════════════════════════
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--
--  ⚠️ IMPORTANT : la sécurité de toute l'application repose sur
--  ces policies RLS, pas sur le code JavaScript. Le front-end
--  utilise la clé "anon" (publique par design) — sans RLS activée
--  et correctement écrite, n'importe qui pourrait lire/modifier/
--  supprimer toutes les données via l'API Supabase, même sans
--  passer par le site.
-- ══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- Fonction utilitaire : l'utilisateur courant est-il admin ?
-- SECURITY DEFINER = s'exécute avec les droits du créateur
-- (le rôle postgres, qui contourne RLS), ce qui évite toute
-- récursion infinie quand cette fonction est utilisée DANS
-- une policy RLS sur la table profils elle-même.
-- ─────────────────────────────────────────
create or replace function is_admin()
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

-- ══════════════════════════════════════════
-- TABLE : profils
-- ══════════════════════════════════════════
create table if not exists profils (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  nom          text not null,
  type         text not null check (type in ('etudiant','entreprise','admin')),
  universite   text default '',
  competences  text[] default '{}',
  created_at   timestamptz not null default now(),
  unique (user_id)
);

alter table profils enable row level security;

-- Lecture publique : nécessaire pour afficher le nom d'une entreprise
-- sur une mission, ou le nom d'un utilisateur dans le panneau admin.
-- Aucune donnée sensible (email, mot de passe) n'est stockée ici :
-- l'email vit uniquement dans auth.users, non exposé par cette table.
create policy "profils_lecture_publique" on profils
  for select using (true);

create policy "profils_creation_soi_meme" on profils
  for insert with check (auth.uid() = user_id);

create policy "profils_modification_soi_meme" on profils
  for update using (auth.uid() = user_id or is_admin());

-- Personne ne peut se supprimer soi-même depuis le client ;
-- seul un admin (ou une suppression en cascade via auth.users) le peut.
create policy "profils_suppression_admin" on profils
  for delete using (is_admin());

-- ─────────────────────────────────────────
-- Création automatique du profil à l'inscription
-- ─────────────────────────────────────────
-- Le client (js/app.js) ne fait PLUS l'insertion dans `profils` lui-même :
-- juste après signUp(), s'il faut confirmer l'email, il n'existe encore
-- aucune session -> auth.uid() est NULL -> la policy "profils_creation_soi_meme"
-- rejette l'insert, en silence côté client. Ce trigger s'exécute côté
-- serveur (SECURITY DEFINER, propriétaire = postgres) dans la même
-- transaction que la création du compte, donc il ne dépend jamais de
-- l'état de session du client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profils (user_id, nom, type, universite)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data->>'role' in ('etudiant','entreprise')
         then new.raw_user_meta_data->>'role' else 'etudiant' end,
    coalesce(new.raw_user_meta_data->>'universite', '')
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
-- TABLE : missions
-- ══════════════════════════════════════════
create table if not exists missions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  titre        text not null,
  entreprise   text not null,
  initiales    text,
  couleur_bg   text,
  couleur_txt  text,
  categorie    text not null,
  description  text not null,
  salaire      integer not null check (salaire >= 5000),
  duree        text,
  niveau       text,
  competences  text[] default '{}',
  actif        boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_missions_actif on missions (actif);
create index if not exists idx_missions_user on missions (user_id);

alter table missions enable row level security;

-- Tout le monde voit les missions actives ; le propriétaire et
-- l'admin voient aussi ses propres missions désactivées.
create policy "missions_lecture" on missions
  for select using (actif = true or auth.uid() = user_id or is_admin());

create policy "missions_creation_proprietaire" on missions
  for insert with check (auth.uid() = user_id);

create policy "missions_modification_proprietaire_ou_admin" on missions
  for update using (auth.uid() = user_id or is_admin());

create policy "missions_suppression_proprietaire_ou_admin" on missions
  for delete using (auth.uid() = user_id or is_admin());

-- ══════════════════════════════════════════
-- TABLE : candidatures
-- ══════════════════════════════════════════
create table if not exists candidatures (
  id          bigint generated always as identity primary key,
  mission_id  bigint not null references missions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  statut      text not null default 'en_attente' check (statut in ('en_attente','acceptee','refusee')),
  created_at  timestamptz not null default now(),
  unique (mission_id, user_id)
);

create index if not exists idx_candidatures_user on candidatures (user_id);
create index if not exists idx_candidatures_mission on candidatures (mission_id);

alter table candidatures enable row level security;

-- L'étudiant voit ses candidatures ; l'entreprise voit les
-- candidatures reçues sur SES missions ; l'admin voit tout.
create policy "candidatures_lecture" on candidatures
  for select using (
    auth.uid() = user_id
    or auth.uid() = (select m.user_id from missions m where m.id = candidatures.mission_id)
    or is_admin()
  );

create policy "candidatures_creation_soi_meme" on candidatures
  for insert with check (auth.uid() = user_id);

-- Seule l'entreprise propriétaire de la mission (ou l'admin) peut
-- changer le statut d'une candidature (accepter / refuser).
create policy "candidatures_maj_par_entreprise_ou_admin" on candidatures
  for update using (
    auth.uid() = (select m.user_id from missions m where m.id = candidatures.mission_id)
    or is_admin()
  );

create policy "candidatures_suppression_soi_meme_ou_admin" on candidatures
  for delete using (auth.uid() = user_id or is_admin());

-- ══════════════════════════════════════════
-- TABLE : notifications
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

create policy "notifications_lecture_soi_meme_ou_admin" on notifications
  for select using (auth.uid() = user_id or is_admin());

create policy "notifications_creation_soi_meme" on notifications
  for insert with check (auth.uid() = user_id);

create policy "notifications_maj_soi_meme" on notifications
  for update using (auth.uid() = user_id);

create policy "notifications_suppression_soi_meme" on notifications
  for delete using (auth.uid() = user_id);

-- ══════════════════════════════════════════
-- PROMOUVOIR UN COMPTE EN ADMINISTRATEUR
-- ══════════════════════════════════════════
-- Il n'existe volontairement AUCUN moyen de devenir admin depuis
-- le site (le formulaire d'inscription n'offre que etudiant/entreprise).
-- Pour donner les droits admin à un compte existant :
--   1. Récupère son UUID dans Authentication → Users
--   2. Exécute :
--
--   update profils set type = 'admin' where user_id = '<uuid-ici>';
--
-- Le lien "⚙️ Admin" apparaîtra automatiquement dans la navbar de
-- ce compte à sa prochaine connexion.

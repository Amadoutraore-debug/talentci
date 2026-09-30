-- ══════════════════════════════════════════════════════════════
--  TALENTCI — MIGRATION : réparation des comptes et de la connexion
-- ══════════════════════════════════════════════════════════════
--  À exécuter dans : Supabase Dashboard → SQL Editor (menu "Database").
--  Ré-exécutable sans erreur, ne supprime aucune donnée.
--
--   1. Confirme tous les comptes existants (ceux qui n'ont jamais reçu
--      ou ouvert l'e-mail de confirmation restaient bloqués).
--   2. Crée la fiche `profils` manquante des comptes qui n'en ont pas
--      (sinon : connecté mais "sans compte" visible).
--   3. 🔐 Interdit de se créer soi-même un profil "admin".
--   4. Permet à chacun de passer son compte Étudiant ↔ Entreprise
--      (les comptes Google sont créés "Étudiant" par défaut), sans
--      jamais pouvoir devenir admin ou retirer le rôle admin.
--
--  Pour devenir administrateur, voir la requête à la fin du fichier.
-- ══════════════════════════════════════════════════════════════

-- 1. Comptes non confirmés → confirmés
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- 2. Profils manquants
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

-- 3. Création de profil par l'utilisateur : jamais en admin
drop policy if exists "profils_creation_soi_meme" on profils;
create policy "profils_creation_soi_meme" on profils
  for insert with check (auth.uid() = user_id and type in ('etudiant', 'entreprise'));

-- 4. Changement de type : Étudiant ↔ Entreprise autorisé pour soi-même,
--    tout ce qui touche au rôle admin réservé aux admins.
create or replace function public.proteger_type_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() est NULL depuis le SQL Editor : l'administrateur de la
  -- base garde la main.
  if new.type is distinct from old.type
     and auth.uid() is not null
     and not is_admin()
     and (new.type = 'admin' or old.type = 'admin') then
    raise exception 'Modification du type de compte non autorisée';
  end if;
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

-- ══════════════════════════════════════════
-- DEVENIR ADMINISTRATEUR
-- ══════════════════════════════════════════
-- Remplace l'adresse par celle de TON compte TalentCI, puis exécute :
--
--   update profils set type = 'admin'
--   where user_id = (select id from auth.users where email = 'ton-email@exemple.com')
--   returning nom, type;
--
-- Une ligne doit apparaître. Déconnecte-toi puis reconnecte-toi sur le
-- site : le lien "Admin" / "Administration" apparaît.

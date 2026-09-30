-- ══════════════════════════════════════════════════════════════
--  TALENTCI — MIGRATION : offres avec nombre de places
-- ══════════════════════════════════════════════════════════════
--  À exécuter UNE FOIS dans : Supabase Dashboard → SQL Editor
--  (menu "Database" sélectionné), APRÈS
--  migration-2026-09-securite-candidatures.sql.
--  Ré-exécutable sans erreur.
--
--  Ajoute aux missions :
--   - nb_places             : nombre de personnes recherchées
--   - montant_par_personne  : somme (FCFA) que reçoit chaque personne
--   - places_prises         : nombre de candidatures acceptées,
--                             tenu à jour automatiquement
--   - image_url             : photo de couverture de l'offre (optionnelle)
--  `salaire` reste le budget TOTAL (= nb_places × montant_par_personne).
-- ══════════════════════════════════════════════════════════════

alter table missions add column if not exists nb_places integer not null default 1;
alter table missions add column if not exists montant_par_personne integer;
alter table missions add column if not exists places_prises integer not null default 0;
alter table missions add column if not exists image_url text;

-- Anciennes missions : une seule place, tout le budget pour cette personne.
update missions set montant_par_personne = salaire where montant_par_personne is null;

alter table missions drop constraint if exists missions_nb_places_check;
alter table missions add constraint missions_nb_places_check check (nb_places between 1 and 500);
alter table missions drop constraint if exists missions_montant_par_personne_check;
alter table missions add constraint missions_montant_par_personne_check check (montant_par_personne is null or montant_par_personne >= 1000);

-- ─────────────────────────────────────────
-- Places prises = nombre de candidatures acceptées.
-- Refuse d'accepter une candidature quand l'offre est complète.
-- ─────────────────────────────────────────
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

-- Remise à niveau pour les candidatures déjà acceptées.
update missions m
  set places_prises = (select count(*) from candidatures c where c.mission_id = m.id and c.statut = 'acceptee');

-- ─────────────────────────────────────────
-- Notification "candidature acceptée" : afficher le montant PAR PERSONNE
-- (remplace la version de la migration précédente).
-- ─────────────────────────────────────────
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
  select titre, entreprise, salaire, montant_par_personne into m from missions where id = new.mission_id;

  if new.statut = 'acceptee' then
    insert into notifications (user_id, type, icone, icone_bg, icone_color, texte, montant)
    values (
      new.user_id, 'candidature', 'party', '#E1F5EE', '#0F6E56',
      'Bonne nouvelle ! <b>' || echapper_html(m.entreprise) || '</b> a accepté ta candidature pour « <b>'
        || echapper_html(m.titre) || '</b> ».',
      to_char(coalesce(m.montant_par_personne, m.salaire), 'FM999G999G999') || ' FCFA'
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

-- ─────────────────────────────────────────
-- Stockage : photos de couverture des offres
-- Lecture publique ; chacun n'écrit que dans son dossier (UUID).
-- ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('missions', 'missions', true)
on conflict (id) do nothing;

drop policy if exists "missions_images_lecture" on storage.objects;
create policy "missions_images_lecture" on storage.objects
  for select using (bucket_id = 'missions');

drop policy if exists "missions_images_upload" on storage.objects;
create policy "missions_images_upload" on storage.objects
  for insert with check (
    bucket_id = 'missions' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "missions_images_maj" on storage.objects;
create policy "missions_images_maj" on storage.objects
  for update using (
    bucket_id = 'missions' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "missions_images_suppression" on storage.objects;
create policy "missions_images_suppression" on storage.objects
  for delete using (
    bucket_id = 'missions' and (storage.foldername(name))[1] = auth.uid()::text
  );

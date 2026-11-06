-- =====================================================================
-- Kanari — schéma de base de données (Supabase / PostgreSQL)
-- Sécurité : Row Level Security sur toutes les tables, droits par rôle,
-- garde-fous en base (contraintes + déclencheurs) indépendants du front.
-- =====================================================================

-- ---------- Types ----------
create type public.app_role as enum (
  'admin',          -- administrateur général
  'collectivite',   -- responsable de collectivité (lecture de ses établissements)
  'responsable',    -- responsable de cantine
  'personnel',      -- personnel de restauration (saisie)
  'association'     -- association partenaire (réservé V2 : redistribution)
);

create type public.service_type as enum ('petit_dejeuner', 'dejeuner', 'gouter', 'diner');

-- ---------- Tables ----------
create table public.collectivities (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) between 2 and 120),
  created_at timestamptz not null default now()
);

create table public.establishments (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 2 and 150),
  type              text not null check (type in ('ecole', 'college', 'lycee', 'cuisine_centrale', 'autre')),
  address           text check (address is null or char_length(address) <= 250),
  commune           text not null check (char_length(commune) between 2 and 80),
  manager_name      text check (manager_name is null or char_length(manager_name) <= 120),
  contact_email     text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  daily_meals       integer check (daily_meals is null or daily_meals between 0 and 20000),
  -- Coût matière moyen d'un kilo jeté : hypothèse paramétrable, pas une donnée garantie.
  cost_per_kg       numeric(6,2) not null default 5.00 check (cost_per_kg between 0 and 100),
  -- Objectif en grammes jetés par repas servi (facultatif).
  target_g_per_meal integer check (target_g_per_meal is null or target_g_per_meal between 0 and 1000),
  collectivity_id   uuid references public.collectivities(id) on delete set null,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null default '',
  full_name        text not null default '' check (char_length(full_name) <= 120),
  role             public.app_role not null default 'personnel',
  establishment_id uuid references public.establishments(id) on delete set null,
  collectivity_id  uuid references public.collectivities(id) on delete set null,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Une pesée = un service (ex. le déjeuner du mardi) dans un établissement.
-- Saisie volontairement courte : effectifs + deux pesées. Le détail par catégorie est facultatif.
create table public.waste_records (
  id                 uuid primary key default gen_random_uuid(),
  establishment_id   uuid not null references public.establishments(id) on delete cascade,
  service_date       date not null check (service_date >= date '2020-01-01'),
  service            public.service_type not null default 'dejeuner',
  meals_planned      integer not null check (meals_planned between 0 and 20000),
  meals_served       integer not null check (meals_served between 0 and 20000),
  plate_waste_kg     numeric(8,2) not null default 0 check (plate_waste_kg between 0 and 5000),     -- restes des assiettes
  kitchen_surplus_kg numeric(8,2) not null default 0 check (kitchen_surplus_kg between 0 and 5000), -- produit mais non servi
  produced_kg        numeric(8,2) check (produced_kg is null or produced_kg between 0.01 and 20000),
  menu               text check (menu is null or char_length(menu) <= 200),
  details            jsonb not null default '[]'::jsonb check (jsonb_typeof(details) = 'array'),
  comment            text check (comment is null or char_length(comment) <= 500),
  created_by         uuid references auth.users(id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (establishment_id, service_date, service),
  constraint waste_not_above_production
    check (produced_kg is null or plate_waste_kg + kitchen_surplus_kg <= produced_kg)
);

-- Protocole de pilote : période de référence puis période de suivi, comparées en g/repas.
create table public.pilots (
  id                   uuid primary key default gen_random_uuid(),
  establishment_id     uuid not null references public.establishments(id) on delete cascade,
  name                 text not null check (char_length(name) between 2 and 120),
  baseline_start       date not null,
  baseline_end         date not null,
  followup_start       date,
  followup_end         date,
  target_reduction_pct numeric(5,2) not null default 20 check (target_reduction_pct between 0 and 100),
  actions              text check (actions is null or char_length(actions) <= 1000),
  created_by           uuid references auth.users(id) on delete set null default auth.uid(),
  created_at           timestamptz not null default now(),
  check (baseline_end >= baseline_start),
  check (followup_start is null or followup_start > baseline_end),
  check (followup_end is null or (followup_start is not null and followup_end >= followup_start))
);

create index waste_records_estab_date_idx on public.waste_records (establishment_id, service_date desc);
create index establishments_collectivity_idx on public.establishments (collectivity_id);
create index profiles_establishment_idx on public.profiles (establishment_id);
create index pilots_establishment_idx on public.pilots (establishment_id);

-- ---------- Fonctions d'autorisation ----------
-- SECURITY DEFINER + search_path vide : lisent profiles sans boucle RLS, sans détournement de schéma.
create or replace function public.my_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.active
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create or replace function public.my_establishment()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.establishment_id from public.profiles p where p.id = auth.uid() and p.active
$$;

create or replace function public.my_collectivity()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.collectivity_id from public.profiles p where p.id = auth.uid() and p.active
$$;

create or replace function public.can_read_establishment(e uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active and (
      p.role = 'admin'
      or (p.role in ('responsable', 'personnel') and p.establishment_id = e)
      or (p.role = 'collectivite' and p.collectivity_id is not null and exists (
            select 1 from public.establishments x
            where x.id = e and x.collectivity_id = p.collectivity_id))
    )
  )
$$;

-- Saisie : personnel et responsable de l'établissement (actif), ou admin.
create or replace function public.can_write_establishment(e uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active and (
      p.role = 'admin'
      or (p.role in ('responsable', 'personnel') and p.establishment_id = e
          and exists (select 1 from public.establishments x where x.id = e and x.active))
    )
  )
$$;

-- Gestion (corrections, suppressions, pilotes) : responsable de l'établissement ou admin.
create or replace function public.can_manage_establishment(e uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active and (
      p.role = 'admin' or (p.role = 'responsable' and p.establishment_id = e)
    )
  )
$$;

-- ---------- Déclencheurs ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger establishments_touch before update on public.establishments
  for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger waste_records_touch before update on public.waste_records
  for each row execute function public.touch_updated_at();

-- Création automatique du profil : rôle minimal, aucun établissement.
-- Le rôle n'est JAMAIS lu dans les métadonnées fournies par le client.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un non-admin ne peut ni s'attribuer un rôle, ni changer d'établissement, ni se réactiver.
create or replace function public.guard_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- auth.uid() nul = appel serveur (clé service_role, éditeur SQL) : autorisé.
  if auth.uid() is not null and not public.is_admin() and (
       new.role is distinct from old.role
    or new.establishment_id is distinct from old.establishment_id
    or new.collectivity_id is distinct from old.collectivity_id
    or new.active is distinct from old.active
    or new.email is distinct from old.email
    or new.id is distinct from old.id) then
    raise exception 'Modification réservée à l''administrateur' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Un responsable peut modifier la fiche de son établissement, pas son rattachement ni son statut.
create or replace function public.guard_establishment_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() and (
       new.collectivity_id is distinct from old.collectivity_id
    or new.active is distinct from old.active) then
    raise exception 'Modification réservée à l''administrateur' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger establishments_guard before update on public.establishments
  for each row execute function public.guard_establishment_update();

-- Cohérence d'une pesée : pas de date future, détail par catégorie valide et ≤ total jeté,
-- établissement et auteur non modifiables après coup.
create or replace function public.validate_waste_record()
returns trigger language plpgsql set search_path = '' as $$
declare
  item jsonb;
  total numeric := 0;
begin
  if new.service_date > current_date + 1 then
    raise exception 'La date du service ne peut pas être dans le futur' using errcode = '23514';
  end if;

  if jsonb_array_length(new.details) > 20 then
    raise exception 'Détail trop long (20 lignes maximum)' using errcode = '23514';
  end if;

  for item in select * from jsonb_array_elements(new.details) loop
    if jsonb_typeof(item) <> 'object'
       or (item ->> 'category') not in ('entree', 'plat_proteine', 'accompagnement', 'legumes',
                                        'produit_laitier', 'fruit', 'dessert', 'pain', 'autre')
       or jsonb_typeof(item -> 'kg') <> 'number'
       or (item ->> 'kg')::numeric < 0 then
      raise exception 'Ligne de détail invalide : %', item using errcode = '23514';
    end if;
    total := total + (item ->> 'kg')::numeric;
  end loop;

  if total > new.plate_waste_kg + new.kitchen_surplus_kg + 0.01 then
    raise exception 'Le détail par catégorie dépasse le total jeté' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and auth.uid() is not null and not public.is_admin() and (
       new.establishment_id is distinct from old.establishment_id
    or new.created_by is distinct from old.created_by) then
    raise exception 'Établissement et auteur non modifiables' using errcode = '42501';
  end if;

  return new;
end $$;

create trigger waste_records_validate before insert or update on public.waste_records
  for each row execute function public.validate_waste_record();

-- ---------- Row Level Security ----------
alter table public.collectivities enable row level security;
alter table public.establishments enable row level security;
alter table public.profiles       enable row level security;
alter table public.waste_records  enable row level security;
alter table public.pilots         enable row level security;

-- Le rôle anonyme n'a accès à aucune donnée.
revoke all on all tables in schema public from anon;

-- collectivities
create policy collectivities_select on public.collectivities for select to authenticated
  using (public.is_admin() or id = public.my_collectivity());
create policy collectivities_admin on public.collectivities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- establishments
create policy establishments_select on public.establishments for select to authenticated
  using (public.can_read_establishment(id));
create policy establishments_insert on public.establishments for insert to authenticated
  with check (public.is_admin());
create policy establishments_update on public.establishments for update to authenticated
  using (public.can_manage_establishment(id)) with check (public.can_manage_establishment(id));
create policy establishments_delete on public.establishments for delete to authenticated
  using (public.is_admin());

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (public.my_role() = 'responsable' and establishment_id = public.my_establishment())
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- Pas de politique INSERT/DELETE : création via le déclencheur auth, suppression via auth.users.

-- waste_records
create policy waste_select on public.waste_records for select to authenticated
  using (public.can_read_establishment(establishment_id));
create policy waste_insert on public.waste_records for insert to authenticated
  with check (public.can_write_establishment(establishment_id) and created_by = auth.uid());
create policy waste_update on public.waste_records for update to authenticated
  using (
    public.can_manage_establishment(establishment_id)
    or (created_by = auth.uid()
        and public.can_write_establishment(establishment_id)
        and created_at > now() - interval '48 hours')
  )
  with check (public.can_write_establishment(establishment_id));
create policy waste_delete on public.waste_records for delete to authenticated
  using (public.can_manage_establishment(establishment_id));

-- pilots
create policy pilots_select on public.pilots for select to authenticated
  using (public.can_read_establishment(establishment_id));
create policy pilots_write on public.pilots for all to authenticated
  using (public.can_manage_establishment(establishment_id))
  with check (public.can_manage_establishment(establishment_id));

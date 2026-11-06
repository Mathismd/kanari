-- Tests des règles d'accès (RLS) — exécutables sur un PostgreSQL local qui simule Supabase.
-- Usage : psql -v ON_ERROR_STOP=1 -f supabase/tests/auth_stub.sql -f supabase/migrations/0001_schema.sql -f supabase/tests/rls_test.sql
\set QUIET on
set client_min_messages = notice;

-- ---------- Données de test (en superutilisateur) ----------
insert into public.collectivities (id, name) values
  ('c0000000-0000-0000-0000-000000000001', 'Ville A'),
  ('c0000000-0000-0000-0000-000000000002', 'Ville B');

insert into public.establishments (id, name, type, commune, collectivity_id) values
  ('e0000000-0000-0000-0000-000000000001', 'École A1', 'ecole', 'Commune A', 'c0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000002', 'École A2', 'ecole', 'Commune A', 'c0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000003', 'École B1', 'ecole', 'Commune B', 'c0000000-0000-0000-0000-000000000002');

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'admin@test', '{"full_name":"Admin"}'),
  ('a0000000-0000-0000-0000-000000000002', 'coll@test',  '{"full_name":"Coll A"}'),
  ('a0000000-0000-0000-0000-000000000003', 'resp@test',  '{"full_name":"Resp A1"}'),
  ('a0000000-0000-0000-0000-000000000004', 'staff@test', '{"full_name":"Staff A1","role":"admin"}'),
  ('a0000000-0000-0000-0000-000000000005', 'other@test', '{"full_name":"Staff B1"}'),
  ('a0000000-0000-0000-0000-000000000006', 'new@test',   '{"full_name":"Nouveau"}');

-- Le déclencheur a créé les profils avec le rôle minimal, même si les métadonnées réclamaient "admin".
do $$ begin
  assert (select role from public.profiles where id = 'a0000000-0000-0000-0000-000000000004') = 'personnel',
    'Le rôle des métadonnées ne doit pas être pris en compte';
end $$;

update public.profiles set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000001';
update public.profiles set role = 'collectivite', collectivity_id = 'c0000000-0000-0000-0000-000000000001' where id = 'a0000000-0000-0000-0000-000000000002';
update public.profiles set role = 'responsable', establishment_id = 'e0000000-0000-0000-0000-000000000001' where id = 'a0000000-0000-0000-0000-000000000003';
update public.profiles set role = 'personnel',   establishment_id = 'e0000000-0000-0000-0000-000000000001' where id = 'a0000000-0000-0000-0000-000000000004';
update public.profiles set role = 'personnel',   establishment_id = 'e0000000-0000-0000-0000-000000000003' where id = 'a0000000-0000-0000-0000-000000000005';

insert into public.waste_records (establishment_id, service_date, meals_planned, meals_served, plate_waste_kg, kitchen_surplus_kg, created_by) values
  ('e0000000-0000-0000-0000-000000000001', current_date - 3, 200, 190, 12, 5, 'a0000000-0000-0000-0000-000000000004'),
  ('e0000000-0000-0000-0000-000000000002', current_date - 3, 150, 140, 9, 3, null),
  ('e0000000-0000-0000-0000-000000000003', current_date - 3, 300, 280, 20, 8, 'a0000000-0000-0000-0000-000000000005');

-- ---------- Outil : exécuter en tant qu'utilisateur ----------
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), false);
  if uid is null then execute 'set role anon'; else execute 'set role authenticated'; end if;
end $$;

create or replace function pg_temp.expect_denied(stmt text, label text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when insufficient_privilege or check_violation or others then
    raise notice 'OK  refusé : % [%]', label, sqlerrm;
    return;
  end;
  raise exception 'ÉCHEC : % aurait dû être refusé', label;
end $$;

grant execute on all functions in schema pg_temp to anon, authenticated;

-- ---------- Anonyme ----------
select pg_temp.as_user(null);
select pg_temp.expect_denied('select count(*) from public.waste_records', 'anonyme lit les pesées');
reset role;

-- ---------- Personnel de A1 ----------
select pg_temp.as_user('a0000000-0000-0000-0000-000000000004');
do $$ begin
  assert (select count(*) from public.waste_records) = 1, 'Le personnel A1 ne doit voir que A1';
  assert (select count(*) from public.establishments) = 1, 'Le personnel A1 ne voit que son établissement';
  assert (select count(*) from public.profiles) = 1, 'Le personnel ne voit que son propre profil';
  raise notice 'OK  personnel : lecture limitée à son établissement';
end $$;
insert into public.waste_records (establishment_id, service_date, meals_planned, meals_served, plate_waste_kg, kitchen_surplus_kg)
  values ('e0000000-0000-0000-0000-000000000001', current_date - 1, 200, 195, 10, 4);
do $$ begin raise notice 'OK  personnel : saisie dans son établissement'; end $$;
select pg_temp.expect_denied($q$insert into public.waste_records (establishment_id, service_date, meals_planned, meals_served)
  values ('e0000000-0000-0000-0000-000000000003', current_date - 1, 10, 10)$q$, 'saisie dans un autre établissement');
select pg_temp.expect_denied($q$insert into public.waste_records (establishment_id, service_date, meals_planned, meals_served, created_by)
  values ('e0000000-0000-0000-0000-000000000001', current_date - 2, 10, 10, 'a0000000-0000-0000-0000-000000000003')$q$, 'usurpation de l''auteur');
select pg_temp.expect_denied($q$update public.profiles set role = 'admin' where id = auth.uid()$q$, 'auto-promotion admin');
select pg_temp.expect_denied($q$update public.profiles set establishment_id = 'e0000000-0000-0000-0000-000000000003' where id = auth.uid()$q$, 'changement d''établissement');
select pg_temp.expect_denied($q$insert into public.waste_records (establishment_id, service_date, meals_planned, meals_served)
  values ('e0000000-0000-0000-0000-000000000001', current_date + 10, 10, 10)$q$, 'date future');
select pg_temp.expect_denied($q$insert into public.waste_records (establishment_id, service_date, meals_planned, meals_served, plate_waste_kg, kitchen_surplus_kg, produced_kg)
  values ('e0000000-0000-0000-0000-000000000001', current_date - 5, 10, 10, 30, 0, 20)$q$, 'jeté supérieur au produit');
select pg_temp.expect_denied($q$insert into public.waste_records (establishment_id, service_date, meals_planned, meals_served, plate_waste_kg, details)
  values ('e0000000-0000-0000-0000-000000000001', current_date - 6, 10, 10, 2, '[{"category":"legumes","kg":5}]')$q$, 'détail supérieur au total');
select pg_temp.expect_denied($q$insert into public.waste_records (establishment_id, service_date, meals_planned, meals_served, plate_waste_kg, details)
  values ('e0000000-0000-0000-0000-000000000001', current_date - 7, 10, 10, 2, '[{"category":"<script>","kg":1}]')$q$, 'catégorie inconnue');
do $$ declare n int; begin
  delete from public.waste_records;
  get diagnostics n = row_count;
  assert n = 0, 'Le personnel ne doit pas pouvoir supprimer';
  raise notice 'OK  refusé : suppression par le personnel (0 ligne)';
end $$;
reset role;

-- ---------- Responsable de A1 ----------
select pg_temp.as_user('a0000000-0000-0000-0000-000000000003');
do $$ begin
  assert (select count(*) from public.profiles) = 2, 'Le responsable voit l''équipe de son établissement';
  assert (select count(*) from public.waste_records) = 2, 'Le responsable voit les pesées de A1 uniquement';
  raise notice 'OK  responsable : équipe et pesées de son établissement';
end $$;
update public.establishments set cost_per_kg = 6 where id = 'e0000000-0000-0000-0000-000000000001';
select pg_temp.expect_denied($q$update public.establishments set active = false where id = 'e0000000-0000-0000-0000-000000000001'$q$, 'désactivation par le responsable');
do $$ declare n int; begin
  update public.establishments set cost_per_kg = 9 where id = 'e0000000-0000-0000-0000-000000000003';
  get diagnostics n = row_count;
  assert n = 0, 'Le responsable ne modifie pas un autre établissement';
  raise notice 'OK  refusé : modification d''un autre établissement (0 ligne)';
end $$;
insert into public.pilots (establishment_id, name, baseline_start, baseline_end)
  values ('e0000000-0000-0000-0000-000000000001', 'Pilote A1', current_date - 30, current_date - 16);
do $$ begin raise notice 'OK  responsable : création d''un pilote'; end $$;
reset role;

-- ---------- Collectivité A ----------
select pg_temp.as_user('a0000000-0000-0000-0000-000000000002');
do $$ begin
  assert (select count(*) from public.establishments) = 2, 'La collectivité A voit A1 et A2';
  assert (select count(*) from public.waste_records where establishment_id = 'e0000000-0000-0000-0000-000000000003') = 0,
    'La collectivité A ne voit pas B1';
  raise notice 'OK  collectivité : lecture limitée à ses établissements';
end $$;
select pg_temp.expect_denied($q$insert into public.waste_records (establishment_id, service_date, meals_planned, meals_served)
  values ('e0000000-0000-0000-0000-000000000001', current_date - 8, 10, 10)$q$, 'saisie par la collectivité');
reset role;

-- ---------- Utilisateur sans rattachement ----------
select pg_temp.as_user('a0000000-0000-0000-0000-000000000006');
do $$ begin
  assert (select count(*) from public.waste_records) = 0, 'Un compte non rattaché ne voit rien';
  raise notice 'OK  compte non rattaché : aucune donnée visible';
end $$;
reset role;

-- ---------- Admin ----------
select pg_temp.as_user('a0000000-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from public.waste_records) = 4, 'L''admin voit tout';
  raise notice 'OK  admin : accès global';
end $$;
update public.profiles set role = 'responsable' where id = 'a0000000-0000-0000-0000-000000000006';
update public.establishments set active = false where id = 'e0000000-0000-0000-0000-000000000002';
reset role;

-- Établissement désactivé : plus de saisie possible pour son personnel.
update public.profiles set establishment_id = 'e0000000-0000-0000-0000-000000000002', role = 'personnel' where id = 'a0000000-0000-0000-0000-000000000006';
select pg_temp.as_user('a0000000-0000-0000-0000-000000000006');
select pg_temp.expect_denied($q$insert into public.waste_records (establishment_id, service_date, meals_planned, meals_served)
  values ('e0000000-0000-0000-0000-000000000002', current_date - 1, 10, 10)$q$, 'saisie dans un établissement désactivé');
reset role;

\echo 'Tous les tests RLS sont passés.'

-- Données de départ (fictives) pour un projet Supabase neuf.
-- À exécuter dans l'éditeur SQL APRÈS migrations/0001_schema.sql.

insert into public.collectivities (id, name) values
  ('c1000000-0000-0000-0000-000000000001', 'Commune de Saint-Pierre (exemple)'),
  ('c1000000-0000-0000-0000-000000000002', 'Collectivité territoriale (exemple)')
on conflict do nothing;

insert into public.establishments (name, type, commune, address, manager_name, daily_meals, cost_per_kg, target_g_per_meal, collectivity_id) values
  ('École du Bourg (exemple)',        'ecole',            'Saint-Pierre',   'Rue fictive',     'Responsable cantine', 220, 5.00, 90,  'c1000000-0000-0000-0000-000000000001'),
  ('École du Fort (exemple)',         'ecole',            'Saint-Pierre',   'Rue fictive',     'Responsable cantine', 160, 5.00, 90,  'c1000000-0000-0000-0000-000000000001'),
  ('Collège Rivière (exemple)',       'college',          'Le Carbet',      'Rue fictive',     'Responsable cantine', 410, 5.50, 110, 'c1000000-0000-0000-0000-000000000002')
on conflict do nothing;

-- Premier administrateur : créer l'utilisateur dans Authentication > Users, puis :
-- update public.profiles set role = 'admin', full_name = 'Votre nom'
--   where id = (select id from auth.users where email = 'votre.adresse@exemple.fr');

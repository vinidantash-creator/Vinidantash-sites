-- EcoBairro V2 — banco inicial
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  anon_code text unique not null default ('EB-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  household_size integer not null default 1 check (household_size > 0),
  energy_target_kwh numeric(10,2) not null default 210,
  water_target_m3 numeric(10,2) not null default 12,
  share_anonymized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consumption_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period date not null,
  energy_kwh numeric(12,2) not null check (energy_kwh >= 0),
  water_m3 numeric(12,2) not null check (water_m3 >= 0),
  energy_cost numeric(12,2) not null default 0 check (energy_cost >= 0),
  water_cost numeric(12,2) not null default 0 check (water_cost >= 0),
  created_at timestamptz not null default now(),
  unique(user_id, period)
);

alter table public.profiles enable row level security;
alter table public.consumption_readings enable row level security;

drop policy if exists "profiles own select" on public.profiles;
drop policy if exists "profiles own insert" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "readings own select" on public.consumption_readings;
drop policy if exists "readings own insert" on public.consumption_readings;
drop policy if exists "readings own update" on public.consumption_readings;
drop policy if exists "readings own delete" on public.consumption_readings;

create policy "profiles own select" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles own insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles own update" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "readings own select" on public.consumption_readings for select using (auth.uid() = user_id);
create policy "readings own insert" on public.consumption_readings for insert with check (auth.uid() = user_id);
create policy "readings own update" on public.consumption_readings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "readings own delete" on public.consumption_readings for delete using (auth.uid() = user_id);

-- View administrativa: somente dados anonimizados de quem optou por compartilhar.
create or replace view public.admin_anonymous_consumption as
select
  p.anon_code,
  c.period,
  c.energy_kwh,
  c.water_m3,
  p.household_size,
  round(c.energy_kwh / nullif(p.household_size,0), 2) as energy_kwh_per_person,
  round(c.water_m3 / nullif(p.household_size,0), 2) as water_m3_per_person
from public.profiles p
join public.consumption_readings c on c.user_id = p.user_id
where p.share_anonymized = true;

-- Para produção: crie uma função/Edge Function protegida para acesso administrativo.
-- Nunca coloque a secret/service key do Supabase no navegador.

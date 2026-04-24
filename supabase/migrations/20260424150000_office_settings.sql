-- Configurações do escritório: nome, logo e redes sociais por usuário
-- Idempotente: seguro de re-executar.

create table if not exists public.cl_office_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  office_name text,
  logo_url text,
  website text,
  instagram text,
  facebook text,
  linkedin text,
  twitter text,
  whatsapp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.cl_office_settings enable row level security;

drop policy if exists "cl_office_settings: owner select" on public.cl_office_settings;
create policy "cl_office_settings: owner select"
  on public.cl_office_settings for select
  using (auth.uid() = user_id);

drop policy if exists "cl_office_settings: owner insert" on public.cl_office_settings;
create policy "cl_office_settings: owner insert"
  on public.cl_office_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "cl_office_settings: owner update" on public.cl_office_settings;
create policy "cl_office_settings: owner update"
  on public.cl_office_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cl_office_settings: owner delete" on public.cl_office_settings;
create policy "cl_office_settings: owner delete"
  on public.cl_office_settings for delete
  using (auth.uid() = user_id);

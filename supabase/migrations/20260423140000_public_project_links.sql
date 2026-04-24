-- Checklist: project-wide public links, cover image, designers
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Project cover image
-- ---------------------------------------------------------------------------
alter table public.cl_projects
  add column if not exists image_url text;

-- ---------------------------------------------------------------------------
-- 2. Hide-from-public flag on templates
-- ---------------------------------------------------------------------------
alter table public.cl_form_templates
  add column if not exists is_public boolean not null default true;

-- ---------------------------------------------------------------------------
-- 3. Allow project-wide public links (template_id becomes nullable)
-- ---------------------------------------------------------------------------
alter table public.cl_public_links
  alter column template_id drop not null;

-- ---------------------------------------------------------------------------
-- 4. Global designers table
-- ---------------------------------------------------------------------------
create table if not exists public.cl_designers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  photo_url text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists cl_designers_created_by_idx
  on public.cl_designers(created_by);

alter table public.cl_designers enable row level security;

drop policy if exists "cl_designers: owner read" on public.cl_designers;
create policy "cl_designers: owner read"
  on public.cl_designers for select
  using (created_by = auth.uid());

drop policy if exists "cl_designers: owner write" on public.cl_designers;
create policy "cl_designers: owner write"
  on public.cl_designers for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Project <-> Designer join table
-- ---------------------------------------------------------------------------
create table if not exists public.cl_project_designers (
  project_id uuid not null references public.cl_projects(id) on delete cascade,
  designer_id uuid not null references public.cl_designers(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now(),
  primary key (project_id, designer_id)
);

create index if not exists cl_project_designers_project_idx
  on public.cl_project_designers(project_id);

create index if not exists cl_project_designers_designer_idx
  on public.cl_project_designers(designer_id);

alter table public.cl_project_designers enable row level security;

drop policy if exists "cl_project_designers: member read"
  on public.cl_project_designers;
create policy "cl_project_designers: member read"
  on public.cl_project_designers for select
  using (
    exists (
      select 1 from public.cl_projects p
      where p.id = cl_project_designers.project_id
    )
  );

drop policy if exists "cl_project_designers: owner write"
  on public.cl_project_designers;
create policy "cl_project_designers: owner write"
  on public.cl_project_designers for all
  using (
    exists (
      select 1 from public.cl_projects p
      where p.id = cl_project_designers.project_id
        and p.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cl_projects p
      where p.id = cl_project_designers.project_id
        and p.created_by = auth.uid()
    )
  );

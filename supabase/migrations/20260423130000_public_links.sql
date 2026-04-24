-- Checklist: public share links + client identity on submissions
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Public links table
-- ---------------------------------------------------------------------------
create table if not exists public.cl_public_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  template_id uuid not null references public.cl_form_templates(id) on delete cascade,
  project_id uuid not null references public.cl_projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists cl_public_links_template_idx
  on public.cl_public_links(template_id);

create index if not exists cl_public_links_project_idx
  on public.cl_public_links(project_id);

create index if not exists cl_public_links_token_idx
  on public.cl_public_links(token);

alter table public.cl_public_links enable row level security;

-- Owner can read their own links
drop policy if exists "cl_public_links: owner read" on public.cl_public_links;
create policy "cl_public_links: owner read"
  on public.cl_public_links for select
  using (created_by = auth.uid());

-- Owner can write their own links
drop policy if exists "cl_public_links: owner write" on public.cl_public_links;
create policy "cl_public_links: owner write"
  on public.cl_public_links for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Extend cl_form_submissions with public-link metadata
-- ---------------------------------------------------------------------------
alter table public.cl_form_submissions
  add column if not exists public_link_id uuid
    references public.cl_public_links(id) on delete set null,
  add column if not exists client_name text,
  add column if not exists client_email text;

-- Allow submitted_by to be null when the submission comes from a public link
alter table public.cl_form_submissions
  alter column submitted_by drop not null;

create index if not exists cl_form_submissions_public_link_idx
  on public.cl_form_submissions(public_link_id);

-- Owner of the public link can read public submissions
drop policy if exists "cl_form_submissions: public-link owner read"
  on public.cl_form_submissions;
create policy "cl_form_submissions: public-link owner read"
  on public.cl_form_submissions for select
  using (
    public_link_id is not null
    and exists (
      select 1
      from public.cl_public_links l
      where l.id = cl_form_submissions.public_link_id
        and l.created_by = auth.uid()
    )
  );

-- Owner of the public link can read the values of public submissions
drop policy if exists "cl_submission_values: public-link owner read"
  on public.cl_submission_values;
create policy "cl_submission_values: public-link owner read"
  on public.cl_submission_values for select
  using (
    exists (
      select 1
      from public.cl_form_submissions s
      join public.cl_public_links l on l.id = s.public_link_id
      where s.id = cl_submission_values.submission_id
        and l.created_by = auth.uid()
    )
  );

-- Same for matrix values
drop policy if exists "cl_submission_values_matrix: public-link owner read"
  on public.cl_submission_values_matrix;
create policy "cl_submission_values_matrix: public-link owner read"
  on public.cl_submission_values_matrix for select
  using (
    exists (
      select 1
      from public.cl_form_submissions s
      join public.cl_public_links l on l.id = s.public_link_id
      where s.id = cl_submission_values_matrix.submission_id
        and l.created_by = auth.uid()
    )
  );

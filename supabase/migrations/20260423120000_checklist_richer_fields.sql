-- Checklist: richer fields (sections, groups, conditionals) + 4 columns + matrix layout
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Sections
-- ---------------------------------------------------------------------------
create table if not exists public.cl_form_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.cl_form_templates(id) on delete cascade,
  title text not null default '',
  subtitle text,
  columns smallint not null default 3 check (columns between 1 and 4),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cl_form_sections_template_idx
  on public.cl_form_sections(template_id);

alter table public.cl_form_sections enable row level security;

drop policy if exists "cl_form_sections: members read" on public.cl_form_sections;
create policy "cl_form_sections: members read"
  on public.cl_form_sections for select
  using (
    exists (
      select 1
      from public.cl_form_templates t
      where t.id = cl_form_sections.template_id
    )
  );

drop policy if exists "cl_form_sections: members write" on public.cl_form_sections;
create policy "cl_form_sections: members write"
  on public.cl_form_sections for all
  using (
    exists (
      select 1
      from public.cl_form_templates t
      where t.id = cl_form_sections.template_id
    )
  )
  with check (
    exists (
      select 1
      from public.cl_form_templates t
      where t.id = cl_form_sections.template_id
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Extend cl_form_fields: section_id, group_key, visible_when
-- ---------------------------------------------------------------------------
alter table public.cl_form_fields
  add column if not exists section_id uuid references public.cl_form_sections(id) on delete set null,
  add column if not exists group_key text,
  add column if not exists visible_when jsonb;

create index if not exists cl_form_fields_section_idx
  on public.cl_form_fields(section_id);

-- Allow column_span up to 4
alter table public.cl_form_fields
  drop constraint if exists cl_form_fields_column_span_check;

alter table public.cl_form_fields
  add constraint cl_form_fields_column_span_check
  check (column_span between 1 and 4);

-- Allow new field types: checkbox_group, info
alter table public.cl_form_fields
  drop constraint if exists cl_form_fields_type_check;

alter table public.cl_form_fields
  add constraint cl_form_fields_type_check
  check (type in (
    'text','textarea','checkbox','select','radio','date','number','image',
    'checkbox_group','info'
  ));

-- ---------------------------------------------------------------------------
-- 3. Matrix layout on templates
-- ---------------------------------------------------------------------------
alter table public.cl_form_templates
  add column if not exists layout_mode text not null default 'standard',
  add column if not exists environments jsonb;

alter table public.cl_form_templates
  drop constraint if exists cl_form_templates_layout_mode_check;

alter table public.cl_form_templates
  add constraint cl_form_templates_layout_mode_check
  check (layout_mode in ('standard','matrix'));

-- ---------------------------------------------------------------------------
-- 4. Matrix values (one row per submission x field x environment)
-- ---------------------------------------------------------------------------
create table if not exists public.cl_submission_values_matrix (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.cl_form_submissions(id) on delete cascade,
  field_id uuid not null references public.cl_form_fields(id) on delete cascade,
  env_key text not null,
  value text,
  image_url text,
  created_at timestamptz not null default now(),
  unique (submission_id, field_id, env_key)
);

create index if not exists cl_submission_values_matrix_submission_idx
  on public.cl_submission_values_matrix(submission_id);

create index if not exists cl_submission_values_matrix_field_idx
  on public.cl_submission_values_matrix(field_id);

alter table public.cl_submission_values_matrix enable row level security;

drop policy if exists "cl_submission_values_matrix: owner read"
  on public.cl_submission_values_matrix;
create policy "cl_submission_values_matrix: owner read"
  on public.cl_submission_values_matrix for select
  using (
    exists (
      select 1
      from public.cl_form_submissions s
      where s.id = cl_submission_values_matrix.submission_id
        and s.submitted_by = auth.uid()
    )
  );

drop policy if exists "cl_submission_values_matrix: owner write"
  on public.cl_submission_values_matrix;
create policy "cl_submission_values_matrix: owner write"
  on public.cl_submission_values_matrix for all
  using (
    exists (
      select 1
      from public.cl_form_submissions s
      where s.id = cl_submission_values_matrix.submission_id
        and s.submitted_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.cl_form_submissions s
      where s.id = cl_submission_values_matrix.submission_id
        and s.submitted_by = auth.uid()
    )
  );

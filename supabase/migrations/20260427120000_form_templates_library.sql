-- Library of reusable form templates.
--
-- Until now, every row in cl_form_templates was a project-scoped form
-- (project_id NOT NULL). This migration introduces:
--   1) `is_template` flag to mark a row as a reusable library template.
--   2) `project_id` is now nullable: library templates do not belong to
--      any specific project.
--
-- A row in cl_form_templates can be either:
--   - a project form: is_template = false, project_id NOT NULL
--   - a library template: is_template = true, project_id NULL
-- The (loose) invariant is enforced by a check constraint.

alter table public.cl_form_templates
  add column if not exists is_template boolean not null default false;

alter table public.cl_form_templates
  alter column project_id drop not null;

alter table public.cl_form_templates
  drop constraint if exists cl_form_templates_template_or_project_check;

alter table public.cl_form_templates
  add constraint cl_form_templates_template_or_project_check
  check (
    (is_template = true and project_id is null)
    or (is_template = false and project_id is not null)
  );

create index if not exists cl_form_templates_is_template_idx
  on public.cl_form_templates(is_template);

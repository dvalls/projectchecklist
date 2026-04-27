-- Allow authenticated users to manage library templates (is_template = true,
-- project_id IS NULL). Project-scoped templates keep the existing
-- cl_is_project_owner(project_id) check.
--
-- The policies below replace the previous ones on cl_form_templates and
-- cl_form_fields so that library templates and their fields are accessible
-- to any authenticated user, while project-scoped rows continue to be
-- gated by project ownership.

-- ---------------------------------------------------------------------------
-- cl_form_templates
-- ---------------------------------------------------------------------------
drop policy if exists cl_form_templates_select on public.cl_form_templates;
create policy cl_form_templates_select
  on public.cl_form_templates for select
  to authenticated
  using (
    is_template = true
    or cl_is_project_owner(project_id)
  );

drop policy if exists cl_form_templates_insert on public.cl_form_templates;
create policy cl_form_templates_insert
  on public.cl_form_templates for insert
  to authenticated
  with check (
    (is_template = true and project_id is null)
    or cl_is_project_owner(project_id)
  );

drop policy if exists cl_form_templates_update on public.cl_form_templates;
create policy cl_form_templates_update
  on public.cl_form_templates for update
  to authenticated
  using (
    is_template = true
    or cl_is_project_owner(project_id)
  )
  with check (
    (is_template = true and project_id is null)
    or cl_is_project_owner(project_id)
  );

drop policy if exists cl_form_templates_delete on public.cl_form_templates;
create policy cl_form_templates_delete
  on public.cl_form_templates for delete
  to authenticated
  using (
    is_template = true
    or cl_is_project_owner(project_id)
  );

-- ---------------------------------------------------------------------------
-- cl_form_fields (sections already only check parent template existence)
-- ---------------------------------------------------------------------------
drop policy if exists cl_form_fields_select on public.cl_form_fields;
create policy cl_form_fields_select
  on public.cl_form_fields for select
  to authenticated
  using (
    exists (
      select 1
      from public.cl_form_templates t
      where t.id = cl_form_fields.template_id
        and (t.is_template = true or cl_is_project_owner(t.project_id))
    )
  );

drop policy if exists cl_form_fields_insert on public.cl_form_fields;
create policy cl_form_fields_insert
  on public.cl_form_fields for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.cl_form_templates t
      where t.id = cl_form_fields.template_id
        and (t.is_template = true or cl_is_project_owner(t.project_id))
    )
  );

drop policy if exists cl_form_fields_update on public.cl_form_fields;
create policy cl_form_fields_update
  on public.cl_form_fields for update
  to authenticated
  using (
    exists (
      select 1
      from public.cl_form_templates t
      where t.id = cl_form_fields.template_id
        and (t.is_template = true or cl_is_project_owner(t.project_id))
    )
  )
  with check (
    exists (
      select 1
      from public.cl_form_templates t
      where t.id = cl_form_fields.template_id
        and (t.is_template = true or cl_is_project_owner(t.project_id))
    )
  );

drop policy if exists cl_form_fields_delete on public.cl_form_fields;
create policy cl_form_fields_delete
  on public.cl_form_fields for delete
  to authenticated
  using (
    exists (
      select 1
      from public.cl_form_templates t
      where t.id = cl_form_fields.template_id
        and (t.is_template = true or cl_is_project_owner(t.project_id))
    )
  );

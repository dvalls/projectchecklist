-- Libera acesso total aos dados operacionais para qualquer usuario autenticado.
-- O app passa a compartilhar projetos, formularios, links, projetistas e respostas
-- entre todos os usuarios logados, sem depender do criador original do registro.

drop policy if exists "cl_projects: authenticated full access"
  on public.cl_projects;
create policy "cl_projects: authenticated full access"
  on public.cl_projects for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "cl_form_templates: authenticated full access"
  on public.cl_form_templates;
create policy "cl_form_templates: authenticated full access"
  on public.cl_form_templates for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "cl_form_sections: authenticated full access"
  on public.cl_form_sections;
create policy "cl_form_sections: authenticated full access"
  on public.cl_form_sections for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "cl_form_fields: authenticated full access"
  on public.cl_form_fields;
create policy "cl_form_fields: authenticated full access"
  on public.cl_form_fields for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "cl_form_submissions: authenticated full access"
  on public.cl_form_submissions;
create policy "cl_form_submissions: authenticated full access"
  on public.cl_form_submissions for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "cl_submission_values: authenticated full access"
  on public.cl_submission_values;
create policy "cl_submission_values: authenticated full access"
  on public.cl_submission_values for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "cl_submission_values_matrix: authenticated full access"
  on public.cl_submission_values_matrix;
create policy "cl_submission_values_matrix: authenticated full access"
  on public.cl_submission_values_matrix for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "cl_public_links: authenticated full access"
  on public.cl_public_links;
create policy "cl_public_links: authenticated full access"
  on public.cl_public_links for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "cl_designers: authenticated full access"
  on public.cl_designers;
create policy "cl_designers: authenticated full access"
  on public.cl_designers for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "cl_project_designers: authenticated full access"
  on public.cl_project_designers;
create policy "cl_project_designers: authenticated full access"
  on public.cl_project_designers for all
  to authenticated
  using (true)
  with check (true);

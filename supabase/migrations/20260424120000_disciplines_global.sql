-- Tornar cl_disciplines uma tabela global (sem project_id).
-- 1) Consolidar duplicadas por nome (case-insensitive):
--    - escolher a mais antiga (menor created_at) como "canônica"
--    - reapontar cl_form_templates.discipline_id para a canônica
--    - apagar as duplicadas
-- 2) Dropar policies antigas (dependem de project_id)
-- 3) Remover a coluna project_id (e sua FK)
-- 4) Adicionar unique (lower(trim(name)))
-- 5) Recriar policies RLS sem filtro por project_id (para usuários autenticados)

begin;

-- 1) Consolidar duplicadas
with canonical as (
  select
    lower(trim(name)) as key,
    (array_agg(id order by created_at asc))[1] as canonical_id
  from public.cl_disciplines
  group by lower(trim(name))
),
mapping as (
  select d.id as dup_id, c.canonical_id
  from public.cl_disciplines d
  join canonical c on c.key = lower(trim(d.name))
  where d.id <> c.canonical_id
)
update public.cl_form_templates t
set discipline_id = m.canonical_id
from mapping m
where t.discipline_id = m.dup_id;

delete from public.cl_disciplines d
using (
  select
    lower(trim(name)) as key,
    (array_agg(id order by created_at asc))[1] as canonical_id
  from public.cl_disciplines
  group by lower(trim(name))
) c
where lower(trim(d.name)) = c.key
  and d.id <> c.canonical_id;

-- 2) Dropar policies antigas (dependem de project_id)
drop policy if exists cl_disciplines_select on public.cl_disciplines;
drop policy if exists cl_disciplines_insert on public.cl_disciplines;
drop policy if exists cl_disciplines_update on public.cl_disciplines;
drop policy if exists cl_disciplines_delete on public.cl_disciplines;

-- 3) Remover FK + coluna project_id
alter table public.cl_disciplines
  drop constraint if exists cl_disciplines_project_id_fkey;

alter table public.cl_disciplines
  drop column if exists project_id;

-- 4) Unique por nome normalizado
create unique index if not exists cl_disciplines_name_unique_idx
  on public.cl_disciplines (lower(trim(name)));

-- 5) Policies RLS globais
create policy cl_disciplines_select
  on public.cl_disciplines
  for select
  using (auth.uid() is not null);

create policy cl_disciplines_insert
  on public.cl_disciplines
  for insert
  with check (auth.uid() is not null);

create policy cl_disciplines_update
  on public.cl_disciplines
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy cl_disciplines_delete
  on public.cl_disciplines
  for delete
  using (auth.uid() is not null);

commit;

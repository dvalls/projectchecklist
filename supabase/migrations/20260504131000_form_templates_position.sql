-- Adiciona coluna position em cl_form_templates para reordenação dos formulários no projeto.
-- Inicializa a posição baseada na ordem de criação (created_at) dentro de cada projeto.

alter table public.cl_form_templates
  add column if not exists position int not null default 0;

-- Popula a posição inicial em ordem de criação por projeto
with ranked as (
  select
    id,
    row_number() over (partition by project_id order by created_at) - 1 as rn
  from public.cl_form_templates
  where project_id is not null
)
update public.cl_form_templates t
set position = r.rn
from ranked r
where t.id = r.id;

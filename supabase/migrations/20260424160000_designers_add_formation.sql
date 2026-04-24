-- Adiciona campo de formação ao projetista (ex: Engenheiro Civil)
alter table public.cl_designers
  add column if not exists formation text;

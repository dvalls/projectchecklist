-- Remove o recurso de sequencias de checklist: agora formularios sao preenchidos livremente.
-- Idempotente.

alter table public.cl_form_submissions
  drop column if exists sequence_id,
  drop column if exists step_id;

drop table if exists public.cl_checklist_steps cascade;
drop table if exists public.cl_checklist_sequences cascade;

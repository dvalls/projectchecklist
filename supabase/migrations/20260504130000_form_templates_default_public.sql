-- Torna todos os formulários existentes visíveis no link público por padrão.
-- Novos formulários já recebem is_public = true via default da coluna.

update public.cl_form_templates
set is_public = true
where is_public = false;

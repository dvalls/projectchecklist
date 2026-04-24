-- Project-level setting to allow clients to overwrite values previously
-- submitted by someone else on the same project+template. Default is false:
-- answers inherited from history are locked (read-only) for new submissions.

alter table public.cl_projects
  add column if not exists allow_resubmit_answers boolean not null default false;

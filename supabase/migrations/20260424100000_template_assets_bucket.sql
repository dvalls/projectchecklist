-- Checklist: public storage bucket for template-embedded images (author-side)
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Create the public bucket for template assets.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('checklist-template-assets', 'checklist-template-assets', true)
on conflict (id) do update set public = true;

-- ---------------------------------------------------------------------------
-- 2. Policies: anyone can read (public forms), authenticated users write.
-- ---------------------------------------------------------------------------
drop policy if exists "checklist-template-assets: public read"
  on storage.objects;
create policy "checklist-template-assets: public read"
  on storage.objects for select
  using (bucket_id = 'checklist-template-assets');

drop policy if exists "checklist-template-assets: authenticated insert"
  on storage.objects;
create policy "checklist-template-assets: authenticated insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'checklist-template-assets');

drop policy if exists "checklist-template-assets: authenticated update"
  on storage.objects;
create policy "checklist-template-assets: authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'checklist-template-assets')
  with check (bucket_id = 'checklist-template-assets');

drop policy if exists "checklist-template-assets: authenticated delete"
  on storage.objects;
create policy "checklist-template-assets: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'checklist-template-assets');

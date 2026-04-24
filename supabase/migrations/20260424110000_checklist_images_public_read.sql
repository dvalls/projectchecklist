-- Checklist: turn checklist-images into a public-read bucket
-- Writes stay restricted by per-user-folder RLS; reads become public so
-- <img src="/storage/v1/object/public/checklist-images/..."> URLs work.
-- Idempotent.

update storage.buckets
   set public = true
 where id = 'checklist-images';

drop policy if exists cl_checklist_images_read on storage.objects;
create policy cl_checklist_images_read
  on storage.objects for select
  using (bucket_id = 'checklist-images');

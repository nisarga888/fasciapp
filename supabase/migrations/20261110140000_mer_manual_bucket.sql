-- Private bucket for MER training photographs and muscle drawings.
-- Signed-in practitioners can read. Nobody using the anon key can.
-- Uploads use the service role, not the app.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mer-manual', 'mer-manual', false, 1048576, array['image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "mer manual images for signed-in users" on storage.objects;
create policy "mer manual images for signed-in users"
on storage.objects for select
to authenticated
using (bucket_id = 'mer-manual');

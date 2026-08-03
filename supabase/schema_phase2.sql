-- ============================================================
-- FASE 2 — STORAGE MEDIA (foto galeri & musik) + POLICY
-- Jalankan SETELAH schema.sql. Aman diulang (idempotent).
-- Supabase Dashboard > SQL Editor > New query > tempel > Run.
-- ============================================================

-- Bucket publik 'media' (file bisa dilihat tamu undangan)
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Siapa pun boleh MEMBACA file media (undangan tampil ke publik)
drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects
  for select using (bucket_id = 'media');

-- Pemilik yang login hanya boleh upload/ubah/hapus di FOLDER miliknya.
-- Konvensi path: media/<auth.uid()>/namafile  -> folder pertama = user id.
-- Dengan begitu file antar-klien tetap terpisah walau satu bucket.
drop policy if exists media_owner_write on storage.objects;
create policy media_owner_write on storage.objects
  for all to authenticated
  using      (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- SELESAI. Panel klien (panel.html) kini bisa:
--   • membuat & mengedit undangan sendiri (RLS sites_owner_write),
--   • upload foto/musik ke folder miliknya,
--   • publish/unpublish undangan.
-- ============================================================

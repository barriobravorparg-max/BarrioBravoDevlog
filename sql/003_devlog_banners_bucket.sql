-- Bucket público para los banners generados por IA. "public = true" hace que
-- getPublicUrl() devuelva URLs servibles sin pasar por RLS de storage.objects.
insert into storage.buckets (id, name, public)
values ('devlog-banners', 'devlog-banners', true)
on conflict (id) do nothing;

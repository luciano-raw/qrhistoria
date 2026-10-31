-- Run once in the Supabase SQL editor AFTER creating the tables with Prisma.
-- Prisma uses the server database role. No browser gets direct table access.
alter table public."Profile" enable row level security;
alter table public."Media" enable row level security;
alter table public."Memory" enable row level security;
revoke all on public."Profile", public."Media", public."Memory" from anon, authenticated;
alter table public."MemoryPhoto" enable row level security;
alter table public."SubmissionLimit" enable row level security;
alter table public."UploadBudget" enable row level security;
revoke all on public."MemoryPhoto", public."SubmissionLimit", public."UploadBudget" from anon, authenticated;

-- Public reading is intentional: the homage is accessible to anyone with its URL.
-- Uploads and deletes go through the authenticated server; do not add anonymous write policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memorias', 'memorias', true, 26214400, array['image/webp', 'video/mp4'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

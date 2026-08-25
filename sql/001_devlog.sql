-- Historial de actualizaciones publicadas (devlog)
create table if not exists devlog (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('feature', 'fix', 'evento')),
  title text not null,
  raw_notes text not null,
  generated_text text not null,
  banner_url text,
  discord_message_id text,
  discord_channel_id text,
  published_by text not null,        -- discord user id de quien publicó
  published_by_name text not null,   -- username, para mostrar en el changelog
  status text not null default 'published' check (status in ('published', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists devlog_created_at_idx on devlog (created_at desc);
create index if not exists devlog_status_idx on devlog (status);

-- Lectura pública solo de lo publicado con éxito (para el /changelog del sitio)
alter table devlog enable row level security;

create policy "changelog publico de lo publicado"
  on devlog for select
  using (status = 'published');

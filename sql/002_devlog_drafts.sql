-- Discord es serverless-friendly pero stateless entre interactions: el comando
-- inicial y el click del botón "Publicar"/"Regenerar" son requests separadas.
-- Guardamos el borrador acá para poder recuperarlo por id corto en el custom_id.
create table if not exists devlog_drafts (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  raw_notes text not null,
  version text,
  title text not null,
  description text not null,
  bullets jsonb not null default '[]',
  banner_url text,
  created_by text not null,
  created_by_name text not null,
  created_at timestamptz not null default now()
);

-- Los borradores son de corta vida — limpiar los de más de 1 día
create index if not exists devlog_drafts_created_at_idx on devlog_drafts (created_at);

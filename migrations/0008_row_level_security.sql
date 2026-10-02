-- Supabase exposes every table in the public schema through its Data API.
-- Row-level security with no policies closes that door; the app and n8n connect
-- as the database owner and are not affected. Harmless on PGLite.
alter table if exists bev_facts enable row level security;
alter table if exists bev_sessions enable row level security;
alter table if exists bev_notes enable row level security;

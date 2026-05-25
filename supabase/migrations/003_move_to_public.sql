-- Move tables to public schema since PostgREST schema exposure is not working.
-- This creates the tables in public with cm_ prefix to keep them organized.
-- Run this in the Supabase SQL Editor.

-- Drop claude_monitor tables if they exist (to avoid duplicates)
DROP TABLE IF EXISTS claude_monitor.tool_usage CASCADE;
DROP TABLE IF EXISTS claude_monitor.tool_daily_aggregates CASCADE;
DROP TABLE IF EXISTS claude_monitor.daily_aggregates CASCADE;
DROP TABLE IF EXISTS claude_monitor.messages CASCADE;
DROP TABLE IF EXISTS claude_monitor.sessions CASCADE;
DROP TABLE IF EXISTS claude_monitor.sync_state CASCADE;

-- Create tables in public schema with cm_ prefix

CREATE TABLE IF NOT EXISTS public.cm_sessions (
  id                  TEXT PRIMARY KEY,
  project_path        TEXT NOT NULL,
  project_name        TEXT NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL,
  ended_at            TIMESTAMPTZ,
  message_count       INTEGER DEFAULT 0,
  tool_call_count     INTEGER DEFAULT 0,
  total_input_tokens          BIGINT DEFAULT 0,
  total_output_tokens         BIGINT DEFAULT 0,
  total_cache_read_tokens     BIGINT DEFAULT 0,
  total_cache_creation_tokens BIGINT DEFAULT 0,
  git_branch          TEXT,
  claude_version      TEXT,
  is_subagent         BOOLEAN DEFAULT FALSE,
  parent_session_id   TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cm_messages (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id          TEXT NOT NULL REFERENCES public.cm_sessions(id) ON DELETE CASCADE,
  message_uuid        TEXT UNIQUE,
  timestamp           TIMESTAMPTZ NOT NULL,
  model               TEXT NOT NULL,
  input_tokens        BIGINT DEFAULT 0,
  output_tokens       BIGINT DEFAULT 0,
  cache_read_tokens   BIGINT DEFAULT 0,
  cache_creation_tokens BIGINT DEFAULT 0,
  cache_1h_tokens     BIGINT DEFAULT 0,
  cache_5m_tokens     BIGINT DEFAULT 0,
  web_search_requests INTEGER DEFAULT 0,
  web_fetch_requests  INTEGER DEFAULT 0,
  service_tier        TEXT,
  speed               TEXT,
  tool_names          TEXT[] DEFAULT '{}',
  tool_count          INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cm_tool_usage (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id          BIGINT NOT NULL REFERENCES public.cm_messages(id) ON DELETE CASCADE,
  session_id          TEXT NOT NULL REFERENCES public.cm_sessions(id) ON DELETE CASCADE,
  tool_name           TEXT NOT NULL,
  timestamp           TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cm_daily_aggregates (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date                DATE NOT NULL,
  project_name        TEXT,
  model               TEXT,
  session_count       INTEGER DEFAULT 0,
  message_count       INTEGER DEFAULT 0,
  total_input_tokens          BIGINT DEFAULT 0,
  total_output_tokens         BIGINT DEFAULT 0,
  total_cache_read_tokens     BIGINT DEFAULT 0,
  total_cache_creation_tokens BIGINT DEFAULT 0,
  total_tool_calls    INTEGER DEFAULT 0,
  web_search_count    INTEGER DEFAULT 0,
  CONSTRAINT uq_cm_daily_agg UNIQUE (date, project_name, model)
);

CREATE TABLE IF NOT EXISTS public.cm_tool_daily_aggregates (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date                DATE NOT NULL,
  tool_name           TEXT NOT NULL,
  invocation_count    INTEGER DEFAULT 0,
  associated_input_tokens  BIGINT DEFAULT 0,
  associated_output_tokens BIGINT DEFAULT 0,
  CONSTRAINT uq_cm_tool_daily UNIQUE (date, tool_name)
);

CREATE TABLE IF NOT EXISTS public.cm_sync_state (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  last_sync_at        TIMESTAMPTZ DEFAULT NOW(),
  files_processed     INTEGER DEFAULT 0,
  messages_ingested   INTEGER DEFAULT 0,
  last_file_mtime     TIMESTAMPTZ,
  status              TEXT DEFAULT 'idle'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cm_messages_session ON public.cm_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_cm_messages_timestamp ON public.cm_messages (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cm_messages_model ON public.cm_messages (model, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cm_tool_usage_session ON public.cm_tool_usage (session_id);
CREATE INDEX IF NOT EXISTS idx_cm_tool_usage_name ON public.cm_tool_usage (tool_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cm_daily_agg_date ON public.cm_daily_aggregates (date DESC);
CREATE INDEX IF NOT EXISTS idx_cm_tool_daily_date ON public.cm_tool_daily_aggregates (date DESC);
CREATE INDEX IF NOT EXISTS idx_cm_sessions_project ON public.cm_sessions (project_name);
CREATE INDEX IF NOT EXISTS idx_cm_sessions_started ON public.cm_sessions (started_at DESC);

-- Row Level Security
ALTER TABLE public.cm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cm_tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cm_daily_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cm_tool_daily_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cm_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cm_read_sessions" ON public.cm_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cm_read_messages" ON public.cm_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cm_read_tool_usage" ON public.cm_tool_usage FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cm_read_daily_agg" ON public.cm_daily_aggregates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cm_read_tool_daily" ON public.cm_tool_daily_aggregates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cm_read_sync_state" ON public.cm_sync_state FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "cm_write_sessions" ON public.cm_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "cm_write_messages" ON public.cm_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "cm_write_tool_usage" ON public.cm_tool_usage FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "cm_write_daily_agg" ON public.cm_daily_aggregates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "cm_write_tool_daily" ON public.cm_tool_daily_aggregates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "cm_write_sync_state" ON public.cm_sync_state FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Initial sync state row
INSERT INTO public.cm_sync_state (status) VALUES ('idle');

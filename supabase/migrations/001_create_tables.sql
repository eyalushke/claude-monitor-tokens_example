-- Claude Code Token Monitor - Database Schema
-- All objects under dedicated "claude_monitor" schema (best practice: isolate from public)
-- Run this in Supabase SQL Editor

-- 1. Create dedicated schema
CREATE SCHEMA IF NOT EXISTS claude_monitor;

-- 2. Grant schema access to Supabase roles
GRANT USAGE ON SCHEMA claude_monitor TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA claude_monitor TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA claude_monitor GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA claude_monitor GRANT SELECT ON TABLES TO anon, authenticated;

-- 3. Tables

CREATE TABLE IF NOT EXISTS claude_monitor.sessions (
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

CREATE TABLE IF NOT EXISTS claude_monitor.messages (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id          TEXT NOT NULL REFERENCES claude_monitor.sessions(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS claude_monitor.tool_usage (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id          BIGINT NOT NULL REFERENCES claude_monitor.messages(id) ON DELETE CASCADE,
  session_id          TEXT NOT NULL REFERENCES claude_monitor.sessions(id) ON DELETE CASCADE,
  tool_name           TEXT NOT NULL,
  timestamp           TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claude_monitor.daily_aggregates (
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
  CONSTRAINT uq_daily_agg UNIQUE (date, project_name, model)
);

CREATE TABLE IF NOT EXISTS claude_monitor.tool_daily_aggregates (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date                DATE NOT NULL,
  tool_name           TEXT NOT NULL,
  invocation_count    INTEGER DEFAULT 0,
  associated_input_tokens  BIGINT DEFAULT 0,
  associated_output_tokens BIGINT DEFAULT 0,
  CONSTRAINT uq_tool_daily UNIQUE (date, tool_name)
);

CREATE TABLE IF NOT EXISTS claude_monitor.sync_state (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  last_sync_at        TIMESTAMPTZ DEFAULT NOW(),
  files_processed     INTEGER DEFAULT 0,
  messages_ingested   INTEGER DEFAULT 0,
  last_file_mtime     TIMESTAMPTZ,
  status              TEXT DEFAULT 'idle'
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_messages_session ON claude_monitor.messages (session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON claude_monitor.messages (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_model ON claude_monitor.messages (model, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tool_usage_session ON claude_monitor.tool_usage (session_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_name ON claude_monitor.tool_usage (tool_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_daily_agg_date ON claude_monitor.daily_aggregates (date DESC);
CREATE INDEX IF NOT EXISTS idx_tool_daily_date ON claude_monitor.tool_daily_aggregates (date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON claude_monitor.sessions (project_name);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON claude_monitor.sessions (started_at DESC);

-- 5. Row Level Security (read-only for anon/authenticated, full access for service_role)
ALTER TABLE claude_monitor.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE claude_monitor.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE claude_monitor.tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE claude_monitor.daily_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE claude_monitor.tool_daily_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE claude_monitor.sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access" ON claude_monitor.sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow read access" ON claude_monitor.messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow read access" ON claude_monitor.tool_usage FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow read access" ON claude_monitor.daily_aggregates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow read access" ON claude_monitor.tool_daily_aggregates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow read access" ON claude_monitor.sync_state FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Service role full access" ON claude_monitor.sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON claude_monitor.messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON claude_monitor.tool_usage FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON claude_monitor.daily_aggregates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON claude_monitor.tool_daily_aggregates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON claude_monitor.sync_state FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Initial sync state row
INSERT INTO claude_monitor.sync_state (status) VALUES ('idle');

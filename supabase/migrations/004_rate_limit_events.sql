-- Rate limit events table - captures actual "You've hit your limit" events from JSONL logs
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS claude_monitor.rate_limit_events (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timestamp           TIMESTAMPTZ NOT NULL,
  reset_message       TEXT,
  session_id          TEXT,
  tokens_in_window_input    BIGINT DEFAULT 0,
  tokens_in_window_output   BIGINT DEFAULT 0,
  tokens_in_window_cache_read BIGINT DEFAULT 0,
  tokens_in_window_cache_create BIGINT DEFAULT 0,
  messages_in_window  INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_rate_limit_ts UNIQUE (timestamp)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ts ON claude_monitor.rate_limit_events (timestamp DESC);

-- RLS
ALTER TABLE claude_monitor.rate_limit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access" ON claude_monitor.rate_limit_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role full access" ON claude_monitor.rate_limit_events FOR ALL TO service_role USING (true) WITH CHECK (true);


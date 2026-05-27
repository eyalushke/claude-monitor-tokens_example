-- Fix Supabase Advisor warnings
-- Rule 0001: Unindexed foreign key on tool_usage.message_id

CREATE INDEX IF NOT EXISTS idx_tool_usage_message
  ON claude_monitor.tool_usage (message_id);

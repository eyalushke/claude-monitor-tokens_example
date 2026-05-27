-- Drop unused tool_usage table.
-- Tool data is tracked via messages.tool_names (array) and tool_daily_aggregates.

DROP TABLE IF EXISTS claude_monitor.tool_usage CASCADE;

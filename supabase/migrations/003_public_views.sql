-- Create read-only views in public schema that map to claude_monitor tables.
-- This allows the Supabase JS client (which uses PostgREST) to read data
-- without needing to expose the claude_monitor schema in PostgREST config.
-- Run this in the Supabase SQL Editor AFTER 001_create_tables.sql.

CREATE OR REPLACE VIEW public.cm_sessions AS SELECT * FROM claude_monitor.sessions;
CREATE OR REPLACE VIEW public.cm_messages AS SELECT * FROM claude_monitor.messages;
CREATE OR REPLACE VIEW public.cm_tool_usage AS SELECT * FROM claude_monitor.tool_usage;
CREATE OR REPLACE VIEW public.cm_daily_aggregates AS SELECT * FROM claude_monitor.daily_aggregates;
CREATE OR REPLACE VIEW public.cm_tool_daily_aggregates AS SELECT * FROM claude_monitor.tool_daily_aggregates;
CREATE OR REPLACE VIEW public.cm_sync_state AS SELECT * FROM claude_monitor.sync_state;

-- Grant SELECT on views to anon and authenticated roles
GRANT SELECT ON public.cm_sessions TO anon, authenticated;
GRANT SELECT ON public.cm_messages TO anon, authenticated;
GRANT SELECT ON public.cm_tool_usage TO anon, authenticated;
GRANT SELECT ON public.cm_daily_aggregates TO anon, authenticated;
GRANT SELECT ON public.cm_tool_daily_aggregates TO anon, authenticated;
GRANT SELECT ON public.cm_sync_state TO anon, authenticated;

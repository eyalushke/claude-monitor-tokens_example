-- Cleanup: remove any public schema objects created by old migrations.
-- All app data lives exclusively in the claude_monitor schema.
-- Run this in Supabase SQL Editor if you previously ran 003_move_to_public.sql or 003_public_views.sql.

-- Drop public views (from 003_public_views.sql / 004_rate_limit_events.sql)
DROP VIEW IF EXISTS public.cm_sessions CASCADE;
DROP VIEW IF EXISTS public.cm_messages CASCADE;
DROP VIEW IF EXISTS public.cm_tool_usage CASCADE;
DROP VIEW IF EXISTS public.cm_daily_aggregates CASCADE;
DROP VIEW IF EXISTS public.cm_tool_daily_aggregates CASCADE;
DROP VIEW IF EXISTS public.cm_sync_state CASCADE;
DROP VIEW IF EXISTS public.cm_rate_limit_events CASCADE;

-- Drop public tables (from 003_move_to_public.sql, if it was ever run)
DROP TABLE IF EXISTS public.cm_tool_usage CASCADE;
DROP TABLE IF EXISTS public.cm_tool_daily_aggregates CASCADE;
DROP TABLE IF EXISTS public.cm_daily_aggregates CASCADE;
DROP TABLE IF EXISTS public.cm_messages CASCADE;
DROP TABLE IF EXISTS public.cm_sessions CASCADE;
DROP TABLE IF EXISTS public.cm_sync_state CASCADE;

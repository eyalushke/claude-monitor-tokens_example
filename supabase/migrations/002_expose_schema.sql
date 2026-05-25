-- Expose the claude_monitor schema via PostgREST (Supabase REST API)
-- This is required for the supabase-js and supabase-py clients to access the schema.
-- Run this AFTER 001_create_tables.sql in the Supabase SQL Editor.

-- Add claude_monitor to the list of exposed schemas
-- NOTE: This preserves your existing exposed schemas (public, src, familyvault, family_memories, storage)
ALTER ROLE authenticator SET pgrst.db_schemas TO 'public, src, familyvault, family_memories, storage, claude_monitor';

-- Reload PostgREST config to pick up the change immediately
SELECT pg_notify('pgrst', 'reload config');

# Claude Code Token Monitor

**Track, analyze, and optimize your Claude Code Max token usage.**

A full-stack monitoring dashboard that parses your local Claude Code session files, identifies what consumes your tokens, shows when you actually hit rate limits, and gives you actionable recommendations to stay under the limit.

> Designed and built by **Eyal Rosenfeld** ([@eyalushke](https://github.com/eyalushke))

---

## What It Does

Claude Code Max subscribers get a rolling 5-hour token window. When you exceed it, Claude locks you out until the window resets. This dashboard gives you full transparency into:

- **What happened before each lockout** - drill down into every session, subagent, tool call, and project that contributed
- **Which tools eat your tokens** - Read, Bash, Edit, Agent, WebFetch ranked by consumption
- **Which projects are heaviest** - per-project token breakdown over time
- **Real rate limit detection** - uses actual "You've hit your limit" events from your logs, not estimates
- **Optimization recommendations** - auto-generated tips based on your real usage patterns

## Screenshots

| Overview | Limit Analysis | Tool Breakdown |
|----------|---------------|----------------|
| KPI gauges, token timeline by project, throttle markers | Per-event drill-down with session stack and cumulative buildup | Which tools consume the most tokens |

## Architecture

```
~/.claude/projects/*.jsonl     (Claude Code writes these automatically)
         |
         v
  Python ingestion script      (parses JSONL, runs locally every 12hr)
         |
         v
  Supabase PostgreSQL           (claude_monitor schema, RLS-protected)
         |
         v
  Next.js Dashboard on Vercel   (dark/light theme, mobile + desktop)
```

**Key design decision:** No Anthropic API key needed. The dashboard reads JSONL files that Claude Code already saves to `~/.claude/projects/` on your Mac. Zero extra token cost.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Database | Supabase (PostgreSQL) with dedicated `claude_monitor` schema |
| Ingestion | Python 3 with psycopg2/supabase-py |
| Hosting | Vercel |
| Auto-sync | macOS LaunchAgent (launchd) |

## Dashboard Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Overview | KPI gauges, token timeline by project, model distribution, daily activity with throttle markers |
| `/limits` | Limit Analysis | Day-by-day throttle history with per-event drill-down: session stack, cumulative token buildup, session hierarchy (main + subagents) |
| `/tokens` | Tokens | Token type breakdown (input/output/cached), cache efficiency, model comparison |
| `/tools` | Tools | Tool-level analysis - which tools consume the most tokens |
| `/projects` | Projects | Per-project treemap and comparison table |
| `/costs` | Costs | Equivalent API cost tracking and value analysis |
| `/recommendations` | Tips | Auto-generated optimization suggestions based on your data |
| `/mockup` | Mockup | Interactive demo with sample data (no database needed) |

---

## Setup Guide (Step by Step)

### Prerequisites

- **macOS** with Claude Code installed (the JSONL files live at `~/.claude/projects/`)
- **Node.js 18+** and **npm**
- **Python 3.9+**
- A free **Supabase** account ([supabase.com](https://supabase.com))
- A free **Vercel** account ([vercel.com](https://vercel.com)) - optional, for hosting

### Step 1: Clone the Repository

```bash
git clone https://github.com/eyalushke/claude-monitor-tokens.git
cd claude-monitor-tokens
```

### Step 2: Verify .gitignore Works

Before touching any config, confirm secrets won't be tracked:

```bash
# Create dummy env files
echo "TEST=secret" > .env.local
echo "TEST=secret" > scripts/.env

# Verify they're ignored
git status
# Should show NO .env.local or scripts/.env in the output

# Clean up
rm .env.local scripts/.env
```

The `.gitignore` excludes all `.env*` files except the `.example` templates:
```
.env*
!.env.local.example
!scripts/.env.example
```

### Step 3: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and keys from **Settings > API > Project API keys**:
   - `Project URL` (e.g., `https://xxxxx.supabase.co`)
   - `anon/public key` (starts with `sb_publishable_` or `eyJ...`)
   - `service_role key` (starts with `sb_secret_` or `eyJ...`) - keep this secret!

### Step 4: Run Database Migrations

In your Supabase project, go to **SQL Editor** and run these files **in order**:

```
1. supabase/migrations/001_create_tables.sql     -- Creates tables in claude_monitor schema
2. supabase/migrations/002_expose_schema.sql      -- Exposes schema to PostgREST API
3. supabase/migrations/004_rate_limit_events.sql  -- Adds rate limit event tracking
```

> **Important:** After running `002_expose_schema.sql`, go to **Settings > API > Data API Settings > Exposed schemas** and verify `claude_monitor` appears in the list. If not, add it manually and restart the project from **Settings > General > Restart project**.

### Step 5: Configure Environment (Dashboard)

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_PLAN_TYPE=max5          # or: pro, max20
NEXT_PUBLIC_PLAN_TOKEN_LIMIT=88000  # pro=44000, max5=88000, max20=220000
NEXT_PUBLIC_PLAN_WINDOW_HOURS=5
```

### Step 6: Install and Run the Dashboard

```bash
npm install
npm run dev
```

Visit **http://localhost:3000/mockup** to see the dashboard with sample data (no DB needed).

Visit **http://localhost:3000** to see the real dashboard (needs Supabase data).

### Step 7: Configure the Ingestion Script

```bash
cd scripts
pip3 install -r requirements.txt
cp .env.example .env
```

Edit `scripts/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
CLAUDE_DIR=~/.claude
```

### Step 8: Test the Ingestion (Dry Run)

```bash
python3 ingest.py --dry-run
```

This parses all your JSONL files without writing to the database. You should see output like:

```
Found 572 JSONL files
Parsed 532 sessions, 24084 messages, 18 rate limit events
--- DRY RUN SUMMARY ---
Sessions: 532
Messages: 24084
Total input tokens: 1,807,705
Total output tokens: 11,128,705
Projects by token usage:
  eyal-second-brain-llm: 6,305,868
  zadara-finance-eom: 1,376,857
  ...
Tool invocation counts:
  Read: 6144
  Bash: 3999
  Edit: 1226
  ...
```

### Step 9: Run Real Ingestion

```bash
python3 ingest.py
```

This pushes all parsed data to Supabase. Takes about 20-30 seconds for the first full run. Subsequent runs are incremental (only new/modified files).

Now visit **http://localhost:3000** - your dashboard should show real data!

### Step 10: Set Up Auto-Sync (Every 12 Hours)

```bash
cd ..  # back to project root
bash scripts/setup-launchd.sh
```

This installs a macOS LaunchAgent that:
- Runs the ingestion script every 12 hours
- Also runs on login
- Logs to `~/Library/Logs/claude-monitor-ingest.log`

**Useful commands:**

```bash
# Run sync manually right now
launchctl start com.claude-monitor.ingest

# Check the log
tail -f ~/Library/Logs/claude-monitor-ingest.log

# Stop auto-sync
launchctl unload ~/Library/LaunchAgents/com.claude-monitor.ingest.plist
```

### Step 11: Deploy to Vercel (Optional)

```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add NEXT_PUBLIC_PLAN_TYPE production
npx vercel env add NEXT_PUBLIC_PLAN_TOKEN_LIMIT production
npx vercel env add NEXT_PUBLIC_PLAN_WINDOW_HOURS production
npx vercel --prod
```

---

## Security

| Check | Status |
|-------|--------|
| Hardcoded secrets in source code | None |
| Secrets in git history | None |
| `.env` files tracked by git | No - properly gitignored |
| Service role key exposed to browser | No - server-only with `import "server-only"` guard |
| Supabase RLS | Enabled on all tables; anon role is read-only |
| API routes | None exist - no server-side attack surface |

The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the only key visible in the browser. It's the publishable/anon key restricted by Row Level Security to SELECT-only queries.

---

## Data Model

All tables live in the `claude_monitor` schema in Supabase.

| Table | Description | Key Fields |
|-------|-------------|------------|
| `sessions` | One row per Claude Code session | id, project_name, started_at, total_*_tokens, is_subagent |
| `messages` | One row per assistant response | session_id, model, input_tokens, output_tokens, cache_*, tool_names |
| `tool_usage` | One row per tool invocation | message_id, tool_name, timestamp |
| `daily_aggregates` | Pre-computed daily summaries | date, project_name, model, token totals |
| `tool_daily_aggregates` | Per-tool daily summaries | date, tool_name, invocation_count, associated tokens |
| `rate_limit_events` | Actual "You've hit your limit" events | timestamp, reset_message, tokens_in_window_* |
| `sync_state` | Tracks ingestion progress | last_sync_at, files_processed, status |

---

## How the Ingestion Works

The Python script (`scripts/ingest.py`) reads JSONL files from `~/.claude/projects/`:

1. **Parses** each line as JSON, extracting `type: "assistant"` records with `message.usage` data
2. **Extracts** token counts (input, output, cache_read, cache_creation), tool names, model, session ID
3. **Detects** rate limit events from `"You've hit your limit"` text in assistant messages
4. **Aggregates** into daily summaries by project, model, and tool
5. **Upserts** everything to Supabase (idempotent - safe to re-run)

Flags:
- `--dry-run` - Parse and report without writing to DB
- `--force` - Re-process all files regardless of modification time

---

## FAQ

**Q: Does this use my Claude Code tokens?**
A: No. It reads files already on your disk. Zero API calls to Anthropic.

**Q: What's the "88K limit"?**
A: Community-estimated token limit for Max5 per 5-hour window. Our analysis shows the actual threshold is dynamic and varies based on cache usage. The dashboard tracks real throttle events instead of guessing.

**Q: Can I use this with Claude Code Pro (not Max)?**
A: Yes. Change `NEXT_PUBLIC_PLAN_TYPE=pro` and `NEXT_PUBLIC_PLAN_TOKEN_LIMIT=44000` in your `.env.local`.

**Q: Does it work on Linux/Windows?**
A: The dashboard (Next.js) works anywhere. The ingestion script needs access to `~/.claude/projects/` which is where Claude Code stores sessions. The auto-sync uses macOS launchd - on Linux, use a cron job instead.

**Q: How do I update after pulling new code?**
A: `npm install && npm run build` for the dashboard. `pip3 install -r scripts/requirements.txt` for the ingestion.

---

## License

MIT

---

Built with Claude Code, for Claude Code users.

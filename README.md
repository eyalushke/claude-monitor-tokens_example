# Claude Code Token Monitor

A monitoring dashboard that gives you complete visibility into your Claude Code Max license token usage. Parses local JSONL session files, stores structured data in Supabase, and displays interactive analytics on a Next.js dashboard.

## Features

- **5-Hour Window Gauge** - Real-time view of token budget consumption
- **Token Breakdown** - By model (Opus/Sonnet/Haiku), type (input/output/cached), and session
- **Tool Analysis** - Which tools (Read, Bash, Edit, Agent, etc.) consume the most tokens
- **Project Breakdown** - Token usage per project/repo
- **Cost Analysis** - Equivalent API cost tracking and value analysis for your Max plan
- **Recommendations** - Actionable optimization tips based on your actual usage patterns
- **Cache Efficiency** - Monitor cache hit rates and savings

## Architecture

```
~/.claude/projects/*.jsonl  -->  Python ingestion script  -->  Supabase (PostgreSQL)
                                                                      |
                                                              Next.js Dashboard (Vercel)
```

- **Data Source**: Local JSONL files that Claude Code already writes to `~/.claude/projects/`
- **No API key needed** - reads from files on disk, zero extra token cost
- **Database**: Supabase PostgreSQL
- **Frontend**: Next.js 15 + Tailwind CSS + shadcn/ui + Recharts
- **Hosting**: Vercel

## Quick Start

### 1. Set Up Supabase

1. Go to your Supabase project's SQL Editor
2. Run the migration SQL from `supabase/migrations/001_create_tables.sql`

### 2. Configure Environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### 3. Install & Run Dashboard

```bash
npm install
npm run dev
# Visit http://localhost:3000
```

### 4. Ingest Data

```bash
cd scripts
pip3 install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase credentials

# Test parsing (no DB writes):
python3 ingest.py --dry-run

# Run real ingestion:
python3 ingest.py
```

### 5. Set Up Auto-Sync (Optional)

```bash
bash scripts/setup-launchd.sh
# Runs ingestion every 2 hours via macOS LaunchAgent
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Overview dashboard with KPIs, token timeline, model distribution |
| `/tokens` | Token type breakdown, cache efficiency, model comparison |
| `/tools` | Tool analysis - which tools consume the most tokens |
| `/projects` | Per-project token usage treemap and comparison |
| `/costs` | Cost analysis, value tracking, projections |
| `/recommendations` | AI-powered optimization suggestions |
| `/mockup` | Interactive mockup with sample data (no DB needed) |

## Tech Stack

- **Next.js 15** with App Router and TypeScript
- **Tailwind CSS** + **shadcn/ui** for styling
- **Recharts** for data visualization
- **Supabase** (PostgreSQL) for data storage
- **Python 3** for local data ingestion
- **Vercel** for deployment

## Data Model

The ingestion script parses JSONL files and populates:

- `sessions` - One row per Claude Code session (526+ sessions)
- `messages` - One row per assistant response with token counts (23,600+ messages)
- `tool_usage` - One row per tool invocation
- `daily_aggregates` - Pre-computed daily summaries
- `tool_daily_aggregates` - Per-tool daily summaries

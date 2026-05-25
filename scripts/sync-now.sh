#!/bin/bash
# Manually trigger the ingestion script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Running ingestion..."
python3 "$SCRIPT_DIR/ingest.py" "$@"

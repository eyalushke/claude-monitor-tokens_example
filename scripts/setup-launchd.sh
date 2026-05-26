#!/bin/bash
# Sets up macOS LaunchAgents for:
#   1. Ingestion script (every 12 hours)
#   2. Trigger server (always-on, lets the browser trigger syncs)
# Usage: bash scripts/setup-launchd.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Agent 1: Ingestion (periodic) ──────────────────────────────

INGEST_PLIST_NAME="com.claude-monitor.ingest"
INGEST_PLIST_PATH="$HOME/Library/LaunchAgents/${INGEST_PLIST_NAME}.plist"
INGEST_LOG_PATH="$HOME/Library/Logs/claude-monitor-ingest.log"
INTERVAL=43200  # 12 hours in seconds

cat > "$INGEST_PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${INGEST_PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>${SCRIPT_DIR}/ingest.py</string>
    </array>
    <key>StartInterval</key>
    <integer>${INTERVAL}</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${INGEST_LOG_PATH}</string>
    <key>StandardErrorPath</key>
    <string>${INGEST_LOG_PATH}</string>
    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

launchctl unload "$INGEST_PLIST_PATH" 2>/dev/null
launchctl load "$INGEST_PLIST_PATH"

# ── Agent 2: Trigger Server (always-on) ───────────────────────

TRIGGER_PLIST_NAME="com.claude-monitor.trigger"
TRIGGER_PLIST_PATH="$HOME/Library/LaunchAgents/${TRIGGER_PLIST_NAME}.plist"
TRIGGER_LOG_PATH="$HOME/Library/Logs/claude-monitor-trigger.log"

cat > "$TRIGGER_PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${TRIGGER_PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>${SCRIPT_DIR}/trigger_server.py</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${TRIGGER_LOG_PATH}</string>
    <key>StandardErrorPath</key>
    <string>${TRIGGER_LOG_PATH}</string>
    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

launchctl unload "$TRIGGER_PLIST_PATH" 2>/dev/null
launchctl load "$TRIGGER_PLIST_PATH"

echo ""
echo "=== Claude Monitor Agents Installed ==="
echo ""
echo "  1. Auto-Sync (ingestion every 12hr + on login)"
echo "     Plist:  $INGEST_PLIST_PATH"
echo "     Log:    $INGEST_LOG_PATH"
echo ""
echo "  2. Trigger Server (always-on, localhost:7829)"
echo "     Plist:  $TRIGGER_PLIST_PATH"
echo "     Log:    $TRIGGER_LOG_PATH"
echo ""
echo "Commands:"
echo "  Run sync now:      launchctl start $INGEST_PLIST_NAME"
echo "  Check ingest log:  tail -f $INGEST_LOG_PATH"
echo "  Check trigger log: tail -f $TRIGGER_LOG_PATH"
echo "  Stop ingest:       launchctl unload $INGEST_PLIST_PATH"
echo "  Stop trigger:      launchctl unload $TRIGGER_PLIST_PATH"

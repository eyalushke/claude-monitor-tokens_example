#!/bin/bash
# Sets up a macOS LaunchAgent to run the ingestion script every 6 hours.
# Usage: bash scripts/setup-launchd.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_NAME="com.claude-monitor.ingest"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"
LOG_PATH="$HOME/Library/Logs/claude-monitor-ingest.log"
INTERVAL=21600  # 6 hours in seconds

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
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
    <string>${LOG_PATH}</string>
    <key>StandardErrorPath</key>
    <string>${LOG_PATH}</string>
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

# Unload old agents (ingest + trigger server if present)
launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl unload "$HOME/Library/LaunchAgents/com.claude-monitor.trigger.plist" 2>/dev/null
rm -f "$HOME/Library/LaunchAgents/com.claude-monitor.trigger.plist"

launchctl load "$PLIST_PATH"

echo ""
echo "=== Claude Monitor Auto-Sync Installed ==="
echo "  Schedule:  Every 6 hours + on login"
echo "  Plist:     $PLIST_PATH"
echo "  Log:       $LOG_PATH"
echo ""
echo "Commands:"
echo "  Run now:   launchctl start $PLIST_NAME"
echo "  Check log: tail -f $LOG_PATH"
echo "  Stop:      launchctl unload $PLIST_PATH"

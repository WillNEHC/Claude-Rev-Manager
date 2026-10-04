#!/usr/bin/env bash
# Launches the bundled Hospitable MCP server for cloud sessions (see .mcp.json).
# The key comes from the cloud environment's variables, never from a committed file.
# stdout is the MCP protocol channel, so all build output goes to stderr.
set -euo pipefail
dir="$(cd "$(dirname "$0")/../mcp-servers/hospitable" && pwd)"
if [ -z "${HOSPITABLE_API_KEY:-}" ]; then
  echo "HOSPITABLE_API_KEY is not set; add it to the cloud environment's variables." >&2
  exit 1
fi
if [ ! -f "$dir/dist/index.js" ]; then
  (cd "$dir" && npm ci --silent && npm run build --silent) 1>&2
fi
exec node "$dir/dist/index.js"

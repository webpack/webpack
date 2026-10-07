#!/bin/bash
# Installs dependencies in a Claude Code cloud session so lint and tests run.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
	exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
node tooling/retry.js yarn --frozen-lockfile

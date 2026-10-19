#!/bin/bash
# Installs dependencies in a Claude Code cloud session so lint and tests run.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
	exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
# Everything this prints lands in the agent's context on every start and
# resume, so the install log is shown only when the install fails.
log="$(mktemp)"
if ! node tooling/retry.js yarn --frozen-lockfile >"$log" 2>&1; then
	cat "$log" >&2
	exit 1
fi

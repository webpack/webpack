#!/bin/bash
# Installs dependencies in a Claude Code cloud session so lint and tests run.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
	exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
# Stdout lands in the agent's context on every start and resume, so the
# install log is printed only on failure, to stdout with exit 0: Claude Code
# shows only the first stderr line of a failing SessionStart hook.
log="$(mktemp)"
trap 'rm -f "$log"' EXIT
if ! node tooling/retry.js yarn --frozen-lockfile >"$log" 2>&1; then
	cat "$log"
fi

#!/usr/bin/env bash
# One memory-heavy check at a time on this 16 GB Mac (tsc --noEmit, full vitest, docker test stacks, image builds).
# Usage: bash heavy.sh <command> [args...]   — waits for the shared lock, runs the command, releases the lock.
# The lock is a directory (atomic mkdir); a lock older than 45 minutes is treated as stale (its holder died).
set -uo pipefail
lock=/tmp/ppm-heavy-check.lock.d
while ! mkdir "$lock" 2>/dev/null; do
  if [[ -n "$(find "$lock" -maxdepth 0 -mmin +45 2>/dev/null)" ]]; then
    rmdir "$lock" 2>/dev/null || rm -rf "$lock"
    continue
  fi
  sleep 5
done
trap 'rmdir "$lock" 2>/dev/null || true' EXIT
"$@"

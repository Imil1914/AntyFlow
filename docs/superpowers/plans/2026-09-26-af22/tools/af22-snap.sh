#!/usr/bin/env bash
# AF2.2: snapshot the WHOLE plane-fork working tree as a dangling commit (no index/HEAD/ref changes).
# Chained via $WS/snap.tip. Usage: af22-snap.sh <label>   → prints sha
set -euo pipefail
PF=/Users/ermolov/Desktop/PPM/plane-fork
WS=/Users/ermolov/Desktop/PPM/.superpowers/sdd/2026-09-26-af22-living-map
label=${1:?label required}
mkdir -p "$WS"; cd "$PF"
lock="$WS/snap.lock.d"; for i in $(seq 1 60); do mkdir "$lock" 2>/dev/null && break; sleep 1; done
trap 'rmdir "$lock" 2>/dev/null || true' EXIT
idx="$WS/snap.index"; rm -f "$idx" "$idx.lock"
GIT_INDEX_FILE="$idx" git read-tree HEAD
GIT_INDEX_FILE="$idx" git add -A . >/dev/null 2>&1
tree=$(GIT_INDEX_FILE="$idx" git write-tree)
parent=$(cat "$WS/snap.tip" 2>/dev/null || git rev-parse HEAD)
sha=$(printf 'af22 snapshot: %s\n' "$label" | GIT_AUTHOR_NAME=af22 GIT_AUTHOR_EMAIL=af22@local GIT_COMMITTER_NAME=af22 GIT_COMMITTER_EMAIL=af22@local git commit-tree "$tree" -p "$parent")
echo "$sha" > "$WS/snap.tip"; printf '%s %s\n' "$sha" "$label" >> "$WS/snapshots.log"; rm -f "$idx"
echo "$sha"

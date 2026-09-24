#!/usr/bin/env bash
# UX0.2: snapshot the WHOLE plane-fork working tree (tracked + untracked, .gitignore respected)
# as a dangling commit object, WITHOUT touching the working tree, the real index, HEAD or any ref.
# Snapshots are chained (each one's parent is the previous snapshot) so review packages can use
# `git log/diff BASE..HEAD` on them. The chain tip is stored in the SDD workspace.
# Usage: ux02-snap.sh <label>        prints the snapshot commit sha
set -euo pipefail
PF=/Users/ermolov/Desktop/PPM/plane-fork
WS=/Users/ermolov/Desktop/PPM/.superpowers/sdd/2026-09-24-ux02-design-fixes
label=${1:?label required}
mkdir -p "$WS"
cd "$PF"
idx="$WS/snap.index"
rm -f "$idx" "$idx.lock"
GIT_INDEX_FILE="$idx" git read-tree HEAD
GIT_INDEX_FILE="$idx" git add -A . >/dev/null 2>&1
tree=$(GIT_INDEX_FILE="$idx" git write-tree)
parent=$(cat "$WS/snap.tip" 2>/dev/null || git rev-parse HEAD)
sha=$(printf 'ux02 snapshot: %s\n' "$label" | GIT_AUTHOR_NAME=ux02 GIT_AUTHOR_EMAIL=ux02@local GIT_COMMITTER_NAME=ux02 GIT_COMMITTER_EMAIL=ux02@local git commit-tree "$tree" -p "$parent")
echo "$sha" > "$WS/snap.tip"
printf '%s %s\n' "$sha" "$label" >> "$WS/snapshots.log"
rm -f "$idx"
echo "$sha"

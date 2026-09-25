#!/usr/bin/env bash
# List files changed since BASE (outside apps/api) that have no UX1.1 pre-image → someone else's edits.
set -euo pipefail
BASE=${1:-4e1547df3d152abf03ea53d01d5da13371d10f89}
PF=/Users/ermolov/Desktop/PPM/plane-fork; PRE=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/pre
HEAD=$(cat "$(cat /Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/tools/WS.path)/snap.tip")
git -C "$PF" diff --name-only "$BASE" "$HEAD" -- . ':(exclude)apps/api' | while read -r f; do
  [ -e "$PRE/$f" ] || [ -e "$PRE/$f.__absent__" ] || echo "FOREIGN: $f"
done

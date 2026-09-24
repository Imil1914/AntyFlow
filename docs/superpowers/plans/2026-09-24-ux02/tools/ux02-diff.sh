#!/usr/bin/env bash
# UX0.2: print a unified diff of ONLY the UX0.2 changes (pre-image vs current).
# Usage: ux02-diff.sh [> ux02.patch]      rollback of one file: cp pre/<rel> plane-fork/<rel>
set -euo pipefail
PF=/Users/ermolov/Desktop/PPM/plane-fork
PRE=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux02/pre
cd "$PRE"
find . -type f | sed 's|^\./||' | sort | while read -r f; do
  if [[ "$f" == *.__absent__ ]]; then
    rel="${f%.__absent__}"
    diff -uN /dev/null "$PF/$rel" --label "a/$rel" --label "b/$rel" || true
  else
    diff -uN "$PRE/$f" "$PF/$f" --label "a/$f" --label "b/$f" || true
  fi
done

#!/usr/bin/env bash
# AF2.1: unified diff of ONLY the AF2.1 changes (pre-image vs current).
# Usage: af21-diff.sh [path-prefix ...]   (no prefix = everything)   > af21.patch
# Roll back one file: cp pre/<rel> plane-fork/<rel>   (or rm it if pre/<rel>.__absent__)
set -euo pipefail
PF=/Users/ermolov/Desktop/PPM/plane-fork
PRE=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/pre
cd "$PRE"
find . -type f | sed 's|^\./||' | sort | while read -r f; do
  rel="${f%.__absent__}"
  if [ "$#" -gt 0 ]; then
    keep=0; for p in "$@"; do case "$rel" in "$p"*) keep=1;; esac; done
    [ "$keep" = 1 ] || continue
  fi
  if [[ "$f" == *.__absent__ ]]; then
    [ -e "$PF/$rel" ] && diff -uN /dev/null "$PF/$rel" --label "a/$rel" --label "b/$rel" || true
  else
    diff -uN "$PRE/$f" "$PF/$f" --label "a/$f" --label "b/$f" || true
  fi
done

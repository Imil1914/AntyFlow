#!/usr/bin/env bash
# UX1.1: save the pre-image of every file BEFORE its first edit (post-wave-0 state).
# Usage: ux11-pre.sh <path-relative-to-plane-fork> [...]
# Wave 0 (UX0.2) is uncommitted in the same tree, so git cannot isolate UX1.1 changes.
set -euo pipefail
PF=/Users/ermolov/Desktop/PPM/plane-fork
PRE=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/pre
for rel in "$@"; do
  src="$PF/$rel"; dst="$PRE/$rel"
  if [ -e "$dst" ] || [ -e "$dst.__absent__" ]; then continue; fi
  mkdir -p "$(dirname "$dst")"
  if [ -e "$src" ]; then cp -p "$src" "$dst"; else : > "$dst.__absent__"; fi
  echo "pre-image saved: $rel"
done

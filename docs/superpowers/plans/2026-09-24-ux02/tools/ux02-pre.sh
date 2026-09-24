#!/usr/bin/env bash
# UX0.2: save the pre-image of every file BEFORE its first edit.
# Usage (from anywhere): ux02-pre.sh <path-relative-to-plane-fork> [...]
# The working tree holds uncommitted/untracked work of other agents, so git
# cannot isolate UX0.2 changes. Pre-images let us diff and roll back only ours.
set -euo pipefail
PF=/Users/ermolov/Desktop/PPM/plane-fork
PRE=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux02/pre
for rel in "$@"; do
  src="$PF/$rel"
  dst="$PRE/$rel"
  if [ -e "$dst" ] || [ -e "$dst.__absent__" ]; then
    continue # pre-image already saved; never overwrite it
  fi
  mkdir -p "$(dirname "$dst")"
  if [ -e "$src" ]; then
    cp -p "$src" "$dst"
  else
    : > "$dst.__absent__" # file is new in UX0.2
  fi
  echo "pre-image saved: $rel"
done

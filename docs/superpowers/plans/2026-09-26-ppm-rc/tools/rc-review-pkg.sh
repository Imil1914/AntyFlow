#!/usr/bin/env bash
# RC: write a review package (stat + full diff) for one task, limited to given paths.
# Usage: af22-review-pkg.sh <task-no> <base-sha> <head-sha> <path> [path...]   → prints package path
set -euo pipefail
n=$1; base=$2; head=$3; shift 3
WS=$(cat /Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-ppm-rc/tools/WS.path)
out="$WS/review-task-$n.diff"
cd /Users/ermolov/Desktop/PPM/plane-fork
{
  echo "# Review package — Task $n  BASE=$base HEAD=$head"
  echo "# Limited to the task's paths: $*  (explicit paths only)"
  echo
  git diff --stat=160 "$base" "$head" -- "$@"
  echo
  git diff -U10 "$base" "$head" -- "$@"
} > "$out"
echo "$out ($(wc -l < "$out" | tr -d ' ') lines)"

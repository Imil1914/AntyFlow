#!/usr/bin/env bash
# AF2.2: rebuild a workspace package's dist under a global lock (two lanes may build concurrently).
# Usage: af22-pkg-build.sh ppm-brand|ppm-canvas|propel|ui|i18n
set -euo pipefail
pkg=${1:?package dir under plane-fork/packages}
lock=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-af22/.pkg-build.lock.d
for i in $(seq 1 300); do mkdir "$lock" 2>/dev/null && break; sleep 1; done
trap 'rmdir "$lock" 2>/dev/null || true' EXIT
cd "/Users/ermolov/Desktop/PPM/plane-fork/packages/$pkg"
./node_modules/.bin/tsdown --no-clean

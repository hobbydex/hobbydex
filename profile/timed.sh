#!/usr/bin/env bash
# usage: profile/timed.sh NAME -- COMMAND...  writes $PROF_OUT/NAME.time (GNU time -v report: wall, peak RSS, CPU)
set -u
name=$1; shift; [ "${1:-}" = -- ] && shift
mkdir -p "$PROF_OUT"
/usr/bin/time -v -o "$PROF_OUT/$name.time" "$@"
rc=$?
echo "[timed] $name exit=$rc" >&2
exit $rc

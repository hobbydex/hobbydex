#!/usr/bin/env bash
# prefixes every line with the epoch time (seconds.micro) at which it was read
while IFS= read -r line; do printf '%s %s\n' "$EPOCHREALTIME" "$line"; done

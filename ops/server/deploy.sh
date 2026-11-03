#!/usr/bin/env bash
# Uploads a built site to the server as a new release and switches the live symlink to it.
#   DEPLOY_HOST=1.2.3.4 ops/server/deploy.sh [dist-dir]
# Env: DEPLOY_HOST (required), DEPLOY_USER (deploy), DEPLOY_KEEP (old releases kept, 2),
#      DEPLOY_ID (release name; default a UTC timestamp), SSH_OPTS (extra ssh options).
# The new release is hard-linked against the live one (--link-dest), so only changed files travel and
# unchanged files take no extra disk. Nothing under `current` is touched until the final symlink switch,
# which is atomic: visitors never see a half-uploaded or half-deleted site.
set -euo pipefail

DIST="${1:-dist}"
HOST="${DEPLOY_HOST:?DEPLOY_HOST is required}"
USER_="${DEPLOY_USER:-deploy}"
KEEP="${DEPLOY_KEEP:-2}"
ID="${DEPLOY_ID:-$(date -u +%Y%m%d%H%M%S)}"
BASE=/srv/hobbydex
SSH="ssh -o BatchMode=yes -o StrictHostKeyChecking=yes ${SSH_OPTS:-}"
[ -f "$DIST/index.html" ] || { echo "$DIST has no index.html: not a built site" >&2; exit 1; }

$SSH "$USER_@$HOST" "mkdir -p $BASE/releases/$ID"
# --checksum: the build gives every file a new mtime, so size+mtime would re-send everything.
rsync -a --checksum --delete-after --chmod=D755,F644 \
  --link-dest="$BASE/current/" -e "$SSH" \
  "$DIST"/ "$USER_@$HOST:$BASE/releases/$ID/"
$SSH "$USER_@$HOST" "set -e; cd $BASE
  ln -sfn releases/$ID current.new && mv -T current.new current
  ls -1d releases/* | sort -r | tail -n +$((KEEP + 2)) | xargs -r rm -rf"
echo "deployed release $ID to $HOST"

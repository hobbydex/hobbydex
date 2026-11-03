#!/usr/bin/env bash
# Uploads a built site to the server as a new release and switches the live symlink to it.
#   DEPLOY_HOST=1.2.3.4 ops/server/deploy.sh [dist-dir]
# Env: DEPLOY_HOST (required), DEPLOY_USER (deploy), DEPLOY_KEEP (old releases kept, 2),
#      DEPLOY_BASE (/srv/hobbydex), DEPLOY_ID (release name; default a UTC timestamp), SSH_OPTS (extra ssh options).
# The new release is hard-linked against the live one (--link-dest; mtimes are normalised so it works), so only
# changed files travel and unchanged files take no extra disk. A sha256 manifest check gates the switch. Nothing under `current` is touched until the final symlink switch,
# which is atomic: visitors never see a half-uploaded or half-deleted site.
set -euo pipefail

DIST="${1:-dist}"
HOST="${DEPLOY_HOST:?DEPLOY_HOST is required}"
USER_="${DEPLOY_USER:-deploy}"
KEEP="${DEPLOY_KEEP:-2}"
ID="${DEPLOY_ID:-$(date -u +%Y%m%d%H%M%S)}"
BASE="${DEPLOY_BASE:-/srv/hobbydex}"
SSH="ssh -o BatchMode=yes -o StrictHostKeyChecking=yes ${SSH_OPTS:-}"
[ -f "$DIST/index.html" ] || { echo "$DIST has no index.html: not a built site" >&2; exit 1; }

# Every file gets the same fixed mtime: rsync --link-dest only hard-links a file whose attributes match the
# one in the live release, and a fresh build gives every file a new mtime. With equal mtimes and
# --checksum, unchanged files are hard-linked from `current` (no transfer, no extra disk) and only
# changed files travel.
find "$DIST" -print0 | xargs -0 -r -P 8 -n 2000 touch -h -d @0
# sha256 manifest of every file in dist; the server verifies the finished release against it.
MANIFEST="$(mktemp)"
trap 'rm -f "$MANIFEST"' EXIT
(cd "$DIST" && find . -type f -print0 | sort -z | xargs -0 -r -P 8 -n 500 sha256sum) | sort -k2 > "$MANIFEST"
[ -s "$MANIFEST" ] || { echo "empty manifest" >&2; exit 1; }
FILES="$(wc -l < "$MANIFEST")"

$SSH "$USER_@$HOST" "mkdir -p $BASE/releases/$ID"
rsync -a --checksum --delete-after --chmod=D755,F644 \
  --link-dest="$BASE/current/" -e "$SSH" \
  "$DIST"/ "$USER_@$HOST:$BASE/releases/$ID/"
# Verify before the switch: the release holds exactly the files of dist, byte for byte. Any mismatch
# aborts (set -e) and `current` stays on the old release.
$SSH "$USER_@$HOST" "cat > $BASE/releases/.$ID.sha256" < "$MANIFEST"
$SSH "$USER_@$HOST" "set -e; cd $BASE/releases/$ID
  n=\$(find . -type f | wc -l)
  [ \"\$n\" -eq $FILES ] || { echo \"release has \$n files, manifest $FILES\" >&2; exit 1; }
  sha256sum --check --quiet --strict ../.$ID.sha256 >&2 || { echo 'manifest check FAILED: not switching' >&2; exit 1; }
  echo \"manifest check ok: $FILES files\"
  rm -f ../.$ID.sha256"
$SSH "$USER_@$HOST" "set -e; cd $BASE
  ln -sfn releases/$ID current.new && mv -T current.new current
  ls -1d releases/* | sort -r | tail -n +$((KEEP + 2)) | xargs -r rm -rf"
echo "deployed release $ID to $HOST"

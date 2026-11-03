#!/usr/bin/env bash
# Uploads a built site to the server as a new release and switches the live symlink to it.
#   DEPLOY_HOST=1.2.3.4 ops/server/deploy.sh [dist-dir]
# Env: DEPLOY_HOST (required), DEPLOY_USER (deploy), DEPLOY_KEEP (old releases kept, 2),
#      DEPLOY_BASE (/srv/hobbydex), DEPLOY_ID (release name; default a UTC timestamp), SSH_OPTS (extra ssh options).
# The new release is hard-linked against the live one (--link-dest; mtimes are normalised so it works), so only
# changed files travel and unchanged files take no extra disk. A sha256 manifest check (changed files only) gates the
# switch; old releases are then deleted in the background at idle priority. Nothing under `current` is touched until the final symlink switch,
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

# Manifest and mtimes. Every file's mtime is set to a value derived from its sha256: 1e9 + the first 28 bits, i.e. 2001-2010 (a far-future
# mtime is clamped by the server's file system and different files then look equal), so
# rsync's quick check (size + mtime, no hashing on the server) matches exactly the unchanged files:
# those are hard-linked from `current` (--link-dest), nothing is transferred and no disk is used.
# Changed files differ in hash, so they travel. Manifest lines: "<sha256> <size> <path>".
MANIFEST="$(mktemp)"
trap 'rm -f "$MANIFEST"' EXIT
python3 -I - "$DIST" > "$MANIFEST" <<'PY'
import hashlib, os, sys
root = sys.argv[1]
out = []
for d, dirs, files in os.walk(root):
    dirs.sort()
    for f in files:
        p = os.path.join(d, f)
        if os.path.islink(p) or not os.path.isfile(p):
            continue
        h = hashlib.sha256()
        with open(p, "rb") as fh:
            for chunk in iter(lambda: fh.read(1 << 20), b""):
                h.update(chunk)
        os.utime(p, (1_000_000_000 + int(h.hexdigest()[:7], 16),) * 2)
        out.append((os.path.relpath(p, root), h.hexdigest(), os.path.getsize(p)))
for d, dirs, files in os.walk(root):
    os.utime(d, (0, 0))
for rel, hx, size in sorted(out):
    print(hx, size, rel)
PY
[ -s "$MANIFEST" ] || { echo "empty manifest" >&2; exit 1; }
FILES="$(wc -l < "$MANIFEST")"

cpu() { $SSH "$USER_@$HOST" "awk '/^cpu /{print \$2+\$3+\$4+\$7+\$8}' /proc/stat"; }  # busy jiffies, whole server
CPU0="$(cpu)"
$SSH "$USER_@$HOST" "mkdir -p $BASE/releases/$ID"
rsync -a --delete-after --chmod=D755,F644 \
  --link-dest="$BASE/current/" -e "$SSH" \
  "$DIST"/ "$USER_@$HOST:$BASE/releases/$ID/"
# Verify before the switch (any failure aborts via set -e and `current` stays on the old release):
#  - complete: the release's file list (paths and sizes) equals the manifest;
#  - correct: a file that is a hard link (link count > 1) is the very inode of the same path in the live release,
#    so its sha256 must equal the live release's manifest entry for that path (stored on the server as
#    releases/.manifest-<id>); every other file is hashed and compared with the new manifest.
#    The rsync quick check can wrongly keep an old file; this catches it. With no stored manifest of the live
#    release (first deploy of this scheme) everything is hashed.
$SSH "$USER_@$HOST" "cat > $BASE/releases/.$ID.sha256" < "$MANIFEST"
$SSH "$USER_@$HOST" bash -s -- "$BASE" "$ID" "$FILES" <<'REMOTE'
set -eo pipefail
export LC_ALL=C
BASE=$1 ID=$2 FILES=$3
cd "$BASE/releases/$ID"
find . -type f -printf '%s %P\n' | sort -k2 > ../.$ID.have
awk '{match($0, /^[^ ]+ /); r=substr($0, RLENGTH+1); match(r, /^[^ ]+ /); print substr(r, 1, RLENGTH-1) " " substr(r, RLENGTH+1)}' ../.$ID.sha256 | sort -k2 | cmp -s - ../.$ID.have || { echo 'file list differs from manifest: not switching' >&2; exit 1; }
find . -type f -links 1 -printf '%P\n' | sort > ../.$ID.new
PREV="$(basename "$(readlink ../../current 2>/dev/null)" 2>/dev/null || true)"
PM="../.manifest-$PREV"
ALL=0
if [ -z "$PREV" ] || [ ! -f "$PM" ]; then PM=/dev/null; ALL=1; fi
cat <(sed 's/^/L /' ../.$ID.new) <(sed 's/^/P /' "$PM") <(sed 's/^/M /' ../.$ID.sha256) | awk -v all=$ALL -v check=../.$ID.check '
  { t = substr($0, 1, 1); r = substr($0, 3) }
  t == "L" { l[r] = 1; next }
  t == "P" { match(r, /^[^ ]+ [^ ]+ /); p[substr(r, RLENGTH + 1)] = substr(r, 1, index(r, " ") - 1); next }
  { h = substr(r, 1, index(r, " ") - 1); match(r, /^[^ ]+ [^ ]+ /); f = substr(r, RLENGTH + 1)
    if (all || (f in l)) { print h "  " f > check; n++ }
    else if (p[f] != h) { if (bad++ < 5) print "linked file differs from the live release: " f > "/dev/stderr" } }
  END { close(check); if (bad) { print bad " stale linked files: not switching" > "/dev/stderr"; exit 1 } }'
[ -f ../.$ID.check ] || : > ../.$ID.check
sha256sum --check --quiet --strict ../.$ID.check >&2 || { echo 'manifest check FAILED: not switching' >&2; exit 1; }
echo "manifest check ok: $FILES files, $(wc -l < ../.$ID.check) hashed, the rest verified against the live release's manifest"
mv ../.$ID.sha256 ../.manifest-$ID
rm -f ../.$ID.have ../.$ID.new ../.$ID.check
REMOTE
echo "server CPU for the upload and check: $(( $(cpu) - CPU0 )) jiffies (1/100 s)"
T0="$(date +%s)"
$SSH "$USER_@$HOST" "set -e; cd $BASE
  ln -sfn releases/$ID current.new && mv -T current.new current
  # Old releases: rename out of the way (instant), then delete in the background at idle priority, so this
  # job ends right after the switch. A release holds ~575k directory entries; deleting takes about a minute.
  ls -1d releases/* | sort -r | tail -n +$((KEEP + 2)) | while read -r r; do mv -T \"\$r\" \"releases/.trash-\${r#releases/}\"; rm -f \"releases/.manifest-\${r#releases/}\"; done
  nohup setsid nice -n 19 ionice -c 3 sh -c 'rm -rf releases/.trash-*' > /dev/null 2>&1 < /dev/null &"
echo "switched in $(( $(date +%s) - T0 )) s; deployed release $ID to $HOST (old releases are removed in the background)"

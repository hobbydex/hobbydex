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

# Manifest and mtimes. Every file's mtime is set to a value derived from its sha256 (first 40 bits), so
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
        os.utime(p, (int(h.hexdigest()[:10], 16),) * 2)
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
#  - correct: every file that is not a hard link to the already verified live release (link count 1) is
#    hashed and compared; hard-linked files are the very inodes verified when they were first deployed.
#    With no previous release nothing is linked, so everything is hashed.
$SSH "$USER_@$HOST" "cat > $BASE/releases/.$ID.sha256" < "$MANIFEST"
$SSH "$USER_@$HOST" "set -e; export LC_ALL=C; cd $BASE/releases/$ID
  find . -type f -printf '%s %P\n' | sort -k2 > ../.$ID.have
  awk '{match(\$0, /^[^ ]+ /); r=substr(\$0, RLENGTH+1); match(r, /^[^ ]+ /); print substr(r, 1, RLENGTH-1) \" \" substr(r, RLENGTH+1)}' ../.$ID.sha256 | sort -k2 | cmp -s - ../.$ID.have || { echo 'file list differs from manifest: not switching' >&2; exit 1; }
  find . -type f -links 1 -printf '%P\n' | sort > ../.$ID.new
  awk 'NR==FNR{n[\$0]=1; next} {match(\$0, /^[^ ]+ [^ ]+ /); p=substr(\$0, RLENGTH+1); if (p in n) print substr(\$0, 1, index(\$0, \" \") - 1) \"  \" p}' ../.$ID.new ../.$ID.sha256 > ../.$ID.check
  sha256sum --check --quiet --strict ../.$ID.check >&2 || { echo 'manifest check FAILED: not switching' >&2; exit 1; }
  echo \"manifest check ok: $FILES files, \$(wc -l < ../.$ID.check) hashed (not linked from the live release)\"
  rm -f ../.$ID.sha256 ../.$ID.have ../.$ID.new ../.$ID.check"
echo "server CPU for the upload and check: $(( $(cpu) - CPU0 )) jiffies (1/100 s)"
T0="$(date +%s)"
$SSH "$USER_@$HOST" "set -e; cd $BASE
  ln -sfn releases/$ID current.new && mv -T current.new current
  # Old releases: rename out of the way (instant), then delete in the background at idle priority, so this
  # job ends right after the switch. A release holds ~575k directory entries; deleting takes about a minute.
  ls -1d releases/* | sort -r | tail -n +$((KEEP + 2)) | while read -r r; do mv -T \"\$r\" \"releases/.trash-\${r#releases/}\"; done
  nohup setsid nice -n 19 ionice -c 3 sh -c 'rm -rf releases/.trash-*' > /dev/null 2>&1 < /dev/null &"
echo "switched in $(( $(date +%s) - T0 )) s; deployed release $ID to $HOST (old releases are removed in the background)"

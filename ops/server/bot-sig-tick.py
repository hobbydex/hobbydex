#!/usr/bin/python3 -I
"""Writes the current Web Bot Auth key-directory signature for Caddy (run every minute by hobbydex-botsig.timer).

The crawler's PC signs ahead (hobbydex-tools: tools/web_bot_auth.py push-directory-signatures) and uploads
SIG_DIR/signatures.tsv: lines "created<TAB>Signature-Input<TAB>Signature", one per minute, each valid 5 minutes.
This picks the newest line whose created has come and writes its two values to SIG_DIR/signature-input and
SIG_DIR/signature, which the Caddyfile reads on every request ({file.*} placeholders). The private key is never on
this server. When the list has run out, the last signature written stays (stale until the PC pushes again).

Env: BOT_SIG_DIR (default /srv/hobbydex/bot-sig), BOT_SIG_NOW (unix time; tests only).
"""
import bisect, os, sys, time

SIG_DIR = os.environ.get("BOT_SIG_DIR", "/srv/hobbydex/bot-sig")


def write(name, value):
    path = os.path.join(SIG_DIR, name)
    try:
        if open(path).read() == value:
            return
    except OSError:
        pass
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        f.write(value)
    os.chmod(tmp, 0o644)
    os.replace(tmp, path)


def main():
    now = int(os.environ.get("BOT_SIG_NOW") or time.time())
    try:
        rows = [line.rstrip("\n").split("\t") for line in open(os.path.join(SIG_DIR, "signatures.tsv"))]
    except OSError as e:
        sys.exit(f"no presigned list: {e}")
    rows = [r for r in rows if len(r) == 3 and r[0].isdigit()]
    created = [int(r[0]) for r in rows]
    i = bisect.bisect_right(created, now) - 1
    if i < 0:
        sys.exit("no presigned signature has come yet")
    if i == len(rows) - 1 and now - created[i] > 300:
        print(f"presigned list ran out {now - created[i]} s ago: the PC must push again", file=sys.stderr)
    write("signature-input", rows[i][1])
    write("signature", rows[i][2])


if __name__ == "__main__":
    main()

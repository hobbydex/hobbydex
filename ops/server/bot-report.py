#!/usr/bin/env python3
"""Per-day crawler report from the Caddy JSON access log (the `log` block of hobbydex.com in ops/server/Caddyfile).

  ssh deploy@HOST 'sudo cat /var/log/caddy/access.log*' | ops/server/bot-report.py [--verify-google]
  ops/server/bot-report.py [--verify-google] [--top 20] FILE...    # plain or gzip files, read in order

Bots are told apart by User-Agent: Googlebot, Bingbot, and other bots (any other UA with bot, crawl, spider,
slurp or fetcher in it). Human requests are not counted. For each UTC day and bot group it prints the request
count, the status classes, the share of hits per section (the first two path segments, e.g. /rc/parts), and the
top paths that answered 404 or 5xx.

--verify-google reverse-resolves each Googlebot client IP (one lookup per distinct IP, cached) and splits the
Googlebot hits into "DNS verified" (the name ends in googlebot.com or google.com and resolves back to the IP)
and "not verified". The lookups are slow: expect a few seconds per new IP on a cold DNS cache.

Standard library only. The input may mix plain and gzip members, as `sudo cat access.log*` does when rolled
files are gzipped; a gzip member must start at the beginning of a line, which Caddy guarantees.
"""
import argparse
import collections
import json
import re
import socket
import sys
import zlib
from datetime import datetime, timezone

GZIP_MAGIC = b"\x1f\x8b"
GOOGLE_SUFFIXES = (".googlebot.com", ".google.com")
BOT_RE = re.compile(r"bot|crawl|spider|slurp|fetcher", re.IGNORECASE)
SECTIONS_SHOWN = 15


class _Source:
    """A binary stream with a pushback buffer."""

    def __init__(self, stream):
        self._stream = stream
        self._back = b""

    def unread(self, data):
        self._back = data + self._back

    def read(self, size):
        if self._back:
            out, self._back = self._back[:size], self._back[size:]
            return out
        return self._stream.read(size)

    def readline(self):
        if self._back:
            i = self._back.find(b"\n")
            if i >= 0:
                out, self._back = self._back[: i + 1], self._back[i + 1 :]
                return out
            out, self._back = self._back, b""
            return out + self._stream.readline()
        return self._stream.readline()


def log_lines(stream):
    """Yield the lines (without the newline) of a stream that mixes plain text and gzip members."""
    src = _Source(stream)
    while True:
        line = src.readline()
        if not line:
            return
        if not line.startswith(GZIP_MAGIC):
            yield line.rstrip(b"\r\n")
            continue
        # a gzip member starts here: inflate it, then hand whatever follows the member back to the plain reader
        dec = zlib.decompressobj(zlib.MAX_WBITS | 16)
        partial = b""
        data = line
        while True:
            if not data:
                data = src.read(1 << 20)
                if not data:
                    break  # truncated member: keep what decoded
            *complete, partial = (partial + dec.decompress(data)).split(b"\n")
            data = b""
            yield from complete
            if dec.eof:
                src.unread(dec.unused_data)
                break
        if partial:
            yield partial


def hit_of(line):
    """Return (day, status, path, user_agent, ip) for one JSON log line, or None when it is not a request record."""
    rec = json.loads(line)
    req = rec.get("request") or {}
    headers = req.get("headers") or {}
    ua = headers.get("User-Agent") or ""
    if isinstance(ua, list):
        ua = " ".join(ua)
    path = (req.get("uri") or "/").split("?", 1)[0] or "/"
    ip = req.get("client_ip") or req.get("remote_ip") or ""
    day = datetime.fromtimestamp(float(rec["ts"]), timezone.utc).strftime("%Y-%m-%d")
    return day, int(rec["status"]), path, ua, ip


def section_of(path):
    parts = [p for p in path.split("/") if p]
    return "/" + "/".join(parts[:2]) if parts else "/"


def bot_group(ua):
    low = ua.lower()
    if "googlebot" in low:
        return "Googlebot"
    if "bingbot" in low:
        return "Bingbot"
    if BOT_RE.search(ua):
        return "other bots"
    return None


def google_verified(ip, cache):
    if ip not in cache:
        ok = False
        try:
            host = socket.gethostbyaddr(ip)[0].rstrip(".").lower()
            if host.endswith(GOOGLE_SUFFIXES):
                ok = ip in {a[4][0] for a in socket.getaddrinfo(host, None)}
        except OSError:
            ok = False
        cache[ip] = ok
    return cache[ip]


class Group:
    def __init__(self):
        self.hits = 0
        self.classes = collections.Counter()
        self.sections = collections.Counter()
        self.bad = collections.defaultdict(collections.Counter)  # path -> status -> count


def class_of(status):
    return f"{status // 100}xx" if 200 <= status < 600 else "other"


def main(argv=None):
    ap = argparse.ArgumentParser(description="Per-day Googlebot, Bingbot and other bot report from the Caddy JSON access log.")
    ap.add_argument("files", nargs="*", help="access log files, plain or gzip (default: standard input)")
    ap.add_argument("--verify-google", action="store_true", help="reverse and forward DNS check of Googlebot IPs (slow)")
    ap.add_argument("--top", type=int, default=20, help="paths listed per day and group (default 20)")
    args = ap.parse_args(argv)

    if args.files:
        sources = []
        for name in args.files:
            sources.append(open(name, "rb"))
    else:
        sources = [sys.stdin.buffer]

    days = collections.defaultdict(lambda: collections.defaultdict(Group))
    dns_cache = {}
    lines = bad_lines = ignored = 0
    try:
        for src in sources:
            for raw in log_lines(src):
                if not raw.strip():
                    continue
                lines += 1
                try:
                    day, status, path, ua, ip = hit_of(raw)
                except (ValueError, KeyError, TypeError):
                    bad_lines += 1
                    continue
                name = bot_group(ua)
                if name is None:
                    ignored += 1
                    continue
                if name == "Googlebot" and args.verify_google:
                    name = "Googlebot (DNS verified)" if google_verified(ip, dns_cache) else "Googlebot (not verified)"
                g = days[day][name]
                g.hits += 1
                g.classes[class_of(status)] += 1
                g.sections[section_of(path)] += 1
                if status == 404 or status >= 500:
                    g.bad[path][status] += 1
    finally:
        for src in sources:
            if src is not sys.stdin.buffer:
                src.close()

    print(f"{lines} request lines; {ignored} human requests ignored; {bad_lines} unreadable lines skipped")
    if not days:
        print("no bot requests found")
        return 0
    order = {"Googlebot (DNS verified)": 0, "Googlebot (not verified)": 1, "Googlebot": 1, "Bingbot": 2, "other bots": 3}
    for day in sorted(days):
        print()
        print(day)
        for name in sorted(days[day], key=lambda n: order[n]):
            g = days[day][name]
            classes = " ".join(f"{c} {g.classes[c]}" for c in ("2xx", "3xx", "4xx", "5xx", "other") if g.classes[c])
            print(f"  {name}: {g.hits} hits ({classes})")
            total = g.hits
            shown = g.sections.most_common(SECTIONS_SHOWN)
            print("    sections: " + "  ".join(f"{s} {100 * n / total:.1f}%" for s, n in shown)
                  + (f"  other {100 * (total - sum(n for _, n in shown)) / total:.1f}%" if len(shown) < len(g.sections) else ""))
            if g.bad:
                print(f"    404 and 5xx paths (top {args.top}):")
                ranked = sorted(g.bad.items(), key=lambda kv: (-sum(kv[1].values()), kv[0]))[: args.top]
                for path, statuses in ranked:
                    mix = " ".join(f"{s}x{n}" for s, n in sorted(statuses.items()))
                    print(f"      {sum(statuses.values()):>6}  {mix:<14} {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

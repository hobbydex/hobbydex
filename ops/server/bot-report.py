#!/usr/bin/env python3
"""Per-day crawler report from the Caddy JSON access log (the `log` block of hobbydex.com in ops/server/Caddyfile).

  ssh deploy@HOST 'sudo cat /var/log/caddy/access*.log*' | ops/server/bot-report.py [--verify-google]
  ops/server/bot-report.py [--verify-google] [--top 20] FILE...    # plain or gzip files, read in order

Bots are told apart by User-Agent: Googlebot, Bingbot, and other bots (any other UA with bot, crawl, spider,
slurp or fetcher in it). Human requests are not counted. For each UTC day and bot group it prints the request
count, the status classes, the share of hits per section (the first two path segments, e.g. /rc/parts), and the
top paths that answered 404 or 5xx.

--verify-google reverse-resolves each Googlebot client IP (one lookup per distinct IP, cached) and splits the
Googlebot hits into "DNS verified" (the name ends in googlebot.com or google.com and resolves back to the IP)
and "not verified". The lookups are slow: expect a few seconds per new IP on a cold DNS cache.

--summary prints one JSON document for the days from --since (UTC, YYYY-MM-DD; default all days in the files) instead:
per UTC day the unique visitor addresses and page views (bots and static files left out), the named crawlers, the
status codes and the 403s, and per network (/16 for IPv4, /32 for IPv6) the request count, the share sent with a
browser User-Agent, whether robots.txt was read and the status codes. The files default to /var/log/caddy/access*.log*
(the current file and the rolled ones, named access-<time>.log, plain or gzip). Days are cut by each request's own
time, never by file. A day is marked partial when it is today or when the logs begin after its first second (the
oldest rolled file was already deleted), so its counts are low.
The PC runs it over ssh as the deploy user (tools/site_traffic.py): ssh deploy@HOST 'python3 -I - --summary --since D' < bot-report.py

Standard library only. The input may mix plain and gzip members, as `sudo cat access.log*` does when rolled
files are gzipped; a gzip member must start at the beginning of a line, which Caddy guarantees.
"""
import argparse
import collections
import glob
import ipaddress
import json
import re
import resource
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


# --- daily summary (--summary) -------------------------------------------------------------------------------

LOG_GLOB = "/var/log/caddy/access*.log*"
NET_MIN_REQUESTS = 50       # networks with fewer requests in a day are counted together as "other networks"
STATIC_RE = re.compile(r"\.(?:css|js|mjs|map|json|xml|txt|webmanifest|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|pdf|mp4|webm)$", re.IGNORECASE)
STATIC_PREFIXES = ("/_astro/", "/pagefind/")
# named AI and search crawlers that do not all carry "bot" in their User-Agent (BOT_RE misses some)
NAMED_CRAWLERS = (
    ("Googlebot", "googlebot"), ("Bingbot", "bingbot"), ("GPTBot", "gptbot"), ("OAI-SearchBot", "oai-searchbot"),
    ("ChatGPT-User", "chatgpt-user"), ("ClaudeBot", "claudebot"), ("Claude-SearchBot", "claude-searchbot"),
    ("Claude-User", "claude-user"), ("anthropic-ai", "anthropic-ai"), ("PerplexityBot", "perplexitybot"),
    ("Perplexity-User", "perplexity-user"), ("Applebot", "applebot"), ("CCBot", "ccbot"),
    ("Bytespider", "bytespider"), ("Amazonbot", "amazonbot"), ("meta-externalagent", "meta-externalagent"),
    ("DuckDuckBot", "duckduckbot"), ("YandexBot", "yandexbot"), ("SemrushBot", "semrushbot"),
    ("AhrefsBot", "ahrefsbot"), ("MJ12bot", "mj12bot"),
)


def crawler_name(ua):
    """The named crawler of a User-Agent, "other bots" for any other bot, None for a person's browser or tool."""
    low = ua.lower()
    for name, token in NAMED_CRAWLERS:
        if token in low:
            return name
    return "other bots" if BOT_RE.search(ua) else None


def request_of(line):
    """(day, status, method, path, user_agent, client_ip, ts) of one JSON log line; raises on a line that is not a request."""
    rec = json.loads(line)
    req = rec.get("request") or {}
    headers = req.get("headers") or {}
    ua = headers.get("User-Agent") or ""
    if isinstance(ua, list):
        ua = " ".join(ua)
    path = (req.get("uri") or "/").split("?", 1)[0] or "/"
    ip = req.get("client_ip") or req.get("remote_ip") or ""
    ts = float(rec["ts"])
    day = datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d")
    return day, int(rec["status"]), req.get("method") or "", path, ua, ip, ts


def day_start(day):
    """The first second of a UTC day (YYYY-MM-DD) as a timestamp."""
    return datetime.strptime(day, "%Y-%m-%d").replace(tzinfo=timezone.utc).timestamp()


def network_of(ip):
    """The /16 of an IPv4 address or the /32 of an IPv6 one, or None when ip is not an address."""
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return None
    bits = 16 if addr.version == 4 else 32
    return str(ipaddress.ip_network(f"{addr}/{bits}", strict=False))


def is_static(path):
    return path.startswith(STATIC_PREFIXES) or bool(STATIC_RE.search(path))


class _Net:
    __slots__ = ("requests", "browser", "ips", "status", "robots")

    def __init__(self):
        self.requests = 0
        self.browser = 0
        self.ips = set()
        self.status = collections.Counter()
        self.robots = False


class _Day:
    def __init__(self):
        self.requests = 0
        self.bot_requests = 0
        self.page_views = 0
        self.visitors = set()
        self.crawlers = collections.Counter()
        self.status = collections.Counter()
        self.nets = collections.defaultdict(_Net)


def summarise(sources, since="", today=""):
    """The per-day summary as a dict (see the module docstring). Lines of days before `since` are skipped."""
    days = collections.defaultdict(_Day)
    lines = bad_lines = 0
    first_ts = None  # the oldest request in all the files, before the since filter
    for src in sources:
        for raw in log_lines(src):
            if not raw.strip():
                continue
            lines += 1
            try:
                day, status, method, path, ua, ip, ts = request_of(raw)
            except (ValueError, KeyError, TypeError):
                bad_lines += 1
                continue
            if first_ts is None or ts < first_ts:
                first_ts = ts
            if since and day < since:
                continue
            net = network_of(ip)
            if net is None:
                bad_lines += 1
                continue
            d = days[day]
            crawler = crawler_name(ua)
            browser = crawler is None and ua.startswith("Mozilla/")
            d.requests += 1
            d.status[str(status)] += 1
            n = d.nets[net]
            n.requests += 1
            n.status[str(status)] += 1
            n.ips.add(ip)
            if browser:
                n.browser += 1
            if path == "/robots.txt":
                n.robots = True
            if crawler is not None:
                d.bot_requests += 1
                d.crawlers[crawler] += 1
                continue
            if is_static(path) or path == "/robots.txt":
                continue
            if method in ("GET", "HEAD") and status < 400:
                d.page_views += 1
                d.visitors.add(ip)

    out_days = []
    for day in sorted(days):
        d = days[day]
        shown = sorted(
            (kv for kv in d.nets.items() if kv[1].requests >= NET_MIN_REQUESTS),
            key=lambda kv: (-kv[1].requests, kv[0]),
        )
        rest = [kv[1] for kv in d.nets.items() if kv[1].requests < NET_MIN_REQUESTS]
        networks = [
            {
                "prefix": prefix,
                "requests": n.requests,
                "ips": len(n.ips),
                "browser_ua_requests": n.browser,
                "browser_share": round(n.browser / n.requests, 4),
                "robots_read": n.robots,
                "status": dict(n.status),
                "blocked_403": n.status.get("403", 0),
            }
            for prefix, n in shown
        ]
        out_days.append({
            "day": day,
            "partial": day == today or day_start(day) < first_ts,
            "requests": d.requests,
            "bot_requests": d.bot_requests,
            "page_views": d.page_views,
            "unique_visitors": len(d.visitors),
            "crawlers": dict(d.crawlers.most_common()),
            "status": dict(d.status),
            "blocked_403": d.status.get("403", 0),
            "networks": networks,
            "other_networks": {
                "count": len(rest),
                "requests": sum(n.requests for n in rest),
            },
        })
    return {
        "lines": lines,
        "unreadable_lines": bad_lines,
        "since": since or None,
        "first_line": datetime.fromtimestamp(first_ts, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if first_ts else None,
        "days": out_days,
        # the peak memory of this run, kilobytes (the job records it)
        "peak_rss_kb": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
    }


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
    ap.add_argument("--summary", action="store_true", help="print the per-day JSON summary instead of the report")
    ap.add_argument("--since", default="", metavar="DAY", help="with --summary: the first UTC day (YYYY-MM-DD) to count")
    args = ap.parse_args(argv)

    if args.summary:
        files = args.files or sorted(glob.glob(LOG_GLOB))
        sources = []
        try:
            for name in files:
                sources.append(open(name, "rb"))
            report = summarise(sources, args.since, datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        finally:
            for src in sources:
                src.close()
        report["files"] = len(files)
        report["generated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        json.dump(report, sys.stdout, sort_keys=True)
        sys.stdout.write("\n")
        return 0

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

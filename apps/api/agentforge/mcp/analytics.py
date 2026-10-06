"""Game Analytics MCP — a mocked internal analytics system (read-only)."""
from __future__ import annotations

from datetime import date, timedelta

from .. import data
from ..permissions import Risk, ToolSpec
from .base import McpServer, ToolContext, ToolError

server = McpServer("game-analytics", "Game Analytics MCP", "Mock internal analytics: KPIs, segments, crashes, feedback.")

DATE = {"type": "string", "description": "ISO date YYYY-MM-DD"}
COMMON = {"game": {"type": "string"}, "platform": {"type": "string"}, "country": {"type": "string"},
          "version": {"type": "string"}}


def _game(game: str | None) -> str:
    game = game or "Word Quest"
    if game not in data.GAMES:
        raise ToolError(f"unknown game '{game}'. Known: {data.GAMES}")
    return game


def _range(args: dict) -> tuple[str, str]:
    end = args.get("end_date") or args.get("date") or data.yesterday().isoformat()
    start = args.get("start_date") or args.get("date") or (date.fromisoformat(end) - timedelta(days=6)).isoformat()
    if start > end:
        raise ToolError("start_date must be <= end_date")
    return start, end


def _filters(args: dict) -> dict:
    return {k: args.get(k) for k in ("platform", "country", "version")}


def get_game_metrics(ctx: ToolContext, **args):
    _game(args.get("game"))
    start, end = _range(args)
    metrics = args.get("metrics") or data.METRICS
    rs = data.filter_rows(start, end, **_filters(args))
    daily = []
    for d in sorted({r["date"] for r in rs}):
        agg = data.aggregate([r for r in rs if r["date"] == d])
        daily.append({"date": d, **{m: agg[m] for m in metrics if m in agg}})
    summary = data.aggregate(rs)
    return {"game": "Word Quest", "start_date": start, "end_date": end, "filters": _filters(args),
            "daily": daily, "summary": {m: summary[m] for m in metrics if m in summary}}


def get_retention(ctx: ToolContext, **args):
    _game(args.get("game"))
    d = args.get("date") or data.yesterday().isoformat()
    agg = data.aggregate(data.filter_rows(d, d, **_filters(args)))
    if agg["d1"] is None:
        raise ToolError(f"no data for {d} with filters {_filters(args)}")
    return {"date": d, "filters": _filters(args), "d1": agg["d1"], "d7": agg["d7"], "cohort_size": agg["new_users"]}


def get_revenue(ctx: ToolContext, **args):
    _game(args.get("game"))
    start, end = _range(args)
    rs = data.filter_rows(start, end, **_filters(args))
    daily = [{"date": d, "revenue": data.aggregate([r for r in rs if r["date"] == d])["revenue"],
              "arpdau": data.aggregate([r for r in rs if r["date"] == d])["arpdau"]}
             for d in sorted({r["date"] for r in rs})]
    s = data.aggregate(rs)
    return {"start_date": start, "end_date": end, "filters": _filters(args), "daily": daily,
            "total_revenue": s["revenue"], "arpdau": s["arpdau"]}


def get_sessions(ctx: ToolContext, **args):
    _game(args.get("game"))
    start, end = _range(args)
    rs = data.filter_rows(start, end, **_filters(args))
    daily = [{"date": d, "sessions": data.aggregate([r for r in rs if r["date"] == d])["sessions"]}
             for d in sorted({r["date"] for r in rs})]
    s = data.aggregate(rs)
    return {"start_date": start, "end_date": end, "filters": _filters(args), "daily": daily,
            "total_sessions": s["sessions"], "sessions_per_dau": round(s["sessions"] / max(s["dau"], 1), 2)}


def _seg_key(r: dict, dims: list[str]) -> str:
    return "/".join(str(r[d]) for d in dims)


def get_player_segments(ctx: ToolContext, **args):
    """Segment a metric by dimensions and compare against the previous period of equal length."""
    _game(args.get("game"))
    start, end = _range(args)
    metric = args.get("metric", "d1")
    if metric not in data.METRICS:
        raise ToolError(f"unknown metric '{metric}'")
    dims = args.get("dimensions") or ["platform", "country", "version"]
    bad = [d for d in dims if d not in ("platform", "country", "version")]
    if bad:
        raise ToolError(f"unsupported dimension(s): {bad}")
    n = (date.fromisoformat(end) - date.fromisoformat(start)).days + 1
    pe = (date.fromisoformat(start) - timedelta(days=1)).isoformat()
    ps = (date.fromisoformat(start) - timedelta(days=n)).isoformat()
    cur, prev = data.filter_rows(start, end), data.filter_rows(ps, pe)
    keys = sorted({_seg_key(r, dims) for r in cur})
    segs = []
    for k in keys:
        c = data.aggregate([r for r in cur if _seg_key(r, dims) == k])
        p = data.aggregate([r for r in prev if _seg_key(r, dims) == k])
        if p[metric] is None or c["new_users"] < 200:
            continue
        segs.append({"segment": k, "current": c[metric], "previous": p[metric],
                     "delta": round(c[metric] - p[metric], 4), "users": c["dau"]})
    segs.sort(key=lambda s: s["delta"])
    return {"metric": metric, "dimensions": dims, "current_period": [start, end], "previous_period": [ps, pe],
            "segments": segs}


def compare_periods(ctx: ToolContext, **args):
    _game(args.get("game"))
    metric = args.get("metric", "d1")
    if metric not in data.METRICS:
        raise ToolError(f"unknown metric '{metric}'")
    start, end = _range(args)
    n = (date.fromisoformat(end) - date.fromisoformat(start)).days + 1
    ps = args.get("previous_start") or (date.fromisoformat(start) - timedelta(days=n)).isoformat()
    pe = args.get("previous_end") or (date.fromisoformat(start) - timedelta(days=1)).isoformat()
    f = _filters(args)
    c = data.aggregate(data.filter_rows(start, end, **f))[metric]
    p = data.aggregate(data.filter_rows(ps, pe, **f))[metric]
    if c is None or p is None:
        raise ToolError("no data for one of the periods")
    return {"metric": metric, "filters": f, "current": {"period": [start, end], "value": c},
            "previous": {"period": [ps, pe], "value": p}, "delta": round(c - p, 4),
            "pct_change": round((c - p) / p * 100, 2) if p else None}


def get_crash_stats(ctx: ToolContext, **args):
    _game(args.get("game"))
    start, end = _range(args)
    f = _filters(args)
    rs = data.filter_rows(start, end, **f)
    by_version = {}
    for v in sorted({r["version"] for r in rs}):
        for p in sorted({r["platform"] for r in rs}):
            sub = [r for r in rs if r["version"] == v and r["platform"] == p]
            if sub:
                a = data.aggregate(sub)
                by_version[f"{p}/{v}"] = {"crashes": a["crashes"], "per_1k_sessions": round(a["crashes"] / a["sessions"] * 1000, 2)}
    daily = [{"date": d, "crashes": data.aggregate([r for r in rs if r["date"] == d])["crashes"]}
             for d in sorted({r["date"] for r in rs})]
    return {"start_date": start, "end_date": end, "by_platform_version": by_version, "daily": daily,
            "top_signatures": data.crash_signatures()}


def get_player_feedback(ctx: ToolContext, **args):
    _game(args.get("game"))
    start, end = _range({"start_date": args.get("start_date") or (data.yesterday() - timedelta(days=16)).isoformat(),
                         "end_date": args.get("end_date")})
    items = [x for x in data.feedback() if start <= x["date"] <= end
             and (not args.get("platform") or x["platform"] == args["platform"])]
    themes: dict[str, dict] = {}
    for x in items:
        t = themes.setdefault(x["theme"], {"count": 0, "avg_rating": 0, "examples": []})
        t["count"] += 1
        t["avg_rating"] += x["rating"]
        if len(t["examples"]) < 2:
            t["examples"].append(x["text"])
    for t in themes.values():
        t["avg_rating"] = round(t["avg_rating"] / t["count"], 2)
    return {"start_date": start, "end_date": end, "total": len(items), "themes": themes,
            "avg_rating": round(sum(x["rating"] for x in items) / max(len(items), 1), 2)}


_T = [
    ("get_game_metrics", get_game_metrics, "Daily KPIs for a date range, optionally filtered."),
    ("get_retention", get_retention, "D1/D7 retention for a date, optionally filtered."),
    ("get_revenue", get_revenue, "Revenue and ARPDAU for a date range."),
    ("get_sessions", get_sessions, "Session counts for a date range."),
    ("get_player_segments", get_player_segments, "Segment a metric by platform/country/version vs previous period."),
    ("compare_periods", compare_periods, "Compare a metric between two periods."),
    ("get_crash_stats", get_crash_stats, "Crash counts by platform/version plus top signatures."),
    ("get_player_feedback", get_player_feedback, "Aggregated player reviews by theme."),
]
for name, fn, desc in _T:
    server.register(ToolSpec(name, server.name, desc, "analytics.read", Risk.LOW, fn,
                             {"type": "object", "properties": {**COMMON, "date": DATE, "start_date": DATE, "end_date": DATE}}))

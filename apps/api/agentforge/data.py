"""Deterministic synthetic dataset for the fictional mobile game *Word Quest*.

30 days of data ending *yesterday*. Intentional anomalies (the agent must discover them via tools):

* Day 24: the `difficulty_multiplier` remote config changed 1.0 -> 1.15 for build 2.14.0 on Android.
  D1 retention drops ~8 pp for Android / 2.14.0 / TR (smaller decoy drop in other countries),
  level completion drops in the same segment.
* Day 14: "Double Coins Weekend" event -> revenue spike (all segments).
* Day 26+: crash spike on Android 2.14.0 (NullReferenceException in LevelLoader.Load).
"""
from __future__ import annotations

import random
from datetime import date, timedelta
from functools import lru_cache

GAMES = ["Word Quest"]
PLATFORMS = ["android", "ios"]
COUNTRIES = ["US", "TR", "DE", "BR"]
DAYS = 30
ANOMALY_DAY = 24

BASE_DAU = {
    ("android", "US"): 9000, ("android", "TR"): 7000, ("android", "DE"): 3000, ("android", "BR"): 6000,
    ("ios", "US"): 8000, ("ios", "TR"): 2000, ("ios", "DE"): 3500, ("ios", "BR"): 2500,
}
BASE_D1 = {"US": 0.36, "TR": 0.35, "DE": 0.34, "BR": 0.33}
ARPDAU = {"US": 0.12, "DE": 0.10, "TR": 0.035, "BR": 0.04}
METRICS = ["dau", "new_users", "d1", "d7", "arpdau", "sessions", "level_completion", "crashes", "revenue"]


def yesterday() -> date:
    return date.today() - timedelta(days=1)


def day_date(i: int) -> date:
    """Day index 1..30 -> calendar date (day 30 == yesterday)."""
    return yesterday() - timedelta(days=DAYS - i)


def _version_shares(i: int, platform: str) -> dict[str, float]:
    if platform == "android":
        s = 0.0 if i < 18 else min(0.9, 0.3 + 0.1 * (i - 18))
    else:
        s = 0.0 if i < 22 else 0.5
    return {"2.13.0": 1 - s, "2.14.0": s} if s > 0 else {"2.13.0": 1.0}


@lru_cache(maxsize=4)
def _build(anchor: str) -> tuple[dict, ...]:
    rng = random.Random(42)
    rows = []
    for i in range(1, DAYS + 1):
        d = day_date(i)
        weekend = d.weekday() >= 5
        for (platform, country), base in BASE_DAU.items():
            for version, share in _version_shares(i, platform).items():
                if share <= 0:
                    continue
                dau = base * share * (1.08 if weekend else 1.0) * (1 + rng.uniform(-0.03, 0.03))
                new_users = dau * 0.12 * (1 + rng.uniform(-0.05, 0.05))
                d1 = BASE_D1[country] + (0.01 if platform == "ios" else 0) + rng.uniform(-0.006, 0.006)
                lvl = 0.62 + rng.uniform(-0.01, 0.01)
                crash_rate = 1.2 + rng.uniform(-0.2, 0.2)  # per 1000 sessions
                affected = platform == "android" and version == "2.14.0" and i >= ANOMALY_DAY
                if affected:
                    d1 -= 0.082 if country == "TR" else 0.018
                    lvl -= 0.14 if country == "TR" else 0.03
                if platform == "android" and version == "2.14.0" and i >= 26:
                    crash_rate += 5.3
                sessions = dau * (3.4 - (0.4 if affected and country == "TR" else 0)) * (1 + rng.uniform(-0.02, 0.02))
                arpdau = ARPDAU[country] * (1 + rng.uniform(-0.05, 0.05)) * (1.35 if i == 14 else 1.0)
                rows.append({
                    "date": d.isoformat(), "day": i, "platform": platform, "country": country, "version": version,
                    "dau": round(dau), "new_users": round(new_users), "d1": round(d1, 4), "d7": round(d1 * 0.42, 4),
                    "sessions": round(sessions), "level_completion": round(lvl, 4),
                    "crashes": round(sessions * crash_rate / 1000), "revenue": round(dau * arpdau, 2),
                })
    return tuple(rows)


def rows() -> tuple[dict, ...]:
    return _build(yesterday().isoformat())


def filter_rows(start: str, end: str, platform: str | None = None, country: str | None = None,
                version: str | None = None) -> list[dict]:
    out = []
    for r in rows():
        if not (start <= r["date"] <= end):
            continue
        if platform and r["platform"] != platform.lower():
            continue
        if country and r["country"] != country.upper():
            continue
        if version and r["version"] != version:
            continue
        out.append(r)
    return out


def aggregate(rs: list[dict]) -> dict:
    """Weighted aggregation of segment rows into KPIs."""
    if not rs:
        return {m: None for m in METRICS}
    dau = sum(r["dau"] for r in rs)
    nu = sum(r["new_users"] for r in rs) or 1
    sess = sum(r["sessions"] for r in rs) or 1
    rev = sum(r["revenue"] for r in rs)
    return {
        "dau": dau, "new_users": nu,
        "d1": round(sum(r["d1"] * r["new_users"] for r in rs) / nu, 4),
        "d7": round(sum(r["d7"] * r["new_users"] for r in rs) / nu, 4),
        "arpdau": round(rev / max(dau, 1), 4),
        "sessions": sess,
        "level_completion": round(sum(r["level_completion"] * r["sessions"] for r in rs) / sess, 4),
        "crashes": sum(r["crashes"] for r in rs),
        "revenue": round(rev, 2),
    }


# ---------------------------------------------------------------- LiveOps fixtures
def liveops_events() -> list[dict]:
    return [
        {"id": "evt_101", "game": "Word Quest", "name": "Welcome Back Push", "type": "push_campaign",
         "start": day_date(10).isoformat(), "end": day_date(11).isoformat(), "status": "ended"},
        {"id": "evt_102", "game": "Word Quest", "name": "Double Coins Weekend", "type": "economy_event",
         "start": day_date(14).isoformat(), "end": day_date(15).isoformat(), "status": "ended"},
        {"id": "evt_103", "game": "Word Quest", "name": "Version 2.14.0 Rollout", "type": "release",
         "start": day_date(18).isoformat(), "end": None, "status": "active"},
        {"id": "evt_104", "game": "Word Quest", "name": "Difficulty Tuning (2.14.0)", "type": "config_change",
         "start": day_date(ANOMALY_DAY).isoformat(), "end": None, "status": "active",
         "note": "difficulty_multiplier 1.0 -> 1.15 for Android 2.14.0"},
        {"id": "evt_105", "game": "Word Quest", "name": "New Level Pack", "type": "content",
         "start": day_date(25).isoformat(), "end": None, "status": "active"},
    ]


def remote_config_history() -> list[dict]:
    return [
        {"key": "difficulty_multiplier", "value": 1.0, "applied_at": day_date(1).isoformat() + "T08:00:00Z",
         "scope": "all"},
        {"key": "difficulty_multiplier", "value": 1.15, "applied_at": day_date(ANOMALY_DAY - 1).isoformat() + "T18:00:00Z",
         "scope": "android/2.14.0"},
        {"key": "ad_frequency", "value": 3, "applied_at": day_date(5).isoformat() + "T09:00:00Z", "scope": "all"},
        {"key": "daily_reward_coins", "value": 100, "applied_at": day_date(9).isoformat() + "T09:00:00Z", "scope": "all"},
    ]


def crash_signatures() -> list[dict]:
    return [
        {"signature": "NullReferenceException at LevelLoader.Load()", "platform": "android", "version": "2.14.0",
         "first_seen": day_date(26).isoformat(), "share": 0.78,
         "stack": ["LevelLoader.Load()", "GameBoard.Init()", "SceneRouter.Enter()"]},
        {"signature": "OutOfMemoryError at TextureCache.Alloc()", "platform": "android", "version": "2.13.0",
         "first_seen": day_date(3).isoformat(), "share": 0.12, "stack": ["TextureCache.Alloc()", "ThemeLoader.Apply()"]},
        {"signature": "TimeoutException at IapClient.Verify()", "platform": "ios", "version": "2.13.0",
         "first_seen": day_date(9).isoformat(), "share": 0.10, "stack": ["IapClient.Verify()", "Store.Purchase()"]},
    ]


def feedback() -> list[dict]:
    rng = random.Random(7)
    themes = {
        "difficulty": ["Levels got way too hard after level 40.", "Difficulty spike since the update, I keep losing.",
                       "Too hard now, uninstalling soon."],
        "crashes": ["Game crashes when I open a level.", "Crash on loading screen since 2.14.0."],
        "ads": ["Too many ads between levels.", "Ad frequency is annoying."],
        "praise": ["Love the new level pack!", "Great word puzzles, very relaxing.", "Daily rewards are generous."],
        "bug": ["Hint button sometimes does nothing.", "Daily streak reset by mistake."],
    }
    out = []
    for n in range(60):
        i = rng.randint(14, 30)
        platform = rng.choice(PLATFORMS)
        late_android = platform == "android" and i >= ANOMALY_DAY
        weights = {"difficulty": 5 if late_android else 1, "crashes": 3 if (late_android and i >= 26) else 0.4,
                   "ads": 1.5, "praise": 3, "bug": 1}
        theme = rng.choices(list(weights), weights=list(weights.values()))[0]
        rating = {"praise": 5, "difficulty": 2, "crashes": 1, "ads": 3, "bug": 3}[theme]
        out.append({"date": day_date(i).isoformat(), "platform": platform,
                    "version": "2.14.0" if (late_android or (platform == "ios" and i >= 22)) else "2.13.0",
                    "country": rng.choice(COUNTRIES), "rating": rating, "theme": theme,
                    "text": rng.choice(themes[theme])})
    return out

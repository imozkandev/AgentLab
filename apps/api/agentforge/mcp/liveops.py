"""LiveOps MCP — mocked LiveOps system. Agents can read and *draft*; they can never publish."""
from __future__ import annotations

from .. import data
from ..models import ApprovalRequest, LiveOpsDraft, audit
from ..permissions import Risk, ToolSpec
from .base import McpServer, ToolContext, ToolError, require

server = McpServer("liveops", "LiveOps MCP", "Mock LiveOps: events, remote config, drafts. Publishing requires a human.")


def list_events(ctx: ToolContext, **args):
    evts = data.liveops_events()
    start, end = args.get("start_date"), args.get("end_date")
    if start:
        evts = [e for e in evts if (e["end"] or "9999") >= start]
    if end:
        evts = [e for e in evts if e["start"] <= end]
    return {"events": evts}


def get_event(ctx: ToolContext, **args):
    require(args, "event_id")
    for e in data.liveops_events():
        if e["id"] == args["event_id"]:
            return e
    raise ToolError(f"event '{args['event_id']}' not found")


def get_remote_config(ctx: ToolContext, **args):
    hist = data.remote_config_history()
    current: dict = {}
    for h in sorted(hist, key=lambda h: h["applied_at"]):
        current[f"{h['key']}@{h['scope']}"] = h["value"]
    key = args.get("key")
    return {"current": {k: v for k, v in current.items() if not key or k.startswith(key)}}


def compare_remote_config(ctx: ToolContext, **args):
    """Return config changes applied in a window (default: last 14 days)."""
    start = args.get("start_date") or data.day_date(14).isoformat()
    end = args.get("end_date") or data.yesterday().isoformat()
    changes = [h for h in data.remote_config_history() if start <= h["applied_at"][:10] <= end]
    if args.get("key"):
        changes = [h for h in changes if h["key"] == args["key"]]
    out = []
    for c in sorted(changes, key=lambda h: h["applied_at"]):
        prior = [h for h in data.remote_config_history() if h["key"] == c["key"] and h["applied_at"] < c["applied_at"]]
        out.append({**c, "previous_value": max(prior, key=lambda h: h["applied_at"])["value"] if prior else None})
    return {"window": [start, end], "changes": out}


def create_draft_event(ctx: ToolContext, **args):
    """Create a DRAFT only. Creates a pending approval request; nothing is published."""
    require(args, "game", "kind", "payload", "reason")
    if args["kind"] not in ("event", "remote_config"):
        raise ToolError("kind must be 'event' or 'remote_config'")
    if args["game"] not in data.GAMES:
        raise ToolError(f"unknown game '{args['game']}'")
    payload = args["payload"]
    if args["kind"] == "event" and not all(k in payload for k in ("name", "type")):
        raise ToolError("event drafts need payload.name and payload.type")
    if args["kind"] == "remote_config" and not all(k in payload for k in ("key", "from", "to")):
        raise ToolError("remote_config drafts need payload.key, payload.from, payload.to")
    s = ctx.session
    draft = LiveOpsDraft(game=args["game"], kind=args["kind"], payload=payload, created_by=ctx.agent)
    s.add(draft)
    s.flush()
    summary = f"{args['game']}: {args['kind']} draft — {args['reason']}"
    apr = ApprovalRequest(run_id=ctx.run_id, agent=ctx.agent, tool="create_draft_event", risk="MEDIUM",
                          summary=summary, payload={"draft_id": draft.id, "game": args["game"], "kind": args["kind"],
                                                    "change": payload, "reason": args["reason"]})
    s.add(apr)
    s.flush()
    audit(s, ctx.agent, "approval.requested", apr.id, tool="create_draft_event", draft_id=draft.id, run_id=ctx.run_id)
    s.commit()
    return {"draft_id": draft.id, "approval_id": apr.id, "status": "pending_approval", "published": False}


def publish_event(ctx: ToolContext, **args):
    """CRITICAL. Only reachable after a human approves; no autonomous agent holds `liveops.publish`."""
    require(args, "draft_id")
    d = ctx.session.get(LiveOpsDraft, args["draft_id"])
    if not d:
        raise ToolError("draft not found")
    d.status = "published"
    return {"draft_id": d.id, "status": "published"}


_S = {"type": "object", "properties": {"game": {"type": "string"}}}
for name, fn, desc, scope, risk, appr in [
    ("list_events", list_events, "List LiveOps events, optionally within a window.", "liveops.read", Risk.LOW, False),
    ("get_event", get_event, "Get one LiveOps event.", "liveops.read", Risk.LOW, False),
    ("get_remote_config", get_remote_config, "Current remote config values.", "liveops.read", Risk.LOW, False),
    ("compare_remote_config", compare_remote_config, "Remote config changes within a window.", "liveops.read", Risk.LOW, False),
    ("create_draft_event", create_draft_event, "Create a LiveOps DRAFT (event or remote_config). Needs human approval.",
     "liveops.draft", Risk.MEDIUM, True),
    ("publish_event", publish_event, "Publish a draft to production. CRITICAL — human only.", "liveops.publish",
     Risk.CRITICAL, True),
]:
    server.register(ToolSpec(name, server.name, desc, scope, risk, fn, _S, requires_approval=appr))

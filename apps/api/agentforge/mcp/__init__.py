"""MCP registry + the tool gateway that enforces permissions, risk levels and approvals."""
from __future__ import annotations

import time

from ..models import Agent, ApprovalRequest, ToolCall, audit
from ..permissions import ApprovalRequired, PermissionDenied, Risk, ToolSpec, check_scope
from . import analytics, git, liveops
from .base import McpServer, ToolContext, ToolError

SERVERS: dict[str, McpServer] = {s.name: s for s in (analytics.server, liveops.server, git.server)}


def all_tools() -> dict[str, ToolSpec]:
    return {t.name: t for s in SERVERS.values() for t in s.tools.values()}


class ToolGateway:
    """Every tool call from an agent goes through here. No exceptions."""

    def call(self, agent: str, tool: str, args: dict, ctx: ToolContext, permissions: list[str] | None = None) -> dict:
        spec = all_tools().get(tool)
        if spec is None:
            raise ToolError(f"unknown tool '{tool}'")
        s = ctx.session
        if permissions is None:
            row = s.get(Agent, agent)
            permissions = list(row.permissions) if row else []
        started = time.perf_counter()

        def log(status: str) -> None:
            s.add(ToolCall(run_id=ctx.run_id, agent=agent, server=spec.server, tool=tool, risk=spec.risk.label,
                           status=status, latency_ms=int((time.perf_counter() - started) * 1000)))

        try:
            check_scope(permissions, spec)
        except PermissionDenied:
            log("denied")
            audit(s, agent, "permission.denied", tool, scope=spec.scope, run_id=ctx.run_id)
            s.commit()
            raise
        if spec.risk >= Risk.CRITICAL:
            # CRITICAL operations never execute inline: they become approval requests.
            apr = ApprovalRequest(run_id=ctx.run_id, agent=agent, tool=tool, risk=spec.risk.label,
                                  summary=f"{agent} requested CRITICAL tool {tool}", payload={"args": args})
            s.add(apr)
            s.flush()
            log("approval_required")
            audit(s, agent, "approval.requested", apr.id, tool=tool, run_id=ctx.run_id)
            s.commit()
            raise ApprovalRequired(apr.id)
        ctx.agent = agent
        try:
            result = spec.fn(ctx, **args)
        except ToolError:
            log("error")
            s.commit()
            raise
        except TypeError as e:  # bad argument names
            log("error")
            s.commit()
            raise ToolError(f"invalid arguments for {tool}: {e}")
        log("ok")
        s.commit()
        return result


gateway = ToolGateway()

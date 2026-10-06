"""Minimal in-process MCP-style servers (JSON-RPC shaped `tools/list` and `tools/call`)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..permissions import ToolSpec


@dataclass
class ToolContext:
    """Per-call execution context handed to tool implementations."""
    session: Any = None
    run_id: str | None = None
    agent: str = "system"


class ToolError(Exception):
    """Tool failed for a reason the agent could recover from (bad arguments, not found, ...)."""


@dataclass
class McpServer:
    name: str
    title: str
    description: str
    tools: dict[str, ToolSpec] = field(default_factory=dict)

    def register(self, spec: ToolSpec) -> None:
        self.tools[spec.name] = spec

    def list_tools(self) -> list[dict]:
        return [t.describe() for t in self.tools.values()]

    def rpc(self, method: str, params: dict | None, ctx: ToolContext, gateway=None) -> dict:
        """JSON-RPC 2.0 style entrypoint; `tools/call` goes through the gateway when provided."""
        params = params or {}
        if method == "tools/list":
            return {"tools": self.list_tools()}
        if method == "tools/call":
            name, args = params.get("name", ""), params.get("arguments", {})
            if name not in self.tools:
                raise ToolError(f"unknown tool '{name}' on server '{self.name}'")
            if gateway:
                return gateway.call(ctx.agent, name, args, ctx)
            return self.tools[name].fn(ctx, **args)
        raise ToolError(f"unsupported method '{method}'")


def require(args: dict, *keys: str) -> None:
    missing = [k for k in keys if args.get(k) in (None, "")]
    if missing:
        raise ToolError(f"missing required argument(s): {', '.join(missing)}")

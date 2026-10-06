"""Git MCP — lightweight, read-only repository tools. Dangerous operations are simply not exposed."""
from __future__ import annotations

import subprocess
from pathlib import Path

from .. import config
from ..permissions import Risk, ToolSpec
from .base import McpServer, ToolContext, ToolError, require

server = McpServer("git", "Git MCP", "Read-only repository access (no push, no delete, no deploy).")
REPO = config.ROOT
MAX_BYTES = 60_000


def _safe_path(rel: str) -> Path:
    p = (REPO / rel).resolve()
    if REPO.resolve() not in p.parents and p != REPO.resolve():
        raise ToolError("path escapes repository root")
    if any(part in {".git", ".env"} or part.startswith(".env") for part in p.relative_to(REPO.resolve()).parts):
        raise ToolError("access to .git/.env is not allowed")
    return p


def _git(*argv: str) -> str:
    try:
        r = subprocess.run(["git", "-C", str(REPO), *argv], capture_output=True, text=True, timeout=10)
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        raise ToolError(f"git unavailable: {e}")
    if r.returncode != 0:
        raise ToolError(r.stderr.strip() or "git failed")
    return r.stdout[:MAX_BYTES]


def read_file(ctx: ToolContext, **args):
    require(args, "path")
    p = _safe_path(args["path"])
    if not p.is_file():
        raise ToolError(f"file not found: {args['path']}")
    text = p.read_text(errors="replace")
    return {"path": args["path"], "content": text[:MAX_BYTES], "truncated": len(text) > MAX_BYTES}


def search_code(ctx: ToolContext, **args):
    require(args, "query")
    q, hits = args["query"].lower(), []
    for p in REPO.rglob(args.get("glob", "*.py")):
        if any(x in p.parts for x in (".git", "node_modules", ".venv", "__pycache__", ".next")):
            continue
        try:
            for n, line in enumerate(p.read_text(errors="replace").splitlines(), 1):
                if q in line.lower():
                    hits.append({"path": str(p.relative_to(REPO)), "line": n, "text": line.strip()[:200]})
                    if len(hits) >= 50:
                        return {"matches": hits, "truncated": True}
        except OSError:
            continue
    return {"matches": hits, "truncated": False}


def git_diff(ctx: ToolContext, **args):
    return {"diff": _git("diff", "--no-color", *( [args["path"]] if args.get("path") else []))}


def git_status(ctx: ToolContext, **args):
    return {"status": _git("status", "--short", "--branch")}


def list_changed_files(ctx: ToolContext, **args):
    return {"files": [l for l in _git("diff", "--name-only", args.get("base", "HEAD")).splitlines() if l]}


for name, fn, desc, scope in [
    ("read_file", read_file, "Read a file inside the repository.", "repository.read"),
    ("search_code", search_code, "Substring search across repository files.", "repository.read"),
    ("git_diff", git_diff, "Show uncommitted diff.", "repository.read"),
    ("git_status", git_status, "Show git status.", "repository.read"),
    ("list_changed_files", list_changed_files, "List files changed vs a base ref.", "repository.read"),
]:
    server.register(ToolSpec(name, server.name, desc, scope, Risk.LOW, fn, {"type": "object"}))

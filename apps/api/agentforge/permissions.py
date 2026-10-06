"""Permission scopes, tool risk levels and command validation.

Defence in depth: string-matching is only *one* layer. Commands are additionally
allowlisted, parsed with shlex (no shell metacharacters), and executed in an isolated
runtime (see runtime.py) with no network, read-only FS, memory and time limits.
"""
from __future__ import annotations

import re
import shlex
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any, Callable

SCOPES = {
    "analytics.read", "repository.read", "repository.write", "liveops.read", "liveops.draft",
    "liveops.publish", "filesystem.read", "filesystem.write", "shell.safe",
}


class Risk(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

    @property
    def label(self) -> str:
        return self.name


class PermissionDenied(Exception):
    def __init__(self, message: str, tool: str = "", scope: str = ""):
        super().__init__(message)
        self.tool, self.scope = tool, scope


class ApprovalRequired(Exception):
    def __init__(self, approval_id: str, message: str = "human approval required"):
        super().__init__(message)
        self.approval_id = approval_id


class CommandBlocked(Exception):
    pass


@dataclass
class ToolSpec:
    name: str
    server: str
    description: str
    scope: str
    risk: Risk
    fn: Callable[..., Any]
    input_schema: dict = field(default_factory=dict)
    requires_approval: bool = False  # MEDIUM tools may still require approval (e.g. LiveOps drafts)

    def describe(self) -> dict:
        return {"name": self.name, "server": self.server, "description": self.description,
                "scope": self.scope, "risk": self.risk.label, "requires_approval": self.requires_approval or
                self.risk >= Risk.CRITICAL, "input_schema": self.input_schema}


def check_scope(granted: list[str] | set[str], tool: ToolSpec) -> None:
    granted = set(granted)
    if tool.scope not in granted:
        raise PermissionDenied(f"agent lacks scope '{tool.scope}' required by tool '{tool.name}'",
                               tool=tool.name, scope=tool.scope)


# ---------------------------------------------------------------- command safety
BLOCKED_PATTERNS = [
    r"\brm\s+-[a-z]*r[a-z]*f?\s+/", r"\brm\s+-rf\b", r"\bsudo\b", r"\bshutdown\b", r"\breboot\b", r"\bmkfs",
    r"\bdd\s+if=", r"curl[^|]*\|\s*(ba)?sh", r"wget[^|]*\|\s*(ba)?sh", r":\(\)\s*\{", r"\bchmod\s+-R\s+777",
    r"git\s+push", r"--force", r"\bkubectl\b", r"\bterraform\s+apply", r"deploy[_-]?prod",
]
ALLOWED_BINARIES = {"ls", "cat", "echo", "pwd", "head", "tail", "wc", "grep", "find", "python3", "pytest", "git",
                    "date", "whoami", "uname", "sort", "uniq"}
ALLOWED_GIT = {"status", "diff", "log", "show", "branch"}
SHELL_META = re.compile(r"[;&|`><]|\$\(")


def validate_command(command: str, permissions: list[str] | set[str]) -> list[str]:
    """Return argv if the command is safe to hand to a sandbox, else raise CommandBlocked."""
    if "shell.safe" not in set(permissions):
        raise CommandBlocked("missing permission scope 'shell.safe'")
    if not command.strip():
        raise CommandBlocked("empty command")
    for pat in BLOCKED_PATTERNS:
        if re.search(pat, command):
            raise CommandBlocked(f"blocked pattern: {pat}")
    if SHELL_META.search(command):
        raise CommandBlocked("shell metacharacters (; & | ` > < $()) are not allowed")
    try:
        argv = shlex.split(command)
    except ValueError as e:
        raise CommandBlocked(f"unparseable command: {e}")
    if argv[0] not in ALLOWED_BINARIES:
        raise CommandBlocked(f"binary '{argv[0]}' is not on the allowlist")
    if argv[0] == "git" and (len(argv) < 2 or argv[1] not in ALLOWED_GIT):
        raise CommandBlocked("only read-only git subcommands are allowed")
    if argv[0] == "find" and any(a in {"-delete", "-exec", "-execdir"} for a in argv):
        raise CommandBlocked("find with -delete/-exec is not allowed")
    if argv[0] == "python3" and ("-c" in argv or len(argv) < 2):
        raise CommandBlocked("inline python is not allowed")
    return argv

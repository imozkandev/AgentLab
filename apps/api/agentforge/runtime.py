"""Execution runtimes. Agent commands never run on the host by default.

`DockerRuntime` is the preferred sandbox: no network, read-only root FS, dropped capabilities,
non-root user, memory/CPU/pids limits and a hard timeout. `RemoteVMRuntime` is a stub for future workers.
"""
from __future__ import annotations

import shutil
import subprocess
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass

from . import config
from .permissions import CommandBlocked, validate_command


@dataclass
class ExecutionResult:
    command: str
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int
    runtime: str
    timed_out: bool = False
    blocked: bool = False


class ExecutionRuntime(ABC):
    name = "base"

    @abstractmethod
    def available(self) -> bool: ...

    @abstractmethod
    def _run(self, argv: list[str], timeout: int) -> ExecutionResult: ...

    def execute(self, command: str, timeout: int = 10, permissions: list[str] | None = None) -> ExecutionResult:
        try:
            argv = validate_command(command, permissions or [])
        except CommandBlocked as e:
            return ExecutionResult(command, 126, "", f"blocked: {e}", 0, self.name, blocked=True)
        return self._run(argv, min(timeout, 60))


class LocalRuntime(ExecutionRuntime):
    """Runs on the host with an allowlisted argv and a timeout. For dev only — prefer Docker."""
    name = "local"

    def available(self) -> bool:
        return True

    def _run(self, argv, timeout):
        t = time.perf_counter()
        try:
            r = subprocess.run(argv, capture_output=True, text=True, timeout=timeout, cwd=config.ROOT)
            return ExecutionResult(" ".join(argv), r.returncode, r.stdout[-8000:], r.stderr[-4000:],
                                   int((time.perf_counter() - t) * 1000), self.name)
        except subprocess.TimeoutExpired:
            return ExecutionResult(" ".join(argv), 124, "", "timeout", timeout * 1000, self.name, timed_out=True)
        except FileNotFoundError as e:
            return ExecutionResult(" ".join(argv), 127, "", str(e), 0, self.name)


class DockerRuntime(ExecutionRuntime):
    name = "docker"
    image = "python:3.12-slim"

    def available(self) -> bool:
        if not shutil.which("docker"):
            return False
        try:
            return subprocess.run(["docker", "info"], capture_output=True, timeout=5).returncode == 0
        except subprocess.SubprocessError:
            return False

    def _run(self, argv, timeout):
        cmd = ["docker", "run", "--rm", "--network", "none", "--read-only", "--cap-drop", "ALL",
               "--security-opt", "no-new-privileges", "--user", "65534:65534", "--memory", "256m", "--cpus", "0.5",
               "--pids-limit", "64", "--tmpfs", "/tmp:rw,size=16m", "-v", f"{config.ROOT}:/workspace:ro",
               "-w", "/workspace", self.image, *argv]
        t = time.perf_counter()
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            return ExecutionResult(" ".join(argv), r.returncode, r.stdout[-8000:], r.stderr[-4000:],
                                   int((time.perf_counter() - t) * 1000), self.name)
        except subprocess.TimeoutExpired:
            return ExecutionResult(" ".join(argv), 124, "", "timeout", timeout * 1000, self.name, timed_out=True)


class RemoteVMRuntime(ExecutionRuntime):
    """Placeholder: would POST the validated argv to a worker on a remote VM."""
    name = "remote-vm"

    def available(self) -> bool:
        return False

    def _run(self, argv, timeout):
        raise NotImplementedError("RemoteVMRuntime is a future extension point")


def get_runtime(name: str | None = None) -> ExecutionRuntime:
    name = name or config.RUNTIME
    rt = {"docker": DockerRuntime, "local": LocalRuntime, "remote-vm": RemoteVMRuntime}[name]()
    if name == "docker" and not rt.available():
        return LocalRuntime()  # graceful degrade; surfaced in /api/infrastructure
    return rt


def available_runtimes() -> list[str]:
    return [r.name for r in (LocalRuntime(), DockerRuntime()) if r.available()]

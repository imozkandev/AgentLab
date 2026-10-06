"""Skill loading, versioning and registry. Skills are plain markdown in the repo (`skills/<name>/SKILL.md`)."""
from __future__ import annotations

import re
from dataclasses import dataclass, field

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config
from .models import SkillVersion, audit, now

STEP_RE = re.compile(r"^\s*(\d+)\.\s+(.*?)(?:\s*\{tool:\s*([\w]+)\})?\s*$")
SEMVER = re.compile(r"^\d+\.\d+\.\d+(-[\w.]+)?$")


class SkillError(Exception):
    pass


@dataclass
class Step:
    n: int
    text: str
    tool: str | None = None


@dataclass
class Skill:
    name: str
    version: str
    description: str
    agent: str
    triggers: list[str]
    permissions: list[str]
    requires: list[str]
    steps: list[Step]
    content: str
    meta: dict = field(default_factory=dict)

    @property
    def ref(self) -> str:
        return f"{self.name}@{self.version}"

    @property
    def tools(self) -> list[str]:
        return [s.tool for s in self.steps if s.tool]


def parse_skill(content: str) -> Skill:
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", content, re.S)
    if not m:
        raise SkillError("SKILL.md must start with YAML frontmatter")
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        raise SkillError(f"invalid frontmatter: {e}")
    for key in ("name", "version", "description"):
        if not meta.get(key):
            raise SkillError(f"frontmatter missing '{key}'")
    if not SEMVER.match(str(meta["version"])):
        raise SkillError(f"version '{meta['version']}' is not semver")
    body, steps, in_workflow = m.group(2), [], False
    for line in body.splitlines():
        if line.startswith("## "):
            in_workflow = line.lower().startswith("## required workflow")
            continue
        if in_workflow and (sm := STEP_RE.match(line)):
            steps.append(Step(int(sm.group(1)), sm.group(2).strip(), sm.group(3)))
    return Skill(name=meta["name"], version=str(meta["version"]), description=meta["description"],
                 agent=meta.get("agent", "analytics-agent"), triggers=[t.lower() for t in meta.get("triggers", [])],
                 permissions=meta.get("permissions", []), requires=meta.get("requires", []), steps=steps,
                 content=content, meta=meta)


def vkey(v: str) -> tuple:
    core = v.split("-")[0]
    return tuple(int(x) for x in core.split("."))


def seed_from_disk(s: Session) -> int:
    """Import skills from the repository. Idempotent. `SKILL.md` = active, `versions/*.md` = archived."""
    added = 0
    if not config.SKILLS_DIR.exists():
        return 0
    for d in sorted(p for p in config.SKILLS_DIR.iterdir() if p.is_dir()):
        files = [(d / "SKILL.md", "active")] + [(f, "archived") for f in sorted((d / "versions").glob("*.md"))]
        for f, status in files:
            if not f.exists():
                continue
            sk = parse_skill(f.read_text())
            exists = s.scalar(select(SkillVersion).where(SkillVersion.name == sk.name, SkillVersion.version == sk.version))
            if exists:
                continue
            s.add(SkillVersion(name=sk.name, version=sk.version, status=status, content=sk.content))
            added += 1
    s.commit()
    return added


def list_versions(s: Session, name: str) -> list[SkillVersion]:
    rows = s.scalars(select(SkillVersion).where(SkillVersion.name == name)).all()
    return sorted(rows, key=lambda r: vkey(r.version), reverse=True)


def names(s: Session) -> list[str]:
    return sorted({r for r in s.scalars(select(SkillVersion.name)).all()})


def get_skill(s: Session, name: str, version: str | None = None) -> Skill:
    q = select(SkillVersion).where(SkillVersion.name == name)
    q = q.where(SkillVersion.version == version) if version else q.where(SkillVersion.status == "active")
    row = s.scalars(q).first()
    if not row:
        raise SkillError(f"skill '{name}{'@' + version if version else ''}' not found")
    return parse_skill(row.content)


def active_skills(s: Session) -> list[Skill]:
    rows = s.scalars(select(SkillVersion).where(SkillVersion.status == "active")).all()
    return [parse_skill(r.content) for r in rows]


def registry(s: Session) -> dict:
    """The discoverable registry agents (the Planner) query."""
    return {"skills": [{"name": k.name, "version": k.version, "description": k.description, "agent": k.agent,
                        "tools": sorted(set(k.tools))} for k in active_skills(s)]}


def select_skill(s: Session, task: str) -> tuple[Skill | None, dict]:
    """Score skills against the task. Deterministic; a real planner LLM can override via the provider."""
    t = task.lower()
    scores = {}
    for k in active_skills(s):
        score = sum(2 for trig in k.triggers if trig in t) + sum(1 for w in re.findall(r"[a-z]{4,}", k.name) if w in t)
        scores[k.name] = score
    if not scores or max(scores.values()) == 0:
        return None, scores
    best = max(scores, key=lambda n: scores[n])
    return next(k for k in active_skills(s) if k.name == best), scores


def draft(s: Session, name: str, content: str, actor: str = "system") -> SkillVersion:
    sk = parse_skill(content)
    if sk.name != name:
        raise SkillError("skill name in frontmatter must match")
    if any(v.version == sk.version for v in list_versions(s, name)):
        existing = next(v for v in list_versions(s, name) if v.version == sk.version)
        if existing.status != "draft":
            raise SkillError(f"version {sk.version} already exists; bump the version")
        existing.content, existing.updated_at = content, now()
        row = existing
    else:
        row = SkillVersion(name=name, version=sk.version, status="draft", content=content)
        s.add(row)
    audit(s, actor, "skill.updated", f"{name}@{sk.version}")
    s.commit()
    return row


def promote(s: Session, name: str, version: str, actor: str = "system") -> SkillVersion:
    rows = list_versions(s, name)
    target = next((r for r in rows if r.version == version), None)
    if not target:
        raise SkillError("version not found")
    prev = next((r for r in rows if r.status == "active"), None)
    if prev:
        prev.status = "archived"
    target.status = "active"
    audit(s, actor, "skill.promoted", name, **{"from": prev.version if prev else None, "to": version})
    s.commit()
    return target

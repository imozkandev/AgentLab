# Skill Engineering Guide

Skills in AgentForge are reusable capabilities stored directly in the repository as version-controlled markdown documents.

## Directory Structure

```text
skills/
  analyze-game-metrics/
    SKILL.md                 # Current active version
    versions/
      1.0.0.md               # Archived version for regression comparison
  investigate-crash/
    SKILL.md
  create-liveops-event/
    SKILL.md
  analyze-player-feedback/
    SKILL.md
```

## Anatomy of a Skill (`SKILL.md`)

```markdown
---
name: analyze-game-metrics
version: 1.1.0
description: Investigates changes in game KPIs and produces evidence-based explanations.
agent: analytics-agent
triggers: [retention, revenue, d1, d7, kpi, metric]
permissions: [analytics.read, liveops.read]
requires: [comparison, segmentation, liveops_check]
---
# Analyze Game Metrics

## Purpose
Investigate changes in game KPIs and produce evidence-based explanations.

## Required Workflow
1. Retrieve the requested metric for the target date. {tool: get_retention}
2. Retrieve the 30-day daily time series to locate when the change started. {tool: get_game_metrics}
3. Compare the last 7 days against the previous 7 days. {tool: compare_periods}
4. Segment affected users by platform, country and version. {tool: get_player_segments}
5. Search LiveOps events in the surrounding window. {tool: list_events}
6. Check remote config changes in the same window. {tool: compare_remote_config}
7. Produce hypotheses. Clearly distinguish facts from hypotheses.

## Rules
- Never claim causation without supporting evidence.
- Always include the data used to support a conclusion.
- Label hypotheses as correlated, never as proven.
```

## Closed-Loop Improvement

1. **Agent Run**: Executes with a missing step in the skill.
2. **Reviewer Rejection / Trace**: Reviewer detects missing platform segmentation.
3. **Failure Cluster**: Telemetry groups recurring missing segmentation errors into Cluster #1.
4. **Automated Proposal**: Suggests adding step 4 to `SKILL.md`.
5. **Evaluation Suite**: Candidate `1.1.0` achieves +7.8 pp improvement and 100% pass rate.
6. **Promotion**: Successfully promoted to active status.

---
name: analyze-game-metrics
version: 1.1.0
description: Investigates changes in game KPIs (retention, revenue, sessions, DAU) and produces evidence-based explanations.
agent: analytics-agent
triggers: [retention, revenue, d1, d7, kpi, metric, metrics, sessions, dau, arpdau, drop, spike, level completion, churn]
permissions: [analytics.read, liveops.read]
requires: [comparison, segmentation, liveops_check]
---
# Analyze Game Metrics

## Purpose

Investigate changes in game KPIs and produce evidence-based explanations.

## Inputs

game, date_range, metrics

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

## Expected Output

Comparison, affected segment, LiveOps correlation, hypotheses, evidence, recommended next step.

## Failure Conditions

Missing segmentation, missing LiveOps check, or unsupported causal claims.

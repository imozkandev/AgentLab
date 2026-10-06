---
name: investigate-crash
version: 1.0.0
description: Investigates crash spikes — which build is affected, the top signature, and the suspect code.
agent: coding-agent
triggers: [crash, crashes, exception, nullreference, stack trace, hotfix, anr]
permissions: [analytics.read, repository.read]
requires: [crash_data, comparison, code_context]
---
# Investigate Crash

## Purpose

Find which build and signature drive a crash spike and point at the suspect code.

## Inputs

game, date_range, platform

## Required Workflow

1. Retrieve crash statistics by platform and version, plus top signatures. {tool: get_crash_stats}
2. Compare crash counts for the last 7 days against the previous 7 days. {tool: compare_periods}
3. Search the repository for the top signature's class. {tool: search_code}
4. Read the most relevant source file. {tool: read_file}
5. Write hypotheses and label them as unconfirmed.

## Rules

- Read-only. Never modify code or push changes.
- Do not claim a root cause without reproducing it.

## Expected Output

Crash comparison, affected build, top signature, code context, hypotheses, next step.

## Failure Conditions

No code inspected, or root cause claimed without evidence.

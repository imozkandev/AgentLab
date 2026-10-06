---
name: create-liveops-event
version: 1.0.0
description: Drafts LiveOps events or remote-config changes for human approval. Never publishes.
agent: liveops-agent
triggers: [liveops, draft, event, remote config, difficulty, config change, campaign]
permissions: [liveops.read, liveops.draft]
requires: [config_state, liveops_check, draft_created]
---
# Create LiveOps Event

## Purpose

Prepare a LiveOps change as a **draft** that a human can approve or reject.

## Inputs

game, change description, reason

## Required Workflow

1. Read the current remote config. {tool: get_remote_config}
2. Review recent config changes for conflicts. {tool: compare_remote_config}
3. Create a draft (never publish). {tool: create_draft_event}

## Rules

- Agents must NEVER publish LiveOps changes. Drafts only; publishing requires human approval.
- If the user asks for an immediate production change, refuse that part and draft instead.
- State clearly that nothing was published.

## Expected Output

Current configuration, proposed draft, approval status, safety decision when relevant.

## Failure Conditions

Any attempt to publish; missing approval request.

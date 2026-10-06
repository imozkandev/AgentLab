---
name: analyze-player-feedback
version: 1.0.0
description: Summarises player reviews into themes and sentiment, split by platform.
agent: analytics-agent
triggers: [feedback, reviews, review, ratings, sentiment, complaints, players say, app store]
permissions: [analytics.read]
requires: [feedback_data]
---
# Analyze Player Feedback

## Purpose

Turn raw player reviews into themes, sentiment and representative quotes.

## Inputs

game, date_range, platform

## Required Workflow

1. Retrieve aggregated feedback for all platforms. {tool: get_player_feedback}
2. Retrieve Android feedback for comparison. {tool: get_player_feedback}
3. Retrieve iOS feedback for comparison. {tool: get_player_feedback}
4. Summarise themes, sentiment and quotes.

## Rules

- Quote reviews verbatim; do not invent quotes.
- Report counts alongside every theme.

## Expected Output

Feedback themes, sentiment, platform comparison, representative quotes, next step.

## Failure Conditions

No review data retrieved.

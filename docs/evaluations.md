# Evaluation Engineering & Regression Testing

AgentForge treats evaluations as a primary engineering discipline, not an optional benchmark.

## Evaluation Architecture

Every evaluation case defines:
- **Input Task**: The prompt provided to the agent workflow.
- **Expected Outcome**:
  - `tools`: Mandatory tools that must be invoked during the workflow.
  - `forbidden_tools`: Tools that must never be invoked.
  - `max_tool_calls`: Upper bound on execution efficiency.
  - `must_include`: Mandatory semantic concepts or data points in the report.
  - `must_not`: Prohibited patterns (e.g. claiming causation without empirical proof).
  - `approval`: Whether a human approval request must be generated.
  - `refusal`: Whether an unsafe direct change must be explicitly refused.

## Deterministic Verification vs LLM Judge

1. **Deterministic Checks (85% weight)**:
   - Tool call sequence verification
   - Permission adherence
   - Absence of unapproved live actions
   - Output schema & keyword verification
2. **Judge Dimension (15% weight)**:
   - Evidence clarity
   - Reasoning rigor
   - Distinguishing correlation from causation

## Regression Detection & Promotion Blocking

When a skill is modified (e.g., `analyze-game-metrics@1.0.0` lacking platform segmentation vs `1.1.0` with mandatory segmentation):
1. Both active and candidate versions are evaluated against the entire test suite.
2. If any previously passing test fails, a **Regression is Detected**.
3. If any critical safety evaluation fails, **Promotion is Blocked**.
4. The API returns HTTP 409 and logs a `skill.promotion_blocked` audit event.

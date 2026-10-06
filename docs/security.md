# Security, Sandboxing & Permission Model

Operating autonomous AI agents in production requires strict defense-in-depth security rather than prompt-based constraints alone.

## 1. Permission Scopes

Agent personas are granted explicit scopes:
- `analytics.read`: Query internal game KPIs, retention, cohorts, crashes.
- `repository.read`: Read-only source code access.
- `repository.write`: Propose file modifications (not exposed to autonomous agents).
- `liveops.read`: Read LiveOps campaigns and remote configuration history.
- `liveops.draft`: Draft LiveOps configurations and economy events.
- `liveops.publish`: **CRITICAL Scope**. Never granted to autonomous agents.
- `shell.safe`: Execute allowlisted binaries within an isolated sandbox.

## 2. Tool Risk Classification

Every tool is statically assigned a risk classification:
- **LOW**: Read-only queries (`get_retention`, `search_code`, `read_file`).
- **MEDIUM**: Draft creations and safe mutations (`create_draft_event`).
- **HIGH**: Batch operations or cross-system changes.
- **CRITICAL**: Production-affecting actions (`publish_event`).

**Rule**: CRITICAL tools can never be executed inline by an agent. Even if invoked, the ToolGateway intercepts the call, transitions the operation into a pending `ApprovalRequest`, and requires explicit human verification.

## 3. Defense-in-Depth Command Execution

The sandbox execution runtime enforces:
1. **Pre-execution string & regex blacklists** (`rm -rf`, `sudo`, `shutdown`, `mkfs`, `curl | sh`, `:(){ :|:& };:`).
2. **Shell metacharacter rejection**: Disallows `;`, `&`, `|`, `` ` ``, `>`, `<`, `$()` to prevent command chaining and subshells.
3. **Binary allowlisting**: Only safe utilities (`ls`, `cat`, `grep`, `find`, `python3`, `git`, `wc`, `tail`, `head`) are permitted.
4. **Git restriction**: Only read-only subcommands (`status`, `diff`, `log`, `show`, `branch`) can be executed. No `git push`, `git checkout`, or `git commit`.
5. **Runtime container isolation**: Docker containers run with:
   - `--network none` (Zero outbound network access)
   - `--read-only` (Immutable root filesystem)
   - `--cap-drop ALL` (No Linux capabilities)
   - `--security-opt no-new-privileges`
   - Memory (256MB), CPU (0.5), and PIDs limits.

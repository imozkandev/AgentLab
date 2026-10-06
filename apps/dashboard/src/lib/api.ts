// API Client for AgentForge Backend

const BASE_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = errorBody.detail || errorBody.message || JSON.stringify(errorBody);
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return res.json();
}

export interface OverviewData {
  runs_24h: number;
  queued: number;
  success_rate: number | null;
  avg_score: number | null;
  avg_cost: number | null;
  p95_latency_ms: number;
  tool_errors: number;
  pending_approvals: number;
  series: { hour: string; runs: number; score: number | null }[];
  recent: RunItem[];
}

export interface RunItem {
  id: string;
  task: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  source: string;
  agent: string | null;
  model: string;
  skill: string | null;
  skill_version: string | null;
  created_at: string;
  latency_ms: number;
  estimated_cost: number;
  tool_calls: number;
  review_iterations: number;
  evaluation_score: number | null;
  failure_category: string | null;
  input_tokens: number;
  output_tokens: number;
  worker: string | null;
}

export interface RunStep {
  seq: number;
  t_ms: number;
  type: string;
  actor: string;
  title: string;
  detail: any;
  status: 'ok' | 'error' | 'denied' | 'rejected' | 'pending';
}

export interface RunDetail extends RunItem {
  prompt_version: string;
  start_time: string | null;
  end_time: string | null;
  plan: { n: number; text: string; tool?: string }[] | null;
  result_text: string | null;
  errors: any[];
  evaluation: any | null;
  options: any;
  failure_signature: string | null;
  steps: RunStep[];
  approvals: ApprovalItem[];
}

export interface SkillItem {
  name: string;
  version: string | null;
  description: string;
  agent: string | null;
  eval_score: number | null;
  runs: number;
  failure_rate: number | null;
  last_updated: string | null;
  versions: number;
  tools: string[];
  cases: number;
}

export interface SkillDetail extends SkillItem {
  versions_detail: {
    version: string;
    status: 'active' | 'archived' | 'draft';
    eval_score: number | null;
    content: string;
    updated_at: string;
  }[];
}

export interface AgentItem {
  name: string;
  description: string;
  permissions: string[];
  skills: string[];
  tool_count: number;
  tools: string[];
  runs: number;
  success_rate: number | null;
  avg_score: number | null;
}

export interface McpTool {
  name: string;
  server: string;
  description: string;
  scope: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requires_approval: boolean;
  input_schema: any;
}

export interface McpServerItem {
  name: string;
  title: string;
  description: string;
  status: string;
  tools: McpTool[];
  tool_count: number;
  calls_24h: number;
  error_rate: number;
  avg_latency_ms: number;
}

export interface ApprovalItem {
  id: string;
  run_id: string | null;
  agent: string;
  tool: string;
  risk: string;
  summary: string;
  payload: any;
  status: 'pending' | 'approved' | 'rejected';
  decided_by: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface WorkerItem {
  hostname: string;
  label: string;
  platform: string;
  region: string;
  runtimes: string[];
  agents: number;
  active_jobs: number;
  cpu: number;
  memory: number;
  mocked: boolean;
  status: 'online' | 'offline';
  heartbeat_age_s: number;
}

export interface FailureClusterItem {
  id: number;
  skill: string;
  category: string;
  signature: string;
  occurrences: number;
  versions: string[];
  avg_score: number | null;
  run_ids: string[];
  suggestion: string;
}

export interface FailureAnalysisData {
  total_runs: number;
  failed_runs: number;
  categories: { category: string; count: number; share: number }[];
  clusters: FailureClusterItem[];
}

export interface EvalData {
  cases: { name: string; skill: string; category: string; task: string; critical: boolean; threshold: number }[];
  runs: {
    id: string;
    skill: string;
    version: string;
    kind: string;
    score: number;
    passed: number;
    failed: number;
    safety_ok: boolean;
    created_at: string;
  }[];
}

export interface AuditItem {
  id: number;
  ts: string;
  actor: string;
  action: string;
  target: string;
  detail: any;
}

export interface CostItem {
  skill: string;
  runs: number;
  total_cost: number;
  avg_cost: number;
  tokens: number;
  avg_score: number | null;
  quality_per_dollar: number | null;
}

export const api = {
  getOverview: () => fetchJson<OverviewData>('/api/overview'),
  
  getRuns: (params?: { skill?: string; status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.skill) q.append('skill', params.skill);
    if (params?.status) q.append('status', params.status);
    if (params?.limit) q.append('limit', String(params.limit));
    return fetchJson<RunItem[]>(`/api/runs?${q.toString()}`);
  },
  
  getRun: (id: string) => fetchJson<RunDetail>(`/api/runs/${id}`),
  
  createRun: (data: { task: string; skill?: string; skill_version?: string }) =>
    fetchJson<RunItem>('/api/runs', { method: 'POST', body: JSON.stringify(data) }),

  replayRun: (id: string, skill_version?: string) =>
    fetchJson<RunItem>(`/api/runs/${id}/replay`, { method: 'POST', body: JSON.stringify({ skill_version }) }),

  cancelRun: (id: string) =>
    fetchJson<RunItem>(`/api/runs/${id}/cancel`, { method: 'POST' }),

  getSkills: () => fetchJson<SkillItem[]>('/api/skills'),
  
  getSkill: (name: string) => fetchJson<SkillDetail>(`/api/skills/${name}`),
  
  saveSkillDraft: (name: string, content: string) =>
    fetchJson<{ version: string; status: string }>(`/api/skills/${name}/draft`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  evaluateSkill: (name: string, version: string) =>
    fetchJson<any>(`/api/skills/${name}/evaluate`, {
      method: 'POST',
      body: JSON.stringify({ version }),
    }),

  promoteSkill: (name: string, version: string) =>
    fetchJson<{ promoted: string; delta: number }>(`/api/skills/${name}/promote`, {
      method: 'POST',
      body: JSON.stringify({ version }),
    }),

  getEvals: () => fetchJson<EvalData>('/api/evals'),

  runEval: (skill: string, version?: string) =>
    fetchJson<any>('/api/evals/run', {
      method: 'POST',
      body: JSON.stringify({ skill, version }),
    }),

  getAgents: () => fetchJson<AgentItem[]>('/api/agents'),

  updateAgentPermissions: (name: string, permissions: string[]) =>
    fetchJson<any>(`/api/agents/${name}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),

  getMcpServers: () => fetchJson<McpServerItem[]>('/api/mcp'),

  invokeTool: (data: { agent: string; tool: string; arguments: any }) =>
    fetchJson<any>('/api/tools/invoke', { method: 'POST', body: JSON.stringify(data) }),

  sandboxExec: (data: { command: string; agent?: string; timeout?: number }) =>
    fetchJson<any>('/api/sandbox/exec', { method: 'POST', body: JSON.stringify(data) }),

  getInfrastructure: () => fetchJson<{ workers: WorkerItem[]; runtimes: string[]; queue_depth: number }>('/api/infrastructure'),

  getApprovals: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return fetchJson<ApprovalItem[]>(`/api/approvals${q}`);
  },

  decideApproval: (id: string, decision: 'approve' | 'reject', user: string = 'operator') =>
    fetchJson<ApprovalItem>(`/api/approvals/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, user }),
    }),

  getFailures: () => fetchJson<FailureAnalysisData>('/api/failures'),

  getAuditLogs: (action?: string) => {
    const q = action ? `?action=${action}` : '';
    return fetchJson<AuditItem[]>(`/api/audit${q}`);
  },

  getCosts: () => fetchJson<CostItem[]>('/api/costs'),
};

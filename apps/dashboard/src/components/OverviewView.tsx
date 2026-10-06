'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, RunItem } from '@/lib/api';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  ShieldAlert, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

interface OverviewViewProps {
  onSelectRun: (id: string) => void;
  onOpenNewRun: () => void;
  onNavigateTab: (tab: any) => void;
}

export default function OverviewView({ onSelectRun, onOpenNewRun, onNavigateTab }: OverviewViewProps) {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.getOverview(),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
          Loading telemetry & metrics...
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Runs (24h)',
      value: data.runs_24h.toLocaleString(),
      sub: `${data.queued} in queue`,
      icon: <Play className="w-4 h-4 text-sky-400" />,
      color: 'border-sky-500/30'
    },
    {
      title: 'Success Rate',
      value: data.success_rate !== null ? `${(data.success_rate * 100).toFixed(1)}%` : '—',
      sub: 'Multi-agent workflow',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      color: 'border-emerald-500/30'
    },
    {
      title: 'Average Eval Score',
      value: data.avg_score !== null ? `${(data.avg_score * 100).toFixed(1)}%` : '—',
      sub: 'Deterministic + Judge',
      icon: <TrendingUp className="w-4 h-4 text-indigo-400" />,
      color: 'border-indigo-500/30'
    },
    {
      title: 'Average Cost',
      value: data.avg_cost !== null ? `$${data.avg_cost.toFixed(4)}` : '—',
      sub: 'Per run execution',
      icon: <DollarSign className="w-4 h-4 text-amber-400" />,
      color: 'border-amber-500/30'
    },
    {
      title: 'P95 Latency',
      value: `${(data.p95_latency_ms / 1000).toFixed(1)}s`,
      sub: 'End-to-end trace',
      icon: <Clock className="w-4 h-4 text-slate-400" />,
      color: 'border-slate-700'
    },
    {
      title: 'Tool Errors / Denials',
      value: data.tool_errors,
      sub: 'Blocked by gateway',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
      color: 'border-rose-500/30'
    },
    {
      title: 'Human Approvals',
      value: data.pending_approvals,
      sub: 'Waiting for review',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      color: 'border-amber-500/30',
      action: () => onNavigateTab('approvals')
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero / Quick Pitch */}
      <div className="p-5 rounded-lg bg-gradient-to-r from-slate-900 via-[#0e1526] to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              INTERNAL AI PLATFORM
            </span>
            <span className="text-xs text-slate-400">Fictional Studio: Word Quest GameOps</span>
          </div>
          <h2 className="text-lg font-semibold text-white mt-1">
            Production Agent Infrastructure & Evaluation Platform
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Centralized orchestration layer running Planner → Worker → Reviewer → Evaluator across local and sandbox environments with MCP tools, strict permission scopes, automated regression evaluations, and failure clustering.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 rounded-md border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-sky-400' : ''}`} />
          </button>
          <button
            onClick={onOpenNewRun}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md transition cursor-pointer shadow-sm shadow-sky-600/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Launch Demo Run
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            onClick={kpi.action}
            className={`p-3 rounded-lg bg-[#0e1526] border border-slate-800/80 hover:border-slate-700 transition ${
              kpi.action ? 'cursor-pointer hover:bg-slate-850' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 truncate">{kpi.title}</span>
              {kpi.icon}
            </div>
            <div className="text-lg font-semibold text-white font-mono mt-1">{kpi.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart & Live Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Throughput & Score Chart */}
        <div className="lg:col-span-2 p-4 rounded-lg bg-[#0e1526] border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-200">Execution Velocity (24h)</h3>
              <p className="text-[11px] text-slate-400">Agent runs and quality evaluation distribution</p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
              Live Stream
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series}>
                <defs>
                  <linearGradient id="runsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="hour" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={{ stroke: '#334155' }} 
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={{ stroke: '#334155' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#090d16', 
                    borderColor: '#1e293b', 
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#f8fafc' 
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="runs" 
                  name="Runs" 
                  stroke="#38bdf8" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#runsGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Demo Scenarios Trigger */}
        <div className="p-4 rounded-lg bg-[#0e1526] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-semibold text-slate-200">Interactive Portfolios</h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Explore key infrastructure flows directly:
            </p>

            <div className="space-y-2">
              <div 
                onClick={() => onNavigateTab('skills')}
                className="p-2.5 rounded border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 transition cursor-pointer"
              >
                <div className="text-xs font-medium text-slate-200">Skill Playground & Regression</div>
                <div className="text-[11px] text-slate-400">See v1.0.0 failure → v1.1.0 improvement & promotion block.</div>
              </div>

              <div 
                onClick={() => onNavigateTab('mcp')}
                className="p-2.5 rounded border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 transition cursor-pointer"
              >
                <div className="text-xs font-medium text-slate-200">Safety Lab & Sandboxing</div>
                <div className="text-[11px] text-slate-400">Invoke forbidden tools & blocked shell commands.</div>
              </div>

              <div 
                onClick={() => onNavigateTab('failures')}
                className="p-2.5 rounded border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 transition cursor-pointer"
              >
                <div className="text-xs font-medium text-slate-200">Failure Clustering & Suggestions</div>
                <div className="text-[11px] text-slate-400">Traces automatically translate to skill improvements.</div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/60 mt-3 text-[11px] text-slate-500 font-mono">
            Provider: Mock (Deterministic) • Switchable to Claude / GPT / Gemini
          </div>
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="rounded-lg bg-[#0e1526] border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-[#090d16]">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-white">Recent Agent Executions</h3>
            <span className="text-[11px] text-slate-500 font-mono">({data.recent.length} recent)</span>
          </div>
          <button
            onClick={() => onNavigateTab('runs')}
            className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition cursor-pointer"
          >
            <span>View All Runs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-2.5 px-4 font-mono">RUN ID</th>
                <th className="py-2.5 px-4">TASK</th>
                <th className="py-2.5 px-4">AGENT / SKILL</th>
                <th className="py-2.5 px-4">STATUS</th>
                <th className="py-2.5 px-4 text-right">SCORE</th>
                <th className="py-2.5 px-4 text-right">TOOLS</th>
                <th className="py-2.5 px-4 text-right">DURATION</th>
                <th className="py-2.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {data.recent.map((run: RunItem) => (
                <tr 
                  key={run.id}
                  className="hover:bg-slate-800/40 transition cursor-pointer"
                  onClick={() => onSelectRun(run.id)}
                >
                  <td className="py-2.5 px-4 font-mono text-sky-400 font-medium whitespace-nowrap">
                    {run.id}
                  </td>
                  <td className="py-2.5 px-4 max-w-xs truncate text-slate-200">
                    {run.task}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="text-slate-300 font-mono">
                      {run.skill ? `${run.skill}@${run.skill_version}` : run.agent || 'planner'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <StatusBadge status={run.status} failureCategory={run.failure_category} />
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap">
                    {run.evaluation_score !== null ? (
                      <span className={run.evaluation_score >= 0.9 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {(run.evaluation_score * 100).toFixed(0)}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                    {run.tool_calls}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                    {(run.latency_ms / 1000).toFixed(1)}s
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRun(run.id);
                      }}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                    >
                      Inspect Trace →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status, failureCategory }: { status: string; failureCategory?: string | null }) {
  if (status === 'completed' && failureCategory) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/60 text-amber-300 border border-amber-800/40">
        <AlertTriangle className="w-3 h-3" />
        revised ({failureCategory})
      </span>
    );
  }

  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          completed
        </span>
      );
    case 'running':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-950/60 text-sky-300 border border-sky-800/40 animate-pulse">
          <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
          running
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-950/60 text-rose-300 border border-rose-800/40">
          <XCircle className="w-3 h-3 text-rose-400" />
          {failureCategory || 'failed'}
        </span>
      );
    case 'queued':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
          <Clock className="w-3 h-3 text-slate-400" />
          queued
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400">
          {status}
        </span>
      );
  }
}

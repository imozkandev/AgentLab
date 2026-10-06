'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, RunItem, RunDetail, RunStep } from '@/lib/api';
import { StatusBadge } from './OverviewView';
import { 
  Play, 
  X, 
  RotateCcw, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Cpu, 
  FileCode, 
  ShieldCheck, 
  ChevronRight, 
  ChevronDown 
} from 'lucide-react';

interface RunsViewProps {
  selectedRunId: string | null;
  onSelectRun: (id: string | null) => void;
  onOpenNewRun: () => void;
}

export default function RunsView({ selectedRunId, onSelectRun, onOpenNewRun }: RunsViewProps) {
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: runs, isLoading } = useQuery({
    queryKey: ['runs', { skill: skillFilter, status: statusFilter }],
    queryFn: () => api.getRuns({ skill: skillFilter || undefined, status: statusFilter || undefined, limit: 150 }),
  });

  const filteredRuns = (runs || []).filter((r) => 
    r.task.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    (r.skill && r.skill.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-[#0e1526] border border-slate-800">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by task, run ID or skill..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Skills</option>
            <option value="analyze-game-metrics">analyze-game-metrics</option>
            <option value="investigate-crash">investigate-crash</option>
            <option value="create-liveops-event">create-liveops-event</option>
            <option value="analyze-player-feedback">analyze-player-feedback</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
          </select>

          <button
            onClick={onOpenNewRun}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            New Run
          </button>
        </div>
      </div>

      {/* Runs Table */}
      <div className="rounded-lg bg-[#0e1526] border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-2.5 px-4 font-mono">RUN</th>
                <th className="py-2.5 px-4">TASK</th>
                <th className="py-2.5 px-4">AGENT / SKILL</th>
                <th className="py-2.5 px-4">STATUS</th>
                <th className="py-2.5 px-4 text-right">EVAL</th>
                <th className="py-2.5 px-4 text-right">COST</th>
                <th className="py-2.5 px-4 text-right">DURATION</th>
                <th className="py-2.5 px-4 text-right">CREATED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-mono">
                    Loading runs...
                  </td>
                </tr>
              ) : filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No runs found matching filters.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectRun(r.id)}
                    className={`hover:bg-slate-800/40 transition cursor-pointer ${
                      selectedRunId === r.id ? 'bg-sky-950/20 border-l-2 border-l-sky-400' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono text-sky-400 font-semibold whitespace-nowrap">
                      {r.id}
                    </td>
                    <td className="py-2.5 px-4 max-w-md truncate text-slate-200">
                      {r.task}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap font-mono text-slate-300">
                      {r.skill ? `${r.skill}@${r.skill_version}` : r.agent || 'planner'}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <StatusBadge status={r.status} failureCategory={r.failure_category} />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap">
                      {r.evaluation_score !== null ? (
                        <span className={r.evaluation_score >= 0.9 ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                          {(r.evaluation_score * 100).toFixed(0)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                      ${r.estimated_cost.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                      {(r.latency_ms / 1000).toFixed(1)}s
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trace Inspector Modal / Drawer */}
      {selectedRunId && (
        <RunTraceInspector
          runId={selectedRunId}
          onClose={() => onSelectRun(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Trace Inspector
function RunTraceInspector({ runId, onClose }: { runId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'timeline' | 'report' | 'plan' | 'eval'>('timeline');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const { data: run, isLoading } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.getRun(runId),
    refetchInterval: (query) => (query.state.data?.status === 'running' || query.state.data?.status === 'queued' ? 1000 : false),
  });

  const replayMutation = useMutation({
    mutationFn: () => api.replayRun(runId),
    onSuccess: (newRun) => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      alert(`Replay queued as ${newRun.id}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['run', runId] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
  });

  if (isLoading || !run) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="p-6 rounded-lg bg-[#0e1526] border border-slate-800 text-xs font-mono text-slate-300">
          Loading trace for {runId}...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b101e] border border-slate-800 rounded-lg w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3 border-b border-slate-800 bg-[#070b14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold text-sky-400">{run.id}</span>
            <StatusBadge status={run.status} failureCategory={run.failure_category} />
            <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              {run.skill ? `${run.skill}@${run.skill_version}` : 'planner-agent'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {run.status === 'queued' && (
              <button
                onClick={() => cancelMutation.mutate()}
                className="px-2.5 py-1 text-xs font-medium text-rose-300 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 rounded cursor-pointer"
              >
                Cancel Run
              </button>
            )}
            <button
              onClick={() => replayMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded cursor-pointer"
              title="Re-execute with fresh trace"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Replay
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task Summary Banner */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs text-slate-200 font-medium">
            <span className="text-slate-400 font-mono mr-1">Task:</span>
            {run.task}
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400 shrink-0">
            <span title="Evaluation Score">
              Eval: <strong className="text-emerald-400 font-semibold">{run.evaluation_score !== null ? `${(run.evaluation_score * 100).toFixed(0)}%` : '—'}</strong>
            </span>
            <span>Duration: {(run.latency_ms / 1000).toFixed(1)}s</span>
            <span>Cost: ${run.estimated_cost.toFixed(4)}</span>
            <span>Tools: {run.tool_calls}</span>
            <span>Revisions: {run.review_iterations}</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 px-5 border-b border-slate-800 bg-[#090d16]">
          {[
            { id: 'timeline', label: `Trace Timeline (${run.steps?.length || 0})` },
            { id: 'report', label: 'Synthesized Report' },
            { id: 'plan', label: `Plan (${run.plan?.length || 0} steps)` },
            { id: 'eval', label: 'Evaluation Breakdown' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition cursor-pointer ${
                activeTab === t.id
                  ? 'border-sky-400 text-sky-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: Trace Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="relative pl-6 border-l-2 border-slate-800 space-y-4 my-2">
                {run.steps?.map((step: RunStep) => {
                  const isExpanded = expandedStep === step.seq;
                  const timeFormatted = `${(step.t_ms / 1000).toFixed(1)}s`;

                  return (
                    <div key={step.seq} className="relative group">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#0b101e] ${
                        step.status === 'ok' ? 'bg-sky-400' :
                        step.status === 'denied' ? 'bg-rose-500' :
                        step.status === 'error' ? 'bg-rose-400' :
                        step.status === 'rejected' ? 'bg-amber-400' : 'bg-slate-400'
                      }`} />

                      {/* Step Header */}
                      <div 
                        onClick={() => setExpandedStep(isExpanded ? null : step.seq)}
                        className="p-2.5 rounded-md border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 transition cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 flex-1 truncate">
                          <span className="text-[11px] text-slate-500 w-12">{timeFormatted}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {step.actor}
                          </span>
                          <span className="font-semibold text-slate-100 truncate">
                            {step.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            step.status === 'ok' ? 'text-emerald-400 bg-emerald-950/40' :
                            step.status === 'denied' ? 'text-rose-400 bg-rose-950/40' :
                            step.status === 'rejected' ? 'text-amber-400 bg-amber-950/40' :
                            'text-slate-400 bg-slate-800'
                          }`}>
                            {step.status}
                          </span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                      </div>

                      {/* Step Detail Drawer */}
                      {isExpanded && (
                        <div className="mt-2 p-3 rounded-md bg-slate-950 border border-slate-800/80 text-[11px] font-mono overflow-x-auto text-slate-300">
                          <div className="text-[10px] uppercase text-slate-500 mb-1">Step Payload / Arguments / Detail:</div>
                          <pre className="whitespace-pre-wrap break-words text-slate-200">
                            {JSON.stringify(step.detail, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Synthesized Report */}
          {activeTab === 'report' && (
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-sans leading-relaxed text-slate-200">
              {run.result_text ? (
                <div className="space-y-4 whitespace-pre-wrap text-xs font-mono">
                  {run.result_text}
                </div>
              ) : (
                <div className="text-slate-500 italic text-xs">No result generated yet.</div>
              )}
            </div>
          )}

          {/* TAB 3: Plan */}
          {activeTab === 'plan' && (
            <div className="space-y-2">
              {run.plan?.map((step: any) => (
                <div key={step.n} className="p-3 rounded-md border border-slate-800 bg-slate-900/60 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    {step.n}
                  </span>
                  <div className="flex-1">
                    <div className="text-xs text-slate-200">{step.text}</div>
                    {step.tool && (
                      <div className="text-[11px] font-mono text-sky-400 mt-1">
                        MCP Tool: <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{step.tool}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: Evaluation Breakdown */}
          {activeTab === 'eval' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(run.evaluation || {}).map(([dim, score]: [string, any]) => {
                  if (typeof score !== 'number') return null;
                  return (
                    <div key={dim} className="p-3 rounded-md border border-slate-800 bg-slate-900/60">
                      <div className="text-[11px] text-slate-400 capitalize">{dim.replace('_', ' ')}</div>
                      <div className="text-base font-bold font-mono text-white mt-0.5">
                        {dim === 'hallucination_rate' ? `${(score * 100).toFixed(0)}%` : `${(score * 100).toFixed(0)}%`}
                      </div>
                    </div>
                  );
                })}
              </div>

              {run.evaluation?.missing_first_pass && run.evaluation.missing_first_pass.length > 0 && (
                <div className="p-3 rounded-md bg-amber-950/40 border border-amber-800/40 text-xs text-amber-200">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Reviewer Detected Missing First-Pass Evidence:
                  </div>
                  <div className="mt-1 font-mono text-[11px]">
                    {run.evaluation.missing_first_pass.join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

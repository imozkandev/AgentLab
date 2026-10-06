'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Play, 
  Filter, 
  Sparkles,
  RefreshCw 
} from 'lucide-react';

export default function EvalsView() {
  const queryClient = useQueryClient();
  const [skillFilter, setSkillFilter] = useState('');

  const { data: evalsData, isLoading } = useQuery({
    queryKey: ['evals'],
    queryFn: () => api.getEvals(),
  });

  const runSuiteMutation = useMutation({
    mutationFn: (skillName: string) => api.runEval(skillName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evals'] });
      alert('Evaluation suite run completed!');
    },
  });

  if (isLoading || !evalsData) {
    return <div className="p-8 text-center text-xs font-mono text-slate-500">Loading evaluations...</div>;
  }

  const cases = evalsData.cases.filter((c) => !skillFilter || c.skill === skillFilter);

  return (
    <div className="space-y-6">
      {/* Header and Quick Run Section */}
      <div className="p-5 rounded-lg bg-[#0e1526] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Automated Evaluation Engine & Regression Suites</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            18 predefined test scenarios enforcing deterministic checks (tool verification, forbidden tools, max tool calls, safety refusals) combined with LLM-as-a-judge quality scoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Skills (18 Cases)</option>
            <option value="analyze-game-metrics">analyze-game-metrics (8 cases)</option>
            <option value="create-liveops-event">create-liveops-event (5 cases)</option>
            <option value="investigate-crash">investigate-crash (3 cases)</option>
            <option value="analyze-player-feedback">analyze-player-feedback (2 cases)</option>
          </select>

          <button
            onClick={() => runSuiteMutation.mutate(skillFilter || 'analyze-game-metrics')}
            disabled={runSuiteMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {runSuiteMutation.isPending ? 'Evaluating...' : 'Run Suite'}
          </button>
        </div>
      </div>

      {/* Test Cases Grid */}
      <div className="rounded-lg bg-[#0e1526] border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
          <span className="text-xs font-semibold text-white">Evaluation Scenarios ({cases.length})</span>
          <span className="text-[11px] font-mono text-slate-400">Deterministic checks + Thresholds</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {cases.map((c) => (
            <div key={c.name} className="p-3.5 hover:bg-slate-850/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-sky-300">{c.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {c.skill}
                  </span>
                  {c.critical && (
                    <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800">
                      CRITICAL SAFETY GATE
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-500">
                    category: {c.category}
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  <span className="text-slate-500 font-mono">Task:</span> &ldquo;{c.task}&rdquo;
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                <span className="text-slate-400">
                  Threshold: <strong className="text-emerald-400">{(c.threshold * 100).toFixed(0)}%</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Evaluation Runs */}
      <div className="rounded-lg bg-[#0e1526] border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 bg-[#090d16]">
          <h3 className="text-xs font-semibold text-white">Historical Evaluation Runs</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-2.5 px-4 font-mono">EVAL ID</th>
                <th className="py-2.5 px-4">SKILL</th>
                <th className="py-2.5 px-4">VERSION</th>
                <th className="py-2.5 px-4">KIND</th>
                <th className="py-2.5 px-4 text-right">PASSED</th>
                <th className="py-2.5 px-4 text-right">FAILED</th>
                <th className="py-2.5 px-4 text-right">SCORE</th>
                <th className="py-2.5 px-4 text-right">SAFETY</th>
                <th className="py-2.5 px-4 text-right">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {evalsData.runs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-sky-400 font-bold">{r.id}</td>
                  <td className="py-2.5 px-4 text-slate-200">{r.skill}</td>
                  <td className="py-2.5 px-4">v{r.version}</td>
                  <td className="py-2.5 px-4 text-slate-400 uppercase text-[10px]">{r.kind}</td>
                  <td className="py-2.5 px-4 text-right text-emerald-400 font-semibold">{r.passed}</td>
                  <td className="py-2.5 px-4 text-right text-rose-400 font-semibold">{r.failed}</td>
                  <td className="py-2.5 px-4 text-right text-white font-bold">{(r.score * 100).toFixed(1)}%</td>
                  <td className="py-2.5 px-4 text-right">
                    {r.safety_ok ? (
                      <span className="text-emerald-400 font-semibold">PASS</span>
                    ) : (
                      <span className="text-rose-400 font-semibold">FAIL</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-500">
                    {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

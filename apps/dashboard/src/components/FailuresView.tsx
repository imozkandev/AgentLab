'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, FailureClusterItem } from '@/lib/api';
import { 
  BarChart3, 
  Lightbulb, 
  AlertCircle, 
  TrendingUp, 
  ArrowRight,
  Layers
} from 'lucide-react';

interface FailuresViewProps {
  onNavigateSkills: () => void;
}

export default function FailuresView({ onNavigateSkills }: FailuresViewProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['failures'],
    queryFn: () => api.getFailures(),
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-xs font-mono text-slate-500">Loading failure telemetry...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Failure Category Distribution */}
      <div className="p-5 rounded-lg bg-[#0e1526] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-white">Automated Failure Categorization & RCA</h3>
            <p className="text-[11px] text-slate-400">Classified from execution traces across all agent runs</p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Total failed / degraded: <strong className="text-amber-400">{data.failed_runs}</strong> of {data.total_runs} runs
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.categories.map((c) => (
            <div key={c.category} className="p-3 rounded-md bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-mono capitalize">
                {c.category.replace('_', ' ')}
              </div>
              <div className="text-lg font-bold text-white font-mono mt-1">
                {(c.share * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {c.count} occurrences
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Failure Clusters Table with Improvement Suggestions */}
      <div className="rounded-lg bg-[#0e1526] border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-semibold text-white">Recurring Failure Clusters & Automated Skill Proposals</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Closed-loop self-improvement
          </span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {data.clusters.map((cl: FailureClusterItem) => (
            <div key={cl.id} className="p-5 space-y-3 hover:bg-slate-850/30 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded bg-sky-950 border border-sky-800 text-sky-400 flex items-center justify-center font-mono font-bold text-xs">
                    #{cl.id}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-100">
                    Skill: {cl.skill} (v{cl.versions.join(', ')})
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                    {cl.category}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
                  <span>Occurrences: <strong className="text-white">{cl.occurrences}</strong></span>
                  <span>Avg Eval: <strong className="text-amber-400">{cl.avg_score !== null ? `${(cl.avg_score * 100).toFixed(0)}%` : '—'}</strong></span>
                </div>
              </div>

              {/* Signature Pattern */}
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                <span className="text-slate-500 mr-2">Pattern Signature:</span>
                <span className="text-rose-300 font-semibold">{cl.signature}</span>
              </div>

              {/* Suggested Improvement Banner */}
              <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-xs flex items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-emerald-300 text-xs">
                      Proposed Skill Improvement:
                    </div>
                    <div className="text-emerald-200 text-xs mt-0.5 leading-relaxed font-mono">
                      {cl.suggestion}
                    </div>
                  </div>
                </div>

                <button
                  onClick={onNavigateSkills}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-emerald-300 bg-emerald-900/60 hover:bg-emerald-800/80 rounded border border-emerald-700/60 shrink-0 transition cursor-pointer"
                >
                  <span>Apply in Playground</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

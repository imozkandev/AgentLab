'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, CostItem } from '@/lib/api';
import { Cpu, DollarSign, TrendingUp, Sparkles } from 'lucide-react';

export default function CostsView() {
  const { data: costs, isLoading } = useQuery({
    queryKey: ['costs'],
    queryFn: () => api.getCosts(),
  });

  if (isLoading || !costs) {
    return <div className="p-8 text-center text-xs font-mono text-slate-500">Loading cost telemetry...</div>;
  }

  const routes = [
    { role: 'Planner', model: 'strong-reasoning', purpose: 'Intent understanding, step decomposition, skill & tool selection' },
    { role: 'Worker', model: 'balanced', purpose: 'MCP execution, iterative tool calls, artifact synthesis' },
    { role: 'Reviewer', model: 'independent-reviewer', purpose: 'Adversarial output verification, hallucination checks, safety validation' },
    { role: 'Evaluator', model: 'deterministic + judge', purpose: 'Automated suite checks, metric correctness, subjective scoring' },
  ];

  return (
    <div className="space-y-6">
      {/* Model Routing Architecture */}
      <div className="p-5 rounded-lg bg-[#0e1526] border border-slate-800 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-semibold text-white">Configurable Multi-Model Routing</h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Different roles leverage specialized models via configuration rather than vendor lock-in.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {routes.map((r) => (
            <div key={r.role} className="p-3.5 rounded-md bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">{r.role}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-sky-300 bg-sky-950/80 border border-sky-800">
                  {r.model}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{r.purpose}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quality vs Cost Table */}
      <div className="rounded-lg bg-[#0e1526] border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-white">Skill Cost & Quality ROI Matrix</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Enables model tier optimization per skill
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-2.5 px-4 font-mono">SKILL</th>
                <th className="py-2.5 px-4 text-right">TOTAL RUNS</th>
                <th className="py-2.5 px-4 text-right">TOTAL COST</th>
                <th className="py-2.5 px-4 text-right">AVG COST / RUN</th>
                <th className="py-2.5 px-4 text-right">TOTAL TOKENS</th>
                <th className="py-2.5 px-4 text-right">AVG EVAL SCORE</th>
                <th className="py-2.5 px-4 text-right">QUALITY / $ ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-xs">
              {costs.map((c: CostItem) => (
                <tr key={c.skill} className="hover:bg-slate-850/40">
                  <td className="py-2.5 px-4 text-sky-400 font-bold whitespace-nowrap">{c.skill}</td>
                  <td className="py-2.5 px-4 text-right">{c.runs}</td>
                  <td className="py-2.5 px-4 text-right">${c.total_cost.toFixed(4)}</td>
                  <td className="py-2.5 px-4 text-right text-emerald-400 font-semibold">${c.avg_cost.toFixed(4)}</td>
                  <td className="py-2.5 px-4 text-right text-slate-400">{c.tokens.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-white">
                    {c.avg_score !== null ? `${(c.avg_score * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right text-indigo-400 font-bold">
                    {c.quality_per_dollar !== null ? `${c.quality_per_dollar.toFixed(0)} pts/$` : '—'}
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

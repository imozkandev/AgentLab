'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, WorkerItem } from '@/lib/api';
import { Server, Cpu, HardDrive, ShieldCheck, Activity, RefreshCw } from 'lucide-react';

export default function InfrastructureView() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['infrastructure'],
    queryFn: () => api.getInfrastructure(),
    refetchInterval: 3000,
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-xs font-mono text-slate-500">Loading worker telemetry...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Telemetry Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[#0e1526] border border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono">ONLINE WORKERS</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {data.workers.filter((w) => w.status === 'online').length} / {data.workers.length}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Heartbeat interval: 5s</div>
        </div>

        <div className="p-4 rounded-lg bg-[#0e1526] border border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono">AVAILABLE ISOLATION RUNTIMES</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1 capitalize">
            {data.runtimes.join(', ')}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Docker container sandbox preferred</div>
        </div>

        <div className="p-4 rounded-lg bg-[#0e1526] border border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono">CURRENT QUEUE DEPTH</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{data.queue_depth}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Claimed by available workers</div>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="rounded-lg bg-[#0e1526] border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-5 py-3 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-semibold text-white">Distributed Agent Worker Nodes</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Local workstation & cloud VM instances
          </span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {data.workers.map((w: WorkerItem) => (
            <div key={w.hostname} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-850/40 transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-white">{w.label || w.hostname}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                    ONLINE
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    region: {w.region}
                  </span>
                  {w.mocked && (
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1 py-0.2 rounded border border-slate-800">
                      mock-node
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Platform: {w.platform} • Runtimes: {w.runtimes.join(', ')} • Active Agents: {w.agents}
                </div>
              </div>

              {/* CPU & Memory Gauges */}
              <div className="flex items-center gap-6 shrink-0 font-mono text-xs">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>CPU</span>
                    <span className="font-bold text-slate-200">{w.cpu.toFixed(0)}%</span>
                  </div>
                  <div className="w-28 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full ${w.cpu > 80 ? 'bg-rose-500' : w.cpu > 50 ? 'bg-amber-400' : 'bg-sky-400'}`}
                      style={{ width: `${Math.min(100, w.cpu)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>MEM</span>
                    <span className="font-bold text-slate-200">{w.memory.toFixed(0)}%</span>
                  </div>
                  <div className="w-28 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full ${w.memory > 80 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(100, w.memory)}%` }}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500">ACTIVE JOBS</div>
                  <div className="text-sm font-bold text-sky-400">{w.active_jobs}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

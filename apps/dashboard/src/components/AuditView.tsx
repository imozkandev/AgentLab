'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, AuditItem } from '@/lib/api';
import { FileText, ShieldCheck, User } from 'lucide-react';

export default function AuditView() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () => api.getAuditLogs(),
    refetchInterval: 3000,
  });

  if (isLoading || !logs) {
    return <div className="p-8 text-center text-xs font-mono text-slate-500">Loading audit log...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-[#0e1526] border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-semibold text-white">Immutable Security & Governance Audit Log</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Append-only record (no update/delete path)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-2.5 px-4 font-mono">TIMESTAMP</th>
                <th className="py-2.5 px-4">ACTOR</th>
                <th className="py-2.5 px-4">ACTION</th>
                <th className="py-2.5 px-4">TARGET</th>
                <th className="py-2.5 px-4">DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
              {logs.map((log: AuditItem) => (
                <tr key={log.id} className="hover:bg-slate-850/40">
                  <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-4 text-sky-400 font-semibold whitespace-nowrap">
                    {log.actor}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.action.includes('promot') ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' :
                      log.action.includes('denied') || log.action.includes('blocked') ? 'bg-rose-950/80 text-rose-300 border border-rose-800' :
                      log.action.includes('approval') ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                      'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-200 whitespace-nowrap">
                    {log.target || '—'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 max-w-md truncate">
                    {JSON.stringify(log.detail)}
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

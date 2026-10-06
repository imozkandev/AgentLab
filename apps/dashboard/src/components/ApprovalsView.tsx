'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApprovalItem } from '@/lib/api';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  User, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function ApprovalsView() {
  const queryClient = useQueryClient();

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => api.getApprovals(),
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) =>
      api.decideApproval(id, decision, 'lead-producer-ozkan'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
    onError: (err: any) => alert(`Decision failed: ${err.message}`),
  });

  if (isLoading || !approvals) {
    return <div className="p-8 text-center text-xs font-mono text-slate-500">Loading approval requests...</div>;
  }

  const pending = approvals.filter((a) => a.status === 'pending');
  const history = approvals.filter((a) => a.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Approvals Section */}
      <div className="rounded-lg bg-[#0e1526] border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-white">Pending Human-in-the-Loop Operations</h3>
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 font-mono">
              {pending.length}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Agents draft; human production approval required
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            No pending approval requests. All agent drafts have been reviewed.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {pending.map((item) => (
              <div key={item.id} className="p-5 space-y-4 hover:bg-slate-850/30 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-sky-400">{item.id}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700">
                      RISK: {item.risk}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Requested by: <strong className="text-slate-200">{item.agent}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="text-xs text-slate-200 bg-slate-950 p-3 rounded-md border border-slate-800 font-mono">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Proposed Change & Justification:</div>
                  <div className="text-slate-100 font-semibold">{item.summary}</div>
                  <div className="mt-2 text-[11px] text-slate-300">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(item.payload, null, 2)}</pre>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => decideMutation.mutate({ id: item.id, decision: 'reject' })}
                    disabled={decideMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 rounded transition cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject Change
                  </button>
                  <button
                    onClick={() => decideMutation.mutate({ id: item.id, decision: 'approve' })}
                    disabled={decideMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition cursor-pointer shadow-sm shadow-emerald-600/30"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve Operation
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Approvals Section */}
      <div className="rounded-lg bg-[#0e1526] border border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-[#090d16]">
          <h3 className="text-xs font-semibold text-white">Decision History & Audit Trail</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-2.5 px-4 font-mono">ID</th>
                <th className="py-2.5 px-4">TOOL</th>
                <th className="py-2.5 px-4">DECISION</th>
                <th className="py-2.5 px-4">DECIDED BY</th>
                <th className="py-2.5 px-4">SUMMARY</th>
                <th className="py-2.5 px-4 text-right">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-sky-400 font-medium">{h.id}</td>
                  <td className="py-2.5 px-4 text-slate-200">{h.tool}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      h.status === 'approved' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                    }`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-300">{h.decided_by || 'system'}</td>
                  <td className="py-2.5 px-4 truncate max-w-sm text-slate-400">{h.summary}</td>
                  <td className="py-2.5 px-4 text-right text-slate-500">
                    {h.decided_at ? new Date(h.decided_at).toLocaleTimeString() : '—'}
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

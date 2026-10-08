'use client';

import React from 'react';
import { 
  Activity, 
  Layers, 
  Terminal, 
  CheckCircle2, 
  ShieldAlert, 
  Cpu, 
  FileText, 
  BarChart3, 
  Play, 
  AlertTriangle,
  Server,
  BookOpen
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type TabType = 
  | 'overview' 
  | 'runs' 
  | 'skills' 
  | 'evals' 
  | 'mcp' 
  | 'approvals' 
  | 'failures' 
  | 'infrastructure' 
  | 'audit' 
  | 'costs'
  | 'guide';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenNewRunModal: () => void;
}

export default function Header({ activeTab, setActiveTab, onOpenNewRunModal }: HeaderProps) {
  const { data: approvals } = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => api.getApprovals('pending'),
    refetchInterval: 3000,
  });

  const pendingCount = approvals?.length || 0;

  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'runs', label: 'Runs & Traces', icon: <Terminal className="w-4 h-4" /> },
    { id: 'skills', label: 'Skills & Playground', icon: <Layers className="w-4 h-4" /> },
    { id: 'evals', label: 'Evaluations', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'mcp', label: 'MCP & Safety Lab', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'approvals', label: 'Approvals', icon: <AlertTriangle className="w-4 h-4" />, badge: pendingCount },
    { id: 'failures', label: 'Failure Analysis', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'infrastructure', label: 'Workers', icon: <Server className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Log', icon: <FileText className="w-4 h-4" /> },
    { id: 'costs', label: 'Cost & Routing', icon: <Cpu className="w-4 h-4" /> },
    { id: 'guide', label: 'Rehber & Docs', icon: <BookOpen className="w-4 h-4 text-sky-400" /> },
  ];

  return (
    <header className="border-b border-slate-800 bg-[#090d16]/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-sky-500/20">
              AF
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-base tracking-tight text-white">AgentForge</span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                v0.1.0 • GameOps
              </span>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Runtime: Docker Sandbox
            </div>

            <button
              id="new-run-button"
              onClick={onOpenNewRunModal}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 active:scale-[0.98] rounded-md transition shadow-sm shadow-sky-600/30 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Agent
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 overflow-x-auto py-1 scrollbar-none border-t border-slate-800/60">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 border border-slate-700/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

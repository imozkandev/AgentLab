'use client';

import React, { useState } from 'react';
import Header, { TabType } from '@/components/Header';
import NewRunModal from '@/components/NewRunModal';
import OverviewView from '@/components/OverviewView';
import RunsView from '@/components/RunsView';
import SkillsView from '@/components/SkillsView';
import EvalsView from '@/components/EvalsView';
import McpSafetyView from '@/components/McpSafetyView';
import ApprovalsView from '@/components/ApprovalsView';
import FailuresView from '@/components/FailuresView';
import InfrastructureView from '@/components/InfrastructureView';
import AuditView from '@/components/AuditView';
import CostsView from '@/components/CostsView';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState<boolean>(false);

  const handleSelectRun = (id: string | null) => {
    setSelectedRunId(id);
    if (id && activeTab !== 'runs') {
      setActiveTab('runs');
    }
  };

  const handleRunCreated = (runId: string) => {
    setActiveTab('runs');
    setSelectedRunId(runId);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Bar with Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewRunModal={() => setIsNewRunModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewView
            onSelectRun={handleSelectRun}
            onOpenNewRun={() => setIsNewRunModalOpen(true)}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'runs' && (
          <RunsView
            selectedRunId={selectedRunId}
            onSelectRun={setSelectedRunId}
            onOpenNewRun={() => setIsNewRunModalOpen(true)}
          />
        )}

        {activeTab === 'skills' && <SkillsView />}

        {activeTab === 'evals' && <EvalsView />}

        {activeTab === 'mcp' && <McpSafetyView />}

        {activeTab === 'approvals' && <ApprovalsView />}

        {activeTab === 'failures' && (
          <FailuresView onNavigateSkills={() => setActiveTab('skills')} />
        )}

        {activeTab === 'infrastructure' && <InfrastructureView />}

        {activeTab === 'audit' && <AuditView />}

        {activeTab === 'costs' && <CostsView />}
      </main>

      {/* New Run Modal */}
      <NewRunModal
        isOpen={isNewRunModalOpen}
        onClose={() => setIsNewRunModalOpen(false)}
        onRunCreated={handleRunCreated}
      />

      {/* Minimal Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] py-3 text-center text-xs font-mono text-slate-500">
        AgentForge v0.1.0 • Internal AI Infrastructure Platform • GameOps Enablement
      </footer>
    </div>
  );
}

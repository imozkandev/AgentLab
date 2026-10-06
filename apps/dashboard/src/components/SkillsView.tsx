'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, SkillItem, SkillDetail } from '@/lib/api';
import { 
  Layers, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowUpRight, 
  FileCode, 
  Save, 
  Sparkles, 
  TrendingUp,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function SkillsView() {
  const queryClient = useQueryClient();
  const [selectedSkillName, setSelectedSkillName] = useState<string>('analyze-game-metrics');
  const [selectedVersion, setSelectedVersion] = useState<string>('1.1.0');
  const [editorContent, setEditorContent] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);
  const [promoteStatus, setPromoteStatus] = useState<string | null>(null);

  // Load skills list
  const { data: skills, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => api.getSkills(),
  });

  // Load selected skill detail
  const { data: skillDetail, refetch: refetchSkill } = useQuery({
    queryKey: ['skill', selectedSkillName],
    queryFn: async () => {
      const data = await api.getSkill(selectedSkillName);
      // Initialize editor with current active content
      const activeVer = data.versions_detail.find((v) => v.version === selectedVersion) || data.versions_detail[0];
      if (activeVer) {
        setEditorContent(activeVer.content);
      }
      return data;
    },
    enabled: !!selectedSkillName,
  });

  const handleSelectSkill = (name: string) => {
    setSelectedSkillName(name);
    setComparisonResult(null);
    setPromoteStatus(null);
  };

  const handleSelectVersion = (v: string) => {
    setSelectedVersion(v);
    const verObj = skillDetail?.versions_detail.find((item) => item.version === v);
    if (verObj) {
      setEditorContent(verObj.content);
    }
    setComparisonResult(null);
  };

  // Mutations
  const draftMutation = useMutation({
    mutationFn: () => api.saveSkillDraft(selectedSkillName, editorContent),
    onSuccess: (res) => {
      refetchSkill();
      setSelectedVersion(res.version);
      alert(`Draft saved as version ${res.version}`);
    },
    onError: (err: any) => alert(`Error saving draft: ${err.message}`),
  });

  const evalMutation = useMutation({
    mutationFn: () => api.evaluateSkill(selectedSkillName, selectedVersion),
    onSuccess: (res) => {
      setComparisonResult(res);
      setPromoteStatus(null);
    },
    onError: (err: any) => alert(`Evaluation failed: ${err.message}`),
  });

  const promoteMutation = useMutation({
    mutationFn: () => api.promoteSkill(selectedSkillName, selectedVersion),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      refetchSkill();
      setPromoteStatus(`Successfully promoted ${res.promoted}!`);
    },
    onError: (err: any) => {
      setPromoteStatus(`Promotion Blocked: ${err.message}`);
    },
  });

  if (isLoading || !skills) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-xs font-mono text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin mr-2 text-sky-400" />
        Loading skills registry...
      </div>
    );
  }

  const selectedSkill = skills.find((s) => s.name === selectedSkillName) || skills[0];

  return (
    <div className="space-y-6">
      {/* Overview Cards of Registered Skills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {skills.map((s) => {
          const isSelected = s.name === selectedSkillName;
          return (
            <div
              key={s.name}
              onClick={() => handleSelectSkill(s.name)}
              className={`p-4 rounded-lg bg-[#0e1526] border transition cursor-pointer flex flex-col justify-between ${
                isSelected ? 'border-sky-500 ring-1 ring-sky-500/30' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-sky-400">{s.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    v{s.version}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                  {s.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px]">EVAL SCORE</span>
                  <div className="text-sm font-semibold text-emerald-400">
                    {s.eval_score !== null ? `${(s.eval_score * 100).toFixed(0)}%` : '—'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[10px]">REGRESSION SUITE</span>
                  <div className="text-xs text-slate-300">{s.cases} cases</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Skill Playground & Testing Environment */}
      <div className="p-5 rounded-lg bg-[#0b101e] border border-slate-800 shadow-xl space-y-4">
        {/* Playground Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Skill Playground & Regression Laboratory</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Edit instructions in <code className="font-mono text-sky-300">SKILL.md</code>, test against evaluation suites, and verify promotion guardrails.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Version dropdown */}
            <select
              value={selectedVersion}
              onChange={(e) => handleSelectVersion(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            >
              {skillDetail?.versions_detail.map((v) => (
                <option key={v.version} value={v.version}>
                  v{v.version} ({v.status}) {v.eval_score ? `— ${(v.eval_score * 100).toFixed(0)}%` : ''}
                </option>
              ))}
            </select>

            <button
              onClick={() => draftMutation.mutate()}
              disabled={draftMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>

            <button
              onClick={() => evalMutation.mutate()}
              disabled={evalMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded transition cursor-pointer shadow-sm shadow-sky-600/30"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {evalMutation.isPending ? 'Testing...' : 'Compare vs Active'}
            </button>
          </div>
        </div>

        {/* Editor & Comparison Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Code / Markdown Editor */}
          <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-800 bg-[#070b14] flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                skills/{selectedSkillName}/SKILL.md
              </span>
              <span>Markdown + YAML Frontmatter</span>
            </div>
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              rows={22}
              className="w-full p-3 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-sky-500/30"
            />
          </div>

          {/* Right: Evaluation Matrix & Regression Comparison */}
          <div className="flex flex-col space-y-4">
            {comparisonResult ? (
              <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">Suite Comparison Matrix</h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      Comparing v{comparisonResult.previous.version} (Active) vs v{comparisonResult.candidate.version} (Candidate)
                    </span>
                  </div>

                  <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                    comparisonResult.delta >= 0 ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-800' : 'text-rose-300 bg-rose-950/80 border border-rose-800'
                  }`}>
                    Δ {(comparisonResult.delta * 100).toFixed(1)} pp
                  </div>
                </div>

                {/* Score Cards Grid */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500">ACTIVE (v{comparisonResult.previous.version})</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {(comparisonResult.previous.score * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">
                      {comparisonResult.previous.passed} passed / {comparisonResult.previous.failed} failed
                    </div>
                  </div>

                  <div className="p-3 rounded bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500">CANDIDATE (v{comparisonResult.candidate.version})</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {(comparisonResult.candidate.score * 100).toFixed(1)}%
                    </div>
                    <div className={`text-[10px] mt-0.5 ${comparisonResult.candidate.failed > 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400'}`}>
                      {comparisonResult.candidate.passed} passed / {comparisonResult.candidate.failed} failed
                    </div>
                  </div>
                </div>

                {/* Safety & Regressions Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px]">
                    <span className="text-slate-400">Critical Safety Gate:</span>
                    <span className={comparisonResult.candidate.safety_ok ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {comparisonResult.candidate.safety_ok ? 'PASS' : 'FAIL (UNSAFE PUBLISH)'}
                    </span>
                  </div>

                  {comparisonResult.regressions && comparisonResult.regressions.length > 0 && (
                    <div className="p-3 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300">
                      <div className="font-semibold flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Regression Detected ({comparisonResult.regressions.length} tests failed):
                      </div>
                      <ul className="mt-1 font-mono text-[11px] list-disc list-inside">
                        {comparisonResult.regressions.map((t: string) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {comparisonResult.fixed && comparisonResult.fixed.length > 0 && (
                    <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] font-mono">
                      ✓ Resolved {comparisonResult.fixed.length} previous failure(s): {comparisonResult.fixed.join(', ')}
                    </div>
                  )}
                </div>

                {/* Promotion Action */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-[11px] font-mono">
                    {comparisonResult.promotable ? (
                      <span className="text-emerald-400 font-semibold">✓ Ready to promote</span>
                    ) : (
                      <span className="text-rose-400 font-semibold">⛔ Promotion Blocked</span>
                    )}
                  </div>

                  <button
                    onClick={() => promoteMutation.mutate()}
                    disabled={!comparisonResult.promotable || promoteMutation.isPending}
                    className="px-4 py-1.5 text-xs font-semibold rounded text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    Promote Candidate to Active
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-lg bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
                <h4 className="text-xs font-semibold text-slate-300">No Active Evaluation Run</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                  Click &quot;Compare vs Active&quot; to run the automated regression test suite across all scenarios for this skill.
                </p>
              </div>
            )}

            {promoteStatus && (
              <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200">
                {promoteStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

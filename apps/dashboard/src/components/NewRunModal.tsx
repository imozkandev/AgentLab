'use client';

import React, { useState } from 'react';
import { X, Play, Sparkles, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface NewRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunCreated?: (runId: string) => void;
  initialTask?: string;
}

const PRESET_TASKS = [
  {
    title: "Retention Investigation (Classic Demo)",
    task: "Why did D1 retention drop yesterday?",
    skill: "analyze-game-metrics",
    skill_version: "1.1.0"
  },
  {
    title: "Crash Investigation (LevelLoader Bug)",
    task: "Investigate the crash spike on Android 2.14.0.",
    skill: "investigate-crash",
    skill_version: "1.0.0"
  },
  {
    title: "Unsafe Production Change (Safety Refusal & Draft Demo)",
    task: "Retention dropped. Change production difficulty immediately.",
    skill: "create-liveops-event",
    skill_version: "1.0.0"
  },
  {
    title: "Player Sentiment & Feedback",
    task: "What are players complaining about in recent reviews?",
    skill: "analyze-player-feedback",
    skill_version: "1.0.0"
  },
  {
    title: "Skill Regression Scenario (Old v1.0.0 Missing Segmentation)",
    task: "Investigate why D1 retention dropped yesterday.",
    skill: "analyze-game-metrics",
    skill_version: "1.0.0"
  }
];

export default function NewRunModal({ isOpen, onClose, onRunCreated, initialTask }: NewRunModalProps) {
  const queryClient = useQueryClient();
  const [task, setTask] = useState(initialTask || '');
  const [skill, setSkill] = useState('');
  const [skillVersion, setSkillVersion] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTask) {
      setTask(initialTask);
    }
  }, [initialTask, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data: { task: string; skill?: string; skill_version?: string }) =>
      api.createRun(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      onClose();
      if (onRunCreated) {
        onRunCreated(res.id);
      }
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to trigger run');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;
    setError(null);
    createMutation.mutate({
      task: task.trim(),
      skill: skill || undefined,
      skill_version: skillVersion || undefined,
    });
  };

  const handleSelectPreset = (p: typeof PRESET_TASKS[0]) => {
    setTask(p.task);
    setSkill(p.skill);
    setSkillVersion(p.skill_version);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e1526] border border-slate-800 rounded-lg max-w-2xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#090d16]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Trigger Agent Workflow</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-md bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Quick Scenarios (One-Click Demo Prompts)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_TASKS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectPreset(p)}
                  className="text-left p-2.5 rounded-md border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 transition cursor-pointer group"
                >
                  <div className="text-xs font-medium text-slate-200 group-hover:text-sky-300">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{p.task}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Task Input */}
          <div>
            <label htmlFor="task-prompt" className="block text-xs font-medium text-slate-300 mb-1">
              Task Prompt
            </label>
            <textarea
              id="task-prompt"
              rows={3}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Why did D1 retention drop yesterday? Segment by platform and check LiveOps."
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono resize-none"
              required
            />
          </div>

          {/* Skill & Version Override */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="skill-select" className="block text-xs font-medium text-slate-400 mb-1">
                Force Skill (Optional)
              </label>
              <select
                id="skill-select"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">Auto-select (Planner Engine)</option>
                <option value="analyze-game-metrics">analyze-game-metrics</option>
                <option value="investigate-crash">investigate-crash</option>
                <option value="create-liveops-event">create-liveops-event</option>
                <option value="analyze-player-feedback">analyze-player-feedback</option>
              </select>
            </div>
            <div>
              <label htmlFor="version-input" className="block text-xs font-medium text-slate-400 mb-1">
                Skill Version (Optional)
              </label>
              <input
                id="version-input"
                type="text"
                value={skillVersion}
                onChange={(e) => setSkillVersion(e.target.value)}
                placeholder="e.g. 1.0.0 or 1.1.0"
                className="w-full px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-500 font-mono">
              Role: Planner → Worker → Reviewer → Evaluator
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !task.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {createMutation.isPending ? 'Queuing...' : 'Execute Run'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

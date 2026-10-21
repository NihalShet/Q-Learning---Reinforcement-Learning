/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Sparkles } from 'lucide-react';

export type ActiveTab = 'simulation' | 'rl_models' | 'benchmark' | 'copilot' | 'video_animator';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onTurboTrain: () => void;
  isTrainingTurbo: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onTurboTrain,
  isTrainingTurbo,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#simulation"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('simulation');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap hover:text-cyan-400 transition-colors"
        >
          Q-Traffic Studio
        </a>
      </div>

      {/* Zone 2: 5 single-line nav links */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          onClick={() => onSelectTab('simulation')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'simulation'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
              : 'text-slate-400'
          }`}
        >
          Simulation Canvas
        </button>
        <button
          onClick={() => onSelectTab('rl_models')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'rl_models'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
              : 'text-slate-400'
          }`}
        >
          RL Architecture
        </button>
        <button
          onClick={() => onSelectTab('benchmark')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'benchmark'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
              : 'text-slate-400'
          }`}
        >
          Benchmark Lab
        </button>
        <button
          onClick={() => onSelectTab('copilot')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'copilot'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
              : 'text-slate-400'
          }`}
        >
          AI Copilot &amp; Search
        </button>
        <button
          onClick={() => onSelectTab('video_animator')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'video_animator'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
              : 'text-slate-400'
          }`}
        >
          Video Animator
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onTurboTrain}
          disabled={isTrainingTurbo}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
        >
          {isTrainingTurbo ? (
            <>
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Training 50 Episodes...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Turbo Train RL</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ShieldAlert,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ControllerMode, RLHyperparameters, TrafficFlowConfig } from '../simulation/types';
import { PRESET_SCENARIOS } from '../simulation/trafficGenerator';

interface ControlDeckProps {
  currentMode: ControllerMode;
  onSelectMode: (mode: ControllerMode) => void;
  speed: number;
  onSelectSpeed: (speed: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  selectedScenarioKey: string;
  onSelectScenario: (key: string) => void;
  onDispatchEmergency: () => void;
  hyperparams: RLHyperparameters;
  onUpdateHyperparams: (params: Partial<RLHyperparameters>) => void;
  onResetModel: () => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  currentMode,
  onSelectMode,
  speed,
  onSelectSpeed,
  isPaused,
  onTogglePause,
  onReset,
  selectedScenarioKey,
  onSelectScenario,
  onDispatchEmergency,
  hyperparams,
  onUpdateHyperparams,
  onResetModel,
}) => {
  const [showHyperparams, setShowHyperparams] = useState(false);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
      {/* Row 1: Controller Selection & Primary Playback Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Controller Selector Segmented Bar */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/70 border border-slate-800 rounded-lg">
          <button
            onClick={() => onSelectMode('fixed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              currentMode === 'fixed'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fixed-Time (25s)
          </button>
          <button
            onClick={() => onSelectMode('actuated')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              currentMode === 'actuated'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Actuated Heuristic
          </button>
          <button
            onClick={() => onSelectMode('q_learning')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              currentMode === 'q_learning'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-cyan-400 hover:text-cyan-300'
            }`}
          >
            Tabular Q-Learning
          </button>
          <button
            onClick={() => onSelectMode('dqn')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              currentMode === 'dqn'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-sky-400 hover:text-sky-300'
            }`}
          >
            Deep Q-Network (DQN)
          </button>
        </div>

        {/* Playback Controls & Speed */}
        <div className="flex items-center gap-2">
          {/* Pause / Play */}
          <button
            onClick={onTogglePause}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isPaused
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Reset simulation state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Speed Buttons */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
            {[1, 2, 5, 20].map((s) => (
              <button
                key={s}
                onClick={() => onSelectSpeed(s)}
                className={`px-2 py-1 text-[11px] font-mono rounded transition-colors cursor-pointer ${
                  speed === s
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Traffic Scenarios & Emergency Dispatcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Scenario:</span>
          <select
            value={selectedScenarioKey}
            onChange={(e) => onSelectScenario(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {Object.entries(PRESET_SCENARIOS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400 hidden xl:inline">
            {PRESET_SCENARIOS[selectedScenarioKey]?.description}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Dispatch Ambulance Button */}
          <button
            onClick={onDispatchEmergency}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-700/50 hover:bg-rose-900/60 rounded-lg transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Dispatch Ambulance</span>
          </button>

          {/* Hyperparameters Toggle */}
          <button
            onClick={() => setShowHyperparams(!showHyperparams)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Hyperparameters</span>
            {showHyperparams ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>
        </div>
      </div>

      {/* Row 3: Collapsible Hyperparameter Tuning Panel */}
      {showHyperparams && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-4 pt-3 mt-2">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
            <span className="font-semibold text-slate-200">Reinforcement Learning Hyperparameters</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onResetModel}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                Reset Agent Weights
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Learning Rate (Alpha) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Learning Rate (α)</span>
                <span className="font-mono text-cyan-400">{hyperparams.learningRate.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.50"
                step="0.01"
                value={hyperparams.learningRate}
                onChange={(e) => onUpdateHyperparams({ learningRate: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Discount Factor (Gamma) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Discount Factor (γ)</span>
                <span className="font-mono text-cyan-400">{hyperparams.discountFactor.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.99"
                step="0.01"
                value={hyperparams.discountFactor}
                onChange={(e) => onUpdateHyperparams({ discountFactor: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Exploration (Epsilon) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Exploration (ε)</span>
                <span className="font-mono text-cyan-400">{(hyperparams.epsilon * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.50"
                step="0.01"
                value={hyperparams.epsilon}
                onChange={(e) => onUpdateHyperparams({ epsilon: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Queue Penalty Weight */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Queue Penalty</span>
                <span className="font-mono text-amber-400">{hyperparams.rewardWeights.queuePenalty.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={hyperparams.rewardWeights.queuePenalty}
                onChange={(e) =>
                  onUpdateHyperparams({
                    rewardWeights: {
                      ...hyperparams.rewardWeights,
                      queuePenalty: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Emergency Priority Weight */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Emergency Weight</span>
                <span className="font-mono text-rose-400">{hyperparams.rewardWeights.emergencyPenalty.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={hyperparams.rewardWeights.emergencyPenalty}
                onChange={(e) =>
                  onUpdateHyperparams({
                    rewardWeights: {
                      ...hyperparams.rewardWeights,
                      emergencyPenalty: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

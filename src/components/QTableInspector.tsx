/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Filter, BookOpen } from 'lucide-react';
import { QLearningAgent, QTableRecord } from '../rl/qlearning';

interface QTableInspectorProps {
  agent: QLearningAgent;
  currentStateStr: string;
}

export const QTableInspector: React.FC<QTableInspectorProps> = ({ agent, currentStateStr }) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [filterEmergencyOnly, setFilterEmergencyOnly] = useState(false);

  // Test state generator
  const [testNS, setTestNS] = useState(2);
  const [testEW, setTestEW] = useState(1);
  const [testAxis, setTestAxis] = useState(0);
  const [testTime, setTestTime] = useState(1);
  const [testEmergNS, setTestEmergNS] = useState(0);
  const [testEmergEW, setTestEmergEW] = useState(0);

  const testKey = `NS:${testNS}_EW:${testEW}_AXIS:${testAxis}_T:${testTime}_E:${testEmergNS}-${testEmergEW}`;
  const testQ = agent.getQValues(testKey);
  const testBest = testQ[0] >= testQ[1] ? 'KEEP PHASE (Extend Green)' : 'SWITCH PHASE (Trigger Yellow)';

  const records = agent.getTopRecords(100);

  const filteredRecords = records.filter(r => {
    if (filterEmergencyOnly && !r.state.includes('E:1') && !r.state.includes('-1')) return false;
    if (filterQuery && !r.state.toLowerCase().includes(filterQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Section: Theory & Interactive Bellman Equation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
          <BookOpen className="w-4 h-4" />
          <span>Bellman Optimality Equation & Value Iteration</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
          <div className="text-cyan-300 font-semibold mb-2">
            Q(s, a) ← Q(s, a) + α [ r + γ · maxₐ′ Q(s′, a′) - Q(s, a) ]
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-slate-400 text-[11px] pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-slate-300 font-semibold">Learning Rate (α):</span> {agent.hyperparams.learningRate}
            </div>
            <div>
              <span className="text-slate-300 font-semibold">Discount Factor (γ):</span> {agent.hyperparams.discountFactor}
            </div>
            <div>
              <span className="text-slate-300 font-semibold">Latest TD Error (δ):</span>{' '}
              <span className="text-amber-400">{agent.lastTDError.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-slate-300 font-semibold">Total Updates:</span> {agent.totalTrainingSteps} steps
            </div>
          </div>
        </div>

        {/* Current Active Simulation State Card */}
        <div className="bg-cyan-950/20 border border-cyan-800/40 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400">Current Simulation State: </span>
            <span className="font-mono font-semibold text-cyan-300">{currentStateStr}</span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span>
              Q(Keep): <span className="text-emerald-400 font-bold">{agent.getQValues(currentStateStr)[0].toFixed(2)}</span>
            </span>
            <span>
              Q(Switch): <span className="text-amber-400 font-bold">{agent.getQValues(currentStateStr)[1].toFixed(2)}</span>
            </span>
            <span className="text-slate-300">
              Optimal: <span className="text-white font-bold">{agent.getQValues(currentStateStr)[0] >= agent.getQValues(currentStateStr)[1] ? 'KEEP' : 'SWITCH'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Middle Section: Interactive State Simulator / Sandbox Query */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Interactive State Policy Tester</h3>
        <p className="text-xs text-slate-400">
          Dial custom queue densities and phase elapsed duration to evaluate what action the learned Q-table recommends.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">NS Queue Bucket</label>
            <select
              value={testNS}
              onChange={(e) => setTestNS(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
            >
              <option value={0}>0 (0-1 cars)</option>
              <option value={1}>1 (2-4 cars)</option>
              <option value={2}>2 (5-8 cars)</option>
              <option value={3}>3 (9+ cars)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">EW Queue Bucket</label>
            <select
              value={testEW}
              onChange={(e) => setTestEW(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
            >
              <option value={0}>0 (0-1 cars)</option>
              <option value={1}>1 (2-4 cars)</option>
              <option value={2}>2 (5-8 cars)</option>
              <option value={3}>3 (9+ cars)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Current Green</label>
            <select
              value={testAxis}
              onChange={(e) => setTestAxis(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
            >
              <option value={0}>NS Green (0)</option>
              <option value={1}>EW Green (1)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Elapsed Time</label>
            <select
              value={testTime}
              onChange={(e) => setTestTime(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
            >
              <option value={0}>Short (&lt;10s)</option>
              <option value={1}>Med (10-22s)</option>
              <option value={2}>Long (&gt;22s)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Ambulance NS</label>
            <select
              value={testEmergNS}
              onChange={(e) => setTestEmergNS(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
            >
              <option value={0}>None</option>
              <option value={1}>🚨 Siren Active</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Ambulance EW</label>
            <select
              value={testEmergEW}
              onChange={(e) => setTestEmergEW(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
            >
              <option value={0}>None</option>
              <option value={1}>🚨 Siren Active</option>
            </select>
          </div>
        </div>

        {/* Prediction Output Result */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs mt-3">
          <div>
            <span className="text-slate-400">Synthesized State:</span>{' '}
            <span className="font-mono font-semibold text-cyan-300">{testKey}</span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span>Q(Keep): <span className="text-emerald-400 font-bold">{testQ[0].toFixed(2)}</span></span>
            <span>Q(Switch): <span className="text-amber-400 font-bold">{testQ[1].toFixed(2)}</span></span>
            <span className="text-slate-300">
              Policy Action: <span className="text-cyan-400 font-bold">{testBest}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Q-Table Heatmap Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Learned Q-Table Records</h3>
            <span className="text-xs text-slate-400 font-mono">({agent.qTable.size} discrete states explored)</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter by state (e.g. NS:2)..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-48"
              />
            </div>

            {/* Emergency Toggle Filter */}
            <button
              onClick={() => setFilterEmergencyOnly(!filterEmergencyOnly)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                filterEmergencyOnly
                  ? 'bg-rose-950/80 border-rose-600 text-rose-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>Emergency Cases</span>
            </button>
          </div>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto max-h-96 border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-2.5">State Representation</th>
                <th className="p-2.5">Visits</th>
                <th className="p-2.5">Q(Keep Phase)</th>
                <th className="p-2.5">Q(Switch Phase)</th>
                <th className="p-2.5">Optimal Policy Action</th>
                <th className="p-2.5">Expected Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredRecords.map((r) => {
                const isCurrent = r.state === currentStateStr;
                const advantage = Math.abs(r.qKeep - r.qSwitch);
                const prefersKeep = r.qKeep >= r.qSwitch;

                return (
                  <tr
                    key={r.state}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isCurrent ? 'bg-cyan-950/40 border-l-2 border-l-cyan-400' : ''
                    }`}
                  >
                    <td className="p-2.5 text-slate-200">
                      <span>{r.state}</span>
                      {isCurrent && <span className="ml-2 text-[10px] text-cyan-400 uppercase">← Current</span>}
                    </td>
                    <td className="p-2.5 text-slate-400 tabular-nums">{r.visits}</td>
                    <td className={`p-2.5 tabular-nums ${prefersKeep ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                      {r.qKeep.toFixed(2)}
                    </td>
                    <td className={`p-2.5 tabular-nums ${!prefersKeep ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
                      {r.qSwitch.toFixed(2)}
                    </td>
                    <td className="p-2.5">
                      {prefersKeep ? (
                        <span className="text-emerald-400">● KEEP GREEN</span>
                      ) : (
                        <span className="text-amber-400">▲ SWITCH PHASE</span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-300 tabular-nums">+{advantage.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

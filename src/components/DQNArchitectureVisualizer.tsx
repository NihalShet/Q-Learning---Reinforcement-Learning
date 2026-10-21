/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cpu, Database, RefreshCw, Activity } from 'lucide-react';
import { DeepQAgent } from '../rl/dqn';

interface DQNVisualizerProps {
  agent: DeepQAgent;
  currentInputs: number[];
}

export const DQNArchitectureVisualizer: React.FC<DQNVisualizerProps> = ({
  agent,
  currentInputs,
}) => {
  const acts = agent.latestActivations;
  const inputLabels = [
    'Queue N',
    'Queue S',
    'Queue E',
    'Queue W',
    'Delay N',
    'Delay S',
    'Delay E',
    'Delay W',
    'Active Phase',
    'Phase Elapsed',
    'Emerg NS',
    'Emerg EW',
  ];

  const qValues = acts ? acts.outputs : [0, 0];
  const preferredAction = qValues[0] >= qValues[1] ? 'KEEP PHASE (0)' : 'SWITCH PHASE (1)';

  // SVG dimensions
  const svgW = 720;
  const svgH = 340;

  // Layer column coordinates
  const xInput = 80;
  const xHidden1 = 280;
  const xHidden2 = 480;
  const xOutput = 640;

  // Sample nodes to display for hidden layers (show 10 representative nodes for H1 and 8 for H2)
  const h1SampleIndices = [0, 3, 6, 9, 12, 16, 20, 24, 28, 31];
  const h2SampleIndices = [0, 2, 4, 6, 8, 10, 12, 15];

  return (
    <div className="space-y-6">
      {/* Top Telemetry & Replay Buffer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Architecture</span>
          </div>
          <div className="text-base font-bold font-mono text-white">
            12 → 32 → 16 → 2
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>Layers:</span> 2 Hidden (ReLU) + Linear Out
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>Experience Replay</span>
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-white">
            {agent.replayBuffer.length} <span className="text-xs font-normal text-slate-400">/ {agent.bufferCapacity}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>Mini-batch:</span> 32 transitions
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            <span>Current Batch Loss</span>
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-white">
            {agent.lastLoss.toFixed(4)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>Criterion:</span> Huber / MSE loss
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target Network Sync</span>
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-white">
            Every {agent.targetUpdatePeriod} steps
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>Total Steps:</span> {agent.stepCount}
          </div>
        </div>
      </div>

      {/* Main Interactive Neural Network Diagram */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Deep Q-Network Layer Activations</h3>
            <span className="text-xs text-slate-400 font-mono">Live feedforward tensor flow</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span>
              Q(Keep): <span className="text-emerald-400 font-bold">{qValues[0].toFixed(2)}</span>
            </span>
            <span>
              Q(Switch): <span className="text-amber-400 font-bold">{qValues[1].toFixed(2)}</span>
            </span>
            <span className="text-slate-300">
              ArgMax:{' '}
              <span className="text-cyan-400 font-bold">{preferredAction}</span>
            </span>
          </div>
        </div>

        {/* SVG Network Visualizer */}
        <div className="w-full overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl p-3">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-80 min-w-[640px]">
            {/* Layer Column Titles */}
            <text x={xInput} y={20} textAnchor="middle" className="text-[11px] fill-slate-400 font-mono font-semibold">
              Inputs (12)
            </text>
            <text x={xHidden1} y={20} textAnchor="middle" className="text-[11px] fill-slate-400 font-mono font-semibold">
              Dense 1 (32 ReLU)
            </text>
            <text x={xHidden2} y={20} textAnchor="middle" className="text-[11px] fill-slate-400 font-mono font-semibold">
              Dense 2 (16 ReLU)
            </text>
            <text x={xOutput} y={20} textAnchor="middle" className="text-[11px] fill-slate-400 font-mono font-semibold">
              Q-Values (2)
            </text>

            {/* Synaptic Connection Lines between sample nodes */}
            <g opacity={0.12} stroke="#38bdf8" strokeWidth={1}>
              {inputLabels.map((_, i) => {
                const y1 = 40 + i * 24;
                return h1SampleIndices.map((_, j) => {
                  const y2 = 45 + j * 26;
                  return <line key={`in-${i}-${j}`} x1={xInput} y1={y1} x2={xHidden1} y2={y2} />;
                });
              })}
              {h1SampleIndices.map((_, i) => {
                const y1 = 45 + i * 26;
                return h2SampleIndices.map((_, j) => {
                  const y2 = 60 + j * 30;
                  return <line key={`h1-h2-${i}-${j}`} x1={xHidden1} y1={y1} x2={xHidden2} y2={y2} />;
                });
              })}
              {h2SampleIndices.map((_, i) => {
                const y1 = 60 + i * 30;
                return [0, 1].map((outIdx) => {
                  const y2 = 120 + outIdx * 80;
                  return <line key={`h2-out-${i}-${outIdx}`} x1={xHidden2} y1={y1} x2={xOutput} y2={y2} stroke="#06b6d4" strokeWidth={1.5} />;
                });
              })}
            </g>

            {/* 1. Input Layer Nodes */}
            {inputLabels.map((label, idx) => {
              const y = 40 + idx * 24;
              const val = currentInputs[idx] || 0;
              const intensity = Math.min(1, Math.max(0, val));
              const fillColor = `rgba(6, 182, 212, ${0.2 + intensity * 0.8})`;

              return (
                <g key={`inp-${idx}`}>
                  <circle cx={xInput} cy={y} r={7} fill={fillColor} stroke="#0891b2" strokeWidth={1.5} />
                  <text x={xInput - 14} y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                    {label}
                  </text>
                  <text x={xInput + 14} y={y + 3} textAnchor="start" className="text-[9px] fill-cyan-300 font-mono">
                    {val.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* 2. Hidden Layer 1 Nodes */}
            {h1SampleIndices.map((neuronIdx, idx) => {
              const y = 45 + idx * 26;
              const val = acts?.hidden1[neuronIdx] || 0;
              const intensity = Math.min(1, val / 2.0);
              const fillColor = `rgba(56, 189, 248, ${0.15 + intensity * 0.85})`;

              return (
                <g key={`h1-${idx}`}>
                  <circle cx={xHidden1} cy={y} r={8} fill={fillColor} stroke="#0284c7" strokeWidth={1.5} />
                  <text x={xHidden1 + 14} y={y + 3} textAnchor="start" className="text-[9px] fill-slate-400 font-mono">
                    h₁[{neuronIdx}]={val.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* 3. Hidden Layer 2 Nodes */}
            {h2SampleIndices.map((neuronIdx, idx) => {
              const y = 60 + idx * 30;
              const val = acts?.hidden2[neuronIdx] || 0;
              const intensity = Math.min(1, val / 2.0);
              const fillColor = `rgba(168, 85, 247, ${0.15 + intensity * 0.85})`;

              return (
                <g key={`h2-${idx}`}>
                  <circle cx={xHidden2} cy={y} r={9} fill={fillColor} stroke="#9333ea" strokeWidth={1.5} />
                  <text x={xHidden2 + 15} y={y + 3} textAnchor="start" className="text-[9px] fill-slate-400 font-mono">
                    h₂[{neuronIdx}]={val.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* 4. Output Layer Nodes */}
            {/* Output 0: Keep Phase */}
            <g>
              <circle
                cx={xOutput}
                cy={120}
                r={16}
                fill={qValues[0] >= qValues[1] ? 'rgba(16, 185, 129, 0.4)' : 'rgba(51, 65, 85, 0.4)'}
                stroke={qValues[0] >= qValues[1] ? '#10b981' : '#64748b'}
                strokeWidth={2.5}
              />
              <text x={xOutput} y={124} textAnchor="middle" className="text-[11px] fill-white font-mono font-bold">
                Q₀
              </text>
              <text x={xOutput + 24} y={116} className="text-[11px] fill-emerald-400 font-mono font-semibold">
                Keep Phase
              </text>
              <text x={xOutput + 24} y={130} className="text-[10px] fill-slate-300 font-mono">
                {qValues[0].toFixed(3)}
              </text>
            </g>

            {/* Output 1: Switch Phase */}
            <g>
              <circle
                cx={xOutput}
                cy={200}
                r={16}
                fill={qValues[1] > qValues[0] ? 'rgba(245, 158, 11, 0.4)' : 'rgba(51, 65, 85, 0.4)'}
                stroke={qValues[1] > qValues[0] ? '#f59e0b' : '#64748b'}
                strokeWidth={2.5}
              />
              <text x={xOutput} y={204} textAnchor="middle" className="text-[11px] fill-white font-mono font-bold">
                Q₁
              </text>
              <text x={xOutput + 24} y={196} className="text-[11px] fill-amber-400 font-mono font-semibold">
                Switch Phase
              </text>
              <text x={xOutput + 24} y={210} className="text-[10px] fill-slate-300 font-mono">
                {qValues[1].toFixed(3)}
              </text>
            </g>
          </svg>
        </div>

        {/* Deep Reinforcement Learning Mechanism Explainer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 bg-slate-950 p-4 border border-slate-800 rounded-lg">
          <div>
            <div className="text-cyan-400 font-semibold mb-1">Why Deep Q-Networks for Traffic?</div>
            <p className="text-slate-400 leading-relaxed">
              Standard tabular Q-learning requires discrete buckets and suffers from the curse of dimensionality
              as queue combinations expand. DQN approximates continuous state mappings directly into predicted
              discounted rewards without binning quantization errors.
            </p>
          </div>
          <div>
            <div className="text-cyan-400 font-semibold mb-1">Stability Innovations: Replay & Target Net</div>
            <p className="text-slate-400 leading-relaxed">
              Traffic arrival states are sequentially correlated. The 2,000-sample experience replay buffer breaks
              temporal correlations by uniformly sampling randomized mini-batches, while the separate frozen target network
              prevents value iteration oscillations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

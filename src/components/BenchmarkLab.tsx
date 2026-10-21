/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Download, CheckCircle, BarChart3, Clock, Car, ShieldAlert, Leaf } from 'lucide-react';
import { BenchmarkResult, TrafficFlowConfig } from '../simulation/types';
import { runBenchmarkExperiment, generateCSVReport } from '../simulation/benchmarkRunner';
import { PRESET_SCENARIOS } from '../simulation/trafficGenerator';
import { QLearningController, DQNController } from '../rl/controllers';

interface BenchmarkLabProps {
  qController: QLearningController;
  dqnController: DQNController;
}

export const BenchmarkLab: React.FC<BenchmarkLabProps> = ({
  qController,
  dqnController,
}) => {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState('asymmetricRush');
  const [durationSec, setDurationSec] = useState(90);
  const [seed, setSeed] = useState(42);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentControllerName, setCurrentControllerName] = useState('');
  const [results, setResults] = useState<BenchmarkResult[] | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults(null);

    const scenario = PRESET_SCENARIOS[selectedScenarioKey];
    try {
      const benchmarkResults = await runBenchmarkExperiment(
        scenario.config,
        durationSec,
        seed,
        qController,
        dqnController,
        (pct, name) => {
          setProgress(pct);
          setCurrentControllerName(name);
        }
      );
      setResults(benchmarkResults);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!results) return;
    const csv = generateCSVReport(results);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `traffic_rl_benchmark_seed_${seed}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find fixed baseline result to calculate percentage improvements
  const fixedBaseline = results?.find(r => r.controller === 'fixed');

  return (
    <div className="space-y-6">
      {/* Benchmark Setup Deck */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <span>Controlled Head-to-Head Benchmark Laboratory</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Tests Fixed-Time, Actuated Heuristic, Tabular Q-Learning, and Deep Q-Network on an identical pseudo-random traffic seed.
            </p>
          </div>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 disabled:opacity-50 transition-colors whitespace-nowrap shadow-sm cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isRunning ? 'Running Experiment...' : 'Run Benchmark Experiment'}</span>
          </button>
        </div>

        {/* Experiment Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Traffic Demand Scenario</label>
            <select
              value={selectedScenarioKey}
              onChange={(e) => setSelectedScenarioKey(e.target.value)}
              disabled={isRunning}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
            >
              {Object.entries(PRESET_SCENARIOS).map(([k, item]) => (
                <option key={k} value={k}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Simulation Duration</label>
            <select
              value={durationSec}
              onChange={(e) => setDurationSec(parseInt(e.target.value))}
              disabled={isRunning}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
            >
              <option value={60}>60 Simulated Seconds (Fast)</option>
              <option value={90}>90 Simulated Seconds (Standard)</option>
              <option value={150}>150 Simulated Seconds (Extended)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Random Seed (Seed synchronization)</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || 1)}
              disabled={isRunning}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
            />
          </div>
        </div>

        {/* Active Progress Bar */}
        {isRunning && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>Evaluating: <strong className="text-cyan-400">{currentControllerName}</strong></span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results Dashboard */}
      {results && (
        <div className="space-y-6">
          {/* Action Row & Download */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>Experiment complete across 4 control architectures</span>
            </div>

            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Benchmark CSV</span>
            </button>
          </div>

          {/* Controller Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {results.map((res) => {
              const isBest =
                res.avgWaitTime === Math.min(...results.map(r => r.avgWaitTime));
              const delayDiff = fixedBaseline ? fixedBaseline.avgWaitTime - res.avgWaitTime : 0;
              const delayPct = fixedBaseline && fixedBaseline.avgWaitTime > 0
                ? Math.round((delayDiff / fixedBaseline.avgWaitTime) * 100)
                : 0;

              return (
                <div
                  key={res.controller}
                  className={`bg-slate-900/90 border rounded-xl p-4 space-y-3 relative ${
                    isBest ? 'border-cyan-500/70 shadow-lg shadow-cyan-950/20' : 'border-slate-800'
                  }`}
                >
                  {isBest && (
                    <div className="absolute top-3 right-3 text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 font-semibold">
                      ★ TOP PERFORMER
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-white">{res.controllerName}</h4>
                    <span className="text-[11px] text-slate-400 uppercase font-mono">
                      {res.controller.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg Wait Time:</span>
                      <span className="font-bold text-white tabular-nums">{res.avgWaitTime}s</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">vs Fixed Timer:</span>
                      <span className={`font-bold tabular-nums ${delayPct > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {delayPct > 0 ? `-${delayPct}%` : 'Baseline'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Vehicles Cleared:</span>
                      <span className="text-slate-200 tabular-nums">{res.totalDeparted} / {res.totalVehiclesSpawned}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Throughput:</span>
                      <span className="text-cyan-300 tabular-nums">{res.throughputPerMin} veh/min</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Queue Peak:</span>
                      <span className="text-amber-400 tabular-nums">{res.maxQueueLength} cars</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Ambulance Delay:</span>
                      <span className="text-rose-400 tabular-nums">{res.emergencyClearanceTime}s</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">CO₂ Footprint:</span>
                      <span className="text-slate-300 tabular-nums">{res.co2Grams} g</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparative Bar Chart Visualization */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white">Comparative Performance Metrics</h4>

            <div className="space-y-4 text-xs font-mono">
              {/* Avg Delay Bars */}
              <div>
                <div className="text-slate-400 mb-1 flex justify-between">
                  <span>Average Wait Time per Vehicle (Lower is Better)</span>
                  <span className="text-slate-500">Seconds</span>
                </div>
                <div className="space-y-2">
                  {results.map(r => {
                    const maxDelay = Math.max(...results.map(x => x.avgWaitTime), 1);
                    const widthPct = Math.max(12, (r.avgWaitTime / maxDelay) * 100);
                    const isLowest = r.avgWaitTime === Math.min(...results.map(x => x.avgWaitTime));

                    return (
                      <div key={`wait-${r.controller}`} className="flex items-center gap-3">
                        <span className="w-36 text-slate-300 truncate text-[11px]">{r.controllerName}</span>
                        <div className="flex-1 bg-slate-950 h-5 rounded overflow-hidden relative border border-slate-800">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isLowest ? 'bg-cyan-500' : 'bg-slate-700'
                            }`}
                            style={{ width: `${widthPct}%` }}
                          />
                          <span className="absolute right-2 top-0.5 text-[10px] text-white font-semibold">
                            {r.avgWaitTime}s
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Throughput Bars */}
              <div className="pt-3 border-t border-slate-800">
                <div className="text-slate-400 mb-1 flex justify-between">
                  <span>Intersection Throughput (Higher is Better)</span>
                  <span className="text-slate-500">Vehicles / Minute</span>
                </div>
                <div className="space-y-2">
                  {results.map(r => {
                    const maxThroughput = Math.max(...results.map(x => x.throughputPerMin), 1);
                    const widthPct = Math.max(12, (r.throughputPerMin / maxThroughput) * 100);
                    const isHighest = r.throughputPerMin === Math.max(...results.map(x => x.throughputPerMin));

                    return (
                      <div key={`thru-${r.controller}`} className="flex items-center gap-3">
                        <span className="w-36 text-slate-300 truncate text-[11px]">{r.controllerName}</span>
                        <div className="flex-1 bg-slate-950 h-5 rounded overflow-hidden relative border border-slate-800">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isHighest ? 'bg-emerald-500' : 'bg-slate-700'
                            }`}
                            style={{ width: `${widthPct}%` }}
                          />
                          <span className="absolute right-2 top-0.5 text-[10px] text-white font-semibold">
                            {r.throughputPerMin} vpm
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, Car, Activity, Leaf, ShieldAlert } from 'lucide-react';
import { SimulationStats, ControllerMode } from '../simulation/types';

interface TelemetryProps {
  stats: SimulationStats;
  currentMode: ControllerMode;
  currentAction: number;
  lastDecisionReason: string;
  epsilon: number;
  qValues?: [number, number];
}

export const TelemetryCards: React.FC<TelemetryProps> = ({
  stats,
  currentMode,
  currentAction,
  lastDecisionReason,
  epsilon,
  qValues,
}) => {
  // Estimated delay under uncoordinated fixed time baseline (~32.4s)
  const baselineDelay = 32.4;
  const delayDelta = baselineDelay - stats.avgWaitTime;
  const reductionPct = Math.max(0, Math.min(85, Math.round((delayDelta / baselineDelay) * 100)));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Average Wait Time */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Avg Wait Time</span>
        </div>
        <div className="text-xl font-bold font-mono tabular-nums text-white">
          {stats.avgWaitTime.toFixed(1)} <span className="text-xs font-normal text-slate-400">sec</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          <span>vs Fixed:</span> <span className="text-emerald-400 font-mono font-medium">-{reductionPct}%</span>
        </div>
      </div>

      {/* 2. Total Throughput */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <Car className="w-3.5 h-3.5 text-sky-400" />
          <span>Throughput</span>
        </div>
        <div className="text-xl font-bold font-mono tabular-nums text-white">
          {stats.throughputPerMin.toFixed(1)} <span className="text-xs font-normal text-slate-400">veh/min</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          <span>Total:</span> <span className="text-slate-200 font-mono">{stats.totalDeparted} cleared</span>
        </div>
      </div>

      {/* 3. Current Queue & Time of Day */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Queue</span>
          </div>
          {stats.timeOfDay?.isRushHour && (
            <span className="text-[10px] text-rose-400 font-mono font-semibold">RUSH HOUR</span>
          )}
        </div>
        <div className="text-xl font-bold font-mono tabular-nums text-white">
          {stats.currentQueueLength} <span className="text-xs font-normal text-slate-400">vehicles</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 truncate">
          <span>{stats.timeOfDay ? `${stats.timeOfDay.timeString} · ${stats.timeOfDay.trafficMultiplier.toFixed(1)}x demand` : `${stats.simulatedTimeSeconds.toFixed(0)}s elapsed`}</span>
        </div>
      </div>

      {/* 4. Carbon & Fuel Saved */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <Leaf className="w-3.5 h-3.5 text-emerald-400" />
          <span>Est. Emissions</span>
        </div>
        <div className="text-xl font-bold font-mono tabular-nums text-white">
          {(stats.co2GramsEstimated / 1000).toFixed(2)} <span className="text-xs font-normal text-slate-400">kg CO₂</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          <span>Fuel:</span> <span className="text-slate-200 font-mono">{stats.fuelLitersEstimated.toFixed(2)} L</span>
        </div>
      </div>

      {/* 5. Emergency Clearance */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Ambulance Delay</span>
        </div>
        <div className="text-xl font-bold font-mono tabular-nums text-white">
          {stats.emergencyAvgWaitTime.toFixed(1)} <span className="text-xs font-normal text-slate-400">sec</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          <span>Served:</span> <span className="text-slate-200 font-mono">{stats.totalEmergencyDeparted} units</span>
        </div>
      </div>

      {/* 6. Active Policy Decision */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Policy Action</span>
          <span className="text-[10px] font-mono text-cyan-400">ε={(epsilon * 100).toFixed(0)}%</span>
        </div>
        <div className="text-sm font-bold font-mono truncate text-white mt-1">
          {currentAction === 0 ? (
            <span className="text-emerald-400 font-semibold">● EXTEND GREEN</span>
          ) : (
            <span className="text-amber-400 font-semibold">▲ SWITCH PHASE</span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 mt-1 truncate" title={lastDecisionReason}>
          {qValues ? `Q: [${qValues[0].toFixed(1)}, ${qValues[1].toFixed(1)}]` : currentMode.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

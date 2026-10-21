/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sun,
  Moon,
  Sunset,
  Sunrise,
  Flame,
  Clock,
  Gauge,
  FastForward,
  Play,
  Pause,
  AlertTriangle,
} from 'lucide-react';
import { TimeOfDayState, PressureLevel } from '../simulation/types';

interface TimeOfDayControllerProps {
  timeOfDay: TimeOfDayState;
  onChangeHour: (hour: number) => void;
  onToggleCycleMode: () => void;
  onChangeCycleSpeed: (speedMinutesPerSec: number) => void;
  onTriggerSurge: () => void;
}

export const TimeOfDayController: React.FC<TimeOfDayControllerProps> = ({
  timeOfDay,
  onChangeHour,
  onToggleCycleMode,
  onChangeCycleSpeed,
  onTriggerSurge,
}) => {
  const {
    simulatedHour,
    timeString,
    periodName,
    trafficMultiplier,
    pressureLevel,
    isRushHour,
    isNight,
    mode,
    cycleSpeedMinutesPerSec,
    surgeActive,
    surgeRemainingSec,
  } = timeOfDay;

  // Icon based on time of day
  const getTimeIcon = () => {
    if (simulatedHour >= 5.0 && simulatedHour < 7.0) {
      return <Sunrise className="w-4 h-4 text-amber-300" />;
    } else if (simulatedHour >= 7.0 && simulatedHour < 17.5) {
      return <Sun className="w-4 h-4 text-amber-400" />;
    } else if (simulatedHour >= 17.5 && simulatedHour < 20.0) {
      return <Sunset className="w-4 h-4 text-orange-400" />;
    } else {
      return <Moon className="w-4 h-4 text-indigo-300" />;
    }
  };

  // Pressure color styling
  const getPressureBadgeClass = (level: PressureLevel) => {
    switch (level) {
      case 'Low':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
      case 'Moderate':
        return 'text-sky-400 bg-sky-950/60 border-sky-800/60';
      case 'Elevated':
        return 'text-amber-400 bg-amber-950/60 border-amber-800/60';
      case 'Rush Hour Peak':
        return 'text-rose-400 bg-rose-950/60 border-rose-800/60 font-bold';
      case 'Extreme Gridlock':
        return 'text-red-300 bg-red-950/80 border-red-600 font-bold animate-pulse';
    }
  };

  // Sample data points for the 24-hour mini curve
  // Curve: base 0.35 + morning peak 2.05 at 8.25 + evening peak 2.25 at 17.5 + midday 0.75 at 12.5
  const hours = Array.from({ length: 48 }, (_, i) => i * 0.5);
  const curvePoints = hours.map((h) => {
    const mExp = Math.exp(-Math.pow(h - 8.25, 2) / (2 * Math.pow(1.15, 2)));
    const eExp = Math.exp(-Math.pow(h - 17.5, 2) / (2 * Math.pow(1.25, 2)));
    const midExp = Math.exp(-Math.pow(h - 12.5, 2) / (2 * Math.pow(2.2, 2)));
    const val = 0.35 + 2.05 * mExp + 2.25 * eExp + 0.75 * midExp;
    return { h, val };
  });

  const chartW = 460;
  const chartH = 46;
  const maxVal = 3.6;

  const pathD = curvePoints.reduce((acc, pt, i) => {
    const x = (pt.h / 24) * chartW;
    const y = chartH - (pt.val / maxVal) * chartH;
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const needleX = (simulatedHour / 24) * chartW;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-md">
      {/* Row 1: Clock, Period, Multiplier & Pressure Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
            {getTimeIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold font-mono tabular-nums text-white">
                {timeString}
              </span>
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${getPressureBadgeClass(
                  pressureLevel
                )}`}
              >
                {pressureLevel}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>{periodName}</span>
              <span>·</span>
              <span className="text-cyan-400 font-mono font-semibold">
                {trafficMultiplier.toFixed(2)}x Traffic Volume
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls: Cycle mode, Speed, Surge */}
        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <button
            onClick={onToggleCycleMode}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
              mode === 'cycle'
                ? 'bg-cyan-950/80 border-cyan-600/60 text-cyan-300 font-semibold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle between automatic 24-hour cycle and manual time scrubbing"
          >
            <Clock className="w-3 h-3" />
            <span>{mode === 'cycle' ? 'Auto 24h Cycle' : 'Manual Time'}</span>
          </button>

          {/* Cycle Speed Options (when in cycle mode) */}
          {mode === 'cycle' && (
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono">
              {[3, 6, 15].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onChangeCycleSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    cycleSpeedMinutesPerSec === spd
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`${spd} simulated minutes per real second`}
                >
                  {spd}m/s
                </button>
              ))}
            </div>
          )}

          {/* Rush Hour Stress Surge Button */}
          <button
            onClick={onTriggerSurge}
            disabled={surgeActive}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
              surgeActive
                ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-950/50'
                : 'bg-rose-950/70 border-rose-700/60 text-rose-300 hover:bg-rose-900/80 hover:text-white'
            }`}
            title="Inject high-intensity 2x traffic surge to test how controllers adapt under sudden congestion"
          >
            <Flame className={`w-3.5 h-3.5 ${surgeActive ? 'animate-bounce' : ''}`} />
            <span>{surgeActive ? `Surge Active (${Math.ceil(surgeRemainingSec)}s)` : 'Rush Surge Test'}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Interactive Time Slider */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
          <span>00:00 (Midnight)</span>
          <span className="text-rose-400 font-semibold">08:15 AM (Morning Peak)</span>
          <span>12:00 PM (Noon)</span>
          <span className="text-amber-400 font-semibold">05:45 PM (Evening Peak)</span>
          <span>24:00</span>
        </div>
        <input
          type="range"
          min="0"
          max="23.95"
          step="0.05"
          value={simulatedHour}
          onChange={(e) => onChangeHour(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer border border-slate-800"
        />
      </div>

      {/* Row 3: 24-Hour Demand Profile Graph & Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
        {/* Mini 24-Hour Curve */}
        <div className="flex-1 min-w-[240px] max-w-sm">
          <div className="relative h-10 w-full overflow-hidden bg-slate-950 rounded border border-slate-800/80">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full">
              {/* Morning rush shade */}
              <rect x={(7.0 / 24) * chartW} y={0} width={(2.5 / 24) * chartW} height={chartH} fill="rgba(244, 63, 94, 0.12)" />
              {/* Evening rush shade */}
              <rect x={(16.5 / 24) * chartW} y={0} width={(3.0 / 24) * chartW} height={chartH} fill="rgba(245, 158, 11, 0.12)" />

              {/* Curve line */}
              <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth={1.8} />

              {/* Current Time Needle */}
              <line
                x1={needleX}
                y1={0}
                x2={needleX}
                y2={chartH}
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="2 1"
              />
            </svg>
            <div className="absolute top-1 left-1.5 text-[9px] text-slate-500 font-mono">
              24h Demand Curve
            </div>
          </div>
        </div>

        {/* Quick Period Jump Buttons */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 text-[10px]">Jump to:</span>
          <button
            onClick={() => onChangeHour(8.25)}
            className="px-2 py-0.5 bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:text-white rounded transition-colors cursor-pointer"
          >
            Morning Rush
          </button>
          <button
            onClick={() => onChangeHour(12.5)}
            className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
          >
            Midday
          </button>
          <button
            onClick={() => onChangeHour(17.75)}
            className="px-2 py-0.5 bg-amber-950/60 border border-amber-800/60 text-amber-300 hover:text-white rounded transition-colors cursor-pointer"
          >
            Evening Rush
          </button>
          <button
            onClick={() => onChangeHour(2.0)}
            className="px-2 py-0.5 bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 hover:text-white rounded transition-colors cursor-pointer"
          >
            Late Night
          </button>
        </div>
      </div>
    </div>
  );
};

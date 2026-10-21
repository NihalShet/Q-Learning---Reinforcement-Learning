/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TelemetryHistoryPoint } from '../simulation/types';

interface ChartsProps {
  history: TelemetryHistoryPoint[];
}

export const RealtimeCharts: React.FC<ChartsProps> = ({ history }) => {
  const [activeMetric, setActiveMetric] = useState<'wait' | 'queue' | 'reward' | 'throughput'>('wait');

  if (history.length < 2) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-center h-48 text-xs text-slate-500 font-mono">
        Collecting telemetry stream...
      </div>
    );
  }

  // Filter or downsample history if long
  const data = history.slice(-50); // Last 50 sample points

  // Chart metrics config
  const metricConfigs = {
    wait: {
      title: 'Average Vehicle Delay (sec)',
      unit: 's',
      color: '#06b6d4', // Cyan
      values: data.map(d => d.avgWaitTime),
    },
    queue: {
      title: 'Intersection Queue Length (vehicles)',
      unit: 'veh',
      color: '#f59e0b', // Amber
      values: data.map(d => d.queueLength),
    },
    reward: {
      title: 'Cumulative RL Reward Signal',
      unit: 'pts',
      color: '#10b981', // Emerald
      values: data.map(d => d.reward),
    },
    throughput: {
      title: 'Real-time Flow Rate (veh/min)',
      unit: 'vpm',
      color: '#38bdf8', // Sky
      values: data.map(d => d.throughput),
    },
  };

  const currentConfig = metricConfigs[activeMetric];
  const vals = currentConfig.values;
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const range = Math.max(1, maxVal - minVal);

  const width = 640;
  const height = 140;
  const paddingX = 40;
  const paddingY = 20;
  const plotW = width - paddingX * 2;
  const plotH = height - paddingY * 2;

  // Generate SVG path coordinates
  const points = vals.map((v, i) => {
    const x = paddingX + (i / (vals.length - 1)) * plotW;
    const y = height - paddingY - ((v - minVal) / range) * plotH;
    return { x, y, val: v, time: data[i].time };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const latestVal = vals[vals.length - 1];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
      {/* Header & Metric Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-200">{currentConfig.title}</span>
          <span className="text-sm font-bold font-mono text-cyan-400 tabular-nums">
            {latestVal.toFixed(1)} {currentConfig.unit}
          </span>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveMetric('wait')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeMetric === 'wait' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Wait Time
          </button>
          <button
            onClick={() => setActiveMetric('queue')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeMetric === 'queue' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Queue
          </button>
          <button
            onClick={() => setActiveMetric('reward')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeMetric === 'reward' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reward
          </button>
          <button
            onClick={() => setActiveMetric('throughput')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeMetric === 'throughput' ? 'bg-sky-500/20 text-sky-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Throughput
          </button>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-36 overflow-visible"
        >
          {/* Subtle Grid Lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="rgba(51, 65, 85, 0.3)"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="rgba(51, 65, 85, 0.3)"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="rgba(71, 85, 105, 0.5)"
          />

          {/* Y Axis Labels */}
          <text
            x={paddingX - 8}
            y={paddingY + 4}
            textAnchor="end"
            className="text-[9px] fill-slate-400 font-mono"
          >
            {maxVal.toFixed(0)}
          </text>
          <text
            x={paddingX - 8}
            y={height - paddingY}
            textAnchor="end"
            className="text-[9px] fill-slate-400 font-mono"
          >
            {minVal.toFixed(0)}
          </text>

          {/* Filled Area Gradient */}
          <defs>
            <linearGradient id={`gradient-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={currentConfig.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={currentConfig.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <path d={areaD} fill={`url(#gradient-${activeMetric})`} />

          {/* Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke={currentConfig.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Last Point Pulse Marker */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="4"
              fill={currentConfig.color}
              stroke="#090d16"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>T - {Math.round(data[data.length - 1].time - data[0].time)}s</span>
        <span>Live Sampling (dt = 0.5s)</span>
        <span>Now: T={Math.round(data[data.length - 1].time)}s</span>
      </div>
    </div>
  );
};

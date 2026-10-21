/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Direction, Vehicle, TimeOfDayState } from '../simulation/types';
import {
  TrafficIntersectionModel,
  ROAD_APPROACH_LENGTH,
  INTERSECTION_SIZE,
  STOP_LINE_POSITION,
  EXIT_START_POSITION,
} from '../simulation/trafficModel';

interface CanvasProps {
  model: TrafficIntersectionModel;
  onSpawnVehicle: (dir: Direction, laneIndex: number, isEmergency: boolean) => void;
  timeOfDay?: TimeOfDayState;
}

export const IntersectionCanvas: React.FC<CanvasProps> = ({ model, onSpawnVehicle, timeOfDay }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredVehicle, setHoveredVehicle] = useState<Vehicle | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      // Scale: meters to canvas pixels
      // Road approach is 140m, center is 32m. Total view ~ 220m
      const scale = Math.min(width, height) / 220;
      const laneWidthM = 4.2;
      const laneWidthPx = laneWidthM * scale;
      const roadHalfWidthPx = laneWidthPx * 2; // 2 lanes each direction = 4 lanes total

      const isNight = timeOfDay?.isNight ?? false;
      const hour = timeOfDay?.simulatedHour ?? 12;
      const isDusk = hour > 17.5 && hour < 20.0;
      const isDawn = hour >= 5.0 && hour < 7.0;

      // 1. Background Grass / Urban Surface with time-of-day ambient tone
      if (isNight) {
        ctx.fillStyle = '#060913'; // Midnight dark
      } else if (isDusk) {
        ctx.fillStyle = '#1c1012'; // Dusk warm brown/burgundy
      } else if (isDawn) {
        ctx.fillStyle = '#0a1628'; // Dawn cold cyan/blue
      } else {
        ctx.fillStyle = '#0b1320'; // Clean slate daylight
      }
      ctx.fillRect(0, 0, width, height);

      // Grass verge texture
      ctx.fillStyle = isNight ? '#0b1622' : isDusk ? '#1f151c' : '#0f1f2c';
      ctx.fillRect(0, 0, width, height);

      // 2. Asphalt Cross Roads
      // Adjust asphalt luminance based on time of day
      if (isNight) {
        ctx.fillStyle = '#111827'; // Dark night pavement
      } else if (isDusk) {
        ctx.fillStyle = '#261f2d'; // Twilight asphalt
      } else {
        ctx.fillStyle = '#1e293b'; // Slate asphalt
      }
      // North-South Corridor
      ctx.fillRect(cx - roadHalfWidthPx, 0, roadHalfWidthPx * 2, height);
      // East-West Corridor
      ctx.fillRect(0, cy - roadHalfWidthPx, width, roadHalfWidthPx * 2);

      // Road shoulder border lines
      ctx.strokeStyle = isNight ? '#1f2937' : '#334155';
      ctx.lineWidth = 2;
      // NS road borders
      ctx.beginPath();
      ctx.moveTo(cx - roadHalfWidthPx, 0);
      ctx.lineTo(cx - roadHalfWidthPx, cy - roadHalfWidthPx);
      ctx.moveTo(cx + roadHalfWidthPx, 0);
      ctx.lineTo(cx + roadHalfWidthPx, cy - roadHalfWidthPx);
      ctx.moveTo(cx - roadHalfWidthPx, cy + roadHalfWidthPx);
      ctx.lineTo(cx - roadHalfWidthPx, height);
      ctx.moveTo(cx + roadHalfWidthPx, cy + roadHalfWidthPx);
      ctx.lineTo(cx + roadHalfWidthPx, height);

      // EW road borders
      ctx.moveTo(0, cy - roadHalfWidthPx);
      ctx.lineTo(cx - roadHalfWidthPx, cy - roadHalfWidthPx);
      ctx.moveTo(0, cy + roadHalfWidthPx);
      ctx.lineTo(cx - roadHalfWidthPx, cy + roadHalfWidthPx);
      ctx.moveTo(cx + roadHalfWidthPx, cy - roadHalfWidthPx);
      ctx.lineTo(width, cy - roadHalfWidthPx);
      ctx.moveTo(cx + roadHalfWidthPx, cy + roadHalfWidthPx);
      ctx.lineTo(width, cy + roadHalfWidthPx);
      ctx.stroke();

      // 3. Center Double Yellow Lines & Dashed Lane Dividers
      // Center Yellow Dividers
      ctx.strokeStyle = '#eab308'; // Amber yellow
      ctx.lineWidth = 2;

      // North center
      ctx.beginPath();
      ctx.moveTo(cx - 2, 0);
      ctx.lineTo(cx - 2, cy - roadHalfWidthPx);
      ctx.moveTo(cx + 2, 0);
      ctx.lineTo(cx + 2, cy - roadHalfWidthPx);
      // South center
      ctx.moveTo(cx - 2, cy + roadHalfWidthPx);
      ctx.lineTo(cx - 2, height);
      ctx.moveTo(cx + 2, cy + roadHalfWidthPx);
      ctx.lineTo(cx + 2, height);
      // West center
      ctx.moveTo(0, cy - 2);
      ctx.lineTo(cx - roadHalfWidthPx, cy - 2);
      ctx.moveTo(0, cy + 2);
      ctx.lineTo(cx - roadHalfWidthPx, cy + 2);
      // East center
      ctx.moveTo(cx + roadHalfWidthPx, cy - 2);
      ctx.lineTo(width, cy - 2);
      ctx.moveTo(cx + roadHalfWidthPx, cy + 2);
      ctx.lineTo(width, cy + 2);
      ctx.stroke();

      // White Dashed Lane Dividers (separating lane 0 and lane 1)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);

      ctx.beginPath();
      // North lanes divider (Incoming: right of center)
      ctx.moveTo(cx + laneWidthPx, 0);
      ctx.lineTo(cx + laneWidthPx, cy - roadHalfWidthPx);
      // North outgoing divider
      ctx.moveTo(cx - laneWidthPx, 0);
      ctx.lineTo(cx - laneWidthPx, cy - roadHalfWidthPx);

      // South lanes divider (Incoming: left of center when looking from south)
      ctx.moveTo(cx - laneWidthPx, cy + roadHalfWidthPx);
      ctx.lineTo(cx - laneWidthPx, height);
      ctx.moveTo(cx + laneWidthPx, cy + roadHalfWidthPx);
      ctx.lineTo(cx + laneWidthPx, height);

      // West lanes divider
      ctx.moveTo(0, cy + laneWidthPx);
      ctx.lineTo(cx - roadHalfWidthPx, cy + laneWidthPx);
      ctx.moveTo(0, cy - laneWidthPx);
      ctx.lineTo(cx - roadHalfWidthPx, cy - laneWidthPx);

      // East lanes divider
      ctx.moveTo(cx + roadHalfWidthPx, cy - laneWidthPx);
      ctx.lineTo(width, cy - laneWidthPx);
      ctx.moveTo(cx + roadHalfWidthPx, cy + laneWidthPx);
      ctx.lineTo(width, cy + laneWidthPx);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // 4. Zebra Pedestrian Crosswalks
      drawZebraCrosswalk(ctx, cx - roadHalfWidthPx, cy - roadHalfWidthPx - 14, roadHalfWidthPx * 2, 10, true);
      drawZebraCrosswalk(ctx, cx - roadHalfWidthPx, cy + roadHalfWidthPx + 4, roadHalfWidthPx * 2, 10, true);
      drawZebraCrosswalk(ctx, cx - roadHalfWidthPx - 14, cy - roadHalfWidthPx, 10, roadHalfWidthPx * 2, false);
      drawZebraCrosswalk(ctx, cx + roadHalfWidthPx + 4, cy - roadHalfWidthPx, 10, roadHalfWidthPx * 2, false);

      // 5. White Stop Bars at Stop Line
      ctx.fillStyle = '#ffffff';
      // North stop bar (incoming lanes: cx to cx + roadHalfWidthPx)
      ctx.fillRect(cx, cy - roadHalfWidthPx, roadHalfWidthPx, 4);
      // South stop bar (incoming lanes: cx - roadHalfWidthPx to cx)
      ctx.fillRect(cx - roadHalfWidthPx, cy + roadHalfWidthPx - 4, roadHalfWidthPx, 4);
      // West stop bar (incoming lanes: cy to cy + roadHalfWidthPx)
      ctx.fillRect(cx - roadHalfWidthPx, cy, 4, roadHalfWidthPx);
      // East stop bar (incoming lanes: cy - roadHalfWidthPx to cy)
      ctx.fillRect(cx + roadHalfWidthPx - 4, cy - roadHalfWidthPx, 4, roadHalfWidthPx);

      // 6. Induction Loop Sensor Zones
      // Sensor zones 15m to 45m behind stop line
      const sensorDistPx = 25 * scale;
      const sensorLenPx = 18 * scale;
      const queues = model.getQueuesByDirection();

      // North sensor
      drawSensorZone(ctx, cx + 4, cy - roadHalfWidthPx - sensorDistPx, roadHalfWidthPx - 8, sensorLenPx, queues.NORTH > 0);
      // South sensor
      drawSensorZone(ctx, cx - roadHalfWidthPx + 4, cy + roadHalfWidthPx + sensorDistPx - sensorLenPx, roadHalfWidthPx - 8, sensorLenPx, queues.SOUTH > 0);
      // West sensor
      drawSensorZone(ctx, cx - roadHalfWidthPx - sensorDistPx, cy + 4, sensorLenPx, roadHalfWidthPx - 8, queues.WEST > 0);
      // East sensor
      drawSensorZone(ctx, cx + roadHalfWidthPx + sensorDistPx - sensorLenPx, cy - roadHalfWidthPx + 4, sensorLenPx, roadHalfWidthPx - 8, queues.EAST > 0);

      // 7. Direction Labels & Lane Guides
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('N', cx + 6, 20);
      ctx.fillText('S', cx - 14, height - 12);
      ctx.fillText('W', 14, cy + 18);
      ctx.fillText('E', width - 20, cy - 10);

      // 8. Render Vehicles
      const currentTime = performance.now() / 1000;
      let closestHover: Vehicle | null = null;
      let minHoverDist = 20;

      for (const v of model.vehicles) {
        const { x, y, angle } = computeVehicleCanvasPosition(v, cx, cy, scale, laneWidthPx, roadHalfWidthPx);

        // Check hover
        if (mousePos) {
          const d = Math.hypot(mousePos.x - x, mousePos.y - y);
          if (d < minHoverDist) {
            minHoverDist = d;
            closestHover = v;
          }
        }

        drawVehicle(ctx, v, x, y, angle, scale, currentTime, isNight || isDusk);
      }

      setHoveredVehicle(closestHover);

      // 8.5 Streetlight illumination at 4 intersection corners during night & dusk
      if (isNight || isDusk) {
        drawStreetLight(ctx, cx - roadHalfWidthPx - 10, cy - roadHalfWidthPx - 10, scale);
        drawStreetLight(ctx, cx + roadHalfWidthPx + 10, cy - roadHalfWidthPx - 10, scale);
        drawStreetLight(ctx, cx - roadHalfWidthPx - 10, cy + roadHalfWidthPx + 10, scale);
        drawStreetLight(ctx, cx + roadHalfWidthPx + 10, cy + roadHalfWidthPx + 10, scale);
      }

      // 9. Render Traffic Signals
      const signals = model.getSignals();
      // North Signal Post (Upper Right corner of intersection)
      drawSignalHead(ctx, cx + roadHalfWidthPx + 8, cy - roadHalfWidthPx - 24, signals.NORTH.straight, 'N');
      // South Signal Post (Lower Left corner)
      drawSignalHead(ctx, cx - roadHalfWidthPx - 30, cy + roadHalfWidthPx + 4, signals.SOUTH.straight, 'S');
      // West Signal Post (Lower Right corner)
      drawSignalHead(ctx, cx - roadHalfWidthPx - 24, cy - roadHalfWidthPx - 30, signals.WEST.straight, 'W');
      // East Signal Post (Upper Left corner)
      drawSignalHead(ctx, cx + roadHalfWidthPx + 4, cy + roadHalfWidthPx + 8, signals.EAST.straight, 'E');

      // 10. Active Phase Indicator Banner in Center
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath();
      ctx.roundRect(cx - 44, cy - 14, 88, 28, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.stroke();

      ctx.fillStyle = model.currentPhase === 0 || model.currentPhase === 2 ? '#34d399' : '#fbbf24';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const phaseName = model.currentPhase === 0 ? 'PHASE: NS' : model.currentPhase === 1 ? 'YEL: NS' : model.currentPhase === 2 ? 'PHASE: EW' : 'YEL: EW';
      ctx.fillText(phaseName, cx, cy + 3);

      // 11. Time of Day & Rush Hour Status Pill in Top Right
      if (timeOfDay) {
        ctx.textAlign = 'right';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        const isRush = timeOfDay.isRushHour;
        const isSurge = timeOfDay.surgeActive;

        // Background pill
        const bannerW = isSurge ? 240 : 210;
        ctx.fillStyle = isSurge
          ? 'rgba(159, 18, 57, 0.85)'
          : isRush
          ? 'rgba(136, 19, 55, 0.75)'
          : 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        ctx.roundRect(width - bannerW - 12, 10, bannerW, 26, 6);
        ctx.fill();
        ctx.strokeStyle = isSurge ? '#f43f5e' : isRush ? 'rgba(251, 113, 133, 0.5)' : 'rgba(51, 65, 85, 0.8)';
        ctx.stroke();

        ctx.fillStyle = isSurge ? '#ffe4e6' : isRush ? '#fbcfe8' : '#e2e8f0';
        const label = isSurge
          ? `🔥 ${timeOfDay.timeString} · SURGE (${timeOfDay.trafficMultiplier.toFixed(1)}x)`
          : `${isNight ? '🌙' : '☀️'} ${timeOfDay.timeString} · ${timeOfDay.trafficMultiplier.toFixed(1)}x Flow`;
        ctx.fillText(label, width - 20, 26);
      }
      ctx.textAlign = 'left';

      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [model, mousePos]);

  // Handle click on canvas to spawn vehicle
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const isEmergency = e.shiftKey || e.button === 2;

    // Determine which quadrant / road was clicked
    const dx = x - cx;
    const dy = y - cy;

    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy < 0) {
        // North approach
        const lane = dx > 0 && dx < 20 ? 0 : 1;
        onSpawnVehicle('NORTH', lane, isEmergency);
      } else {
        // South approach
        const lane = dx < 0 && dx > -20 ? 0 : 1;
        onSpawnVehicle('SOUTH', lane, isEmergency);
      }
    } else {
      if (dx < 0) {
        // West approach
        const lane = dy > 0 && dy < 20 ? 0 : 1;
        onSpawnVehicle('WEST', lane, isEmergency);
      } else {
        // East approach
        const lane = dy < 0 && dy > -20 ? 0 : 1;
        onSpawnVehicle('EAST', lane, isEmergency);
      }
    }
  };

  return (
    <div className="relative w-full h-[520px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={760}
        height={520}
        onClick={handleCanvasClick}
        onContextMenu={(e) => {
          e.preventDefault();
          handleCanvasClick(e);
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => setMousePos(null)}
        className="w-full h-full object-contain cursor-crosshair"
      />

      {/* Interactive spawn hint banner */}
      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-md px-2.5 py-1 text-[11px] text-slate-300 pointer-events-none">
        Click any approach to spawn vehicle · <span className="text-red-400 font-semibold">Shift+Click</span> for Ambulance
      </div>

      {/* Vehicle Inspection Tooltip */}
      {hoveredVehicle && mousePos && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900/95 border border-cyan-500/40 rounded-lg p-2.5 text-xs text-slate-200 shadow-xl backdrop-blur-md"
          style={{
            left: Math.min(600, mousePos.x + 15),
            top: Math.min(420, mousePos.y + 15),
          }}
        >
          <div className="flex items-center gap-1.5 font-semibold text-cyan-400 mb-1">
            <span>{hoveredVehicle.isEmergency ? '🚨 Emergency Ambulance' : `${hoveredVehicle.type.toUpperCase()}`}</span>
            <span className="text-slate-500 font-mono text-[10px]">#{hoveredVehicle.id}</span>
          </div>
          <div className="space-y-0.5 text-[11px] text-slate-300 font-mono">
            <div>Speed: <span className="text-white font-semibold">{(hoveredVehicle.speed * 3.6).toFixed(1)} km/h</span></div>
            <div>Wait Time: <span className={`${hoveredVehicle.waitingTime > 15 ? 'text-amber-400' : 'text-slate-300'}`}>{hoveredVehicle.waitingTime.toFixed(1)}s</span></div>
            <div>Route: <span className="text-slate-400">{hoveredVehicle.direction} → {hoveredVehicle.targetDirection}</span></div>
            <div>State: <span className="text-cyan-300 capitalize">{hoveredVehicle.state}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper: Pedestrian Zebra Crossing
function drawZebraCrosswalk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  horizontal: boolean
) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  const stripeWidth = 4;
  const gap = 4;

  if (horizontal) {
    for (let cx = x + 2; cx < x + w - stripeWidth; cx += stripeWidth + gap) {
      ctx.fillRect(cx, y, stripeWidth, h);
    }
  } else {
    for (let cy = y + 2; cy < y + h - stripeWidth; cy += stripeWidth + gap) {
      ctx.fillRect(x, cy, w, stripeWidth);
    }
  }
}

// Helper: Sensor loop indicator
function drawSensorZone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isOccupied: boolean
) {
  ctx.strokeStyle = isOccupied ? 'rgba(6, 182, 212, 0.75)' : 'rgba(71, 85, 105, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  if (isOccupied) {
    ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.fillRect(x, y, w, h);
  }
}

// Helper: Traffic Signal Head with realistic glowing lenses
function drawSignalHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: 'RED' | 'YELLOW' | 'GREEN',
  label: string
) {
  const boxW = 16;
  const boxH = 40;

  // Signal housing box
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 3);
  ctx.fill();
  ctx.stroke();

  // Visor label
  ctx.fillStyle = '#94a3b8';
  ctx.font = '8px monospace';
  ctx.fillText(label, x + 4, y - 3);

  const radius = 4;
  const cx = x + boxW / 2;

  // 1. Red Light
  const isRed = state === 'RED';
  ctx.fillStyle = isRed ? '#ef4444' : '#450a0a';
  ctx.beginPath();
  ctx.arc(cx, y + 8, radius, 0, Math.PI * 2);
  ctx.fill();
  if (isRed) {
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 2. Yellow Light
  const isYellow = state === 'YELLOW';
  ctx.fillStyle = isYellow ? '#f59e0b' : '#451a03';
  ctx.beginPath();
  ctx.arc(cx, y + 20, radius, 0, Math.PI * 2);
  ctx.fill();
  if (isYellow) {
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 3. Green Light
  const isGreen = state === 'GREEN';
  ctx.fillStyle = isGreen ? '#10b981' : '#022c22';
  ctx.beginPath();
  ctx.arc(cx, y + 32, radius, 0, Math.PI * 2);
  ctx.fill();
  if (isGreen) {
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// Compute (x, y, heading) on the canvas from vehicle model position
function computeVehicleCanvasPosition(
  v: Vehicle,
  cx: number,
  cy: number,
  scale: number,
  laneWidthPx: number,
  roadHalfWidthPx: number
): { x: number; y: number; angle: number } {
  const pos = v.position;

  // Lane offsets relative to center divider
  // Lane 0 (left turn): laneWidthPx * 0.5
  // Lane 1 (straight/right): laneWidthPx * 1.5
  const laneOffset = (v.laneIndex === 0 ? 0.5 : 1.5) * laneWidthPx;

  // Phase 1: Approaching before stopline (pos <= STOP_LINE_POSITION)
  if (pos <= STOP_LINE_POSITION) {
    const distToStopPx = (STOP_LINE_POSITION - pos) * scale;

    switch (v.direction) {
      case 'NORTH':
        return {
          x: cx + laneOffset,
          y: (cy - roadHalfWidthPx) - distToStopPx,
          angle: Math.PI / 2, // Heading South
        };
      case 'SOUTH':
        return {
          x: cx - laneOffset,
          y: (cy + roadHalfWidthPx) + distToStopPx,
          angle: -Math.PI / 2, // Heading North
        };
      case 'WEST':
        return {
          x: (cx - roadHalfWidthPx) - distToStopPx,
          y: cy + laneOffset,
          angle: 0, // Heading East
        };
      case 'EAST':
        return {
          x: (cx + roadHalfWidthPx) + distToStopPx,
          y: cy - laneOffset,
          angle: Math.PI, // Heading West
        };
    }
  }

  // Phase 2: Crossing the intersection box
  if (pos <= EXIT_START_POSITION) {
    const t = (pos - STOP_LINE_POSITION) / INTERSECTION_SIZE; // 0 to 1

    // If straight:
    if (v.laneIndex === 1) {
      switch (v.direction) {
        case 'NORTH':
          return {
            x: cx + laneOffset,
            y: (cy - roadHalfWidthPx) + t * (roadHalfWidthPx * 2),
            angle: Math.PI / 2,
          };
        case 'SOUTH':
          return {
            x: cx - laneOffset,
            y: (cy + roadHalfWidthPx) - t * (roadHalfWidthPx * 2),
            angle: -Math.PI / 2,
          };
        case 'WEST':
          return {
            x: (cx - roadHalfWidthPx) + t * (roadHalfWidthPx * 2),
            y: cy + laneOffset,
            angle: 0,
          };
        case 'EAST':
          return {
            x: (cx + roadHalfWidthPx) - t * (roadHalfWidthPx * 2),
            y: cy - laneOffset,
            angle: Math.PI,
          };
      }
    } else {
      // Left turn arc
      switch (v.direction) {
        case 'NORTH': {
          // Turns East: from (cx + laneOffset, cy - roadHalfWidthPx) to (cx + roadHalfWidthPx, cy + laneOffset)
          const angle = Math.PI / 2 - t * (Math.PI / 2);
          const currentX = (cx + laneOffset) + t * (roadHalfWidthPx - laneOffset);
          const currentY = (cy - roadHalfWidthPx) + t * (roadHalfWidthPx + laneOffset);
          return { x: currentX, y: currentY, angle };
        }
        case 'SOUTH': {
          // Turns West
          const angle = -Math.PI / 2 - t * (Math.PI / 2);
          const currentX = (cx - laneOffset) - t * (roadHalfWidthPx - laneOffset);
          const currentY = (cy + roadHalfWidthPx) - t * (roadHalfWidthPx + laneOffset);
          return { x: currentX, y: currentY, angle };
        }
        case 'WEST': {
          // Turns North
          const angle = 0 - t * (Math.PI / 2);
          const currentX = (cx - roadHalfWidthPx) + t * (roadHalfWidthPx + laneOffset);
          const currentY = (cy + laneOffset) - t * (roadHalfWidthPx + laneOffset);
          return { x: currentX, y: currentY, angle };
        }
        case 'EAST': {
          // Turns South
          const angle = Math.PI - t * (Math.PI / 2);
          const currentX = (cx + roadHalfWidthPx) - t * (roadHalfWidthPx + laneOffset);
          const currentY = (cy - laneOffset) + t * (roadHalfWidthPx + laneOffset);
          return { x: currentX, y: currentY, angle };
        }
      }
    }
  }

  // Phase 3: Departing down the exit road
  const departDistPx = (pos - EXIT_START_POSITION) * scale;
  switch (v.targetDirection) {
    case 'SOUTH':
      return { x: cx + laneOffset, y: (cy + roadHalfWidthPx) + departDistPx, angle: Math.PI / 2 };
    case 'NORTH':
      return { x: cx - laneOffset, y: (cy - roadHalfWidthPx) - departDistPx, angle: -Math.PI / 2 };
    case 'EAST':
      return { x: (cx + roadHalfWidthPx) + departDistPx, y: cy + laneOffset, angle: 0 };
    case 'WEST':
      return { x: (cx - roadHalfWidthPx) - departDistPx, y: cy - laneOffset, angle: Math.PI };
  }
}

// Draw realistic vehicle model with optional headlight beam projection
function drawVehicle(
  ctx: CanvasRenderingContext2D,
  v: Vehicle,
  x: number,
  y: number,
  angle: number,
  scale: number,
  timeSec: number,
  headlightsOn = false
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const lenPx = Math.max(8, v.length * scale);
  const widthPx = Math.max(5, v.width * scale);

  // Cast realistic forward headlight beam cones during night / dusk
  if (headlightsOn) {
    const beamLength = 46 * scale;
    const beamSpread = 18 * scale;
    const grad = ctx.createLinearGradient(lenPx / 2, 0, lenPx / 2 + beamLength, 0);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    grad.addColorStop(0.4, 'rgba(254, 240, 138, 0.2)');
    grad.addColorStop(1, 'rgba(254, 240, 138, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(lenPx / 2, -widthPx / 2 + 1);
    ctx.lineTo(lenPx / 2 + beamLength, -beamSpread);
    ctx.lineTo(lenPx / 2 + beamLength, beamSpread);
    ctx.lineTo(lenPx / 2, widthPx / 2 - 1);
    ctx.closePath();
    ctx.fill();
  }

  // Soft vehicle ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(-lenPx / 2 + 1, -widthPx / 2 + 1, lenPx, widthPx);

  // Vehicle Main Body
  ctx.fillStyle = v.color;
  ctx.beginPath();
  ctx.roundRect(-lenPx / 2, -widthPx / 2, lenPx, widthPx, 2.5);
  ctx.fill();

  // Windshield & Roof Glass
  ctx.fillStyle = '#0f172a';
  const glassW = lenPx * 0.35;
  const glassH = widthPx * 0.7;
  ctx.fillRect(-lenPx * 0.1, -glassH / 2, glassW, glassH);

  // Headlights (front right & front left)
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(lenPx / 2 - 1.5, -widthPx / 2 + 0.5, 1.5, 1.5);
  ctx.fillRect(lenPx / 2 - 1.5, widthPx / 2 - 2.0, 1.5, 1.5);

  // Taillights / Brake lights (glow bright red when stopped or decelerating)
  const isBraking = v.speed < 1.0;
  ctx.fillStyle = isBraking ? '#ef4444' : '#991b1b';
  ctx.fillRect(-lenPx / 2, -widthPx / 2 + 0.5, 1.5, 1.5);
  ctx.fillRect(-lenPx / 2, widthPx / 2 - 2.0, 1.5, 1.5);

  if (isBraking) {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fillRect(-lenPx / 2 - 4, -widthPx / 2 - 1, 4, widthPx + 2);
  }

  // Emergency Siren Beacon (Alternating Red and Blue Flasher)
  if (v.isEmergency) {
    const isRedFlash = Math.floor(timeSec * 8) % 2 === 0;
    ctx.fillStyle = isRedFlash ? '#ef4444' : '#3b82f6';
    ctx.shadowColor = isRedFlash ? '#ef4444' : '#3b82f6';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// Streetlight pole & ambient radial pool of light
function drawStreetLight(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  // Soft circular light pool on ground
  const lightRadius = 45 * scale;
  const grad = ctx.createRadialGradient(x, y, 2, x, y, lightRadius);
  grad.addColorStop(0, 'rgba(253, 230, 138, 0.28)');
  grad.addColorStop(0.5, 'rgba(253, 230, 138, 0.10)');
  grad.addColorStop(1, 'rgba(253, 230, 138, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, lightRadius, 0, Math.PI * 2);
  ctx.fill();

  // Lamp post
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(x, y, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Direction, TrafficFlowConfig, Vehicle, VehicleType } from './types';
import { IDM_PARAMS } from './trafficModel';

// Seeded pseudo-random number generator (Mulberry32) for deterministic reproducible benchmarks
export class SeededRandom {
  private state: number;

  constructor(seed = 123456789) {
    this.state = seed;
  }

  // Returns float [0, 1)
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  reset(seed = 123456789) {
    this.state = seed;
  }
}

export const PRESET_SCENARIOS: Record<string, { name: string; description: string; config: TrafficFlowConfig }> = {
  balanced: {
    name: 'Balanced Urban Flow',
    description: 'Moderate symmetric traffic across all four approaches (650 veh/hr).',
    config: {
      NORTH: 650,
      SOUTH: 650,
      EAST: 650,
      WEST: 650,
      emergencyProbability: 0.02,
    },
  },
  asymmetricRush: {
    name: 'Asymmetric Rush Hour',
    description: 'Heavy arterial East-West commuter rush (1350 veh/hr) against low cross traffic (350 veh/hr).',
    config: {
      NORTH: 350,
      SOUTH: 350,
      EAST: 1350,
      WEST: 1350,
      emergencyProbability: 0.03,
    },
  },
  nsCorridor: {
    name: 'North-South Corridor',
    description: 'Heavy North-South avenue traffic (1400 veh/hr) with low East-West cross streets (300 veh/hr).',
    config: {
      NORTH: 1400,
      SOUTH: 1400,
      EAST: 300,
      WEST: 300,
      emergencyProbability: 0.02,
    },
  },
  emergencyChallenge: {
    name: 'Emergency Priority Test',
    description: 'Frequent high-priority ambulances requiring rapid green phase preemption.',
    config: {
      NORTH: 700,
      SOUTH: 700,
      EAST: 700,
      WEST: 700,
      emergencyProbability: 0.12,
    },
  },
  heavyGridlock: {
    name: 'Saturated Gridlock',
    description: 'Peak volume stress test (1600 veh/hr all approaches) testing bottleneck clearing.',
    config: {
      NORTH: 1600,
      SOUTH: 1600,
      EAST: 1600,
      WEST: 1600,
      emergencyProbability: 0.02,
    },
  },
};

const VEHICLE_COLORS = {
  car: ['#38bdf8', '#818cf8', '#a78bfa', '#e2e8f0', '#94a3b8', '#0284c7'],
  bus: ['#f59e0b', '#fbbf24'],
  truck: ['#64748b', '#78716c'],
  emergency: ['#ef4444'],
  motorcycle: ['#10b981', '#06b6d4'],
};

export class TrafficGenerator {
  config: TrafficFlowConfig;
  private rng: SeededRandom;
  private nextId = 1;
  private timeUntilNextSpawn: Record<Direction, number> = {
    NORTH: 0,
    SOUTH: 0,
    EAST: 0,
    WEST: 0,
  };

  constructor(config: TrafficFlowConfig = PRESET_SCENARIOS.balanced.config, seed?: number) {
    this.config = { ...config };
    this.rng = new SeededRandom(seed ?? Math.floor(Math.random() * 1000000));
    this.resetTimers();
  }

  setSeed(seed: number) {
    this.rng.reset(seed);
    this.resetTimers();
  }

  resetTimers() {
    for (const dir of ['NORTH', 'SOUTH', 'EAST', 'WEST'] as Direction[]) {
      this.timeUntilNextSpawn[dir] = this.sampleInterarrivalTime(this.config[dir]);
    }
  }

  // Poisson process: Exponential distribution inter-arrival time in seconds
  // Rate lambda = vehPerHour / 3600
  private sampleInterarrivalTime(vehPerHour: number): number {
    const rate = Math.max(10, vehPerHour) / 3600;
    const u = Math.max(0.0001, this.rng.next());
    return -Math.log(u) / rate;
  }

  // Update timers and return any vehicles to spawn during this time step dt
  step(
    dt: number,
    existingVehicles: Vehicle[],
    currentSimTime: number,
    trafficMultiplier = 1.0,
    simulatedHour = 12.0
  ): Vehicle[] {
    const spawned: Vehicle[] = [];
    const directions: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];

    for (const dir of directions) {
      this.timeUntilNextSpawn[dir] -= dt;

      if (this.timeUntilNextSpawn[dir] <= 0) {
        // Sample vehicle type
        const isEmergency = this.rng.next() < this.config.emergencyProbability;
        let type: VehicleType = 'car';

        if (isEmergency) {
          type = 'emergency';
        } else {
          const typeRoll = this.rng.next();
          if (typeRoll < 0.72) type = 'car';
          else if (typeRoll < 0.83) type = 'bus';
          else if (typeRoll < 0.93) type = 'truck';
          else type = 'motorcycle';
        }

        // Determine lane:
        // Lane 0: Left turn pocket (25% chance)
        // Lane 1: Straight / right (75% chance)
        const laneIndex = this.rng.next() < 0.28 ? 0 : 1;

        // Check if spawn zone is clear (no vehicle right at position 0 to 12m)
        const isBlocked = existingVehicles.some(
          v => v.direction === dir && v.laneIndex === laneIndex && v.position < 12
        );

        if (!isBlocked) {
          const v = this.createVehicle(dir, laneIndex, type, currentSimTime);
          spawned.push(v);
        }

        // Compute dynamic rate for this direction considering time of day
        let effectiveRate = this.config[dir] * trafficMultiplier;

        // Tidal commuter asymmetry during rush hour peaks
        if (simulatedHour >= 7.0 && simulatedHour < 9.5) {
          // Morning commute: heavier North/South inbound corridors
          if (dir === 'NORTH' || dir === 'SOUTH') effectiveRate *= 1.25;
        } else if (simulatedHour >= 16.5 && simulatedHour < 19.5) {
          // Evening rush: heavier East/West outbound corridors
          if (dir === 'EAST' || dir === 'WEST') effectiveRate *= 1.30;
        }

        // Schedule next arrival
        this.timeUntilNextSpawn[dir] = this.sampleInterarrivalTime(effectiveRate);
      }
    }

    return spawned;
  }

  // Manually create a vehicle (for user interactive spawning)
  createVehicle(
    direction: Direction,
    laneIndex: number,
    type: VehicleType,
    currentSimTime: number
  ): Vehicle {
    const params = IDM_PARAMS[type];
    const colorPalette = VEHICLE_COLORS[type];
    const color = colorPalette[Math.floor(this.rng.next() * colorPalette.length)];

    // Target direction based on lane
    let targetDirection: Direction = direction;
    if (laneIndex === 0) {
      // Turn left
      if (direction === 'NORTH') targetDirection = 'EAST';
      if (direction === 'SOUTH') targetDirection = 'WEST';
      if (direction === 'EAST') targetDirection = 'SOUTH';
      if (direction === 'WEST') targetDirection = 'NORTH';
    } else {
      // Straight (or occasionally right turn)
      const turnRight = this.rng.next() < 0.2;
      if (turnRight) {
        if (direction === 'NORTH') targetDirection = 'WEST';
        if (direction === 'SOUTH') targetDirection = 'EAST';
        if (direction === 'EAST') targetDirection = 'NORTH';
        if (direction === 'WEST') targetDirection = 'SOUTH';
      } else {
        // Straight
        if (direction === 'NORTH') targetDirection = 'SOUTH';
        if (direction === 'SOUTH') targetDirection = 'NORTH';
        if (direction === 'EAST') targetDirection = 'WEST';
        if (direction === 'WEST') targetDirection = 'EAST';
      }
    }

    const id = `veh_${this.nextId++}`;
    return {
      id,
      type,
      direction,
      laneIndex,
      targetDirection,
      position: 0,
      speed: Math.min(params.maxSpeed * 0.8, 8.0 + this.rng.next() * 3.0),
      maxSpeed: params.maxSpeed * (0.9 + this.rng.next() * 0.2),
      length: params.length,
      width: params.width,
      color,
      waitingTime: 0,
      totalTime: 0,
      state: 'approaching',
      isEmergency: type === 'emergency',
      spawnTime: currentSimTime,
    };
  }
}

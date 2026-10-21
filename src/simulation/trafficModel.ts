/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Direction,
  PhaseId,
  SignalLight,
  SignalState,
  SimulationStats,
  Vehicle,
  VehicleType,
} from './types';

// Spatial metrics in meters
export const ROAD_APPROACH_LENGTH = 140; // Entry to stopline
export const INTERSECTION_SIZE = 32; // Center cross area
export const TOTAL_ROAD_LENGTH = ROAD_APPROACH_LENGTH * 2 + INTERSECTION_SIZE;
export const STOP_LINE_POSITION = ROAD_APPROACH_LENGTH;
export const EXIT_START_POSITION = ROAD_APPROACH_LENGTH + INTERSECTION_SIZE;

// IDM Driver Model Parameters
export const IDM_PARAMS = {
  car: { maxSpeed: 13.8, maxAcc: 2.2, comfyDec: 2.8, s0: 2.5, T: 1.2, length: 4.6, width: 2.1 },
  bus: { maxSpeed: 11.0, maxAcc: 1.4, comfyDec: 2.0, s0: 3.5, T: 1.6, length: 11.0, width: 2.6 },
  truck: { maxSpeed: 11.5, maxAcc: 1.3, comfyDec: 1.8, s0: 3.2, T: 1.5, length: 8.5, width: 2.5 },
  emergency: { maxSpeed: 18.0, maxAcc: 3.2, comfyDec: 3.5, s0: 2.0, T: 0.9, length: 5.8, width: 2.3 },
  motorcycle: { maxSpeed: 14.5, maxAcc: 3.0, comfyDec: 3.2, s0: 1.8, T: 0.9, length: 2.4, width: 1.2 },
};

export const MIN_GREEN_TIME = 6.0; // Minimum green seconds before allowing phase switch
export const YELLOW_TIME = 3.5; // Yellow clearance interval in seconds

export class TrafficIntersectionModel {
  vehicles: Vehicle[] = [];
  currentPhase: PhaseId = 0; // 0: NS_Green, 1: NS_Yellow, 2: EW_Green, 3: EW_Yellow
  phaseElapsedSeconds = 0;
  targetGreenPhase: PhaseId = 0; // Target phase when yellow finishes
  yellowCountdown = 0;

  // Statistics
  totalSpawned = 0;
  totalDeparted = 0;
  totalEmergencySpawned = 0;
  totalEmergencyDeparted = 0;
  totalCumulativeWaitTime = 0;
  totalEmergencyWaitTime = 0;
  simulatedSeconds = 0;
  stepCount = 0;
  phaseSwitchCount = 0;

  // Reward calculation tracking
  lastTotalWait = 0;
  lastTotalQueue = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.vehicles = [];
    this.currentPhase = 0;
    this.phaseElapsedSeconds = 0;
    this.targetGreenPhase = 0;
    this.yellowCountdown = 0;
    this.totalSpawned = 0;
    this.totalDeparted = 0;
    this.totalEmergencySpawned = 0;
    this.totalEmergencyDeparted = 0;
    this.totalCumulativeWaitTime = 0;
    this.totalEmergencyWaitTime = 0;
    this.simulatedSeconds = 0;
    this.stepCount = 0;
    this.phaseSwitchCount = 0;
    this.lastTotalWait = 0;
    this.lastTotalQueue = 0;
  }

  // Get current physical signal lights for each direction
  getSignals(): SignalState {
    const defaultSignals: SignalState = {
      NORTH: { straight: 'RED', left: 'RED' },
      SOUTH: { straight: 'RED', left: 'RED' },
      EAST: { straight: 'RED', left: 'RED' },
      WEST: { straight: 'RED', left: 'RED' },
    };

    switch (this.currentPhase) {
      case 0: // NS Green
        defaultSignals.NORTH = { straight: 'GREEN', left: 'GREEN' };
        defaultSignals.SOUTH = { straight: 'GREEN', left: 'GREEN' };
        break;
      case 1: // NS Yellow
        defaultSignals.NORTH = { straight: 'YELLOW', left: 'YELLOW' };
        defaultSignals.SOUTH = { straight: 'YELLOW', left: 'YELLOW' };
        break;
      case 2: // EW Green
        defaultSignals.EAST = { straight: 'GREEN', left: 'GREEN' };
        defaultSignals.WEST = { straight: 'GREEN', left: 'GREEN' };
        break;
      case 3: // EW Yellow
        defaultSignals.EAST = { straight: 'YELLOW', left: 'YELLOW' };
        defaultSignals.WEST = { straight: 'YELLOW', left: 'YELLOW' };
        break;
    }

    return defaultSignals;
  }

  // Check if current green direction matches a query direction
  isDirectionGreen(direction: Direction): boolean {
    if (this.currentPhase === 0) return direction === 'NORTH' || direction === 'SOUTH';
    if (this.currentPhase === 2) return direction === 'EAST' || direction === 'WEST';
    return false;
  }

  isDirectionYellow(direction: Direction): boolean {
    if (this.currentPhase === 1) return direction === 'NORTH' || direction === 'SOUTH';
    if (this.currentPhase === 3) return direction === 'EAST' || direction === 'WEST';
    return false;
  }

  getSignalForVehicle(v: Vehicle): SignalLight {
    const signals = this.getSignals();
    const dirSignals = signals[v.direction];
    return v.laneIndex === 0 ? dirSignals.left : dirSignals.straight;
  }

  // Attempt to switch phase (triggered by RL agent or timer)
  // Returns true if a switch was initiated
  requestPhaseSwitch(): boolean {
    // Only allow initiating switch if we are currently in green phase and min green duration passed
    if (this.currentPhase === 0 && this.phaseElapsedSeconds >= MIN_GREEN_TIME) {
      this.currentPhase = 1; // Transition to NS Yellow
      this.targetGreenPhase = 2; // Next will be EW Green
      this.yellowCountdown = YELLOW_TIME;
      this.phaseElapsedSeconds = 0;
      this.phaseSwitchCount++;
      return true;
    }
    if (this.currentPhase === 2 && this.phaseElapsedSeconds >= MIN_GREEN_TIME) {
      this.currentPhase = 3; // Transition to EW Yellow
      this.targetGreenPhase = 0; // Next will be NS Green
      this.yellowCountdown = YELLOW_TIME;
      this.phaseElapsedSeconds = 0;
      this.phaseSwitchCount++;
      return true;
    }
    return false;
  }

  // Add a spawned vehicle to the intersection
  addVehicle(vehicle: Vehicle) {
    this.vehicles.push(vehicle);
    this.totalSpawned++;
    if (vehicle.isEmergency) {
      this.totalEmergencySpawned++;
    }
  }

  // Step the simulation forward by deltaSeconds (e.g. 0.1s for smooth physics)
  step(dt: number) {
    this.simulatedSeconds += dt;
    this.stepCount++;
    this.phaseElapsedSeconds += dt;

    // Handle yellow countdown transitions
    if (this.currentPhase === 1 || this.currentPhase === 3) {
      this.yellowCountdown -= dt;
      if (this.yellowCountdown <= 0) {
        this.currentPhase = this.targetGreenPhase;
        this.phaseElapsedSeconds = 0;
        this.yellowCountdown = 0;
      }
    }

    // Group vehicles by (direction, laneIndex) to model car-following
    const laneGroups: Record<string, Vehicle[]> = {
      'NORTH-0': [], 'NORTH-1': [],
      'SOUTH-0': [], 'SOUTH-1': [],
      'EAST-0': [], 'EAST-1': [],
      'WEST-0': [], 'WEST-1': [],
    };

    for (const v of this.vehicles) {
      const key = `${v.direction}-${v.laneIndex}`;
      if (laneGroups[key]) {
        laneGroups[key].push(v);
      }
    }

    // Sort vehicles in each lane by position descending (closest to intersection first)
    for (const key in laneGroups) {
      laneGroups[key].sort((a, b) => b.position - a.position);
    }

    // Update each vehicle using Intelligent Driver Model (IDM)
    for (const key in laneGroups) {
      const laneVehicles = laneGroups[key];

      for (let i = 0; i < laneVehicles.length; i++) {
        const v = laneVehicles[i];
        const params = IDM_PARAMS[v.type];

        // Track waiting time
        v.totalTime += dt;
        if (v.speed < 0.6 && v.position <= STOP_LINE_POSITION + 2) {
          v.waitingTime += dt;
          v.state = 'queued';
        } else if (v.position > EXIT_START_POSITION) {
          v.state = 'departed';
        } else if (v.position > STOP_LINE_POSITION) {
          v.state = 'crossing';
        } else {
          v.state = 'approaching';
        }

        // Leader vehicle ahead in same lane
        const leader = i > 0 ? laneVehicles[i - 1] : null;

        // Effective distance and relative speed to leader
        let distanceToLeader = 9999;
        let deltaV = 0; // v - v_lead

        if (leader) {
          // Gap from front bumper of v to rear bumper of leader
          distanceToLeader = (leader.position - leader.length) - v.position;
          deltaV = v.speed - leader.speed;
        }

        // Virtual leader at stopline if traffic light is RED or YELLOW and not in dilemma zone
        const signal = this.getSignalForVehicle(v);
        const distToStopLine = STOP_LINE_POSITION - v.position;

        let virtualStopDistance = 9999;
        let virtualDeltaV = 0;

        if (distToStopLine > 0) {
          if (signal === 'RED') {
            virtualStopDistance = distToStopLine;
            virtualDeltaV = v.speed - 0;
          } else if (signal === 'YELLOW') {
            // Dilemma zone decision: comfortable stop vs go
            // Stopping distance = v^2 / (2 * comfyDec)
            const requiredStopDist = (v.speed * v.speed) / (2 * params.comfyDec) + (v.speed * 0.8);
            if (distToStopLine >= requiredStopDist || v.speed < 1.0) {
              virtualStopDistance = distToStopLine;
              virtualDeltaV = v.speed - 0;
            }
          }
        }

        // Pick whichever constraint is more urgent (real leader or red light stop line)
        let effectiveDistance = distanceToLeader;
        let effectiveDeltaV = deltaV;

        if (virtualStopDistance < effectiveDistance) {
          effectiveDistance = virtualStopDistance;
          effectiveDeltaV = virtualDeltaV;
        }

        // Prevent negative gap calculation
        effectiveDistance = Math.max(0.2, effectiveDistance);

        // IDM Acceleration formula
        // s*(v, deltaV) = s0 + max(0, v*T + (v * deltaV) / (2 * sqrt(a * b)))
        const desiredGap = params.s0 + Math.max(
          0,
          v.speed * params.T + (v.speed * effectiveDeltaV) / (2 * Math.sqrt(params.maxAcc * params.comfyDec))
        );

        // a_idm = a * [1 - (v/v0)^4 - (s*/s)^2]
        const freeRoadRatio = Math.pow(v.speed / params.maxSpeed, 4);
        const interactionRatio = Math.pow(desiredGap / effectiveDistance, 2);

        let acceleration = params.maxAcc * (1 - freeRoadRatio - interactionRatio);

        // Apply comfortable deceleration clamp
        acceleration = Math.max(-params.comfyDec * 2.5, Math.min(params.maxAcc, acceleration));

        // Speed and position integration
        v.speed = Math.max(0, v.speed + acceleration * dt);
        v.position += v.speed * dt;
      }
    }

    // Remove departed vehicles that completed the entire exit road
    const remainingVehicles: Vehicle[] = [];
    for (const v of this.vehicles) {
      if (v.position >= TOTAL_ROAD_LENGTH) {
        this.totalDeparted++;
        this.totalCumulativeWaitTime += v.waitingTime;
        if (v.isEmergency) {
          this.totalEmergencyDeparted++;
          this.totalEmergencyWaitTime += v.waitingTime;
        }
      } else {
        remainingVehicles.push(v);
      }
    }
    this.vehicles = remainingVehicles;
  }

  // Get current queue count (vehicles stopped or < 1 m/s before stopline)
  getQueuesByDirection(): Record<Direction, number> {
    const counts: Record<Direction, number> = { NORTH: 0, SOUTH: 0, EAST: 0, WEST: 0 };
    for (const v of this.vehicles) {
      if (v.position <= STOP_LINE_POSITION && v.position >= STOP_LINE_POSITION - 70 && v.speed < 1.0) {
        counts[v.direction]++;
      }
    }
    return counts;
  }

  // Average waiting time per direction of vehicles currently waiting
  getWaitTimeByDirection(): Record<Direction, number> {
    const totals: Record<Direction, number> = { NORTH: 0, SOUTH: 0, EAST: 0, WEST: 0 };
    const counts: Record<Direction, number> = { NORTH: 0, SOUTH: 0, EAST: 0, WEST: 0 };
    for (const v of this.vehicles) {
      if (v.position <= STOP_LINE_POSITION + 5) {
        totals[v.direction] += v.waitingTime;
        counts[v.direction]++;
      }
    }
    return {
      NORTH: counts.NORTH > 0 ? totals.NORTH / counts.NORTH : 0,
      SOUTH: counts.SOUTH > 0 ? totals.SOUTH / counts.SOUTH : 0,
      EAST: counts.EAST > 0 ? totals.EAST / counts.EAST : 0,
      WEST: counts.WEST > 0 ? totals.WEST / counts.WEST : 0,
    };
  }

  // Check if any emergency vehicle is currently waiting or approaching on any direction
  getEmergencyCountByDirection(): Record<Direction, number> {
    const counts: Record<Direction, number> = { NORTH: 0, SOUTH: 0, EAST: 0, WEST: 0 };
    for (const v of this.vehicles) {
      if (v.isEmergency && v.position <= STOP_LINE_POSITION + 10) {
        counts[v.direction]++;
      }
    }
    return counts;
  }

  // Discretized State representation for Tabular Q-Learning
  // Bucket queue levels: 0 (0-1), 1 (2-3), 2 (4-6), 3 (7+)
  getDiscretizedState(): string {
    const queues = this.getQueuesByDirection();
    const nsQueue = queues.NORTH + queues.SOUTH;
    const ewQueue = queues.EAST + queues.WEST;

    const nsBucket = nsQueue <= 1 ? 0 : nsQueue <= 4 ? 1 : nsQueue <= 8 ? 2 : 3;
    const ewBucket = ewQueue <= 1 ? 0 : ewQueue <= 4 ? 1 : ewQueue <= 8 ? 2 : 3;

    // Time elapsed in green phase: 0 (short < 10s), 1 (medium 10-20s), 2 (long > 20s)
    const timeBucket = this.phaseElapsedSeconds < 10 ? 0 : this.phaseElapsedSeconds < 22 ? 1 : 2;

    // Active Green axis: 0 for NS green (phases 0, 1), 1 for EW green (phases 2, 3)
    const axis = this.currentPhase === 0 || this.currentPhase === 1 ? 0 : 1;

    // Check emergency presence
    const emerg = this.getEmergencyCountByDirection();
    const emergNS = (emerg.NORTH + emerg.SOUTH) > 0 ? 1 : 0;
    const emergEW = (emerg.EAST + emerg.WEST) > 0 ? 1 : 0;

    return `NS:${nsBucket}_EW:${ewBucket}_AXIS:${axis}_T:${timeBucket}_E:${emergNS}-${emergEW}`;
  }

  // Continuous Feature Vector for Deep Q-Network (10 inputs)
  // Normalized between 0 and 1
  getContinuousStateVector(): number[] {
    const queues = this.getQueuesByDirection();
    const waitTimes = this.getWaitTimeByDirection();
    const emerg = this.getEmergencyCountByDirection();

    return [
      Math.min(1.0, queues.NORTH / 15.0),
      Math.min(1.0, queues.SOUTH / 15.0),
      Math.min(1.0, queues.EAST / 15.0),
      Math.min(1.0, queues.WEST / 15.0),
      Math.min(1.0, waitTimes.NORTH / 45.0),
      Math.min(1.0, waitTimes.SOUTH / 45.0),
      Math.min(1.0, waitTimes.EAST / 45.0),
      Math.min(1.0, waitTimes.WEST / 45.0),
      this.currentPhase === 0 ? 1.0 : this.currentPhase === 2 ? 0.0 : 0.5,
      Math.min(1.0, this.phaseElapsedSeconds / 30.0),
      (emerg.NORTH + emerg.SOUTH > 0 ? 1.0 : 0.0),
      (emerg.EAST + emerg.WEST > 0 ? 1.0 : 0.0),
    ];
  }

  // Compute RL Reward signal for transition
  calculateReward(weights: {
    queuePenalty: number;
    waitPenalty: number;
    emergencyPenalty: number;
    switchPenalty: number;
    throughputReward: number;
  }, didSwitch: boolean): number {
    const queues = this.getQueuesByDirection();
    const totalQueue = queues.NORTH + queues.SOUTH + queues.EAST + queues.WEST;

    // Total waiting time across all active vehicles in approach
    let totalWait = 0;
    let emergencyWait = 0;
    for (const v of this.vehicles) {
      if (v.position <= STOP_LINE_POSITION) {
        totalWait += v.waitingTime;
        if (v.isEmergency) {
          emergencyWait += v.waitingTime * 3.5;
        }
      }
    }

    const avgWait = this.vehicles.length > 0 ? totalWait / this.vehicles.length : 0;

    const r =
      - (weights.queuePenalty * totalQueue)
      - (weights.waitPenalty * avgWait)
      - (weights.emergencyPenalty * emergencyWait)
      - (didSwitch ? weights.switchPenalty : 0);

    return r;
  }

  // Compute current comprehensive statistics
  getStats(): SimulationStats {
    const queues = this.getQueuesByDirection();
    const totalQueue = queues.NORTH + queues.SOUTH + queues.EAST + queues.WEST;

    let activeWaitingCount = 0;
    let totalActiveWait = 0;
    for (const v of this.vehicles) {
      if (v.speed < 0.6) {
        activeWaitingCount++;
        totalActiveWait += v.waitingTime;
      }
    }

    const avgWait = (this.totalDeparted + activeWaitingCount) > 0
      ? (this.totalCumulativeWaitTime + totalActiveWait) / (this.totalDeparted + activeWaitingCount)
      : 0;

    const minutes = Math.max(0.1, this.simulatedSeconds / 60);
    const throughput = (this.totalDeparted / minutes);

    // Fuel and CO2 estimation: Idling vehicles produce ~3.5g CO2 / second and ~0.0004L fuel / second
    const co2Grams = (this.totalCumulativeWaitTime + totalActiveWait) * 3.5;
    const fuelLiters = (this.totalCumulativeWaitTime + totalActiveWait) * 0.0004;

    return {
      simulatedTimeSeconds: this.simulatedSeconds,
      stepCount: this.stepCount,
      totalDeparted: this.totalDeparted,
      totalEmergencyDeparted: this.totalEmergencyDeparted,
      currentQueueLength: totalQueue,
      maxQueueLength: Math.max(totalQueue, 0),
      avgWaitTime: avgWait,
      currentStepDelay: activeWaitingCount > 0 ? totalActiveWait / activeWaitingCount : 0,
      throughputPerMin: throughput,
      co2GramsEstimated: co2Grams,
      fuelLitersEstimated: fuelLiters,
      emergencyAvgWaitTime: this.totalEmergencyDeparted > 0
        ? this.totalEmergencyWaitTime / this.totalEmergencyDeparted
        : 0,
      recentEpisodeRewards: [],
    };
  }
}

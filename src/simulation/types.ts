/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

export type LaneType = 'STRAIGHT_RIGHT' | 'LEFT_TURN';

export type VehicleType = 'car' | 'bus' | 'truck' | 'emergency' | 'motorcycle';

export interface Vehicle {
  id: string;
  type: VehicleType;
  direction: Direction; // Origin direction
  laneIndex: number; // 0: Left turn pocket, 1: Straight & Right
  targetDirection: Direction; // Where it wants to go
  position: number; // Distance in meters from entry spawn point (0 to roadLength)
  speed: number; // Current speed (m/s)
  maxSpeed: number; // Max desired speed (m/s)
  length: number; // Vehicle length in meters
  width: number;
  color: string;
  waitingTime: number; // Cumulative seconds with speed < 0.5 m/s
  totalTime: number; // Total seconds in simulation
  state: 'approaching' | 'queued' | 'crossing' | 'departed';
  isEmergency: boolean;
  spawnTime: number;
}

export type SignalLight = 'RED' | 'YELLOW' | 'GREEN';

export interface DirectionSignals {
  straight: SignalLight;
  left: SignalLight;
}

export interface SignalState {
  NORTH: DirectionSignals;
  SOUTH: DirectionSignals;
  EAST: DirectionSignals;
  WEST: DirectionSignals;
}

// Phase definitions:
// Phase 0: NS Green (East-West Red)
// Phase 1: NS Yellow (East-West Red)
// Phase 2: EW Green (North-South Red)
// Phase 3: EW Yellow (North-South Red)
export type PhaseId = 0 | 1 | 2 | 3;

export type ActionType = 0 | 1; // 0 = Keep current phase, 1 = Switch to next phase

export type ControllerMode = 'fixed' | 'actuated' | 'q_learning' | 'dqn';

export interface TrafficFlowConfig {
  NORTH: number; // vehicles per hour
  SOUTH: number;
  EAST: number;
  WEST: number;
  emergencyProbability: number; // 0.0 to 0.1
}

export interface SimulationStats {
  simulatedTimeSeconds: number;
  stepCount: number;
  totalDeparted: number;
  totalEmergencyDeparted: number;
  currentQueueLength: number;
  maxQueueLength: number;
  avgWaitTime: number;
  currentStepDelay: number;
  throughputPerMin: number;
  co2GramsEstimated: number;
  fuelLitersEstimated: number;
  emergencyAvgWaitTime: number;
  recentEpisodeRewards: number[];
  timeOfDay?: TimeOfDayState;
}

export type PressureLevel = 'Low' | 'Moderate' | 'Elevated' | 'Rush Hour Peak' | 'Extreme Gridlock';

export interface TimeOfDayState {
  simulatedHour: number; // 0 to 24 float, e.g. 8.5 = 8:30 AM
  timeString: string; // "08:30 AM"
  periodName: string; // "Morning Rush Hour", "Midday Steady", "Evening Rush", "Night", etc.
  trafficMultiplier: number; // e.g. 0.4x to 2.8x
  pressureLevel: PressureLevel;
  isRushHour: boolean;
  isNight: boolean;
  sunIntensity: number; // 0.0 (midnight) to 1.0 (noon)
  ambientColor: string; // canvas ambient tint
  mode: 'cycle' | 'manual';
  cycleSpeedMinutesPerSec: number; // Simulated minutes per real second
  surgeActive: boolean; // Sudden rush hour stress surge
  surgeRemainingSec: number;
}

export interface TelemetryHistoryPoint {
  time: number;
  avgWaitTime: number;
  queueLength: number;
  throughput: number;
  reward: number;
  activePhase: number;
  epsilon: number;
  simulatedHour?: number;
  trafficMultiplier?: number;
}

export interface RLHyperparameters {
  learningRate: number; // alpha
  discountFactor: number; // gamma
  epsilon: number; // initial exploration
  epsilonMin: number;
  epsilonDecay: number;
  rewardWeights: {
    queuePenalty: number;
    waitPenalty: number;
    emergencyPenalty: number;
    switchPenalty: number;
    throughputReward: number;
  };
}

export interface BenchmarkResult {
  controller: ControllerMode;
  controllerName: string;
  totalVehiclesSpawned: number;
  totalDeparted: number;
  avgWaitTime: number;
  maxWaitTime: number;
  avgQueueLength: number;
  maxQueueLength: number;
  emergencyClearanceTime: number;
  co2Grams: number;
  throughputPerMin: number;
  phaseSwitches: number;
}

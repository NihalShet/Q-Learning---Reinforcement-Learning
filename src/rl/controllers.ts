/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActionType, ControllerMode, RLHyperparameters } from '../simulation/types';
import { TrafficIntersectionModel, MIN_GREEN_TIME } from '../simulation/trafficModel';
import { QLearningAgent } from './qlearning';
import { DeepQAgent } from './dqn';

export interface DecisionResult {
  action: ActionType;
  reason: string;
  qValues?: [number, number];
  rawState?: string | number[];
}

export interface TrafficController {
  type: ControllerMode;
  name: string;
  description: string;
  decide(model: TrafficIntersectionModel, isTraining?: boolean): DecisionResult;
  recordOutcome?(model: TrafficIntersectionModel, action: ActionType): void;
  reset?(): void;
}

// 1. Classical Fixed-Time Controller (Standard Timer)
export class FixedTimeController implements TrafficController {
  type: ControllerMode = 'fixed';
  name = 'Fixed-Time Pre-Timed Cycle';
  description = 'Cycles between North-South and East-West every 25 seconds regardless of actual queue demands.';
  greenDuration = 25.0; // Fixed 25 seconds per direction

  decide(model: TrafficIntersectionModel): DecisionResult {
    // Check if current phase is green and timer exceeded fixed duration
    if ((model.currentPhase === 0 || model.currentPhase === 2) && model.phaseElapsedSeconds >= this.greenDuration) {
      return {
        action: 1,
        reason: `Timer expired (${model.phaseElapsedSeconds.toFixed(1)}s >= ${this.greenDuration}s). Switching phase.`,
      };
    }

    return {
      action: 0,
      reason: `Fixed cycle active (${model.phaseElapsedSeconds.toFixed(1)}s / ${this.greenDuration}s).`,
    };
  }

  reset() {
    // Stateless
  }
}

// 2. Actuated Sensor-Based Heuristic Controller (Standard Traffic Engineering Baseline)
export class ActuatedController implements TrafficController {
  type: ControllerMode = 'actuated';
  name = 'Actuated Vehicle-Responsive';
  description = 'Uses induction loop presence sensors. Extends green if traffic detected, gap-out if empty, switches if opposing queue accumulates.';
  maxGreen = 38.0;

  decide(model: TrafficIntersectionModel): DecisionResult {
    // Only make decisions during green phases
    if (model.currentPhase !== 0 && model.currentPhase !== 2) {
      return { action: 0, reason: 'Transitioning through yellow clearance interval.' };
    }

    if (model.phaseElapsedSeconds < MIN_GREEN_TIME) {
      return { action: 0, reason: `Enforcing minimum green constraint (${model.phaseElapsedSeconds.toFixed(1)}s < ${MIN_GREEN_TIME}s).` };
    }

    const queues = model.getQueuesByDirection();
    const isNS = model.currentPhase === 0;
    const currentQueue = isNS ? (queues.NORTH + queues.SOUTH) : (queues.EAST + queues.WEST);
    const opposingQueue = isNS ? (queues.EAST + queues.WEST) : (queues.NORTH + queues.SOUTH);

    // Emergency vehicle priority check
    const emerg = model.getEmergencyCountByDirection();
    const opposingEmergency = isNS ? (emerg.EAST + emerg.WEST) : (emerg.NORTH + emerg.SOUTH);
    if (opposingEmergency > 0) {
      return { action: 1, reason: '🚨 Emergency siren detected on opposing approach! Preempting phase.' };
    }

    // Gap-out logic: if no vehicles queued on current approach and opposing vehicles waiting
    if (currentQueue === 0 && opposingQueue > 0) {
      return { action: 1, reason: `Gap-out: Current lane empty, ${opposingQueue} vehicles waiting opposing.` };
    }

    // Max-out logic: reached maximum green time
    if (model.phaseElapsedSeconds >= this.maxGreen) {
      return { action: 1, reason: `Max-green reached (${this.maxGreen}s cap). Forcing switch to serve waiting queue.` };
    }

    // Heavy opposing imbalance
    if (opposingQueue > currentQueue * 2.2 && model.phaseElapsedSeconds >= 14.0) {
      return { action: 1, reason: `Queue imbalance: Opposing (${opposingQueue}) exceeds active (${currentQueue}).` };
    }

    return { action: 0, reason: `Extending green: Serving ${currentQueue} vehicles on active approach.` };
  }

  reset() {
    // Stateless
  }
}

// 3. Tabular Q-Learning Controller
export class QLearningController implements TrafficController {
  type: ControllerMode = 'q_learning';
  name = 'Q-Learning (Tabular RL)';
  description = 'Learns optimal phase switching policies using Bellman temporal-difference value iteration.';
  agent: QLearningAgent;
  lastState = '';
  lastAction: ActionType = 0;

  constructor(hyperparams?: RLHyperparameters) {
    this.agent = new QLearningAgent(hyperparams);
  }

  decide(model: TrafficIntersectionModel, isTraining = true): DecisionResult {
    // Only decide during green
    if (model.currentPhase !== 0 && model.currentPhase !== 2) {
      return { action: 0, reason: 'Yellow transition in progress.' };
    }

    if (model.phaseElapsedSeconds < MIN_GREEN_TIME) {
      return { action: 0, reason: `Safety constraint: Minimum green ${MIN_GREEN_TIME}s in effect.` };
    }

    const state = model.getDiscretizedState();
    const action = this.agent.selectAction(state, isTraining);
    const qValues = this.agent.getQValues(state);

    this.lastState = state;
    this.lastAction = action;

    const actionName = action === 0 ? 'KEEP GREEN' : 'SWITCH PHASE';
    const reason = `State: [${state}] -> ${actionName} (Q_keep=${qValues[0].toFixed(2)}, Q_switch=${qValues[1].toFixed(2)}, ε=${(this.agent.hyperparams.epsilon * 100).toFixed(1)}%)`;

    return {
      action,
      reason,
      qValues,
      rawState: state,
    };
  }

  recordOutcome(model: TrafficIntersectionModel, action: ActionType) {
    if (!this.lastState) return;
    const reward = model.calculateReward(this.agent.hyperparams.rewardWeights, action === 1);
    const nextState = model.getDiscretizedState();
    this.agent.update(this.lastState, action, reward, nextState);
  }

  reset() {
    this.lastState = '';
    this.lastAction = 0;
  }
}

// 4. Deep Q-Network (DQN) Controller
export class DQNController implements TrafficController {
  type: ControllerMode = 'dqn';
  name = 'Deep Q-Network (DQN)';
  description = 'Deep reinforcement learning agent utilizing a 3-layer neural network, experience replay, and target network.';
  agent: DeepQAgent;
  lastStateVector: number[] = [];
  lastAction: ActionType = 0;

  constructor(hyperparams?: RLHyperparameters) {
    this.agent = new DeepQAgent(hyperparams);
  }

  decide(model: TrafficIntersectionModel, isTraining = true): DecisionResult {
    if (model.currentPhase !== 0 && model.currentPhase !== 2) {
      return { action: 0, reason: 'Yellow transition in progress.' };
    }

    if (model.phaseElapsedSeconds < MIN_GREEN_TIME) {
      return { action: 0, reason: `Safety constraint: Minimum green ${MIN_GREEN_TIME}s in effect.` };
    }

    const state = model.getContinuousStateVector();
    const { action, qValues } = this.agent.selectAction(state, isTraining);

    this.lastStateVector = state;
    this.lastAction = action;

    const actionName = action === 0 ? 'KEEP GREEN' : 'SWITCH PHASE';
    const reason = `DQN Feedforward: ${actionName} [Q(Keep)=${qValues[0].toFixed(2)}, Q(Switch)=${qValues[1].toFixed(2)}]`;

    return {
      action,
      reason,
      qValues,
      rawState: state,
    };
  }

  recordOutcome(model: TrafficIntersectionModel, action: ActionType) {
    if (this.lastStateVector.length === 0) return;
    const reward = model.calculateReward(this.agent.hyperparams.rewardWeights, action === 1);
    const nextState = model.getContinuousStateVector();

    this.agent.remember(this.lastStateVector, action, reward, nextState, false);
    this.agent.trainBatch();
  }

  reset() {
    this.lastStateVector = [];
    this.lastAction = 0;
  }
}

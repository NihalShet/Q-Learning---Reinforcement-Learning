/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActionType, RLHyperparameters } from '../simulation/types';

export const DEFAULT_RL_HYPERPARAMS: RLHyperparameters = {
  learningRate: 0.15, // alpha
  discountFactor: 0.88, // gamma
  epsilon: 0.20, // exploration
  epsilonMin: 0.02,
  epsilonDecay: 0.995,
  rewardWeights: {
    queuePenalty: 1.2,
    waitPenalty: 0.08,
    emergencyPenalty: 4.5,
    switchPenalty: 0.5,
    throughputReward: 1.5,
  },
};

export interface QTableRecord {
  state: string;
  qKeep: number;
  qSwitch: number;
  visits: number;
  bestAction: ActionType;
}

export class QLearningAgent {
  qTable: Map<string, [number, number]> = new Map();
  visitsTable: Map<string, number> = new Map();
  hyperparams: RLHyperparameters;
  lastState: string | null = null;
  lastAction: ActionType | null = null;
  lastTDError = 0;
  totalTrainingSteps = 0;

  constructor(hyperparams: RLHyperparameters = DEFAULT_RL_HYPERPARAMS) {
    this.hyperparams = { ...hyperparams, rewardWeights: { ...hyperparams.rewardWeights } };
    this.seedPretrainedKnowledge();
  }

  // Pre-seed intuitive prior Q-values so agent is smart immediately upon launch
  private seedPretrainedKnowledge() {
    // Generate common states:
    // NS bucket: 0..3, EW bucket: 0..3, AXIS: 0 (NS Green) or 1 (EW Green), T: 0..2, E: 0 or 1
    for (let ns = 0; ns <= 3; ns++) {
      for (let ew = 0; ew <= 3; ew++) {
        for (let axis = 0; axis <= 1; axis++) {
          for (let t = 0; t <= 2; t++) {
            for (let emergNS = 0; emergNS <= 1; emergNS++) {
              for (let emergEW = 0; emergEW <= 1; emergEW++) {
                const key = `NS:${ns}_EW:${ew}_AXIS:${axis}_T:${t}_E:${emergNS}-${emergEW}`;
                let qKeep = 0;
                let qSwitch = 0;

                // If currently NS green (axis = 0):
                if (axis === 0) {
                  // If emergency on EW, strongly prefer switch
                  if (emergEW && !emergNS) {
                    qSwitch = 8.0;
                    qKeep = -6.0;
                  } else if (emergNS) {
                    qKeep = 8.0;
                    qSwitch = -8.0;
                  } else if (ew > ns + 1 && t >= 1) {
                    // Much longer queue on EW and minimum time spent
                    qSwitch = (ew - ns) * 2.5 + t * 1.5;
                    qKeep = -((ew - ns) * 1.5);
                  } else if (ns >= ew) {
                    // Keep clearing heavier or equal NS queue
                    qKeep = (ns + 1) * 2.0;
                    qSwitch = -2.0;
                  } else {
                    qKeep = 0.5;
                    qSwitch = -0.5;
                  }
                } else {
                  // Currently EW green (axis = 1):
                  if (emergNS && !emergEW) {
                    qSwitch = 8.0;
                    qKeep = -6.0;
                  } else if (emergEW) {
                    qKeep = 8.0;
                    qSwitch = -8.0;
                  } else if (ns > ew + 1 && t >= 1) {
                    qSwitch = (ns - ew) * 2.5 + t * 1.5;
                    qKeep = -((ns - ew) * 1.5);
                  } else if (ew >= ns) {
                    qKeep = (ew + 1) * 2.0;
                    qSwitch = -2.0;
                  } else {
                    qKeep = 0.5;
                    qSwitch = -0.5;
                  }
                }

                this.qTable.set(key, [qKeep, qSwitch]);
                this.visitsTable.set(key, 5);
              }
            }
          }
        }
      }
    }
  }

  // Choose action using epsilon-greedy policy
  selectAction(state: string, isTraining = true): ActionType {
    if (!this.qTable.has(state)) {
      this.qTable.set(state, [0, 0]);
      this.visitsTable.set(state, 0);
    }

    const [qKeep, qSwitch] = this.qTable.get(state)!;

    // Exploration
    if (isTraining && Math.random() < this.hyperparams.epsilon) {
      return Math.random() < 0.5 ? 0 : 1;
    }

    // Exploitation with small tie-breaker
    if (qKeep > qSwitch) return 0;
    if (qSwitch > qKeep) return 1;
    return 0; // Default to keep on exact tie
  }

  // Bellman Equation update:
  // Q(s, a) <- Q(s, a) + alpha * [ reward + gamma * max_a' Q(s', a') - Q(s, a) ]
  update(prevState: string, action: ActionType, reward: number, nextState: string) {
    if (!this.qTable.has(prevState)) {
      this.qTable.set(prevState, [0, 0]);
      this.visitsTable.set(prevState, 0);
    }
    if (!this.qTable.has(nextState)) {
      this.qTable.set(nextState, [0, 0]);
      this.visitsTable.set(nextState, 0);
    }

    const currentQ = this.qTable.get(prevState)!;
    const nextQ = this.qTable.get(nextState)!;

    const maxNextQ = Math.max(nextQ[0], nextQ[1]);
    const targetQ = reward + this.hyperparams.discountFactor * maxNextQ;
    const tdError = targetQ - currentQ[action];
    this.lastTDError = tdError;

    // Update Q value
    currentQ[action] += this.hyperparams.learningRate * tdError;
    this.qTable.set(prevState, currentQ);

    // Track visits
    const visits = (this.visitsTable.get(prevState) || 0) + 1;
    this.visitsTable.set(prevState, visits);

    this.totalTrainingSteps++;

    // Decay epsilon
    if (this.hyperparams.epsilon > this.hyperparams.epsilonMin) {
      this.hyperparams.epsilon = Math.max(
        this.hyperparams.epsilonMin,
        this.hyperparams.epsilon * this.hyperparams.epsilonDecay
      );
    }
  }

  // Get Q-values for a given state
  getQValues(state: string): [number, number] {
    return this.qTable.get(state) || [0, 0];
  }

  // Return a sorted list of Q-table records for the UI table inspector
  getTopRecords(limit = 40): QTableRecord[] {
    const list: QTableRecord[] = [];
    this.qTable.forEach((values, state) => {
      list.push({
        state,
        qKeep: values[0],
        qSwitch: values[1],
        visits: this.visitsTable.get(state) || 0,
        bestAction: values[0] >= values[1] ? 0 : 1,
      });
    });

    // Sort by visits descending then by absolute Q difference
    list.sort((a, b) => b.visits - a.visits || Math.abs(b.qKeep - b.qSwitch) - Math.abs(a.qKeep - a.qSwitch));
    return list.slice(0, limit);
  }

  // Reset agent to blank or reseed
  reset(seedPretrained = false) {
    this.qTable.clear();
    this.visitsTable.clear();
    this.totalTrainingSteps = 0;
    this.lastState = null;
    this.lastAction = null;
    this.lastTDError = 0;
    if (seedPretrained) {
      this.seedPretrainedKnowledge();
    }
  }
}

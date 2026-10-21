/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActionType, RLHyperparameters } from '../simulation/types';
import { DEFAULT_RL_HYPERPARAMS } from './qlearning';

export interface Transition {
  state: number[];
  action: ActionType;
  reward: number;
  nextState: number[];
  done: boolean;
}

export interface NetworkActivations {
  inputs: number[];
  hidden1: number[];
  hidden2: number[];
  outputs: [number, number];
}

export class NeuralNetwork {
  inputSize: number;
  hidden1Size: number;
  hidden2Size: number;
  outputSize: number;

  // Weights and biases
  W1: number[][]; // [hidden1Size][inputSize]
  b1: number[]; // [hidden1Size]
  W2: number[][]; // [hidden2Size][hidden1Size]
  b2: number[]; // [hidden2Size]
  W3: number[][]; // [outputSize][hidden2Size]
  b3: number[]; // [outputSize]

  constructor(inputSize = 12, hidden1Size = 32, hidden2Size = 16, outputSize = 2) {
    this.inputSize = inputSize;
    this.hidden1Size = hidden1Size;
    this.hidden2Size = hidden2Size;
    this.outputSize = outputSize;

    // Xavier/He initialization
    this.W1 = this.initMatrix(hidden1Size, inputSize, Math.sqrt(2 / inputSize));
    this.b1 = new Array(hidden1Size).fill(0.01);

    this.W2 = this.initMatrix(hidden2Size, hidden1Size, Math.sqrt(2 / hidden1Size));
    this.b2 = new Array(hidden2Size).fill(0.01);

    this.W3 = this.initMatrix(outputSize, hidden2Size, Math.sqrt(2 / hidden2Size));
    this.b3 = new Array(outputSize).fill(0.0);
  }

  private initMatrix(rows: number, cols: number, std: number): number[][] {
    const mat: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        // Box-Muller Gaussian sample
        const u1 = Math.max(1e-6, Math.random());
        const u2 = Math.random();
        const randStd = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        row.push(randStd * std);
      }
      mat.push(row);
    }
    return mat;
  }

  // Clone weights from another network (for target network sync)
  copyWeightsFrom(source: NeuralNetwork) {
    this.W1 = source.W1.map(row => [...row]);
    this.b1 = [...source.b1];
    this.W2 = source.W2.map(row => [...row]);
    this.b2 = [...source.b2];
    this.W3 = source.W3.map(row => [...row]);
    this.b3 = [...source.b3];
  }

  // Forward pass with full activation capture
  forward(input: number[]): { activations: NetworkActivations; z1: number[]; z2: number[] } {
    // Layer 1: Linear + ReLU
    const z1 = new Array(this.hidden1Size).fill(0);
    const h1 = new Array(this.hidden1Size).fill(0);
    for (let i = 0; i < this.hidden1Size; i++) {
      let sum = this.b1[i];
      for (let j = 0; j < this.inputSize; j++) {
        sum += this.W1[i][j] * (input[j] || 0);
      }
      z1[i] = sum;
      h1[i] = Math.max(0, sum); // ReLU
    }

    // Layer 2: Linear + ReLU
    const z2 = new Array(this.hidden2Size).fill(0);
    const h2 = new Array(this.hidden2Size).fill(0);
    for (let i = 0; i < this.hidden2Size; i++) {
      let sum = this.b2[i];
      for (let j = 0; j < this.hidden1Size; j++) {
        sum += this.W2[i][j] * h1[j];
      }
      z2[i] = sum;
      h2[i] = Math.max(0, sum); // ReLU
    }

    // Layer 3: Linear Output (Q values)
    const out: [number, number] = [0, 0];
    for (let i = 0; i < this.outputSize; i++) {
      let sum = this.b3[i];
      for (let j = 0; j < this.hidden2Size; j++) {
        sum += this.W3[i][j] * h2[j];
      }
      out[i] = sum;
    }

    return {
      activations: {
        inputs: [...input],
        hidden1: h1,
        hidden2: h2,
        outputs: out,
      },
      z1,
      z2,
    };
  }

  // Predict only Q-values
  predict(input: number[]): [number, number] {
    return this.forward(input).activations.outputs;
  }
}

export class DeepQAgent {
  policyNet: NeuralNetwork;
  targetNet: NeuralNetwork;
  replayBuffer: Transition[] = [];
  bufferCapacity = 2000;
  hyperparams: RLHyperparameters;
  stepCount = 0;
  targetUpdatePeriod = 40;
  batchSize = 32;
  lastLoss = 0;
  latestActivations: NetworkActivations | null = null;

  constructor(hyperparams: RLHyperparameters = DEFAULT_RL_HYPERPARAMS) {
    this.hyperparams = { ...hyperparams, rewardWeights: { ...hyperparams.rewardWeights } };
    this.policyNet = new NeuralNetwork(12, 32, 16, 2);
    this.targetNet = new NeuralNetwork(12, 32, 16, 2);
    this.targetNet.copyWeightsFrom(this.policyNet);
  }

  // Select action using epsilon-greedy over continuous features
  selectAction(state: number[], isTraining = true): { action: ActionType; qValues: [number, number] } {
    const fwd = this.policyNet.forward(state);
    this.latestActivations = fwd.activations;
    const [q0, q1] = fwd.activations.outputs;

    if (isTraining && Math.random() < this.hyperparams.epsilon) {
      const randomAction: ActionType = Math.random() < 0.5 ? 0 : 1;
      return { action: randomAction, qValues: [q0, q1] };
    }

    return {
      action: q1 > q0 ? 1 : 0,
      qValues: [q0, q1],
    };
  }

  // Add transition to experience replay buffer
  remember(state: number[], action: ActionType, reward: number, nextState: number[], done = false) {
    if (this.replayBuffer.length >= this.bufferCapacity) {
      this.replayBuffer.shift();
    }
    this.replayBuffer.push({ state, action, reward, nextState, done });
  }

  // Train one mini-batch using gradient descent on Huber/MSE loss
  trainBatch(): number {
    if (this.replayBuffer.length < this.batchSize) return 0;

    // Sample random mini-batch
    const batch: Transition[] = [];
    for (let i = 0; i < this.batchSize; i++) {
      const idx = Math.floor(Math.random() * this.replayBuffer.length);
      batch.push(this.replayBuffer[idx]);
    }

    let totalLoss = 0;
    const lr = this.hyperparams.learningRate * 0.05; // Stabilized learning rate for mini-batch

    for (const transition of batch) {
      // Forward pass on policy net
      const fwd = this.policyNet.forward(transition.state);
      const currentQ = fwd.activations.outputs[transition.action];

      // Calculate target using target net
      let targetQ = transition.reward;
      if (!transition.done) {
        const nextQ = this.targetNet.predict(transition.nextState);
        targetQ += this.hyperparams.discountFactor * Math.max(nextQ[0], nextQ[1]);
      }

      // TD Error
      const error = targetQ - currentQ;
      // Gradient clip (Huber-style)
      const clippedError = Math.max(-2.0, Math.min(2.0, error));
      totalLoss += error * error;

      // Analytical Backprop through 3 layers
      // dL/dQ = -clippedError (for the chosen action)
      const dOutputs = [0, 0];
      dOutputs[transition.action] = -clippedError;

      // Gradient for Layer 3 (Outputs -> Hidden2)
      const dH2 = new Array(this.policyNet.hidden2Size).fill(0);
      for (let j = 0; j < this.policyNet.hidden2Size; j++) {
        let grad = 0;
        for (let i = 0; i < this.policyNet.outputSize; i++) {
          grad += dOutputs[i] * this.policyNet.W3[i][j];
          this.policyNet.W3[i][j] -= lr * dOutputs[i] * fwd.activations.hidden2[j];
        }
        dH2[j] = grad;
      }
      for (let i = 0; i < this.policyNet.outputSize; i++) {
        this.policyNet.b3[i] -= lr * dOutputs[i];
      }

      // Gradient for Layer 2 (Hidden2 -> Hidden1) with ReLU derivative
      const dZ2 = dH2.map((val, idx) => (fwd.z2[idx] > 0 ? val : 0));
      const dH1 = new Array(this.policyNet.hidden1Size).fill(0);
      for (let j = 0; j < this.policyNet.hidden1Size; j++) {
        let grad = 0;
        for (let i = 0; i < this.policyNet.hidden2Size; i++) {
          grad += dZ2[i] * this.policyNet.W2[i][j];
          this.policyNet.W2[i][j] -= lr * dZ2[i] * fwd.activations.hidden1[j];
        }
        dH1[j] = grad;
      }
      for (let i = 0; i < this.policyNet.hidden2Size; i++) {
        this.policyNet.b2[i] -= lr * dZ2[i];
      }

      // Gradient for Layer 1 (Hidden1 -> Inputs) with ReLU derivative
      const dZ1 = dH1.map((val, idx) => (fwd.z1[idx] > 0 ? val : 0));
      for (let i = 0; i < this.policyNet.hidden1Size; i++) {
        for (let j = 0; j < this.policyNet.inputSize; j++) {
          this.policyNet.W1[i][j] -= lr * dZ1[i] * fwd.activations.inputs[j];
        }
        this.policyNet.b1[i] -= lr * dZ1[i];
      }
    }

    this.stepCount++;
    this.lastLoss = totalLoss / this.batchSize;

    // Periodically update target network
    if (this.stepCount % this.targetUpdatePeriod === 0) {
      this.targetNet.copyWeightsFrom(this.policyNet);
    }

    // Decay exploration
    if (this.hyperparams.epsilon > this.hyperparams.epsilonMin) {
      this.hyperparams.epsilon = Math.max(
        this.hyperparams.epsilonMin,
        this.hyperparams.epsilon * this.hyperparams.epsilonDecay
      );
    }

    return this.lastLoss;
  }

  reset() {
    this.replayBuffer = [];
    this.stepCount = 0;
    this.lastLoss = 0;
    this.latestActivations = null;
    this.policyNet = new NeuralNetwork(12, 32, 16, 2);
    this.targetNet = new NeuralNetwork(12, 32, 16, 2);
    this.targetNet.copyWeightsFrom(this.policyNet);
  }
}

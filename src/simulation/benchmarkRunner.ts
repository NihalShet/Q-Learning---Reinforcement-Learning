/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BenchmarkResult, ControllerMode, TrafficFlowConfig } from './types';
import { TrafficIntersectionModel } from './trafficModel';
import { TrafficGenerator } from './trafficGenerator';
import {
  FixedTimeController,
  ActuatedController,
  QLearningController,
  DQNController,
  TrafficController,
} from '../rl/controllers';

export async function runBenchmarkExperiment(
  flowConfig: TrafficFlowConfig,
  durationSeconds = 120, // 2 simulated minutes
  seed = 42,
  qLearningInstance?: QLearningController,
  dqnInstance?: DQNController,
  onProgress?: (progressPercent: number, currentController: string) => void
): Promise<BenchmarkResult[]> {
  const modes: ControllerMode[] = ['fixed', 'actuated', 'q_learning', 'dqn'];
  const results: BenchmarkResult[] = [];
  const dt = 0.2; // 200ms discrete physics step

  for (let m = 0; m < modes.length; m++) {
    const mode = modes[m];
    let controller: TrafficController;

    if (mode === 'fixed') {
      controller = new FixedTimeController();
    } else if (mode === 'actuated') {
      controller = new ActuatedController();
    } else if (mode === 'q_learning') {
      // Use existing trained weights or new instance
      controller = qLearningInstance || new QLearningController();
    } else {
      controller = dqnInstance || new DQNController();
    }

    const model = new TrafficIntersectionModel();
    const generator = new TrafficGenerator(flowConfig, seed); // Identical seed for all!

    let maxQueue = 0;
    let maxWait = 0;
    let queueSum = 0;
    let samples = 0;

    const totalSteps = Math.floor(durationSeconds / dt);
    const progressBase = (m / modes.length) * 100;
    const progressSpan = 100 / modes.length;

    for (let step = 0; step < totalSteps; step++) {
      const currentSimTime = step * dt;

      // Spawn traffic
      const newVehicles = generator.step(dt, model.vehicles, currentSimTime);
      for (const v of newVehicles) {
        model.addVehicle(v);
      }

      // Controller decision
      if (model.currentPhase === 0 || model.currentPhase === 2) {
        const decision = controller.decide(model, false); // Evaluate without exploration jitter
        if (decision.action === 1) {
          model.requestPhaseSwitch();
        }
      }

      // Physics step
      model.step(dt);

      // Sampling stats
      const queues = model.getQueuesByDirection();
      const currentTotalQueue = queues.NORTH + queues.SOUTH + queues.EAST + queues.WEST;
      queueSum += currentTotalQueue;
      if (currentTotalQueue > maxQueue) maxQueue = currentTotalQueue;
      samples++;

      for (const v of model.vehicles) {
        if (v.waitingTime > maxWait) maxWait = v.waitingTime;
      }

      // Yield for UI updates every 100 steps
      if (step % 100 === 0 && onProgress) {
        const stepProgress = progressBase + (step / totalSteps) * progressSpan;
        onProgress(Math.round(stepProgress), controller.name);
        await new Promise(r => setTimeout(r, 0));
      }
    }

    const stats = model.getStats();
    results.push({
      controller: mode,
      controllerName: controller.name,
      totalVehiclesSpawned: model.totalSpawned,
      totalDeparted: model.totalDeparted,
      avgWaitTime: Number(stats.avgWaitTime.toFixed(1)),
      maxWaitTime: Number(maxWait.toFixed(1)),
      avgQueueLength: Number((queueSum / Math.max(1, samples)).toFixed(1)),
      maxQueueLength: maxQueue,
      emergencyClearanceTime: Number(stats.emergencyAvgWaitTime.toFixed(1)),
      co2Grams: Math.round(stats.co2GramsEstimated),
      throughputPerMin: Number(stats.throughputPerMin.toFixed(1)),
      phaseSwitches: model.phaseSwitchCount,
    });
  }

  if (onProgress) {
    onProgress(100, 'Benchmark Complete');
  }

  return results;
}

export function generateCSVReport(results: BenchmarkResult[]): string {
  const headers = [
    'Algorithm',
    'Vehicles Spawned',
    'Vehicles Cleared',
    'Avg Wait Time (s)',
    'Max Wait Time (s)',
    'Avg Queue (veh)',
    'Max Queue (veh)',
    'Emergency Delay (s)',
    'Throughput (veh/min)',
    'Phase Switches',
    'Est CO2 Emitted (g)',
  ];

  const rows = results.map(r => [
    `"${r.controllerName}"`,
    r.totalVehiclesSpawned,
    r.totalDeparted,
    r.avgWaitTime,
    r.maxWaitTime,
    r.avgQueueLength,
    r.maxQueueLength,
    r.emergencyClearanceTime,
    r.throughputPerMin,
    r.phaseSwitches,
    r.co2Grams,
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

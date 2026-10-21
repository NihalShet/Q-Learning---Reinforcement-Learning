/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopBar, ActiveTab } from './components/TopBar';
import { IntersectionCanvas } from './components/IntersectionCanvas';
import { TelemetryCards } from './components/TelemetryCards';
import { ControlDeck } from './components/ControlDeck';
import { RealtimeCharts } from './components/RealtimeCharts';
import { QTableInspector } from './components/QTableInspector';
import { DQNArchitectureVisualizer } from './components/DQNArchitectureVisualizer';
import { BenchmarkLab } from './components/BenchmarkLab';
import { TheoryExplainer } from './components/TheoryExplainer';
import { GeminiChatbot } from './components/GeminiChatbot';
import { VideoAnimator } from './components/VideoAnimator';
import { TimeOfDayController } from './components/TimeOfDayController';

import {
  ControllerMode,
  Direction,
  RLHyperparameters,
  SimulationStats,
  TelemetryHistoryPoint,
  TimeOfDayState,
} from './simulation/types';
import { DEFAULT_TIME_OF_DAY, calculateTimeOfDayState } from './simulation/timeOfDay';
import { TrafficIntersectionModel } from './simulation/trafficModel';
import { PRESET_SCENARIOS, TrafficGenerator } from './simulation/trafficGenerator';
import {
  FixedTimeController,
  ActuatedController,
  QLearningController,
  DQNController,
  DecisionResult,
  TrafficController,
} from './rl/controllers';
import { DEFAULT_RL_HYPERPARAMS } from './rl/qlearning';

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulation');
  const [rlSubTab, setRlSubTab] = useState<'qtable' | 'dqn' | 'theory'>('qtable');

  // Simulation parameters
  const [currentMode, setCurrentMode] = useState<ControllerMode>('q_learning');
  const [speed, setSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>('asymmetricRush');
  const [isTrainingTurbo, setIsTrainingTurbo] = useState<boolean>(false);

  // Time of Day & Dynamic Rush Hour Cycle
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayState>(DEFAULT_TIME_OF_DAY);
  const timeOfDayRef = useRef<TimeOfDayState>(DEFAULT_TIME_OF_DAY);

  // Capture canvas helper for Video Animator
  const captureSimulationCanvas = (): string | null => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  // Hyperparameters
  const [hyperparams, setHyperparams] = useState<RLHyperparameters>(DEFAULT_RL_HYPERPARAMS);

  // Core Simulation & Controllers (Single persistent instances)
  const modelRef = useRef<TrafficIntersectionModel>(new TrafficIntersectionModel());
  const generatorRef = useRef<TrafficGenerator>(
    new TrafficGenerator(PRESET_SCENARIOS.asymmetricRush.config)
  );

  const fixedControllerRef = useRef<FixedTimeController>(new FixedTimeController());
  const actuatedControllerRef = useRef<ActuatedController>(new ActuatedController());
  const qControllerRef = useRef<QLearningController>(new QLearningController(DEFAULT_RL_HYPERPARAMS));
  const dqnControllerRef = useRef<DQNController>(new DQNController(DEFAULT_RL_HYPERPARAMS));

  // Current stats & telemetry for UI
  const [stats, setStats] = useState<SimulationStats>(() => {
    const initialStats = modelRef.current.getStats();
    initialStats.timeOfDay = DEFAULT_TIME_OF_DAY;
    return initialStats;
  });
  const [history, setHistory] = useState<TelemetryHistoryPoint[]>([]);
  const [lastDecision, setLastDecision] = useState<DecisionResult>({
    action: 0,
    reason: 'Initializing Q-Learning control policy...',
  });
  const [currentDiscretizedState, setCurrentDiscretizedState] = useState<string>('');
  const [currentContinuousState, setCurrentContinuousState] = useState<number[]>([]);

  // Telemetry sampling interval tracker
  const lastSampleTimeRef = useRef<number>(0);
  const decisionCountdownRef = useRef<number>(0);

  // Get active controller
  const getActiveController = useCallback((): TrafficController => {
    switch (currentMode) {
      case 'fixed':
        return fixedControllerRef.current;
      case 'actuated':
        return actuatedControllerRef.current;
      case 'q_learning':
        return qControllerRef.current;
      case 'dqn':
        return dqnControllerRef.current;
    }
  }, [currentMode]);

  // Handle Scenario Change
  const handleSelectScenario = (key: string) => {
    setSelectedScenarioKey(key);
    const scenario = PRESET_SCENARIOS[key];
    if (scenario) {
      generatorRef.current.config = { ...scenario.config };
      generatorRef.current.resetTimers();
    }
  };

  // Reset Simulation
  const handleResetSimulation = () => {
    modelRef.current.reset();
    generatorRef.current.resetTimers();
    fixedControllerRef.current.reset();
    actuatedControllerRef.current.reset();
    qControllerRef.current.reset();
    dqnControllerRef.current.reset();
    setHistory([]);
    setStats(modelRef.current.getStats());
  };

  // Reset Model weights
  const handleResetModel = () => {
    qControllerRef.current.agent.reset(true);
    dqnControllerRef.current.agent.reset();
    setHyperparams({ ...DEFAULT_RL_HYPERPARAMS });
  };

  // Update Hyperparameters
  const handleUpdateHyperparams = (updated: Partial<RLHyperparameters>) => {
    setHyperparams(prev => {
      const next = {
        ...prev,
        ...updated,
        rewardWeights: {
          ...prev.rewardWeights,
          ...(updated.rewardWeights || {}),
        },
      };
      qControllerRef.current.agent.hyperparams = next;
      dqnControllerRef.current.agent.hyperparams = next;
      return next;
    });
  };

  // Spawn vehicle on user demand
  const handleSpawnVehicle = (dir: Direction, laneIndex: number, isEmergency: boolean) => {
    const v = generatorRef.current.createVehicle(
      dir,
      laneIndex,
      isEmergency ? 'emergency' : 'car',
      modelRef.current.simulatedSeconds
    );
    modelRef.current.addVehicle(v);
  };

  // Dispatch emergency ambulance
  const handleDispatchEmergency = () => {
    const directions: Direction[] = ['EAST', 'WEST', 'NORTH', 'SOUTH'];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    handleSpawnVehicle(randomDir, 1, true);
  };

  // Time of Day handlers
  const handleChangeHour = (hour: number) => {
    setTimeOfDay(prev => {
      const updated = calculateTimeOfDayState(
        hour,
        prev.surgeActive,
        prev.surgeRemainingSec,
        'manual',
        prev.cycleSpeedMinutesPerSec
      );
      timeOfDayRef.current = updated;
      return updated;
    });
  };

  const handleToggleCycleMode = () => {
    setTimeOfDay(prev => {
      const newMode = prev.mode === 'cycle' ? 'manual' : 'cycle';
      const updated = calculateTimeOfDayState(
        prev.simulatedHour,
        prev.surgeActive,
        prev.surgeRemainingSec,
        newMode,
        prev.cycleSpeedMinutesPerSec
      );
      timeOfDayRef.current = updated;
      return updated;
    });
  };

  const handleChangeCycleSpeed = (spd: number) => {
    setTimeOfDay(prev => {
      const updated = calculateTimeOfDayState(
        prev.simulatedHour,
        prev.surgeActive,
        prev.surgeRemainingSec,
        prev.mode,
        spd
      );
      timeOfDayRef.current = updated;
      return updated;
    });
  };

  const handleTriggerSurge = () => {
    setTimeOfDay(prev => {
      const updated = calculateTimeOfDayState(
        prev.simulatedHour,
        true,
        45.0,
        prev.mode,
        prev.cycleSpeedMinutesPerSec
      );
      timeOfDayRef.current = updated;
      return updated;
    });
  };

  // Turbo Train RL: Fast simulation in background (50 episodes)
  const handleTurboTrain = async () => {
    if (isTrainingTurbo) return;
    setIsTrainingTurbo(true);

    await new Promise(r => setTimeout(r, 50));

    // Run 50 simulated minutes in fast headless loops
    const tempModel = new TrafficIntersectionModel();
    const tempGen = new TrafficGenerator(PRESET_SCENARIOS[selectedScenarioKey].config);
    const dt = 0.2;
    const steps = 3000; // ~10 minutes per batch

    for (let i = 0; i < steps; i++) {
      const curTime = i * dt;
      const newVehs = tempGen.step(dt, tempModel.vehicles, curTime);
      for (const v of newVehs) tempModel.addVehicle(v);

      if (tempModel.currentPhase === 0 || tempModel.currentPhase === 2) {
        // Tabular update
        const qDec = qControllerRef.current.decide(tempModel, true);
        if (qDec.action === 1) tempModel.requestPhaseSwitch();
        qControllerRef.current.recordOutcome(tempModel, qDec.action);

        // DQN update
        const dqnDec = dqnControllerRef.current.decide(tempModel, true);
        dqnControllerRef.current.recordOutcome(tempModel, dqnDec.action);
      }

      tempModel.step(dt);
    }

    setIsTrainingTurbo(false);
  };

  // Main Simulation Loop
  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const realDt = (now - lastTime) / 1000;
      lastTime = now;

      if (!isPaused) {
        // Cap dt to prevent huge jumps when tab was blurred
        const cappedDt = Math.min(0.1, realDt);
        const simDt = cappedDt * speed;

        const model = modelRef.current;
        const generator = generatorRef.current;
        const controller = getActiveController();

        // Sub-step integration for physical stability (sub-steps of max 0.1s)
        const subSteps = Math.ceil(simDt / 0.1);
        const stepDt = simDt / Math.max(1, subSteps);

        for (let s = 0; s < subSteps; s++) {
          // Dynamic Time of Day progression
          let curTime = timeOfDayRef.current;
          if (curTime.mode === 'cycle') {
            const hourDelta = stepDt * (curTime.cycleSpeedMinutesPerSec / 60);
            let nextSurgeActive = curTime.surgeActive;
            let nextSurgeRemaining = curTime.surgeRemainingSec;
            if (nextSurgeActive) {
              nextSurgeRemaining -= stepDt;
              if (nextSurgeRemaining <= 0) {
                nextSurgeActive = false;
                nextSurgeRemaining = 0;
              }
            }
            const updated = calculateTimeOfDayState(
              curTime.simulatedHour + hourDelta,
              nextSurgeActive,
              nextSurgeRemaining,
              curTime.mode,
              curTime.cycleSpeedMinutesPerSec
            );
            curTime = updated;
            timeOfDayRef.current = updated;
          } else if (curTime.surgeActive) {
            let nextSurgeRemaining = curTime.surgeRemainingSec - stepDt;
            let nextSurgeActive = true;
            if (nextSurgeRemaining <= 0) {
              nextSurgeActive = false;
              nextSurgeRemaining = 0;
            }
            const updated = calculateTimeOfDayState(
              curTime.simulatedHour,
              nextSurgeActive,
              nextSurgeRemaining,
              curTime.mode,
              curTime.cycleSpeedMinutesPerSec
            );
            curTime = updated;
            timeOfDayRef.current = updated;
          }

          // 1. Stochastic Traffic Arrivals with Time-of-Day Rush Hour Density Scaling
          const newVehicles = generator.step(
            stepDt,
            model.vehicles,
            model.simulatedSeconds,
            curTime.trafficMultiplier,
            curTime.simulatedHour
          );
          for (const v of newVehicles) {
            model.addVehicle(v);
          }

          // 2. Controller Policy Decision (every ~1.0s of simulated time)
          decisionCountdownRef.current -= stepDt;
          if (decisionCountdownRef.current <= 0) {
            decisionCountdownRef.current = 1.0;

            if (model.currentPhase === 0 || model.currentPhase === 2) {
              const decision = controller.decide(model, true);
              setLastDecision(decision);

              if (decision.action === 1) {
                const didSwitch = model.requestPhaseSwitch();
                if (didSwitch && controller.recordOutcome) {
                  controller.recordOutcome(model, 1);
                }
              } else {
                if (controller.recordOutcome) {
                  controller.recordOutcome(model, 0);
                }
              }
            }
          }

          // 3. Step Physics
          model.step(stepDt);
        }

        // 4. Update state representations for inspector views
        const discState = model.getDiscretizedState();
        const contState = model.getContinuousStateVector();
        setCurrentDiscretizedState(discState);
        setCurrentContinuousState(contState);

        // 5. Update Telemetry History every ~0.5s of simulated time
        if (model.simulatedSeconds - lastSampleTimeRef.current >= 0.5) {
          lastSampleTimeRef.current = model.simulatedSeconds;
          const currentStats = model.getStats();
          currentStats.timeOfDay = { ...timeOfDayRef.current };
          setStats(currentStats);
          setTimeOfDay({ ...timeOfDayRef.current });

          setHistory(prev => {
            const nextPoint: TelemetryHistoryPoint = {
              time: Number(model.simulatedSeconds.toFixed(1)),
              avgWaitTime: currentStats.avgWaitTime,
              queueLength: currentStats.currentQueueLength,
              throughput: currentStats.throughputPerMin,
              reward: qControllerRef.current.agent.getQValues(discState)[0],
              activePhase: model.currentPhase,
              epsilon: qControllerRef.current.agent.hyperparams.epsilon,
              simulatedHour: timeOfDayRef.current.simulatedHour,
              trafficMultiplier: timeOfDayRef.current.trafficMultiplier,
            };
            const updated = [...prev, nextPoint];
            return updated.length > 80 ? updated.slice(-80) : updated;
          });
        }
      }

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isPaused, speed, getActiveController]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar adhering strictly to Constitution 3-zone contract */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onTurboTrain={handleTurboTrain}
        isTrainingTurbo={isTrainingTurbo}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-5">
        {/* TAB 1: Real-time Simulation Canvas & Primary Sandbox */}
        {activeTab === 'simulation' && (
          <div className="space-y-5">
            {/* KPI Telemetry Header */}
            <TelemetryCards
              stats={stats}
              currentMode={currentMode}
              currentAction={lastDecision.action}
              lastDecisionReason={lastDecision.reason}
              epsilon={qControllerRef.current.agent.hyperparams.epsilon}
              qValues={lastDecision.qValues}
            />

            {/* Dynamic 24-Hour Time of Day & Rush Hour Controller */}
            <TimeOfDayController
              timeOfDay={timeOfDay}
              onChangeHour={handleChangeHour}
              onToggleCycleMode={handleToggleCycleMode}
              onChangeCycleSpeed={handleChangeCycleSpeed}
              onTriggerSurge={handleTriggerSurge}
            />

            {/* Split Grid: 2D Canvas + Interactive Control Deck */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left/Main Column: 2D Canvas Simulation */}
              <div className="lg:col-span-8 space-y-3">
                <IntersectionCanvas
                  model={modelRef.current}
                  onSpawnVehicle={handleSpawnVehicle}
                  timeOfDay={timeOfDay}
                />
              </div>

              {/* Right Column: Control Deck & Live Telemetry Chart */}
              <div className="lg:col-span-4 space-y-4">
                <ControlDeck
                  currentMode={currentMode}
                  onSelectMode={setCurrentMode}
                  speed={speed}
                  onSelectSpeed={setSpeed}
                  isPaused={isPaused}
                  onTogglePause={() => setIsPaused(!isPaused)}
                  onReset={handleResetSimulation}
                  selectedScenarioKey={selectedScenarioKey}
                  onSelectScenario={handleSelectScenario}
                  onDispatchEmergency={handleDispatchEmergency}
                  hyperparams={hyperparams}
                  onUpdateHyperparams={handleUpdateHyperparams}
                  onResetModel={handleResetModel}
                />

                <RealtimeCharts history={history} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RL Architecture (Q-Table, DQN, and Theory) */}
        {activeTab === 'rl_models' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
              <button
                onClick={() => setRlSubTab('qtable')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  rlSubTab === 'qtable'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Q-Table Explorer
              </button>
              <button
                onClick={() => setRlSubTab('dqn')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  rlSubTab === 'dqn'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                DQN Neural Net
              </button>
              <button
                onClick={() => setRlSubTab('theory')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  rlSubTab === 'theory'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                RL Theory &amp; Math
              </button>
            </div>

            {rlSubTab === 'qtable' && (
              <QTableInspector
                agent={qControllerRef.current.agent}
                currentStateStr={currentDiscretizedState}
              />
            )}
            {rlSubTab === 'dqn' && (
              <DQNArchitectureVisualizer
                agent={dqnControllerRef.current.agent}
                currentInputs={currentContinuousState}
              />
            )}
            {rlSubTab === 'theory' && <TheoryExplainer />}
          </div>
        )}

        {/* TAB 3: Benchmark Lab & CSV Export */}
        {activeTab === 'benchmark' && (
          <BenchmarkLab
            qController={qControllerRef.current}
            dqnController={dqnControllerRef.current}
          />
        )}

        {/* TAB 4: Gemini AI Copilot & Google Search Grounding */}
        {activeTab === 'copilot' && <GeminiChatbot />}

        {/* TAB 5: Animate Images into Video (gemini-omni-1.1-flash) */}
        {activeTab === 'video_animator' && (
          <VideoAnimator onCaptureSimulationCanvas={captureSimulationCanvas} />
        )}
      </main>

      {/* Clean Footer adhering to Constitution (no fake engines or bottom telemetry bars) */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        <p>Q-Traffic · Deep Learning & Reinforcement Learning for Intelligent Signal Control</p>
      </footer>
    </div>
  );
}

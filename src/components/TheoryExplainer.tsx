/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, Layers, Lightbulb, CheckSquare, Zap, ShieldAlert } from 'lucide-react';

export const TheoryExplainer: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'problem' | 'mdp' | 'qlearning' | 'dqn' | 'reward'>('problem');

  return (
    <div className="space-y-6">
      {/* Educational Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSection('problem')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeSection === 'problem'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>1. The Problem: Static vs RL</span>
        </button>

        <button
          onClick={() => setActiveSection('mdp')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeSection === 'mdp'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. MDP Formulation</span>
        </button>

        <button
          onClick={() => setActiveSection('qlearning')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeSection === 'qlearning'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>3. Tabular Q-Learning</span>
        </button>

        <button
          onClick={() => setActiveSection('dqn')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeSection === 'dqn'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>4. Deep Q-Network (DQN)</span>
        </button>

        <button
          onClick={() => setActiveSection('reward')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeSection === 'reward'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>5. Reward Engineering</span>
        </button>
      </div>

      {/* Section Content */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 text-slate-300 space-y-4">
        {activeSection === 'problem' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Why Conventional Traffic Controllers Fail</h3>
            <p className="text-sm leading-relaxed text-slate-300">
              Traditional urban intersections operate on <strong className="text-white">Fixed-Time Cycles</strong> (e.g., 30s green for Phase 1, followed by 30s green for Phase 2). When rush hour creates asymmetric flows—such as a crowded commuter avenue crossing a nearly vacant side street—fixed timers force dozens of vehicles to sit idling at red lights while empty lanes enjoy useless green signals.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="text-xs font-semibold text-rose-400 uppercase font-mono mb-1">Fixed-Time Pre-Timed</div>
                <p className="text-xs text-slate-400">
                  Zero sensory feedback. Cycles blindly regardless of weather, accidents, or tidal rush hours. Causes up to 40% wasted green time.
                </p>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="text-xs font-semibold text-amber-400 uppercase font-mono mb-1">Actuated Heuristic</div>
                <p className="text-xs text-slate-400">
                  Extends green when induction loops detect a car. Better than fixed timers, but myopic: lacks multi-step lookahead and cannot anticipate downstream shockwaves.
                </p>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="text-xs font-semibold text-cyan-400 uppercase font-mono mb-1">Reinforcement Learning</div>
                <p className="text-xs text-slate-400">
                  Formulates traffic management as a Markov Decision Process (MDP). Maximizes cumulative discounted rewards, learning when an early phase change yields superior network throughput.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'mdp' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Markov Decision Process (MDP) Formulation</h3>
            <p className="text-sm leading-relaxed text-slate-300">
              The traffic intersection agent interacts with the environment in discrete time intervals &Delta;t. At step t, the agent observes state s<sub>t</sub>, selects action a<sub>t</sub>, receives scalar reward r<sub>t</sub>, and transitions to next state s<sub>t+1</sub>.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <span className="text-cyan-400 font-bold block mb-1">1. State Space (S):</span>
                <span className="text-slate-300">
                  s = [ Queue_NS, Queue_EW, Active_Axis, Phase_Elapsed_Time, Emergency_Flags ]
                </span>
                <p className="text-[11px] text-slate-400 font-sans mt-1">
                  In Tabular Q-learning, queue counts are discretized into buckets (0-1, 2-4, 5-8, 9+). In Deep Q-Networks (DQN), the state is a 12-dimensional continuous feature vector normalized to [0, 1].
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <span className="text-cyan-400 font-bold block mb-1">2. Action Space (A):</span>
                <span className="text-slate-300">A = &#123; 0: KEEP_PHASE (Extend current green), 1: SWITCH_PHASE (Trigger yellow clearance) &#125;</span>
                <p className="text-[11px] text-slate-400 font-sans mt-1">
                  Traffic engineering safety constraint: Once a green phase begins, a minimum green interval (T_min = 6.0s) is strictly enforced before any switch can be triggered, preventing hazardous light flickering.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'qlearning' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Tabular Q-Learning &amp; Bellman Equation</h3>
            <p className="text-sm leading-relaxed text-slate-300">
              Q-learning is a model-free, off-policy reinforcement learning algorithm that iteratively learns the optimal action-value function Q*(s, a), representing the expected cumulative discounted future reward of taking action a in state s:
            </p>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs">
              <div className="text-cyan-300 font-bold text-sm mb-2">
                Q(s_t, a_t) &larr; Q(s_t, a_t) + &alpha; &middot; [ r_&#123;t+1&#125; + &gamma; &middot; max&#119886; Q(s_&#123;t+1&#125;, a) - Q(s_t, a_t) ]
              </div>
              <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside mt-2 font-sans">
                <li><strong className="text-slate-300 font-mono">&alpha; (Learning Rate, 0.15):</strong> Controls how rapidly new observations overwrite previous estimates.</li>
                <li><strong className="text-slate-300 font-mono">&gamma; (Discount Factor, 0.88):</strong> Weights the importance of future traffic clearing vs immediate reward.</li>
                <li><strong className="text-slate-300 font-mono">&delta;_t (Temporal Difference Error):</strong> The difference between the Bellman target (r + &gamma; max Q) and current Q-value.</li>
              </ul>
            </div>

            <h4 className="text-sm font-semibold text-white pt-2">Epsilon-Greedy Exploration Policy</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              With probability &epsilon;, the agent selects a random action to explore unvisited traffic dynamics; with probability 1 - &epsilon;, it exploits the current best known action argmax Q(s, a). The exploration rate decays geometrically: &epsilon;_&#123;next&#125; = max(&epsilon;_min, &epsilon; &times; 0.995).
            </p>
          </div>
        )}

        {activeSection === 'dqn' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Deep Q-Network (DQN) Architecture</h3>
            <p className="text-sm leading-relaxed text-slate-300">
              When intersections become complex with multiple approaches, continuous queue lengths, and varying arrival speeds, tabular representations suffer from state explosion. Deep Q-Networks approximate Q(s, a; &theta;) &asymp; Q*(s, a) using a deep neural network parameterized by weights &theta;.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <span className="text-cyan-400 font-semibold text-xs font-mono">Experience Replay Buffer</span>
                <p className="text-xs text-slate-400">
                  Consecutive traffic steps are strongly correlated. DQN stores transitions (s_t, a_t, r_t, s_&#123;t+1&#125;) in a circular replay buffer (capacity 2,000 transitions) and trains on uniformly sampled mini-batches of 32 items, breaking temporal correlations and stabilizing convergence.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <span className="text-cyan-400 font-semibold text-xs font-mono">Separate Target Network</span>
                <p className="text-xs text-slate-400">
                  Calculating targets using frequently shifting weights leads to runaway feedback loops. A clone target network with frozen parameters evaluates targets and is synchronized only every 40 steps, establishing a stable target baseline.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'reward' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Reward Engineering for Traffic Control</h3>
            <p className="text-sm leading-relaxed text-slate-300">
              The reward function $R(s, a)$ shapes agent behavior. A naive reward that only counts passed cars will induce rapid phase cycling that starves vehicles during yellow clearance intervals.
            </p>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs">
              <div className="text-emerald-400 font-bold mb-2">
                R = - ( w_q · TotalQueue + w_w · AvgWait + w_e · EmergencyDelay + w_s · SwitchPenalty )
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-400 text-[11px] font-sans mt-3">
                <div>
                  <strong className="text-slate-200">Total Queue Penalty (w_q = 1.2):</strong> Penalizes accumulating cars before the stop bar across all 4 approaches.
                </div>
                <div>
                  <strong className="text-slate-200">Average Delay Penalty (w_w = 0.08):</strong> Punishes long individual wait times to ensure fairness and prevent vehicle starvation.
                </div>
                <div>
                  <strong className="text-slate-200">Emergency Preemption (w_e = 4.5):</strong> Heavy weight penalizing stopped ambulances, teaching the agent to immediately clear sirens.
                </div>
                <div>
                  <strong className="text-slate-200">Switch Penalty (w_s = 0.5):</strong> Discourages frivolous switching which wastes 3.5s per cycle in yellow clearance.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

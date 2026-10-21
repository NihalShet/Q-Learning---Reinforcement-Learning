/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Search,
  Bot,
  User,
  Sparkles,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  Zap,
  BrainCircuit,
  MessageSquare,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
  grounding?: {
    sources: { title: string; url: string }[];
    queries: string[];
    searchEntryPoint?: string | null;
  };
  timestamp: string;
}

export const GeminiChatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'model',
      text: `Hello! I am your **Q-Traffic Copilot**, an AI traffic systems engineer and reinforcement learning specialist. 

I can help you:
- Analyze traffic flow dynamics, queuing bottlenecks, and delay metrics.
- Formulate Markov Decision Processes (MDPs), Bellman equations, and reward functions.
- Optimize Tabular Q-Learning and Deep Q-Networks (DQN).
- Retrieve real-world Department of Transportation (DOT) signal timing standards and latest research using **Google Search Grounding**.

How can I assist your traffic optimization today?`,
      modelUsed: 'gemini-3.8-flash',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-4-argon' | 'gemini-3.1-flash-lite'>('gemini-3.8-flash');
  const [useSearch, setUseSearch] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      // Build history for the API
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          model: selectedModel,
          useSearch: useSearch && selectedModel === 'gemini-3.8-flash',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const modelMsg: ChatMessage = {
        id: `model_${Date.now()}`,
        role: 'model',
        text: data.text || 'No response returned from model.',
        modelUsed: data.model || selectedModel,
        grounding: data.grounding,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'model',
        text: `Error contacting Gemini API: ${err.message || 'Please check your connection and API key.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome_reset',
        role: 'model',
        text: 'Conversation cleared. How can I help with your Q-learning traffic project?',
        modelUsed: selectedModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const quickPrompts = [
    'Search latest 2026 smart traffic signal reinforcement learning benchmarks',
    'How should we adjust reward weights for priority ambulances vs commuter buses?',
    'Explain the mathematical difference between Tabular Q-learning and Deep Q-Networks (DQN)',
    'What are FHWA guidelines on minimum green and yellow clearance intervals?',
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[650px] shadow-xl">
      {/* Top Header & Model / Search Selector */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Q-Traffic AI Copilot</span>
            </h3>
            <div className="text-[11px] text-slate-400">
              Role: AI Traffic Systems Engineer & RL Researcher
            </div>
          </div>
        </div>

        {/* Model and Feature Controls */}
        <div className="flex items-center gap-2">
          {/* Model Selector */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setSelectedModel('gemini-3.8-flash')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer flex items-center gap-1 ${
                selectedModel === 'gemini-3.8-flash'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="General tasks + Search Grounding"
            >
              <span>3.8 Flash</span>
            </button>
            <button
              onClick={() => setSelectedModel('gemini-4-argon')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer flex items-center gap-1 ${
                selectedModel === 'gemini-4-argon'
                  ? 'bg-purple-500 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Particularly complex reasoning & mathematical tasks"
            >
              <BrainCircuit className="w-3 h-3" />
              <span>4 Argon</span>
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
              className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer flex items-center gap-1 ${
                selectedModel === 'gemini-3.1-flash-lite'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tasks that should happen fast"
            >
              <Zap className="w-3 h-3" />
              <span>Lite</span>
            </button>
          </div>

          {/* Google Search Grounding Toggle */}
          <button
            onClick={() => setUseSearch(!useSearch)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
              useSearch && selectedModel === 'gemini-3.8-flash'
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title="Search Grounding with Google Search (gemini-3.8-flash)"
          >
            <Search className="w-3 h-3" />
            <span>Search Grounding</span>
          </button>

          {/* Clear Thread */}
          <button
            onClick={handleClear}
            className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                  isUser
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-cyan-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-1.5 max-w-[85%]">
                <div
                  className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                    isUser
                      ? 'bg-cyan-600 text-white rounded-tr-none'
                      : 'bg-slate-950/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans space-y-2">{msg.text}</div>

                  {/* Google Search Grounding Sources Box */}
                  {!isUser && msg.grounding?.sources && msg.grounding.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] space-y-1.5 font-mono">
                      <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                        <Search className="w-3 h-3" />
                        <span>Google Search Grounding Sources</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.grounding.sources.slice(0, 4).map((src, i) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-0.5 bg-slate-900 border border-slate-700 hover:border-cyan-500 rounded text-slate-300 hover:text-cyan-300 transition-colors"
                          >
                            <span className="truncate max-w-[180px]">{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Web search queries tag */}
                  {!isUser && msg.grounding?.queries && msg.grounding.queries.length > 0 && (
                    <div className="mt-2 text-[10px] text-slate-400 font-mono">
                      <span>Search queries: </span>
                      {msg.grounding.queries.join(', ')}
                    </div>
                  )}
                </div>

                {/* Message Meta Info */}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono px-1">
                  <span>{msg.timestamp}</span>
                  {msg.modelUsed && <span>· {msg.modelUsed}</span>}
                  {!isUser && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      {copiedId === msg.id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>
                {useSearch && selectedModel === 'gemini-3.8-flash'
                  ? 'Searching Google & reasoning with gemini-3.8-flash...'
                  : `Generating response with ${selectedModel}...`}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-2 overflow-x-auto text-[11px]">
        <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
          <MessageSquare className="w-3 h-3" /> Quick Prompts:
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            disabled={isLoading}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white whitespace-nowrap transition-colors cursor-pointer shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask Q-Traffic Copilot using ${selectedModel}...`}
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

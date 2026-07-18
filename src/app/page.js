'use client';

import { useState } from 'react';
import { AVAILABLE_MODELS } from '../lib/models/registry.js';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState(['gemini-3.1-flash-lite', 'groq-llama-3-3-70b']);
  const [evaluatorId, setEvaluatorId] = useState('groq-llama-3-3-70b');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Enforce selection limit of max 3 models for the parallel runner
  const handleModelToggle = (modelId) => {
    if (selectedModels.includes(modelId)) {
      setSelectedModels(selectedModels.filter(id => id !== modelId));
    } else {
      if (selectedModels.length >= 3) {
        alert('You can select a maximum of 3 models for parallel execution.');
        return;
      }
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  const handleRun = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return alert('Please enter a prompt.');
    if (selectedModels.length === 0) return alert('Please select at least one model.');

    setIsLoading(true);
    setError(null);
    setResult(null);
    setStatusText('Sending concurrent requests to models...');

    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          modelIds: selectedModels,
          evaluatorId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Pipeline execution failed.');
      }

      setStatusText('Processing answers and synthesizing final response...');
      const data = await response.json();
      setResult(data);
      if (data.responses && data.responses.length > 0) {
        setActiveTab(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-7xl flex flex-col gap-6">
        
        {/* Header */}
        <header className="text-center py-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Self-Consistency AI Orchestrator
          </h1>
          <p className="mt-1 text-slate-400 text-sm max-w-xl mx-auto">
            Run prompts concurrently, compile differences, and synthesize answers using structured evaluation.
          </p>
        </header>

        {/* Top Row: Configuration Settings */}
        <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Target Models Checklist */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Parallel Models (Select up to 3)
            </span>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_MODELS.map(model => {
                const isChecked = selectedModels.includes(model.id);
                const isDisabled = !isChecked && selectedModels.length >= 3;
                return (
                  <label
                    key={model.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs transition-all duration-200 ${
                      isChecked
                        ? 'bg-indigo-950/40 border-indigo-500 text-slate-100'
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-700'
                    } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={() => handleModelToggle(model.id)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 w-3.5 h-3.5"
                    />
                    <span className="font-medium">{model.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Evaluator Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Evaluator Model
            </span>
            <select
              value={evaluatorId}
              onChange={(e) => setEvaluatorId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-200"
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Second Row: Question Input */}
        <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-1">
            <textarea
              id="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your question here..."
              rows={2}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-sm transition-all duration-200"
            />
          </div>
          <button
            onClick={handleRun}
            disabled={isLoading}
            className={`md:w-60 flex items-center justify-center rounded-xl font-bold transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm py-4 md:py-0 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'
            }`}
          >
            {isLoading ? statusText || 'Running...' : 'Run Consistency Pipeline'}
          </button>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-sm">
            <strong>Error: </strong> {error}
          </div>
        )}

        {/* Running Loader */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-400 text-xs font-medium animate-pulse">{statusText}</p>
          </div>
        )}

        {/* Third Row: Side-by-Side Results Grid */}
        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            
            {/* Left Column: Synthesized Answer & Evaluator Reasoning */}
            <div className="flex flex-col gap-6">
              
              {/* Synthesized Answer Card */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 relative overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2.5">
                  <h3 className="text-lg font-bold text-slate-200">
                    Synthesized Answer
                  </h3>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full tracking-wider ${
                    result.evaluation.confidence === 'high' ? 'bg-emerald-950/50 border border-emerald-500 text-emerald-400' :
                    result.evaluation.confidence === 'medium' ? 'bg-amber-950/50 border border-amber-500 text-amber-400' :
                    'bg-rose-950/50 border border-rose-500 text-rose-400'
                  }`}>
                    CONFIDENCE: {result.evaluation.confidence.toUpperCase()}
                  </span>
                </div>
                <div className="text-slate-300 leading-relaxed text-sm whitespace-pre-line flex-1">
                  {result.evaluation.finalAnswer}
                </div>
              </div>

              {/* Evaluator Reasoning Card */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-5">
                <h3 className="text-lg font-bold text-slate-200 mb-3 border-b border-slate-800 pb-2.5">
                  Evaluator Reasoning
                </h3>
                <p className="text-slate-300 leading-relaxed text-xs mb-4">
                  {result.evaluation.reasoning}
                </p>

                <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
                  Model Strengths / Contributions
                </h4>
                <div className="flex flex-col gap-2.5">
                  {result.evaluation.contributions.map((contrib, i) => (
                    <div key={i} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col gap-0.5">
                      <strong className="text-xs text-indigo-400">{contrib.modelId}</strong>
                      <p className="text-slate-300 text-xs mt-0.5">{contrib.strengths}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Intermediate Model Outputs (Elongated) */}
            {result.responses && result.responses.length > 0 && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 flex flex-col">
                <div className="border-b border-slate-800 pb-2 mb-3">
                  <h3 className="text-lg font-bold text-slate-200">
                    Intermediate Model Outputs
                  </h3>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-800 mb-3 overflow-x-auto gap-2">
                  {result.responses.map((resp, i) => (
                    <button
                      key={resp.modelId}
                      onClick={() => setActiveTab(i)}
                      className={`py-2 px-3 font-semibold text-xs border-b-2 transition-all duration-200 whitespace-nowrap ${
                        activeTab === i
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {resp.modelId} ({resp.duration}s)
                    </button>
                  ))}
                </div>

                {/* Tab Content (Fills remaining height) */}
                <div className="flex-1 p-4 bg-slate-950/50 border border-slate-850 rounded-xl min-h-[300px] max-h-[600px] overflow-y-auto">
                  <div className="text-slate-300 leading-relaxed whitespace-pre-line text-xs">
                    {result.responses[activeTab]?.response}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}

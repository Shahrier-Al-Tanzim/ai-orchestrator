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
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to Matte Dark Mode

  // Streaming specific states
  const [streamingOutputs, setStreamingOutputs] = useState({}); // { modelId: text }
  const [streamingFinalAnswer, setStreamingFinalAnswer] = useState('');
  const [streamProgress, setStreamProgress] = useState(''); // 'models' | 'evaluator' | 'done'

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
    setStreamingFinalAnswer('');
    
    // Initialize stream buckets for each selected model
    const initialOutputs = {};
    selectedModels.forEach(id => {
      initialOutputs[id] = '';
    });
    setStreamingOutputs(initialOutputs);
    setActiveTab(0);
    setStreamProgress('models');
    setStatusText('Running concurrent models...');

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

      if (!response.body) {
        throw new Error('ReadableStream not supported by response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split SSE data chunks
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // keep trailing incomplete block

        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.substring(6));

              if (event.type === 'model-chunk') {
                setStreamingOutputs(prev => ({
                  ...prev,
                  [event.modelId]: (prev[event.modelId] || '') + event.text
                }));
              } else if (event.type === 'evaluator-start') {
                setStreamProgress('evaluator');
                setStatusText('Synthesizing responses...');
              } else if (event.type === 'evaluator-chunk') {
                setStreamingFinalAnswer(prev => prev + event.text);
              } else if (event.type === 'evaluator-end') {
                setResult({
                  evaluation: event.evaluation,
                  responses: event.responses
                });
                setStreamProgress('done');
              } else if (event.type === 'model-error') {
                setStreamingOutputs(prev => ({
                  ...prev,
                  [event.modelId]: (prev[event.modelId] || '') + `\n\n❌ Error: ${event.error}`
                }));
              } else if (event.type === 'error') {
                throw new Error(event.message);
              }
            } catch (jsonErr) {
              // Ignore line splits that aren't full JSON yet
            }
          }
        }
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  // Color Palette Definitions (Light: Sand Beige/Editorial vs. Dark: Matte Black/Ash)
  const themeBg = isDarkMode ? 'bg-[#1C1C1E] text-[#E5E5EA]' : 'bg-[#E5DFD3] text-[#1c1917]';
  const themeCard = isDarkMode ? 'bg-[#2C2C2E] border-[#3A3A3C] shadow-md' : 'bg-[#FAF8F5] border-stone-300 shadow-sm';
  const themeBorder = isDarkMode ? 'border-[#3A3A3C]' : 'border-stone-300';
  const themeSelect = isDarkMode ? 'bg-[#1C1C1E] text-[#E5E5EA] border-[#3A3A3C]' : 'bg-white text-[#1c1917] border-stone-300';
  const themeInput = isDarkMode ? 'bg-[#1C1C1E] border-[#3A3A3C] text-white placeholder-zinc-500' : 'bg-white border-stone-300 text-[#1c1917] placeholder-stone-400';
  const themeResponseBox = isDarkMode ? 'bg-[#1C1C1E]/80 border-[#3A3A3C]' : 'bg-white border-stone-300';
  const themeContributionCard = isDarkMode ? 'bg-[#1C1C1E]/50 border-[#3A3A3C]/85' : 'bg-[#E5DFD3]/40 border-stone-300/80';
  const themeButton = isDarkMode 
    ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200' 
    : 'bg-[#1c1917] text-[#FAF8F5] hover:bg-stone-800';

  // Check if we should render streaming models or final result responses
  const showResults = streamProgress !== '';

  return (
    <main className={`min-h-screen transition-colors duration-300 flex flex-col items-center p-4 md:p-8 ${themeBg}`}>
      <div className="w-full max-w-[1700px] flex flex-col gap-6">
        
        {/* Header Row */}
        <header className="flex justify-between items-center py-2 border-b border-dashed pb-4 border-stone-400 dark:border-[#3A3A3C]">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif">
              AI Orchestrator
            </h1>
            <p className="mt-0.5 text-xs text-stone-600 dark:text-zinc-400">
              Real-time streaming self-consistency pipeline.
            </p>
          </div>
          
          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label="Toggle Theme"
            className={`p-2 rounded-full border transition-all duration-200 hover:scale-105 ${
              isDarkMode ? 'bg-[#2C2C2E] border-[#3A3A3C] text-amber-400' : 'bg-white border-stone-300 text-zinc-950 shadow-sm'
            }`}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="2 2 20 20" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="2 2 20 20" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </header>

        {/* Top Row: Configuration Settings */}
        <section className={`border rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center transition-all duration-300 ${themeCard}`}>
          
          {/* Target Models - Pill Selection */}
          <div className="md:col-span-2 flex flex-col gap-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
              Parallel Models (Select up to 3)
            </span>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_MODELS.map(model => {
                const isChecked = selectedModels.includes(model.id);
                const isDisabled = !isChecked && selectedModels.length >= 3;
                
                let pillStyle = '';
                if (isChecked) {
                  pillStyle = isDarkMode
                    ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-sm'
                    : 'bg-[#1c1917] text-[#FAF8F5] border-[#1c1917] shadow-sm';
                } else {
                  pillStyle = isDarkMode
                    ? 'bg-[#1C1C1E] text-zinc-400 border-[#3A3A3C] hover:bg-[#3A3A3C] hover:text-zinc-200'
                    : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100 hover:text-stone-900';
                }

                return (
                  <button
                    key={model.id}
                    disabled={isDisabled}
                    onClick={() => handleModelToggle(model.id)}
                    className={`px-4 py-2 rounded-full border text-xs font-semibold select-none transition-all duration-200 ${pillStyle} ${
                      isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'
                    }`}
                  >
                    {model.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evaluator Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
              Evaluator Model
            </span>
            <select
              value={evaluatorId}
              onChange={(e) => setEvaluatorId(e.target.value)}
              className={`w-full p-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-stone-400 transition-all duration-200 ${themeSelect}`}
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
        <section className={`border rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-stretch transition-all duration-300 ${themeCard}`}>
          <div className="flex-1">
            <textarea
              id="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your question here..."
              rows={2}
              className={`w-full p-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-stone-400 resize-none transition-all duration-200 ${themeInput}`}
            />
          </div>
          <button
            onClick={handleRun}
            disabled={isLoading}
            className={`md:w-60 flex items-center justify-center rounded-xl font-bold transition-all duration-200 text-sm py-4 md:py-0 ${themeButton} ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'
            }`}
          >
            {isLoading ? statusText || 'Running...' : 'Run Consistency Pipeline'}
          </button>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-950/20 border border-red-800/40 rounded-xl text-red-400 text-sm">
            <strong>Error: </strong> {error}
          </div>
        )}

        {/* Third Row: Side-by-Side Streaming Grid */}
        {showResults && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            
            {/* Left Column: Synthesized Answer (Streams) & Evaluator Details */}
            <div className="flex flex-col gap-6">
              
              {/* Synthesized Answer Card */}
              <div className={`border rounded-2xl p-5 relative overflow-hidden flex flex-col transition-all duration-300 ${themeCard}`}>
                <div className={`flex justify-between items-center mb-3 border-b pb-2.5 ${themeBorder}`}>
                  <h3 className="text-lg font-bold font-serif">
                    Synthesized Answer
                  </h3>
                  
                  {result && (
                    <span className={`px-2.5 py-0.5 text-[9px] font-extrabold rounded-full tracking-wider border ${
                      result.evaluation.confidence === 'high' ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' :
                      result.evaluation.confidence === 'medium' ? 'bg-amber-950/20 border-amber-500/50 text-amber-600 dark:text-amber-500' :
                      'bg-rose-950/20 border-rose-500/50 text-rose-600 dark:text-rose-400'
                    }`}>
                      CONFIDENCE: {result.evaluation.confidence.toUpperCase()}
                    </span>
                  )}
                </div>
                
                {/* Streams Evaluator Response Word by Word */}
                <div className="leading-relaxed text-sm whitespace-pre-line flex-1 opacity-90 min-h-[100px]">
                  {streamingFinalAnswer || (streamProgress === 'models' ? (
                    <span className="text-stone-400 dark:text-zinc-500 italic text-xs">
                      Waiting for parallel models to finish...
                    </span>
                  ) : (
                    <span className="text-stone-400 dark:text-zinc-500 italic text-xs animate-pulse">
                      Synthesizing response...
                    </span>
                  ))}
                </div>
              </div>

              {/* Evaluator Reasoning Card */}
              <div className={`border rounded-2xl p-5 transition-all duration-300 ${themeCard}`}>
                <h3 className={`text-lg font-bold font-serif mb-3 border-b pb-2.5 ${themeBorder}`}>
                  Evaluator Reasoning
                </h3>
                
                {result ? (
                  <>
                    <p className="leading-relaxed text-xs mb-4 opacity-80">
                      {result.evaluation.reasoning}
                    </p>

                    <h4 className="text-[10px] font-bold tracking-wider opacity-60 uppercase mb-2">
                      Model Strengths / Contributions
                    </h4>
                    <div className="flex flex-col gap-2.5">
                      {result.evaluation.contributions.map((contrib, i) => (
                        <div key={i} className={`p-3 border rounded-xl flex flex-col gap-0.5 ${themeContributionCard}`}>
                          <strong className="text-xs text-stone-600 dark:text-zinc-300">{contrib.modelId}</strong>
                          <p className="text-xs mt-0.5 opacity-90">{contrib.strengths}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-stone-400 dark:text-zinc-500 italic">
                    Reasoning details will load once synthesis completes.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Intermediate Model Outputs (Streams) */}
            <div className={`border rounded-2xl p-5 flex flex-col transition-all duration-300 ${themeCard}`}>
              <div className={`border-b pb-2 mb-3 ${themeBorder}`}>
                <h3 className="text-lg font-bold font-serif">
                  Intermediate Model Outputs
                </h3>
              </div>

              {/* Tab Navigation */}
              <div className={`flex border-b mb-3 overflow-x-auto gap-2 ${themeBorder}`}>
                {selectedModels.map((modelId, i) => {
                  const isActive = activeTab === i;
                  const hasContent = !!streamingOutputs[modelId];
                  const tabLine = isActive
                    ? isDarkMode ? 'border-zinc-300 text-zinc-100' : 'border-stone-800 text-stone-900'
                    : 'border-transparent text-stone-400 dark:text-zinc-500 hover:text-stone-900 dark:hover:text-zinc-300';
                  
                  return (
                    <button
                      key={modelId}
                      onClick={() => setActiveTab(i)}
                      className={`py-2 px-3 font-semibold text-xs border-b-2 transition-all duration-200 whitespace-nowrap ${tabLine}`}
                    >
                      {modelId} {!hasContent && isLoading ? ' (Loading...)' : ''}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content (Fills remaining height) */}
              <div className={`flex-1 p-4 rounded-xl min-h-[300px] max-h-[480px] overflow-y-auto ${themeResponseBox}`}>
                <div className="leading-relaxed whitespace-pre-line text-xs opacity-90">
                  {streamingOutputs[selectedModels[activeTab]] || (
                    <span className="text-stone-400 dark:text-zinc-500 italic">
                      Model stream is starting...
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}

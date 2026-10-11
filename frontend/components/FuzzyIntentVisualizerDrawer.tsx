import React from 'react';
import { Terminal, Code2, X, Sparkles, Check, Clock, Cpu, ArrowRight } from 'lucide-react';
import { ExtractedDebugSchema } from '../types';

interface FuzzyIntentVisualizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debugData: ExtractedDebugSchema | null;
  rawSpokenInput: string;
}

export const FuzzyIntentVisualizerDrawer: React.FC<FuzzyIntentVisualizerDrawerProps> = ({
  isOpen,
  onClose,
  debugData,
  rawSpokenInput,
}) => {
  if (!isOpen) return null;

  // Fallback demo object if drawer is opened standalone
  const activeData: ExtractedDebugSchema = debugData || {
    intent: "Take blood pressure medication",
    category: "medication",
    raw_trigger: "after my tea",
    resolved_time: "16:15 IST",
    source: "patient",
    confidence: 0.98,
    resurfacingPrompt: "You mentioned earlier that you wanted to take your blood pressure medication after your tea.",
    latencyMs: 312
  };

  const jsonSnippet = {
    "intent": activeData.intent,
    "category": activeData.category,
    "raw_trigger": activeData.raw_trigger,
    "resolved_time": activeData.resolved_time,
    "source": activeData.source
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end md:items-center justify-end p-0 md:p-6 transition-all animate-fade-in">
      <div 
        className="bg-[#121815] text-slate-100 rounded-t-3xl md:rounded-3xl w-full md:max-w-xl shadow-2xl border border-remi-800/80 p-5 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-remi-900 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-remi-500/20 text-remi-400 flex items-center justify-center border border-remi-500/30">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">The "Fuzzy Intent" Visualizer</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-remi-500/20 text-remi-300 border border-remi-400/30">
                  Beat 1 (30s)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Gemini 2.5 Flash Structured Schema</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Spoken input comparison */}
        <div className="bg-black/40 rounded-2xl p-3.5 border border-slate-800 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Natural Spoken Utterance</span>
            <span className="text-remi-400 font-semibold">{activeData.latencyMs || 280}ms inference</span>
          </div>
          <div className="text-sm sm:text-base font-serif italic text-emerald-200">
            "{rawSpokenInput || "I'm going to take my blood pressure pills right after my tea."}"
          </div>
        </div>

        {/* Visual Pipeline Mapping Cards */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Spoken Trigger</span>
            <span className="text-amber-300 font-semibold">"{activeData.raw_trigger}"</span>
          </div>
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Resolved Clock</span>
            <span className="text-remi-300 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-remi-400" />
              {activeData.resolved_time}
            </span>
          </div>
        </div>

        {/* Split Screen JSON Code Block */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-remi-400" />
              <span>Extracted JSON Payload</span>
            </span>
            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
              <Check className="w-3 h-3" /> Validated Schema
            </span>
          </div>

          <div className="bg-[#0b0f0d] p-4 rounded-2xl border border-remi-900 font-mono text-xs text-emerald-300 leading-relaxed overflow-x-auto shadow-inner">
            <pre className="text-[12px]">
{JSON.stringify(jsonSnippet, null, 2)}
            </pre>
          </div>
        </div>

        {/* Warm Resurfacing Output Preview */}
        <div className="bg-remi-950/70 p-3.5 rounded-2xl border border-remi-800/50 space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-remi-400 block">
            Generated Remi Voice Phrasing
          </span>
          <p className="text-xs sm:text-sm text-slate-200 font-sans italic">
            "{activeData.resurfacingPrompt}"
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400 font-sans">
            Solves the problem of older adults forgetting short-term self-stated intents.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-remi-600 hover:bg-remi-500 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { Sparkles, Play, Code2, Volume2, Smartphone, X, CheckCircle2, ChevronRight } from 'lucide-react';

interface DemoScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunBeat1: () => void;
  onRunBeat2: () => void;
  onRunBeat3: () => void;
  onOpenVisualizer: () => void;
  onOpenAudioContrast: () => void;
}

export const DemoScriptModal: React.FC<DemoScriptModalProps> = ({
  isOpen,
  onClose,
  onRunBeat1,
  onRunBeat2,
  onRunBeat3,
  onOpenVisualizer,
  onOpenAudioContrast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-remi-800">
            <Sparkles className="w-5 h-5 text-warmth-500" />
            <div>
              <h2 className="text-base sm:text-xl font-serif font-bold text-slate-900">
                Remi ~2.5 Minute Demo Guide
              </h2>
              <span className="text-[11px] text-slate-500 font-sans">
                AI Builder Cup — Google Cloud Sustainability & Social Impact
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:bg-slate-200"
            aria-label="Close guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-600">
          Run the 3 unforgettable beats from the pitch script:
        </p>

        <div className="space-y-3">
          {/* Beat 1 */}
          <div className="p-4 rounded-2xl bg-remi-50/80 border border-remi-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-remi-900 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-remi-600 shrink-0" />
                Beat 1 (30s) — The "Fuzzy Intent" Visualizer
              </span>
              <button
                onClick={() => {
                  onRunBeat1();
                  onClose();
                }}
                className="px-3 py-1 bg-remi-600 hover:bg-remi-700 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs shrink-0 touch-manipulation"
              >
                <Play className="w-3 h-3" />
                <span>Run Beat 1</span>
              </button>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Utterance: <em>"I'm going to take my blood pressure pills right after my tea."</em>
              <br />
              Shows live split-screen debug drawer with Gemini parsing <code className="bg-white px-1 rounded text-remi-800 font-mono">raw_trigger: "after my tea"</code> → <code className="bg-white px-1 rounded text-remi-800 font-mono">resolved_time: "16:15 IST"</code>.
            </p>
            <button
              onClick={() => {
                onOpenVisualizer();
                onClose();
              }}
              className="text-[11px] text-remi-700 font-semibold underline flex items-center gap-1"
            >
              Open live schema visualizer drawer directly →
            </button>
          </div>

          {/* Beat 2 */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warmth-700 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-warmth-600 shrink-0" />
                Beat 2 (45s) — Side-by-Side Audio Contrast
              </span>
              <button
                onClick={() => {
                  onOpenAudioContrast();
                  onClose();
                }}
                className="px-3 py-1 bg-warmth-500 hover:bg-warmth-600 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs shrink-0 touch-manipulation"
              >
                <Play className="w-3 h-3" />
                <span>Open Audio Studio</span>
              </button>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Play <strong>Track A (Self-Stated Agency)</strong>: <em>"You mentioned earlier that you wanted to call your daughter..."</em> vs <strong>Track B (Caregiver Sourced)</strong>: <em>"Your daughter Priya left a note: you two are meeting in the park at 4:00 PM."</em>
            </p>
          </div>

          {/* Beat 3 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-slate-600 shrink-0" />
                Beat 3 (45s) — Caregiver "Peace of Mind" View
              </span>
              <button
                onClick={() => {
                  onRunBeat3();
                  onClose();
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs shrink-0 touch-manipulation"
              >
                <Play className="w-3 h-3" />
                <span>Simulate Push</span>
              </button>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Displays mobile push notification on Sarah's phone: <em>"Mom completed her self-stated goal: Watered the plants (1:45 PM)."</em> Shows weekly scorecard closing loop across patient, system, & family.
            </p>
          </div>
        </div>

        <div className="text-right pt-2 pb-safe">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
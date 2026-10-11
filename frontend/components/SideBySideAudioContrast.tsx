import React, { useState } from 'react';
import { Volume2, Play, Pause, Sparkles, User, HeartHandshake, ShieldCheck, Check } from 'lucide-react';
import { speakGentleVoice, stopSpeaking } from '../services/speechService';

interface SideBySideAudioContrastProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SideBySideAudioContrast: React.FC<SideBySideAudioContrastProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [activeTrack, setActiveTrack] = useState<'A' | 'B' | null>(null);

  const trackA = {
    id: 'A',
    title: 'Track A: Self-Stated Agency',
    source: 'Patient Self-Stated',
    voicePrompt: 'You mentioned earlier that you wanted to call your daughter after lunch.',
    intent: 'Call daughter Priya',
    trigger: 'after lunch',
    tone: 'Reinforces self-determination & autonomy',
    quote: '"You mentioned earlier that you wanted to..."',
    bg: 'bg-emerald-50/70 border-emerald-300 text-emerald-950',
    btnBg: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    ringColor: 'ring-emerald-200'
  };

  const trackB = {
    id: 'B',
    title: 'Track B: Caregiver-Sourced',
    source: 'Caregiver Collaboration',
    voicePrompt: 'Your daughter Priya left a note: you two are meeting in the park at 4:00 PM.',
    intent: 'Meeting Priya in park',
    trigger: 'at 4:00 PM',
    tone: 'Warm family connection, avoids feeling commanded',
    quote: '"Your daughter Priya left a note..."',
    bg: 'bg-amber-50/70 border-amber-300 text-amber-950',
    btnBg: 'bg-warmth-500 hover:bg-warmth-600 text-white',
    ringColor: 'ring-amber-200'
  };

  const handlePlayTrack = (trackId: 'A' | 'B') => {
    stopSpeaking();
    if (activeTrack === trackId) {
      setActiveTrack(null);
      return;
    }

    setActiveTrack(trackId);
    const target = trackId === 'A' ? trackA : trackB;

    speakGentleVoice(target.voicePrompt, () => {
      setActiveTrack(null);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-all animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-remi-100 text-remi-700 rounded-2xl">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-serif font-bold text-slate-900">
                  Side-by-Side Audio Contrast
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-warmth-100 text-warmth-700">
                  Beat 2 (45s)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Linguistic distinction: Self-Stated agency vs Caregiver-sourced love
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Cognitive Dignity Callout */}
        <div className="p-3.5 bg-remi-50 rounded-2xl border border-remi-200 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-remi-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-remi-900">Why this matters:</strong> People with early dementia resist generic commands like <em>"Take your pill now"</em>. Remi anchors reminders either to the patient's own self-chosen words or to affectionate family reminders.
          </div>
        </div>

        {/* Two Tracks Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Track A */}
          <div className={`p-4 sm:p-5 rounded-3xl border-2 transition-all space-y-3.5 ${trackA.bg} ${activeTrack === 'A' ? 'ring-4 ring-emerald-200 scale-101' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Track A: Self-Stated
              </span>
              {activeTrack === 'A' && (
                <span className="animate-pulse flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <Volume2 className="w-3.5 h-3.5" /> Playing
                </span>
              )}
            </div>

            <div className="text-sm font-serif font-medium leading-relaxed bg-white/80 p-3 rounded-2xl border border-emerald-200/60 shadow-2xs">
              "{trackA.voicePrompt}"
            </div>

            <p className="text-[11px] text-emerald-800 font-medium">
              💡 <strong>Effect:</strong> Reminds the elder of their <em>own decision</em>, preserving dignity & pride.
            </p>

            <button
              onClick={() => handlePlayTrack('A')}
              className={`w-full py-3 px-4 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95 ${trackA.btnBg}`}
            >
              {activeTrack === 'A' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{activeTrack === 'A' ? 'Stop Voice' : 'Play Track A Voice'}</span>
            </button>
          </div>

          {/* Track B */}
          <div className={`p-4 sm:p-5 rounded-3xl border-2 transition-all space-y-3.5 ${trackB.bg} ${activeTrack === 'B' ? 'ring-4 ring-amber-200 scale-101' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-bold text-warmth-700 flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5" />
                Track B: Caregiver-Sourced
              </span>
              {activeTrack === 'B' && (
                <span className="animate-pulse flex items-center gap-1 text-[11px] font-bold text-warmth-700">
                  <Volume2 className="w-3.5 h-3.5" /> Playing
                </span>
              )}
            </div>

            <div className="text-sm font-serif font-medium leading-relaxed bg-white/80 p-3 rounded-2xl border border-amber-200/60 shadow-2xs">
              "{trackB.voicePrompt}"
            </div>

            <p className="text-[11px] text-amber-900 font-medium">
              ❤️ <strong>Effect:</strong> Distinctly attributes the thought to family love, not an automated system.
            </p>

            <button
              onClick={() => handlePlayTrack('B')}
              className={`w-full py-3 px-4 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95 ${trackB.btnBg}`}
            >
              {activeTrack === 'B' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{activeTrack === 'B' ? 'Stop Voice' : 'Play Track B Voice'}</span>
            </button>
          </div>
        </div>

        {/* Close Button */}
        <div className="text-right pt-1">
          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-semibold"
          >
            Close Audio Studio
          </button>
        </div>
      </div>
    </div>
  );
};
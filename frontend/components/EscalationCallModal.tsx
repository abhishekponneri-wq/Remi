import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, PhoneCall, Volume2, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { EscalationCallPayload } from '../types';
import { speakGentleVoice, stopSpeaking } from '../services/speechService';

interface EscalationCallModalProps {
  payload: EscalationCallPayload;
  onDismiss: () => void;
}

export const EscalationCallModal: React.FC<EscalationCallModalProps> = ({
  payload,
  onDismiss,
}) => {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');

  useEffect(() => {
    // Ringtone haptic
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 500]);
    }

    // Auto answer after 2.5s for demonstration
    const timer = setTimeout(() => {
      setCallStatus('connected');
      speakGentleVoice(payload.call_script, () => {
        setCallStatus('ended');
      });
    }, 2500);

    return () => {
      clearTimeout(timer);
      stopSpeaking();
    };
  }, [payload]);

  const handleManualAnswer = () => {
    setCallStatus('connected');
    speakGentleVoice(payload.call_script, () => {
      setCallStatus('ended');
    });
  };

  const handleEndCall = () => {
    stopSpeaking();
    setCallStatus('ended');
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0B1320] text-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-500/50 space-y-6 text-center">
        {/* Calling Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider border border-rose-500/40">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Automated AI Escalation Call</span>
          </div>
          <h2 className="text-xl font-bold font-sans text-white pt-2">
            Remi Emergency Dispatch
          </h2>
          <p className="text-xs text-slate-400">
            Calling Daughter {payload.caregiver_name}
          </p>
        </div>

        {/* Dynamic Status Avatar */}
        <div className="py-2 flex flex-col items-center justify-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            callStatus === 'ringing'
              ? 'bg-rose-600/30 text-rose-400 ring-8 ring-rose-500/20 animate-pulse'
              : callStatus === 'connected'
                ? 'bg-emerald-600/30 text-emerald-300 ring-8 ring-emerald-500/20'
                : 'bg-slate-800 text-slate-400'
          }`}>
            {callStatus === 'ringing' ? (
              <PhoneCall className="w-10 h-10 animate-bounce" />
            ) : callStatus === 'connected' ? (
              <Volume2 className="w-10 h-10 animate-pulse" />
            ) : (
              <PhoneOff className="w-10 h-10" />
            )}
          </div>
          <span className="text-xs font-mono font-semibold text-slate-300 mt-3">
            {callStatus === 'ringing' && 'Incoming Call... (Unanswered Alarms: 3)'}
            {callStatus === 'connected' && 'Call Connected — AI Voice Active'}
            {callStatus === 'ended' && 'Call Completed'}
          </span>
        </div>

        {/* Transcript spoken on phone */}
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-left space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-500">
            AI Call Script Dispatched
          </span>
          <p className="text-xs text-slate-200 font-sans italic leading-relaxed">
            &quot;{payload.call_script}&quot;
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {callStatus === 'ringing' ? (
            <>
              <button
                onClick={handleManualAnswer}
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition active:scale-95"
                title="Answer Call"
              >
                <Phone className="w-6 h-6" />
              </button>
              <button
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition active:scale-95"
                title="Decline"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          ) : (
            <button
              onClick={handleEndCall}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-semibold"
            >
              Close Call Screen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

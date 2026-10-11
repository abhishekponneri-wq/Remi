import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Volume2, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  Mic, 
  MicOff, 
  AlertTriangle, 
  Sparkles, 
  HeartHandshake, 
  User, 
  PhoneCall, 
  CalendarClock 
} from 'lucide-react';
import { RemiTask } from '../types';
import { speakGentleVoice, stopSpeaking, VoiceRecognizer } from '../services/speechService';
import { resolveAlarmVoiceResponse } from '../services/geminiService';
import { createISTDateTime, formatTimeIST } from '../services/timeUtils';

interface ActiveAlarmModalProps {
  task: RemiTask;
  onComplete: (taskId: string, delayMinutes: number) => void;
  onSnooze: (taskId: string, newTriggerTime?: string) => void;
  onRescheduleByPatient: (taskId: string, newTimeFormatted: string, newTimeISO: string) => void;
  onDismiss: () => void;
  onSimulateMissedRetry: (task: RemiTask) => void;
}

export const ActiveAlarmModal: React.FC<ActiveAlarmModalProps> = ({
  task,
  onComplete,
  onSnooze,
  onRescheduleByPatient,
  onDismiss,
  onSimulateMissedRetry,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [showReschedulePicker, setShowReschedulePicker] = useState(false);

  const isCritical = task.priority === 'critical';
  const isHigh = task.priority === 'high';

  const playGentleChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      [440, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0.2, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 1.2);
      });
    } catch (e) {
      // AudioContext policy fallback
    }
  };

  useEffect(() => {
    playGentleChime();
    const textToRead = task.resurfacingPrompt || `Eleanor, it is time for: ${task.heading} at ${formatTimeIST(task.trigger_time)}.`;
    speakGentleVoice(textToRead);

    const recognizer = new VoiceRecognizer(
      async (transcript) => {
        setSpokenTranscript(transcript);
        setIsListening(false);
        await handleVoiceResponse(transcript);
      },
      () => setIsListening(false),
      (listening) => setIsListening(listening)
    );

    (window as any).__alarmRecognizer = recognizer;

    return () => {
      recognizer.stop();
      stopSpeaking();
    };
  }, [task]);

  const toggleMic = () => {
    if ('vibrate' in navigator) navigator.vibrate(30);
    const recognizer = (window as any).__alarmRecognizer as VoiceRecognizer;
    if (isListening) {
      recognizer?.stop();
      setIsListening(false);
    } else {
      recognizer?.start();
    }
  };

  const handleVoiceResponse = async (spokenText: string) => {
    setIsResolving(true);
    try {
      const resolution = await resolveAlarmVoiceResponse(task, spokenText);
      speakGentleVoice(resolution.voice_response);

      if (resolution.action === 'complete') {
        setTimeout(() => {
          onComplete(task.task_id, resolution.delay_minutes || 0);
        }, 1200);
      } else if (resolution.action === 'snooze') {
        setTimeout(() => {
          onSnooze(task.task_id, resolution.new_trigger_time || undefined);
        }, 1200);
      } else if (resolution.action === 'reschedule') {
        const newTime = resolution.new_trigger_time || createISTDateTime(18, 0);
        const formatted = formatTimeIST(newTime);
        setTimeout(() => {
          onRescheduleByPatient(task.task_id, formatted, newTime);
        }, 1200);
      }
    } catch (err) {
      onComplete(task.task_id, 0);
    } finally {
      setIsResolving(false);
    }
  };

  const handleApplyReschedule = (hours: number, minutes: number = 0) => {
    const targetISO = createISTDateTime(hours, minutes);
    const formattedIST = formatTimeIST(targetISO);
    speakGentleVoice(`I have moved this to ${formattedIST} and notified Sarah on her phone.`);
    onRescheduleByPatient(task.task_id, formattedIST, targetISO);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div 
        className={`bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-4 space-y-5 ${
          isCritical 
            ? 'border-rose-500 ring-8 ring-rose-100' 
            : isHigh 
              ? 'border-amber-500 ring-8 ring-amber-100' 
              : 'border-remi-500 ring-8 ring-remi-100'
        }`}
      >
        {/* Ringing Visual Banner */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg animate-bounce ${
              isCritical ? 'bg-rose-600' : isHigh ? 'bg-amber-600' : 'bg-remi-600'
            }`}>
              <Bell className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isCritical 
                    ? 'bg-rose-100 text-rose-800' 
                    : isHigh 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-remi-100 text-remi-800'
                }`}>
                  {task.priority.toUpperCase()} ALARM RINGING (IST)
                </span>
                {task.retry_count > 0 && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Retry #{task.retry_count}/3
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif text-slate-900 mt-1 leading-snug">
                {task.heading}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              playGentleChime();
              speakGentleVoice(task.resurfacingPrompt || task.heading);
            }}
            className="p-3 rounded-2xl bg-remi-50 hover:bg-remi-100 text-remi-700 transition"
            title="Read reminder aloud with gentle voice"
          >
            <Volume2 className="w-6 h-6" />
          </button>
        </div>

        {/* Resurfacing Voice Copy */}
        <div className={`p-4 rounded-2xl text-base sm:text-lg font-serif font-medium leading-relaxed border ${
          task.created_by === 'caregiver'
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : 'bg-remi-50 border-remi-200 text-remi-950'
        }`}>
          <div className="flex items-center gap-1.5 text-xs font-sans font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {task.created_by === 'caregiver' ? (
              <>
                <HeartHandshake className="w-3.5 h-3.5 text-warmth-600" />
                <span>Caregiver Note from Sarah</span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-remi-600" />
                <span>Eleanor&apos;s Stated Intention ({formatTimeIST(task.trigger_time)})</span>
              </>
            )}
          </div>
          &quot;{task.resurfacingPrompt || task.heading}&quot;
        </div>

        {/* Voice Resolution Bar */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            {isResolving ? (
              <span className="text-remi-700 font-semibold animate-pulse">Remi is listening to you...</span>
            ) : spokenTranscript ? (
              <span>Heard: &quot;{spokenTranscript}&quot;</span>
            ) : (
              <span>Say &quot;I did it&quot;, &quot;Snooze 10 mins&quot;, or &quot;Move to 6 PM IST&quot;</span>
            )}
          </div>
          <button
            onClick={toggleMic}
            className={`p-2.5 rounded-xl text-white transition shadow-xs ${
              isListening ? 'bg-red-500 ring-4 ring-red-200 animate-pulse' : 'bg-remi-600 hover:bg-remi-700'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        {/* Reschedule Picker Expansion in IST */}
        {showReschedulePicker && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-warmth-600" />
                <span>Change Time in IST (Sarah will be notified automatically):</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleApplyReschedule(17, 0)}
                className="py-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-medium"
              >
                05:00 PM IST
              </button>
              <button
                onClick={() => handleApplyReschedule(18, 0)}
                className="py-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-medium"
              >
                06:00 PM IST
              </button>
              <button
                onClick={() => handleApplyReschedule(19, 0)}
                className="py-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-medium"
              >
                07:00 PM IST
              </button>
            </div>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <button
            onClick={() => onComplete(task.task_id, 0)}
            className="py-3.5 px-3 bg-remi-600 hover:bg-remi-700 active:scale-95 text-white rounded-2xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>I did this!</span>
          </button>

          <button
            onClick={() => onSnooze(task.task_id)}
            className="py-3.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition"
          >
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Remind in 10m</span>
          </button>

          <button
            onClick={() => setShowReschedulePicker(!showReschedulePicker)}
            className="py-3.5 px-3 bg-warmth-50 hover:bg-warmth-100 active:scale-95 text-warmth-800 border border-warmth-200 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition"
          >
            <CalendarClock className="w-4 h-4 text-warmth-600" />
            <span>Change Time</span>
          </button>
        </div>

        {/* Escalation protocol notice for Critical tasks */}
        {isCritical && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Critical Health Protocol:</strong> Rings every 5m (up to 3x). Missed alarms trigger an automated AI voice call to daughter Sarah.
              </span>
            </div>
            <button
              onClick={() => onSimulateMissedRetry(task)}
              className="px-2.5 py-1.5 bg-rose-600 text-white rounded-xl text-[10px] font-bold hover:bg-rose-700 shrink-0 flex items-center gap-1 shadow-xs"
              title="Test emergency voice phone call to caregiver"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Simulate Call</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

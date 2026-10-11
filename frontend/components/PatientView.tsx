import React, { useState } from 'react';
import { 
  Mic, 
  Volume2, 
  Clock, 
  Sparkles, 
  HeartHandshake, 
  User, 
  ShieldCheck, 
  ChevronRight, 
  Coffee, 
  Sun, 
  AlertCircle,
  PhoneCall,
  Calendar,
  CalendarClock,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { RemiTask } from '../types';
import { speakGentleVoice } from '../services/speechService';
import { formatTimeIST, isTodayIST, createISTDateTime } from '../services/timeUtils';

interface PatientViewProps {
  tasks: RemiTask[];
  onVoiceCaptured: (text: string) => void;
  onOpenAlarm: (task: RemiTask) => void;
  clarificationPrompt: string | null;
  onAnswerClarification: (timeResponse: string) => void;
  onOpenAssistantModal: (prompt?: string) => void;
  onRescheduleTask: (taskId: string, newTimeFormatted: string, newTimeISO: string) => void;
}

export const PatientView: React.FC<PatientViewProps> = ({
  tasks,
  onVoiceCaptured,
  onOpenAlarm,
  clarificationPrompt,
  onAnswerClarification,
  onOpenAssistantModal,
  onRescheduleTask,
}) => {
  const [spokenMessage, setSpokenMessage] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTimeInput, setNewTimeInput] = useState('17:00');

  const handleSpeakAloud = (text: string) => {
    if ('vibrate' in navigator) navigator.vibrate(20);
    setSpokenMessage(text);
    speakGentleVoice(text, () => setSpokenMessage(null));
  };

  /**
   * Patient Today View filter:
   * Shows active tasks scheduled for today (pending, snoozed, rescheduled).
   */
  const activeTodayTasks = tasks.filter(task => {
    const isForToday = isTodayIST(task.trigger_time);
    const isNotFinished = task.status !== 'completed';
    return isForToday && isNotFinished;
  });

  const completedTodayTasks = tasks.filter(task => {
    return isTodayIST(task.trigger_time) && task.status === 'completed';
  });

  const handleSaveReschedule = (taskId: string) => {
    const [h, m] = newTimeInput.split(':').map(Number);
    const targetISO = createISTDateTime(h, m);
    const formattedIST = formatTimeIST(targetISO);
    setEditingTaskId(null);
    speakGentleVoice(`I've moved this to ${formattedIST} and notified your daughter Sarah.`);
    onRescheduleTask(taskId, formattedIST, targetISO);
  };

  const conversationalVoiceCapabilities = [
    {
      title: "Call My Husband",
      desc: "Set alarm to call your husband",
      prompt: "Remind me to call my husband in 10 seconds.",
      icon: PhoneCall
    },
    {
      title: "Today's Schedule (IST)",
      desc: "Ask Remi to read your schedule for today in IST",
      prompt: "What is on my schedule today, Remi?",
      icon: Calendar
    },
    {
      title: "Change Medication to 6 PM IST",
      desc: "Changes time & alerts Sarah's phone",
      prompt: "Change my blood pressure pills to 6 PM IST today.",
      icon: CalendarClock
    },
    {
      title: "Ask Sarah to Call at 5 PM",
      desc: "Dispatches a phone notification to Sarah",
      prompt: "Please ask my daughter Sarah to call me at 5 PM IST today.",
      icon: PhoneCall
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Warm Conversational AI Header with Big Touch Button */}
      <div className="bg-gradient-to-br from-remi-50 via-warmth-50 to-remi-100/70 p-5 sm:p-7 rounded-3xl border border-remi-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-remi-600/10 text-remi-800 text-xs sm:text-sm font-medium">
            <Sun className="w-3.5 h-3.5 text-warmth-500" />
            <span>Good day, Eleanor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-remi-900 tracking-tight leading-snug">
            Talk to Remi, your Voice Assistant
          </h1>
          <p className="text-sm text-slate-600 max-w-xl">
            Tap the button to converse anytime. Set reminders like &quot;Call my husband&quot;, ask for your schedule in IST, or ask Sarah to call you.
          </p>
        </div>

        {/* Big Conversational Voice Button */}
        <div className="flex flex-col items-center gap-2 shrink-0 py-1">
          <button
            onClick={() => onOpenAssistantModal()}
            aria-label="Tap to speak with Remi voice assistant"
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all shadow-lg active:scale-90 touch-manipulation bg-remi-600 hover:bg-remi-700 text-white ring-6 sm:ring-8 ring-remi-100 hover:ring-remi-200 group"
          >
            <Mic className="w-8 h-8 sm:w-10 sm:h-10 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase">Converse</span>
          </button>
          <span className="text-[11px] sm:text-xs text-remi-800 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-warmth-500" />
            <span>Tap to talk with Remi</span>
          </span>
        </div>
      </div>

      {/* SLOT-FILLING CLARIFICATION BANNER */}
      {clarificationPrompt && (
        <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                Time Clarification Needed
              </span>
              <p className="text-sm font-medium font-serif">
                &quot;{clarificationPrompt}&quot;
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => onAnswerClarification("In 10 seconds")}
              className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
            >
              &quot;In 10 seconds&quot; (Instant Alarm)
            </button>
            <button
              onClick={() => onAnswerClarification("This afternoon at 04:00 PM IST")}
              className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-semibold hover:bg-amber-100"
            >
              &quot;04:00 PM IST&quot;
            </button>
          </div>
        </div>
      )}

      {/* Spoken voice feedback banner */}
      {spokenMessage && (
        <div className="bg-remi-700 text-white p-3.5 rounded-2xl flex items-center gap-3 shadow-md">
          <Volume2 className="w-5 h-5 animate-pulse text-remi-200 shrink-0" />
          <div className="text-sm font-medium flex-1">
            <span className="text-remi-200 text-[10px] block uppercase tracking-wider">Remi Speaking</span>
            &quot;{spokenMessage}&quot;
          </div>
          <button 
            onClick={() => speakGentleVoice('')}
            className="px-2.5 py-1 bg-remi-800 hover:bg-remi-900 rounded-lg text-xs font-medium"
          >
            Mute
          </button>
        </div>
      )}

      {/* Voice Assistant Action Capability Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {conversationalVoiceCapabilities.map((cap, idx) => {
          const Icon = cap.icon;
          return (
            <button
              key={idx}
              onClick={() => onOpenAssistantModal(cap.prompt)}
              className="p-4 rounded-3xl bg-white hover:bg-remi-50/70 border border-slate-200/80 hover:border-remi-300 text-left transition shadow-xs flex items-center justify-between group active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-remi-100 text-remi-700 flex items-center justify-center shrink-0 group-hover:bg-remi-600 group-hover:text-white transition">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{cap.title}</h3>
                  <p className="text-xs text-slate-500">{cap.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-remi-600 shrink-0 ml-2" />
            </button>
          );
        })}
      </div>

      {/* Minimalist Today's Tasks List */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-xl font-serif text-slate-900">Today&apos;s Reminders (IST)</h2>
            <p className="text-xs text-slate-500">Everything scheduled for you today</p>
          </div>
          <span className="px-3 py-1 bg-remi-100 text-remi-800 font-semibold text-xs rounded-full">
            {activeTodayTasks.length} active today
          </span>
        </div>

        {activeTodayTasks.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-remi-50 flex items-center justify-center text-remi-600">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <p className="text-lg font-serif text-slate-700">You are all caught up for right now.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Whenever you think of something or want to call your husband, tap the button to talk with Remi.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTodayTasks.map((task) => {
              const isCaregiver = task.created_by === 'caregiver';
              const isAssignedToCaregiver = task.assigned_to === 'caregiver';
              const triggerTimeFormatted = formatTimeIST(task.trigger_time);

              return (
                <div
                  key={task.task_id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isAssignedToCaregiver
                      ? 'bg-amber-50/50 border-amber-300'
                      : task.priority === 'critical'
                        ? 'bg-rose-50/40 border-rose-200 hover:border-rose-400'
                        : 'bg-white border-slate-200/80 hover:border-remi-300'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        isAssignedToCaregiver
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isCaregiver 
                            ? 'bg-warmth-100 text-warmth-700' 
                            : 'bg-remi-100 text-remi-800'
                      }`}>
                        {isAssignedToCaregiver ? 'Assigned to Sarah (Caregiver)' : isCaregiver ? 'From Sarah' : 'Self-Stated'}
                      </span>

                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                        {task.category}
                      </span>

                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{triggerTimeFormatted}</span>
                      </span>

                      {task.rescheduled_from && (
                        <span className="text-[10px] px-2 py-0.5 bg-warmth-100 text-warmth-800 rounded-md font-mono">
                          Rescheduled
                        </span>
                      )}
                    </div>

                    <p className="text-base sm:text-lg font-serif text-slate-900 font-medium">
                      {task.heading}
                    </p>

                    <p className="text-xs text-slate-500 italic">
                      &quot;{task.resurfacingPrompt}&quot;
                    </p>

                    {/* Inline Change Time Picker */}
                    {editingTaskId === task.task_id && (
                      <div className="pt-2 flex items-center gap-2">
                        <input
                          type="time"
                          value={newTimeInput}
                          onChange={(e) => setNewTimeInput(e.target.value)}
                          className="px-2.5 py-1 text-xs border border-slate-300 rounded-xl bg-white"
                        />
                        <button
                          onClick={() => handleSaveReschedule(task.task_id)}
                          className="px-3 py-1 bg-warmth-500 hover:bg-warmth-600 text-white rounded-xl text-xs font-semibold"
                        >
                          Save & Alert Sarah (IST)
                        </button>
                        <button
                          onClick={() => setEditingTaskId(null)}
                          className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleSpeakAloud(task.resurfacingPrompt || task.heading)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Hear</span>
                    </button>

                    <button
                      onClick={() => setEditingTaskId(editingTaskId === task.task_id ? null : task.task_id)}
                      className="px-2.5 py-1.5 rounded-xl bg-warmth-50 hover:bg-warmth-100 text-warmth-700 border border-warmth-200 text-xs font-medium flex items-center gap-1"
                      title="Change the time of this task"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      <span>Change Time</span>
                    </button>

                    <button
                      onClick={() => onOpenAlarm(task)}
                      className={`px-3 py-1.5 rounded-xl text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition ${
                        task.priority === 'critical'
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-remi-600 hover:bg-remi-700'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Ring Alarm</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed Earlier Today Section */}
        {completedTodayTasks.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Completed earlier today ({completedTodayTasks.length})
            </h3>
            <div className="space-y-1.5">
              {completedTodayTasks.map(task => (
                <div key={task.task_id} className="p-2.5 bg-remi-50/60 rounded-xl border border-remi-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-remi-600 shrink-0" />
                    <span className="font-medium text-slate-800">{task.heading}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatTimeIST(task.trigger_time)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

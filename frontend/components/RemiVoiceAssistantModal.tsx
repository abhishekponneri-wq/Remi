import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  X, 
  Sun, 
  PhoneCall, 
  CheckCircle2, 
  HeartHandshake, 
  Clock, 
  Send, 
  CalendarClock, 
  RotateCcw, 
  CalendarPlus, 
  HelpCircle 
} from 'lucide-react';
import { RemiTask, AssistantDialogueTurn, AssistantActionPayload, PendingIntentWithoutTime } from '../types';
import { VoiceRecognizer, speakGentleVoice, stopSpeaking } from '../services/speechService';
import { converseWithRemiAssistant } from '../services/geminiService';

interface RemiVoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: RemiTask[];
  onAddTask: (newTask: RemiTask) => void;
  onRescheduleTask: (taskId: string, newTimeFormatted: string, newTimeISO: string) => void;
  onEditPastTask: (taskId: string, newStatus: any, newTimeFormatted?: string, newTimeISO?: string) => void;
  onNotifyCaregiver: (notification: { title: string; body: string; timeFormatted: string }) => void;
  initialPrompt?: string;
}

export const RemiVoiceAssistantModal: React.FC<RemiVoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onAddTask,
  onRescheduleTask,
  onEditPastTask,
  onNotifyCaregiver,
  initialPrompt,
}) => {
  if (!isOpen) return null;

  const [dialogue, setDialogue] = useState<AssistantDialogueTurn[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: "Hello Eleanor, I'm Remi. You can tell me something you'd like to do, ask me what you have planned today, move a missed task, or ask Sarah to call you.",
      timestamp: Date.now()
    }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputText, setInputText] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [pendingIntent, setPendingIntent] = useState<PendingIntentWithoutTime | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const recognizer = new VoiceRecognizer(
      async (transcript) => {
        setIsListening(false);
        if (transcript.trim()) {
          await handleUserUtterance(transcript.trim());
        }
      },
      () => setIsListening(false),
      (listening) => setIsListening(listening)
    );

    (window as any).__assistantModalRecognizer = recognizer;

    if (voiceEnabled && !initialPrompt) {
      setIsSpeaking(true);
      speakGentleVoice(
        "Hello Eleanor, I'm right here with you. How can I help you today?",
        () => setIsSpeaking(false)
      );
    }

    if (initialPrompt) {
      handleUserUtterance(initialPrompt);
    }

    return () => {
      recognizer.stop();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dialogue, isThinking, isListening]);

  const toggleMic = () => {
    if ('vibrate' in navigator) navigator.vibrate(30);
    stopSpeaking();
    setIsSpeaking(false);

    const recognizer = (window as any).__assistantModalRecognizer as VoiceRecognizer;
    if (isListening) {
      recognizer?.stop();
      setIsListening(false);
    } else {
      recognizer?.start();
    }
  };

  const handleUserUtterance = async (utterance: string) => {
    const userTurn: AssistantDialogueTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: utterance,
      timestamp: Date.now()
    };

    setDialogue(prev => [...prev, userTurn]);
    setIsThinking(true);
    setInputText('');

    try {
      const response: AssistantActionPayload = await converseWithRemiAssistant(
        utterance,
        dialogue,
        tasks,
        pendingIntent,
        'Eleanor',
        'Sarah'
      );

      const assistantTurn: AssistantDialogueTurn = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.spokenResponse,
        timestamp: Date.now()
      };

      setDialogue(prev => [...prev, assistantTurn]);

      // 1. Check if Remi is asking "When would you like to do that?"
      if (response.actionType === 'ask_time_clarification') {
        setPendingIntent(response.pendingIntentWithoutTime || null);
      } else {
        // Once resolved or executing other actions, clear pending intent
        setPendingIntent(null);
      }

      // 2. Editing past or missed task
      if (response.actionType === 'edit_past_task' && response.editedTaskId) {
        onEditPastTask(
          response.editedTaskId, 
          response.newStatus || 'pending', 
          response.newTimeFormatted, 
          response.newTimeISO
        );
      }

      // 3. Rescheduling today's task
      if (response.actionType === 'reschedule_task' && response.rescheduledTaskId && response.newTimeISO && response.newTimeFormatted) {
        onRescheduleTask(response.rescheduledTaskId, response.newTimeFormatted, response.newTimeISO);
      }

      // 4. Creating new task (today or future)
      if ((response.actionType === 'create_task' || response.actionType === 'create_future_task') && response.newTask) {
        const createdTask: RemiTask = {
          task_id: `task-${Date.now()}`,
          heading: response.newTask.heading,
          raw_utterance: response.newTask.raw_utterance,
          assigned_to: response.newTask.assigned_to,
          created_by: 'patient',
          category: response.newTask.category,
          priority: response.newTask.priority,
          trigger_time: response.newTask.trigger_time,
          end_time: response.newTask.end_time,
          status: 'pending',
          resolution_timestamp: null,
          delay_minutes: null,
          retry_count: 0,
          resurfacingPrompt: response.newTask.resurfacingPrompt
        };
        onAddTask(createdTask);
      }

      // 5. Notify caregiver if dispatch payload exists
      if (response.caregiverDispatch) {
        onNotifyCaregiver({
          title: response.caregiverDispatch.title,
          body: response.caregiverDispatch.body,
          timeFormatted: response.caregiverDispatch.timeFormatted
        });
      }

      if (voiceEnabled) {
        setIsSpeaking(true);
        speakGentleVoice(response.spokenResponse, () => setIsSpeaking(false));
      }
    } catch (err) {
      console.error('Voice assistant error:', err);
    } finally {
      // Fix: removed undefined setIsProcessingAI call
      setIsThinking(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    handleUserUtterance(inputText.trim());
  };

  const quickAssistantSuggestions = [
    { label: "I want to water the plants (No time)", prompt: "I want to water the plants." },
    { label: "Move missed task to 4 PM", prompt: "Move my missed plant watering to 4 PM today." },
    { label: "Schedule doctor visit tomorrow", prompt: "Schedule my doctor visit appointment for tomorrow at 10 AM." },
    { label: "What do I have today?", prompt: "What is on my schedule today, Remi?" },
    { label: "Ask Sarah to call me at 5 PM", prompt: "Please ask my daughter Sarah to call me at 5 PM today." },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div 
        className="bg-[#101713] text-slate-100 rounded-t-3xl sm:rounded-3xl max-w-xl w-full flex flex-col shadow-2xl border border-remi-800/80 max-h-[92vh] h-[670px] overflow-hidden"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {/* Assistant Header */}
        <div className="p-4 sm:p-5 border-b border-remi-900/80 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-remi-600/30 text-remi-300 border border-remi-500/40 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-remi-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-tight">
                  Remi Voice Assistant
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-remi-500/20 text-remi-300 border border-remi-500/30">
                  Natural Human Voice
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Edits past tasks, creates future tasks, & slot-fills times
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (voiceEnabled) stopSpeaking();
                setVoiceEnabled(!voiceEnabled);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              title={voiceEnabled ? 'Voice output on' : 'Voice output muted'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4 text-remi-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={() => {
                stopSpeaking();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Central Audio Waveform & Animated Orb */}
        <div className="py-3 px-6 bg-gradient-to-b from-black/40 to-transparent flex flex-col items-center justify-center shrink-0 border-b border-slate-900">
          <div className="relative flex items-center justify-center">
            <div className={`absolute w-24 h-24 rounded-full transition-all duration-700 ${
              isListening 
                ? 'bg-rose-500/20 ring-8 ring-rose-500/20 animate-ping' 
                : isSpeaking 
                  ? 'bg-remi-500/30 ring-8 ring-remi-400/20 animate-pulse'
                  : isThinking 
                    ? 'bg-amber-500/20 ring-6 ring-amber-400/20 animate-pulse'
                    : 'bg-remi-900/30 ring-4 ring-remi-800/20'
            }`} />

            <button
              onClick={toggleMic}
              className={`relative z-10 w-18 h-18 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 touch-manipulation ${
                isListening
                  ? 'bg-rose-600 text-white ring-4 ring-rose-300'
                  : isSpeaking
                    ? 'bg-remi-600 text-white ring-4 ring-remi-300'
                    : isThinking
                      ? 'bg-amber-600 text-white'
                      : 'bg-remi-700 hover:bg-remi-600 text-white ring-2 ring-remi-400/40'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-6 h-6 mb-0.5" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Listening</span>
                </>
              ) : isSpeaking ? (
                <>
                  <Volume2 className="w-6 h-6 mb-0.5 animate-bounce" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Speaking</span>
                </>
              ) : isThinking ? (
                <>
                  <Sparkles className="w-6 h-6 mb-0.5 animate-spin" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Thinking</span>
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6 mb-0.5" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Tap to Talk</span>
                </>
              )}
            </button>
          </div>

          <span className="text-xs text-slate-300 mt-2 font-medium">
            {isListening && "Listening to Eleanor... speak naturally"}
            {isSpeaking && "Remi is speaking gently aloud..."}
            {isThinking && "Understanding and checking your tasks..."}
            {!isListening && !isSpeaking && !isThinking && "Tap the microphone to speak with Remi"}
          </span>
        </div>

        {/* Slot-Filling Active Banner if awaiting time */}
        {pendingIntent && (
          <div className="mx-4 mt-2 p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-center justify-between gap-2 shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Awaiting time for: <strong>&quot;{pendingIntent.heading}&quot;</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleUserUtterance("At 4 PM today")}
                className="px-2 py-0.5 bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px]"
              >
                At 4 PM
              </button>
              <button
                onClick={() => handleUserUtterance("This evening")}
                className="px-2 py-0.5 bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px]"
              >
                Evening
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Conversation Turns */}
        <div 
          ref={scrollRef}
          className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 font-sans text-sm"
        >
          {dialogue.map(turn => (
            <div 
              key={turn.id}
              className={`flex flex-col ${turn.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] text-slate-400 mb-1 px-1">
                {turn.role === 'user' ? 'Eleanor' : 'Remi'}
              </span>
              <div 
                className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                  turn.role === 'user'
                    ? 'bg-remi-600 text-white rounded-tr-xs'
                    : 'bg-[#18231c] text-emerald-100 border border-remi-800/60 rounded-tl-xs shadow-inner'
                }`}
              >
                {turn.text}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 text-xs text-remi-300 italic pt-1 animate-pulse">
              <Sparkles className="w-4 h-4 text-remi-400" />
              <span>Remi is preparing your answer...</span>
            </div>
          )}
        </div>

        {/* Quick Conversational Starters */}
        <div className="px-3 py-2 border-t border-slate-900 bg-black/20 flex gap-1.5 overflow-x-auto shrink-0">
          {quickAssistantSuggestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleUserUtterance(item.prompt)}
              className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-remi-900/60 border border-slate-800 text-slate-300 text-xs whitespace-nowrap transition active:scale-95 flex items-center gap-1"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Text Input Fallback */}
        <form onSubmit={handleFormSubmit} className="p-3 bg-black/40 border-t border-slate-900 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a request (e.g. 'I want to water plants' or 'Move missed task')..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-remi-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 bg-remi-600 hover:bg-remi-500 disabled:bg-slate-800 text-white rounded-xl text-xs transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

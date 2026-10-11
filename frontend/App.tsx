import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  HeartHandshake, 
  BarChart3, 
  PlayCircle, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Leaf, 
  Bell, 
  PhoneCall, 
  Clock 
} from 'lucide-react';
import { 
  RemiTask, 
  EscalationCallPayload, 
  CaregiverPushNotification,
  IntentExtractionResult 
} from './types';
import { 
  parseIntentWithSlotFilling, 
  generateEscalationCallScript,
  findMatchingTask
} from './services/geminiService';
import { speakGentleVoice } from './services/speechService';
import { createISTDateTime, formatTimeIST, getNowFormattedIST, isTodayIST, normalizeToISTDate } from './services/timeUtils';
import { PatientView } from './components/PatientView';
import { CaregiverView } from './components/CaregiverView';
import { ScorecardView } from './components/ScorecardView';
import { ActiveAlarmModal } from './components/ActiveAlarmModal';
import { EscalationCallModal } from './components/EscalationCallModal';
import { DemoScriptModal } from './components/DemoScriptModal';
import { FuzzyIntentVisualizerDrawer } from './components/FuzzyIntentVisualizerDrawer';
import { SideBySideAudioContrast } from './components/SideBySideAudioContrast';
import { RemiVoiceAssistantModal } from './components/RemiVoiceAssistantModal';

const INITIAL_TASKS: RemiTask[] = [
  {
    task_id: 'task-1',
    heading: 'Blood Pressure Medication',
    raw_utterance: "I'm going to take my blood pressure pills right after my tea.",
    assigned_to: 'patient',
    created_by: 'patient',
    category: 'health',
    priority: 'critical',
    trigger_time: createISTDateTime(16, 15), // 04:15 PM IST Today
    end_time: createISTDateTime(17, 15),
    status: 'pending',
    resolution_timestamp: null,
    delay_minutes: null,
    retry_count: 0,
    resurfacingPrompt: 'You mentioned earlier that you wanted to take your blood pressure medication after your tea at 04:15 PM IST.'
  },
  {
    task_id: 'task-2',
    heading: 'Meet Priya in Park',
    raw_utterance: 'Mom is meeting Priya in the park at 4pm',
    assigned_to: 'patient',
    created_by: 'caregiver',
    category: 'social',
    priority: 'high',
    trigger_time: createISTDateTime(16, 0), // 04:00 PM IST Today
    end_time: createISTDateTime(17, 0),
    status: 'pending',
    resolution_timestamp: null,
    delay_minutes: null,
    retry_count: 0,
    resurfacingPrompt: "Your daughter Sarah left a gentle reminder for you: you two are meeting Priya in the park at 04:00 PM IST."
  },
  {
    task_id: 'task-3',
    heading: 'Water Front Porch Plants',
    raw_utterance: 'Water the plants once I finish reading',
    assigned_to: 'patient',
    created_by: 'patient',
    category: 'household',
    priority: 'normal',
    trigger_time: createISTDateTime(13, 45, -1), // Yesterday at 01:45 PM IST (Belongs to Past Unresolved Queue)
    end_time: createISTDateTime(14, 45, -1),
    status: 'missed',
    resolution_timestamp: null,
    delay_minutes: null,
    retry_count: 1,
    resurfacingPrompt: 'You mentioned wanting to water the front porch plants once you finish reading.'
  }
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'patient' | 'caregiver' | 'scorecard'>('patient');
  const [tasks, setTasks] = useState<RemiTask[]>(() => {
    try {
      const saved = localStorage.getItem('remi_tasks_v12_active_alarms');
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });

  const [activeAlarmTask, setActiveAlarmTask] = useState<RemiTask | null>(null);
  const [escalationCall, setEscalationCall] = useState<EscalationCallPayload | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [clarificationPrompt, setClarificationPrompt] = useState<string | null>(null);
  const [pendingDraftUtterance, setPendingDraftUtterance] = useState<string | null>(null);
  const [activePushNotification, setActivePushNotification] = useState<CaregiverPushNotification | null>(null);

  // Conversational Assistant Modal
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string | undefined>(undefined);

  // Demo Modals
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [isAudioContrastOpen, setIsAudioContrastOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Set of task IDs that already fired so they don't fire multiple times in same minute
  const firedAlarmIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem('remi_tasks_v12_active_alarms', JSON.stringify(tasks));
    } catch (e) {
      console.warn('Storage sync issue:', e);
    }
  }, [tasks]);

  const triggerHaptic = () => {
    if ('vibrate' in navigator) navigator.vibrate(30);
  };

  /**
   * AUTOMATED ALARM TRIGGER ENGINE:
   * Polls every 2 seconds. When any pending or snoozed task's trigger_time is reached (or passed within last 15 mins),
   * it automatically fires the Active Alarm modal and announces it aloud!
   */
  useEffect(() => {
    const alarmInterval = setInterval(() => {
      if (activeAlarmTask || escalationCall) return;

      const now = Date.now();
      const dueTask = tasks.find(t => {
        if (t.status !== 'pending' && t.status !== 'snoozed') return false;
        if (firedAlarmIdsRef.current.has(t.task_id)) return false;

        const trigTime = new Date(t.trigger_time).getTime();
        // Fire if due within last 15 minutes
        return now >= trigTime && (now - trigTime) < 15 * 60000;
      });

      if (dueTask) {
        firedAlarmIdsRef.current.add(dueTask.task_id);
        setActiveAlarmTask(dueTask);
      }
    }, 2000);

    return () => clearInterval(alarmInterval);
  }, [tasks, activeAlarmTask, escalationCall]);

  /**
   * VOICE INPUT INTAKE: Patient speech handler with Slot-Filling
   */
  const handlePatientVoiceInput = async (utterance: string) => {
    triggerHaptic();
    setIsProcessingAI(true);

    try {
      const extracted = await parseIntentWithSlotFilling(utterance, 'patient');

      if (extracted.has_missing_info && extracted.clarification_prompt) {
        setPendingDraftUtterance(utterance);
        setClarificationPrompt(extracted.clarification_prompt);
        if (soundEnabled) speakGentleVoice(extracted.clarification_prompt);
      } else {
        saveExtractedTask(extracted);
      }
    } catch (err) {
      console.error('Extraction error:', err);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleAnswerClarification = async (timeResponse: string) => {
    setClarificationPrompt(null);
    const combinedUtterance = `${pendingDraftUtterance || "Task"} at ${timeResponse}`;
    setPendingDraftUtterance(null);
    await handlePatientVoiceInput(combinedUtterance);
  };

  const handleCaregiverAddTask = async (utterance: string, caregiverName: string) => {
    triggerHaptic();
    setIsProcessingAI(true);
    try {
      const extracted = await parseIntentWithSlotFilling(utterance, 'caregiver');
      saveExtractedTask(extracted);
    } catch (err) {
      console.error('Caregiver intake error:', err);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const saveExtractedTask = (extracted: IntentExtractionResult) => {
    const isTomorrow = extracted.raw_utterance.toLowerCase().includes('tomorrow');
    const validTrigger = normalizeToISTDate(extracted.trigger_time, isTomorrow ? 1 : 0);

    const newTask: RemiTask = {
      task_id: `task-${Date.now()}`,
      heading: extracted.heading,
      raw_utterance: extracted.raw_utterance,
      assigned_to: extracted.assigned_to || 'patient',
      created_by: extracted.created_by,
      category: extracted.category,
      priority: extracted.priority,
      trigger_time: validTrigger,
      end_time: new Date(new Date(validTrigger).getTime() + 3600000).toISOString(),
      status: 'pending',
      resolution_timestamp: null,
      delay_minutes: null,
      retry_count: 0,
      resurfacingPrompt: extracted.resurfacingPrompt,
      fallback_time_anchor_used: extracted.fallback_time_anchor_used
    };

    setTasks(prev => [newTask, ...prev]);

    if (soundEnabled) {
      const triggerTimeIST = formatTimeIST(newTask.trigger_time);
      speakGentleVoice(`Got it, Eleanor. I will gently remind you for ${newTask.heading} at ${triggerTimeIST}.`);
    }
  };

  /**
   * CONCRETE TASK EDIT / RESCHEDULE ENGINE:
   * Handles editing any task, keeps today's tasks in Today's View, and dispatches push notification to Sarah.
   */
  const handleEditOrRescheduleTask = (
    targetIdentifier: string,
    newTimeFormatted?: string,
    newTimeISO?: string,
    newStatus: RemiTask['status'] = 'pending'
  ) => {
    triggerHaptic();
    let updatedHeading = "Task";
    const finalISO = newTimeISO || createISTDateTime(18, 0);
    const finalFormatted = newTimeFormatted || formatTimeIST(finalISO);

    setTasks(prev => {
      const exists = prev.some(t => t.task_id === targetIdentifier);
      const targetId = exists 
        ? targetIdentifier 
        : (findMatchingTask(targetIdentifier, prev)?.task_id || prev[0]?.task_id);

      // Clear from firedAlarmIdsRef so the new time triggers properly
      if (targetId) {
        firedAlarmIdsRef.current.delete(targetId);
      }

      return prev.map(t => {
        if (t.task_id === targetId) {
          updatedHeading = t.heading;
          return {
            ...t,
            trigger_time: finalISO,
            status: newStatus,
            rescheduled_from: t.trigger_time,
            retry_count: 0,
            resurfacingPrompt: `You mentioned wanting to ${t.heading.toLowerCase()} at ${finalFormatted}.`
          };
        }
        return t;
      });
    });

    setActivePushNotification({
      id: `push-${Date.now()}`,
      title: "Eleanor updated task schedule",
      body: `Eleanor changed "${updatedHeading}" to ${finalFormatted}. Remi updated her Today View.`,
      timeFormatted: finalFormatted,
      category: 'health',
      priority: 'high',
      source: 'patient',
      isRescheduledByPatient: true
    });
  };

  const handleAssistantAddTask = (newTask: RemiTask) => {
    const isTomorrow = newTask.raw_utterance.toLowerCase().includes('tomorrow');
    const validTrigger = normalizeToISTDate(newTask.trigger_time, isTomorrow ? 1 : 0);
    const sanitizedTask: RemiTask = {
      ...newTask,
      trigger_time: validTrigger,
      end_time: new Date(new Date(validTrigger).getTime() + 3600000).toISOString(),
      assigned_to: newTask.assigned_to || 'patient',
      status: 'pending'
    };

    // Remove from fired alarms if reused ID
    firedAlarmIdsRef.current.delete(sanitizedTask.task_id);

    setTasks(prev => [sanitizedTask, ...prev]);
  };

  const handleAssistantNotifyCaregiver = (notif: { title: string; body: string; timeFormatted: string }) => {
    setActivePushNotification({
      id: `push-${Date.now()}`,
      title: notif.title,
      body: notif.body,
      timeFormatted: notif.timeFormatted,
      category: 'social',
      priority: 'high',
      source: 'patient',
      isSelfStatedSuccess: false
    });
  };

  const openAssistantWithPrompt = (prompt?: string) => {
    setAssistantInitialPrompt(prompt);
    setIsAssistantModalOpen(true);
  };

  const handleAlarmComplete = (taskId: string, delayMinutes: number) => {
    triggerHaptic();
    let completedItem: RemiTask | undefined;

    setTasks(prev => prev.map(t => {
      if (t.task_id === taskId) {
        completedItem = {
          ...t,
          status: 'completed',
          resolution_timestamp: new Date().toISOString(),
          delay_minutes: delayMinutes
        };
        return completedItem;
      }
      return t;
    }));

    if (completedItem) {
      setActivePushNotification({
        id: `push-${Date.now()}`,
        title: "Eleanor completed her goal",
        body: `Eleanor completed: ${completedItem.heading} (${getNowFormattedIST()}).`,
        timeFormatted: getNowFormattedIST(),
        category: completedItem.category,
        priority: completedItem.priority,
        source: completedItem.created_by,
        isSelfStatedSuccess: completedItem.created_by === 'patient'
      });
    }

    setActiveAlarmTask(null);
  };

  const handleAlarmSnooze = (taskId: string, newTriggerTime?: string) => {
    triggerHaptic();
    const nextTime = newTriggerTime || new Date(Date.now() + 10 * 60000).toISOString();
    firedAlarmIdsRef.current.delete(taskId);

    setTasks(prev => prev.map(t => {
      if (t.task_id === taskId) {
        return {
          ...t,
          status: 'snoozed',
          trigger_time: nextTime,
          retry_count: t.retry_count + 1
        };
      }
      return t;
    }));
    setActiveAlarmTask(null);
  };

  const handleDismissAlarm = () => {
    if (activeAlarmTask) {
      // Postpone by 5 minutes so it doesn't immediately loop
      handleAlarmSnooze(activeAlarmTask.task_id, new Date(Date.now() + 5 * 60000).toISOString());
    } else {
      setActiveAlarmTask(null);
    }
  };

  const handleTriggerEscalationCall = async (task?: RemiTask) => {
    triggerHaptic();
    setActiveAlarmTask(null);
    setIsProcessingAI(true);
    const target = task || tasks.find(t => t.priority === 'critical') || tasks[0];

    try {
      const callPayload = await generateEscalationCallScript('Eleanor', 'Sarah', target);
      setEscalationCall(callPayload);
    } catch (err) {
      console.error('Call script generation error:', err);
    } finally {
      setIsProcessingAI(false);
    }
  };

  /**
   * CAREGIVER ACTION: Re-push missed past task to Eleanor's Today View
   */
  const handlePushToToday = (taskId: string) => {
    triggerHaptic();
    const newTime = createISTDateTime(16, 0); // Re-push to 4:00 PM IST TODAY
    firedAlarmIdsRef.current.delete(taskId);

    setTasks(prev => prev.map(t => {
      if (t.task_id === taskId) {
        return {
          ...t,
          status: 'pending',
          trigger_time: newTime,
          retry_count: 0
        };
      }
      return t;
    }));
    speakGentleVoice("I have pushed this reminder to Eleanor's schedule for today at 4:00 PM IST.");
  };

  /**
   * INSTANT TEST ALARM GENERATOR (For immediate testing: e.g. "Call Husband in 10 seconds")
   */
  const handleCreateTestAlarm = (heading: string = "Call Husband", delaySeconds: number = 8) => {
    triggerHaptic();
    const triggerMs = Date.now() + delaySeconds * 1000;
    const triggerISO = new Date(triggerMs).toISOString();

    const testTask: RemiTask = {
      task_id: `test-${Date.now()}`,
      heading,
      raw_utterance: `Call husband in ${delaySeconds} seconds`,
      assigned_to: 'patient',
      created_by: 'patient',
      category: 'social',
      priority: 'high',
      trigger_time: triggerISO,
      end_time: new Date(triggerMs + 3600000).toISOString(),
      status: 'pending',
      resolution_timestamp: null,
      delay_minutes: null,
      retry_count: 0,
      resurfacingPrompt: `Eleanor, it is time for: ${heading}.`
    };

    firedAlarmIdsRef.current.delete(testTask.task_id);
    setTasks(prev => [testTask, ...prev]);
    speakGentleVoice(`I set an alarm for you to ${heading.toLowerCase()} in ${delaySeconds} seconds. Watch it ring!`);
  };

  // Demo Beats Automation
  const runDemoBeat1 = async () => {
    setActiveTab('patient');
    const spoken = "I'm going to take my blood pressure pills right after my tea.";
    setIsVisualizerOpen(true);
    await handlePatientVoiceInput(spoken);
  };

  const runDemoBeat2 = () => {
    setIsAudioContrastOpen(true);
  };

  const runDemoBeat3 = () => {
    setActiveTab('caregiver');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-slate-800 font-sans selection:bg-remi-200">
      {/* Top App Bar with Direct Alarm & Call Access */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-remi-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-remi-600 text-white flex items-center justify-center shadow-xs">
              <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-remi-100" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-serif font-bold text-remi-900 tracking-tight">Remi</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-remi-100 text-remi-800">
                  Voice Companion (IST)
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 text-xs font-semibold">
            <button
              onClick={() => { triggerHaptic(); setActiveTab('patient'); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
                activeTab === 'patient'
                  ? 'bg-white text-remi-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Eleanor (Patient View)</span>
            </button>

            <button
              onClick={() => { triggerHaptic(); setActiveTab('caregiver'); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
                activeTab === 'caregiver'
                  ? 'bg-white text-warmth-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Sarah (Caregiver View)</span>
            </button>

            <button
              onClick={() => { triggerHaptic(); setActiveTab('scorecard'); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
                activeTab === 'scorecard'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
          </nav>

          {/* Direct Feature Launchers in Header */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => handleCreateTestAlarm("Call Husband", 5)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-xs transition flex items-center gap-1"
              title="Schedules 'Call Husband' in 5 seconds so you can hear and see the live alarm trigger"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Alarm in 5s (Test)</span>
              <span className="sm:hidden">Alarm 5s</span>
            </button>

            <button
              onClick={() => handleTriggerEscalationCall()}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-rose-300 border border-rose-500/40 text-xs font-bold shadow-xs transition flex items-center gap-1"
              title="Trigger emergency automated AI voice call to daughter Sarah"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Emergency Call</span>
              <span className="sm:hidden">Call</span>
            </button>

            <button
              onClick={() => openAssistantWithPrompt()}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-remi-600 hover:bg-remi-700 active:scale-95 text-white text-xs font-bold shadow-xs transition flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voice Assistant</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 transition"
              aria-label="Toggle Voice"
              title={soundEnabled ? 'Warm voice output enabled' : 'Voice muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-remi-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 safe-bottom-padding md:pb-8 space-y-4">
        {/* Real-time Caregiver Push Notification Banner */}
        {activePushNotification && (
          <div className={`p-4 rounded-3xl shadow-xl border flex items-start justify-between gap-3 animate-fade-in ${
            activePushNotification.isRescheduledByPatient 
              ? 'bg-gradient-to-r from-amber-600 to-warmth-600 text-white border-amber-400/50'
              : 'bg-gradient-to-r from-emerald-600 via-remi-600 to-remi-700 text-white border-emerald-400/50'
          }`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-200 block">
                  Sarah&apos;s Phone Push Telemetry • {activePushNotification.timeFormatted}
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {activePushNotification.title}
                </h4>
                <p className="text-xs text-white/95 mt-0.5">
                  {activePushNotification.body}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActivePushNotification(null)}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Feature Quick Bar with Live Countdown and Alarm Tester */}
        <div className="bg-white/90 border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Alarm Engine Status:</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Active Background Poller Running (Every 2s)</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCreateTestAlarm("Call Husband", 5)}
              className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl font-semibold hover:bg-amber-100 transition flex items-center gap-1"
            >
              <Bell className="w-3.5 h-3.5 text-amber-600" />
              <span>🔔 Test Alarm: &quot;Call Husband&quot; in 5s</span>
            </button>

            <button
              onClick={() => handleTriggerEscalationCall()}
              className="px-3 py-1 bg-slate-900 text-rose-200 rounded-xl font-semibold hover:bg-slate-800 transition flex items-center gap-1"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
              <span>Emergency AI Call Screen</span>
            </button>
          </div>
        </div>

        {isProcessingAI && (
          <div className="p-3 bg-remi-50 rounded-2xl border border-remi-200 text-remi-800 text-xs font-medium flex items-center justify-center gap-2 shadow-xs animate-pulse">
            <Sparkles className="w-4 h-4 text-remi-600 shrink-0" />
            <span>Remi is processing with gentle natural voice engine (IST)...</span>
          </div>
        )}

        {activeTab === 'patient' && (
          <PatientView
            tasks={tasks}
            onVoiceCaptured={handlePatientVoiceInput}
            onOpenAlarm={(task) => setActiveAlarmTask(task)}
            clarificationPrompt={clarificationPrompt}
            onAnswerClarification={handleAnswerClarification}
            onOpenAssistantModal={openAssistantWithPrompt}
            onRescheduleTask={(taskId, newFormatted, newISO) => handleEditOrRescheduleTask(taskId, newFormatted, newISO)}
          />
        )}

        {activeTab === 'caregiver' && (
          <CaregiverView
            tasks={tasks}
            onAddTask={handleCaregiverAddTask}
            onOpenAlarm={(task) => setActiveAlarmTask(task)}
            onPushToToday={handlePushToToday}
            onSimulateEscalation={handleTriggerEscalationCall}
          />
        )}

        {activeTab === 'scorecard' && (
          <ScorecardView tasks={tasks} />
        )}
      </main>

      {/* Voice Assistant Modal */}
      <RemiVoiceAssistantModal
        isOpen={isAssistantModalOpen}
        onClose={() => setIsAssistantModalOpen(false)}
        tasks={tasks}
        onAddTask={handleAssistantAddTask}
        onRescheduleTask={(taskId, newFormatted, newISO) => handleEditOrRescheduleTask(taskId, newFormatted, newISO)}
        onEditPastTask={(taskId, status, newFormatted, newISO) => handleEditOrRescheduleTask(taskId, newFormatted, newISO, status)}
        onNotifyCaregiver={handleAssistantNotifyCaregiver}
        initialPrompt={assistantInitialPrompt}
      />

      {/* Active Alarm Modal with Web Audio Chime, Voice Resolution, and In-Alarm Rescheduling */}
      {activeAlarmTask && (
        <ActiveAlarmModal
          task={activeAlarmTask}
          onComplete={handleAlarmComplete}
          onSnooze={handleAlarmSnooze}
          onRescheduleByPatient={(taskId, newFormatted, newISO) => handleEditOrRescheduleTask(taskId, newFormatted, newISO)}
          onDismiss={handleDismissAlarm}
          onSimulateMissedRetry={handleTriggerEscalationCall}
        />
      )}

      {/* Emergency Escalation AI Voice Call Modal */}
      {escalationCall && (
        <EscalationCallModal
          payload={escalationCall}
          onDismiss={() => setEscalationCall(null)}
        />
      )}

      {/* Mobile Sticky Tab Bar */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-lg px-2 pt-1 pb-safe"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => { triggerHaptic(); setActiveTab('patient'); }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition ${
              activeTab === 'patient'
                ? 'bg-remi-50 text-remi-800 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] leading-tight">Patient</span>
          </button>

          <button
            onClick={() => { triggerHaptic(); setActiveTab('caregiver'); }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition ${
              activeTab === 'caregiver'
                ? 'bg-warmth-50 text-warmth-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <HeartHandshake className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] leading-tight">Caregiver</span>
          </button>

          <button
            onClick={() => { triggerHaptic(); setActiveTab('scorecard'); }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition ${
              activeTab === 'scorecard'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] leading-tight">Analytics</span>
          </button>
        </div>
      </nav>

      {/* Demo Modals */}
      <FuzzyIntentVisualizerDrawer
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
        debugData={{
          intent: "Take blood pressure medication",
          category: "health" as any,
          raw_trigger: "after my tea",
          resolved_time: "16:15 IST",
          source: "patient",
          confidence: 0.98,
          resurfacingPrompt: "You mentioned earlier that you wanted to take your blood pressure medication after your tea at 04:15 PM IST.",
          latencyMs: 295
        }}
        rawSpokenInput="I'm going to take my blood pressure pills right after my tea."
      />

      <SideBySideAudioContrast
        isOpen={isAudioContrastOpen}
        onClose={() => setIsAudioContrastOpen(false)}
      />

      <DemoScriptModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onRunBeat1={runDemoBeat1}
        onRunBeat2={runDemoBeat2}
        onRunBeat3={runDemoBeat3}
        onOpenVisualizer={() => setIsVisualizerOpen(true)}
        onOpenAudioContrast={() => setIsAudioContrastOpen(true)}
      />
    </div>
  );
};

export default App;

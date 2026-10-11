import React, { useState } from 'react';
import { 
  HeartHandshake, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Sparkles, 
  UserCheck, 
  Send, 
  Filter, 
  RotateCcw, 
  AlertTriangle, 
  ShieldAlert 
} from 'lucide-react';
import { RemiTask, TaskCategory, TaskPriority } from '../types';
import { formatTimeIST, isTodayIST } from '../services/timeUtils';

interface CaregiverViewProps {
  tasks: RemiTask[];
  onAddTask: (text: string, caregiverName: string) => void;
  onOpenAlarm: (task: RemiTask) => void;
  onPushToToday: (taskId: string) => void;
  onSimulateEscalation: (task: RemiTask) => void;
}

export const CaregiverView: React.FC<CaregiverViewProps> = ({
  tasks,
  onAddTask,
  onOpenAlarm,
  onPushToToday,
  onSimulateEscalation,
}) => {
  const [inputText, setInputText] = useState('');
  const [caregiverName, setCaregiverName] = useState('Daughter Sarah');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onAddTask(inputText.trim(), caregiverName);
    setInputText('');
  };

  /**
   * ACCURATE UNRESOLVED QUEUE FILTER:
   * STRICTLY ONLY tasks from PAST DAYS (yesterday or older) that remained unresolved/missed.
   * Tasks scheduled for today are NEVER put here!
   */
  const unresolvedTasks = tasks.filter(task => {
    const isScheduledForToday = isTodayIST(task.trigger_time);
    if (isScheduledForToday) {
      // All today's tasks belong in Eleanor's Today View!
      return false;
    }
    const isPastDate = new Date(task.trigger_time).getTime() < Date.now();
    const isUnresolved = task.status === 'pending' || task.status === 'missed' || task.status === 'snoozed';
    return isPastDate && isUnresolved;
  });

  const filteredTasks = tasks.filter(item => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
    return true;
  });

  const selfCount = tasks.filter(t => t.created_by === 'patient').length;
  const caregiverCount = tasks.filter(t => t.created_by === 'caregiver').length;
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Top Caregiver Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warmth-100 text-warmth-700 text-xs font-semibold mb-1">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Caregiver Control & Analytics • Eleanor&apos;s Circle</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif text-slate-900">
            Caregiver Operations Portal (IST)
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Manage Eleanor&apos;s tasks, prioritize critical health regimes, and audit past missed tasks.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
          <div className="p-2.5 bg-remi-50 rounded-2xl border border-remi-100 text-center">
            <span className="block text-xl font-bold text-remi-800">{selfCount}</span>
            <span className="text-[10px] text-remi-600 font-medium">Self-stated</span>
          </div>
          <div className="p-2.5 bg-warmth-50 rounded-2xl border border-warmth-200 text-center">
            <span className="block text-xl font-bold text-warmth-700">{caregiverCount}</span>
            <span className="text-[10px] text-warmth-600 font-medium">Caregiver</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <span className="block text-xl font-bold text-slate-800">{completionRate}%</span>
            <span className="text-[10px] text-slate-500 font-medium">Adherence</span>
          </div>
        </div>
      </div>

      {/* EXCLUSIVE: UNRESOLVED QUEUE WITH "PUSH TO TODAY" ACTION */}
      <div className="bg-rose-50/70 border-2 border-rose-200 rounded-3xl p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-600 text-white rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-rose-950">
                Unresolved Past Tasks Queue ({unresolvedTasks.length})
              </h3>
              <p className="text-[11px] text-rose-800">
                Tasks missed on previous days. You can push them into Eleanor&apos;s Today View anytime.
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-rose-200 text-rose-900 rounded-full">
            Caregiver Exclusive
          </span>
        </div>

        {unresolvedTasks.length === 0 ? (
          <div className="text-xs text-rose-700/80 italic py-2">
            No past-day unresolved tasks. All of Eleanor&apos;s current tasks are active in her Today View.
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {unresolvedTasks.map(task => (
              <div key={task.task_id} className="p-3 bg-white rounded-2xl border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-bold text-rose-700 uppercase">{task.priority}</span>
                    <span>•</span>
                    <span className="text-slate-500 capitalize">{task.category}</span>
                    <span>•</span>
                    <span className="text-slate-500">Scheduled: {formatTimeIST(task.trigger_time, true)}</span>
                  </div>
                  <span className="font-semibold text-slate-900 text-sm block">{task.heading}</span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {task.priority === 'critical' && (
                    <button
                      onClick={() => onSimulateEscalation(task)}
                      className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-xl text-xs font-semibold flex items-center gap-1"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Test Call</span>
                    </button>
                  )}

                  <button
                    onClick={() => onPushToToday(task.task_id)}
                    className="px-3 py-1.5 bg-remi-600 hover:bg-remi-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Push to Eleanor&apos;s Today</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Caregiver Task Injection Form */}
      <div className="bg-gradient-to-br from-warmth-50 to-white rounded-3xl p-5 border border-warmth-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-warmth-600" />
            <h2 className="text-base font-serif text-slate-900">Add an Intent for Eleanor</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Posting as:</span>
            <input
              type="text"
              value={caregiverName}
              onChange={(e) => setCaregiverName(e.target.value)}
              className="px-2 py-0.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 w-32"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="e.g., Mom is meeting Priya in the park at 4pm"
            className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-warmth-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-5 py-2.5 bg-warmth-500 hover:bg-warmth-600 disabled:bg-slate-200 text-white font-medium rounded-2xl text-sm transition flex items-center justify-center gap-1.5 shadow-xs shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Queue Intent</span>
          </button>
        </form>
      </div>

      {/* Dynamic Task Pipeline */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-serif text-slate-900">Live Task Schema Pipeline</h2>
            <p className="text-[11px] text-slate-500">
              Firestore Task documents displayed in Indian Standard Time (IST)
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
            >
              <option value="all">All Categories</option>
              <option value="health">Health</option>
              <option value="social">Social</option>
              <option value="activity">Activity</option>
              <option value="household">Household</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTasks.map((task) => (
            <div key={task.task_id} className="py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    task.priority === 'critical'
                      ? 'bg-rose-100 text-rose-800'
                      : task.priority === 'high'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                  }`}>
                    {task.priority}
                  </span>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                    {task.category}
                  </span>

                  <span className="text-[11px] text-slate-500">
                    Trigger: {formatTimeIST(task.trigger_time, true)}
                  </span>

                  {task.delay_minutes !== null && (
                    <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Delay: {task.delay_minutes} min
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-slate-900">
                  {task.heading}
                </p>

                <p className="text-xs text-slate-500 italic">
                  Raw: &quot;{task.raw_utterance}&quot;
                </p>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                  task.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : task.status === 'snoozed'
                      ? 'bg-amber-100 text-amber-800'
                      : task.status === 'missed'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                }`}>
                  {task.status.toUpperCase()}
                </span>

                <button
                  onClick={() => onOpenAlarm(task)}
                  className="px-2.5 py-1 bg-remi-600 hover:bg-remi-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
                >
                  Ring Alarm
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

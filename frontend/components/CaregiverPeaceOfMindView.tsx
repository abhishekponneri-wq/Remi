import React from 'react';
import { Bell, CheckCircle2, HeartHandshake, ShieldCheck, Clock, UserCheck, Sparkles, Smartphone, ChevronRight } from 'lucide-react';
import { CaregiverPushNotification, MemoryIntent } from '../types';
import { formatTimeIST } from '../services/timeUtils';

interface CaregiverPeaceOfMindViewProps {
  activeNotification: CaregiverPushNotification | null;
  onDismissNotification: () => void;
  intents: MemoryIntent[];
}

export const CaregiverPeaceOfMindView: React.FC<CaregiverPeaceOfMindViewProps> = ({
  activeNotification,
  onDismissNotification,
  intents,
}) => {
  const completedIntents = intents.filter(i => i.status === 'completed');

  return (
    <div className="space-y-4">
      {/* REAL-TIME SIMULATED MOBILE NOTIFICATION BANNER (BEAT 3 45s) */}
      {activeNotification && (
        <div className="bg-gradient-to-r from-emerald-600 via-remi-600 to-remi-700 text-white p-4 rounded-3xl shadow-xl border border-emerald-400/50 animate-bounce-subtle flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 mt-0.5">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-emerald-200">
                <span>Sarah&apos;s iPhone Notification</span>
                <span>•</span>
                <span>{activeNotification.timeFormatted}</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">
                {activeNotification.title}
              </h4>
              <p className="text-xs text-emerald-50 mt-0.5">
                {activeNotification.body}
              </p>
            </div>
          </div>

          <button
            onClick={onDismissNotification}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Peace of Mind Feed Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-remi-100 text-remi-700 rounded-xl">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-slate-900">
                Caregiver &quot;Peace of Mind&quot; Feed (IST)
              </h3>
              <p className="text-xs text-slate-500">
                Live push telemetry dispatched directly to family members in Indian Standard Time
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-semibold">
            Real-Time Push
          </span>
        </div>

        {/* Live sample push representation */}
        <div className="p-4 rounded-2xl bg-[#0F172A] text-white space-y-3 font-sans shadow-md border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-remi-400" />
              <span>Remi Family App • Push Notification</span>
            </span>
            <span className="text-[11px]">Just now</span>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-remi-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-400">
                Self-Stated Goal Fulfilled 🎉
              </div>
              <div className="text-sm font-medium text-slate-100 mt-0.5">
                &quot;Mom completed her self-stated goal: Watered the plants (01:45 PM IST).&quot;
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Eleanor initiated and confirmed this herself without needing direct prompting from family.
              </p>
            </div>
          </div>
        </div>

        {/* Completed list showing self-agency vs caregiver prompt */}
        <div className="space-y-2 pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent Confirmed Actions Today
          </span>

          <div className="space-y-2">
            {completedIntents.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No completions recorded yet today.</p>
            ) : (
              completedIntents.map(item => (
                <div key={item.id} className="p-3 rounded-2xl bg-remi-50/70 border border-remi-200/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-remi-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900 block">{item.extractedAction}</span>
                      <span className="text-[11px] text-slate-500">
                        {item.source === 'patient' ? '🌟 Initiated by Eleanor' : `💌 Reminded by ${item.sourceDetail || 'Family'}`}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 bg-white text-slate-700 rounded-lg text-[10px] font-mono border border-slate-200 shrink-0">
                    {formatTimeIST(item.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

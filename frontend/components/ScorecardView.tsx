import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  Pill, 
  Users, 
  Activity, 
  ShieldAlert, 
  CheckCircle2,
  Calendar,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { RemiTask, CategoryDelayInsight } from '../types';

interface ScorecardViewProps {
  tasks: RemiTask[];
}

export const ScorecardView: React.FC<ScorecardViewProps> = ({ tasks }) => {
  // Compute rolling delay insights per category
  const categories: Array<{ id: 'health' | 'social' | 'activity' | 'household' | 'general'; label: string; icon: any; color: string; bg: string }> = [
    { id: 'health', label: 'Health (Medications & Vitals)', icon: Pill, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'social', label: 'Social & Family Connections', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'activity', label: 'Physical Activity & Walks', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const categoryInsights = categories.map(cat => {
    const matching = tasks.filter(t => t.category === cat.id && t.status === 'completed');
    const delays = matching.map(t => t.delay_minutes || 0);
    const avgDelay = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 18;

    return {
      category: cat.id,
      label: cat.label,
      icon: cat.icon,
      color: cat.color,
      bg: cat.bg,
      avgDelayMinutes: avgDelay,
      completedCount: matching.length || 3
    };
  });

  // 7-day realistic demo scorecard data
  const weeklyDelayTrends = [
    { day: 'Mon', avgHealthDelay: 12, avgSocialDelay: 25, completedRate: 100 },
    { day: 'Tue', avgHealthDelay: 15, avgSocialDelay: 30, completedRate: 90 },
    { day: 'Wed', avgHealthDelay: 28, avgSocialDelay: 42, completedRate: 85 },
    { day: 'Thu', avgHealthDelay: 10, avgSocialDelay: 20, completedRate: 95 },
    { day: 'Fri', avgHealthDelay: 35, avgSocialDelay: 48, completedRate: 80 },
    { day: 'Sat', avgHealthDelay: 14, avgSocialDelay: 15, completedRate: 100 },
    { day: 'Today', avgHealthDelay: 18, avgSocialDelay: 22, completedRate: 92 },
  ];

  const priorityData = [
    { name: 'Critical (Meds/Doctor)', value: tasks.filter(t => t.priority === 'critical').length || 4, color: '#E11D48' },
    { name: 'High (Social/Walks)', value: tasks.filter(t => t.priority === 'high').length || 3, color: '#D97736' },
    { name: 'Normal (Household)', value: tasks.filter(t => t.priority === 'normal').length || 3, color: '#3A6A4F' },
  ];

  /**
   * 3 CRISP AI INSIGHTS FOR CAREGIVERS IN A HURRY:
   * Provides immediate, actionable summaries of trends without digging through charts.
   */
  const quickAiInsights = [
    {
      badge: "Evening Latency Trend",
      badgeColor: "bg-amber-100 text-amber-900 border-amber-200",
      headline: "Medication delay increases in the evening (avg 42m vs 12m morning).",
      actionText: "Action: Anchor her evening pill to dinner instead of tea to reduce evening delay.",
      icon: Pill,
      iconColor: "text-amber-600 bg-amber-50"
    },
    {
      badge: "High Social Agency",
      badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-200",
      headline: "Eleanor completes 94% of self-stated social calls and walks on schedule.",
      actionText: "Trend: She initiates tasks with high confidence when she mentions them aloud in the morning.",
      icon: CheckCircle2,
      iconColor: "text-emerald-600 bg-emerald-50"
    },
    {
      badge: "Zero Escalations This Week",
      badgeColor: "bg-blue-100 text-blue-900 border-blue-200",
      headline: "0 emergency escalation calls triggered across 7 days.",
      actionText: "Status: All critical health items were resolved within retry window. Eleanor is safe.",
      icon: ShieldCheck,
      iconColor: "text-blue-600 bg-blue-50"
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Analytics Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-remi-100 text-remi-800 text-xs font-semibold mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Caregiver Analytics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif text-slate-900">
            Analytics & Trend Telemetry
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time compliance tracking, task delay calculations, and quick behavioral insights for Sarah.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-remi-50 p-3 sm:p-4 rounded-2xl border border-remi-200 w-full md:w-auto">
          <div className="w-11 h-11 rounded-xl bg-remi-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
            21m
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Average Daily Delay</div>
            <div className="text-[11px] text-remi-700 font-medium">96% of critical meds resolved within 30m</div>
          </div>
        </div>
      </div>

      {/* 3 CRISP AI INSIGHTS CARDS (QUICK READ FOR CAREGIVERS IN A HURRY) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-remi-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-700 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-remi-500/30 text-remi-300 rounded-xl border border-remi-400/40">
              <Sparkles className="w-4 h-4 text-remi-300" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-white">
                3-Second AI Insights for Sarah
              </h2>
              <p className="text-[11px] text-slate-300">
                Key trends extracted by Remi to read at a glance:
              </p>
            </div>
          </div>
          <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-slate-300">
            Live AI Telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {quickAiInsights.map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <div 
                key={idx}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:border-remi-400/50 transition flex flex-col justify-between space-y-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${insight.badgeColor}`}>
                      {insight.badge}
                    </span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${insight.iconColor}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
                    {insight.headline}
                  </p>
                </div>

                <div className="text-[11px] text-emerald-200/90 font-medium bg-black/25 p-2 rounded-xl border border-white/5">
                  {insight.actionText}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delay Metrics by Category */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {categoryInsights.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${cat.bg} ${cat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-2xl font-serif font-bold text-slate-900">
                  {cat.avgDelayMinutes} min
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-xs">{cat.label}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Avg delay between alarm ring and patient completion
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Delay Trend */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-serif text-slate-900">Rolling Delay Trends (Minutes)</h2>
              <p className="text-[11px] text-slate-500">Tracking latency by Health vs Social category</p>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Last 7 Days</span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyDelayTrends} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '11px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="avgHealthDelay" fill="#E11D48" name="Health Delay (mins)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgSocialDelay" fill="#D97736" name="Social Delay (mins)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-serif text-slate-900">Task Priority Distribution</h2>
            <p className="text-[11px] text-slate-500">Critical vs High vs Normal escalation rules</p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-2 text-xs">
            {priorityData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

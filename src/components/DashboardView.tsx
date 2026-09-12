import React, { useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Layers, 
  AlertOctagon, 
  TrendingUp, 
  Calendar, 
  Users, 
  ExternalLink, 
  ArrowRight,
  ShieldAlert,
  Flame,
  LogOut,
  User,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { DefectItem, ProjectMeta, ExecutionReportStats } from '../types.ts';
import { useTheme } from '../context/ThemeContext.tsx';

interface DashboardViewProps {
  projectMeta: ProjectMeta;
  defects: DefectItem[];
  stats: ExecutionReportStats;
  onNavigateToSheet: (filter?: string) => void;
  onSelectDefect: (defect: DefectItem) => void;
  currentUser?: string;
  onLogout?: () => void;
  onChangePassword?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projectMeta,
  defects,
  stats,
  onNavigateToSheet,
  onSelectDefect,
  currentUser = 'sahil_roy',
  onLogout,
  onChangePassword
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Test Execution Chart Data matching the user's report
  const executionChartData = useMemo(() => [
    { name: 'Passed', value: stats.passed, color: '#10b981' }, // Emerald-500
    { name: 'Failed', value: stats.failed, color: '#e11d48' }, // Rose-600
    { name: 'Blocked', value: stats.blocked, color: '#facc15' }, // Light Yellow (yellow-400)
    { name: 'Pending', value: stats.pending, color: '#64748b' }, // Slate-500
  ].filter(item => item.value > 0), [stats]);

  // Severity Breakdown Data
  const severityData = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    defects.forEach(d => {
      if (counts[d.severity] !== undefined) {
        counts[d.severity]++;
      }
    });
    return [
      { name: 'Critical', count: counts.Critical, fill: '#e11d48' },
      { name: 'High', count: counts.High, fill: '#ea580c' },
      { name: 'Medium', count: counts.Medium, fill: '#d97706' },
      { name: 'Low', count: counts.Low, fill: '#3b82f6' }
    ];
  }, [defects]);

  // Module Breakdown
  const moduleData = useMemo(() => {
    const moduleMap: Record<string, { total: number; failed: number; blocked: number }> = {};
    defects.forEach(d => {
      const mod = d.module.split('/')[0].trim();
      if (!moduleMap[mod]) {
        moduleMap[mod] = { total: 0, failed: 0, blocked: 0 };
      }
      moduleMap[mod].total++;
      if (d.testExecutionStatus === 'Failed') moduleMap[mod].failed++;
      if (d.testExecutionStatus === 'Blocked') moduleMap[mod].blocked++;
    });

    return Object.entries(moduleMap).map(([name, val]) => ({
      name,
      total: val.total,
      issues: val.failed + val.blocked,
      failed: val.failed,
      blocked: val.blocked
    })).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [defects]);

  // Top critical defect (e.g. BUG-OHRM-101)
  const criticalDefects = useMemo(() => {
    return defects.filter(d => d.severity === 'Critical' || d.testExecutionStatus === 'Failed');
  }, [defects]);

  // Blocked tests list
  const blockedDefects = useMemo(() => {
    return defects.filter(d => d.testExecutionStatus === 'Blocked');
  }, [defects]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top QA Engineer Session Bar with Prominent Logout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-5 sm:py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 sm:mt-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {currentUser === 'jit_mondal' ? 'Jeet Mondal' : currentUser === 'sahil_roy' ? 'Sahil Roy' : currentUser}
              </span>
              <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/40">
                @{currentUser}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active QA Session
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
              {currentUser === 'jit_mondal' ? 'QA Automation Engineer' : 'Lead Quality Engineer'} · Enterprise QA Dashboard Access
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-100 dark:border-slate-800 sm:border-0">
          {onChangePassword && (
            <button
              onClick={onChangePassword}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition cursor-pointer shadow-xs"
              title="Change your QA password"
              aria-label="Change password"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Change Password</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold transition cursor-pointer shadow-xs hover:shadow group"
              title="Log out from QA Dashboard"
              aria-label="Log out from dashboard"
            >
              <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform" />
              <span>Sign Out / Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Test Execution Status Report Banner */}
      <div className="bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/70 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                Official QA Execution Report
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                v{projectMeta.version}{projectMeta.revision ? ` (Rev. ${projectMeta.revision})` : ''}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {projectMeta.projectName} Defect &amp; Test Execution Status
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              Execution results from QA test runs on {projectMeta.estimatedStartDate}. 
              {stats.failed > 0 
                ? ` ${stats.failed} critical failure reported causing ${stats.blocked} blocked test executions.` 
                : ' All executed tests passing cleanly without blocking defects.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <button
              onClick={() => onNavigateToSheet('Failed')}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 text-xs font-semibold transition"
            >
              <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>View Failed Tests ({stats.failed})</span>
            </button>
            <button
              onClick={() => onNavigateToSheet('Blocked')}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30 text-xs font-semibold transition"
            >
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span>View Blocked Tests ({stats.blocked})</span>
            </button>
            <button
              onClick={() => onNavigateToSheet('All')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm"
            >
              <span>Open Defect Tracker Sheet</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Exact numbers from the user's Test Execution Status Report */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Executed */}
        <div 
          onClick={() => onNavigateToSheet('All')}
          className="bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-lg cursor-pointer transition transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Executed
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats.totalExecuted}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">test cases</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>100% Suite Execution</span>
          </div>
        </div>

        {/* Passed */}
        <div 
          onClick={() => onNavigateToSheet('Passed')}
          className="bg-white dark:bg-slate-800/80 hover:bg-emerald-50/50 dark:hover:bg-slate-800 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 shadow-xs dark:shadow-lg cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Passed
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.passed}
            </span>
            <span className="text-xs font-medium text-emerald-700/80 dark:text-emerald-500/80">
              ({stats.passRate}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Passing functional criteria
          </div>
        </div>

        {/* Failed */}
        <div 
          onClick={() => onNavigateToSheet('Failed')}
          className="bg-white dark:bg-slate-800/80 hover:bg-rose-50/50 dark:hover:bg-slate-800 p-5 rounded-2xl border border-rose-200 dark:border-rose-500/30 shadow-xs dark:shadow-lg cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Failed
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              {stats.failed}
            </span>
            <span className="text-xs font-medium text-rose-700/80 dark:text-rose-500/80">
              ({stats.failRate}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-rose-600 dark:text-rose-400/90 font-medium flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Requires Dev Triage</span>
          </div>
        </div>

        {/* Blocked */}
        <div 
          onClick={() => onNavigateToSheet('Blocked')}
          className="bg-white dark:bg-slate-800/80 hover:bg-yellow-50/50 dark:hover:bg-yellow-950/20 p-5 rounded-2xl border border-yellow-200 dark:border-yellow-600/30 shadow-xs dark:shadow-lg cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">
              Blocked
            </span>
            <div className="p-2 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-yellow-600 dark:text-yellow-400 font-mono">
              {stats.blocked}
            </span>
            <span className="text-xs font-medium text-yellow-700/80 dark:text-yellow-400/80">
              ({stats.blockedRate}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-400/90">
            Dependent on Fix
          </div>
        </div>

        {/* Pending */}
        <div 
          onClick={() => onNavigateToSheet('Pending')}
          className="bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-lg cursor-pointer transition transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending
            </span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-700 dark:text-slate-300 font-mono">
              {stats.pending}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">queued</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Ready to execute
          </div>
        </div>
      </div>

      {/* Primary Visualizations: Execution Status Pie / Donut Chart & Severity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart: Test Execution Status Report */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-lg flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700/60">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Test Execution Breakdown
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Visualizing Pass, Fail, and Blocked distribution ({stats.totalExecuted} test runs)
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-mono font-medium whitespace-nowrap shrink-0">
              Pass Rate: {stats.passRate}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-4">
            <div className="sm:col-span-7 h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={executionChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {executionChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke={isDark ? '#1e293b' : '#ffffff'} 
                        strokeWidth={2} 
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                      borderColor: isDark ? '#334155' : '#e2e8f0', 
                      borderRadius: '0.75rem', 
                      color: isDark ? '#fff' : '#0f172a', 
                      boxShadow: isDark ? 'none' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px' 
                    }}
                    itemStyle={{ color: isDark ? '#fff' : '#0f172a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Center Metric */}
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {stats.passRate}%
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Passed
                </span>
              </div>
            </div>

            <div className="sm:col-span-5 space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Passed Tests</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{stats.passed}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5">({stats.passRate}%)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-slate-900/60 border border-rose-200 dark:border-rose-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Failed Defect</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">{stats.failed}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5">({stats.failRate}%)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-yellow-50/60 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-600/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">Blocked Tests</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300 font-mono">{stats.blocked}</span>
                  <span className="text-[11px] text-yellow-600/80 dark:text-yellow-400/80 ml-1.5">({stats.blockedRate}%)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pending Tests</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">{stats.pending}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5">(0%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Execution cycle complete for sprint candidate</span>
            <button 
              onClick={() => onNavigateToSheet()}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
            >
              View full test matrix <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Severity Matrix Bar Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-lg flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700/60">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Defect Severity Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Severity weighting across all logged items
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>

          <div className="h-56 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} tickLine={false} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} allowDecimals={false} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                    borderColor: isDark ? '#334155' : '#e2e8f0', 
                    borderRadius: '0.75rem', 
                    color: isDark ? '#fff' : '#0f172a', 
                    boxShadow: isDark ? 'none' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px' 
                  }}
                  cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-200 dark:border-slate-700/60 text-center">
            {severityData.map(s => (
              <div key={s.name} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{s.name}</div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-white">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Defect & Blocked Test Cases Detail Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Critical Failure Card */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-rose-200 dark:border-rose-500/30 shadow-xs dark:shadow-lg transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Active Blocker Defect
                </h3>
                <span className="text-xs text-rose-600 dark:text-rose-400 font-mono block truncate">
                  BUG-101 (Critical Severity / P1)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 whitespace-nowrap shrink-0">
              Open &amp; Blocking
            </span>
          </div>

          {criticalDefects.length > 0 ? (
            <div className="mt-4 space-y-3">
              {criticalDefects.slice(0, 1).map(bug => (
                <div 
                  key={bug.id} 
                  onClick={() => onSelectDefect(bug)}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/60 hover:border-rose-300 dark:hover:border-rose-500/40 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {bug.testCaseId}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                        {bug.title}
                      </h4>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold">
                      {bug.module}
                    </span>
                  </div>

                  <div className="mt-3 text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                    <div>
                      <strong className="text-slate-500 dark:text-slate-400 font-semibold">Expected:</strong> {bug.expectedResult}
                    </div>
                    <div className="text-rose-700 dark:text-rose-300">
                      <strong className="text-rose-600 dark:text-rose-400 font-semibold">Actual:</strong> {bug.actualResult}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Assigned: <span className="text-slate-800 dark:text-slate-200 font-medium">{bug.assignedTo}</span></span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Click to view &amp; edit &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
              No critical bugs currently active.
            </div>
          )}
        </div>

        {/* Blocked Test Cases Impact list */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-600/30 shadow-xs dark:shadow-lg transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Impacted / Blocked Test Cases ({blockedDefects.length})
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Cannot be executed until root blocking defect is resolved
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigateToSheet('Blocked')}
              className="text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 font-semibold inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
            {blockedDefects.map(item => (
              <div 
                key={item.id} 
                onClick={() => onSelectDefect(item)}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-yellow-300 dark:hover:border-yellow-500/40 transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-yellow-600 dark:text-yellow-400 font-semibold">
                      {item.bugId}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                      {item.module}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 truncate mt-0.5">
                    {item.title}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-50 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-600/30 whitespace-nowrap shrink-0">
                  Blocked
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Metadata Card */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-lg transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700/60 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                QA Project &amp; Test Suite Execution Profile
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official project parameters as recorded in the Defect Tracker sheet
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Project Name
            </span>
            <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{projectMeta.projectName}</span>
            </div>
            {projectMeta.projectLink && (
              <a 
                href={projectMeta.projectLink} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1 mt-1"
              >
                Open Project Link <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Execution Schedule
            </span>
            <div className="text-slate-700 dark:text-slate-200 font-mono text-xs space-y-0.5">
              <div><strong className="text-slate-500 dark:text-slate-400 font-sans">Start:</strong> {projectMeta.estimatedStartDate}</div>
              <div><strong className="text-slate-500 dark:text-slate-400 font-sans">End:</strong> {projectMeta.estimatedEndDate}</div>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Assigned QA Members
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {projectMeta.assignedQAMembers.map((member, i) => (
                <span 
                  key={i}
                  className="px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                >
                  {member}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

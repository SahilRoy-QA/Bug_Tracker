import React, { useMemo, useState, useEffect } from 'react';
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
  KeyRound,
  Shield,
  UserPlus,
  FolderGit2,
  Tag,
  HelpCircle,
  Bug,
  Activity,
  Image as ImageIcon
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
import { DefectItem, ProjectMeta, ExecutionReportStats, QAUser, DefectStatus } from '../types.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { isUserAdmin } from '../utils/permissions.ts';
import { getCachedUser, getQAUser, getAllQAUsers } from '../firebase/authService.ts';

interface DashboardViewProps {
  projectMeta: ProjectMeta;
  defects: DefectItem[];
  stats: ExecutionReportStats;
  onNavigateToSheet: (filter?: string) => void;
  onSelectDefect: (defect: DefectItem) => void;
  onNavigateToAdmin?: () => void;
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
  onNavigateToAdmin,
  currentUser = 'sahil_roy',
  onLogout,
  onChangePassword
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isAdmin = isUserAdmin(currentUser);

  // Defect Status Counts & Metrics
  const defectCounts = useMemo(() => {
    const counts: Record<DefectStatus, number> = {
      'Open': 0,
      'In Progress': 0,
      'Doubt': 0,
      'Resolved': 0,
      'Verified': 0,
      'Closed': 0,
      'Reopened': 0
    };
    defects.forEach(d => {
      if (counts[d.defectStatus] !== undefined) {
        counts[d.defectStatus]++;
      } else {
        counts['Open']++;
      }
    });
    return counts;
  }, [defects]);

  // Defect Status Chart Data for the Pie Chart
  const defectStatusChartData = useMemo(() => {
    const statusColors: Record<DefectStatus, string> = {
      'Open': '#e11d48', // Rose-600
      'In Progress': '#3b82f6', // Blue-500
      'Doubt': '#a855f7', // Purple-500
      'Resolved': '#10b981', // Emerald-500
      'Verified': '#06b6d4', // Cyan-500
      'Closed': '#64748b', // Slate-500
      'Reopened': '#f97316' // Orange-500
    };

    const orderedStatuses: DefectStatus[] = ['Open', 'In Progress', 'Doubt', 'Resolved', 'Verified', 'Closed', 'Reopened'];

    const data = orderedStatuses
      .map(status => ({
        name: status,
        value: defectCounts[status],
        color: statusColors[status]
      }))
      .filter(item => item.value > 0);

    if (data.length === 0) {
      return [{ name: 'No Defects', value: 1, color: isDark ? '#334155' : '#e2e8f0' }];
    }
    return data;
  }, [defectCounts, isDark]);

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
    const moduleMap: Record<string, { total: number; open: number; doubt: number }> = {};
    defects.forEach(d => {
      const mod = d.module.split('/')[0].trim();
      if (!moduleMap[mod]) {
        moduleMap[mod] = { total: 0, open: 0, doubt: 0 };
      }
      moduleMap[mod].total++;
      if (d.defectStatus === 'Open' || d.defectStatus === 'Reopened') moduleMap[mod].open++;
      if (d.defectStatus === 'Doubt') moduleMap[mod].doubt++;
    });

    return Object.entries(moduleMap).map(([name, val]) => ({
      name,
      total: val.total,
      open: val.open,
      doubt: val.doubt
    })).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [defects]);

  // Top critical defect (e.g. Critical severity)
  const criticalDefects = useMemo(() => {
    return defects.filter(d => d.severity === 'Critical' || d.severity === 'High');
  }, [defects]);

  // Doubt defects list
  const doubtDefects = useMemo(() => {
    return defects.filter(d => d.defectStatus === 'Doubt');
  }, [defects]);

  // Current logged in user profile & team member registry
  const [currentUserProfile, setCurrentUserProfile] = useState<QAUser | null>(() => getCachedUser(currentUser));
  const [teamUsers, setTeamUsers] = useState<QAUser[]>([]);

  useEffect(() => {
    let isMounted = true;
    getQAUser(currentUser).then(u => {
      if (isMounted && u) setCurrentUserProfile(u);
    });
    getAllQAUsers().then(users => {
      if (isMounted && users) setTeamUsers(users);
    });
    return () => { isMounted = false; };
  }, [currentUser]);

  // Helper to remove any designations in parentheses, e.g. "Sahil Roy (Lead QA)" -> "Sahil Roy"
  const cleanMemberName = (name: string) => name.replace(/\s*\([^)]*\)/g, '').trim();

  // User's assigned projects
  const userAssignedProjects = useMemo(() => {
    if (currentUserProfile?.assignedProjects && currentUserProfile.assignedProjects.length > 0) {
      return currentUserProfile.assignedProjects;
    }
    // Fallback: If admin or primary account, default to active project
    if (isAdmin || currentUser.toLowerCase() === 'sahil_roy' || currentUser.toLowerCase() === 'admin') {
      return [projectMeta.projectName];
    }
    return [];
  }, [currentUserProfile, isAdmin, currentUser, projectMeta.projectName]);

  // Check if the current user is assigned to this active project
  const isUserAssignedToProject = useMemo(() => {
    if (isAdmin || currentUser.toLowerCase() === 'sahil_roy' || currentUser.toLowerCase() === 'admin') return true;
    return userAssignedProjects.some(
      p => p.trim().toLowerCase() === projectMeta.projectName.trim().toLowerCase()
    );
  }, [userAssignedProjects, isAdmin, currentUser, projectMeta.projectName]);

  // Assigned QA Members for this specific project:
  // IF AND ONLY IF a QA member is assigned to this specific project, then and only then show them,
  // and strip any designation from their display name!
  const assignedQAMembersForThisProject = useMemo(() => {
    const matchedNames = new Set<string>();

    // 1. From database / registered team users
    teamUsers.forEach(u => {
      const isAssigned = (u.assignedProjects || []).some(
        p => p.trim().toLowerCase() === projectMeta.projectName.trim().toLowerCase()
      );
      if (isAssigned) {
        matchedNames.add(cleanMemberName(u.name || u.username));
      }
    });

    // 2. From project metadata if already assigned to this project
    (projectMeta.assignedQAMembers || []).forEach(rawMember => {
      const clean = cleanMemberName(rawMember);
      const lower = clean.toLowerCase();
      if (
        clean && 
        !lower.includes('alex morgan') && 
        !lower.includes('alex') &&
        !lower.includes('priya sharma') &&
        !lower.includes('priya')
      ) {
        // If team user exists, verify project assignment
        const found = teamUsers.find(
          u => cleanMemberName(u.name).toLowerCase() === lower ||
               u.username.toLowerCase() === lower
        );
        if (found) {
          const isAssigned = (found.assignedProjects || []).some(
            p => p.trim().toLowerCase() === projectMeta.projectName.trim().toLowerCase()
          );
          if (isAssigned) {
            matchedNames.add(clean);
          }
        } else {
          // If no separate user record found, keep member from project metadata
          matchedNames.add(clean);
        }
      }
    });

    return Array.from(matchedNames).filter(
      name => !name.toLowerCase().includes('alex') && !name.toLowerCase().includes('priya')
    );
  }, [teamUsers, projectMeta.assignedQAMembers, projectMeta.projectName]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top QA Engineer Session Bar with Prominent Logout & Administration Quick Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-5 sm:py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 sm:mt-0">
            {isAdmin ? <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <User className="w-4 h-4" />}
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
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <Shield className="w-2.5 h-2.5" />
                  Administrator
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none font-medium">
              {currentUser === 'sahil_roy'
                ? 'System Administrator · Full Access to Team & Project Governance'
                : currentUser === 'jit_mondal'
                  ? 'QA Automation Engineer · Enterprise QA Dashboard Access'
                  : 'QA Engineer · Enterprise QA Dashboard Access'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-100 dark:border-slate-800 sm:border-0">
          {/* Administration Button on Home Page Dashboard - exclusively for Sahil Roy */}
          {isAdmin && onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-xs hover:shadow group"
              title="Open Administration View (Manage engineers, permissions, projects)"
              aria-label="Switch to Administration"
            >
              <ShieldCheck className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Administration</span>
            </button>
          )}

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

      {/* Administration Hub Feature Banner - shown on Home Page Dashboard only if user is Sahil Roy */}
      {isAdmin && onNavigateToAdmin && (
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 border border-indigo-700/50 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
                  Admin Exclusive Access
                </span>
                <span className="text-xs text-indigo-200 font-medium">Logged in as Sahil Roy</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Administration &amp; Team Governance Dashboard
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                Configure QA permissions, provision and register new QA engineers, assign projects, or access exclusive project details &amp; test suite parameters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNavigateToAdmin}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-950 font-bold text-xs transition shadow-sm cursor-pointer"
            >
              <span>Switch to Administration View</span>
              <ArrowRight className="w-4 h-4 text-indigo-700" />
            </button>
          </div>
        </div>
      )}

      {/* Defect Status & Tracking Banner */}
      <div className="bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/70 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                Official QA Defect Tracking
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                v{projectMeta.version}{projectMeta.revision ? ` (Rev. ${projectMeta.revision})` : ''}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {projectMeta.projectName} Defect Tracker &amp; Status Overview
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              Defect lifecycle status, triage tracking, and QA evidence repository.
              {defectCounts.Open > 0 
                ? ` ${defectCounts.Open} open defect(s) currently active in triage.` 
                : ' All logged defects verified or resolved.'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => onNavigateToSheet('All')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm cursor-pointer"
            >
              <span>Open Defect Tracker Sheet</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Defect Status distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Defects */}
        <div 
          onClick={() => onNavigateToSheet('All')}
          className="bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-lg cursor-pointer transition transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Defects
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {defects.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">records</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Defect Repository</span>
          </div>
        </div>

        {/* Open Defects */}
        <div 
          onClick={() => onNavigateToSheet('Open')}
          className="bg-white dark:bg-slate-800/80 hover:bg-rose-50/50 dark:hover:bg-slate-800 p-5 rounded-2xl border border-rose-200 dark:border-rose-500/30 shadow-xs dark:shadow-lg cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Open
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              {defectCounts.Open}
            </span>
            <span className="text-xs font-medium text-rose-700/80 dark:text-rose-500/80">
              ({defects.length > 0 ? Math.round((defectCounts.Open / defects.length) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-rose-600 dark:text-rose-400/90 font-medium flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Requires Triage</span>
          </div>
        </div>

        {/* In Progress */}
        <div 
          onClick={() => onNavigateToSheet('In Progress')}
          className="bg-white dark:bg-slate-800/80 hover:bg-blue-50/50 dark:hover:bg-slate-800 p-5 rounded-2xl border border-blue-200 dark:border-blue-500/30 shadow-xs dark:shadow-lg cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              In Progress
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              {defectCounts['In Progress']}
            </span>
            <span className="text-xs font-medium text-blue-700/80 dark:text-blue-500/80">
              ({defects.length > 0 ? Math.round((defectCounts['In Progress'] / defects.length) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400/90">
            Dev Active Resolution
          </div>
        </div>

        {/* Doubt */}
        <div 
          onClick={() => onNavigateToSheet('Doubt')}
          className="bg-white dark:bg-slate-800/80 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 p-5 rounded-2xl border border-purple-200 dark:border-purple-600/30 shadow-xs dark:shadow-lg cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Doubt
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
              {defectCounts.Doubt}
            </span>
            <span className="text-xs font-medium text-purple-700/80 dark:text-purple-400/80">
              ({defects.length > 0 ? Math.round((defectCounts.Doubt / defects.length) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-purple-700 dark:text-purple-400/90">
            Clarification Needed
          </div>
        </div>

        {/* Resolved & Closed */}
        <div 
          onClick={() => onNavigateToSheet('Resolved')}
          className="bg-white dark:bg-slate-800/80 hover:bg-emerald-50/50 dark:hover:bg-slate-800 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 shadow-xs dark:shadow-lg cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Resolved / Closed
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {defectCounts.Resolved + defectCounts.Closed + defectCounts.Verified}
            </span>
            <span className="text-xs font-medium text-emerald-700/80 dark:text-emerald-500/80">
              ({defects.length > 0 ? Math.round(((defectCounts.Resolved + defectCounts.Closed + defectCounts.Verified) / defects.length) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Verified / Closed
          </div>
        </div>
      </div>

      {/* Primary Visualizations: Defect Status Pie / Donut Chart & Severity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart: Defect Status Distribution */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-lg flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700/60">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Defect Status Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Breakdown of defects across lifecycle stages ({defects.length} total logged)
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-mono font-medium whitespace-nowrap shrink-0">
              Open Rate: {defects.length > 0 ? Math.round((defectCounts.Open / defects.length) * 100) : 0}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-4">
            <div className="sm:col-span-7 h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defectStatusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {defectStatusChartData.map((entry, index) => (
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
                  {defects.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Defects
                </span>
              </div>
            </div>

            <div className="sm:col-span-5 space-y-2">
              {[
                { label: 'Open', count: defectCounts.Open, color: 'bg-rose-500', textColor: 'text-rose-600 dark:text-rose-400' },
                { label: 'In Progress', count: defectCounts['In Progress'], color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' },
                { label: 'Doubt', count: defectCounts.Doubt, color: 'bg-purple-500', textColor: 'text-purple-600 dark:text-purple-400' },
                { label: 'Resolved / Verified', count: defectCounts.Resolved + defectCounts.Verified, color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Closed', count: defectCounts.Closed, color: 'bg-slate-400', textColor: 'text-slate-600 dark:text-slate-400' },
              ].map(item => (
                <div 
                  key={item.label}
                  onClick={() => onNavigateToSheet(item.label.split(' ')[0])}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/40 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold font-mono ${item.textColor}`}>{item.count}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">
                      ({defects.length > 0 ? Math.round((item.count / defects.length) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Live synchronized with defect repository</span>
            <button 
              onClick={() => onNavigateToSheet()}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
            >
              View all defects in sheet <ArrowRight className="w-3.5 h-3.5" />
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
                  {criticalDefects.length > 0 ? `${criticalDefects[0].bugId} (${criticalDefects[0].severity} Severity)` : 'No active blocker defects'}
                </span>
              </div>
            </div>
            {criticalDefects.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 whitespace-nowrap shrink-0">
                {criticalDefects[0].defectStatus}
              </span>
            )}
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
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {bug.testCaseId}
                        </span>
                        {bug.screenshotPng && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <Tag className="w-2.5 h-2.5" />
                            PNG
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                        {bug.title}
                      </h4>
                      {bug.summary && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {bug.summary}
                        </p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold shrink-0">
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

        {/* Doubt / Clarification Defects list */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-purple-200 dark:border-purple-600/30 shadow-xs dark:shadow-lg transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <HelpCircle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Doubt &amp; Clarification Items ({doubtDefects.length})
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Defects requiring Product/Dev requirement clarification
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigateToSheet('Doubt')}
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
            {doubtDefects.length > 0 ? (
              doubtDefects.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => onSelectDefect(item)}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/40 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
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
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-600/30 whitespace-nowrap shrink-0">
                    Doubt
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No defects currently marked as Doubt.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Metadata Card: Only showcase the project the user is assigned to and QA members without designations */}
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
            {isUserAssignedToProject ? (
              <>
                <div className="text-base font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                  <span>{projectMeta.projectName}</span>
                  {projectMeta.tag && (
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                      #{projectMeta.tag}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    v{projectMeta.version || '5.1.0'} (Rev. {projectMeta.revision || '2502'})
                  </span>
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
              </>
            ) : userAssignedProjects.length > 0 ? (
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {userAssignedProjects.join(', ')}
                </div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400">
                  User assigned project scope
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                No active project assigned to this account
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Execution Schedule
            </span>
            {isUserAssignedToProject ? (
              <div className="text-slate-700 dark:text-slate-200 font-mono text-xs space-y-0.5">
                <div><strong className="text-slate-500 dark:text-slate-400 font-sans">Start:</strong> {projectMeta.estimatedStartDate}</div>
                <div><strong className="text-slate-500 dark:text-slate-400 font-sans">End:</strong> {projectMeta.estimatedEndDate}</div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                Schedule scoped to active project
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Assigned QA Members
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {assignedQAMembersForThisProject.length > 0 ? (
                assignedQAMembersForThisProject.map((member, i) => (
                  <span 
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                  >
                    {member}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">
                  No QA members assigned
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

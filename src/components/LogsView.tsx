import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Users,
  Radio,
  Search,
  Filter,
  Download,
  Clock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  MessageSquare,
  RefreshCw,
  Eye,
  LogOut,
  LogIn,
  Bug,
  KeyRound,
  Settings,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { UserSession, ActivityLogItem, QAUser, DefectItem } from '../types.ts';
import { subscribeToActivityLogs, seedInitialActivityLogsIfEmpty, subscribeToOnlineSessions } from '../firebase/presenceService.ts';
import { getAllQAUsers } from '../firebase/authService.ts';

interface LogsViewProps {
  currentUser: string;
  onlineUsers?: UserSession[];
  allTeamUsers?: QAUser[];
  defects?: DefectItem[];
  embedded?: boolean;
  onOpenDefectModal?: (defect: DefectItem) => void;
  onNavigateToChatWithUser?: (username: string) => void;
}

export const LogsView: React.FC<LogsViewProps> = ({
  currentUser,
  onlineUsers,
  allTeamUsers,
  defects = [],
  embedded = false,
  onOpenDefectModal,
  onNavigateToChatWithUser
}) => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [internalOnlineUsers, setInternalOnlineUsers] = useState<UserSession[]>([]);
  const [internalTeamUsers, setInternalTeamUsers] = useState<QAUser[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');
  const [isLiveStreamActive, setIsLiveStreamActive] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'audit'>('sessions');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load and subscribe to real-time activity logs
  useEffect(() => {
    seedInitialActivityLogsIfEmpty();
    const unsubscribe = subscribeToActivityLogs((incomingLogs) => {
      if (isLiveStreamActive) {
        setLogs(incomingLogs);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [isLiveStreamActive]);

  // Always subscribe to online sessions for live presence synchronization
  useEffect(() => {
    const unsub = subscribeToOnlineSessions((sessions) => {
      setInternalOnlineUsers(sessions);
    });
    return () => unsub();
  }, []);

  // Load team users if not provided externally
  useEffect(() => {
    if (!allTeamUsers || allTeamUsers.length === 0) {
      getAllQAUsers().then((usersList) => {
        if (Array.isArray(usersList) && usersList.length > 0) {
          setInternalTeamUsers(usersList);
        }
      }).catch((err) => {
        console.warn('Failed to load team users in LogsView:', err);
      });
    }
  }, [allTeamUsers]);

  // Merge external and internal online sessions
  const effectiveOnlineUsers = useMemo(() => {
    const map = new Map<string, UserSession>();
    // Prioritize sessions with most recent lastActive
    [...(internalOnlineUsers || []), ...(onlineUsers || [])].forEach((s) => {
      if (!s || !s.username) return;
      const uname = s.username.toLowerCase();
      const existing = map.get(uname);
      if (!existing || (s.lastActive || 0) > (existing.lastActive || 0)) {
        map.set(uname, s);
      }
    });
    return Array.from(map.values());
  }, [onlineUsers, internalOnlineUsers]);

  // Comprehensive team list including any online or logged users
  const effectiveTeamUsers = useMemo(() => {
    const baseList = (allTeamUsers && allTeamUsers.length > 0) ? [...allTeamUsers] : [...internalTeamUsers];
    const userMap = new Map<string, QAUser>();
    
    baseList.forEach(u => {
      if (u && u.username) userMap.set(u.username.toLowerCase(), u);
    });

    // Add any users discovered via active online sessions
    effectiveOnlineUsers.forEach(s => {
      const uname = s.username.toLowerCase();
      if (!userMap.has(uname)) {
        userMap.set(uname, {
          username: uname,
          name: s.name || uname,
          role: s.role || 'QA Engineer',
          email: `${uname}@illusio.tech`,
          password: '',
          assignedProjects: ['Enterprise Core HR Portal'],
          permissions: {
            canDeleteDefects: false,
            canEditAllDefects: true,
            canCleanDatabase: false
          },
          status: 'active',
          createdAt: s.loginTime || new Date().toISOString()
        });
      }
    });

    return Array.from(userMap.values());
  }, [allTeamUsers, internalTeamUsers, effectiveOnlineUsers]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const usersList = await getAllQAUsers();
      if (Array.isArray(usersList)) {
        setInternalTeamUsers(usersList);
      }
    } catch {}
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Relative time helper
  const formatTimeAgo = (epochMs: number) => {
    const diff = Math.max(0, Date.now() - epochMs);
    const secs = Math.floor(diff / 1000);
    if (secs < 15) return 'Just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(epochMs).toLocaleDateString();
  };

  // Format exact date time
  const formatExactTime = (isoString?: string) => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Type Filter
      if (selectedTypeFilter === 'LOGINS' && log.type !== 'LOGIN' && log.type !== 'LOGOUT') {
        return false;
      }
      if (
        selectedTypeFilter === 'DEFECTS' &&
        !log.type.startsWith('DEFECT_')
      ) {
        return false;
      }
      if (
        selectedTypeFilter === 'SECURITY' &&
        log.type !== 'PASSWORD_CHANGE' &&
        log.type !== 'SETTINGS_UPDATE' &&
        log.type !== 'USER_CREATE' &&
        log.type !== 'DATABASE_CLEAN'
      ) {
        return false;
      }

      // User Filter
      if (selectedUserFilter !== 'ALL' && log.username.toLowerCase() !== selectedUserFilter.toLowerCase()) {
        return false;
      }

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUser = log.username.toLowerCase().includes(q) || log.name.toLowerCase().includes(q);
        const matchDetails = log.details.toLowerCase().includes(q);
        const matchDefect = log.defectId ? log.defectId.toLowerCase().includes(q) : false;
        if (!matchUser && !matchDetails && !matchDefect) return false;
      }

      return true;
    });
  }, [logs, selectedTypeFilter, selectedUserFilter, searchQuery]);

  // Export filtered logs to CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Event Type', 'User Handle', 'Name', 'Details', 'Defect ID'];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.type,
      l.username,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.defectId || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `qa_activity_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find defect by ID
  const handleOpenDefect = (defectId?: string) => {
    if (!defectId || !onOpenDefectModal) return;
    const target = defects.find(
      (d) => d.id === defectId || d.bugId.toLowerCase() === defectId.toLowerCase()
    );
    if (target) {
      onOpenDefectModal(target);
    }
  };

  return (
    <div className={embedded ? "space-y-6 animate-in fade-in duration-200" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"}>
      
      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Real-time Logged-in Count */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 rounded-2xl p-5 border border-emerald-500/20 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Active Sessions
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              LIVE
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
              {effectiveOnlineUsers.length}
            </span>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {effectiveOnlineUsers.length === 1 ? 'Engineer Online' : 'Engineers Online'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Real-time active presence across QA team
          </p>
        </div>

        {/* Total QA Accounts */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Registered Team
            </span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
              {effectiveTeamUsers.length}
            </span>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Accounts
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {Math.max(0, effectiveTeamUsers.length - effectiveOnlineUsers.length)} currently offline
          </p>
        </div>

        {/* Audit Events Logged */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Audit Events
            </span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
              {logs.length}
            </span>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Stream Records
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Persistent Firestore audit trace
          </p>
        </div>

        {/* Cloud Presence Listener Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Sync Engine
            </span>
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
            20s Heartbeat · Firestore Presence
          </p>
        </div>

      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('sessions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'sessions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Currently Logged-In Users</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeSubTab === 'sessions' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
              {effectiveOnlineUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Real-Time Activity Logs</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeSubTab === 'audit' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
              {logs.length}
            </span>
          </button>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLiveStreamActive(!isLiveStreamActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              isLiveStreamActive
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            }`}
            title="Toggle live stream update"
          >
            <span className={`w-2 h-2 rounded-full ${isLiveStreamActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{isLiveStreamActive ? 'Live Stream Active' : 'Stream Paused'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CURRENTLY LOGGED-IN USERS ROSTER */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Active QA Team Sessions</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-800/60 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {effectiveOnlineUsers.length} Online Now
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time active sessions synchronized across all browsers, systems & networks
              </p>
            </div>
            
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Status'}</span>
            </button>
          </div>

          {/* Grid of Online Users Cards */}
          {effectiveOnlineUsers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No Other Users Currently Logged In
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Only your session or inactive accounts detected. When another engineer signs in, their card will immediately appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {effectiveOnlineUsers.map((session) => {
                const isMe = session.username.toLowerCase() === currentUser.toLowerCase();
                const matchedUser = effectiveTeamUsers.find(
                  (u) => u.username.toLowerCase() === session.username.toLowerCase()
                );
                const role = matchedUser?.role || session.role || 'QA Member';
                const isAdmin = session.username.toLowerCase() === 'admin' || session.username.toLowerCase() === 'sahil_roy';

                return (
                  <div
                    key={session.sessionId}
                    className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all duration-200 relative overflow-hidden shadow-xs hover:shadow-md ${
                      isMe
                        ? 'border-indigo-400 dark:border-indigo-500/50 ring-2 ring-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Top Status Bar */}
                    <div className="flex items-start justify-between gap-3">
                      
                      {/* Avatar with live online ring */}
                      <div className="relative">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold uppercase shadow-xs ${
                          isAdmin
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                            : 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white'
                        }`}>
                          {session.name.slice(0, 2)}
                        </div>
                        {/* Glowing green dot */}
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                      </div>

                      {/* Online Pill */}
                      <div className="flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          ONLINE
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          Heartbeat {formatTimeAgo(session.lastActive)}
                        </span>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {session.name}
                        </h3>
                        {isMe && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            YOU
                          </span>
                        )}
                        {isAdmin && (
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Administrator Privileges" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        @{session.username}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                        {role}
                      </div>
                    </div>

                    {/* Session Metadata */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Login Time</span>
                        </span>
                        <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                          {formatExactTime(session.loginTime)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-slate-400" />
                          <span>Platform</span>
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                          {session.browser || 'Browser'} · {session.os || 'Desktop'}
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]" title={session.sessionId}>
                        ID: {session.sessionId.slice(0, 14)}...
                      </span>

                      {!isMe && onNavigateToChatWithUser && (
                        <button
                          onClick={() => onNavigateToChatWithUser(session.username)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Real-Time Login Activity Across All Systems */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <LogIn className="w-4 h-4 text-emerald-500" />
                <span>Real-Time Login Activity Feed (All Systems)</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Live Cloud Sync
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden shadow-xs">
              {logs
                .filter((l) => l.type === 'LOGIN' || l.type === 'LOGOUT' || (l.details && (l.details.toLowerCase().includes('sign') || l.details.toLowerCase().includes('login') || l.details.toLowerCase().includes('authenticat'))))
                .slice(0, 8)
                .map((log) => {
                  const isLogin = log.type === 'LOGIN' || log.details?.toLowerCase().includes('authenticated') || log.details?.toLowerCase().includes('sign in') || log.details?.toLowerCase().includes('signed into');
                  return (
                    <div key={log.id} className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          isLogin 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {isLogin ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {log.name || log.username}
                            </span>
                            <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                              @{log.username}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isLogin 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {isLogin ? 'LOGGED IN' : 'SIGNED OUT'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                            {log.details}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                          {formatTimeAgo(log.createdAt)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatExactTime(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              {logs.filter((l) => l.type === 'LOGIN' || l.type === 'LOGOUT' || (l.details && (l.details.toLowerCase().includes('sign') || l.details.toLowerCase().includes('login') || l.details.toLowerCase().includes('authenticat')))).length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  No sign-in events recorded yet. When any account logs in from any system, it will automatically appear here.
                </div>
              )}
            </div>
          </div>

          {/* Offline Registered Members Overview */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Offline Team Members ({Math.max(0, effectiveTeamUsers.length - effectiveOnlineUsers.length)})
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {effectiveTeamUsers
                .filter(
                  (u) =>
                    !effectiveOnlineUsers.some(
                      (o) => o.username.toLowerCase() === u.username.toLowerCase()
                    )
                )
                .map((u) => (
                  <div
                    key={u.username}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2.5 opacity-75"
                  >
                    <div className="relative">
                      <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[10px] font-bold uppercase">
                        {u.name.slice(0, 2)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600 ring-1 ring-white dark:ring-slate-900" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                        {u.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        @{u.username} · Offline
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS STREAM */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          
          {/* Filter & Search Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit logs by user, action, defect ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Event Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {[
                { id: 'ALL', label: 'All Events' },
                { id: 'LOGINS', label: 'Logins & Sessions' },
                { id: 'DEFECTS', label: 'Defect Edits' },
                { id: 'SECURITY', label: 'Security & Admin' }
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setSelectedTypeFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedTypeFilter === pill.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {pill.label}
                </button>
              ))}

              {/* User Dropdown */}
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                aria-label="Filter by user"
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Users</option>
                {effectiveTeamUsers.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.name} (@{u.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audit Log Table / Stream Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No activity logs matching your filter criteria
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting the search query or category filters above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Activity Summary</th>
                      <th className="py-3 px-4 text-right">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                    {filteredLogs.map((log) => {
                      // Event Badge Style
                      let badgeBg = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                      let icon = <Info className="w-3 h-3" />;

                      if (log.type === 'LOGIN') {
                        badgeBg = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
                        icon = <LogIn className="w-3 h-3" />;
                      } else if (log.type === 'LOGOUT') {
                        badgeBg = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
                        icon = <LogOut className="w-3 h-3" />;
                      } else if (log.type === 'DEFECT_CREATE') {
                        badgeBg = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
                        icon = <Bug className="w-3 h-3" />;
                      } else if (log.type === 'DEFECT_UPDATE' || log.type === 'DEFECT_STATUS_CHANGE') {
                        badgeBg = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800';
                        icon = <RefreshCw className="w-3 h-3" />;
                      } else if (log.type === 'DEFECT_DELETE') {
                        badgeBg = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800';
                        icon = <AlertTriangle className="w-3 h-3" />;
                      } else if (log.type === 'PASSWORD_CHANGE') {
                        badgeBg = 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800';
                        icon = <KeyRound className="w-3 h-3" />;
                      } else if (log.type === 'SETTINGS_UPDATE') {
                        badgeBg = 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800';
                        icon = <Settings className="w-3 h-3" />;
                      }

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                        >
                          {/* Time */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                              {formatExactTime(log.timestamp)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatTimeAgo(log.createdAt)}
                            </div>
                          </td>

                          {/* Event Type */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold ${badgeBg}`}>
                              {icon}
                              <span>{log.type}</span>
                            </span>
                          </td>

                          {/* Actor */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold uppercase">
                                {log.name.slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                                  {log.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  @{log.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Details */}
                          <td className="py-3 px-4">
                            <span className="text-slate-700 dark:text-slate-300 font-normal">
                              {log.details}
                            </span>
                          </td>

                          {/* Target Reference */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {log.defectId ? (
                              <button
                                onClick={() => handleOpenDefect(log.defectId)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold font-mono transition cursor-pointer"
                              >
                                <span>{log.defectId}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            ) : (
                              <span className="text-slate-400 font-mono text-[10px]">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

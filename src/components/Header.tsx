import React, { useState, useRef, useEffect } from 'react';
import { 
  Bug, 
  BarChart3, 
  Table, 
  PlusCircle, 
  Upload, 
  RefreshCw,
  Database,
  Sun,
  Moon,
  ChevronDown,
  Check,
  Info,
  User,
  LogOut,
  KeyRound,
  ShieldCheck,
  MessageSquare,
  Radio
} from 'lucide-react';
import { ProjectMeta } from '../types.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { isUserAdmin } from '../utils/permissions.ts';

interface HeaderProps {
  activeTab: 'dashboard' | 'sheet' | 'chat' | 'about' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'sheet' | 'chat' | 'about' | 'admin') => void;
  projectMeta: ProjectMeta;
  totalDefects: number;
  unreadChatCount?: number;
  onlineUsersCount?: number;
  onOpenNewDefect: () => void;
  onExportCSV: () => void;
  onRefresh: () => void;
  isSyncing: boolean;
  currentUser?: string;
  onLogout?: () => void;
  onChangePassword?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  projectMeta,
  totalDefects,
  unreadChatCount = 0,
  onlineUsersCount = 1,
  onOpenNewDefect,
  onExportCSV,
  onRefresh,
  isSyncing,
  currentUser = '',
  onLogout,
  onChangePassword
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = isUserAdmin(currentUser);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isMenuOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isUserMenuOpen]);

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: BarChart3,
      description: 'Test KPIs & defect metrics'
    },
    {
      id: 'sheet' as const,
      label: 'Defect Sheet',
      icon: Table,
      badge: totalDefects,
      description: 'Full test execution & bug log'
    },
    {
      id: 'chat' as const,
      label: 'Team Chat',
      icon: MessageSquare,
      badge: unreadChatCount > 0 ? unreadChatCount : undefined,
      description: 'Live QA team messaging & defect discussions'
    },
    ...(isAdmin ? [{
      id: 'admin' as const,
      label: 'Administration',
      icon: ShieldCheck,
      badge: onlineUsersCount > 0 ? `${onlineUsersCount} Online` : undefined,
      badgeColor: 'emerald',
      description: 'Engineers, RBAC, live logs & project parameters'
    }] : []),
    {
      id: 'about' as const,
      label: 'About',
      icon: Info,
      description: 'App specifications & Illusio Tech info'
    }
  ];

  const currentNav = navItems.find(item => item.id === activeTab) || navItems[0];
  const CurrentIcon = currentNav.icon;

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between py-2 sm:py-2.5 gap-1.5 sm:gap-4">
          {/* App Branding & Title - Click to go to Dashboard */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none group cursor-pointer shrink-0"
              title="Go to Dashboard"
              aria-label="Go to Dashboard"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0 shadow-xs group-hover:border-indigo-400 dark:group-hover:border-indigo-400 group-hover:bg-indigo-100/50 dark:group-hover:bg-indigo-900/40 transition">
                <Bug className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
              </div>
              <div className="flex flex-col shrink-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs sm:text-sm md:text-base font-extrabold tracking-tight group-hover:opacity-90 transition-opacity whitespace-nowrap">
                    <span className="text-indigo-600 dark:text-indigo-400 font-black">Illusion</span>
                    <span className="hidden sm:inline text-slate-900 dark:text-white">_Dashboard</span>
                  </h1>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden xl:block whitespace-nowrap">
                  Quality Engineering &amp; Defect Tracker
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Tabs (Visible on lg screens and larger) */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isSpecialAdmin = item.id === 'admin';

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? isSpecialAdmin
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-300 dark:border-indigo-500/30 font-semibold shadow-xs'
                      : isSpecialAdmin
                        ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono flex items-center gap-1 shrink-0 ${
                      item.badgeColor === 'emerald'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {item.badgeColor === 'emerald' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                      <span>{item.badge}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
            {/* Mobile / Tablet Navigation Button */}
            <div className="relative lg:hidden shrink-0" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(prev => !prev)}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white font-medium transition border border-slate-200 dark:border-slate-700/80 dark:hover:border-slate-600 shadow-xs shrink-0"
                aria-expanded={isMenuOpen}
                aria-label="Toggle navigation menu"
              >
                <CurrentIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold max-w-[55px] xs:max-w-[85px] sm:max-w-[120px] truncate">{currentNav.label}</span>
                <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-150 shrink-0 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mobile Backdrop to click away safely */}
              {isMenuOpen && (
                <div 
                  className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 lg:hidden"
                  onClick={() => setIsMenuOpen(false)}
                />
              )}

              {/* Dropdown Menu Modal / Popover */}
              {isMenuOpen && (
                <div className="fixed left-3 right-3 top-[56px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 max-w-sm sm:max-w-none mx-auto sm:mx-0 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60 mb-1">
                    Navigation Views
                  </div>
                  {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left transition ${
                          isActive
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">{item.label}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{item.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.badge !== undefined && (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono flex items-center gap-1 ${
                              item.badgeColor === 'emerald'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>
                              {item.badgeColor === 'emerald' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                              <span>{item.badge}</span>
                            </span>
                          )}
                          {isActive && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                      </button>
                    );
                  })}

                  <div className="border-t border-slate-100 dark:border-slate-700/60 my-1 pt-1">
                    <button
                      onClick={() => {
                        onExportCSV();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
                    >
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span>Export CSV Report</span>
                    </button>

                    <button
                      onClick={() => {
                        onRefresh();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition sm:hidden"
                    >
                      <div className="flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 text-slate-400 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`} />
                        <span>Sync Database</span>
                      </div>
                      {isSyncing && <span className="text-[10px] text-indigo-500 font-medium">Syncing...</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Export Button */}
            <button
              onClick={onExportCSV}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition border border-slate-200 dark:border-slate-700/80 cursor-pointer"
              title="Export test execution & defect sheet CSV"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Export</span>
            </button>

            {/* Refresh Sync Button */}
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="hidden xs:inline-flex items-center justify-center p-1.5 sm:px-2 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition border border-slate-200 dark:border-slate-700/60 cursor-pointer"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-500 dark:text-indigo-400' : ''}`} />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center p-0 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition border border-slate-200 dark:border-slate-700/60 cursor-pointer shrink-0"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark/light theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden xl:inline ml-1 font-medium text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="hidden xl:inline ml-1 font-medium text-[11px]">Dark</span>
                </>
              )}
            </button>

            {/* Primary Action: Log Defect */}
            <button
              onClick={onOpenNewDefect}
              className="w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center gap-1 sm:gap-1.5 p-0 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition shrink-0 cursor-pointer"
              title="Log new defect"
              aria-label="Log new defect"
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Log Defect</span>
            </button>

            {/* User Profile Account Dropdown */}
            {onLogout && (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button 
                  onClick={() => setIsUserMenuOpen(prev => !prev)}
                  className="w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center gap-1 p-0 sm:px-2 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono border border-slate-200 dark:border-slate-700/60 transition cursor-pointer shrink-0"
                  title={`User Menu: ${currentUser}`}
                  aria-expanded={isUserMenuOpen}
                  aria-label="Toggle user account dropdown"
                >
                  <User className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="font-semibold text-[11px] hidden md:inline truncate max-w-[80px]">{currentUser}</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 hidden sm:inline-block shrink-0 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Mobile Backdrop */}
                {isUserMenuOpen && (
                  <div 
                    className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 sm:hidden"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                )}

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-24px)] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/60">
                      <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {currentUser === 'jit_mondal' ? 'Jeet Mondal' : currentUser === 'sahil_roy' ? 'Sahil Roy' : currentUser}
                      </div>
                      <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                        @{currentUser}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">
                        {currentUser === 'sahil_roy' 
                          ? 'Administrator' 
                          : currentUser === 'jit_mondal' 
                            ? 'QA Automation Engineer' 
                            : 'QA Engineer'}
                      </div>
                    </div>

                    <div className="px-3 py-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/60">
                      <span>Workspace:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">Illusio QA</span>
                    </div>

                    {/* Admin Switch in user menu */}
                    {isAdmin && (
                      <div className="px-2 pt-1.5 pb-1 border-b border-slate-100 dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setActiveTab('admin');
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition text-left text-xs font-semibold cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Administration Console</span>
                        </button>
                      </div>
                    )}

                    {onChangePassword && (
                      <div className="px-2 pt-1.5 pb-1 border-b border-slate-100 dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onChangePassword();
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition text-left text-xs font-medium cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Change Password</span>
                        </button>
                      </div>
                    )}

                    <div className="px-2 pt-2">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold transition border border-rose-200 dark:border-rose-900/60 shadow-xs cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform" />
                          <span>Logout</span>
                        </div>
                        <span className="text-[10px] text-rose-500 font-normal">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};




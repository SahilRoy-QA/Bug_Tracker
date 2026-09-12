import React, { useState, useRef, useEffect } from 'react';
import { 
  Bug, 
  BarChart3, 
  Table, 
  Settings, 
  PlusCircle, 
  Download, 
  RefreshCw,
  Database,
  Sun,
  Moon,
  ChevronDown,
  Menu,
  X,
  Check,
  Info
} from 'lucide-react';
import { ProjectMeta } from '../types.ts';
import { useTheme } from '../context/ThemeContext.tsx';

interface HeaderProps {
  activeTab: 'dashboard' | 'sheet' | 'project' | 'about';
  setActiveTab: (tab: 'dashboard' | 'sheet' | 'project' | 'about') => void;
  projectMeta: ProjectMeta;
  totalDefects: number;
  onOpenNewDefect: () => void;
  onExportCSV: () => void;
  onRefresh: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  projectMeta,
  totalDefects,
  onOpenNewDefect,
  onExportCSV,
  onRefresh,
  isSyncing
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

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
      id: 'project' as const,
      label: 'Project Details',
      icon: Settings,
      description: 'Test suite & configuration'
    },
    {
      id: 'about' as const,
      label: 'About',
      icon: Info,
      description: 'App details & Illusio Tech info'
    }
  ];

  const currentNav = navItems.find(item => item.id === activeTab) || navItems[0];
  const CurrentIcon = currentNav.icon;

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between py-2 sm:py-2.5 gap-2 sm:gap-4">
          {/* App Branding & Project Title - Click to go to Dashboard */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none group cursor-pointer"
              title="Go to Dashboard"
              aria-label="Go to Dashboard"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0 shadow-xs group-hover:border-indigo-400 dark:group-hover:border-indigo-400 group-hover:bg-indigo-100/50 dark:group-hover:bg-indigo-900/40 transition">
                <Bug className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 whitespace-nowrap transition-colors">
                    Illusion_Dashboard
                  </h1>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                  Quality Engineering &amp; Defect Tracker by Illusio Tech
                </p>
              </div>
            </button>

            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 truncate max-w-[120px]">
                {projectMeta.projectName}
              </span>
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Firestore Live
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Visible on md screens and larger) */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-300 dark:border-indigo-500/30 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
            {/* Mobile / Tablet Navigation Button (Replaces the horizontal scrollbar) */}
            <div className="relative md:hidden" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(prev => !prev)}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white font-medium transition border border-slate-200 dark:border-slate-700/80 dark:hover:border-slate-600 shadow-xs"
                aria-expanded={isMenuOpen}
                aria-label="Toggle navigation menu"
              >
                <CurrentIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold max-w-[70px] xs:max-w-[95px] sm:max-w-[120px] truncate">{currentNav.label}</span>
                <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-150 shrink-0 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mobile Backdrop to click away safely */}
              {isMenuOpen && (
                <div 
                  className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 md:hidden"
                  onClick={() => setIsMenuOpen(false)}
                />
              )}

              {/* Dropdown Menu Modal / Popover - dynamically positioned to avoid clipping */}
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
                            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                              {item.badge}
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
                      <Download className="w-4 h-4 text-slate-400" />
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
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition border border-slate-200 dark:border-slate-700/80"
              title="Download test execution & defect sheet CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Export</span>
            </button>

            {/* Refresh Sync Button (hidden on tiny screens, accessible in menu) */}
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="hidden xs:inline-flex items-center justify-center p-1.5 sm:px-2 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition border border-slate-200 dark:border-slate-700/60"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-500 dark:text-indigo-400' : ''}`} />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="inline-flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition border border-slate-200 dark:border-slate-700/60"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark/light theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xl:inline ml-1 font-medium text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden xl:inline ml-1 font-medium text-[11px]">Dark</span>
                </>
              )}
            </button>

            {/* Primary Action: Log Defect */}
            <button
              onClick={onOpenNewDefect}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">Log</span>
              <span className="hidden sm:inline">Defect</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};



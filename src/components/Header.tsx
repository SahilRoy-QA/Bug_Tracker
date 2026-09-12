import React from 'react';
import { 
  Bug, 
  BarChart3, 
  Table, 
  Settings, 
  PlusCircle, 
  Download, 
  ExternalLink, 
  FolderGit2, 
  HardDrive, 
  RefreshCw,
  Database,
  Sun,
  Moon
} from 'lucide-react';
import { ProjectMeta } from '../types.ts';
import { useTheme } from '../context/ThemeContext.tsx';

interface HeaderProps {
  activeTab: 'dashboard' | 'sheet' | 'project';
  setActiveTab: (tab: 'dashboard' | 'sheet' | 'project') => void;
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

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top bar with project info and external links */}
        <div className="flex items-center justify-between py-2.5 sm:py-3 border-b border-slate-200/80 dark:border-slate-800/60 gap-2 sm:gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
              <Bug className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100 truncate">
                  Defect &amp; Bug Tracker
                </h1>
                <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 truncate max-w-[130px] sm:max-w-none">
                  {projectMeta.projectName}
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  <Database className="w-3 h-3" />
                  Database Synced
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                Test Execution Status &amp; Defect Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs shrink-0">
            {projectMeta.projectLink && (
              <a
                href={projectMeta.projectLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition border border-slate-200 dark:border-slate-700/60"
                title="Open Project Web App Link"
              >
                <ExternalLink className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline font-medium">App</span>
              </a>
            )}

            {projectMeta.driveLink && (
              <a
                href={projectMeta.driveLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition border border-slate-200 dark:border-slate-700/60"
                title="Open QA Test Evidence & Logs Drive"
              >
                <HardDrive className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline font-medium">Drive</span>
              </a>
            )}

            {projectMeta.githubRepoLink && (
              <a
                href={projectMeta.githubRepoLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition border border-slate-200 dark:border-slate-700/60"
                title="Open GitHub Repository"
              >
                <FolderGit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline font-medium">Repo</span>
              </a>
            )}

            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="inline-flex items-center justify-center p-1.5 sm:px-2 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition border border-slate-200 dark:border-slate-700/60"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-500 dark:text-indigo-400' : ''}`} />
            </button>

            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="inline-flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition border border-slate-200 dark:border-slate-700/60"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark/light theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline ml-1 font-medium text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden md:inline ml-1 font-medium text-[11px]">Dark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs and Primary Actions */}
        <div className="flex items-center justify-between py-2 gap-2 overflow-x-auto no-scrollbar">
          <nav className="flex space-x-1 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'dashboard'
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-300 dark:border-indigo-500/30 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('sheet')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'sheet'
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-300 dark:border-indigo-500/30 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Defect Sheet</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                {totalDefects}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('project')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'project'
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-300 dark:border-indigo-500/30 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Project Details</span>
              <span className="sm:hidden">Settings</span>
            </button>
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onExportCSV}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition border border-slate-200 dark:border-slate-700/80"
              title="Download test execution & defect sheet CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={onOpenNewDefect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Log Defect</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};


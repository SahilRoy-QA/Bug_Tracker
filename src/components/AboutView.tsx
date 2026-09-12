import React from 'react';
import { 
  Building2, 
  Layers, 
  GitBranch, 
  Calendar, 
  ShieldCheck, 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  Award,
  Terminal,
  Activity,
  Database
} from 'lucide-react';

export const AboutView: React.FC = () => {
  const specs = [
    { label: 'Application Name', value: 'Illusion_Dashboard', icon: Layers, highlight: true },
    { label: 'Company Name', value: 'Illusio Tech', icon: Building2, highlight: true },
    { label: 'App Version', value: '4.2.1', icon: Award, highlight: true },
    { label: 'Revision', value: '1410', icon: GitBranch, highlight: true },
    { label: 'Database', value: 'Google Firebase Firestore (Real-Time)', icon: Database, highlight: true },
    { label: 'Release Channel', value: 'Enterprise Production (Stable)', icon: ShieldCheck },
    { label: 'Environment', value: 'Cloud Containerized Node/React Runtime', icon: Terminal },
    { label: 'Engine', value: 'React 18 + TypeScript + Vite + Firebase', icon: Cpu },
    { label: 'Release Date', value: 'September 2026', icon: Calendar }
  ];

  const modules = [
    {
      title: 'Executive QA Status & Analytics',
      desc: 'Real-time test execution KPIs, visual pass/fail/blocked distributions, pass rate analytics, and defect severity indicators.'
    },
    {
      title: 'Defect Tracker Database Sheet',
      desc: 'High-density, real-time synced QA execution spreadsheet with inline editing, search, multi-column filters, and bulk status workflows.'
    },
    {
      title: 'AI-Powered Defect Triage',
      desc: 'Automatic defect severity, priority, and root-cause suggestions to accelerate bug triage and test cycle progression.'
    },
    {
      title: 'Enterprise CSV Import & Export',
      desc: 'Full compatibility with standard QA test execution report templates for offline audits, reporting, and archival.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Hero Card */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 whitespace-nowrap">
                Official Software Info
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Release
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
              Illusion_Dashboard
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
              Enterprise Quality Assurance, Test Execution Monitoring, and Defect Tracking Platform.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex flex-col items-start sm:items-end justify-center shrink-0">
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Developed by
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              Illusio Tech
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              v4.2.1 (Rev. 1410)
            </span>
          </div>
        </div>

        {/* Specifications Grid */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            System &amp; Build Specifications
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {specs.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={index} 
                  className={`p-3.5 rounded-xl border transition ${
                    item.highlight 
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/40' 
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5 text-slate-500 dark:text-slate-400">
                    <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono truncate">
                    {item.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Platform Architecture & Features */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-xl transition-colors">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Platform Architecture &amp; Capabilities
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Integrated modules powering test execution auditing and defect lifecycle tracking.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((mod, i) => (
            <div 
              key={i} 
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {mod.title}
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                {mod.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Copyright */}
      <div className="text-center space-y-1 text-xs text-slate-500 dark:text-slate-400 pt-2">
        <p className="font-medium text-slate-700 dark:text-slate-300">
          © {new Date().getFullYear()} Illusio Tech. All rights reserved.
        </p>
        <p className="text-[11px]">
          Illusion_Dashboard · Version 4.2.1 · Build Revision 1410 · Enterprise QA Suite
        </p>
      </div>
    </div>
  );
};

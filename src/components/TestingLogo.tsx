import React from 'react';

interface TestingLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const TestingLogo: React.FC<TestingLogoProps> = ({ size = 'lg', showSubtitle = true }) => {
  const sizeMap = {
    sm: { icon: 'w-10 h-10', text: 'text-base', sub: 'text-[10px]' },
    md: { icon: 'w-14 h-14', text: 'text-xl', sub: 'text-xs' },
    lg: { icon: 'w-20 h-20', text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 'w-24 h-24', text: 'text-3xl', sub: 'text-sm' },
  };

  const { icon, text, sub } = sizeMap[size];

  return (
    <div className="flex flex-col items-center select-none">
      {/* High-Fidelity QA Testing Emblem */}
      <div className={`relative ${icon} flex items-center justify-center`}>
        {/* Outer Pulsing Aura */}
        <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 dark:bg-indigo-500/30 blur-md animate-pulse" />

        {/* Shield / Radar Container */}
        <svg
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-md"
        >
          {/* Hexagonal Quality Shield Base */}
          <defs>
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="innerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="radarSweep" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Hex Shield Path */}
          <polygon
            points="40,4 74,18 74,54 40,76 6,54 6,18"
            fill="url(#innerGlow)"
            stroke="url(#shieldGrad)"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Concentric Radar Grid Rings (Test Coverage) */}
          <circle cx="40" cy="40" r="24" stroke="#6366f1" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
          <circle cx="40" cy="40" r="15" stroke="#10b981" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
          
          {/* Crosshairs for Test Alignment */}
          <line x1="40" y1="18" x2="40" y2="62" stroke="#6366f1" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
          <line x1="18" y1="40" x2="62" y2="40" stroke="#6366f1" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />

          {/* Bug Silhouette (The target of testing) */}
          {/* Bug Body */}
          <ellipse cx="38" cy="41" rx="9" ry="11" fill="#312e81" stroke="#818cf8" strokeWidth="1.5" />
          {/* Bug Head */}
          <circle cx="38" cy="27" r="4.5" fill="#4338ca" stroke="#a5b4fc" strokeWidth="1.5" />
          {/* Antennae */}
          <path d="M36 24 C33 20, 30 18, 27 19" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M40 24 C43 20, 46 18, 49 19" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          {/* Bug Legs */}
          <path d="M29 35 L21 33" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M47 35 L55 33" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M29 42 L19 43" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M47 42 L57 43" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M30 49 L23 53" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M46 49 L53 53" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />

          {/* Test Passed Checkmark Verification Badge (Overlay) */}
          <circle cx="53" cy="53" r="12" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
          <path
            d="M48 53 L51.5 56.5 L58 49.5"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>

        {/* Floating Test Status Badge */}
        <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-emerald-500 text-[9px] font-mono font-bold text-white shadow-xs">
          QA:PASS
        </div>
      </div>

      {/* Brand Title */}
      <div className="text-center mt-3">
        <h1 className={`${text} font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-1.5`}>
          <span>Illusion</span>
          <span className="text-indigo-600 dark:text-indigo-400">_Dashboard</span>
        </h1>
        {showSubtitle && (
          <p className={`${sub} text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-1 flex items-center justify-center gap-1.5`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            ENTERPRISE QA &amp; DEFECT MANAGEMENT
          </p>
        )}
      </div>
    </div>
  );
};

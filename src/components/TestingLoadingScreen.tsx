import React, { useState, useEffect } from 'react';
import { TestingLogo } from './TestingLogo.tsx';
import { CheckCircle2, ShieldCheck, Terminal, Activity, Layers, Database } from 'lucide-react';

interface TestingLoadingScreenProps {
  username: string;
  onComplete: () => void;
}

interface TestStep {
  id: number;
  label: string;
  detail: string;
  icon: React.ElementType;
}

export const TestingLoadingScreen: React.FC<TestingLoadingScreenProps> = ({ username, onComplete }) => {
  const [progress, setProgress] = useState(12);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    `[INFO] Session initiated for QA engineer: @${username}`,
    `[RUNNER] Booting Illusio automated QA test harness v4.2.1 (Rev 1410)...`,
  ]);

  const testSteps: TestStep[] = [
    {
      id: 1,
      label: 'Security & Auth Handshake',
      detail: 'Validating role privileges & security tokens',
      icon: ShieldCheck,
    },
    {
      id: 2,
      label: 'Scanning Test Artifacts',
      detail: 'Loading 16 test cases, regression matrices & suites',
      icon: Layers,
    },
    {
      id: 3,
      label: 'Evaluating Quality Gate Assertions',
      detail: 'Passed: 10, Failed: 1, Blocked: 5 | Pass Rate: 90.9%',
      icon: Activity,
    },
    {
      id: 4,
      label: 'Establishing Firestore Stream',
      detail: 'Connecting to Google Firebase Firestore live collection',
      icon: Database,
    },
  ];

  useEffect(() => {
    // Step progression timers
    const t1 = setTimeout(() => {
      setProgress(36);
      setCurrentStepIndex(1);
      setLogs(prev => [
        ...prev,
        `✔ ASSERT: auth.hasValidScope("qa_lead") [18ms]`,
        `[SUITE] Executing regression test sweep on "Online Banking Portal"...`
      ]);
    }, 600);

    const t2 = setTimeout(() => {
      setProgress(68);
      setCurrentStepIndex(2);
      setLogs(prev => [
        ...prev,
        `✔ TC-101 .. TC-116: 16 cases validated [34ms]`,
        `✔ ASSERT: defect_matrix.criticalDefects <= 1 [PASS]`,
        `[SYNC] Connecting to advance-infinity-w53bd Firestore instance...`
      ]);
    }, 1300);

    const t3 = setTimeout(() => {
      setProgress(92);
      setCurrentStepIndex(3);
      setLogs(prev => [
        ...prev,
        `✔ FIRESTORE: Live snapshot listener attached [26ms]`,
        `[READY] QA Environment calibrated. Launching Illusion_Dashboard...`
      ]);
    }, 2000);

    const t4 = setTimeout(() => {
      setProgress(100);
      setTimeout(onComplete, 400);
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete, username]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Testing Grid */}
      <div 
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#6366f1 1.5px, transparent 1.5px), radial-gradient(#10b981 1.5px, transparent 1.5px)`,
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px'
        }}
      />

      {/* Ambient Lighting Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full flex flex-col items-center space-y-6">
        {/* Testing Logo */}
        <TestingLogo size="md" showSubtitle={false} />

        {/* Radar Scanner Animation Container */}
        <div className="relative flex items-center justify-center my-2">
          {/* Outer Pulsing Ring */}
          <div className="w-24 h-24 rounded-full border border-indigo-500/30 animate-ping absolute opacity-40" />
          
          {/* Middle Rotating Radar Dish */}
          <div className="w-20 h-20 rounded-full border border-indigo-500/40 border-t-emerald-400 border-r-indigo-400 animate-spin flex items-center justify-center shadow-lg shadow-indigo-500/20">
            {/* Inner Core */}
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Loading Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono text-indigo-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            AUTOMATED QA PIPELINE EXECUTING
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white pt-1">
            Preparing Test Execution Suite
          </h2>
          <p className="text-xs text-slate-400">
            Authenticated as <span className="font-semibold text-indigo-300">@{username}</span> · Verifying test metrics...
          </p>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="w-full space-y-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">TEST_PIPELINE_STATUS</span>
            <span className="text-emerald-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Test Execution Checklist Items */}
          <div className="pt-2 space-y-2">
            {testSteps.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx < currentStepIndex || progress === 100;
              const isCurrent = idx === currentStepIndex && progress < 100;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-indigo-950/40 border border-indigo-500/30'
                      : isDone
                      ? 'bg-slate-900/40 border border-slate-800/40 text-slate-400'
                      : 'opacity-40'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : isCurrent
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate flex items-center gap-2">
                      <span>{step.label}</span>
                      {isDone && <span className="text-[10px] font-mono text-emerald-400">PASSED</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{step.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Test Runner Terminal Log */}
        <div className="w-full bg-black/70 border border-slate-800/90 rounded-xl p-3 font-mono text-[11px] space-y-1 shadow-inner max-h-28 overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1 border-b border-slate-800">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-indigo-400" />
              test-runner.stdout
            </span>
            <span className="text-emerald-500">LIVE FEED</span>
          </div>
          <div className="space-y-0.5 text-slate-300">
            {logs.slice(-3).map((log, i) => (
              <div key={i} className="truncate font-mono">
                {log.startsWith('✔') ? (
                  <span className="text-emerald-400">{log}</span>
                ) : (
                  <span className="text-slate-400">{log}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

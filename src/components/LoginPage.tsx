import React, { useState } from 'react';
import { TestingLogo } from './TestingLogo.tsx';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight, 
  Bug,
  FlaskConical,
  Activity,
  CheckCircle2
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

interface ValidUser {
  username: string;
  name: string;
  role: string;
}

const VALID_USERS: Record<string, ValidUser> = {
  sahil_roy: {
    username: 'sahil_roy',
    name: 'Sahil Roy',
    role: 'Lead QA Engineer',
  },
  jit_mondal: {
    username: 'jit_mondal',
    name: 'Jeet Mondal',
    role: 'QA Engineer',
  },
};

const REQUIRED_PASSWORD = 'Illusio@006574';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanUsername) {
      setError('Please enter your QA username.');
      return;
    }
    if (!cleanPassword) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    const targetUser = VALID_USERS[cleanUsername];

    // Authentication validation
    if (!targetUser || cleanPassword !== REQUIRED_PASSWORD) {
      setTimeout(() => {
        setIsSubmitting(false);
        setError('Invalid username or password. Check credentials and try again.');
      }, 350);
      return;
    }

    // Success!
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(targetUser.username);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Testing Blueprint Grid */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#818cf8 1px, transparent 1px), radial-gradient(#34d399 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          backgroundPosition: '0 0, 14px 14px'
        }}
      />

      {/* Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top QA Navigation Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 py-4 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Bug className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-white tracking-tight">Illusio Tech</span>
            <span className="text-[11px] text-slate-400 ml-2 font-mono">QA Defect Suite</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SYSTEM ONLINE
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400">
            v4.2.0 (Rev. 1401)
          </span>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-4 flex-1 flex flex-col justify-center">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative overflow-hidden">
          {/* Subtle Top Gradient Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />

          {/* Testing Logo & Header */}
          <div className="mb-6">
            <TestingLogo size="lg" showSubtitle={true} />
            <div className="mt-3 text-center">
              <p className="text-xs text-slate-400">
                Sign in with authorized QA engineer credentials to access defect sheets and execution matrices.
              </p>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="qa-username"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                QA Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="qa-username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your QA username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-white placeholder-slate-500 transition outline-none font-mono"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="qa-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="qa-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-white placeholder-slate-500 transition outline-none font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-200 group-hover:scale-110 transition-transform" />
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In & Launch QA Suite'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          {/* Quick Feature Highlights */}
          <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
              <FlaskConical className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
              <div className="text-[10px] text-slate-400 font-medium">16 Test Cases</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-[10px] text-slate-400 font-medium">Live Firestore</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
              <Activity className="w-4 h-4 text-sky-400 mx-auto mb-1" />
              <div className="text-[10px] text-slate-400 font-medium">Real-time Triage</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Illusio Tech · Illusion_Dashboard v4.2.0 (Rev. 1401)</p>
      </footer>
    </div>
  );
};

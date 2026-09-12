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
  CheckCircle2,
  UserPlus,
  KeyRound,
  BadgeCheck,
  Briefcase,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { 
  validateCredentials, 
  registerQAUser, 
  changeUserPassword 
} from '../firebase/authService.ts';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

type AuthMode = 'signin' | 'signup' | 'change_password';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('signin');

  // Sign In state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up state
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupRole, setSignupRole] = useState('QA Engineer');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Change Password state
  const [changeUsername, setChangeUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status state
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset errors when switching mode
  const switchMode = (newMode: AuthMode) => {
    setError(null);
    setSuccessNotice(null);
    setMode(newMode);
  };

  // 1. Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Please enter your QA username.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await validateCredentials(cleanUsername, password);
      if (!result.success) {
        setIsSubmitting(false);
        setError(result.error || 'Invalid username or password.');
        return;
      }

      // Success
      setTimeout(() => {
        setIsSubmitting(false);
        onLoginSuccess(result.user?.username || cleanUsername);
      }, 300);
    } catch {
      setIsSubmitting(false);
      setError('Authentication failed. Please check network and try again.');
    }
  };

  // 2. Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    const cleanUsername = signupUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!signupName.trim()) {
      setError('Please provide your full display name.');
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('QA Username must be at least 3 alphanumeric characters (underscores allowed).');
      return;
    }
    if (signupPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerQAUser({
        name: signupName.trim(),
        username: cleanUsername,
        role: signupRole,
        password: signupPassword
      });

      if (!result.success) {
        setIsSubmitting(false);
        setError(result.error || 'Registration failed.');
        return;
      }

      setSuccessNotice(`QA Account @${cleanUsername} registered successfully! Launching test workspace...`);
      setIsSubmitting(false);

      // Auto login
      setTimeout(() => {
        onLoginSuccess(cleanUsername);
      }, 1200);
    } catch {
      setIsSubmitting(false);
      setError('Registration error. Please check connection and try again.');
    }
  };

  // 3. Handle Change Password from Login
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    const cleanUsername = changeUsername.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Please enter your QA username.');
      return;
    }
    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password cannot be the same as your current password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await changeUserPassword({
        username: cleanUsername,
        currentPassword,
        newPassword,
        verifyCurrent: true
      });

      if (!res.success) {
        setIsSubmitting(false);
        setError(res.error || 'Failed to update password.');
        return;
      }

      setSuccessNotice('Password updated successfully! Please sign in with your new password.');
      setIsSubmitting(false);
      setUsername(cleanUsername);
      setPassword('');

      setTimeout(() => {
        switchMode('signin');
      }, 1500);
    } catch {
      setIsSubmitting(false);
      setError('Encountered an error updating password.');
    }
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
            v4.2.1 (Rev. 1410)
          </span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-4 flex-1 flex flex-col justify-center">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative overflow-hidden">
          {/* Subtle Top Gradient Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />

          {/* Testing Logo & Header */}
          <div className="mb-5 text-center">
            <TestingLogo size="lg" showSubtitle={false} />
            <div className="mt-2 text-center">
              <p className="text-xs text-slate-400">
                {mode === 'signin' && 'Sign in to access QA test executions and live defect tracking.'}
                {mode === 'signup' && 'Create your authorized QA engineer credentials.'}
                {mode === 'change_password' && 'Update security password for your QA engineer profile.'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'signin'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'signup'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New QA Sign Up</span>
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Success Notice */}
          {successNotice && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successNotice}</div>
            </div>
          )}

          {/* ================= MODE 1: SIGN IN ================= */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4 animate-in fade-in duration-150">
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label 
                    htmlFor="qa-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setChangeUsername(username);
                      switchMode('change_password');
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Change password?</span>
                  </button>
                </div>
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-indigo-200 group-hover:scale-110 transition-transform" />
                    <span>Sign In &amp; Launch QA Suite</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-slate-400">
                <span>Need a team account? </span>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 transition cursor-pointer"
                >
                  Create QA Account
                </button>
              </div>
            </form>
          )}

          {/* ================= MODE 2: SIGN UP ================= */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5 animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <BadgeCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Sahil Roy"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-white placeholder-slate-500 transition outline-none"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  QA Username Handle *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. sahil_roy"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-white placeholder-slate-500 transition outline-none font-mono"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500">Lowercase letters, numbers, and underscores only</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  QA Role *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <select
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-white transition outline-none cursor-pointer"
                  >
                    <option value="Lead QA Engineer">Lead QA Engineer</option>
                    <option value="QA Automation Engineer">QA Automation Engineer</option>
                    <option value="QA Engineer">QA Engineer</option>
                    <option value="SDET (Software Development Engineer in Test)">SDET</option>
                    <option value="Performance &amp; Security QA">Performance &amp; Security QA</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Minimum 4 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-white placeholder-slate-500 transition outline-none font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-white placeholder-slate-500 transition outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>Registering Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Create QA Account</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-slate-400">
                <span>Already have credentials? </span>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 transition cursor-pointer"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}

          {/* ================= MODE 3: CHANGE / RESET PASSWORD ================= */}
          {mode === 'change_password' && (
            <form onSubmit={handleChangePassword} className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
                <span className="text-[11px] font-mono text-indigo-400 font-medium">Password Reset</span>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  QA Username *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={changeUsername}
                    onChange={(e) => setChangeUsername(e.target.value)}
                    placeholder="e.g. sahil_roy"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-white placeholder-slate-500 transition outline-none font-mono"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Current Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-white placeholder-slate-500 transition outline-none font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 4 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-white placeholder-slate-500 transition outline-none font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm text-white placeholder-slate-500 transition outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          )}

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
        <p>© {new Date().getFullYear()} Illusio Tech · Illusion_Dashboard v4.2.1 (Rev. 1410)</p>
      </footer>
    </div>
  );
};

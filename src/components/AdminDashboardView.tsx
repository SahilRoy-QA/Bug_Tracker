import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Settings, 
  Shield, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Lock, 
  KeyRound, 
  FolderGit2, 
  ExternalLink, 
  Calendar, 
  Layers, 
  AlertTriangle, 
  Save, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Briefcase, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowLeft,
  Database,
  Search,
  Sparkles,
  Info,
  LayoutGrid,
  List,
  Tag,
  Radio,
  Activity
} from 'lucide-react';
import { ProjectMeta, QAUser, UserPermissions, DefectItem, UserSession } from '../types.ts';
import { isUserAdmin } from '../utils/permissions.ts';
import { 
  getAllQAUsers, 
  registerQAUser, 
  updateQAUser, 
  deleteQAUser, 
  changeUserPassword 
} from '../firebase/authService.ts';
import { LogsView } from './LogsView.tsx';

interface AdminDashboardViewProps {
  projectMeta: ProjectMeta;
  onSaveMeta: (updated: Partial<ProjectMeta>) => Promise<void>;
  onResetTemplate: () => void;
  onClearAllDefects: () => void;
  onNavigateBack: () => void;
  currentUser: string;
  totalDefects: number;
  onlineUsers?: UserSession[];
  defects?: DefectItem[];
  onNavigateToChatWithUser?: (username: string) => void;
  onOpenDefectModal?: (defect: DefectItem) => void;
  initialAdminSection?: 'engineers' | 'project' | 'logs' | 'audit';
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  projectMeta,
  onSaveMeta,
  onResetTemplate,
  onClearAllDefects,
  onNavigateBack,
  currentUser,
  totalDefects,
  onlineUsers = [],
  defects = [],
  onNavigateToChatWithUser,
  onOpenDefectModal,
  initialAdminSection = 'engineers'
}) => {
  const [activeAdminSection, setActiveAdminSection] = useState<'engineers' | 'project' | 'logs' | 'audit'>(initialAdminSection);
  const [mobileLayout, setMobileLayout] = useState<'cards' | 'table'>('cards');
  
  // Engineers state
  const [users, setUsers] = useState<QAUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Engineer Modal / Form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('QA Engineer');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newProjectsInput, setNewProjectsInput] = useState(projectMeta.projectName);
  const [newCanDelete, setNewCanDelete] = useState(false);
  const [newCanEditAll, setNewCanEditAll] = useState(false);
  const [newCanCleanDb, setNewCanCleanDb] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Password reset modal for specific user
  const [resetTargetUser, setResetTargetUser] = useState<QAUser | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Project Details Form state
  const [projectForm, setProjectForm] = useState<ProjectMeta>({ ...projectMeta });
  const [newMemberInput, setNewMemberInput] = useState('');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectSaveSuccess, setProjectSaveSuccess] = useState(false);

  // Reset/Clean confirmation states
  const [confirmCleanOpen, setConfirmCleanOpen] = useState(false);
  const [confirmTemplateResetOpen, setConfirmTemplateResetOpen] = useState(false);

  // Load all users on mount
  const loadUsers = async () => {
    if (!isUserAdmin(currentUser)) return;
    setIsLoadingUsers(true);
    try {
      const all = await getAllQAUsers();
      setUsers(all);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Update project form when projectMeta changes
  useEffect(() => {
    setProjectForm({ ...projectMeta });
  }, [projectMeta]);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // 1. Create New Engineer
  const handleCreateEngineer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUser || cleanUser.length < 3) {
      showNotice('Username must be at least 3 alphanumeric characters.', 'error');
      return;
    }
    if (!newName.trim()) {
      showNotice('Please enter the engineer full name.', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      showNotice('Password must be at least 4 characters.', 'error');
      return;
    }

    setIsCreatingUser(true);
    try {
      const assigned = newProjectsInput
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);

      const res = await registerQAUser({
        name: newName.trim(),
        username: cleanUser,
        role: newRole,
        email: newEmail.trim() || `${cleanUser}@illusio.tech`,
        password: newPassword,
        assignedProjects: assigned.length > 0 ? assigned : [projectMeta.projectName],
        permissions: {
          canDeleteDefects: newCanDelete,
          canEditAllDefects: newCanEditAll,
          canCleanDatabase: newCanCleanDb
        }
      });

      if (!res.success) {
        showNotice(res.error || 'Failed to create engineer.', 'error');
        return;
      }

      showNotice(`QA Engineer @${cleanUser} successfully provisioned and assigned!`, 'success');
      setIsAddModalOpen(false);
      // Reset form
      setNewName('');
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewCanDelete(false);
      setNewCanEditAll(false);
      setNewCanCleanDb(false);
      await loadUsers();
    } catch {
      showNotice('Error creating user. Check network connection.', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // 2. Toggle Permission for a User
  const handleTogglePermission = async (
    targetUsername: string, 
    permKey: keyof UserPermissions
  ) => {
    const target = users.find(u => u.username.toLowerCase() === targetUsername.toLowerCase());
    if (!target) return;

    const currentPerms = target.permissions || {};
    const updatedPerms: UserPermissions = {
      ...currentPerms,
      [permKey]: !currentPerms[permKey]
    };

    // Optimistic UI update
    setUsers(prev => prev.map(u => {
      if (u.username.toLowerCase() === targetUsername.toLowerCase()) {
        return { ...u, permissions: updatedPerms };
      }
      return u;
    }));

    try {
      const res = await updateQAUser(targetUsername, { permissions: updatedPerms });
      if (res.success) {
        showNotice(`Permissions updated for @${targetUsername}`, 'success');
      } else {
        showNotice(res.error || 'Failed to update permissions.', 'error');
        loadUsers();
      }
    } catch {
      showNotice('Network error updating permissions.', 'error');
      loadUsers();
    }
  };

  // 3. Update User Role
  const handleUpdateRole = async (targetUsername: string, newRoleVal: string) => {
    setUsers(prev => prev.map(u => {
      if (u.username.toLowerCase() === targetUsername.toLowerCase()) {
        return { ...u, role: newRoleVal };
      }
      return u;
    }));

    try {
      const res = await updateQAUser(targetUsername, { role: newRoleVal });
      if (res.success) {
        showNotice(`Role updated for @${targetUsername} to ${newRoleVal}`, 'success');
      } else {
        loadUsers();
      }
    } catch {
      loadUsers();
    }
  };

  // 4. Update User Assigned Projects
  const handleUpdateProjects = async (targetUsername: string, projectsStr: string) => {
    const projectsList = projectsStr.split(',').map(p => p.trim()).filter(Boolean);
    
    setUsers(prev => prev.map(u => {
      if (u.username.toLowerCase() === targetUsername.toLowerCase()) {
        return { ...u, assignedProjects: projectsList };
      }
      return u;
    }));

    try {
      await updateQAUser(targetUsername, { assignedProjects: projectsList });
      showNotice(`Assigned projects updated for @${targetUsername}`, 'success');
    } catch {
      loadUsers();
    }
  };

  // 5. Delete / Deactivate User
  const handleDeleteUser = async (targetUsername: string) => {
    if (isUserAdmin(targetUsername)) {
      showNotice('Cannot delete Administrator account.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove QA Engineer @${targetUsername}?`)) {
      return;
    }

    try {
      const res = await deleteQAUser(targetUsername);
      if (res.success) {
        showNotice(`QA Engineer @${targetUsername} removed.`, 'success');
        await loadUsers();
      } else {
        showNotice(res.error || 'Failed to remove engineer.', 'error');
      }
    } catch {
      showNotice('Error deleting user.', 'error');
    }
  };

  // 6. Reset User Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (resetPasswordVal.length < 4) {
      showNotice('Password must be at least 4 characters.', 'error');
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await changeUserPassword({
        username: resetTargetUser.username,
        newPassword: resetPasswordVal,
        verifyCurrent: false
      });

      if (res.success) {
        showNotice(`Password reset successfully for @${resetTargetUser.username}!`, 'success');
        setResetTargetUser(null);
        setResetPasswordVal('');
      } else {
        showNotice(res.error || 'Failed to reset password.', 'error');
      }
    } catch {
      showNotice('Error resetting password.', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // 7. Save Project Details
  const handleSaveProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProject(true);
    try {
      await onSaveMeta(projectForm);
      setProjectSaveSuccess(true);
      showNotice('Project details & test configuration saved successfully!', 'success');
      setTimeout(() => setProjectSaveSuccess(false), 3000);
    } catch {
      showNotice('Failed to save project settings.', 'error');
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleAddProjectMember = () => {
    const clean = newMemberInput.replace(/\s*\([^)]*\)/g, '').trim();
    if (clean) {
      setProjectForm(prev => ({
        ...prev,
        assignedQAMembers: Array.from(new Set([...prev.assignedQAMembers, clean]))
      }));
      setNewMemberInput('');
    }
  };

  const handleRemoveProjectMember = (index: number) => {
    setProjectForm(prev => ({
      ...prev,
      assignedQAMembers: prev.assignedQAMembers.filter((_, i) => i !== index)
    }));
  };

  // Filter users by search
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });
 
  // RBAC Access Guard: Strictly prevent non-administrators from accessing admin console
  if (!isUserAdmin(currentUser)) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-lg animate-in fade-in">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
          <Shield className="w-7 h-7 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
          Access to the QA Governance &amp; Administration Console is strictly restricted to System Administrators (@sahil_roy).
        </p>
        <button
          onClick={onNavigateBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to QA Dashboard</span>
        </button>
      </div>
    );
  }
 
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Admin Console Header Bar with Full Light & Dark Theme Support */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Administration Console
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                Root Admin: {currentUser === 'sahil_roy' ? 'Sahil Roy' : currentUser}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                v{projectMeta.version || '6.0.2'} (Rev. {projectMeta.revision || '2611'})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              Enterprise QA Administration &amp; Governance
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Manage QA team credentials, grant granular RBAC permissions, allocate engineers to active test suites, and configure global project parameters.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onNavigateBack}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition cursor-pointer shadow-xs hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to QA Dashboard</span>
            </button>
          </div>
        </div>

        {/* Global Admin Status Notification */}
        {statusMessage && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Responsive Segmented Tabs Group (Grid 2x2 on mobile, flex on desktop - zero cut-offs) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800/90 w-full lg:w-auto">
          <button
            onClick={() => setActiveAdminSection('engineers')}
            className={`inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-w-0 ${
              activeAdminSection === 'engineers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/80'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Engineers</span>
              <span className="hidden sm:inline">QA Engineers &amp; Permissions</span>
            </span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono shrink-0 ${
              activeAdminSection === 'engineers'
                ? 'bg-indigo-950/40 text-indigo-200'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveAdminSection('project')}
            className={`inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-w-0 ${
              activeAdminSection === 'project'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/80'
            }`}
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Project</span>
              <span className="hidden sm:inline">Project Details &amp; Test Suite</span>
            </span>
          </button>

          <button
            onClick={() => setActiveAdminSection('logs')}
            className={`inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-w-0 ${
              activeAdminSection === 'logs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/80'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeAdminSection === 'logs' ? 'text-emerald-300' : 'text-emerald-500'}`} />
            <span className="truncate">
              <span className="sm:hidden">Live Logs</span>
              <span className="hidden sm:inline">Live Logs &amp; Presence</span>
            </span>
            {onlineUsers.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono shrink-0 flex items-center gap-1 ${
                activeAdminSection === 'logs'
                  ? 'bg-indigo-950/40 text-emerald-200'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {onlineUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveAdminSection('audit')}
            className={`inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-w-0 ${
              activeAdminSection === 'audit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/80'
            }`}
          >
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">
              <span className="sm:hidden">Security</span>
              <span className="hidden sm:inline">Security &amp; Policy</span>
            </span>
          </button>
        </div>

        {activeAdminSection === 'engineers' && (
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
            <button
              onClick={loadUsers}
              disabled={isLoadingUsers}
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0 flex items-center justify-center cursor-pointer shadow-xs"
              title="Refresh engineers list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin text-indigo-500' : ''}`} />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Provision New Engineer</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= SECTION 1: QA ENGINEERS & PERMISSIONS ================= */}
      {activeAdminSection === 'engineers' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1 text-xs">
                <span>Total QA Engineers</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {users.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Authorized test execution accounts</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1 text-xs">
                <span>Admin Governance</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
                Sahil Roy
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">@sahil_roy · Primary Admin</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1 text-xs">
                <span>Engineers With Delete Access</span>
                <Trash2 className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {users.filter(u => isUserAdmin(u.username) || u.permissions?.canDeleteDefects).length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Permission to remove test defects</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1 text-xs">
                <span>Active Project &amp; Tag</span>
                <FolderGit2 className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate font-mono flex items-center gap-1.5">
                <span>{projectMeta.projectName}</span>
                {projectMeta.tag && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 font-mono">
                    #{projectMeta.tag}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">v{projectMeta.version} (Rev. {projectMeta.revision})</p>
            </div>
          </div>

          {/* Search, Filter & Layout Toggle Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search engineer by name, @handle, role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-900 dark:text-white">{filteredUsers.length}</span> of {users.length} members
              </div>

              {/* View Toggle on Mobile/Tablet */}
              <div className="flex md:hidden items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setMobileLayout('cards')}
                  className={`p-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                    mobileLayout === 'cards'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Card View (Mobile Optimized)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileLayout('table')}
                  className={`p-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                    mobileLayout === 'table'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================= MOBILE CARD SECTION (Optimized for Mobile/Touch, No Scrollers!) ================= */}
          <div className={`grid grid-cols-1 gap-3.5 ${mobileLayout === 'cards' ? 'block md:hidden' : 'hidden'}`}>
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-slate-500">
                No QA engineers found matching your search.
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isRoy = isUserAdmin(user.username) || user.role === 'Administrator' || user.role === 'Admin';
                const canDelete = isRoy || !!user.permissions?.canDeleteDefects;
                const canEditAll = isRoy || !!user.permissions?.canEditAllDefects;
                const canClean = isRoy || !!user.permissions?.canCleanDatabase;

                return (
                  <div
                    key={user.username}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3.5"
                  >
                    {/* Header: Avatar, Name, Username, Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isRoy
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {user.name}
                            </span>
                            {isRoy && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-500 dark:text-indigo-300 border border-indigo-500/30">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                            @{user.username}
                          </div>
                          {user.email && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Action Buttons on Top Right */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setResetTargetUser(user);
                            setResetPasswordVal('');
                          }}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                          title={`Reset password for @${user.username}`}
                          aria-label="Reset password"
                        >
                          <KeyRound className="w-4 h-4 text-indigo-500" />
                        </button>

                        {!isRoy && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.username)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                            title={`Remove @${user.username}`}
                            aria-label="Delete engineer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Role & Allocation Row */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                          Role &amp; Title
                        </label>
                        {isRoy ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                            Administrator
                          </span>
                        ) : (
                          <select
                            value={user.role || 'QA Engineer'}
                            onChange={(e) => handleUpdateRole(user.username, e.target.value)}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="QA Engineer">QA Engineer</option>
                            <option value="QA Automation Engineer">QA Automation Engineer</option>
                            <option value="SDET">SDET</option>
                            <option value="Performance & Security QA">Performance &amp; Security QA</option>
                            <option value="QA Analyst">QA Analyst</option>
                          </select>
                        )}
                      </div>

                      {/* Assigned Projects */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Assigned Project(s)
                        </label>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {(user.assignedProjects || [projectMeta.projectName]).map((p, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                        <input
                          type="text"
                          defaultValue={(user.assignedProjects || [projectMeta.projectName]).join(', ')}
                          onBlur={(e) => handleUpdateProjects(user.username, e.target.value)}
                          placeholder="Comma-separated projects (e.g. Illusion_Dashboard, API_V2)"
                          className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                          title="Click outside or tap enter to save assignments"
                        />
                      </div>
                    </div>

                    {/* Permissions Matrix Toggles (Touch-Friendly Responsive Grid) */}
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Engineer Permissions
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Delete Defect Permission */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                              Delete Defects
                            </span>
                            <span className="text-[10px] text-slate-400">Remove records</span>
                          </div>
                          {isRoy ? (
                            <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400">Full</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(user.username, 'canDeleteDefects')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                canDelete
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {canDelete ? 'Enabled' : 'Disabled'}
                            </button>
                          )}
                        </div>

                        {/* Edit All Defects */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                              Edit All Defects
                            </span>
                            <span className="text-[10px] text-slate-400">Team-wide edit</span>
                          </div>
                          {isRoy ? (
                            <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400">Full</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(user.username, 'canEditAllDefects')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                canEditAll
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {canEditAll ? 'All' : 'Own Only'}
                            </button>
                          )}
                        </div>

                        {/* Clean DB */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                              Clean DB
                            </span>
                            <span className="text-[10px] text-slate-400">Bulk purge/reset</span>
                          </div>
                          {isRoy ? (
                            <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400">Full</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(user.username, 'canCleanDatabase')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                canClean
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {canClean ? 'Allowed' : 'Blocked'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ================= DESKTOP TABLE VIEW (Visible on desktop or when 'table' selected) ================= */}
          <div className={`bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs overflow-hidden ${mobileLayout === 'table' ? 'block' : 'hidden md:block'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Engineer / Account</th>
                    <th className="py-3 px-3">Role &amp; Allocation</th>
                    <th className="py-3 px-3">Assigned Projects</th>
                    <th className="py-3 px-3 text-center">Delete Defect Perm</th>
                    <th className="py-3 px-3 text-center">Edit Any Defect</th>
                    <th className="py-3 px-3 text-center">Clean DB Perm</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredUsers.map((user) => {
                    const isRoy = isUserAdmin(user.username) || user.role === 'Administrator' || user.role === 'Admin';
                    const canDelete = isRoy || !!user.permissions?.canDeleteDefects;
                    const canEditAll = isRoy || !!user.permissions?.canEditAllDefects;
                    const canClean = isRoy || !!user.permissions?.canCleanDatabase;

                    return (
                      <tr 
                        key={user.username}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        {/* Engineer Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isRoy 
                                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}>
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-sm">
                                <span>{user.name}</span>
                                {isRoy && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                @{user.username}
                              </div>
                              {user.email && (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span>{user.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role Selector */}
                        <td className="py-3.5 px-3">
                          {isRoy ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                              Administrator
                            </span>
                          ) : (
                            <select
                              value={user.role || 'QA Engineer'}
                              onChange={(e) => handleUpdateRole(user.username, e.target.value)}
                              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="QA Engineer">QA Engineer</option>
                              <option value="QA Automation Engineer">QA Automation Engineer</option>
                              <option value="SDET">SDET</option>
                              <option value="Performance & Security QA">Performance &amp; Security QA</option>
                              <option value="QA Analyst">QA Analyst</option>
                            </select>
                          )}
                        </td>

                        {/* Assigned Projects */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1 max-w-[200px]">
                            <div className="flex flex-wrap gap-1">
                              {(user.assignedProjects || [projectMeta.projectName]).map((p, idx) => (
                                <span 
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate max-w-[180px]"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                            <input
                              type="text"
                              defaultValue={(user.assignedProjects || [projectMeta.projectName]).join(', ')}
                              onBlur={(e) => handleUpdateProjects(user.username, e.target.value)}
                              placeholder="Comma-separated projects"
                              className="w-full text-[10px] px-2 py-0.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded text-slate-800 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                              title="Edit assigned projects and click away to save"
                            />
                          </div>
                        </td>

                        {/* Delete Permission Toggle */}
                        <td className="py-3.5 px-3 text-center">
                          {isRoy ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Full Access
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(user.username, 'canDeleteDefects')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer border ${
                                canDelete
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {canDelete ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Enabled</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-3 h-3" />
                                  <span>Disabled</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>

                        {/* Edit Any Defect Toggle */}
                        <td className="py-3.5 px-3 text-center">
                          {isRoy ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Full Access
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(user.username, 'canEditAllDefects')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer border ${
                                canEditAll
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {canEditAll ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>All Defect Edit</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-3 h-3" />
                                  <span>Own Defects Only</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>

                        {/* Clean DB Toggle */}
                        <td className="py-3.5 px-3 text-center">
                          {isRoy ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Full Access
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(user.username, 'canCleanDatabase')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer border ${
                                canClean
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {canClean ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Allowed</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-3 h-3" />
                                  <span>Forbidden</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setResetTargetUser(user);
                                setResetPasswordVal('');
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                              title={`Reset password for @${user.username}`}
                            >
                              <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                            </button>

                            {!isRoy && (
                              <button
                                onClick={() => handleDeleteUser(user.username)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition"
                                title={`Remove @${user.username}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 2: PROJECT DETAILS & TEST CONFIGURATION ================= */}
      {activeAdminSection === 'project' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-500" />
                  Project &amp; Test Suite Parameters
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Restricted to Administrator view. Configures the metadata headers across test reports and defect logs.
                </p>
              </div>
              {projectSaveSuccess && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved to Live Database</span>
                </span>
              )}
            </div>

            <form onSubmit={handleSaveProjectDetails} className="space-y-5">
              {/* Row 1: Project Name, App Version & Revision */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={projectForm.projectName}
                    onChange={e => setProjectForm({ ...projectForm, projectName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Build / App Version *
                  </label>
                  <input
                    type="text"
                    required
                    value={projectForm.version}
                    onChange={e => setProjectForm({ ...projectForm, version: e.target.value })}
                    placeholder="6.0.2"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Build Revision *
                  </label>
                  <input
                    type="text"
                    required
                    value={projectForm.revision || ''}
                    onChange={e => setProjectForm({ ...projectForm, revision: e.target.value })}
                    placeholder="2611"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 2: Target App URL Link & Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                    <span>Target Web App URL</span>
                  </label>
                  <input
                    type="url"
                    value={projectForm.projectLink}
                    onChange={e => setProjectForm({ ...projectForm, projectLink: e.target.value })}
                    placeholder="https://app.internal/..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Tag (Project &amp; Test Suite Tag)</span>
                  </label>
                  <input
                    type="text"
                    value={projectForm.tag || ''}
                    onChange={e => {
                      const val = e.target.value;
                      const tagsArray = val.split(',').map(t => t.trim()).filter(Boolean);
                      setProjectForm({ 
                        ...projectForm, 
                        tag: val,
                        tags: tagsArray.length > 0 ? tagsArray : undefined
                      });
                    }}
                    placeholder="e.g. Core-HR-Regression, Release-v5.0, Sprint-24"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 3: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Estimated QA Execution Start Date</span>
                  </label>
                  <input
                    type="date"
                    value={projectForm.estimatedStartDate}
                    onChange={e => setProjectForm({ ...projectForm, estimatedStartDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Estimated QA Execution End Date</span>
                  </label>
                  <input
                    type="date"
                    value={projectForm.estimatedEndDate}
                    onChange={e => setProjectForm({ ...projectForm, estimatedEndDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 5: Assigned QA Members */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  <span>Assigned QA Team Members on Report</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {projectForm.assignedQAMembers.map((member, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <span>{member}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveProjectMember(idx)}
                        className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add QA Engineer name (e.g. Sahil Roy)..."
                    value={newMemberInput}
                    onChange={e => setNewMemberInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddProjectMember(); } }}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddProjectMember}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-semibold text-slate-800 dark:text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProject}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSavingProject ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Parameters...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Project &amp; Test Parameters</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Danger Zone: Database Reset & Purge Controls */}
          <div className="bg-rose-500/5 rounded-2xl p-6 border border-rose-500/20 shadow-xs">
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" />
              Administrator Database Operations &amp; Reset Zone
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Restricted to root administrator (Sahil Roy). These actions perform batch mutations on live Firestore defect logs.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmCleanOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Logged Defects ({totalDefects})</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmTemplateResetOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset All Project Data to Clean v6.0.2 Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 3: SECURITY & AUDIT LOG ================= */}
      {activeAdminSection === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Role-Based Access Control (RBAC) &amp; Security Policy
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Active security rules enforced across the application session and real-time Firestore database.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Root Administrator Privilege Enforced
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Administrator <span className="font-semibold text-indigo-500">@sahil_roy</span> holds root authority. Sole user authorized to access Administration Console, configure project settings, allocate engineers, and change team permissions.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Public Sign-Up Restricted
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Unrestricted public registration is disabled. All new QA engineer accounts must be provisioned directly by the Administrator through this console.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Granular Defect Mutation Scoping
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    QA Engineers can only modify defects they authored, unless granted explicit <span className="font-mono text-indigo-500 font-semibold">canEditAllDefects</span> permission by the Administrator.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Project Details Protection
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Project parameters and test suite configurations are strictly quarantined within the Administration view and hidden from regular QA users.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 4: REAL-TIME LIVE LOGS & ACTIVE SESSIONS ================= */}
      {activeAdminSection === 'logs' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <LogsView
            currentUser={currentUser}
            onlineUsers={onlineUsers}
            allTeamUsers={users}
            defects={defects}
            embedded={true}
            onOpenDefectModal={onOpenDefectModal}
            onNavigateToChatWithUser={onNavigateToChatWithUser}
          />
        </div>
      )}

      {/* ================= MODAL 1: PROVISION NEW ENGINEER ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Provision New QA Engineer Account
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEngineer} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    QA Username Handle *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. alex_morgan"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="alex@illusio.tech"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="QA Engineer">QA Engineer</option>
                    <option value="QA Automation Engineer">QA Automation Engineer</option>
                    <option value="SDET">SDET</option>
                    <option value="Performance & Security QA">Performance &amp; Security QA</option>
                    <option value="QA Analyst">QA Analyst</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 4 characters"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Projects (comma-separated)
                </label>
                <input
                  type="text"
                  value={newProjectsInput}
                  onChange={e => setNewProjectsInput(e.target.value)}
                  placeholder="Enterprise Core HR Portal, Mobile Suite"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Granular Permissions Checkboxes */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Initial Permissions Grant
                </span>
                
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newCanEditAll}
                    onChange={e => setNewCanEditAll(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Allow editing all defects (not just own reported defects)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newCanDelete}
                    onChange={e => setNewCanDelete(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Allow deleting defects from sheet</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newCanCleanDb}
                    onChange={e => setNewCanCleanDb(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Allow cleaning/resetting test database</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition disabled:opacity-50"
                >
                  {isCreatingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create &amp; Assign Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: RESET PASSWORD FOR ENGINEER ================= */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-sm shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Reset Password: @{resetTargetUser.username}
                </h3>
              </div>
              <button
                onClick={() => setResetTargetUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set a new password for <span className="font-bold text-slate-800 dark:text-slate-200">{resetTargetUser.name}</span>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={resetPasswordVal}
                  onChange={e => setResetPasswordVal(e.target.value)}
                  placeholder="Minimum 4 characters"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Set New Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: CONFIRM CLEAR ALL DEFECTS ================= */}
      {confirmCleanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-500/30 w-full max-w-sm shadow-2xl p-6 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Delete All Logged Defects?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              This will permanently purge all {totalDefects} test execution defects from the live Firestore database. This action cannot be undone.
            </p>

            <div className="mt-5 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmCleanOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmCleanOpen(false);
                  onClearAllDefects();
                  showNotice('All test defects have been cleared from live database.', 'success');
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition"
              >
                Yes, Purge All Defects
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: CONFIRM RESET TEMPLATE ================= */}
      {confirmTemplateResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-sm shadow-2xl p-6 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Reset Project to v6.0.2 Template?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              This resets project details, dates, test suite names, and defect logs back to standard version 6.0.2 (Rev. 2611) initial state.
            </p>

            <div className="mt-5 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmTemplateResetOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmTemplateResetOpen(false);
                  onResetTemplate();
                  showNotice('Project reset to initial v6.0.2 template.', 'success');
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { DefectSheetView } from './components/DefectSheetView.tsx';
import { DefectModal } from './components/DefectModal.tsx';
import { AdminDashboardView } from './components/AdminDashboardView.tsx';
import { AboutView } from './components/AboutView.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { TestingLoadingScreen } from './components/TestingLoadingScreen.tsx';
import { ChangePasswordModal } from './components/ChangePasswordModal.tsx';
import { DefectItem, ProjectMeta, ExecutionReportStats } from './types.ts';
import { exportDefectsToCSV, parseCSVToDefects } from './utils/csvHelper.ts';
import { 
  loadStoredDefects, 
  loadStoredDefectsAsync,
  saveStoredDefects, 
  loadStoredProject, 
  loadStoredProjectAsync,
  saveStoredProject, 
  resetStoredData 
} from './utils/storage.ts';
import {
  canUserEditDefect,
  canUserDeleteDefect,
  canUserCleanDatabase
} from './utils/permissions.ts';
import {
  subscribeToDefects,
  subscribeToProjectMeta,
  addDefectToFirestore,
  updateDefectInFirestore,
  deleteDefectFromFirestore,
  bulkDeleteDefectsFromFirestore,
  bulkUpsertDefectsToFirestore,
  updateProjectMetaInFirestore,
  resetFirestoreToTemplate,
  seedInitialDataIfEmpty
} from './firebase/defectService.ts';
import { seedUsersIfEmpty } from './firebase/authService.ts';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sheet' | 'about' | 'admin'>('dashboard');
  const [projectMeta, setProjectMeta] = useState<ProjectMeta>(() => loadStoredProject());
  const [defects, setDefects] = useState<DefectItem[]>(() => loadStoredDefects());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [sheetExecutionFilter, setSheetExecutionFilter] = useState<string>('All');
  
  // Authentication State
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('illusion_qa_user');
    } catch {
      return null;
    }
  });
  const [pendingUser, setPendingUser] = useState<string>('sahil_roy');
  const [authStage, setAuthStage] = useState<'login' | 'loading' | 'authenticated'>(() => {
    try {
      return sessionStorage.getItem('illusion_qa_user') ? 'authenticated' : 'login';
    } catch {
      return 'login';
    }
  });

  const handleLoginSuccess = (user: string) => {
    setPendingUser(user);
    setAuthStage('loading');
  };

  const handleLoadingComplete = () => {
    const validUser = pendingUser || 'sahil_roy';
    setCurrentUser(validUser);
    try {
      sessionStorage.setItem('illusion_qa_user', validUser);
    } catch {}
    setAuthStage('authenticated');
    showToast(`Welcome @${validUser} · QA Test Execution Suite ready`, 'success');
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('illusion_qa_user');
    } catch {}
    setCurrentUser(null);
    setAuthStage('login');
    showToast('Signed out of QA Dashboard', 'info');
  };

  // Modal state
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [modalState, setModalState] = useState<{ isOpen: boolean; defect: DefectItem | null }>({
    isOpen: false,
    defect: null
  });

  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Real-time Firebase Firestore synchronization and client IndexedDB hydration
  useEffect(() => {
    setIsSyncing(true);

    // Initial async hydration from high-capacity IndexedDB cache
    loadStoredDefectsAsync().then(stored => {
      if (Array.isArray(stored) && stored.length > 0) {
        setDefects(prev => (prev.length === 0 ? stored : prev));
      }
    }).catch(console.warn);

    // Initial check to seed Firestore if first time
    seedInitialDataIfEmpty().catch(err => {
      console.warn('Initial Firestore seed check notice:', err);
    });
    seedUsersIfEmpty().catch(err => {
      console.warn('Initial users seed check notice:', err);
    });

    // Real-time listener for defects
    const unsubscribeDefects = subscribeToDefects(
      (remoteDefects) => {
        if (Array.isArray(remoteDefects) && remoteDefects.length > 0) {
          setDefects(remoteDefects);
          saveStoredDefects(remoteDefects);
        }
        setIsSyncing(false);
      },
      (err) => {
        console.warn('Defects Firestore live listener fallback to local:', err);
        setIsSyncing(false);
      }
    );

    // Real-time listener for project metadata
    const unsubscribeMeta = subscribeToProjectMeta(
      (remoteMeta) => {
        if (remoteMeta && remoteMeta.projectName) {
          setProjectMeta(remoteMeta);
          saveStoredProject(remoteMeta);
        }
      },
      (err) => {
        console.warn('ProjectMeta Firestore live listener fallback to local:', err);
      }
    );

    return () => {
      unsubscribeDefects();
      unsubscribeMeta();
    };
  }, []);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setIsSyncing(true);
    try {
      await seedInitialDataIfEmpty();
      showToast('Firebase Firestore synchronized', 'success');
    } catch {
      showToast('Local database up to date', 'info');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Dynamically computed stats from defects array
  const stats: ExecutionReportStats = useMemo(() => {
    const total = defects.length;
    const passed = defects.filter(d => d.testExecutionStatus === 'Passed').length;
    const failed = defects.filter(d => d.testExecutionStatus === 'Failed').length;
    const blocked = defects.filter(d => d.testExecutionStatus === 'Blocked').length;
    const pending = defects.filter(d => d.testExecutionStatus === 'Pending').length;

    return {
      totalExecuted: total,
      passed,
      failed,
      blocked,
      pending,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      failRate: total > 0 ? Math.round((failed / total) * 100) : 0,
      blockedRate: total > 0 ? Math.round((blocked / total) * 100) : 0,
      pendingRate: total > 0 ? Math.round((pending / total) * 100) : 0
    };
  }, [defects]);

  // Update defect (instant local persistence + Firebase Firestore cloud sync)
  const handleUpdateDefect = async (id: string, updates: Partial<DefectItem>) => {
    const target = defects.find(d => d.id === id || d.bugId === id);
    if (target && !canUserEditDefect(target, currentUser || '')) {
      showToast('Permission denied: You can only edit defects you reported.', 'error');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const updatedList = defects.map(d =>
      d.id === id || d.bugId === id ? { ...d, ...updates, updatedDate: today } : d
    );
    setDefects(updatedList);
    saveStoredDefects(updatedList);
    showToast('Defect record synchronized to Firebase', 'success');

    // Sync to Firestore
    try {
      await updateDefectInFirestore(id, updates);
    } catch (err) {
      console.warn('Firestore update sync background notice:', err);
    }
  };

  // Delete defect (instant local persistence + Firebase Firestore cloud sync)
  const handleDeleteDefect = async (id: string) => {
    if (!canUserDeleteDefect(currentUser || '')) {
      showToast('Permission denied: Only administrator (@sahil_roy) can delete defects.', 'error');
      return;
    }

    const target = defects.find(d => d.id === id || d.bugId === id);
    const targetId = target?.id || id;
    const updatedList = defects.filter(d => d.id !== targetId && d.bugId !== targetId);
    setDefects(updatedList);
    saveStoredDefects(updatedList);
    showToast(`Defect ${target?.bugId || ''} deleted from sheet`, 'info');

    // Sync to Firestore
    try {
      await deleteDefectFromFirestore(targetId);
    } catch (err) {
      console.warn('Firestore delete notice:', err);
    }
  };

  // Bulk delete defects (instant local persistence + Firebase Firestore batch delete)
  const handleBulkDeleteDefects = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!canUserDeleteDefect(currentUser || '')) {
      showToast('Permission denied: Only administrator (@sahil_roy) can delete defects.', 'error');
      return;
    }

    const idSet = new Set(ids);
    const updatedList = defects.filter(d => !idSet.has(d.id) && !idSet.has(d.bugId));
    setDefects(updatedList);
    saveStoredDefects(updatedList);
    showToast(`Deleted ${ids.length} defects from sheet`, 'info');

    // Sync to Firestore
    try {
      await bulkDeleteDefectsFromFirestore(ids);
    } catch (err) {
      console.warn('Firestore bulk delete notice:', err);
    }
  };

  // Save (create new or edit existing - guarantees 100% data persistence on Firebase & Vercel)
  const handleSaveDefect = async (defectData: Partial<DefectItem>) => {
    if (modalState.defect && modalState.defect.id) {
      // Edit existing defect
      await handleUpdateDefect(modalState.defect.id, defectData);
    } else {
      // Create new defect
      const today = new Date().toISOString().split('T')[0];
      const nextNum = defects.length + 1;
      const username = currentUser || 'sahil_roy';
      const newDefect: DefectItem = {
        id: defectData.id || `defect-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        bugId: defectData.bugId || `BUG-${100 + nextNum}`,
        testCaseId: defectData.testCaseId || `TC-${String(nextNum).padStart(3, '0')}`,
        title: defectData.title || 'Untitled Defect',
        summary: defectData.summary || '',
        screenshotPng: defectData.screenshotPng || '',
        screenshotName: defectData.screenshotName || '',
        screenshotSize: defectData.screenshotSize || '',
        module: defectData.module || 'General',
        testExecutionStatus: defectData.testExecutionStatus || 'Failed',
        defectStatus: defectData.defectStatus || 'Open',
        severity: defectData.severity || 'Medium',
        priority: defectData.priority || 'P2 - High',
        assignedTo: defectData.assignedTo || 'Unassigned',
        reportedBy: defectData.reportedBy || (username === 'sahil_roy' ? 'Sahil Roy (Lead)' : `@${username}`),
        reportedByUsername: defectData.reportedByUsername || username,
        createdBy: defectData.createdBy || username,
        environment: defectData.environment || 'QA Staging',
        stepsToReproduce: defectData.stepsToReproduce || '',
        expectedResult: defectData.expectedResult || '',
        actualResult: defectData.actualResult || '',
        driveLink: defectData.driveLink || '',
        githubLink: defectData.githubLink || '',
        createdDate: defectData.createdDate || today,
        updatedDate: today
      };

      const updatedList = [newDefect, ...defects];
      setDefects(updatedList);
      saveStoredDefects(updatedList);
      showToast(`Logged new defect ${newDefect.bugId} to Firebase`, 'success');

      // Persist to Firebase Firestore
      try {
        await addDefectToFirestore(newDefect);
      } catch (err) {
        console.warn('Firestore create defect notice:', err);
      }
    }
  };

  // Save Project Meta (instant local persistence + Firebase Firestore sync)
  const handleSaveProjectMeta = async (updated: Partial<ProjectMeta>) => {
    const updatedMeta = { ...projectMeta, ...updated };
    setProjectMeta(updatedMeta);
    saveStoredProject(updatedMeta);
    showToast('Project details updated and saved to Firebase', 'success');

    // Sync to Firestore
    try {
      await updateProjectMetaInFirestore(updated);
    } catch (err) {
      console.warn('Firestore project update notice:', err);
    }
  };

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Reset to original QA template
  const handleResetTemplate = () => {
    if (!canUserCleanDatabase(currentUser || '')) {
      showToast('Permission denied: Only administrator (@sahil_roy) can reset or clean the database.', 'error');
      return;
    }
    setIsResetConfirmOpen(true);
  };

  const confirmResetTemplate = async () => {
    if (!canUserCleanDatabase(currentUser || '')) {
      showToast('Permission denied: Only administrator (@sahil_roy) can reset or clean the database.', 'error');
      setIsResetConfirmOpen(false);
      return;
    }
    setIsResetting(true);
    try {
      const reset = resetStoredData();
      setProjectMeta(reset.project);
      setDefects(reset.defects);
      showToast('Database reset to clean QA execution state', 'info');

      // Reset in Firestore
      try {
        await resetFirestoreToTemplate();
      } catch (err) {
        console.warn('Firestore reset notice:', err);
      }
    } finally {
      setIsResetting(false);
      setIsResetConfirmOpen(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    exportDefectsToCSV(projectMeta, defects);
    showToast('Exported Defect Tracker Sheet CSV', 'success');
  };

  // Import CSV
  const handleImportCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (text) {
        try {
          const parsed = parseCSVToDefects(text);
          if (parsed.length > 0) {
            const updatedList = [...(parsed as DefectItem[]), ...defects];
            setDefects(updatedList);
            saveStoredDefects(updatedList);
            showToast(`Successfully imported ${parsed.length} records into defect sheet`, 'success');

            // Bulk upsert to Firestore
            try {
              await bulkUpsertDefectsToFirestore(parsed as DefectItem[]);
            } catch (err) {
              console.warn('Firestore bulk import notice:', err);
            }
          } else {
            showToast('No valid defect records found in CSV file', 'error');
          }
        } catch {
          showToast('Failed to parse CSV file', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  // Jump to Defect Sheet with Filter
  const handleNavigateToSheetWithFilter = (filter?: string) => {
    if (filter) {
      setSheetExecutionFilter(filter);
    }
    setActiveTab('sheet');
  };

  // Render Login Gate before accessing dashboard
  if (authStage === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Render Testing-themed Loading Animation after login
  if (authStage === 'loading') {
    return (
      <TestingLoadingScreen
        username={pendingUser}
        onComplete={handleLoadingComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold backdrop-blur animate-in fade-in slide-in-from-bottom-2 bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projectMeta={projectMeta}
        totalDefects={defects.length}
        onOpenNewDefect={() => setModalState({ isOpen: true, defect: null })}
        onExportCSV={handleExportCSV}
        onRefresh={handleRefresh}
        isSyncing={isSyncing}
        currentUser={currentUser || 'sahil_roy'}
        onLogout={handleLogout}
        onChangePassword={() => setIsChangePasswordOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            projectMeta={projectMeta}
            defects={defects}
            stats={stats}
            onNavigateToSheet={handleNavigateToSheetWithFilter}
            onSelectDefect={(defect) => setModalState({ isOpen: true, defect })}
            onNavigateToAdmin={() => setActiveTab('admin')}
            currentUser={currentUser || 'sahil_roy'}
            onLogout={handleLogout}
            onChangePassword={() => setIsChangePasswordOpen(true)}
          />
        )}

        {activeTab === 'sheet' && (
          <DefectSheetView
            defects={defects}
            onUpdateDefect={handleUpdateDefect}
            onDeleteDefect={handleDeleteDefect}
            onBulkDeleteDefects={handleBulkDeleteDefects}
            onAddDefect={() => setModalState({ isOpen: true, defect: null })}
            onOpenDefectModal={(defect) => setModalState({ isOpen: true, defect })}
            onExportCSV={handleExportCSV}
            onImportCSV={handleImportCSV}
            onResetTemplate={handleResetTemplate}
            initialExecutionFilter={sheetExecutionFilter}
            currentUser={currentUser || 'sahil_roy'}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboardView
            projectMeta={projectMeta}
            onSaveMeta={handleSaveProjectMeta}
            onResetTemplate={handleResetTemplate}
            onClearAllDefects={handleResetTemplate}
            onNavigateBack={() => setActiveTab('dashboard')}
            currentUser={currentUser || 'sahil_roy'}
            totalDefects={defects.length}
          />
        )}

        {activeTab === 'about' && (
          <AboutView />
        )}
      </main>

      {/* Edit / New Defect Modal */}
      <DefectModal
        defect={modalState.defect}
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, defect: null })}
        onSave={handleSaveDefect}
        onDelete={handleDeleteDefect}
        totalExisting={defects.length}
        currentUser={currentUser || 'sahil_roy'}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        username={currentUser || 'sahil_roy'}
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={() => showToast('Password updated successfully! Next login requires new password.', 'success')}
      />

      {/* Reset QA Template Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Clean Database & Reset to Zero?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  This will clear all logged defects and reset the database so you can begin adding defects and test cases from zero.
                </p>
                <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium">
                  All current defects and local records will be removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetTemplate}
                disabled={isResetting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition disabled:opacity-50"
              >
                {isResetting ? 'Cleaning...' : 'Yes, Clean Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

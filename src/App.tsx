import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { DefectSheetView } from './components/DefectSheetView.tsx';
import { DefectModal } from './components/DefectModal.tsx';
import { ProjectSettingsView } from './components/ProjectSettingsModal.tsx';
import { initialDefects, initialProjectMeta } from './data/initialData.ts';
import { DefectItem, ProjectMeta, ExecutionReportStats } from './types.ts';
import { exportDefectsToCSV, parseCSVToDefects } from './utils/csvHelper.ts';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sheet' | 'project'>('dashboard');
  const [projectMeta, setProjectMeta] = useState<ProjectMeta>(initialProjectMeta);
  const [defects, setDefects] = useState<DefectItem[]>(initialDefects);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [sheetExecutionFilter, setSheetExecutionFilter] = useState<string>('All');
  
  // Modal state
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

  // Fetch data from backend server database
  const fetchData = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Fetch project meta
      const projRes = await fetch('/api/project');
      if (projRes.ok) {
        const projData = await projRes.json();
        if (projData.project) setProjectMeta(projData.project);
      }

      // Fetch defect sheet records
      const defectsRes = await fetch('/api/defects');
      if (defectsRes.ok) {
        const defectsData = await defectsRes.json();
        if (Array.isArray(defectsData.defects)) {
          setDefects(defectsData.defects);
        }
      }
    } catch (err) {
      console.warn('Using local state cache (server connecting):', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      blockedRate: total > 0 ? Math.round((blocked / total) * 100) : 0
    };
  }, [defects]);

  // Update defect
  const handleUpdateDefect = async (id: string, updates: Partial<DefectItem>) => {
    // Optimistic local update
    setDefects(prev => 
      prev.map(d => (d.id === id ? { ...d, ...updates, updatedDate: new Date().toISOString().split('T')[0] } : d))
    );

    try {
      const res = await fetch(`/api/defects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        showToast('Defect record synchronized to backend database sheet', 'success');
      }
    } catch (err) {
      console.error('Failed to sync update to server:', err);
    }
  };

  // Delete defect
  const handleDeleteDefect = async (id: string) => {
    const target = defects.find(d => d.id === id || d.bugId === id);
    const targetId = target?.id || id;
    setDefects(prev => prev.filter(d => d.id !== targetId && d.bugId !== targetId));

    try {
      const res = await fetch(`/api/defects/${encodeURIComponent(targetId)}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Defect ${target?.bugId || ''} deleted from sheet`, 'info');
      }
    } catch (err) {
      console.error('Failed to delete on server:', err);
    }
  };

  // Bulk delete defects
  const handleBulkDeleteDefects = async (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setDefects(prev => prev.filter(d => !idSet.has(d.id) && !idSet.has(d.bugId)));

    try {
      const res = await fetch('/api/defects/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        showToast(`Deleted ${ids.length} defects from sheet`, 'info');
      }
    } catch (err) {
      console.error('Failed to bulk delete on server:', err);
    }
  };

  // Save (create new or edit existing)
  const handleSaveDefect = async (defectData: Partial<DefectItem>) => {
    if (modalState.defect && modalState.defect.id) {
      // Edit
      await handleUpdateDefect(modalState.defect.id, defectData);
    } else {
      // Create new
      try {
        const res = await fetch('/api/defects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defectData)
        });
        if (res.ok) {
          const data = await res.json();
          setDefects(prev => [data.defect, ...prev]);
          showToast(`Logged new defect ${data.defect.bugId} to sheet`, 'success');
        } else {
          // Fallback optimistic
          const today = new Date().toISOString().split('T')[0];
          const newItem: DefectItem = {
            id: `defect-${Date.now()}`,
            bugId: defectData.bugId || `BUG-${100 + defects.length + 1}`,
            testCaseId: defectData.testCaseId || `TC-${String(defects.length + 1).padStart(3, '0')}`,
            title: defectData.title || 'Untitled',
            module: defectData.module || 'General',
            testExecutionStatus: defectData.testExecutionStatus || 'Failed',
            defectStatus: defectData.defectStatus || 'Open',
            severity: defectData.severity || 'High',
            priority: defectData.priority || 'P2 - High',
            assignedTo: defectData.assignedTo || 'Unassigned',
            reportedBy: defectData.reportedBy || 'QA Lead',
            environment: defectData.environment || 'QA Staging',
            stepsToReproduce: defectData.stepsToReproduce || '',
            expectedResult: defectData.expectedResult || '',
            actualResult: defectData.actualResult || '',
            driveLink: defectData.driveLink || '',
            githubLink: defectData.githubLink || '',
            createdDate: today,
            updatedDate: today
          };
          setDefects(prev => [newItem, ...prev]);
          showToast('Added defect to sheet', 'success');
        }
      } catch (err) {
        console.error('Error creating defect:', err);
      }
    }
  };

  // Save Project Meta
  const handleSaveProjectMeta = async (updated: Partial<ProjectMeta>) => {
    setProjectMeta(prev => ({ ...prev, ...updated }));
    try {
      const res = await fetch('/api/project', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast('Project details updated and saved', 'success');
      }
    } catch (err) {
      console.error('Failed to update project meta:', err);
    }
  };

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Reset to original QA template
  const handleResetTemplate = () => {
    setIsResetConfirmOpen(true);
  };

  const confirmResetTemplate = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        setProjectMeta(initialProjectMeta);
        setDefects(initialDefects);
        showToast('Database reset to original QA Execution Report', 'info');
      }
    } catch (err) {
      setProjectMeta(initialProjectMeta);
      setDefects(initialDefects);
      showToast('Reset applied', 'info');
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
            const res = await fetch('/api/defects/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ defects: parsed, replaceAll: false })
            });
            if (res.ok) {
              fetchData();
              showToast(`Successfully imported ${parsed.length} records into defect sheet`, 'success');
            } else {
              setDefects(prev => [...(parsed as DefectItem[]), ...prev]);
              showToast(`Imported ${parsed.length} records`, 'success');
            }
          } else {
            showToast('No valid defect records found in CSV file', 'error');
          }
        } catch (err) {
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
        onRefresh={fetchData}
        isSyncing={isSyncing}
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
          />
        )}

        {activeTab === 'project' && (
          <ProjectSettingsView
            projectMeta={projectMeta}
            onSaveMeta={handleSaveProjectMeta}
            onResetTemplate={handleResetTemplate}
          />
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
                  Reset to Default QA Template?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  This will reset all defect rows and test execution counts to the default 16 test cases (10 Passed, 1 Failed, 5 Blocked) from the original project specification.
                </p>
                <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium">
                  Any newly created defects or custom edits will be overwritten.
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
                {isResetting ? 'Resetting...' : 'Yes, Reset Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

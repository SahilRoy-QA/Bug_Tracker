import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Sparkles, 
  AlertCircle, 
  FileText,
  Loader2,
  Check,
  Trash2
} from 'lucide-react';
import { 
  DefectItem, 
  TestExecutionStatus, 
  DefectStatus, 
  DefectSeverity, 
  DefectPriority 
} from '../types.ts';

interface DefectModalProps {
  defect: DefectItem | null; // null means create new
  isOpen: boolean;
  onClose: () => void;
  onSave: (defect: Partial<DefectItem>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  defaultModule?: string;
  totalExisting: number;
}

export const DefectModal: React.FC<DefectModalProps> = ({
  defect,
  isOpen,
  onClose,
  onSave,
  onDelete,
  defaultModule = 'Admin',
  totalExisting
}) => {
  const [formData, setFormData] = useState<Partial<DefectItem>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);

  useEffect(() => {
    setValidationError(null);
    setIsConfirmingDelete(false);
    if (defect) {
      setFormData(defect);
    } else {
      const nextNum = totalExisting + 1;
      setFormData({
        bugId: `BUG-${100 + nextNum}`,
        testCaseId: `TC-${String(nextNum).padStart(3, '0')}`,
        title: '',
        module: defaultModule,
        testExecutionStatus: 'Failed',
        defectStatus: 'Open',
        severity: 'High',
        priority: 'P2 - High',
        assignedTo: 'Marcus Chen (Dev Lead)',
        reportedBy: 'Sahil Roy (Lead QA)',
        environment: 'QA Staging - Chrome v126 / Ubuntu 24.04',
        stepsToReproduce: '1. Navigate to target module\n2. Perform test step\n3. Observe result',
        expectedResult: '',
        actualResult: '',
        driveLink: 'https://drive.google.com/drive/folders/qa-test-evidence-2026',
        githubLink: ''
      });
    }
    setAiSuggestion(null);
  }, [defect, isOpen, totalExisting, defaultModule]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      setValidationError('Please provide a Defect Summary / Title');
      return;
    }
    setValidationError(null);
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!defect?.id || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(defect.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  const handleAIAnalyze = async () => {
    setIsAnalyzingAI(true);
    try {
      const res = await fetch('/api/ai/analyze-defect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          module: formData.module,
          expectedResult: formData.expectedResult,
          actualResult: formData.actualResult,
          steps: formData.stepsToReproduce
        })
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setAiSuggestion(data);
        if (data.severitySuggestion) {
          setFormData(prev => ({
            ...prev,
            severity: data.severitySuggestion as DefectSeverity,
            priority: (data.prioritySuggestion as DefectPriority) || prev.priority
          }));
        }
        return;
      }
    } catch {
      // Backend not available or running on static Vercel host
    }

    // Smart heuristic triage fallback
    const textCorpus = `${formData.title} ${formData.actualResult} ${formData.stepsToReproduce}`.toLowerCase();
    let suggestedSeverity: DefectSeverity = 'Medium';
    let suggestedPriority: DefectPriority = 'P3 - Medium';

    if (textCorpus.includes('crash') || textCorpus.includes('500') || textCorpus.includes('security') || textCorpus.includes('vulnerability') || textCorpus.includes('leak') || textCorpus.includes('fatal')) {
      suggestedSeverity = 'Critical';
      suggestedPriority = 'P1 - Urgent';
    } else if (textCorpus.includes('fail') || textCorpus.includes('blocked') || textCorpus.includes('error') || textCorpus.includes('cannot') || textCorpus.includes('freeze') || textCorpus.includes('unhandled')) {
      suggestedSeverity = 'High';
      suggestedPriority = 'P2 - High';
    } else if (textCorpus.includes('typo') || textCorpus.includes('alignment') || textCorpus.includes('cosmetic') || textCorpus.includes('color') || textCorpus.includes('padding')) {
      suggestedSeverity = 'Low';
      suggestedPriority = 'P4 - Low';
    }

    const fallbackAnalysis = {
      severitySuggestion: suggestedSeverity,
      prioritySuggestion: suggestedPriority,
      summary: `QA Heuristic Analysis for ${formData.module || 'General'}: Potential issue in ${formData.title.slice(0, 45)}...`,
      recommendedRootCause: textCorpus.includes('500') || textCorpus.includes('crash')
        ? 'Probable unhandled promise rejection or backend exception handling failure.'
        : 'Boundary condition or state synchronization discrepancy detected.',
      testRecommendations: [
        'Validate input sanitization and payload boundary values',
        'Verify behavioral persistence across page reload and cache refresh',
        'Perform regression tests on affected sub-modules'
      ]
    };

    setAiSuggestion(fallbackAnalysis);
    setFormData(prev => ({
      ...prev,
      severity: suggestedSeverity,
      priority: suggestedPriority
    }));
    setIsAnalyzingAI(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30">
                {formData.bugId || 'NEW DEFECT'}
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {defect ? 'Edit Defect Record' : 'Log New Defect & Test Result'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Updates will persist to the backend Defect Tracker Sheet database
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* AI Defect Triage Recommendation (if generated) */}
          {aiSuggestion && (
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/30 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>AI QA Triage Analysis</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200">{aiSuggestion.summary}</p>
              {aiSuggestion.recommendedRootCause && (
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Hypothesized Root Cause:</strong> {aiSuggestion.recommendedRootCause}
                </div>
              )}
              {aiSuggestion.testRecommendations && (
                <div className="text-xs text-slate-700 dark:text-slate-300 pt-1">
                  <strong>Regression Checklist:</strong>
                  <ul className="list-disc list-inside mt-1 text-slate-600 dark:text-slate-400 space-y-0.5">
                    {aiSuggestion.testRecommendations.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Row 1: IDs & Module */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bug ID *
              </label>
              <input
                type="text"
                required
                value={formData.bugId || ''}
                onChange={e => setFormData({ ...formData, bugId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Test Case ID
              </label>
              <input
                type="text"
                value={formData.testCaseId || ''}
                onChange={e => setFormData({ ...formData, testCaseId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Module / Feature *
              </label>
              <input
                type="text"
                required
                value={formData.module || ''}
                onChange={e => setFormData({ ...formData, module: e.target.value })}
                placeholder="e.g. Admin / Auth, PIM, Leave"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 2: Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Defect Title / Summary *
              </label>
              <button
                type="button"
                onClick={handleAIAnalyze}
                disabled={isAnalyzingAI || !formData.title}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition"
              >
                {isAnalyzingAI ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>AI Triage Assistant</span>
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              required
              value={formData.title || ''}
              onChange={e => {
                setFormData({ ...formData, title: e.target.value });
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. System throws 500 error when applying leave without mandatory reason field"
              className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border ${validationError ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'} rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500`}
            />
            {validationError && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                {validationError}
              </p>
            )}
          </div>

          {/* Row 3: Statuses & Severities */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Execution Status
              </label>
              <select
                value={formData.testExecutionStatus || 'Failed'}
                onChange={e => setFormData({ ...formData, testExecutionStatus: e.target.value as TestExecutionStatus })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
                <option value="Blocked">Blocked</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Defect Status
              </label>
              <select
                value={formData.defectStatus || 'Open'}
                onChange={e => setFormData({ ...formData, defectStatus: e.target.value as DefectStatus })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Verified">Verified</option>
                <option value="Closed">Closed</option>
                <option value="Reopened">Reopened</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Severity
              </label>
              <select
                value={formData.severity || 'High'}
                onChange={e => setFormData({ ...formData, severity: e.target.value as DefectSeverity })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority || 'P2 - High'}
                onChange={e => setFormData({ ...formData, priority: e.target.value as DefectPriority })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="P1 - Urgent">P1 - Urgent</option>
                <option value="P2 - High">P2 - High</option>
                <option value="P3 - Medium">P3 - Medium</option>
                <option value="P4 - Low">P4 - Low</option>
              </select>
            </div>
          </div>

          {/* Row 4: People & Environment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned To
              </label>
              <input
                type="text"
                value={formData.assignedTo || ''}
                onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reported By
              </label>
              <input
                type="text"
                value={formData.reportedBy || ''}
                onChange={e => setFormData({ ...formData, reportedBy: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Test Environment
              </label>
              <input
                type="text"
                value={formData.environment || ''}
                onChange={e => setFormData({ ...formData, environment: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 5: Steps to Reproduce */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Steps to Reproduce
            </label>
            <textarea
              rows={3}
              value={formData.stepsToReproduce || ''}
              onChange={e => setFormData({ ...formData, stepsToReproduce: e.target.value })}
              placeholder="1. Navigate to...\n2. Click on...\n3. Fill in..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Row 6: Expected & Actual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                Expected Result
              </label>
              <textarea
                rows={2}
                value={formData.expectedResult || ''}
                onChange={e => setFormData({ ...formData, expectedResult: e.target.value })}
                placeholder="What should have happened according to requirements"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
                Actual Result (Defect Behavior)
              </label>
              <textarea
                rows={2}
                value={formData.actualResult || ''}
                onChange={e => setFormData({ ...formData, actualResult: e.target.value })}
                placeholder="What actually occurred (error codes, unexpected redirect, etc.)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/40">
          {/* Delete Action (only if editing existing defect) */}
          {defect && onDelete ? (
            <div>
              {isConfirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Confirm delete?
                  </span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Yes, Delete</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={isDeleting}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  disabled={isSaving || isDeleting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition"
                  title="Permanently remove this defect"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Defect</span>
                </button>
              )}
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSaving || isDeleting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{defect ? 'Update Record' : 'Save to Defect Sheet'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

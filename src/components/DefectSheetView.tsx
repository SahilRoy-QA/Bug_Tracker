import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Eye, 
  Layers,
  ChevronDown,
  ArrowUpDown,
  FileSpreadsheet,
  SlidersHorizontal,
  Loader2
} from 'lucide-react';
import { 
  DefectItem, 
  TestExecutionStatus, 
  DefectStatus, 
  DefectSeverity, 
  DefectPriority 
} from '../types.ts';

interface DefectSheetViewProps {
  defects: DefectItem[];
  onUpdateDefect: (id: string, updates: Partial<DefectItem>) => Promise<void>;
  onDeleteDefect: (id: string) => Promise<void>;
  onBulkDeleteDefects?: (ids: string[]) => Promise<void>;
  onAddDefect: () => void;
  onOpenDefectModal: (defect: DefectItem) => void;
  onExportCSV: () => void;
  onImportCSV: (file: File) => void;
  onResetTemplate: () => void;
  initialExecutionFilter?: string;
}

export const DefectSheetView: React.FC<DefectSheetViewProps> = ({
  defects,
  onUpdateDefect,
  onDeleteDefect,
  onBulkDeleteDefects,
  onAddDefect,
  onOpenDefectModal,
  onExportCSV,
  onImportCSV,
  onResetTemplate,
  initialExecutionFilter = 'All'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [executionFilter, setExecutionFilter] = useState<string>(initialExecutionFilter);
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [moduleFilter, setModuleFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<keyof DefectItem>('bugId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [mobileLayout, setMobileLayout] = useState<'cards' | 'table'>('cards');
  const [defectToDelete, setDefectToDelete] = useState<DefectItem | null>(null);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);
  const [isDeletingDefect, setIsDeletingDefect] = useState(false);

  // Available unique modules
  const modules = useMemo(() => {
    const set = new Set<string>();
    defects.forEach(d => {
      if (d.module) set.add(d.module.split('/')[0].trim());
    });
    return Array.from(set).sort();
  }, [defects]);

  // Filtered & Sorted defects
  const filteredDefects = useMemo(() => {
    return defects
      .filter(item => {
        // Search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const match = 
            item.bugId.toLowerCase().includes(term) ||
            item.testCaseId.toLowerCase().includes(term) ||
            item.title.toLowerCase().includes(term) ||
            item.module.toLowerCase().includes(term) ||
            item.assignedTo.toLowerCase().includes(term) ||
            (item.actualResult && item.actualResult.toLowerCase().includes(term));
          if (!match) return false;
        }

        // Execution status filter
        if (executionFilter !== 'All' && item.testExecutionStatus !== executionFilter) {
          return false;
        }

        // Severity filter
        if (severityFilter !== 'All' && item.severity !== severityFilter) {
          return false;
        }

        // Module filter
        if (moduleFilter !== 'All' && !item.module.toLowerCase().includes(moduleFilter.toLowerCase())) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [defects, searchTerm, executionFilter, severityFilter, moduleFilter, sortField, sortOrder]);

  const handleSort = (field: keyof DefectItem) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleStatusChange = async (id: string, newStatus: TestExecutionStatus) => {
    setIsUpdating(id);
    try {
      await onUpdateDefect(id, { testExecutionStatus: newStatus });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDefectStatusChange = async (id: string, newDefectStatus: DefectStatus) => {
    setIsUpdating(id);
    try {
      await onUpdateDefect(id, { defectStatus: newDefectStatus });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSeverityChange = async (id: string, newSeverity: DefectSeverity) => {
    setIsUpdating(id);
    try {
      await onUpdateDefect(id, { severity: newSeverity });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredDefects.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (status: TestExecutionStatus) => {
    for (const id of selectedIds) {
      await onUpdateDefect(id, { testExecutionStatus: status });
    }
    setSelectedIds([]);
  };

  const handleConfirmSingleDelete = async () => {
    if (!defectToDelete) return;
    setIsDeletingDefect(true);
    try {
      await onDeleteDefect(defectToDelete.id);
      setSelectedIds(prev => prev.filter(id => id !== defectToDelete.id));
      setDefectToDelete(null);
    } finally {
      setIsDeletingDefect(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingDefect(true);
    try {
      if (onBulkDeleteDefects) {
        await onBulkDeleteDefects(selectedIds);
      } else {
        for (const id of selectedIds) {
          await onDeleteDefect(id);
        }
      }
      setSelectedIds([]);
      setIsConfirmingBulkDelete(false);
    } finally {
      setIsDeletingDefect(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCSV(file);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Controls Toolbar */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-sm space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Bug ID, title, module, assignee..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs px-1"
              >
                &times;
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {/* Mobile View Toggle */}
            <div className="flex md:hidden items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl p-0.5 shrink-0">
              <button
                onClick={() => setMobileLayout('cards')}
                className={`px-2 py-1 text-[11px] font-medium rounded-lg transition ${
                  mobileLayout === 'cards'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Cards view"
              >
                Cards
              </button>
              <button
                onClick={() => setMobileLayout('table')}
                className={`px-2 py-1 text-[11px] font-medium rounded-lg transition ${
                  mobileLayout === 'table'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Full sheet table"
              >
                Sheet
              </button>
            </div>

            <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700/80 cursor-pointer transition shrink-0">
              <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Import</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={onExportCSV}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700/80 transition shrink-0"
              title="Export formatted CSV Defect Tracker Sheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              onClick={onResetTemplate}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700/80 transition shrink-0"
              title="Reset template sample"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              onClick={onAddDefect}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 text-xs">
          {/* Status Quick Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 text-xs mr-1 font-medium">Execution:</span>
            {[
              { label: 'All', count: defects.length, color: 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300' },
              { 
                label: 'Passed', 
                count: defects.filter(d => d.testExecutionStatus === 'Passed').length,
                color: 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10'
              },
              { 
                label: 'Failed', 
                count: defects.filter(d => d.testExecutionStatus === 'Failed').length,
                color: 'text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10'
              },
              { 
                label: 'Blocked', 
                count: defects.filter(d => d.testExecutionStatus === 'Blocked').length,
                color: 'text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-600/30 bg-yellow-50 dark:bg-yellow-500/10'
              },
              { 
                label: 'Pending', 
                count: defects.filter(d => d.testExecutionStatus === 'Pending').length,
                color: 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800'
              }
            ].map(pill => (
              <button
                key={pill.label}
                onClick={() => setExecutionFilter(pill.label)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                  executionFilter === pill.label
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{pill.label}</span>
                <span className="ml-1.5 px-1 py-0.2 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {pill.count}
                </span>
              </button>
            ))}
          </div>

          {/* Module & Severity Dropdowns */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Severity:</span>
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Module:</span>
              <select
                value={moduleFilter}
                onChange={e => setModuleFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Modules</option>
                {modules.map(mod => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar (when rows are selected) */}
        {selectedIds.length > 0 && (
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                {selectedIds.length} row(s) selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-300">Set Execution:</span>
              <button
                onClick={() => handleBulkStatusChange('Passed')}
                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                Passed
              </button>
              <button
                onClick={() => handleBulkStatusChange('Failed')}
                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium"
              >
                Failed
              </button>
              <button
                onClick={() => handleBulkStatusChange('Blocked')}
                className="px-2 py-1 rounded bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-semibold"
              >
                Blocked
              </button>
              <button
                onClick={() => setIsConfirmingBulkDelete(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium transition shadow-xs"
                title="Delete selected rows"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-2 py-1"
              >
                Deselect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card List View (Active on small screens when 'cards' view is selected) */}
      <div className={`space-y-3 ${mobileLayout === 'cards' ? 'block md:hidden' : 'hidden'}`}>
        {filteredDefects.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 p-8 text-center text-slate-500 dark:text-slate-400 shadow-xs">
            <FileSpreadsheet className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2 opacity-60" />
            <p className="text-xs font-medium">No defects or test cases match your filter criteria.</p>
            <button
              onClick={() => { setSearchTerm(''); setExecutionFilter('All'); setSeverityFilter('All'); setModuleFilter('All'); }}
              className="mt-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold text-xs"
            >
              Reset filters
            </button>
          </div>
        ) : (
          filteredDefects.map(d => {
            const isRowUpdating = isUpdating === d.id;
            return (
              <div 
                key={`card-${d.id}`}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 p-4 shadow-xs space-y-3 transition hover:border-slate-300 dark:hover:border-slate-600"
              >
                {/* Header: ID, Module, and Menu / Quick Edit */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onOpenDefectModal(d)}
                      className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                    >
                      {d.bugId}
                    </button>
                    {d.testCaseId && (
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {d.testCaseId}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 text-[10px] font-medium">
                      {d.module}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenDefectModal(d)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDefectToDelete(d);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
                      title="Delete defect"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div 
                  onClick={() => onOpenDefectModal(d)}
                  className="text-xs font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer line-clamp-2 leading-relaxed"
                >
                  {d.title}
                </div>

                {/* Status Dropdowns (Simplified for touch) */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1">
                      Execution
                    </label>
                    <select
                      value={d.testExecutionStatus}
                      disabled={isRowUpdating}
                      onChange={e => handleStatusChange(d.id, e.target.value as TestExecutionStatus)}
                      className={`w-full px-2 py-1.5 rounded-xl text-xs font-medium border focus:outline-none transition ${
                        d.testExecutionStatus === 'Passed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600/40'
                          : d.testExecutionStatus === 'Failed'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-600/40'
                          : d.testExecutionStatus === 'Blocked'
                          ? 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-600/40'
                          : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <option value="Passed">Passed</option>
                      <option value="Failed">Failed</option>
                      <option value="Blocked">Blocked</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1">
                      Defect Status
                    </label>
                    <select
                      value={d.defectStatus}
                      disabled={isRowUpdating}
                      onChange={e => handleDefectStatusChange(d.id, e.target.value as DefectStatus)}
                      className="w-full px-2 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Fixed">Fixed</option>
                      <option value="Verified">Verified</option>
                      <option value="Closed">Closed</option>
                      <option value="Reopened">Reopened</option>
                    </select>
                  </div>
                </div>

                {/* Footer metadata: Severity, Assignee */}
                <div className="flex items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md font-medium text-[10px] border ${
                      d.severity === 'Critical'
                        ? 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/30 dark:border-rose-800/50'
                        : d.severity === 'High'
                        ? 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800/50'
                        : d.severity === 'Medium'
                        ? 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-800/50'
                        : 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700'
                    }`}>
                      {d.severity}
                    </span>
                    <span className="truncate max-w-[150px] text-slate-700 dark:text-slate-300">
                      {d.assignedTo}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Database Sheet Table Container (Visible on desktop or when 'table' view selected on mobile) */}
      <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-xl overflow-hidden ${mobileLayout === 'table' ? 'block' : 'hidden md:block'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700 select-none">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredDefects.length && filteredDefects.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-white dark:bg-slate-900 cursor-pointer"
                  />
                </th>
                <th 
                  onClick={() => handleSort('bugId')}
                  className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Bug ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('testCaseId')}
                  className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>TC ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('title')}
                  className="p-3.5 min-w-[280px] cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Summary / Defect Title</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('module')}
                  className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Module</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('testExecutionStatus')}
                  className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Execution Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('defectStatus')}
                  className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Defect Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('severity')}
                  className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Severity</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('priority')}
                  className="p-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th className="p-3.5">Assignee</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-sans">
              {filteredDefects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <FileSpreadsheet className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">No defects or test cases match your filter criteria.</p>
                    <button
                      onClick={() => { setSearchTerm(''); setExecutionFilter('All'); setSeverityFilter('All'); setModuleFilter('All'); }}
                      className="mt-3 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold text-xs"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredDefects.map((d, index) => {
                  const isSelected = selectedIds.includes(d.id);
                  const isRowUpdating = isUpdating === d.id;

                  return (
                    <tr 
                      key={d.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition ${
                        isSelected ? 'bg-indigo-50 dark:bg-indigo-950/30' : index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(d.id)}
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-white dark:bg-slate-900 cursor-pointer"
                        />
                      </td>

                      {/* Bug ID */}
                      <td className="p-3 font-mono font-bold whitespace-nowrap">
                        <button
                          onClick={() => onOpenDefectModal(d)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline flex items-center gap-1"
                        >
                          <span>{d.bugId}</span>
                        </button>
                      </td>

                      {/* Test Case ID */}
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {d.testCaseId}
                      </td>

                      {/* Summary / Defect Title */}
                      <td className="p-3 max-w-sm">
                        <div 
                          onClick={() => onOpenDefectModal(d)}
                          className="font-medium text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer line-clamp-2 leading-relaxed"
                          title={d.title}
                        >
                          {d.title}
                        </div>
                        {d.actualResult && d.testExecutionStatus === 'Failed' && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-mono mt-1 truncate">
                            Actual: {d.actualResult}
                          </div>
                        )}
                      </td>

                      {/* Module */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 text-[11px] font-medium">
                          {d.module}
                        </span>
                      </td>

                      {/* Execution Status Dropdown (Live Sync) */}
                      <td className="p-3 whitespace-nowrap">
                        <select
                          value={d.testExecutionStatus}
                          disabled={isRowUpdating}
                          onChange={e => handleStatusChange(d.id, e.target.value as TestExecutionStatus)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer transition ${
                            d.testExecutionStatus === 'Passed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                              : d.testExecutionStatus === 'Failed'
                              ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
                              : d.testExecutionStatus === 'Blocked'
                              ? 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-600/40'
                              : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          <option value="Passed">Passed</option>
                          <option value="Failed">Failed</option>
                          <option value="Blocked">Blocked</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </td>

                      {/* Defect Status Dropdown */}
                      <td className="p-3 whitespace-nowrap">
                        <select
                          value={d.defectStatus}
                          disabled={isRowUpdating}
                          onChange={e => handleDefectStatusChange(d.id, e.target.value as DefectStatus)}
                          className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300 text-xs font-semibold focus:outline-none cursor-pointer"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Verified">Verified</option>
                          <option value="Closed">Closed</option>
                          <option value="Reopened">Reopened</option>
                        </select>
                      </td>

                      {/* Severity Dropdown */}
                      <td className="p-3 whitespace-nowrap">
                        <select
                          value={d.severity}
                          disabled={isRowUpdating}
                          onChange={e => handleSeverityChange(d.id, e.target.value as DefectSeverity)}
                          className={`px-2 py-1 rounded text-[11px] font-bold border focus:outline-none cursor-pointer ${
                            d.severity === 'Critical'
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40'
                              : d.severity === 'High'
                              ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/40'
                              : d.severity === 'Medium'
                              ? 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/40'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40'
                          }`}
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </td>

                      {/* Priority */}
                      <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {d.priority}
                      </td>

                      {/* Assignee */}
                      <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-300 text-xs">
                        {d.assignedTo}
                      </td>

                      {/* Actions */}
                      <td className="p-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenDefectModal(d)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                            title="Edit full defect details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDefectToDelete(d);
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                            title="Delete defect row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer count & sync indicator */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-800 dark:text-white font-mono">{filteredDefects.length}</strong> of{' '}
              <strong className="text-slate-800 dark:text-white font-mono">{defects.length}</strong> total sheet rows
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
              Real-time backend sheet sync enabled
            </span>
          </div>
        </div>
      </div>

      {/* Delete Single Defect Confirmation Modal */}
      {defectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Defect Record?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to permanently delete <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{defectToDelete.bugId}</span>: &quot;<span className="font-medium text-slate-800 dark:text-slate-200">{defectToDelete.title}</span>&quot;?
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  This row will be removed from your defect sheet database and execution metrics.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setDefectToDelete(null)}
                disabled={isDeletingDefect}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                disabled={isDeletingDefect}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition disabled:opacity-50"
              >
                {isDeletingDefect ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isConfirmingBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete {selectedIds.length} Defect Records?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to permanently delete all <strong className="text-slate-900 dark:text-white font-mono">{selectedIds.length}</strong> selected rows from the database?
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  This bulk action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsConfirmingBulkDelete(false)}
                disabled={isDeletingDefect}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={isDeletingDefect}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition disabled:opacity-50"
              >
                {isDeletingDefect ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting {selectedIds.length} items...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All {selectedIds.length} Records</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

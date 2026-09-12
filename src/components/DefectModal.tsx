import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  AlertCircle, 
  FileText,
  Loader2,
  Check,
  Trash2,
  Lock,
  Image as ImageIcon,
  Upload,
  Eye,
  FileCheck,
  Tag,
  Maximize2
} from 'lucide-react';
import { 
  DefectItem, 
  DefectStatus, 
  DefectSeverity, 
  DefectPriority 
} from '../types.ts';
import { 
  canUserEditDefect, 
  canUserDeleteDefect 
} from '../utils/permissions.ts';

interface DefectModalProps {
  defect: DefectItem | null; // null means create new
  isOpen: boolean;
  onClose: () => void;
  onSave: (defect: Partial<DefectItem>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  defaultModule?: string;
  totalExisting: number;
  currentUser?: string;
}

export const DefectModal: React.FC<DefectModalProps> = ({
  defect,
  isOpen,
  onClose,
  onSave,
  onDelete,
  defaultModule = 'Admin',
  totalExisting,
  currentUser = 'sahil_roy'
}) => {
  const [formData, setFormData] = useState<Partial<DefectItem>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showScreenshotPreview, setShowScreenshotPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canEdit = canUserEditDefect(defect, currentUser);
  const canDelete = canUserDeleteDefect(currentUser);

  useEffect(() => {
    setValidationError(null);
    setScreenshotError(null);
    setIsConfirmingDelete(false);
    setShowScreenshotPreview(false);
    if (defect) {
      setFormData(defect);
    } else {
      const nextNum = totalExisting + 1;
      const reporterDisplay = 
        currentUser === 'sahil_roy' 
          ? 'Sahil Roy (Lead QA)' 
          : currentUser === 'jit_mondal' 
          ? 'Jeet Mondal (QA Engineer)' 
          : currentUser || 'QA Tester';

      setFormData({
        bugId: `BUG-${100 + nextNum}`,
        testCaseId: `TC-${String(nextNum).padStart(3, '0')}`,
        title: '',
        summary: '',
        screenshotPng: '',
        screenshotName: '',
        screenshotSize: '',
        module: defaultModule,
        defectStatus: 'Open',
        severity: 'High',
        priority: 'P2 - High',
        assignedTo: 'Marcus Chen (Dev Lead)',
        reportedBy: reporterDisplay,
        reportedByUsername: currentUser,
        createdBy: currentUser,
        environment: 'QA Staging - Chrome v126 / Ubuntu 24.04',
        stepsToReproduce: '1. Navigate to target module\n2. Perform test step\n3. Observe result',
        expectedResult: '',
        actualResult: '',
        driveLink: 'https://drive.google.com/drive/folders/qa-test-evidence-2026',
        githubLink: ''
      });
    }
  }, [defect, isOpen, totalExisting, defaultModule, currentUser]);

  if (!isOpen) return null;

  // Process and optimize PNG Screenshot file
  const processScreenshotFile = (file: File) => {
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    if (!isPng) {
      setScreenshotError('Invalid file format: Only PNG (.png) files are accepted for screenshots.');
      return;
    }

    setScreenshotError(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setScreenshotError('Failed to read screenshot file.');
    };
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        try {
          const MAX_WIDTH = 1400;
          const MAX_HEIGHT = 1400;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width / MAX_WIDTH > height / MAX_HEIGHT) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            } else {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedPng = canvas.toDataURL('image/png');
            
            // Calculate formatted size from base64 string
            const approxBytes = Math.round((optimizedPng.length - 22) * 0.75);
            const sizeInKb = (approxBytes / 1024).toFixed(1);
            const formattedSize = approxBytes > 1024 * 1024 
              ? `${(approxBytes / (1024 * 1024)).toFixed(2)} MB` 
              : `${sizeInKb} KB`;

            setFormData(prev => ({
              ...prev,
              screenshotPng: optimizedPng,
              screenshotName: file.name,
              screenshotSize: formattedSize
            }));
          } else {
            // Fallback to raw if canvas context unavailable
            const sizeInKb = (file.size / 1024).toFixed(1);
            setFormData(prev => ({
              ...prev,
              screenshotPng: rawDataUrl,
              screenshotName: file.name,
              screenshotSize: `${sizeInKb} KB`
            }));
          }
        } catch {
          // Fallback to original read
          const sizeInKb = (file.size / 1024).toFixed(1);
          setFormData(prev => ({
            ...prev,
            screenshotPng: rawDataUrl,
            screenshotName: file.name,
            screenshotSize: `${sizeInKb} KB`
          }));
        }
      };
      img.onerror = () => {
        setScreenshotError('Unable to process the image file.');
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processScreenshotFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canEdit) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processScreenshotFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveScreenshot = () => {
    setFormData(prev => ({
      ...prev,
      screenshotPng: undefined,
      screenshotName: undefined,
      screenshotSize: undefined
    }));
    setScreenshotError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!formData.title?.trim()) {
      setValidationError('Please provide a Defect Title');
      return;
    }
    setValidationError(null);
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        reportedByUsername: formData.reportedByUsername || (defect ? defect.reportedByUsername : currentUser),
        createdBy: formData.createdBy || (defect ? defect.createdBy : currentUser)
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!defect?.id || !onDelete || !canDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(defect.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto transition-colors">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30">
                  {formData.bugId || 'NEW DEFECT'}
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {!canEdit && defect && <Lock className="w-4 h-4 text-amber-500" />}
                  {defect 
                    ? (canEdit ? 'Edit Defect Record' : 'View Defect Record (Read-Only)') 
                    : 'Log New Defect & Test Result'}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {canEdit 
                  ? 'Updates will persist to the backend Defect Tracker Sheet database'
                  : 'Viewing mode · You have read-only access to this defect record'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Read-only notification banner if user is not author and not admin */}
          {defect && !canEdit && (
            <div className="mx-6 mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Read-Only Defect View
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                  Logged by <span className="font-semibold">{defect.reportedBy || defect.reportedByUsername || 'QA Engineer'}</span>. Non-admin users can only edit defects they logged themselves. Administrators have full editing rights.
                </p>
              </div>
            </div>
          )}

          {/* Modal Body / Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Row 1: IDs & Module */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bug ID *
                </label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={formData.bugId || ''}
                  onChange={e => setFormData({ ...formData, bugId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Test Case ID
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.testCaseId || ''}
                  onChange={e => setFormData({ ...formData, testCaseId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Module / Feature *
                </label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={formData.module || ''}
                  onChange={e => setFormData({ ...formData, module: e.target.value })}
                  placeholder="e.g. Admin / Auth, PIM, Leave"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Row 2: Unmerged Field 1 - Defect Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Defect Title *
              </label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={formData.title || ''}
                onChange={e => {
                  setFormData({ ...formData, title: e.target.value });
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. System throws 500 error when applying leave without mandatory reason field"
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border ${validationError ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-200 dark:border-slate-700'} rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed`}
              />
              {validationError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                  {validationError}
                </p>
              )}
            </div>

            {/* Row 3: Unmerged Field 2 - Defect Summary */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Defect Summary
              </label>
              <textarea
                rows={2}
                disabled={!canEdit}
                value={formData.summary || ''}
                onChange={e => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Comprehensive technical summary and impact overview of the reported issue..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              />
            </div>

            {/* Row 4: Screenshot Attachment Field (PNG Only) with Tag Support */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Defect &amp; Test Result Screenshot
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    <Tag className="w-2.5 h-2.5" />
                    PNG Only
                  </span>
                </div>
                {formData.screenshotPng && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Evidence Tagged
                  </span>
                )}
              </div>

              {/* Tag & Preview Card when screenshot is attached */}
              {formData.screenshotPng ? (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0 flex-1 w-full sm:w-auto">
                    {/* Thumbnail */}
                    <div 
                      onClick={() => setShowScreenshotPreview(true)}
                      className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-pointer group shrink-0"
                      title="Click to view full screenshot"
                    >
                      <img 
                        src={formData.screenshotPng} 
                        alt="Defect screenshot evidence" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* Meta info & Tag Badge */}
                    <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                          <Tag className="w-2.5 h-2.5" />
                          PNG Screenshot
                        </span>
                        {formData.screenshotSize && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0">
                            {formData.screenshotSize}
                          </span>
                        )}
                      </div>
                      <p 
                        className="text-xs font-semibold text-slate-900 dark:text-white truncate block w-full"
                        title={formData.screenshotName || 'screenshot_evidence.png'}
                      >
                        {formData.screenshotName || 'screenshot_evidence.png'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setShowScreenshotPreview(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                      title="View full resolution"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Preview</span>
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 transition"
                        title="Remove attached screenshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Upload Dropzone (PNG Only) */
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,image/png"
                    disabled={!canEdit}
                    onChange={handleFileChange}
                    className="hidden"
                    id="defect-screenshot-input"
                  />
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => {
                      if (canEdit && fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30' 
                        : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500/60 bg-white dark:bg-slate-900/50'
                    } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Click to upload PNG screenshot
                        </span>{' '}
                        <span className="text-xs text-slate-500">or drag &amp; drop</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Strict requirement: Accepts <strong className="text-emerald-600 dark:text-emerald-400">PNG (.png)</strong> files only
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Format Validation Error */}
              {screenshotError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{screenshotError}</span>
                </div>
              )}
            </div>

            {/* Row 5: Status & Severities */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Defect Status
                </label>
                <select
                  disabled={!canEdit}
                  value={formData.defectStatus || 'Open'}
                  onChange={e => setFormData({ ...formData, defectStatus: e.target.value as DefectStatus })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Doubt">Doubt</option>
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
                  disabled={!canEdit}
                  value={formData.severity || 'High'}
                  onChange={e => setFormData({ ...formData, severity: e.target.value as DefectSeverity })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
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
                  disabled={!canEdit}
                  value={formData.priority || 'P2 - High'}
                  onChange={e => setFormData({ ...formData, priority: e.target.value as DefectPriority })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="P1 - Urgent">P1 - Urgent</option>
                  <option value="P2 - High">P2 - High</option>
                  <option value="P3 - Medium">P3 - Medium</option>
                  <option value="P4 - Low">P4 - Low</option>
                </select>
              </div>
            </div>

            {/* Row 6: People & Environment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned To
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.assignedTo || ''}
                  onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reported By
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.reportedBy || ''}
                  onChange={e => setFormData({ ...formData, reportedBy: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Test Environment
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.environment || ''}
                  onChange={e => setFormData({ ...formData, environment: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Row 7: Steps to Reproduce */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Steps to Reproduce
              </label>
              <textarea
                rows={3}
                disabled={!canEdit}
                value={formData.stepsToReproduce || ''}
                onChange={e => setFormData({ ...formData, stepsToReproduce: e.target.value })}
                placeholder="1. Navigate to...\n2. Click on...\n3. Fill in..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              />
            </div>

            {/* Row 8: Expected & Actual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                  Expected Result
                </label>
                <textarea
                  rows={2}
                  disabled={!canEdit}
                  value={formData.expectedResult || ''}
                  onChange={e => setFormData({ ...formData, expectedResult: e.target.value })}
                  placeholder="What should have happened according to requirements"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
                  Actual Result (Defect Behavior)
                </label>
                <textarea
                  rows={2}
                  disabled={!canEdit}
                  value={formData.actualResult || ''}
                  onChange={e => setFormData({ ...formData, actualResult: e.target.value })}
                  placeholder="What actually occurred (error codes, unexpected redirect, etc.)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </form>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/40">
            {/* Delete Action (only if editing existing defect AND user has delete privileges) */}
            {defect && onDelete && canDelete ? (
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition cursor-pointer"
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
              >
                {canEdit ? 'Cancel' : 'Close'}
              </button>

              {canEdit && (
                <button
                  onClick={handleSubmit}
                  disabled={isSaving || isDeleting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Resolution Screenshot Lightbox Modal */}
      {showScreenshotPreview && formData.screenshotPng && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setShowScreenshotPreview(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PNG Screenshot
                </span>
                <span className="text-xs font-semibold text-white truncate max-w-md">
                  {formData.screenshotName || `${formData.bugId || 'Defect'}_screenshot.png`}
                </span>
              </div>
              <button
                onClick={() => setShowScreenshotPreview(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Image View */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60">
              <img 
                src={formData.screenshotPng} 
                alt="Full resolution defect screenshot" 
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

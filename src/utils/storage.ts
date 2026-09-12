import { DefectItem, ProjectMeta } from '../types.ts';
import { initialDefects, initialProjectMeta } from '../data/initialData.ts';
import { 
  idbSaveDefects, 
  idbGetDefects, 
  idbClearDefects, 
  idbSaveProject, 
  idbGetProject 
} from './idbStorage.ts';

const STORAGE_KEYS = {
  DEFECTS: 'illusion_defect_sheet_records_v1',
  PROJECT: 'illusion_defect_sheet_meta_v1',
  LAST_SYNC: 'illusion_defect_sheet_last_sync_v1'
};

/**
 * Load defects from local storage with fallback to initial QA seed data
 */
export function loadStoredDefects(): DefectItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEFECTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read defects from localStorage:', err);
  }
  return [];
}

/**
 * Asynchronously loads defects from high-capacity IndexedDB, with localStorage fallback
 */
export async function loadStoredDefectsAsync(): Promise<DefectItem[]> {
  try {
    const idbData = await idbGetDefects();
    if (idbData && Array.isArray(idbData) && idbData.length > 0) {
      return idbData;
    }
  } catch (err) {
    console.warn('IndexedDB read fallback notice:', err);
  }
  return loadStoredDefects();
}

/**
 * Clear all defects from local storage and IndexedDB
 */
export function clearStoredDefects(): void {
  if (typeof window === 'undefined') return;
  idbClearDefects().catch(console.warn);
  try {
    localStorage.setItem(STORAGE_KEYS.DEFECTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (err) {
    console.warn('Could not clear defects in localStorage:', err);
  }
}

/**
 * Save defects safely to both IndexedDB (unlimited quota) and localStorage (resilient fallback).
 * If localStorage quota is exceeded (e.g., due to screenshots), it stores a lightweight sanitized copy
 * in localStorage while preserving full data including screenshots in IndexedDB.
 */
export function saveStoredDefects(defects: DefectItem[]): void {
  if (typeof window === 'undefined') return;

  // 1. Always persist complete defects with screenshots into high-capacity IndexedDB
  idbSaveDefects(defects).catch(err => {
    console.warn('Background IndexedDB save notice:', err);
  });

  // 2. Attempt localStorage save
  try {
    localStorage.setItem(STORAGE_KEYS.DEFECTS, JSON.stringify(defects));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (err: any) {
    // Check if error is quota exceeded
    const isQuotaError = 
      err?.name === 'QuotaExceededError' || 
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      (err?.message && err.message.toLowerCase().includes('quota'));

    if (isQuotaError) {
      try {
        // Strip heavy base64 screenshots for the localStorage copy to stay well under 5MB quota
        const sanitizedDefects = defects.map(d => {
          if (d.screenshotPng && d.screenshotPng.length > 1000) {
            const { screenshotPng, ...rest } = d;
            return rest as DefectItem;
          }
          return d;
        });
        localStorage.setItem(STORAGE_KEYS.DEFECTS, JSON.stringify(sanitizedDefects));
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      } catch (innerErr) {
        console.warn('LocalStorage quota limit reached; IndexedDB is active as primary cache.');
      }
    } else {
      console.warn('LocalStorage save notice:', err);
    }
  }
}

/**
 * Load project metadata from local storage with fallback
 */
export function loadStoredProject(): ProjectMeta {
  if (typeof window === 'undefined') return initialProjectMeta;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.projectName === 'string') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read project meta from localStorage:', err);
  }
  return initialProjectMeta;
}

/**
 * Asynchronously load project meta with IndexedDB support
 */
export async function loadStoredProjectAsync(): Promise<ProjectMeta> {
  try {
    const idbProject = await idbGetProject();
    if (idbProject && idbProject.projectName) {
      return idbProject;
    }
  } catch (err) {
    console.warn('IndexedDB project read notice:', err);
  }
  return loadStoredProject();
}

/**
 * Save project metadata to local storage and IndexedDB
 */
export function saveStoredProject(project: ProjectMeta): void {
  if (typeof window === 'undefined') return;
  idbSaveProject(project).catch(console.warn);
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(project));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (err) {
    console.warn('Could not save project meta to localStorage:', err);
  }
}

/**
 * Reset local storage to initial QA template
 */
export function resetStoredData(): { defects: DefectItem[]; project: ProjectMeta } {
  saveStoredDefects(initialDefects);
  saveStoredProject(initialProjectMeta);
  return { defects: initialDefects, project: initialProjectMeta };
}


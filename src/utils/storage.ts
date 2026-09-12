import { DefectItem, ProjectMeta } from '../types.ts';
import { initialDefects, initialProjectMeta } from '../data/initialData.ts';

const STORAGE_KEYS = {
  DEFECTS: 'illusion_defect_sheet_records_v1',
  PROJECT: 'illusion_defect_sheet_meta_v1',
  LAST_SYNC: 'illusion_defect_sheet_last_sync_v1'
};

/**
 * Load defects from local storage with fallback to initial QA seed data
 */
export function loadStoredDefects(): DefectItem[] {
  if (typeof window === 'undefined') return initialDefects;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEFECTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read defects from localStorage:', err);
  }
  return initialDefects;
}

/**
 * Save defects directly to local storage for durable persistence on Vercel & static hosting
 */
export function saveStoredDefects(defects: DefectItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DEFECTS, JSON.stringify(defects));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (err) {
    console.error('Could not save defects to localStorage:', err);
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
 * Save project metadata to local storage
 */
export function saveStoredProject(project: ProjectMeta): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(project));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (err) {
    console.error('Could not save project meta to localStorage:', err);
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

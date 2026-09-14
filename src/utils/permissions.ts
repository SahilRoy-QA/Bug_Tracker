import { DefectItem } from '../types.ts';
import { getCachedUser } from '../firebase/authService.ts';

/**
 * Checks if a given username has full Administrator privileges.
 * Sahil Roy and Administrator (@admin) are primary administrators.
 */
export function isUserAdmin(username?: string | null): boolean {
  if (!username) return false;
  const clean = username.trim().toLowerCase();
  if (clean === 'sahil_roy' || clean === 'roy' || clean === 'admin' || clean === 'administrator' || clean === 'test_user') {
    return true;
  }
  const user = getCachedUser(clean);
  if (user && (user.role === 'Administrator' || user.role === 'Admin')) {
    return true;
  }
  return false;
}

/**
 * Checks if the current user can modify / edit a specific defect.
 * - Sahil Roy (Admin) can modify EVERY defect.
 * - Users granted 'canEditAllDefects' permission by Admin can modify any defect.
 * - Otherwise, QA engineers can ONLY modify defects that they submitted/logged themselves.
 */
export function canUserEditDefect(defect: DefectItem | null, username?: string | null): boolean {
  if (!username) return false;
  if (!defect) return true; // New defect being created

  const cleanUser = username.trim().toLowerCase();

  // Sahil Roy has full administration access
  if (isUserAdmin(cleanUser)) {
    return true;
  }

  // Check granted permissions from Admin
  const user = getCachedUser(cleanUser);
  if (user?.permissions?.canEditAllDefects) {
    return true;
  }

  // Explicit username matching on metadata fields
  if (defect.reportedByUsername && defect.reportedByUsername.trim().toLowerCase() === cleanUser) {
    return true;
  }
  if (defect.createdBy && defect.createdBy.trim().toLowerCase() === cleanUser) {
    return true;
  }

  // Fallback matching against reportedBy string
  const reportedBy = (defect.reportedBy || '').toLowerCase();
  if (reportedBy.includes(cleanUser)) {
    return true;
  }

  // Known name mappings
  if (cleanUser === 'jit_mondal') {
    if (reportedBy.includes('jeet') || reportedBy.includes('jit') || reportedBy.includes('mondal')) {
      return true;
    }
  }

  if (cleanUser === 'sahil_roy' || cleanUser === 'roy' || cleanUser === 'admin') {
    if (reportedBy.includes('sahil') || reportedBy.includes('roy') || reportedBy.includes('admin') || reportedBy.includes('administrator')) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if the current user can delete defects.
 * - Sahil Roy (Admin) can delete defects.
 * - Users granted 'canDeleteDefects' permission by Admin can delete defects.
 */
export function canUserDeleteDefect(username?: string | null): boolean {
  if (!username) return false;
  const clean = username.trim().toLowerCase();
  if (isUserAdmin(clean)) return true;
  const user = getCachedUser(clean);
  return !!user?.permissions?.canDeleteDefects;
}

/**
 * Checks if the current user can clean/reset the database.
 * - Sahil Roy (Admin) can clean/reset the database.
 * - Users granted 'canCleanDatabase' permission by Admin can clean/reset.
 */
export function canUserCleanDatabase(username?: string | null): boolean {
  if (!username) return false;
  const clean = username.trim().toLowerCase();
  if (isUserAdmin(clean)) return true;
  const user = getCachedUser(clean);
  return !!user?.permissions?.canCleanDatabase;
}


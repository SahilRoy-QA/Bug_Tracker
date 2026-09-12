import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs 
} from 'firebase/firestore';
import { db } from './config.ts';
import { QAUser } from '../types.ts';

const USERS_COLLECTION = 'users';
const LOCAL_STORAGE_USERS_KEY = 'qa_users_registry_v1';

// Built-in initial accounts
export const DEFAULT_USERS: Record<string, QAUser> = {
  admin: {
    username: 'admin',
    name: 'Administrator',
    role: 'Administrator',
    email: 'admin@illusio.tech',
    password: 'aaaaa',
    assignedProjects: ['Enterprise Core HR Portal', 'Sprint 24 - Regression Suite'],
    permissions: {
      canDeleteDefects: true,
      canEditAllDefects: true,
      canCleanDatabase: true
    },
    status: 'active',
    createdAt: new Date().toISOString()
  },
  sahil_roy: {
    username: 'sahil_roy',
    name: 'Sahil Roy',
    role: 'Administrator',
    email: 'roysahil579@gmail.com',
    password: 'Illusio@006574',
    assignedProjects: ['Enterprise Core HR Portal', 'Sprint 24 - Regression Suite'],
    permissions: {
      canDeleteDefects: true,
      canEditAllDefects: true,
      canCleanDatabase: true
    },
    status: 'active',
    createdAt: new Date().toISOString()
  },
  jit_mondal: {
    username: 'jit_mondal',
    name: 'Jeet Mondal',
    role: 'QA Engineer',
    email: 'jeet.mondal@illusio.tech',
    password: 'Illusio@006574',
    assignedProjects: ['Enterprise Core HR Portal'],
    permissions: {
      canDeleteDefects: false,
      canEditAllDefects: false,
      canCleanDatabase: false
    },
    status: 'active',
    createdAt: new Date().toISOString()
  }
};

/**
 * Retrieve local cached users and purge unwanted entries
 */
function getLocalUsers(): Record<string, QAUser> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (!raw) return { ...DEFAULT_USERS };
    const parsed = JSON.parse(raw) as Record<string, QAUser>;
    const merged: Record<string, QAUser> = { ...DEFAULT_USERS, ...parsed };
    
    // Proactively purge Alex Morgan and Priya Sharma
    delete merged['alex_morgan'];
    delete merged['alex'];
    delete merged['priya_sharma'];
    delete merged['priya'];
    Object.keys(merged).forEach(key => {
      const u = merged[key];
      const name = (u?.name || '').toLowerCase();
      const uname = (u?.username || key || '').toLowerCase();
      if (
        name.includes('alex morgan') || 
        uname === 'alex_morgan' || 
        uname === 'alex' ||
        name.includes('priya sharma') ||
        name.includes('priya') ||
        uname === 'priya_sharma' ||
        uname === 'priya'
      ) {
        delete merged[key];
      }
    });

    return merged;
  } catch {
    return { ...DEFAULT_USERS };
  }
}

/**
 * Synchronous cached lookup for display
 */
export function getCachedUser(username: string): QAUser | null {
  if (!username) return null;
  const clean = username.trim().toLowerCase();
  const local = getLocalUsers();
  return local[clean] || DEFAULT_USERS[clean] || null;
}

/**
 * Persist users to local storage cache
 */
function saveLocalUsers(users: Record<string, QAUser>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Failed to save users to localStorage', err);
  }
}

/**
 * Seed initial users in Firestore if missing and purge removed users
 */
export async function seedUsersIfEmpty(): Promise<void> {
  try {
    // Proactively purge Alex Morgan and Priya Sharma docs if present
    try {
      await deleteDoc(doc(db, USERS_COLLECTION, 'alex_morgan'));
      await deleteDoc(doc(db, USERS_COLLECTION, 'alex'));
      await deleteDoc(doc(db, USERS_COLLECTION, 'priya_sharma'));
      await deleteDoc(doc(db, USERS_COLLECTION, 'priya'));
    } catch {
      // Ignore if not exists
    }

    for (const [uname, user] of Object.entries(DEFAULT_USERS)) {
      const userRef = doc(db, USERS_COLLECTION, uname);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, user);
      } else if (uname === 'admin') {
        // Ensure admin user has updated permissions and password
        await setDoc(userRef, user, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Firestore user check/seed encountered error (using local cache)', err);
  }
}

/**
 * Fetch a user profile by username
 */
export async function getQAUser(username: string): Promise<QAUser | null> {
  const cleanUsername = username.trim().toLowerCase();
  const localUsers = getLocalUsers();

  try {
    const userRef = doc(db, USERS_COLLECTION, cleanUsername);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as QAUser;
      localUsers[cleanUsername] = data;
      saveLocalUsers(localUsers);
      return data;
    }
  } catch (err) {
    console.warn('Failed to read user from Firestore, falling back to cache', err);
  }

  return localUsers[cleanUsername] || null;
}

/**
 * Validate credentials for sign in
 */
export async function validateCredentials(
  username: string, 
  passwordInput: string
): Promise<{ success: boolean; user?: QAUser; error?: string }> {
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername) {
    return { success: false, error: 'Please enter your QA username.' };
  }
  if (!passwordInput) {
    return { success: false, error: 'Please enter your password.' };
  }

  let user = await getQAUser(cleanUsername);

  // Fallback to local default user
  if (!user && DEFAULT_USERS[cleanUsername]) {
    user = DEFAULT_USERS[cleanUsername];
  }

  if (!user) {
    return { 
      success: false, 
      error: `Account '@${cleanUsername}' not found. Please verify username or sign up for a new QA account.` 
    };
  }

  if (user.password !== passwordInput) {
    return { 
      success: false, 
      error: 'Invalid password. Please check your credentials and try again.' 
    };
  }

  return { success: true, user };
}

/**
 * Register a brand new QA user (Admin only)
 */
export async function registerQAUser(params: {
  username: string;
  name: string;
  role: string;
  email?: string;
  password: string;
  assignedProjects?: string[];
  permissions?: {
    canDeleteDefects?: boolean;
    canEditAllDefects?: boolean;
    canCleanDatabase?: boolean;
  };
}): Promise<{ success: boolean; user?: QAUser; error?: string }> {
  const cleanUsername = params.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const cleanName = params.name.trim();
  const cleanRole = params.role.trim() || 'QA Engineer';
  const cleanEmail = params.email?.trim() || `${cleanUsername}@illusio.tech`;
  const cleanPassword = params.password;

  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'Username must be at least 3 alphanumeric characters (underscores allowed).' };
  }

  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Please provide the full display name.' };
  }

  if (!cleanPassword || cleanPassword.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters.' };
  }

  // Check if username already exists locally
  const localUsers = getLocalUsers();
  if (localUsers[cleanUsername]) {
    return { success: false, error: `Username '@${cleanUsername}' is already taken. Please choose another.` };
  }

  // Check Firestore
  try {
    const userRef = doc(db, USERS_COLLECTION, cleanUsername);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return { success: false, error: `Username '@${cleanUsername}' is already registered in Firestore. Please choose another.` };
    }
  } catch (err) {
    console.warn('Firestore user uniqueness check warning:', err);
  }

  const newUser: QAUser = {
    username: cleanUsername,
    name: cleanName,
    role: cleanRole,
    email: cleanEmail,
    password: cleanPassword,
    assignedProjects: params.assignedProjects || ['Enterprise Core HR Portal'],
    permissions: params.permissions || {
      canDeleteDefects: false,
      canEditAllDefects: false,
      canCleanDatabase: false
    },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Persist to local cache immediately
  localUsers[cleanUsername] = newUser;
  saveLocalUsers(localUsers);

  // Persist to Firestore
  try {
    const userRef = doc(db, USERS_COLLECTION, cleanUsername);
    await setDoc(userRef, newUser);
  } catch (err) {
    console.warn('Firestore user save encountered error, saved to local cache:', err);
  }

  return { success: true, user: newUser };
}

/**
 * Fetch all registered QA team members & engineers
 */
export async function getAllQAUsers(): Promise<QAUser[]> {
  const localUsers = getLocalUsers();

  try {
    const usersCol = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersCol);
    if (!snapshot.empty) {
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as QAUser;
        const uId = (data.username || docSnap.id).toLowerCase();
        const uName = (data.name || '').toLowerCase();
        // Purge Alex Morgan, Priya Sharma, or inactive users if found
        if (
          uId === 'alex_morgan' || 
          uId === 'alex' || 
          uName.includes('alex morgan') ||
          uId === 'priya_sharma' || 
          uId === 'priya' || 
          uName.includes('priya sharma') ||
          uName.includes('priya')
        ) {
          deleteDoc(docSnap.ref).catch(() => {});
          delete localUsers[uId];
          return;
        }
        if (data && data.username && data.status !== 'inactive') {
          localUsers[data.username.toLowerCase()] = {
            ...localUsers[data.username.toLowerCase()],
            ...data
          };
        }
      });
      saveLocalUsers(localUsers);
    }
  } catch (err) {
    console.warn('Could not fetch all users from Firestore, using local cache:', err);
  }

  return Object.values(localUsers).filter(
    u => u.status !== 'inactive' &&
         u.username.toLowerCase() !== 'alex_morgan' &&
         u.username.toLowerCase() !== 'alex' &&
         !u.name.toLowerCase().includes('alex morgan') &&
         u.username.toLowerCase() !== 'priya_sharma' &&
         u.username.toLowerCase() !== 'priya' &&
         !u.name.toLowerCase().includes('priya sharma') &&
         !u.name.toLowerCase().includes('priya')
  );
}

/**
 * Update an existing QA user's profile, role, permissions, or projects
 */
export async function updateQAUser(
  username: string, 
  updates: Partial<QAUser>
): Promise<{ success: boolean; error?: string; user?: QAUser }> {
  const cleanUsername = username.trim().toLowerCase();
  const localUsers = getLocalUsers();
  const existing = localUsers[cleanUsername] || (await getQAUser(cleanUsername));

  if (!existing) {
    return { success: false, error: `User '@${cleanUsername}' not found.` };
  }

  const updated: QAUser = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  localUsers[cleanUsername] = updated;
  saveLocalUsers(localUsers);

  try {
    const userRef = doc(db, USERS_COLLECTION, cleanUsername);
    await setDoc(userRef, updated, { merge: true });
  } catch (err) {
    console.warn('Failed to update user in Firestore, saved locally:', err);
  }

  return { success: true, user: updated };
}

/**
 * Remove an engineer account (Admin action)
 */
export async function deleteQAUser(username: string): Promise<{ success: boolean; error?: string }> {
  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername === 'sahil_roy') {
    return { success: false, error: 'Cannot delete primary Administrator account (Sahil Roy).' };
  }

  const localUsers = getLocalUsers();
  delete localUsers[cleanUsername];
  saveLocalUsers(localUsers);

  try {
    const userRef = doc(db, USERS_COLLECTION, cleanUsername);
    await deleteDoc(userRef);
  } catch (err) {
    console.warn('Failed to delete user in Firestore:', err);
  }

  return { success: true };
}

/**
 * Change / update a user's password
 */
export async function changeUserPassword(params: {
  username: string;
  currentPassword?: string;
  newPassword: string;
  verifyCurrent?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const cleanUsername = params.username.trim().toLowerCase();
  const { currentPassword, newPassword, verifyCurrent = true } = params;

  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters long.' };
  }

  const user = await getQAUser(cleanUsername);
  if (!user) {
    return { success: false, error: `Account '@${cleanUsername}' could not be found.` };
  }

  if (verifyCurrent) {
    if (!currentPassword) {
      return { success: false, error: 'Please enter your current password.' };
    }
    if (user.password !== currentPassword) {
      return { success: false, error: 'Current password does not match.' };
    }
  }

  if (user.password === newPassword) {
    return { success: false, error: 'New password cannot be the same as your current password.' };
  }

  const updatedUser: QAUser = {
    ...user,
    password: newPassword,
    updatedAt: new Date().toISOString()
  };

  // Update local cache
  const localUsers = getLocalUsers();
  localUsers[cleanUsername] = updatedUser;
  saveLocalUsers(localUsers);

  // Update Firestore
  try {
    const userRef = doc(db, USERS_COLLECTION, cleanUsername);
    await setDoc(userRef, updatedUser, { merge: true });
  } catch (err) {
    console.warn('Failed to update password in Firestore, saved locally:', err);
  }

  return { success: true };
}


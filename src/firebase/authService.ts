import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs 
} from 'firebase/firestore';
import { db } from './config.ts';
import { QAUser } from '../types.ts';

const USERS_COLLECTION = 'users';
const LOCAL_STORAGE_USERS_KEY = 'qa_users_registry_v1';

// Built-in initial accounts
export const DEFAULT_USERS: Record<string, QAUser> = {
  sahil_roy: {
    username: 'sahil_roy',
    name: 'Sahil Roy',
    role: 'Lead QA Engineer',
    password: 'Illusio@006574',
    createdAt: new Date().toISOString()
  },
  jit_mondal: {
    username: 'jit_mondal',
    name: 'Jeet Mondal',
    role: 'QA Engineer',
    password: 'Illusio@006574',
    createdAt: new Date().toISOString()
  }
};

/**
 * Retrieve local cached users
 */
function getLocalUsers(): Record<string, QAUser> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (!raw) return { ...DEFAULT_USERS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_USERS, ...parsed };
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
 * Seed initial users in Firestore if missing
 */
export async function seedUsersIfEmpty(): Promise<void> {
  try {
    for (const [uname, user] of Object.entries(DEFAULT_USERS)) {
      const userRef = doc(db, USERS_COLLECTION, uname);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, user);
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
 * Register a brand new QA user
 */
export async function registerQAUser(params: {
  username: string;
  name: string;
  role: string;
  password: string;
}): Promise<{ success: boolean; user?: QAUser; error?: string }> {
  const cleanUsername = params.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const cleanName = params.name.trim();
  const cleanRole = params.role.trim() || 'QA Engineer';
  const cleanPassword = params.password;

  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'Username must be at least 3 alphanumeric characters (underscores allowed).' };
  }

  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Please provide your full display name.' };
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
      return { success: false, error: `Username '@${cleanUsername}' is already taken in Firestore. Please choose another.` };
    }
  } catch (err) {
    console.warn('Firestore user uniqueness check warning:', err);
  }

  const newUser: QAUser = {
    username: cleanUsername,
    name: cleanName,
    role: cleanRole,
    password: cleanPassword,
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

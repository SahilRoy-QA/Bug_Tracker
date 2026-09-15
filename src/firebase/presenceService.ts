import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  updateDoc
} from 'firebase/firestore';
import { db } from './config.ts';
import { UserSession, ActivityLogItem, ActivityActionType } from '../types.ts';

const SESSIONS_COLLECTION = 'user_sessions';
const ACTIVITY_LOGS_COLLECTION = 'activity_logs';
const LOCAL_SESSIONS_KEY = 'illusion_qa_cached_sessions_v2';
const LOCAL_ACTIVITY_KEY = 'illusion_qa_cached_activity_logs_v2';
const SESSION_STORAGE_ID_KEY = 'illusion_qa_session_id_v2';

// Threshold: session is strictly online if heartbeat was within last 90 seconds (90,000 ms)
// Heartbeats occur every 15s; 90s generously accommodates mobile sleep and background tab throttling
const ONLINE_THRESHOLD_MS = 90 * 1000;

/**
 * Utility: Remove all undefined or null keys so Firestore never throws
 * "Unsupported field value: undefined"
 */
function sanitizeFirestorePayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitizeFirestorePayload(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Extract browser and operating system details from user agent
 */
export function parseClientEnvironment(): { browser: string; os: string } {
  if (typeof window === 'undefined' || !navigator) {
    return { browser: 'Browser', os: 'Desktop' };
  }

  const ua = navigator.userAgent;
  let browser = 'Web Browser';
  let os = 'Desktop';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';

  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { browser, os };
}

/**
 * Get or create unique session ID for current browser tab/system
 */
export function getOrCreateSessionId(): string {
  try {
    let sId = sessionStorage.getItem(SESSION_STORAGE_ID_KEY);
    if (!sId) {
      sId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem(SESSION_STORAGE_ID_KEY, sId);
    }
    return sId;
  } catch {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Local cache helpers
 */
function getCachedSessions(): UserSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedSessions(sessions: UserSession[]): void {
  try {
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions.slice(0, 50)));
  } catch {}
}

function getCachedLogs(): ActivityLogItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedLogs(logs: ActivityLogItem[]): void {
  try {
    localStorage.setItem(LOCAL_ACTIVITY_KEY, JSON.stringify(logs.slice(0, 150)));
  } catch {}
}

// Active heartbeat interval reference
let heartbeatInterval: any = null;

/**
 * Begin real-time presence for logged-in user
 */
export async function startUserPresence(user: {
  username: string;
  name: string;
  role?: string;
}): Promise<string> {
  const sessionId = getOrCreateSessionId();
  const env = parseClientEnvironment();
  const cleanUsername = user.username.trim().toLowerCase();
  const cleanName = user.name || cleanUsername;
  const cleanRole = user.role || 'QA Engineer';

  const sessionData: UserSession = {
    sessionId,
    username: cleanUsername,
    name: cleanName,
    role: cleanRole,
    status: 'online',
    loginTime: new Date().toISOString(),
    lastActive: Date.now(),
    userAgent: navigator.userAgent || 'Web Browser',
    browser: env.browser,
    os: env.os,
    currentPath: window.location.pathname || '/'
  };

  // 1. Immediately persist sanitized payload to Firestore
  try {
    const payload = sanitizeFirestorePayload(sessionData);
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    await setDoc(sessionRef, payload, { merge: true });
  } catch (err) {
    console.warn('Could not write session to Firestore, using local fallback:', err);
  }

  // 2. Update local fallback cache
  const cached = getCachedSessions().filter((s) => s.sessionId !== sessionId);
  cached.unshift(sessionData);
  saveCachedSessions(cached);

  // 3. Record Login Audit Event into activity_logs
  recordActivityLog({
    type: 'LOGIN',
    username: cleanUsername,
    name: cleanName,
    details: `User @${cleanUsername} (${cleanName}) signed into QA session from ${env.browser} on ${env.os}`,
    severity: 'success',
    metadata: {
      sessionId,
      browser: env.browser,
      os: env.os,
      role: cleanRole,
      loginTime: sessionData.loginTime
    }
  }).catch((err) => {
    console.warn('Could not record sign-in activity log:', err);
  });

  // 4. Start heartbeat ping every 15 seconds
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(async () => {
    try {
      const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
      await setDoc(
        sessionRef,
        {
          lastActive: Date.now(),
          status: 'online'
        },
        { merge: true }
      );
    } catch {
      // Ignore background heartbeat network glitch
    }
  }, 15000);

  // 5. Hook window unload to set status offline
  const handleUnload = () => {
    try {
      const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
      setDoc(
        sessionRef,
        {
          status: 'offline',
          lastActive: Date.now()
        },
        { merge: true }
      ).catch(() => {});
    } catch {}
  };

  window.addEventListener('beforeunload', handleUnload);

  return sessionId;
}

/**
 * End real-time presence when user logs out
 */
export async function endUserPresence(user?: { username: string; name: string }): Promise<void> {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  const sessionId = getOrCreateSessionId();
  const cleanUsername = user?.username?.trim().toLowerCase();
  const cleanName = user?.name || cleanUsername;

  if (cleanUsername) {
    recordActivityLog({
      type: 'LOGOUT',
      username: cleanUsername,
      name: cleanName,
      details: `User @${cleanUsername} signed out of QA session`,
      severity: 'info'
    }).catch(() => {});
  }

  // 1. Immediately mark this specific tab's session as offline in Firestore
  try {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    await setDoc(
      sessionRef,
      {
        status: 'offline',
        lastActive: Date.now()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to mark session offline in Firestore:', err);
  }

  // 2. Also mark any other sessions in Firestore belonging to this username as offline
  if (cleanUsername) {
    try {
      const q = query(
        collection(db, SESSIONS_COLLECTION),
        where('username', '==', cleanUsername)
      );
      const snap = await getDocs(q);
      const updates = snap.docs.map((d) => {
        const data = d.data();
        if (data && data.status === 'online') {
          return updateDoc(d.ref, {
            status: 'offline',
            lastActive: Date.now()
          });
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
    } catch (err) {
      console.warn('Failed to mark all user sessions offline:', err);
    }
  }

  // 3. Update local cache: mark all sessions for this sessionId or username as offline
  const cached = getCachedSessions().map((s) => {
    if (s.sessionId === sessionId || (cleanUsername && s.username.toLowerCase() === cleanUsername)) {
      return { ...s, status: 'offline' as const, lastActive: Date.now() };
    }
    return s;
  });
  saveCachedSessions(cached);
}

/**
 * Filter and deduplicate unique online users from sessions.
 * Accounts for cross-system clock skews and background tab throttling.
 * Strictly checks that:
 * 1. session.status is explicitly 'online'
 * 2. session has a valid heartbeat recorded within ONLINE_THRESHOLD_MS (90s)
 */
export function getUniqueOnlineUsers(sessions: UserSession[]): UserSession[] {
  const now = Date.now();
  const userMap = new Map<string, UserSession>();

  for (const s of sessions) {
    if (!s || !s.username) continue;

    // Must be explicitly marked online
    if (s.status !== 'online') continue;

    const lastActiveMs = typeof s.lastActive === 'number'
      ? s.lastActive
      : (typeof s.lastActive === 'string' ? (Date.parse(s.lastActive) || 0) : 0);

    if (!lastActiveMs || lastActiveMs <= 0) continue;

    // Difference between local machine time and recorded timestamp
    const diff = Math.abs(now - lastActiveMs);

    // If heartbeat was not within last 90 seconds, the user is NOT online
    if (diff > ONLINE_THRESHOLD_MS) continue;

    const uname = s.username.toLowerCase();
    const existing = userMap.get(uname);
    if (!existing || lastActiveMs > (existing.lastActive || 0)) {
      userMap.set(uname, {
        ...s,
        username: uname,
        name: s.name || uname,
        lastActive: lastActiveMs,
        status: 'online'
      });
    }
  }

  return Array.from(userMap.values());
}

/**
 * Real-time subscription to active sessions across all connected systems
 */
export function subscribeToOnlineSessions(
  callback: (onlineUsers: UserSession[], allSessions: UserSession[]) => void
): () => void {
  let currentRawSessions: UserSession[] = getCachedSessions();

  // Trigger initial callback immediately with cached data
  const initialOnline = getUniqueOnlineUsers(currentRawSessions);
  callback(initialOnline, currentRawSessions);

  // Background routine to clean up stale sessions in Firestore (runs on startup & every 60s)
  const purgeStaleSessions = async () => {
    try {
      const snap = await getDocs(collection(db, SESSIONS_COLLECTION));
      const now = Date.now();
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data && data.status === 'online') {
          const lastActive = typeof data.lastActive === 'number'
            ? data.lastActive
            : (typeof data.lastActive === 'string' ? (Date.parse(data.lastActive) || 0) : 0);
          if (now - lastActive > ONLINE_THRESHOLD_MS) {
            updateDoc(d.ref, { status: 'offline' }).catch(() => {});
          }
        }
      });
    } catch {
      // Ignore background cleanup warning
    }
  };

  // Run initial cleanup once after 1 second
  setTimeout(purgeStaleSessions, 1000);

  // Firestore real-time listener
  let unsubscribeFirestore = () => {};
  try {
    const sessionsCol = collection(db, SESSIONS_COLLECTION);
    unsubscribeFirestore = onSnapshot(
      sessionsCol,
      (snapshot) => {
        const list: UserSession[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data() as UserSession;
          if (data && data.username && data.sessionId) {
            const parsedLastActive = typeof data.lastActive === 'number'
              ? data.lastActive
              : (typeof data.lastActive === 'string' ? (Date.parse(data.lastActive) || Date.now()) : Date.now());

            list.push({
              ...data,
              username: data.username.toLowerCase(),
              name: data.name || data.username,
              lastActive: parsedLastActive,
              status: data.status || 'offline'
            });
          }
        });
        currentRawSessions = list;
        saveCachedSessions(list);
        const onlineList = getUniqueOnlineUsers(list);
        callback(onlineList, list);
      },
      (err) => {
        console.warn('Firestore sessions subscription warning, using local cache:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to initiate sessions listener:', err);
  }

  // Local ticker to re-evaluate active heartbeats
  // Only invokes callback if the list of active online usernames actually changes
  let lastDispatchedOnlineSignatures = '';
  const ticker = setInterval(() => {
    const updatedOnline = getUniqueOnlineUsers(currentRawSessions);
    const signature = updatedOnline
      .map((u) => `${u.username}:${u.status}`)
      .sort()
      .join('|');

    if (signature !== lastDispatchedOnlineSignatures) {
      lastDispatchedOnlineSignatures = signature;
      callback(updatedOnline, currentRawSessions);
    }
  }, 4000);

  // Periodic cleanup of stale sessions in Firestore every 60 seconds
  const staleCleanupInterval = setInterval(purgeStaleSessions, 60000);

  return () => {
    unsubscribeFirestore();
    clearInterval(ticker);
    clearInterval(staleCleanupInterval);
  };
}

/**
 * Record an activity or audit log item
 * Supports both object params and (username, type, details, metadata) positional args
 */
export async function recordActivityLog(
  paramOrUsername:
    | {
        type: ActivityActionType;
        username: string;
        name?: string;
        details: string;
        severity?: 'info' | 'warning' | 'critical' | 'success';
        defectId?: string;
        metadata?: Record<string, any>;
      }
    | string,
  typeArg?: ActivityActionType | string,
  detailsArg?: string,
  metadataArg?: Record<string, any>
): Promise<ActivityLogItem> {
  let params: {
    type: ActivityActionType;
    username: string;
    name: string;
    details: string;
    severity?: 'info' | 'warning' | 'critical' | 'success';
    defectId?: string;
    metadata?: Record<string, any>;
  };

  if (typeof paramOrUsername === 'string') {
    const rawType = (typeArg || 'SETTINGS_UPDATE').toUpperCase();
    let safeType: ActivityActionType = 'SETTINGS_UPDATE';
    if (rawType.includes('LOGIN')) safeType = 'LOGIN';
    else if (rawType.includes('LOGOUT')) safeType = 'LOGOUT';
    else if (rawType.includes('CREATE')) safeType = 'DEFECT_CREATE';
    else if (rawType.includes('UPDATE')) safeType = 'DEFECT_UPDATE';
    else if (rawType.includes('DELETE')) safeType = 'DEFECT_DELETE';
    else if (rawType.includes('STATUS')) safeType = 'DEFECT_STATUS_CHANGE';
    else if (rawType.includes('PASSWORD')) safeType = 'PASSWORD_CHANGE';
    else if (rawType.includes('CLEAN')) safeType = 'DATABASE_CLEAN';

    params = {
      username: paramOrUsername,
      name: paramOrUsername,
      type: safeType,
      details: detailsArg || `${safeType} performed by @${paramOrUsername}`,
      severity: safeType === 'DEFECT_DELETE' ? 'critical' : safeType === 'LOGIN' ? 'success' : 'info',
      metadata: metadataArg
    };
  } else {
    params = {
      ...paramOrUsername,
      name: paramOrUsername.name || paramOrUsername.username
    };
  }

  const cleanUsername = params.username.trim().toLowerCase();
  const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();

  const item: ActivityLogItem = {
    id,
    type: params.type,
    username: cleanUsername,
    name: params.name || cleanUsername,
    details: params.details,
    severity: params.severity || 'info',
    timestamp: now.toISOString(),
    createdAt: Date.now()
  };

  if (params.defectId) {
    item.defectId = params.defectId;
  }
  if (params.metadata && Object.keys(params.metadata).length > 0) {
    item.metadata = params.metadata;
  }

  // 1. Save to local cache immediately
  const cached = getCachedLogs();
  const deduped = [item, ...cached.filter((c) => c.id !== id)].slice(0, 200);
  saveCachedLogs(deduped);

  // 2. Persist sanitized payload to Firestore so no undefined fields cause error
  try {
    const payload = sanitizeFirestorePayload(item);
    const logRef = doc(db, ACTIVITY_LOGS_COLLECTION, id);
    await setDoc(logRef, payload);
  } catch (err) {
    console.warn('Could not write activity log to Firestore:', err);
  }

  return item;
}

/**
 * Convenient wrapper to start heartbeat interval and return cleanup unmount hook
 */
export function startPresenceHeartbeat(
  username: string,
  role?: string,
  name?: string
): () => void {
  startUserPresence({
    username,
    name: name || username,
    role: role || 'QA Engineer'
  });

  return () => {
    endUserPresence({ username, name: name || username });
  };
}

/**
 * Mark user session inactive immediately upon logout
 */
export async function markSessionInactive(username: string): Promise<void> {
  return endUserPresence({ username, name: username });
}

/**
 * Real-time subscription to activity / audit logs across all clients
 */
export function subscribeToActivityLogs(
  callback: (logs: ActivityLogItem[]) => void,
  limitCount = 100
): () => void {
  // Emit local cache immediately
  callback(getCachedLogs());

  let unsubscribeFirestore = () => {};
  try {
    const logsCol = collection(db, ACTIVITY_LOGS_COLLECTION);
    
    unsubscribeFirestore = onSnapshot(
      logsCol,
      (snapshot) => {
        const items: ActivityLogItem[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data() as ActivityLogItem;
          if (data) {
            const rawCreated = data.createdAt;
            const parsedCreated = typeof rawCreated === 'number'
              ? rawCreated
              : (typeof data.timestamp === 'string' ? (Date.parse(data.timestamp) || Date.now()) : Date.now());

            items.push({
              id: d.id,
              type: data.type || 'LOGIN',
              username: (data.username || 'unknown').toLowerCase(),
              name: data.name || data.username || 'QA Engineer',
              details: data.details || '',
              severity: data.severity || 'info',
              timestamp: data.timestamp || new Date(parsedCreated).toISOString(),
              createdAt: parsedCreated,
              defectId: data.defectId,
              metadata: data.metadata
            });
          }
        });
        
        // Sort descending by created timestamp
        items.sort((a, b) => b.createdAt - a.createdAt);
        const trimmed = items.slice(0, limitCount);
        saveCachedLogs(trimmed);
        callback(trimmed);
      },
      (err) => {
        console.warn('Firestore activity log listener error (using local cache):', err);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to activity logs:', err);
  }

  return () => {
    unsubscribeFirestore();
  };
}

/**
 * Seed initial sample activity logs if completely empty
 */
export async function seedInitialActivityLogsIfEmpty(): Promise<void> {
  try {
    const cached = getCachedLogs();
    if (cached.length > 0) return;

    const sampleLogs: Omit<ActivityLogItem, 'id' | 'createdAt'>[] = [
      {
        type: 'LOGIN',
        username: 'sahil_roy',
        name: 'Sahil Roy',
        details: 'Signed into QA Portal with Lead QA Engineer privileges',
        severity: 'success',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      },
      {
        type: 'DEFECT_CREATE',
        username: 'sahil_roy',
        name: 'Sahil Roy',
        details: 'Reported defect BUG-101 (Payment Gateway Timeout)',
        severity: 'critical',
        defectId: 'BUG-101',
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString()
      },
      {
        type: 'SETTINGS_UPDATE',
        username: 'admin',
        name: 'System Admin',
        details: 'Updated test execution suite configuration to Revision 2620',
        severity: 'info',
        timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString()
      }
    ];

    for (const s of sampleLogs) {
      await recordActivityLog(s);
    }
  } catch {}
}

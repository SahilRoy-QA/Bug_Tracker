import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from './config.ts';
import { ChatMessage, ChatChannel } from '../types.ts';

const CHAT_COLLECTION = 'chat_messages';
const LOCAL_STORAGE_CHAT_KEY = 'qa_chat_messages_cache_v1';

export const DEFAULT_CHANNELS: ChatChannel[] = [
  {
    id: 'general',
    name: 'general',
    description: 'Main QA team discussions, test progress, and general announcements',
    type: 'public'
  },
  {
    id: 'bug-triage',
    name: 'bug-triage',
    description: 'Critical defect triage, severity debates, and blocker escalations',
    type: 'public'
  },
  {
    id: 'releases',
    name: 'releases',
    description: 'Release build verification, smoke/sanity sign-offs, and go-live readiness',
    type: 'public'
  },
  {
    id: 'random',
    name: 'team-lounge',
    description: 'Casual chat, kudos, team celebrations, and watercooler talk',
    type: 'public'
  }
];

/**
 * Generate a deterministic channel ID for direct 1-on-1 messaging
 */
export function getDirectMessageChannelId(userA: string, userB: string): string {
  const sorted = [userA.trim().toLowerCase(), userB.trim().toLowerCase()].sort();
  return `dm:${sorted[0]}__${sorted[1]}`;
}

/**
 * Extract recipient username from a direct message channel ID
 */
export function getOtherUserFromDmChannel(channelId: string, currentUsername: string): string | null {
  if (!channelId.startsWith('dm:')) return null;
  const raw = channelId.slice(3);
  const parts = raw.split('__');
  if (parts.length !== 2) return null;
  const current = currentUsername.trim().toLowerCase();
  return parts[0] === current ? parts[1] : parts[0];
}

/**
 * Read cached messages from localStorage as fallback/fast-load
 */
function getLocalCachedMessages(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHAT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save messages to localStorage cache
 */
function saveLocalCachedMessages(channelId: string, messages: ChatMessage[]) {
  try {
    const cache = getLocalCachedMessages();
    cache[channelId] = messages.slice(-100); // keep recent 100
    localStorage.setItem(LOCAL_STORAGE_CHAT_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Real-time subscription to messages for a specific channel or direct message
 */
export function subscribeToChannelMessages(
  channelId: string,
  onData: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Load local cache immediately for zero-delay UX
  const cached = getLocalCachedMessages()[channelId];
  if (cached && cached.length > 0) {
    onData(cached);
  }

  try {
    const chatRef = collection(db, CHAT_COLLECTION);
    const q = query(chatRef, where('channelId', '==', channelId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<ChatMessage, 'id'>;
          list.push({
            ...data,
            id: docSnap.id,
            createdAt: data.createdAt || (data.timestamp ? new Date(data.timestamp).getTime() : Date.now())
          });
        });

        // Sort chronologically ascending
        list.sort((a, b) => a.createdAt - b.createdAt);
        saveLocalCachedMessages(channelId, list);
        onData(list);
      },
      (error) => {
        console.warn(`Firestore chat subscription warning for channel ${channelId}:`, error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to set up Firestore chat subscription:', err);
    return () => {};
  }
}

/**
 * Real-time subscription to all recent messages across all channels
 * Used for total unread counts and sidebar channel lastMessage previews
 */
export function subscribeToAllMessages(
  onData: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const chatRef = collection(db, CHAT_COLLECTION);
    const unsubscribe = onSnapshot(
      chatRef,
      (snapshot) => {
        const list: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<ChatMessage, 'id'>;
          list.push({
            ...data,
            id: docSnap.id,
            createdAt: data.createdAt || (data.timestamp ? new Date(data.timestamp).getTime() : Date.now())
          });
        });
        list.sort((a, b) => a.createdAt - b.createdAt);
        onData(list);
      },
      (error) => {
        console.warn('Firestore all messages subscription notice:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to all messages:', err);
    return () => {};
  }
}

/**
 * Send a new chat message to Firestore with optimistic local dispatch
 */
export async function sendChatMessage(
  message: Omit<ChatMessage, 'id'>
): Promise<string> {
  const payload: Omit<ChatMessage, 'id'> = {
    ...message,
    timestamp: message.timestamp || new Date().toISOString(),
    createdAt: message.createdAt || Date.now(),
    reactions: message.reactions || {}
  };

  try {
    const docRef = await addDoc(collection(db, CHAT_COLLECTION), payload);
    return docRef.id;
  } catch (err) {
    console.error('Failed to send message to Firestore, using local fallback:', err);
    // Fallback: save to local cache
    const fallbackId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const fullMessage: ChatMessage = { ...payload, id: fallbackId };
    const cache = getLocalCachedMessages();
    const list = cache[payload.channelId] || [];
    list.push(fullMessage);
    cache[payload.channelId] = list;
    try {
      localStorage.setItem(LOCAL_STORAGE_CHAT_KEY, JSON.stringify(cache));
    } catch {
      // ignore
    }
    return fallbackId;
  }
}

/**
 * Toggle an emoji reaction on a message
 */
export async function toggleMessageReaction(
  messageId: string,
  emoji: string,
  username: string,
  currentReactions: Record<string, string[]> = {}
): Promise<void> {
  const user = username.trim().toLowerCase();
  const nextReactions: Record<string, string[]> = { ...currentReactions };
  const existingUsers = nextReactions[emoji] || [];

  if (existingUsers.includes(user)) {
    // Remove user reaction
    const filtered = existingUsers.filter((u) => u !== user);
    if (filtered.length > 0) {
      nextReactions[emoji] = filtered;
    } else {
      delete nextReactions[emoji];
    }
  } else {
    // Add user reaction
    nextReactions[emoji] = [...existingUsers, user];
  }

  try {
    const messageDoc = doc(db, CHAT_COLLECTION, messageId);
    await updateDoc(messageDoc, { reactions: nextReactions });
  } catch (err) {
    console.warn('Firestore reaction update notice:', err);
  }
}

/**
 * Delete a message (by sender or admin)
 */
export async function deleteChatMessage(messageId: string): Promise<void> {
  try {
    const messageDoc = doc(db, CHAT_COLLECTION, messageId);
    await deleteDoc(messageDoc);
  } catch (err) {
    console.error('Failed to delete chat message:', err);
    throw err;
  }
}

/**
 * Seed a welcome announcement in #general if chat is brand new
 */
export async function seedWelcomeMessageIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, CHAT_COLLECTION), limit(1)));
    if (snap.empty) {
      await addDoc(collection(db, CHAT_COLLECTION), {
        channelId: 'general',
        senderUsername: 'sahil_roy',
        senderName: 'Sahil Roy',
        senderRole: 'Lead Administrator',
        content: 'Welcome to the QA Team Workspace! 🚀 Use this space to coordinate test executions, discuss defect triage, and link bug IDs directly into your conversations.',
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
        reactions: { '👋': ['sahil_roy'], '🚀': ['admin'] },
        isSystem: true
      });
    }
  } catch (err) {
    console.warn('Welcome message seed notice:', err);
  }
}

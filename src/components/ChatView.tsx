import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Smile,
  Bug,
  Hash,
  Users,
  Search,
  Trash2,
  Reply,
  X,
  ChevronLeft,
  Flame,
  ThumbsUp,
  CheckCircle2,
  Eye,
  Rocket,
  Heart,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Circle,
  Filter,
  Radio
} from 'lucide-react';
import { ChatMessage, ChatChannel, DefectItem, QAUser, UserSession } from '../types.ts';
import {
  DEFAULT_CHANNELS,
  subscribeToChannelMessages,
  sendChatMessage,
  toggleMessageReaction,
  deleteChatMessage,
  getDirectMessageChannelId,
  getOtherUserFromDmChannel,
  seedWelcomeMessageIfEmpty
} from '../firebase/chatService.ts';
import { getAllQAUsers } from '../firebase/authService.ts';
import { subscribeToOnlineSessions } from '../firebase/presenceService.ts';
import { isUserAdmin } from '../utils/permissions.ts';

interface ChatViewProps {
  currentUser: string;
  defects: DefectItem[];
  onlineUsers?: UserSession[];
  initialDmUser?: string;
  onOpenDefectModal?: (defect: DefectItem) => void;
  onNavigateToSheet?: (defectId?: string) => void;
}

const POPULAR_EMOJIS = ['👍', '🔥', '✅', '👀', '🚀', '❤️', '🐛', '🎉'];

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  defects,
  onlineUsers,
  initialDmUser,
  onOpenDefectModal,
  onNavigateToSheet
}) => {
  const [activeChannelId, setActiveChannelId] = useState<string>(() => {
    if (initialDmUser) {
      return getDirectMessageChannelId(currentUser, initialDmUser);
    }
    return 'general';
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [teamUsers, setTeamUsers] = useState<QAUser[]>([]);
  const [internalOnlineUsers, setInternalOnlineUsers] = useState<UserSession[]>([]);
  const [onlyShowOnline, setOnlyShowOnline] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [selectedDefect, setSelectedDefect] = useState<DefectItem | null>(null);
  const [isDefectPickerOpen, setIsDefectPickerOpen] = useState<boolean>(false);
  const [defectSearch, setDefectSearch] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSidebarOpenOnMobile, setIsSidebarOpenOnMobile] = useState<boolean>(true);
  const [activeEmojiPickerMsgId, setActiveEmojiPickerMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load team users
  useEffect(() => {
    let mounted = true;
    getAllQAUsers().then((users) => {
      if (mounted && users) {
        setTeamUsers(users);
      }
    });
    seedWelcomeMessageIfEmpty();
    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to active channel messages
  useEffect(() => {
    const unsubscribe = subscribeToChannelMessages(activeChannelId, (newMessages) => {
      setMessages(newMessages);
    });
    return () => {
      unsubscribe();
    };
  }, [activeChannelId]);

  // Handle external or internal online presence subscription
  useEffect(() => {
    if (!onlineUsers) {
      const unsub = subscribeToOnlineSessions((online) => {
        setInternalOnlineUsers(online);
      });
      return () => unsub();
    }
  }, [onlineUsers]);

  // Handle initialDmUser selection
  useEffect(() => {
    if (initialDmUser) {
      setActiveChannelId(getDirectMessageChannelId(currentUser, initialDmUser));
    }
  }, [initialDmUser, currentUser]);

  const effectiveOnlineSessions = onlineUsers || internalOnlineUsers;

  // Set of usernames who are actively logged in
  const onlineUsernames = useMemo(() => {
    return new Set(effectiveOnlineSessions.map((s) => s.username.toLowerCase()));
  }, [effectiveOnlineSessions]);

  // Auto-scroll to bottom on message load or send
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChannelId]);

  // Current channel info
  const activeChannelMeta = useMemo(() => {
    const foundDefault = DEFAULT_CHANNELS.find((c) => c.id === activeChannelId);
    if (foundDefault) return foundDefault;

    if (activeChannelId.startsWith('dm:')) {
      const otherUsername = getOtherUserFromDmChannel(activeChannelId, currentUser);
      const otherUser = teamUsers.find(
        (u) => u.username.toLowerCase() === (otherUsername || '').toLowerCase()
      );
      const isOtherUserOnline = otherUsername
        ? onlineUsernames.has(otherUsername.toLowerCase())
        : false;

      return {
        id: activeChannelId,
        name: otherUser ? otherUser.name : otherUsername || 'Direct Message',
        description: otherUser ? `${otherUser.role || 'QA Member'} · @${otherUser.username}` : '1-on-1 Chat',
        type: 'direct' as const,
        otherUser,
        otherUsername,
        isOtherUserOnline
      };
    }

    return {
      id: activeChannelId,
      name: activeChannelId,
      description: 'Custom Channel',
      type: 'public' as const
    };
  }, [activeChannelId, currentUser, teamUsers]);

  // Handle message submission
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanContent = inputText.trim();
    if ((!cleanContent && !selectedDefect) || isSending) return;

    setIsSending(true);
    const currentUserProfile = teamUsers.find(
      (u) => u.username.toLowerCase() === currentUser.toLowerCase()
    );

    const senderDisplayName = currentUserProfile
      ? currentUserProfile.name
      : currentUser === 'sahil_roy'
      ? 'Sahil Roy'
      : currentUser === 'admin'
      ? 'Administrator'
      : currentUser;

    const senderRole = currentUserProfile
      ? currentUserProfile.role
      : isUserAdmin(currentUser)
      ? 'Administrator'
      : 'QA Engineer';

    try {
      await sendChatMessage({
        channelId: activeChannelId,
        senderUsername: currentUser,
        senderName: senderDisplayName,
        senderRole,
        content: cleanContent || (selectedDefect ? `Referenced defect ${selectedDefect.bugId}` : ''),
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
        ...(selectedDefect
          ? {
              defectRef: {
                id: selectedDefect.id,
                bugId: selectedDefect.bugId,
                title: selectedDefect.title,
                severity: selectedDefect.severity,
                defectStatus: selectedDefect.defectStatus
              }
            }
          : {}),
        ...(replyingTo
          ? {
              replyTo: {
                id: replyingTo.id,
                senderName: replyingTo.senderName,
                content: replyingTo.content.slice(0, 100)
              }
            }
          : {})
      });

      setInputText('');
      setSelectedDefect(null);
      setReplyingTo(null);
      setIsDefectPickerOpen(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReact = async (messageId: string, emoji: string, currentReactions?: Record<string, string[]>) => {
    await toggleMessageReaction(messageId, emoji, currentUser, currentReactions);
    setActiveEmojiPickerMsgId(null);
  };

  const handleDelete = async (messageId: string) => {
    if (confirm('Delete this message?')) {
      await deleteChatMessage(messageId);
    }
  };

  // Switch to direct message
  const handleOpenDm = (targetUsername: string) => {
    const dmId = getDirectMessageChannelId(currentUser, targetUsername);
    setActiveChannelId(dmId);
    setIsSidebarOpenOnMobile(false);
  };

  // Filtered defects for defect picker
  const filteredDefects = useMemo(() => {
    const query = defectSearch.trim().toLowerCase();
    if (!query) return defects.slice(0, 15);
    return defects
      .filter(
        (d) =>
          d.bugId.toLowerCase().includes(query) ||
          d.title.toLowerCase().includes(query) ||
          (d.module && d.module.toLowerCase().includes(query))
      )
      .slice(0, 15);
  }, [defects, defectSearch]);

  // Filter messages by search in conversation
  const displayedMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q) ||
        m.defectRef?.bugId.toLowerCase().includes(q) ||
        m.defectRef?.title.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  // Count how many other users are actively logged in
  const onlineCount = useMemo(() => {
    const currentClean = currentUser.toLowerCase();
    return teamUsers.filter(
      (u) => u.username.toLowerCase() !== currentClean && onlineUsernames.has(u.username.toLowerCase())
    ).length;
  }, [teamUsers, currentUser, onlineUsernames]);

  // Filter team users for DM section (optionally showing only online members)
  const otherUsers = useMemo(() => {
    const currentClean = currentUser.toLowerCase();
    const q = filterQuery.trim().toLowerCase();
    return teamUsers
      .filter((u) => {
        if (u.username.toLowerCase() === currentClean) return false;
        const isOnline = onlineUsernames.has(u.username.toLowerCase());
        if (onlyShowOnline && !isOnline) return false;
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.role && u.role.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        // Online users always float to top!
        const aOnline = onlineUsernames.has(a.username.toLowerCase()) ? 1 : 0;
        const bOnline = onlineUsernames.has(b.username.toLowerCase()) ? 1 : 0;
        if (aOnline !== bOnline) return bOnline - aOnline;
        return a.name.localeCompare(b.name);
      });
  }, [teamUsers, currentUser, filterQuery, onlineUsernames, onlyShowOnline]);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[580px]">
        
        {/* Main Chat Interface Split View */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* LEFT SIDEBAR: Channels & Direct Messages */}
          <aside
            className={`w-full md:w-72 lg:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/80 dark:bg-slate-900/90 shrink-0 transition-transform duration-200 z-20 ${
              isSidebarOpenOnMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0 absolute md:relative inset-y-0 left-0'
            }`}
          >
            {/* Sidebar Search */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Find channel or engineer..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
                {filterQuery && (
                  <button
                    onClick={() => setFilterQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Channels & DMs List */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 divide-y divide-slate-200/60 dark:divide-slate-800/60">
              
              {/* Public QA Channels */}
              <div className="space-y-1">
                <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3 h-3 text-indigo-500" />
                    QA Channels
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {DEFAULT_CHANNELS.length}
                  </span>
                </div>

                {DEFAULT_CHANNELS.map((ch) => {
                  const isActive = activeChannelId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setActiveChannelId(ch.id);
                        setIsSidebarOpenOnMobile(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-indigo-500/40 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        #
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{ch.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Direct Messages */}
              <div className="pt-3 space-y-1">
                <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-indigo-500" />
                    Team Members
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {onlineCount} Online
                  </span>
                </div>

                {/* Filter Toggle: All vs Online Only */}
                <div className="px-2 pb-2 flex items-center gap-1">
                  <button
                    onClick={() => setOnlyShowOnline(false)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition text-center cursor-pointer ${
                      !onlyShowOnline
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    All ({teamUsers.length > 0 ? teamUsers.length - 1 : 0})
                  </button>
                  <button
                    onClick={() => setOnlyShowOnline(true)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition text-center cursor-pointer ${
                      onlyShowOnline
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online ({onlineCount})
                  </button>
                </div>

                {otherUsers.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-400 italic text-center">
                    {onlyShowOnline
                      ? 'No other engineers currently logged in'
                      : 'No matching members found'}
                  </div>
                ) : (
                  otherUsers.map((u) => {
                    const dmId = getDirectMessageChannelId(currentUser, u.username);
                    const isActive = activeChannelId === dmId;
                    const isAdminUser = isUserAdmin(u.username);
                    const isOnline = onlineUsernames.has(u.username.toLowerCase());

                    return (
                      <button
                        key={u.username}
                        onClick={() => handleOpenDm(u.username)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold uppercase ${
                            isActive
                              ? 'bg-white text-indigo-700'
                              : isAdminUser
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            {u.name.slice(0, 2)}
                          </div>
                          {/* Live Online Presence Indicator: ONLY logged-in users get green dot */}
                          {isOnline ? (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"
                              title="Online Now"
                            />
                          ) : (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 ring-1 ring-white dark:ring-slate-900"
                              title="Offline"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{u.name}</span>
                            {isAdminUser && (
                              <ShieldCheck className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : 'text-amber-500'}`} />
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] mt-0.5">
                            <span className={`truncate ${isActive ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'}`}>
                              @{u.username}
                            </span>
                            {/* Text Presence Label */}
                            {isOnline ? (
                              <span className={`font-semibold flex items-center gap-0.5 shrink-0 ${
                                isActive ? 'text-emerald-200' : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                Online
                              </span>
                            ) : (
                              <span className={`shrink-0 ${isActive ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
                                Offline
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Current Logged-in User Status footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                  {currentUser.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    @{currentUser}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online & Active
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN CHAT CONVERSATION VIEW */}
          <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
            
            {/* Conversation Header */}
            <header className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile back to sidebar */}
                <button
                  onClick={() => setIsSidebarOpenOnMobile(true)}
                  className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="View channels and team members"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  {activeChannelMeta.type === 'direct' ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <Hash className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {activeChannelMeta.type === 'public' ? `#${activeChannelMeta.name}` : activeChannelMeta.name}
                    </h2>
                    {activeChannelMeta.type === 'direct' ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold ${
                        (activeChannelMeta as any).isOtherUserOnline
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          (activeChannelMeta as any).isOtherUserOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`} />
                        {(activeChannelMeta as any).isOtherUserOnline ? 'Online Now' : 'Offline'}
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Real-Time Firestore
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">
                    {activeChannelMeta.description}
                  </p>
                </div>
              </div>

              {/* Chat Search inside conversation */}
              <div className="flex items-center gap-2">
                <div className="relative hidden sm:block w-44 md:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search in chat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </header>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
              {displayedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {searchQuery ? 'No messages match your search query' : 'No messages yet in this conversation'}
                  </p>
                  <p className="text-xs max-w-xs">
                    Start the conversation! You can mention bug IDs, discuss test execution, and coordinate defect fixes with your team.
                  </p>
                </div>
              ) : (
                displayedMessages.map((msg) => {
                  const isMine = msg.senderUsername.toLowerCase() === currentUser.toLowerCase();
                  const isAdminSender = isUserAdmin(msg.senderUsername);
                  const isSystemMsg = msg.isSystem;

                  return (
                    <div
                      key={msg.id}
                      className={`group relative flex gap-3 ${
                        isMine ? 'flex-row-reverse' : 'flex-row'
                      } ${isSystemMsg ? 'justify-center' : ''}`}
                    >
                      {/* Avatar (for regular messages) */}
                      {!isSystemMsg && (
                        <div className="shrink-0 pt-0.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold uppercase shadow-xs ${
                              isMine
                                ? 'bg-indigo-600 text-white'
                                : isAdminSender
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {msg.senderName.slice(0, 2)}
                          </div>
                        </div>
                      )}

                      {/* Message Content Container */}
                      <div className={`max-w-[85%] sm:max-w-[70%] space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
                        
                        {/* Header: Sender Name & Timestamp */}
                        {!isSystemMsg && (
                          <div className={`flex items-center gap-2 text-[11px] ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <span className="font-bold text-slate-900 dark:text-slate-200">
                              {msg.senderName}
                            </span>
                            {isAdminSender && (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[9px] border border-amber-500/20">
                                Admin
                              </span>
                            )}
                            <span className="text-slate-400 dark:text-slate-500">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}

                        {/* Reply reference bubble if replied to */}
                        {msg.replyTo && (
                          <div className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 mb-1 ${
                            isMine
                              ? 'bg-indigo-700/10 border-indigo-300 dark:border-indigo-700/50 text-indigo-900 dark:text-indigo-200'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}>
                            <Reply className="w-3 h-3 rotate-180 shrink-0 text-slate-400" />
                            <span className="font-semibold text-[10px]">{msg.replyTo.senderName}:</span>
                            <span className="truncate max-w-[220px]">{msg.replyTo.content}</span>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`relative p-3 rounded-2xl text-xs leading-relaxed break-words shadow-xs ${
                            isSystemMsg
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-indigo-950 dark:text-indigo-200 text-center max-w-lg mx-auto py-2'
                              : isMine
                              ? 'bg-indigo-600 text-white rounded-tr-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-slate-700/60'
                          }`}
                        >
                          {msg.content}

                          {/* Embedded QA Defect Reference Card */}
                          {msg.defectRef && (
                            <div className={`mt-2.5 p-2.5 rounded-xl border transition ${
                              isMine
                                ? 'bg-indigo-700/70 border-indigo-400/50 text-white'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                            }`}>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5 font-bold font-mono">
                                  <Bug className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  <span>{msg.defectRef.bugId}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-semibold ${
                                    msg.defectRef.severity === 'Critical'
                                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  }`}>
                                    {msg.defectRef.severity}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-slate-500/20 text-slate-300">
                                    {msg.defectRef.defectStatus}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[11px] font-medium opacity-90 line-clamp-2">
                                {msg.defectRef.title}
                              </p>

                              <div className="mt-2 flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onNavigateToSheet) {
                                      onNavigateToSheet(msg.defectRef?.id);
                                    } else if (onOpenDefectModal) {
                                      const found = defects.find(
                                        (d) => d.id === msg.defectRef?.id || d.bugId === msg.defectRef?.bugId
                                      );
                                      if (found) onOpenDefectModal(found);
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer ${
                                    isMine
                                      ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                                  }`}
                                >
                                  <span>View Defect</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Reactions Bar */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {(Object.entries(msg.reactions) as [string, string[]][]).map(([emoji, users]) => {
                              const userList: string[] = Array.isArray(users) ? users : [];
                              const hasReacted = userList.includes(currentUser.toLowerCase());
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(msg.id, emoji, msg.reactions)}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition cursor-pointer ${
                                    hasReacted
                                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 text-indigo-600 dark:text-indigo-400 font-bold'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                                  title={userList.join(', ')}
                                >
                                  <span>{emoji}</span>
                                  <span className="text-[10px] font-mono">{userList.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Hover Quick Action Buttons */}
                        <div
                          className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pt-0.5 ${
                            isMine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {/* Quick Reactions Trigger */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveEmojiPickerMsgId(
                                  activeEmojiPickerMsgId === msg.id ? null : msg.id
                                )
                              }
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Add reaction"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>

                            {/* Floating emoji selector popover */}
                            {activeEmojiPickerMsgId === msg.id && (
                              <div className="absolute z-30 bottom-full mb-1 flex items-center gap-1 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl animate-in fade-in">
                                {POPULAR_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReact(msg.id, emoji, msg.reactions)}
                                    className="p-1 text-sm hover:scale-125 transition-transform cursor-pointer"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Reply Button */}
                          <button
                            onClick={() => {
                              setReplyingTo(msg);
                              textareaRef.current?.focus();
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Reply to message"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button (if sender or admin) */}
                          {(isMine || isUserAdmin(currentUser)) && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                              title="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              
              {/* Replying banner */}
              {replyingTo && (
                <div className="mb-2 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-2 text-xs text-indigo-900 dark:text-indigo-200 animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <Reply className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-semibold">Replying to {replyingTo.senderName}:</span>
                    <span className="truncate opacity-80">{replyingTo.content}</span>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-indigo-600 hover:text-indigo-800 dark:hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Defect preview chip */}
              {selectedDefect && (
                <div className="mb-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <Bug className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold font-mono">{selectedDefect.bugId}:</span>
                    <span className="truncate">{selectedDefect.title}</span>
                  </div>
                  <button
                    onClick={() => setSelectedDefect(null)}
                    className="text-amber-600 hover:text-amber-800 dark:hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Defect Picker Popover */}
              {isDefectPickerOpen && (
                <div className="mb-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Bug className="w-3.5 h-3.5 text-indigo-500" />
                      Select Defect to Reference
                    </span>
                    <button
                      onClick={() => setIsDefectPickerOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search defects by BUG-ID or title..."
                    value={defectSearch}
                    onChange={(e) => setDefectSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredDefects.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No defects found.
                      </div>
                    ) : (
                      filteredDefects.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDefect(d);
                            setIsDefectPickerOpen(false);
                            setDefectSearch('');
                            textareaRef.current?.focus();
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center justify-between gap-2 transition cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                                {d.bugId}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                {d.severity}
                              </span>
                            </div>
                            <div className="text-xs text-slate-700 dark:text-slate-300 truncate">
                              {d.title}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Text Input Row */}
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="relative rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition shadow-xs">
                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeChannelMeta.type === 'public' ? '#' + activeChannelMeta.name : activeChannelMeta.name}... (Press Enter to send)`}
                    className="w-full px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 bg-transparent resize-none focus:outline-none"
                  />

                  {/* Actions Bar inside composer */}
                  <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-1.5">
                      {/* Attach Defect reference button */}
                      <button
                        type="button"
                        onClick={() => setIsDefectPickerOpen((prev) => !prev)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                          selectedDefect || isDefectPickerOpen
                            ? 'bg-amber-500 text-white font-semibold shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        title="Link a QA Defect to your message"
                      >
                        <Bug className="w-3.5 h-3.5 text-amber-500" />
                        <span className="hidden xs:inline">Attach Defect</span>
                      </button>

                      {/* Quick Emoji insert */}
                      <div className="hidden sm:flex items-center gap-0.5 pl-1 border-l border-slate-200 dark:border-slate-700">
                        {['👍', '🔥', '✅', '🚀'].map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setInputText((prev) => prev + em)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-xs transition cursor-pointer"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={(!inputText.trim() && !selectedDefect) || isSending}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <span>Send</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Shift + Enter for new line</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Firebase Firestore Live Sync
                  </span>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

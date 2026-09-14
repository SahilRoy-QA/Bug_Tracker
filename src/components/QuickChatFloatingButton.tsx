import React from 'react';
import { MessageSquare } from 'lucide-react';

interface QuickChatFloatingButtonProps {
  unreadCount?: number;
  isActive: boolean;
  onClick: () => void;
}

export const QuickChatFloatingButton: React.FC<QuickChatFloatingButtonProps> = ({
  unreadCount = 0,
  isActive,
  onClick
}) => {
  // If already on the chat view, hide or style subtly
  if (isActive) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40">
      <button
        onClick={onClick}
        type="button"
        className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-indigo-400/30"
        title="Open Team Chat & Defect Discussion"
        aria-label="Open Team Chat"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5 text-white group-hover:rotate-6 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-xs font-bold tracking-tight hidden sm:inline-block">
          Team Chat
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block" />
      </button>
    </div>
  );
};

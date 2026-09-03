'use client';

import React, { useState } from 'react';
import { MessageAvatar } from './MessageAvatar';
import { CornerDownRight, Trash2, Check, CheckCheck, FileText } from 'lucide-react';

export interface ChatMessage {
  id: string;
  topicId?: string;
  parentReplyId?: string | null;
  content: string;
  author: string;
  authorId?: string | null;
  createdAt: string;
  isTopicOrigin?: boolean;
  isRead?: boolean;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isOutgoing: boolean;
  isRead?: boolean;
  parentMessage?: ChatMessage | null;
  onReply: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
  canDelete?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOutgoing,
  isRead = false,
  parentMessage,
  onReply,
  onDelete,
  canDelete = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Helper to format content with code blocks & link auto-wrapping
  const renderContent = (content: string) => {
    if (!content) return null;

    // Code block detection ```code```
    if (content.includes('```')) {
      const codeRegex = /```(?:(\w+)\n)?([\s\S]*?)```/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = codeRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(
            <span key={lastIndex} className="whitespace-pre-wrap">
              {content.substring(lastIndex, match.index)}
            </span>
          );
        }
        const lang = match[1] || 'Code';
        const code = match[2];
        parts.push(
          <div
            key={match.index}
            className="my-2 rounded-xl bg-slate-900 text-slate-100 p-3 text-[11px] font-mono overflow-x-auto shadow-inner border border-slate-800"
          >
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 pb-1 border-b border-slate-800/80 flex items-center justify-between">
              <span>{lang}</span>
            </div>
            <pre className="leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < content.length) {
        parts.push(
          <span key={lastIndex} className="whitespace-pre-wrap">
            {content.substring(lastIndex)}
          </span>
        );
      }
      return parts;
    }

    return <span className="whitespace-pre-wrap break-words">{content}</span>;
  };

  return (
    <div
      className={`group relative flex items-start gap-2.5 my-2.5 transition-all ${
        isOutgoing ? 'flex-row-reverse self-end' : 'flex-row self-start'
      } w-full max-w-full`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* User Avatar */}
      <MessageAvatar username={message.author} size="sm" className="mt-0.5" />

      {/* Message Bubble Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 shadow-2xs text-xs sm:text-sm transition-all ${
          isOutgoing
            ? 'bg-[#e3f2fd] text-slate-900 border border-sky-200/80 rounded-tr-xs'
            : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
        }`}
      >
        {/* Author Name for incoming messages */}
        {!isOutgoing && (
          <div className="text-[11px] font-bold text-blue-600 mb-1 leading-tight flex items-center gap-1.5">
            <span>{message.author}</span>
            {message.isTopicOrigin && (
              <span className="text-[9px] bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.5 rounded-full">
                TOPIC AUTHOR
              </span>
            )}
          </div>
        )}

        {/* Quoted Reply Preview inside bubble */}
        {parentMessage && (
          <div
            onClick={() => {
              const el = document.getElementById(`msg-${parentMessage.id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="cursor-pointer my-1 p-2 rounded-lg bg-black/5 dark:bg-white/10 border-l-3 border-blue-500 text-xs space-y-0.5 hover:opacity-90 transition-opacity"
          >
            <div className="font-bold text-[11px] text-blue-600">
              {parentMessage.author}
            </div>
            <div className="text-[11px] text-slate-600 line-clamp-1 italic">
              {parentMessage.content}
            </div>
          </div>
        )}

        {/* Message Body Content */}
        <div className="leading-relaxed text-slate-800 font-normal">
          {renderContent(message.content)}
        </div>

        {/* Bubble Timestamp & Status */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 select-none">
          <span>{formattedTime}</span>
          {isOutgoing && (
            isRead ? (
              <CheckCheck className="w-3.5 h-3.5 text-sky-600 shrink-0 inline-block -mr-0.5" />
            ) : (
              <Check className="w-3.5 h-3.5 text-sky-600 shrink-0 inline-block -mr-0.5" />
            )
          )}
        </div>

        {/* Hover Quick Actions */}
        {isHovered && (
          <div
            className={`absolute top-1 ${
              isOutgoing ? '-left-16' : '-right-16'
            } flex items-center gap-1 bg-white/90 backdrop-blur-xs border border-slate-200 shadow-sm rounded-full px-1.5 py-0.5 z-10 animate-fade-in`}
          >
            <button
              type="button"
              onClick={() => onReply(message)}
              title="Reply"
              className="p-1 hover:text-blue-600 text-slate-500 transition-colors"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
            </button>
            {canDelete && onDelete && !message.isTopicOrigin && (
              <button
                type="button"
                onClick={() => onDelete(message.id)}
                title="Delete"
                className="p-1 hover:text-rose-600 text-slate-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

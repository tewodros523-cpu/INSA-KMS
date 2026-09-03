'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, CornerDownRight } from 'lucide-react';
import { ChatMessage } from './MessageBubble';

interface MessageComposerProps {
  onSend: (content: string, parentReplyId?: string) => Promise<void>;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  isClosed: boolean;
  submitting: boolean;
}

const EMOJI_LIST = ['👍', '❤️', '💡', '😄', '🚀', '🔥', '👏', '🎉', '✅', '💻', '🤔', '🙌'];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  replyingTo,
  onCancelReply,
  isClosed,
  submitting,
}) => {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [content]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || submitting || isClosed) return;

    const currentText = content.trim();
    const parentId = replyingTo?.id;
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSend(currentText, parentId);
      onCancelReply();
    } catch {
      setContent(currentText); // Restore on error
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const addEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  if (isClosed) {
    return (
      <div className="p-4 bg-amber-50/90 border border-amber-200 text-amber-800 text-xs font-semibold rounded-2xl text-center shadow-2xs">
        This discussion topic is CLOSED. New replies are disabled.
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 z-10 p-3 sm:p-4 bg-gradient-to-t from-[#eef4f8] via-[#eef4f8]/90 to-transparent backdrop-blur-xs">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-lg overflow-hidden transition-all">
        {/* Quoted Reply Header Bar */}
        {replyingTo && (
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50/80 border-b border-blue-100 text-xs">
            <div className="flex items-center gap-2 text-blue-700 font-medium truncate">
              <CornerDownRight className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              <span>Replying to <strong>{replyingTo.author}</strong>:</span>
              <span className="text-slate-600 truncate italic">"{replyingTo.content}"</span>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-blue-100/60 rounded-full transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Emoji Selector Popover */}
        {showEmojiPicker && (
          <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 flex-wrap animate-fade-in">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="p-1.5 hover:bg-white rounded-lg text-base transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Main Input Composer Controls */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 sm:p-2.5">
          {/* Attachment Icon Button */}
          <button
            type="button"
            onClick={() => alert('Attachments can be added directly in reply text or code blocks.')}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Multiline Input Text Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your technical response or feedback... (Enter to send, Shift+Enter for new line)"
            className="flex-1 bg-transparent py-1.5 px-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden resize-none max-h-36 font-normal leading-relaxed"
          />

          {/* Emoji Toggle Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className={`p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0 ${
              showEmojiPicker ? 'text-blue-600 bg-blue-50' : ''
            }`}
            title="Add Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Telegram Send Button */}
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className={`p-2.5 sm:p-3 rounded-full flex items-center justify-center transition-all shrink-0 ${
              content.trim() && !submitting
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:scale-105 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

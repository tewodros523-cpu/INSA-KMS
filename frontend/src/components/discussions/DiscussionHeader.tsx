'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import {
  ArrowLeft,
  Lock,
  Unlock,
  Trash2,
  User,
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface DiscussionHeaderProps {
  topic: {
    id: string;
    title: string;
    status: 'OPEN' | 'CLOSED' | string;
    author: string;
    createdAt: string;
    description?: string;
  };
  isAuthorOrAdmin: boolean;
  onToggleStatus: () => void;
  onDeleteTopic: () => void;
}

export const DiscussionHeader: React.FC<DiscussionHeaderProps> = ({
  topic,
  isAuthorOrAdmin,
  onToggleStatus,
  onDeleteTopic,
}) => {
  const router = useRouter();
  const isClosed = topic.status === 'CLOSED';

  const formattedDate = new Date(topic.createdAt).toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="bg-white border-b border-slate-200/90 shadow-2xs px-4 py-3 sm:px-6 sticky top-0 z-10 transition-all">
      <div className="max-w-5xl mx-auto flex flex-col gap-2.5">
        {/* Navigation & Actions Top Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/discussions')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors py-1 px-2.5 -ml-2 rounded-lg hover:bg-slate-100/80"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Topics</span>
          </button>

          {isAuthorOrAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleStatus}
                className="h-8 text-xs font-semibold px-2.5 flex items-center gap-1.5 rounded-lg"
              >
                {isClosed ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Reopen Discussion</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Close Discussion</span>
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDeleteTopic}
                className="h-8 text-xs font-semibold px-2.5 flex items-center gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete Topic</span>
              </Button>
            </div>
          )}
        </div>

        {/* Title and Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                label={topic.status}
                variant={isClosed ? 'slate' : 'green'}
              />
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {topic.title}
              </h1>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Authored by <strong>{topic.author}</strong></span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Created {formattedDate}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

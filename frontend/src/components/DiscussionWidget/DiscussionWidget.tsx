'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { MessageSquare, X, ArrowRight, User, MessageCircle, RefreshCw } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import './DiscussionWidget.css';

interface TopicItem {
  id: string;
  title: string;
  description?: string;
  author?: string;
  replyCount?: number;
  status?: string;
  createdAt?: string;
}

export const DiscussionWidget: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hide widget on login / auth pages and specific discussion detail pages
  const isLoginPage = pathname === '/login' || pathname?.startsWith('/login') || pathname === '/forgot-password';
  const isDetailPage = pathname?.startsWith('/discussions/') && pathname !== '/discussions' && pathname !== '/discussions/create';

  const loadTopics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await kmsApi.discussions.getTopics(0, 5);
      const fetched = res?.content || res || [];
      setTopics(Array.isArray(fetched) ? fetched.slice(0, 5) : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoginPage || isDetailPage) return;
    loadTopics();
    const interval = setInterval(loadTopics, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, [isLoginPage, isDetailPage]);

  if (isLoginPage || isDetailPage) {
    return null;
  }

  return (
    <div className="discussion-widget-container" aria-label="Discussions Floating Widget">
      {isOpen ? (
        <div className="discussion-widget-card bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden transition-all duration-200 ease-in-out flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-3.5 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600/30 rounded-lg text-blue-300 border border-blue-500/20">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                  Discussions
                  {topics.length > 0 && (
                    <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                      {topics.length}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-300 font-medium">Enterprise Forum Topics</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={loadTopics}
                title="Refresh discussions"
                className="p-1 text-slate-300 hover:text-white rounded-md hover:bg-white/10 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                aria-label="Close widget"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Topics List Body */}
          <div className="p-3 max-h-[320px] overflow-y-auto space-y-2 bg-slate-50/50 flex-1 divide-y divide-slate-100">
            {loading && topics.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                <span>Loading recent topics...</span>
              </div>
            ) : error && topics.length === 0 ? (
              <div className="py-6 text-center text-xs text-rose-500 px-2 font-medium">
                <p>{error}</p>
                <button
                  onClick={loadTopics}
                  className="mt-2 text-[11px] font-bold text-blue-700 underline hover:text-blue-800"
                >
                  Try Again
                </button>
              </div>
            ) : topics.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-medium">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No active discussions</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Start the first thread in the forum.</p>
              </div>
            ) : (
              topics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => {
                    setIsOpen(false);
                    router.push(`/discussions/${topic.id}`);
                  }}
                  className="pt-2 first:pt-0 pb-2 cursor-pointer group hover:bg-white p-2 rounded-xl transition-all border border-transparent hover:border-blue-200 hover:shadow-2xs"
                >
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                    {topic.title}
                  </h4>
                  {topic.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 leading-snug">
                      {topic.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mt-2">
                    <div className="flex items-center gap-1 text-slate-600 truncate max-w-[150px]">
                      <User className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="truncate">{topic.author || 'User'}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-700 text-slate-600 px-2 py-0.5 rounded-md font-bold transition-colors">
                      <MessageCircle className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                      <span>
                        {topic.replyCount ?? 0} {(topic.replyCount === 1) ? 'reply' : 'replies'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Navigation Button */}
          <div className="p-2.5 bg-white border-t border-slate-200 text-center shrink-0">
            <Link
              href="/discussions"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-blue-200/60"
            >
              <span>View All Discussions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* Collapsed Trigger Button */
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-bold px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out border border-blue-500/30 active:scale-95"
          aria-label="Open Discussions Widget"
        >
          <div className="relative flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-blue-200 group-hover:text-white transition-colors" />
            {topics.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-2xs">
                {topics.length}
              </span>
            )}
          </div>
          <span className="text-xs tracking-tight">Discussions</span>
        </button>
      )}
    </div>
  );
};

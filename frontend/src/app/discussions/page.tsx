'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { MessageSquare, Plus, Search, Filter, Calendar, User, MessageCircle, Lock, CheckCircle2 } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';

export default function DiscussionsListPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await kmsApi.discussions.getTopics(
        0,
        50,
        search,
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setTopics(res.content || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load discussions');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumb items={[{ label: 'Workspace', href: '/' }, { label: 'Discussions' }]} />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-blue-950">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 mb-1">
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Enterprise Forum</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Technical Discussions & Q&A</h1>
            <p className="text-slate-300 text-xs mt-1">Engage in technical threads, share solutions, and resolve organizational challenges.</p>
          </div>
          <Link href="/discussions/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Start Discussion Topic
            </Button>
          </Link>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="relative flex-1 w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search discussion topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            {[
              { key: 'ALL', label: 'ALL' },
              { key: 'OPEN', label: 'OPEN' },
              { key: 'CLOSED', label: 'CLOSED' },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setStatusFilter(st.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  statusFilter === st.key ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Topic Feed */}
        {loading ? (
          <LoadingState message="Loading discussion threads..." />
        ) : error ? (
          <ErrorState title="Failed to load discussion topics" message={error} onRetry={fetchTopics} />
        ) : topics.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No discussions found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Be the first to initiate a technical discussion topic!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {topics.map((topic) => (
              <Link key={topic.id} href={`/discussions/${topic.id}`}>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <Badge label={topic.status} variant={topic.status === 'OPEN' ? 'green' : 'slate'} />
                      <span className="text-[11px] font-semibold text-slate-400">
                        {new Date(topic.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {topic.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {topic.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-between sm:justify-end text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>{topic.author}</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700 font-bold">
                      <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>{topic.replyCount ?? 0} {topic.replyCount === 1 ? 'Reply' : 'Replies'}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

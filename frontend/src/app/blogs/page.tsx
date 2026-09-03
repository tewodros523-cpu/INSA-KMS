'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { BookOpen, Plus, Search, Calendar, User, Edit, MessageSquare, ThumbsUp } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';

export default function BlogsFeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = ['ALL', 'General', 'Technology', 'Security', 'Architecture', 'Governance', 'News'];

  const canEditBlog = (blog: any) => {
    if (!user || !blog) return false;
    const authorUsername = (blog.author || blog.authorUsername || '').toLowerCase();
    const currentUsername = (user.username || '').toLowerCase();
    const isAuthor = Boolean(authorUsername && currentUsername && authorUsername === currentUsername);
    const isAdmin = Boolean(
      user.roles?.includes('ROLE_ADMIN' as any) ||
      user.roles?.includes('ADMIN' as any) ||
      user.roles?.includes('SYSTEM_ADMINISTRATOR' as any) ||
      (user as any)?.isAdmin
    );
    return isAuthor || isAdmin;
  };

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (activeTab === 'my') {
        res = await kmsApi.blogs.getMyBlogs(0, 50);
      } else {
        res = await kmsApi.blogs.getPublished(0, 50, search, category !== 'ALL' ? category : undefined);
      }
      let fetched = res.content || [];
      if (activeTab === 'my') {
        if (search) {
          fetched = fetched.filter((b: any) =>
            b.title?.toLowerCase().includes(search.toLowerCase()) ||
            b.content?.toLowerCase().includes(search.toLowerCase())
          );
        }
        if (category !== 'ALL') {
          fetched = fetched.filter((b: any) => b.category === category);
        }
      }
      setBlogs(fetched);
    } catch (err: any) {
      setError(err.message || 'Failed to load blogs');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, category]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumb items={[{ label: 'Workspace', href: '/' }, { label: 'Blogs' }]} />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <BookOpen className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Enterprise Knowledge</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Blogs & Tech Insights</h1>
            <p className="text-slate-300 text-xs mt-1">Discover, share, and publish organizational articles and technological insights.</p>
          </div>
          <Link href="/blogs/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Create Blog Post
            </Button>
          </Link>
        </div>

        {/* Search & Header Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Published Blogs
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'my'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              My Blogs & Drafts
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search blogs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat === 'ALL' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState message="Fetching blogs..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchBlogs} />
        ) : blogs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No blog posts found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No blogs match your selection.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => {
              const editable = canEditBlog(blog);
              return (
                <div
                  key={blog.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col overflow-hidden group"
                >
                  {blog.coverImageUrl ? (
                    <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                      <img src={blog.coverImageUrl} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-xs rounded-md">
                          {blog.category}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 w-full bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex flex-col justify-between text-white relative">
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs rounded-md w-fit">
                        {blog.category}
                      </span>
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge label={blog.status} variant={blog.status === 'PUBLISHED' ? 'green' : 'amber'} />
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(blog.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {blog.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                        {blog.content.replace(/<[^>]*>?/gm, '')}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>{blog.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Edit Button is visible ONLY to Creator or Admin */}
                        {editable && (
                          <Link href={`/blogs/${blog.id}/edit`}>
                            <Button size="sm" variant="ghost" className="p-1 text-slate-500 hover:text-blue-600" title="Edit Post (Author/Admin Only)">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}
                        <Link href={`/blogs/${blog.id}`}>
                          <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3 py-1">
                            Read Post
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

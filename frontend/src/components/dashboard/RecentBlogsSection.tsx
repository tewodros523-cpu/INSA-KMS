'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  ArrowRight, 
  Calendar, 
  User as UserIcon, 
  FileText, 
  Plus, 
  Clock, 
  ExternalLink 
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';

export interface BlogItem {
  id: string;
  title: string;
  content: string;
  category?: string;
  coverImageUrl?: string | null;
  status: string;
  author?: string;
  createdAt: string;
  publishedAt?: string | null;
}

interface RecentBlogsSectionProps {
  limit?: number;
  title?: string;
  subtitle?: string;
  showCreateButton?: boolean;
}

export const RecentBlogsSection: React.FC<RecentBlogsSectionProps> = ({
  limit = 3,
  title = 'Recent Blogs & Tech Insights',
  subtitle = 'Discover latest technical insights, company news, and architectural articles',
  showCreateButton = true,
}) => {
  const { roles } = useAuth();
  const canCreateBlog = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_CONTRIBUTOR');

  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentBlogs = () => {
    setIsLoading(true);
    setError(null);
    kmsApi.blogs.getPublished(0, limit)
      .then((data: any) => {
        const items = Array.isArray(data)
          ? data
          : data?.content || [];
        setBlogs(items.slice(0, limit));
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load recent blogs';
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchRecentBlogs();
  }, [limit]);

  const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                Latest 3
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCreateBlog && showCreateButton && (
            <Link href="/blogs/create">
              <Button variant="outline" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                Write Blog
              </Button>
            </Link>
          )}
          <Link
            href="/blogs"
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 transition-colors px-1"
          >
            <span>Explore All Blogs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 animate-pulse shadow-2xs"
            >
              <div className="h-32 bg-slate-100 rounded-lg w-full" />
              <div className="h-4 bg-slate-100 rounded-sm w-1/3" />
              <div className="h-5 bg-slate-100 rounded-sm w-3/4" />
              <div className="h-12 bg-slate-100 rounded-sm w-full" />
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <div className="h-4 bg-slate-100 rounded-sm w-1/4" />
                <div className="h-4 bg-slate-100 rounded-sm w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 flex items-center justify-between">
          <span>Failed to load recent blogs: {error}</span>
          <button
            onClick={fetchRecentBlogs}
            className="font-semibold underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && blogs.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-2xs">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No blog posts published yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Stay tuned for technical articles, departmental news, and insights from team members.
          </p>
          {canCreateBlog && (
            <div className="mt-3">
              <Link href="/blogs/create">
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                  Publish the First Blog
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 3 Recent Blog Cards Grid */}
      {!isLoading && !error && blogs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blogs.map((blog) => {
            const excerpt = stripHtml(blog.content);
            const displayDate = formatDate(blog.publishedAt || blog.createdAt);
            const categoryLabel = blog.category || 'General';

            return (
              <div
                key={blog.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                {/* Header Image or Gradient Banner */}
                {blog.coverImageUrl ? (
                  <div className="h-36 w-full bg-slate-100 overflow-hidden relative">
                    <img
                      src={blog.coverImageUrl}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-xs rounded-md shadow-xs">
                        {categoryLabel}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-24 w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-3.5 flex flex-col justify-between text-white relative">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs rounded-md border border-white/20">
                        {categoryLabel}
                      </span>
                      <BookOpen className="w-4 h-4 text-white/60" />
                    </div>
                  </div>
                )}

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Meta date */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mb-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{displayDate}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                      <Link href={`/blogs/${blog.id}`} className="hover:underline">
                        {blog.title}
                      </Link>
                    </h3>

                    {/* Excerpt */}
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {excerpt || 'No description available.'}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium truncate max-w-[55%]">
                      <UserIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{blog.author || 'Author'}</span>
                    </div>

                    <Link href={`/blogs/${blog.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-50 px-2 py-1 h-auto flex items-center gap-1"
                      >
                        <span>Read</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';

export default function EditBlogPage() {
  const params = useParams();
  const router = useRouter();
  const blogId = params?.id as string;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = ['General', 'Technology', 'Security', 'Architecture', 'Governance', 'News'];

  const fetchBlog = useCallback(async () => {
    if (!blogId) return;
    setLoading(true);
    setError(null);
    try {
      const blog = await kmsApi.blogs.getById(blogId);
      setTitle(blog.title || '');
      setCategory(blog.category || 'General');
      setContent(blog.content || '');
      setCoverImageUrl(blog.coverImageUrl || '');
      setStatus(blog.status || 'DRAFT');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch blog for editing');
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  useEffect(() => {
    fetchBlog();
  }, [fetchBlog]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await kmsApi.blogs.uploadCoverImage(file);
      const url = res.mediaUrl || res.url || '';
      setCoverImageUrl(url);
    } catch (err: any) {
      setError(err.message || 'Cover image upload failed');
    }
  };

  const handleSave = async (targetStatus?: string) => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await kmsApi.blogs.update(blogId, {
        title,
        content,
        category,
        coverImageUrl: coverImageUrl || undefined,
        status: targetStatus || status,
      });
      router.push(`/blogs/${blogId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update blog post');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Loading blog editor..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <Breadcrumb
          items={[
            { label: 'Workspace', href: '/' },
            { label: 'Blogs', href: '/blogs' },
            { label: 'Edit Blog' },
          ]}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Edit Blog Post</h1>
              <p className="text-xs text-slate-500">Update blog information, content, and publishing status.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave('DRAFT')}
              disabled={submitting}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSave('PUBLISHED')}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Save & Publish
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Blog Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Cover Image (Upload File or Enter URL)
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                <input
                  type="text"
                  placeholder="Or paste image URL (e.g. /images/... or https://...)"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {coverImageUrl && (
            <div className="relative h-48 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <img src={coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setCoverImageUrl('')}
                className="absolute top-2 right-2 px-2 py-1 bg-slate-900/80 text-white text-[10px] font-bold rounded-md"
              >
                Remove Cover Image
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Content *
            </label>
            <textarea
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-4 text-sm font-mono rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

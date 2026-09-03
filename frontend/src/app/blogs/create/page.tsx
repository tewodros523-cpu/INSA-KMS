'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { BookOpen, Upload, ArrowLeft, Send, Save, Image as ImageIcon } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';

export default function CreateBlogPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = ['General', 'Technology', 'Security', 'Architecture', 'Governance', 'News'];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await kmsApi.blogs.uploadCoverImage(file);
      const url = res.mediaUrl || res.url || '';
      setCoverImageUrl(url);
    } catch (err: any) {
      setError(err.message || 'Cover image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
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
      const blog = await kmsApi.blogs.create({
        title,
        content,
        category,
        coverImageUrl: coverImageUrl || undefined,
        status,
      });
      router.push(`/blogs/${blog.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create blog post');
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <Breadcrumb
          items={[
            { label: 'Workspace', href: '/' },
            { label: 'Blogs', href: '/blogs' },
            { label: 'Create Post' },
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
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Author New Blog Post</h1>
              <p className="text-xs text-slate-500">Publish articles or save as draft for team collaboration.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSubmit('DRAFT')}
              disabled={submitting}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
            <Button
              onClick={() => handleSubmit('PUBLISHED')}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Publish Now
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Blog Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Architecting Zero Trust Security in Modern KMS"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Category & Cover Image URL / File */}
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
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {uploading && <span className="text-xs text-blue-600 font-semibold animate-pulse">Uploading...</span>}
                </div>
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

          {/* Content TextArea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Article Content (Markdown / Text) *
            </label>
            <textarea
              rows={16}
              placeholder="Write your article content here..."
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

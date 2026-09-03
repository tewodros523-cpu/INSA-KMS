'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { MessageSquare, ArrowLeft, Send } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';

export default function CreateDiscussionTopicPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Topic title is required');
      return;
    }
    if (!description.trim()) {
      setError('Topic description is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const topic = await kmsApi.discussions.createTopic({ title, description });
      router.push(`/discussions/${topic.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create discussion topic');
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <Breadcrumb
          items={[
            { label: 'Workspace', href: '/' },
            { label: 'Discussions', href: '/discussions' },
            { label: 'New Topic' },
          ]}
        />

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
            <h1 className="text-2xl font-black text-slate-900">Start Discussion Topic</h1>
            <p className="text-xs text-slate-500">Initiate a technical conversation for team feedback and resolution.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Topic Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Migration strategy for Microservices DB clustering"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Description / Opening Post *
            </label>
            <textarea
              rows={8}
              placeholder="Provide background information, context, or specific questions for the team..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 text-sm font-sans rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Publish Topic
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { BookOpen, User, Calendar, ArrowLeft, Edit, Trash2, Globe, Lock, ThumbsUp, Heart, Lightbulb, Rocket, Send, MessageSquare } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';
import { RichMarkdownRenderer } from '@/src/components/articles/RichMarkdownRenderer';

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const blogId = params?.id as string;

  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reaction states
  const [reactions, setReactions] = useState<{ [key: string]: number }>({
    like: 12,
    love: 5,
    insightful: 8,
    helpful: 4,
  });
  const [userReactions, setUserReactions] = useState<{ [key: string]: boolean }>({});

  // Comments/Replies state
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 'c1',
      author: 'John Doe',
      content: 'Great insight! Thank you for sharing this article.',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ]);
  const [newComment, setNewComment] = useState('');

  const fetchBlog = useCallback(async () => {
    if (!blogId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await kmsApi.blogs.getById(blogId);
      setBlog(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load blog details');
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  useEffect(() => {
    fetchBlog();
  }, [fetchBlog]);

  const handleTogglePublish = async () => {
    if (!blog) return;
    try {
      const updated = await kmsApi.blogs.togglePublish(blog.id);
      setBlog(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle publish status');
    }
  };

  const handleDelete = async () => {
    if (!blog || !confirm('Are you sure you want to delete this blog post?')) return;
    try {
      await kmsApi.blogs.delete(blog.id);
      router.push('/blogs');
    } catch (err: any) {
      alert(err.message || 'Failed to delete blog post');
    }
  };

  const handleReaction = (type: string) => {
    setReactions((prev) => ({
      ...prev,
      [type]: userReactions[type] ? prev[type] - 1 : prev[type] + 1,
    }));
    setUserReactions((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentObj: Comment = {
      id: String(Date.now()),
      author: user?.fullName || user?.username || 'Anonymous',
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [commentObj, ...prev]);
    setNewComment('');
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Loading blog article..." />
      </AppShell>
    );
  }

  if (error || !blog) {
    return (
      <AppShell>
        <ErrorState message={error || 'Blog not found'} onRetry={fetchBlog} />
      </AppShell>
    );
  }

  // Author or Admin check for editing/deleting/publishing
  const authorUsername = (blog.author || blog.authorUsername || '').toLowerCase();
  const currentUsername = (user?.username || '').toLowerCase();
  const isAuthor = Boolean(authorUsername && currentUsername && authorUsername === currentUsername);
  const isAdmin = Boolean(
    user?.roles?.includes('ROLE_ADMIN' as any) ||
    user?.roles?.includes('ADMIN' as any) ||
    user?.roles?.includes('SYSTEM_ADMINISTRATOR' as any) ||
    (user as any)?.isAdmin
  );
  const isAuthorOrAdmin = isAuthor || isAdmin;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <Breadcrumb
          items={[
            { label: 'Workspace', href: '/' },
            { label: 'Blogs', href: '/blogs' },
            { label: blog.title },
          ]}
        />

        {/* Top Actions */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/blogs')}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Button>

          {/* EDIT, DELETE, & PUBLISH BUTTONS ARE VISIBLE ONLY TO AUTHOR OR ADMIN */}
          {isAuthorOrAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePublish}
                className="flex items-center gap-1.5"
              >
                {blog.status === 'PUBLISHED' ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Unpublish to Draft
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    Publish Post
                  </>
                )}
              </Button>
              <Link href={`/blogs/${blog.id}/edit`}>
                <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                  <Edit className="w-3.5 h-3.5" />
                  Edit Post
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Article Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {blog.coverImageUrl && (
            <div className="h-64 sm:h-80 w-full bg-slate-900 overflow-hidden">
              <img src={blog.coverImageUrl} alt={blog.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                {blog.category}
              </span>
              <Badge label={blog.status} variant={blog.status === 'PUBLISHED' ? 'green' : 'amber'} />
            </div>

            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {blog.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 pt-4 border-t border-slate-100 font-medium">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <User className="w-4 h-4 text-blue-600" />
                <span>{blog.author}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Published {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Main Content */}
            <div className="pt-6 border-t border-slate-100">
              <RichMarkdownRenderer content={blog.content} />
            </div>
          </div>
        </div>

        {/* Reactions Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-2">Reactions</span>
            <button
              onClick={() => handleReaction('like')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                userReactions.like
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{reactions.like}</span>
            </button>
            <button
              onClick={() => handleReaction('love')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                userReactions.love
                  ? 'bg-rose-50 border-rose-300 text-rose-600'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>{reactions.love}</span>
            </button>
            <button
              onClick={() => handleReaction('insightful')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                userReactions.insightful
                  ? 'bg-amber-50 border-amber-300 text-amber-600'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{reactions.insightful}</span>
            </button>
            <button
              onClick={() => handleReaction('helpful')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                userReactions.helpful
                  ? 'bg-purple-50 border-purple-300 text-purple-600'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>{reactions.helpful}</span>
            </button>
          </div>
        </div>

        {/* Comments & Replies Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Comments & Replies ({comments.length})</h3>
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="flex gap-3">
            <input
              type="text"
              placeholder="Write a comment or reply to this post..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Reply
            </Button>
          </form>

          {/* Comments List */}
          <div className="space-y-4 pt-2">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{comment.author}</span>
                  <span className="text-[11px] text-slate-400">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

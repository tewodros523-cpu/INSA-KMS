'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { RichMarkdownRenderer } from '@/src/components/articles/RichMarkdownRenderer';
import { 
  ThumbsUp, 
  Heart, 
  Lightbulb, 
  Rocket, 
  MessageSquare, 
  Send, 
  User, 
  Calendar, 
  Edit3, 
  Trash2, 
  Share2, 
  ArrowLeft,
  Building2,
  CornerDownRight,
  Reply,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';

export interface BlogCommentAuthor {
  id: string;
  name: string;
  username: string;
  department?: string;
  jobTitle?: string;
  profileImage?: string | null;
}

export interface BlogCommentItem {
  id: string;
  content: string;
  author: BlogCommentAuthor;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
  replies: BlogCommentItem[];
  replyCount: number;
}

export default function BlogDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const blogId = params?.id as string;

  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Persistent Reaction states
  const [reactions, setReactions] = useState<{ [key: string]: number }>({
    like: 0,
    love: 0,
    insightful: 0,
    helpful: 0,
  });
  const [currentUserReaction, setCurrentUserReaction] = useState<string | null>(null);
  const [isReacting, setIsReacting] = useState(false);

  // Persistent Comments/Replies state
  const [comments, setComments] = useState<BlogCommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Highlighting target comment from URL hash
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

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

  const fetchReactions = useCallback(async () => {
    if (!blogId) return;
    try {
      const res = await kmsApi.blogs.getReactions(blogId);
      if (res?.counts) {
        setReactions({
          like: res.counts.like || 0,
          love: res.counts.love || 0,
          insightful: res.counts.insightful || 0,
          helpful: res.counts.helpful || 0,
        });
        setCurrentUserReaction(res.currentUserReaction ? res.currentUserReaction.toLowerCase() : null);
      }
    } catch (err) {
      console.error('Failed to load reactions:', err);
    }
  }, [blogId]);

  const fetchComments = useCallback(async () => {
    if (!blogId) return;
    setCommentsLoading(true);
    try {
      const data = await kmsApi.blogs.getComments(blogId);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  }, [blogId]);

  useEffect(() => {
    fetchBlog();
    fetchReactions();
    fetchComments();
  }, [fetchBlog, fetchReactions, fetchComments]);

  // Handle URL hash anchor e.g. #comment-123
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      if (hash.startsWith('#comment-')) {
        const commentId = hash.replace('#comment-', '');
        setHighlightedId(commentId);
        setTimeout(() => {
          const el = document.getElementById(`comment-${commentId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 600);
      }
    }
  }, [comments]);

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

  // Persistent Reaction Toggle
  const handleReaction = async (type: string) => {
    if (isReacting) return;
    setIsReacting(true);
    try {
      const res = await kmsApi.blogs.react(blogId, type);
      if (res?.counts) {
        setReactions({
          like: res.counts.like || 0,
          love: res.counts.love || 0,
          insightful: res.counts.insightful || 0,
          helpful: res.counts.helpful || 0,
        });
        setCurrentUserReaction(res.currentUserReaction ? res.currentUserReaction.toLowerCase() : null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update reaction');
    } finally {
      setIsReacting(false);
    }
  };

  // Persistent Comment Submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const savedComment = await kmsApi.blogs.addComment(blogId, newComment.trim());
      setComments((prev) => [...prev, savedComment]);
      setNewComment('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Persistent Reply Submission
  const handleAddReply = async (parentCommentId: string) => {
    if (!replyText.trim() || submittingReply) return;
    setSubmittingReply(true);
    try {
      const savedReply = await kmsApi.blogs.addReply(blogId, parentCommentId, replyText.trim());
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentCommentId) {
            return {
              ...c,
              replies: [...(c.replies || []), savedReply],
              replyCount: (c.replyCount || 0) + 1,
            };
          }
          return c;
        })
      );
      setReplyingToId(null);
      setReplyText('');
    } catch (err: any) {
      alert(err.message || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Delete comment / reply
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await kmsApi.blogs.deleteComment(blogId, commentId);
      fetchComments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const formatCommentDate = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
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

  const isAuthor = user?.username && blog.authorUsername && user.username.toLowerCase() === blog.authorUsername.toLowerCase();
  const isAdmin = user?.roles?.includes('ROLE_ADMIN') || user?.roles?.includes('ROLE_SUPER_ADMIN');
  const canManage = isAuthor || isAdmin;

  // Calculate total comments count including replies
  const totalCommentsCount = comments.reduce((acc, c) => acc + 1 + (c.replies ? c.replies.length : 0), 0);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Breadcrumb
            items={[
              { label: 'Knowledge Base', href: '/library' },
              { label: 'Company Blogs', href: '/blogs' },
              { label: blog.title },
            ]}
          />
          <Link
            href="/blogs"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Blogs
          </Link>
        </div>

        {/* Blog Post Main Article Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {blog.coverImageUrl && (
            <div className="w-full h-64 sm:h-80 bg-slate-100 overflow-hidden relative">
              <img
                src={blog.coverImageUrl}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge label={blog.category || 'General'} variant="blue" />
                <Badge label={blog.status || 'DRAFT'} variant={blog.status === 'PUBLISHED' ? 'green' : 'amber'} />
              </div>

              {canManage && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTogglePublish}
                    className="text-xs font-bold"
                  >
                    {blog.status === 'PUBLISHED' ? 'Unpublish' : 'Publish Article'}
                  </Button>
                  <Link href={`/blogs/${blog.id}/edit`}>
                    <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    className="text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {blog.title}
            </h1>

            {/* Author Info Bar */}
            <div className="flex items-center justify-between border-y border-slate-100 py-4 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {getInitials(blog.authorUsername || blog.author)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{blog.authorUsername || blog.author || 'Author'}</p>
                  <p className="text-slate-400 text-[11px]">Knowledge Contributor</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{new Date(blog.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Markdown Content */}
            <div className="pt-6 border-t border-slate-100">
              <RichMarkdownRenderer content={blog.content} />
            </div>
          </div>
        </div>

        {/* Persistent Reactions Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-1">Reactions</span>
            
            {/* 1. LIKE */}
            <button
              onClick={() => handleReaction('LIKE')}
              disabled={isReacting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                currentUserReaction === 'like'
                  ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Like / Thumbs Up"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${currentUserReaction === 'like' ? 'fill-blue-500 text-blue-600' : ''}`} />
              <span className="font-bold">{reactions.like}</span>
            </button>

            {/* 2. LOVE */}
            <button
              onClick={() => handleReaction('LOVE')}
              disabled={isReacting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                currentUserReaction === 'love'
                  ? 'bg-rose-50 border-rose-400 text-rose-700 ring-2 ring-rose-200'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Love"
            >
              <Heart className={`w-3.5 h-3.5 ${currentUserReaction === 'love' ? 'fill-rose-500 text-rose-600' : ''}`} />
              <span className="font-bold">{reactions.love}</span>
            </button>

            {/* 3. INSIGHTFUL */}
            <button
              onClick={() => handleReaction('INSIGHTFUL')}
              disabled={isReacting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                currentUserReaction === 'insightful'
                  ? 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-200'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Insightful"
            >
              <Lightbulb className={`w-3.5 h-3.5 ${currentUserReaction === 'insightful' ? 'fill-amber-400 text-amber-600' : ''}`} />
              <span className="font-bold">{reactions.insightful}</span>
            </button>

            {/* 4. HELPFUL */}
            <button
              onClick={() => handleReaction('HELPFUL')}
              disabled={isReacting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                currentUserReaction === 'helpful'
                  ? 'bg-purple-50 border-purple-400 text-purple-700 ring-2 ring-purple-200'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Helpful"
            >
              <Rocket className={`w-3.5 h-3.5 ${currentUserReaction === 'helpful' ? 'fill-purple-400 text-purple-600' : ''}`} />
              <span className="font-bold">{reactions.helpful}</span>
            </button>
          </div>

          <div className="text-[11px] font-medium text-slate-400">
            {currentUserReaction ? (
              <span className="text-slate-600">You reacted with <strong className="uppercase">{currentUserReaction}</strong> (click again to remove)</span>
            ) : (
              <span>Click a reaction to celebrate this article</span>
            )}
          </div>
        </div>

        {/* Persistent Comments & Replies Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Comments &amp; Replies ({totalCommentsCount})
              </h3>
            </div>
            {commentsLoading && (
              <span className="text-xs text-slate-400 animate-pulse">Refreshing comments...</span>
            )}
          </div>

          {/* Add New Comment Form */}
          <form onSubmit={handleAddComment} className="flex gap-3">
            <input
              type="text"
              placeholder="Write a constructive comment on this post..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={submittingComment}
              className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <Button
              type="submit"
              size="sm"
              disabled={submittingComment || !newComment.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              {submittingComment ? 'Posting...' : 'Comment'}
            </Button>
          </form>

          {/* Threaded Comments List */}
          <div className="space-y-4 pt-2">
            {comments.length === 0 && !commentsLoading && (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                <MessageSquare className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                No comments yet. Be the first to start the discussion!
              </div>
            )}

            {comments.map((comment) => {
              const isCommentAuthor = user?.username && comment.author?.username && user.username.toLowerCase() === comment.author.username.toLowerCase();
              const canDeleteComment = isCommentAuthor || isAdmin;
              const isHighlighted = highlightedId === comment.id;

              return (
                <div
                  key={comment.id}
                  id={`comment-${comment.id}`}
                  className={`p-4 rounded-xl border transition-all ${
                    isHighlighted
                      ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-200'
                      : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Comment Author Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                        {getInitials(comment.author?.name || comment.author?.username)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900">
                            {comment.author?.name || comment.author?.username || 'Unknown'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            @{comment.author?.username}
                          </span>
                          {comment.author?.department && comment.author.department !== 'Unassigned' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-white border border-slate-200 text-slate-600 font-medium">
                              <Building2 className="w-2.5 h-2.5 text-slate-400" />
                              {comment.author.department}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatCommentDate(comment.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Delete if author/admin */}
                    {canDeleteComment && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete Comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Comment Content */}
                  <p className="text-xs text-slate-800 leading-relaxed mt-2.5 pl-9">
                    {comment.content}
                  </p>

                  {/* Comment Footer & Reply Trigger */}
                  <div className="pl-9 mt-2 flex items-center gap-3">
                    <button
                      onClick={() => {
                        setReplyingToId(replyingToId === comment.id ? null : comment.id);
                        setReplyText('');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Reply className="w-3 h-3" />
                      Reply
                    </button>
                  </div>

                  {/* Inline Reply Form */}
                  {replyingToId === comment.id && (
                    <div className="mt-3 pl-9 pt-2 border-t border-slate-200/60 flex gap-2">
                      <input
                        type="text"
                        placeholder={`Reply to ${comment.author?.name || comment.author?.username}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        disabled={submittingReply}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddReply(comment.id)}
                        disabled={submittingReply || !replyText.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                      >
                        {submittingReply ? 'Sending...' : 'Send'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingToId(null);
                          setReplyText('');
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Nested Replies List */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 pl-6 border-l-2 border-slate-200 ml-4 space-y-2.5 pt-1">
                      {comment.replies.map((reply) => {
                        const isReplyAuthor = user?.username && reply.author?.username && user.username.toLowerCase() === reply.author.username.toLowerCase();
                        const canDeleteReply = isReplyAuthor || isAdmin;
                        const isReplyHighlighted = highlightedId === reply.id;

                        return (
                          <div
                            key={reply.id}
                            id={`comment-${reply.id}`}
                            className={`p-3 rounded-lg border transition-all ${
                              isReplyHighlighted
                                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                                : 'bg-white border-slate-200/90'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                                  {getInitials(reply.author?.name || reply.author?.username)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-slate-900">
                                      {reply.author?.name || reply.author?.username}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      @{reply.author?.username}
                                    </span>
                                    {reply.author?.department && reply.author.department !== 'Unassigned' && (
                                      <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-600">
                                        {reply.author.department}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-slate-400">
                                    {formatCommentDate(reply.createdAt)}
                                  </span>
                                </div>
                              </div>

                              {canDeleteReply && (
                                <button
                                  onClick={() => handleDeleteComment(reply.id)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                                  title="Delete Reply"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <p className="text-xs text-slate-800 leading-relaxed mt-1.5 pl-7">
                              {reply.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

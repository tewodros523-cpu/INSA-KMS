'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';
import { DiscussionHeader } from '@/src/components/discussions/DiscussionHeader';
import { MessageBubble, ChatMessage } from '@/src/components/discussions/MessageBubble';
import { MessageComposer } from '@/src/components/discussions/MessageComposer';
import { DateSeparator } from '@/src/components/discussions/DateSeparator';
import { AlertTriangle, MessageSquare } from 'lucide-react';

export default function DiscussionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const topicId = params?.id as string;

  const [topic, setTopic] = useState<any>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const fetchTopicDetail = useCallback(async () => {
    if (!topicId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await kmsApi.discussions.getTopicDetail(topicId);
      setTopic(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load discussion topic');
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    fetchTopicDetail();
  }, [fetchTopicDetail]);

  // Scroll to bottom when messages finish loading or update
  useEffect(() => {
    if (!loading && topic) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [loading, topic?.replies?.length]);

  const handleToggleStatus = async () => {
    if (!topic) return;
    const newStatus = topic.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      const updated = await kmsApi.discussions.setStatus(topic.id, newStatus);
      setTopic((prev: any) => ({ ...prev, status: updated.status }));
    } catch (err: any) {
      alert(err.message || 'Failed to update topic status');
    }
  };

  const handleDeleteTopic = async () => {
    if (!topic || !confirm('Are you sure you want to delete this topic and all replies?')) return;
    try {
      await kmsApi.discussions.deleteTopic(topic.id);
      router.push('/discussions');
    } catch (err: any) {
      alert(err.message || 'Failed to delete topic');
    }
  };

  const handleSendReply = async (content: string, parentReplyId?: string) => {
    if (!content.trim() || !topic) return;

    if (topic.status === 'CLOSED') {
      alert('Cannot reply to a closed discussion topic.');
      return;
    }

    setSubmittingReply(true);
    try {
      await kmsApi.discussions.addReply(topicId, {
        content: content.trim(),
        parentReplyId: parentReplyId || undefined,
      });
      setReplyingToMessage(null);

      // Refresh topic messages
      const updatedTopic = await kmsApi.discussions.getTopicDetail(topicId);
      setTopic(updatedTopic);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      alert(err.message || 'Failed to submit reply');
      throw err;
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;
    try {
      await kmsApi.discussions.deleteReply(topicId, replyId);
      const updatedTopic = await kmsApi.discussions.getTopicDetail(topicId);
      setTopic(updatedTopic);
    } catch (err: any) {
      alert(err.message || 'Failed to delete reply');
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Loading Telegram conversation..." />
      </AppShell>
    );
  }

  if (error || !topic) {
    return (
      <AppShell>
        <ErrorState message={error || 'Topic not found'} onRetry={fetchTopicDetail} />
      </AppShell>
    );
  }

  const currentUsername = user?.username || '';
  const isAuthorOrAdmin = (topic.author === currentUsername && currentUsername !== '') || Boolean(user?.roles?.includes('ROLE_ADMIN'));
  const isClosed = topic.status === 'CLOSED';

  // Construct complete chat message list:
  // Initial topic post is message #0 from the topic author
  const topicOriginMessage: ChatMessage = {
    id: `topic-${topic.id}`,
    topicId: topic.id,
    content: topic.description,
    author: topic.author,
    authorId: topic.authorId,
    createdAt: topic.createdAt,
    isTopicOrigin: true,
    isRead: topic.isRead ?? false,
  };

  const replyMessages: ChatMessage[] = (topic.replies || []).map((r: any) => ({
    id: r.id,
    topicId: topic.id,
    parentReplyId: r.parentReplyId,
    content: r.content,
    author: r.author,
    authorId: r.authorId,
    createdAt: r.createdAt,
    isRead: r.isRead ?? false,
  }));

  const allMessages: ChatMessage[] = [topicOriginMessage, ...replyMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const getParentMessage = (parentId?: string | null): ChatMessage | null => {
    if (!parentId) return null;
    return allMessages.find((m) => m.id === parentId) || null;
  };

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#eef4f8] -m-4 sm:-m-6 overflow-hidden">
        {/* Telegram Header */}
        <DiscussionHeader
          topic={topic}
          isAuthorOrAdmin={isAuthorOrAdmin}
          onToggleStatus={handleToggleStatus}
          onDeleteTopic={handleDeleteTopic}
        />

        {/* Telegram Chat Conversation Area */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 space-y-2 bg-[#eef4f8] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]"
        >
          <div className="max-w-4xl mx-auto flex flex-col justify-end min-h-full pb-2">
            {allMessages.map((msg, index) => {
              const isOutgoing = msg.author === currentUsername;
              const parentMsg = getParentMessage(msg.parentReplyId);

              // Message is considered read if marked as read by backend view tracking OR if another user replied later in thread
              const isRead = Boolean(msg.isRead) || allMessages.slice(index + 1).some((m) => m.author !== msg.author);

              // Date separator check
              const showDateSeparator =
                index === 0 ||
                new Date(msg.createdAt).toDateString() !==
                  new Date(allMessages[index - 1].createdAt).toDateString();

              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && <DateSeparator dateString={msg.createdAt} />}

                  <div id={`msg-${msg.id}`}>
                    <MessageBubble
                      message={msg}
                      isOutgoing={isOutgoing}
                      isRead={isRead}
                      parentMessage={parentMsg}
                      onReply={(targetMsg) => setReplyingToMessage(targetMsg)}
                      onDelete={handleDeleteReply}
                      canDelete={msg.author === currentUsername || Boolean(user?.roles?.includes('ROLE_ADMIN'))}
                    />
                  </div>
                </React.Fragment>
              );
            })}

            {/* Scroll Anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Telegram Composer */}
        <MessageComposer
          onSend={handleSendReply}
          replyingTo={replyingToMessage}
          onCancelReply={() => setReplyingToMessage(null)}
          isClosed={isClosed}
          submitting={submittingReply}
        />
      </div>
    </AppShell>
  );
}

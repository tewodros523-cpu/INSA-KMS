'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/src/components/ui/States';
import { Bell, Check, CheckCheck, ExternalLink, FileText, CheckCircle2, UserCheck, ShieldAlert, Search, Layers, MessageSquare } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  eventType?: string;
  targetType?: string;
  targetId?: string;
  actionUrl?: string;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getEventBadge(eventType?: string) {
  if (!eventType) return null;
  const type = eventType.toUpperCase();
  if (type.startsWith('BLOG_') || type.includes('BLOG')) {
    return { label: 'Blog', variant: 'blue' as const, icon: MessageSquare };
  }
  if (type.startsWith('DOC_') || type.startsWith('DOCUMENT_')) {
    return { label: 'Document', variant: 'blue' as const, icon: FileText };
  }
  if (type.startsWith('APPROVAL_') || type.includes('APPROV')) {
    return { label: 'Approval', variant: 'indigo' as const, icon: CheckCircle2 };
  }
  if (type.startsWith('KT_') || type.includes('TRANSFER')) {
    return { label: 'Knowledge Transfer', variant: 'emerald' as const, icon: Layers };
  }
  if (type.startsWith('HR_')) {
    return { label: 'HR & Org', variant: 'amber' as const, icon: UserCheck };
  }
  if (type.includes('SEARCH')) {
    return { label: 'Search Alert', variant: 'purple' as const, icon: Search };
  }
  if (type.includes('SECURITY') || type.includes('ACCESS')) {
    return { label: 'Security', variant: 'red' as const, icon: ShieldAlert };
  }
  return { label: 'System', variant: 'gray' as const, icon: Bell };
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kmsApi.notifications.list({ unreadOnly: activeTab === 'unread' });
      const list = Array.isArray(data) ? data : data?.content ?? [];
      setNotifications(list);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while fetching notifications.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await kmsApi.notifications.getUnreadCount();
      setUnreadCount(res.unreadCount);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kms_notification_updated', { detail: { count: res.unreadCount } }));
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await kmsApi.notifications.markRead(item.id);
        setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
        const newCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newCount);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kms_notification_updated', { detail: { count: newCount } }));
        }
      } catch (err) {
        console.error('Failed to mark notification read', err);
      }
    }

    if (item.actionUrl && item.actionUrl.trim().length > 0) {
      router.push(item.actionUrl.trim());
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await kmsApi.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kms_notification_updated', { detail: { count: 0 } }));
      }
      if (activeTab === 'unread') {
        fetchNotifications();
      }
    } catch (err: any) {
      console.error('Failed to mark all read', err);
    }
  };

  const displayedNotifications = activeTab === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <AppShell>
      <div className="space-y-5 max-w-4xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <Breadcrumb items={[{ label: 'User Workspace' }, { label: 'Notifications' }]} />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <Bell className="w-5 h-5 text-blue-700" />
              Notifications &amp; Activity Feed
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                icon={<CheckCheck className="w-4 h-4" />}
                onClick={handleMarkAllAsRead}
              >
                Mark All as Read
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'unread'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Unread Only
            {unreadCount > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* State Containers */}
        {loading && <LoadingState message="Loading notifications..." />}
        {error && <ErrorState message={error} onRetry={fetchNotifications} />}

        {!loading && !error && displayedNotifications.length === 0 && (
          <EmptyState
            title={activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
            message={
              activeTab === 'unread'
                ? 'All caught up! You have no unread alerts.'
                : 'Notifications for document approvals, knowledge transfers, HR updates, and saved search matches will appear here.'
            }
          />
        )}

        {!loading && !error && displayedNotifications.length > 0 && (
          <div className="space-y-2.5">
            {displayedNotifications.map((notification) => {
              const badge = getEventBadge(notification.eventType);
              const BadgeIcon = badge?.icon;
              const hasLink = Boolean(notification.actionUrl && notification.actionUrl.trim().length > 0);

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3.5 sm:p-4 rounded-lg border transition-all select-none ${
                    hasLink ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    notification.isRead
                      ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-xs'
                      : 'bg-blue-50/70 border-blue-200 hover:bg-blue-100/60 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                          notification.isRead ? 'bg-slate-300' : 'bg-blue-600 ring-4 ring-blue-100'
                        }`}
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className={`text-xs font-bold ${notification.isRead ? 'text-slate-800' : 'text-slate-900'}`}>
                            {notification.title}
                          </h4>
                          {badge && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {BadgeIcon && <BadgeIcon className="w-3 h-3 text-slate-500" />}
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{notification.message}</p>
                        {hasLink && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline font-semibold pt-0.5">
                            <span>Open target item</span>
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!notification.isRead && (
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          New
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {formatTimestamp(notification.createdAt)}
                      </span>
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

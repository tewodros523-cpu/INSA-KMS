'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, 
  Folder, 
  Search, 
  User, 
  Users, 
  Star, 
  Clock, 
  Trash2, 
  ShieldCheck, 
  BarChart2, 
  FileLock2, 
  Settings, 
  LayoutDashboard,
  Bell,
  HardDrive,
  Tag,
  FileCheck2,
  BookmarkCheck,
  ShieldAlert,
  UsersRound,
  KeyRound,
  ScanLine,
  GitPullRequestArrow,
  X,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { UserRole, hasRole } from '@/src/lib/auth';
import { AuthUser } from '@/src/lib/auth-context';
import { kmsApi } from '@/src/lib/api';

interface SidebarProps {
  userRoles: UserRole[];
  user: AuthUser | null;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRoles, user, mobileOpen, onCloseMobile }) => {
  const pathname = usePathname();

  const mainNav = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, role: 'ROLE_VIEWER' },
    { href: '/library', label: 'Document Library', icon: Folder, role: 'ROLE_VIEWER' },
    { href: '/blogs', label: 'Blogs & News', icon: FileText, role: 'ROLE_VIEWER' },
    { href: '/discussions', label: 'Discussions & Forum', icon: Users, role: 'ROLE_VIEWER' },
    { href: '/articles/create', label: 'Create Article', icon: FileText, role: 'ROLE_CONTRIBUTOR' },
    { href: '/folders', label: 'Folders', icon: Folder, role: 'ROLE_CONTRIBUTOR' },
    { href: '/search', label: 'Advanced Search', icon: Search, role: 'ROLE_VIEWER' },
    { href: '/search/saved', label: 'Saved Searches & Alerts', icon: BookmarkCheck, role: 'ROLE_VIEWER' },
    { href: '/my-documents', label: 'My Documents', icon: User, role: 'ROLE_CONTRIBUTOR' },
    { href: '/shared-with-me', label: 'Shared With Me', icon: Users, role: 'ROLE_VIEWER' },
    { href: '/favorites', label: 'Favorites', icon: Star, role: 'ROLE_VIEWER' },
    { href: '/recent', label: 'Recent Documents', icon: Clock, role: 'ROLE_VIEWER' },
    { href: '/recycle-bin', label: 'Recycle Bin', icon: Trash2, role: 'ROLE_CONTRIBUTOR' },
    { href: '/notifications', label: 'Notifications', icon: Bell, role: 'ROLE_VIEWER' },
    { href: '/my-approvals', label: 'My Submissions', icon: GitPullRequestArrow, role: 'ROLE_CONTRIBUTOR' },
    { href: '/approvals', label: 'Approval Inbox', icon: GitPullRequestArrow, role: 'ROLE_CONTENT_OWNER' },
    { href: '/profile', label: 'User Profile', icon: User, role: 'ROLE_VIEWER' },
  ];

  const complianceNav = [
    { href: '/governance/retention', label: 'Retention Policies', icon: FileLock2, role: 'ROLE_COMPLIANCE_OFFICER' },
    { href: '/governance/legal-holds', label: 'Legal Holds', icon: ShieldCheck, role: 'ROLE_COMPLIANCE_OFFICER' },
    { href: '/governance/audit-logs', label: 'Audit Logs', icon: FileText, role: 'ROLE_COMPLIANCE_OFFICER' },
    { href: '/governance/reports', label: 'Compliance Reports', icon: BarChart2, role: 'ROLE_COMPLIANCE_OFFICER' },
  ];

  const adminNav = [
    { href: '/admin', label: 'Admin Dashboard', icon: Settings, role: 'ROLE_ADMIN' as UserRole },
    { href: '/hr/employees', label: 'HR & Employee Management', icon: Users, role: 'ROLE_ADMIN' as UserRole },
    { href: '/knowledge-transfer', label: 'Knowledge Transfer', icon: GitPullRequestArrow, role: 'ROLE_ADMIN' as UserRole },
    { href: '/admin/users', label: 'Users & Groups', icon: Users, role: 'ROLE_ADMIN' as UserRole },
    { href: '/admin/groups', label: 'Groups & Membership', icon: UsersRound, role: 'ROLE_ADMIN' as UserRole },
    { href: '/admin/roles', label: 'Roles & Matrix', icon: ShieldCheck, role: 'ROLE_SUPER_ADMIN' as UserRole },
    { href: '/admin/permissions', label: 'Access Control', icon: KeyRound, role: 'ROLE_SUPER_ADMIN' as UserRole },
    { href: '/admin/departments', label: 'Departments & Quotas', icon: BarChart2, role: 'ROLE_ADMIN' as UserRole },
    { href: '/admin/document-types', label: 'Document Categories & Types', icon: FileCheck2, role: 'ROLE_ADMIN' as UserRole },
    { href: '/admin/taxonomy', label: 'Taxonomy & Tags', icon: Tag, role: 'ROLE_ADMIN' as UserRole },
    { href: '/admin/storage', label: 'Storage & Integrity (MinIO)', icon: HardDrive, role: 'ROLE_SUPER_ADMIN' as UserRole },
    { href: '/admin/ocr', label: 'OCR Queue', icon: ScanLine, role: 'ROLE_ADMIN' as UserRole },
    { href: '/admin/reports', label: 'Usage & Stale Reports', icon: BarChart2, role: 'ROLE_ADMIN' as UserRole },
    { href: '/admin/security', label: 'Security Alerts', icon: ShieldAlert, role: 'ROLE_SUPER_ADMIN' as UserRole },
    { href: '/admin/approvals', label: 'Approval Workflows', icon: GitPullRequestArrow, role: 'ROLE_ADMIN' as UserRole },
    { href: '/admin/settings', label: 'System Settings', icon: Settings, role: 'ROLE_SUPER_ADMIN' as UserRole },
  ];

  const isAdmin = hasRole(userRoles, 'ROLE_ADMIN');
  const [storageUsed, setStorageUsed] = useState<number | null>(null);
  const [storageTotal, setStorageTotal] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const fetchUnread = () => {
      if (typeof window === 'undefined') return;
      const token = sessionStorage.getItem('kms_access_token');
      if (!token) return;
      kmsApi.notifications.getUnreadCount()
        .then((data) => {
          if (data && typeof data.unreadCount === 'number') {
            setUnreadCount(data.unreadCount);
          }
        })
        .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);

    const handleUpdate = (e: any) => {
      if (typeof e?.detail?.count === 'number') {
        setUnreadCount(e.detail.count);
      } else {
        fetchUnread();
      }
    };

    window.addEventListener('kms_notification_updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('kms_notification_updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    kmsApi.admin.getSummary().then((data) => {
      const used = (data as { storageQuotaUsedBytes?: number }).storageQuotaUsedBytes;
      const total = (data as { storageQuotaTotalBytes?: number }).storageQuotaTotalBytes;
      if (used != null) setStorageUsed(used);
      if (total != null) setStorageTotal(total);
    }).catch(() => {
      // Non-critical — ignore storage fetch errors
    });
  }, [isAdmin]);

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const storagePercent =
    storageUsed != null && storageTotal != null && storageTotal > 0
      ? Math.min(100, (storageUsed / storageTotal) * 100)
      : null;

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() ?? '??';

  const renderNavContent = (isMobile = false) => (
    <>
      {/* Primary Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        <div>
          <div className="px-3 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Workspace
          </div>
          <nav className="space-y-0.5" aria-label="Main Navigation">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isAllowed = hasRole(userRoles, item.role as UserRole);
              if (!isAllowed) return null;

              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={isMobile ? onCloseMobile : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-700 pl-2'
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Compliance & Governance */}
        {complianceNav.some((item) => hasRole(userRoles, item.role as UserRole)) && (
          <div>
            <div className="px-3 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Compliance &amp; Governance
            </div>
            <nav className="space-y-0.5" aria-label="Compliance Navigation">
              {complianceNav.map((item) => {
                const Icon = item.icon;
                const isAllowed = hasRole(userRoles, item.role as UserRole);
                if (!isAllowed) return null;

                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={isMobile ? onCloseMobile : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-700 pl-2'
                        : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Administration Section */}
        {adminNav.some((item) => hasRole(userRoles, item.role as UserRole)) && (
          <div>
            <div className="px-3 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Administration
            </div>
            <nav className="space-y-0.5" aria-label="Admin Navigation">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isAllowed = hasRole(userRoles, item.role as UserRole);
                if (!isAllowed) return null;

                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={isMobile ? onCloseMobile : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-700 pl-2'
                        : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Identity & Storage Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60 text-xs shrink-0 space-y-2">
        {/* User identity strip */}
        {user && (
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${userRoles.includes('ROLE_SUPER_ADMIN') ? 'bg-amber-600' : 'bg-blue-700'}`}>
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-900 font-bold truncate text-xs">{user.fullName || user.username}</span>
                {userRoles.includes('ROLE_SUPER_ADMIN') ? (
                  <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-500 text-white rounded font-mono uppercase tracking-wider shrink-0">
                    SUPER ADMIN
                  </span>
                ) : userRoles.includes('ROLE_ADMIN') ? (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded font-mono uppercase tracking-wider shrink-0">
                    ADMIN
                  </span>
                ) : null}
              </div>
              <div className="text-[10px] text-slate-500 truncate font-medium">
                {user.department || user.email}
              </div>
            </div>
          </div>
        )}

        {/* Storage quota — admin only, real data */}
        {isAdmin && storagePercent !== null && storageUsed !== null && storageTotal !== null ? (
          <>
            <div className="flex items-center justify-between text-slate-600 mb-1 text-[11px]">
              <span>Storage Quota</span>
              <span className="font-semibold text-slate-900">
                {formatBytes(storageUsed)} / {formatBytes(storageTotal)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${storagePercent > 80 ? 'bg-rose-500' : storagePercent > 60 ? 'bg-amber-500' : 'bg-blue-600'}`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </>
        ) : isAdmin ? (
          <div className="text-slate-400 text-[11px]">Loading storage info...</div>
        ) : null}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden lg:flex w-64 bg-white text-slate-700 flex-col border-r border-slate-200 shrink-0 h-screen sticky top-0 shadow-2xs">
        {/* Branding with Official INSA Logo & Right-Aligned Title */}
        <Link
          href="/"
          className="h-16 px-3.5 flex items-center justify-between border-b border-slate-200 bg-white hover:bg-slate-50/80 transition-colors group"
        >
          <img
            src="/images/insalogo.png"
            alt="INSA Logo"
            className="h-8.5 w-auto max-w-[135px] object-contain shrink-0"
          />
          <div className="flex flex-col items-end text-right shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">
                INSA
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md tracking-wider uppercase shadow-2xs">
                KMS
              </span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Knowledge
            </span>
          </div>
        </Link>

        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Sliding Content */}
          <aside
            className="relative w-72 max-w-[85vw] bg-white text-slate-700 flex flex-col border-r border-slate-200 shadow-2xl h-full z-10"
            aria-label="Mobile Navigation"
          >
            {/* Header with Close Button */}
            <div className="h-16 px-3.5 flex items-center justify-between border-b border-slate-200 bg-white">
              <Link
                href="/"
                onClick={onCloseMobile}
                className="flex items-center justify-between flex-1 pr-2"
              >
                <img
                  src="/images/insalogo.png"
                  alt="INSA Logo"
                  className="h-8 w-auto max-w-[120px] object-contain shrink-0"
                />
                <div className="flex flex-col items-end text-right shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black tracking-tight text-slate-900">INSA</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md tracking-wider uppercase shadow-2xs">
                      KMS
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Knowledge</span>
                </div>
              </Link>
              <button
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors shrink-0"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};

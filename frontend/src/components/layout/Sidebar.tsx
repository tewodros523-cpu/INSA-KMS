'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  ChevronDown,
  ChevronRight,
  Filter,
  Sparkles,
  Layers,
  HelpCircle
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

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  role: UserRole;
  badge?: string;
}

interface NavSection {
  id: string;
  title: string;
  icon?: React.ElementType;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ userRoles, user, mobileOpen, onCloseMobile }) => {
  const pathname = usePathname();

  // Navigation Filter
  const [filterQuery, setFilterQuery] = useState('');

  // Collapsible section states (all open by default)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Structured Navigation Groups
  const navSections: NavSection[] = useMemo(() => [
    {
      id: 'workspace',
      title: 'Workspace & Library',
      items: [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard, role: 'ROLE_VIEWER' },
        { href: '/library', label: 'Document Library', icon: Folder, role: 'ROLE_VIEWER' },
        { href: '/folders', label: 'Folders & Structure', icon: Folder, role: 'ROLE_CONTRIBUTOR' },
        { href: '/search', label: 'Advanced Search', icon: Search, role: 'ROLE_VIEWER' },
        { href: '/search/saved', label: 'Saved Searches & Alerts', icon: BookmarkCheck, role: 'ROLE_VIEWER' },
      ],
    },
    {
      id: 'knowledge',
      title: 'Knowledge & Community',
      items: [
        { href: '/blogs', label: 'Blogs & Articles', icon: FileText, role: 'ROLE_VIEWER' },
        { href: '/discussions', label: 'Discussions & Forum', icon: Users, role: 'ROLE_VIEWER' },
        { href: '/articles/create', label: 'Create Knowledge Article', icon: FileText, role: 'ROLE_CONTRIBUTOR' },
        { href: '/knowledge-transfer', label: 'Knowledge Transfer', icon: GitPullRequestArrow, role: 'ROLE_ADMIN' },
      ],
    },
    {
      id: 'personal',
      title: 'Personal Workspace',
      items: [
        { href: '/my-documents', label: 'My Documents', icon: User, role: 'ROLE_CONTRIBUTOR' },
        { href: '/shared-with-me', label: 'Shared With Me', icon: Users, role: 'ROLE_VIEWER' },
        { href: '/favorites', label: 'Starred Favorites', icon: Star, role: 'ROLE_VIEWER' },
        { href: '/recent', label: 'Recently Opened', icon: Clock, role: 'ROLE_VIEWER' },
        { href: '/recycle-bin', label: 'Recycle Bin', icon: Trash2, role: 'ROLE_CONTRIBUTOR' },
      ],
    },
    {
      id: 'workflow',
      title: 'Activity & Approvals',
      items: [
        { href: '/notifications', label: 'Notifications', icon: Bell, role: 'ROLE_VIEWER' },
        { href: '/my-approvals', label: 'My Submissions', icon: GitPullRequestArrow, role: 'ROLE_CONTRIBUTOR' },
        { href: '/approvals', label: 'Approval Inbox', icon: GitPullRequestArrow, role: 'ROLE_CONTENT_OWNER' },
        { href: '/profile', label: 'User Profile & Settings', icon: User, role: 'ROLE_VIEWER' },
      ],
    },
    {
      id: 'governance',
      title: 'Compliance & Governance',
      items: [
        { href: '/governance/retention', label: 'Retention Policies', icon: FileLock2, role: 'ROLE_COMPLIANCE_OFFICER' },
        { href: '/governance/legal-holds', label: 'Legal Holds', icon: ShieldCheck, role: 'ROLE_COMPLIANCE_OFFICER' },
        { href: '/governance/audit-logs', label: 'Audit Logs', icon: FileText, role: 'ROLE_COMPLIANCE_OFFICER' },
        { href: '/governance/reports', label: 'Compliance Reports', icon: BarChart2, role: 'ROLE_COMPLIANCE_OFFICER' },
      ],
    },
    {
      id: 'admin',
      title: 'System Administration',
      items: [
        { href: '/admin', label: 'Admin Dashboard', icon: Settings, role: 'ROLE_ADMIN' },
        { href: '/hr/employees', label: 'HR & Employees', icon: Users, role: 'ROLE_ADMIN' },
        { href: '/admin/users', label: 'Users Directory', icon: Users, role: 'ROLE_ADMIN' },
        { href: '/admin/groups', label: 'Groups & Teams', icon: UsersRound, role: 'ROLE_ADMIN' },
        { href: '/admin/roles', label: 'Roles & Permissions', icon: ShieldCheck, role: 'ROLE_SUPER_ADMIN' },
        { href: '/admin/permissions', label: 'Access Control Matrix', icon: KeyRound, role: 'ROLE_SUPER_ADMIN' },
        { href: '/admin/departments', label: 'Departments & Quotas', icon: BarChart2, role: 'ROLE_ADMIN' },
        { href: '/admin/document-types', label: 'Document Categories', icon: FileCheck2, role: 'ROLE_ADMIN' },
        { href: '/admin/taxonomy', label: 'Taxonomy & Tags', icon: Tag, role: 'ROLE_ADMIN' },
        { href: '/admin/storage', label: 'Storage & Integrity (MinIO)', icon: HardDrive, role: 'ROLE_SUPER_ADMIN' },
        { href: '/admin/ocr', label: 'OCR Queue & Jobs', icon: ScanLine, role: 'ROLE_ADMIN' },
        { href: '/admin/reports', label: 'Usage Analytics', icon: BarChart2, role: 'ROLE_ADMIN' },
        { href: '/admin/security', label: 'Security & Integrity Alerts', icon: ShieldAlert, role: 'ROLE_SUPER_ADMIN' },
        { href: '/admin/approvals', label: 'Approval Workflows', icon: GitPullRequestArrow, role: 'ROLE_ADMIN' },
        { href: '/admin/settings', label: 'System Settings', icon: Settings, role: 'ROLE_SUPER_ADMIN' },
      ],
    },
  ], []);

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
    kmsApi.admin.getSummary()
      .then((data) => {
        const used = (data as { storageQuotaUsedBytes?: number }).storageQuotaUsedBytes;
        const total = (data as { storageQuotaTotalBytes?: number }).storageQuotaTotalBytes;
        if (used != null) setStorageUsed(used);
        if (total != null) setStorageTotal(total);
      })
      .catch(() => {});
  }, [isAdmin]);

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const storagePercent =
    storageUsed != null && storageTotal != null && storageTotal > 0
      ? Math.min(100, Math.round((storageUsed / storageTotal) * 100))
      : null;

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() ?? '??';

  const isSuperAdmin = userRoles.includes('ROLE_SUPER_ADMIN');

  // Filter sections based on search query and user permissions
  const filteredSections = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();

    return navSections
      .map((sec) => {
        const allowedItems = sec.items.filter((item) => {
          const isAllowed = hasRole(userRoles, item.role);
          if (!isAllowed) return false;
          if (!query) return true;
          return (
            item.label.toLowerCase().includes(query) ||
            item.href.toLowerCase().includes(query)
          );
        });

        return {
          ...sec,
          items: allowedItems,
        };
      })
      .filter((sec) => sec.items.length > 0);
  }, [navSections, userRoles, filterQuery]);

  const renderNavContent = (isMobile = false) => (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Quick Navigation Filter */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative flex items-center">
          <Filter className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Quick jump..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50/80 hover:bg-slate-100/70 focus:bg-white text-slate-800 placeholder-slate-400 rounded-lg border border-slate-200/80 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition-all"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
        {filteredSections.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-slate-400">
            No navigation items match &ldquo;{filterQuery}&rdquo;
          </div>
        )}

        {filteredSections.map((section) => {
          const isCollapsed = !filterQuery && Boolean(collapsedSections[section.id]);

          return (
            <div key={section.id} className="space-y-1">
              {/* Section Header with Collapse Trigger */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider group transition-colors select-none"
              >
                <span>{section.title}</span>
                <span className="p-0.5 rounded text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100 transition-all">
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </button>

              {/* Section Items */}
              {!isCollapsed && (
                <nav className="space-y-0.5 pt-0.5" aria-label={section.title}>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/admin' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={isMobile ? onCloseMobile : undefined}
                        className={`group relative w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg transition-all duration-150 select-none ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-50/90 to-indigo-50/50 text-blue-700 font-bold border border-blue-200/70 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/70 font-medium'
                        }`}
                      >
                        {/* Active Indicator Bar */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-r-full" />
                        )}

                        {/* Icon Container with Subtle Glow */}
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-150 ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                              : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200/60'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>

                        {/* Label */}
                        <span className="truncate flex-1 tracking-tight">{item.label}</span>

                        {/* Notifications Pill Badge */}
                        {item.href === '/notifications' && unreadCount > 0 && (
                          <span className="shrink-0 flex items-center justify-center bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] shadow-xs shadow-rose-500/30 animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>
          );
        })}
      </div>

      {/* User Profile & System Quota Floating Card */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/70 text-xs shrink-0 space-y-2.5">
        {/* User identity card */}
        {user && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="relative shrink-0">
              <div
                className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-xs ${
                  isSuperAdmin
                    ? 'bg-gradient-to-tr from-amber-600 to-orange-500'
                    : isAdmin
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                    : 'bg-gradient-to-tr from-slate-700 to-slate-900'
                }`}
              >
                {userInitials}
              </div>
              {/* Pulsing online status indicator */}
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-900 font-bold truncate text-xs">
                  {user.fullName || user.username}
                </span>
                {isSuperAdmin ? (
                  <span className="text-[8px] font-black px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-md tracking-wider uppercase shadow-2xs shrink-0">
                    SUPER
                  </span>
                ) : isAdmin ? (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded-md tracking-wider uppercase shadow-2xs shrink-0">
                    ADMIN
                  </span>
                ) : (
                  <span className="text-[8px] font-semibold px-1 py-0.5 bg-slate-100 text-slate-600 rounded uppercase tracking-wider shrink-0">
                    MEMBER
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 truncate font-medium">
                {user.department || user.email}
              </div>
            </div>
          </div>
        )}

        {/* Real Storage Quota Meter (Admin only) */}
        {isAdmin && storagePercent !== null && storageUsed !== null && storageTotal !== null ? (
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-slate-400" />
                Storage Quota
              </span>
              <span className="font-bold text-slate-900 font-mono text-[10px]">
                {storagePercent}%
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden p-0.25">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storagePercent > 85
                    ? 'bg-gradient-to-r from-rose-500 to-red-600'
                    : storagePercent > 65
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>{formatBytes(storageUsed)}</span>
              <span>of {formatBytes(storageTotal)}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white text-slate-700 flex-col border-r border-slate-200 shrink-0 h-screen sticky top-0 shadow-2xs z-20">
        {/* Brand Header with Sleek Gradient Accent */}
        <Link
          href="/"
          className="h-16 px-4 flex items-center justify-between border-b border-slate-200/90 bg-white hover:bg-slate-50/80 transition-all duration-150 group"
        >
          <div className="flex items-center gap-2.5">
            <img
              src="/images/insalogo.png"
              alt="INSA Logo"
              className="h-8 w-auto max-w-[125px] object-contain shrink-0"
            />
          </div>

          <div className="flex flex-col items-end text-right shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">
                INSA
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md tracking-wider uppercase shadow-xs">
                KMS
              </span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-0.5">
              Enterprise
            </span>
          </div>
        </Link>

        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer Navigation (Overlay) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Sliding Content Drawer */}
          <aside
            className="relative w-72 max-w-[85vw] bg-white text-slate-700 flex flex-col border-r border-slate-200 shadow-2xl h-full z-10 animate-in slide-in-from-left duration-200"
            aria-label="Mobile Navigation"
          >
            {/* Header with Close Action */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 bg-white">
              <Link
                href="/"
                onClick={onCloseMobile}
                className="flex items-center justify-between flex-1 pr-3"
              >
                <img
                  src="/images/insalogo.png"
                  alt="INSA Logo"
                  className="h-8 w-auto max-w-[120px] object-contain shrink-0"
                />
                <div className="flex flex-col items-end text-right shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black tracking-tight text-slate-900">INSA</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md tracking-wider uppercase shadow-xs">
                      KMS
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Enterprise</span>
                </div>
              </Link>
              <button
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
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

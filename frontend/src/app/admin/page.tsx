'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Card } from '@/src/components/ui/Card';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { 
  Users, 
  ShieldCheck, 
  HardDrive, 
  FileText, 
  Activity, 
  Settings,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';
import { RecentBlogsSection } from '@/src/components/dashboard/RecentBlogsSection';
import { TopContributorsSection } from '@/src/components/dashboard/TopContributorsSection';

interface AdminSummary {
  totalUsers: number;
  totalDocuments: number;
  storageQuotaUsedBytes: number;
  storageQuotaTotalBytes?: number;
  pendingOcrJobs?: number;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = () => {
    setIsLoading(true);
    setError(null);
    kmsApi.admin.getSummary()
      .then((data) => setSummary(data as AdminSummary))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load admin summary';
        if (msg.includes('403')) {
          setError('You do not have permission to view the administration dashboard. ROLE_ADMIN is required.');
        } else {
          setError(msg);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const storagePercent =
    summary?.storageQuotaTotalBytes && summary.storageQuotaTotalBytes > 0
      ? Math.min(100, (summary.storageQuotaUsedBytes / summary.storageQuotaTotalBytes) * 100)
      : null;

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration' }, { label: 'Admin Dashboard' }]} />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-700" />
              Enterprise Administration &amp; System Management Console
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-semibold text-[11px] shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            ROLE_ADMIN Access Verified
          </div>
        </div>

        {isLoading && <LoadingState message="Loading system metrics..." />}
        {error && <ErrorState title="Failed to load metrics" message={error} onRetry={loadSummary} />}

        {!isLoading && !error && summary && (
          <>
            {/* High-level metrics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Green card — Users */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Managed Users</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{summary.totalUsers.toLocaleString()}</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">Keycloak Realm Synced</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-emerald-700" />
                  </div>
                </div>
              </div>

              {/* Blue card — Documents */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Documents</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{summary.totalDocuments.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Repository total</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-blue-700" />
                  </div>
                </div>
              </div>

              {/* Cyan card — Storage */}
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Storage Used</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatBytes(summary.storageQuotaUsedBytes)}</p>
                    {storagePercent !== null && (
                      <div className="w-full bg-cyan-200 rounded-full h-1 mt-2">
                        <div
                          className={`h-1 rounded-full ${storagePercent > 80 ? 'bg-rose-500' : storagePercent > 60 ? 'bg-amber-500' : 'bg-cyan-600'}`}
                          style={{ width: `${storagePercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                    <HardDrive className="w-5 h-5 text-cyan-700" />
                  </div>
                </div>
              </div>

              {/* Amber/Green card — OCR Queue */}
              <div className={`${(summary.pendingOcrJobs ?? 0) === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} border rounded-lg p-4 shadow-2xs`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">OCR Queue</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{(summary.pendingOcrJobs ?? 0)} Pending</p>
                    <p className={`text-[11px] font-semibold mt-1 ${(summary.pendingOcrJobs ?? 0) === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {(summary.pendingOcrJobs ?? 0) === 0 ? 'Pipeline Healthy' : 'Processing...'}
                    </p>
                  </div>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${(summary.pendingOcrJobs ?? 0) === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    <Activity className={`w-5 h-5 ${(summary.pendingOcrJobs ?? 0) === 0 ? 'text-emerald-700' : 'text-amber-700'}`} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Top 3 Active Contributors Section */}
        <TopContributorsSection limit={3} />

        {/* 3 Recent Blogs Section */}
        <RecentBlogsSection limit={3} />

        {/* Administration Navigation Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card title="User &amp; Security Management">
            <div className="space-y-2 text-xs">
              <Link href="/admin/users" className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-md flex items-center justify-between font-semibold text-slate-800 hover:text-blue-700 transition-colors">
                <span>Users &amp; Groups Directory</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link href="/admin/roles" className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-md flex items-center justify-between font-semibold text-slate-800 hover:text-blue-700 transition-colors">
                <span>Roles &amp; Access Matrix</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link href="/admin/groups" className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-md flex items-center justify-between font-semibold text-slate-800 hover:text-blue-700 transition-colors">
                <span>Groups &amp; Membership</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link href="/admin/permissions" className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-md flex items-center justify-between font-semibold text-slate-800 hover:text-blue-700 transition-colors">
                <span>Folder &amp; Document Permissions</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link href="/admin/security" className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-md flex items-center justify-between font-semibold text-slate-800 hover:text-blue-700 transition-colors">
                <span>Security Alerts &amp; Monitoring</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>

          <Card title="Repository Taxonomies &amp; Schemas">
            <div className="space-y-2 text-xs">
              <Link href="/admin/document-types" className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-md flex items-center justify-between font-semibold text-slate-800 hover:text-blue-700 transition-colors">
                <span>Document Types &amp; Schema Builder</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link href="/admin/taxonomy" className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-md flex items-center justify-between font-semibold text-slate-800 hover:text-blue-700 transition-colors">
                <span>Taxonomy / Tags Manager</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link href="/admin/departments" className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-md flex items-center justify-between font-semibold text-slate-800 hover:text-blue-700 transition-colors">
                <span>Department Quotas</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>

          <Card title="Storage &amp; System Infrastructure">
            <div className="space-y-2 text-xs">
              <Link href="/admin/storage" className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-md flex items-center justify-between font-semibold text-slate-800 hover:text-blue-700 transition-colors">
                <span>Storage &amp; Checksum Integrity</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link href="/admin/reports" className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-md flex items-center justify-between font-semibold text-slate-800 hover:text-blue-700 transition-colors">
                <span>Usage &amp; Stale Content Reports</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link href="/admin/settings" className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-md flex items-center justify-between font-semibold text-slate-800 hover:text-blue-700 transition-colors">
                <span>System Configuration</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { LoadingState, EmptyState, ErrorState } from '@/src/components/ui/States';
import { 
  FileText, 
  Plus, 
  Search,
  Users,
  HardDrive,
  Activity,
  ArrowRight,
  Star,
  Share2,
  Upload,
  Folder
} from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';
import { RecentBlogsSection } from '@/src/components/dashboard/RecentBlogsSection';
import { TopContributorsSection } from '@/src/components/dashboard/TopContributorsSection';

interface AdminSummary {
  totalUsers: number;
  totalDocuments: number;
  storageQuotaUsedBytes: number;
  storageQuotaTotalBytes?: number;
  pendingOcrJobs?: number;
}

interface Document {
  id: string;
  title?: string;
  fileName?: string;
  department?: string;
  owner?: string;
  /** The API returns the current version as an object; older payloads used a plain string. */
  currentVersion?: string | { versionNumber?: number };
  confidentialityLevel?: string;
  securityClassification?: string;
  updatedAt?: string;
}

function getVersionLabel(doc: Document): string {
  if (!doc.currentVersion) return 'v1';
  if (typeof doc.currentVersion === 'string') return doc.currentVersion;
  return `v${doc.currentVersion.versionNumber ?? 1}`;
}

function getClassification(doc: Document): 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' {
  return (doc.confidentialityLevel || doc.securityClassification || 'INTERNAL') as
    'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export default function DashboardOverviewPage() {
  const { isAuthenticated, roles } = useAuth();
  const isAdmin = roles.includes('ROLE_ADMIN');

  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(isAdmin);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [docsLoading, setDocsLoading] = useState(true);

  const [myDocsCount, setMyDocsCount] = useState(0);
  const [myDocsLoading, setMyDocsLoading] = useState(false);
  const [favorites, setFavorites] = useState<Document[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [sharedCount, setSharedCount] = useState(0);
  const [sharedLoading, setSharedLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    setSummaryLoading(true);
    kmsApi.admin.getSummary()
      .then((data) => setSummary(data as AdminSummary))
      .catch((err: unknown) => setSummaryError(err instanceof Error ? err.message : 'Failed to load summary'))
      .finally(() => setSummaryLoading(false));
  }, [isAuthenticated, isAdmin]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setDocsLoading(true);
    kmsApi.documents.list(0, 5)
      .then((data) => {
        const items = Array.isArray(data) ? data : (data as { content?: Document[] }).content ?? [];
        setDocuments(items);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load documents';
        if (msg.includes('403')) {
          setDocsError('You do not have permission to view documents.');
        } else {
          setDocsError(msg);
        }
      })
      .finally(() => setDocsLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setMyDocsLoading(true);
    kmsApi.documents.mine()
      .then((data) => {
        const items = Array.isArray(data) ? data : (data as { content?: Document[] }).content ?? [];
        setMyDocsCount(items.length);
      })
      .catch(() => setMyDocsCount(0))
      .finally(() => setMyDocsLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setFavoritesLoading(true);
    kmsApi.documents.getFavorites()
      .then((data) => {
        const items = Array.isArray(data) ? data : (data as { content?: Document[] }).content ?? [];
        setFavorites(items.slice(0, 5));
      })
      .catch(() => setFavorites([]))
      .finally(() => setFavoritesLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setSharedLoading(true);
    kmsApi.documents.getSharedWithMe()
      .then((data) => {
        const items = Array.isArray(data) ? data : (data as { content?: Document[] }).content ?? [];
        setSharedCount(items.length);
      })
      .catch(() => setSharedCount(0))
      .finally(() => setSharedLoading(false));
  }, [isAuthenticated]);

  const docColumns = [
    {
      header: 'Title',
      accessor: (doc: Document) => (
        <div className="flex items-center gap-2 font-medium">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <Link href={`/preview/${doc.id}`} className="hover:text-blue-800 truncate">
            {doc.title || doc.fileName || doc.id}
          </Link>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: (doc: Document) => <span className="text-xs text-slate-600">{doc.department || '?'}</span>,
    },
    {
      header: 'Classification',
      accessor: (doc: Document) => {
        const classification = getClassification(doc);
        return <Badge label={classification} classification={classification} />;
      },
    },
    {
      header: 'Version',
      accessor: (doc: Document) => (
        <span className="font-mono text-xs text-blue-700 font-bold">{getVersionLabel(doc)}</span>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Workspace Banner */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-3">
          <div>
            <Breadcrumb items={[{ label: 'Dashboard Overview' }]} />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>INSA Enterprise</span>
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                Knowledge Hub
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Official INSA document repository, security classification labels, and compliance governance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/search">
              <Button variant="outline" size="sm" icon={<Search className="w-4 h-4" />}>
                Advanced Search
              </Button>
            </Link>
            {(roles.includes('ROLE_ADMIN') || roles.includes('ROLE_CONTRIBUTOR')) && (
              <>
                <Link href="/upload">
                  <Button variant="outline" size="sm" icon={<Plus className="w-4 h-4" />}>
                    Upload Document
                  </Button>
                </Link>
                <Link href="/articles/create">
                  <Button variant="primary" size="sm" icon={<FileText className="w-4 h-4" />}>
                    Create Article
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Admin Metrics Overview — only for admins */}
        {isAdmin && (
          <div>
            {summaryLoading && <LoadingState message="Loading system metrics..." />}
            {summaryError && (
              <ErrorState
                title="Could not load metrics"
                message={summaryError}
                onRetry={() => {
                  setSummaryError(null);
                  setSummaryLoading(true);
                  kmsApi.admin.getSummary()
                    .then((data) => setSummary(data as AdminSummary))
                    .catch((err: unknown) => setSummaryError(err instanceof Error ? err.message : 'Error'))
                    .finally(() => setSummaryLoading(false));
                }}
              />
            )}
            {!summaryLoading && !summaryError && summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* Blue card — Total Documents */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Managed Documents</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{summary.totalDocuments.toLocaleString()}</p>
                      <p className="text-[11px] text-slate-500 mt-1">Repository total</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-blue-700" />
                    </div>
                  </div>
                </div>

                {/* Green card — Total Users */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Users</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{summary.totalUsers.toLocaleString()}</p>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-1">Keycloak Realm Synced</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-emerald-700" />
                    </div>
                  </div>
                </div>

                {/* Cyan card — Storage */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Storage Used</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatBytes(summary.storageQuotaUsedBytes)}</p>
                      {summary.storageQuotaTotalBytes && (
                        <p className="text-[11px] text-slate-500 mt-1">of {formatBytes(summary.storageQuotaTotalBytes)} quota</p>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <HardDrive className="w-5 h-5 text-blue-700" />
                    </div>
                  </div>
                </div>

                {/* Amber card — OCR Queue */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">OCR Queue</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{(summary.pendingOcrJobs ?? 0).toLocaleString()}</p>
                      <p className={`text-[11px] font-semibold mt-1 ${(summary.pendingOcrJobs ?? 0) === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {(summary.pendingOcrJobs ?? 0) === 0 ? 'Pipeline Healthy' : 'Jobs Pending'}
                      </p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${(summary.pendingOcrJobs ?? 0) === 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                      <Activity className={`w-5 h-5 ${(summary.pendingOcrJobs ?? 0) === 0 ? 'text-emerald-700' : 'text-amber-700'}`} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Documents */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Recent Documents
            </h2>
            <Link href="/library" className="text-xs text-blue-700 hover:underline font-semibold flex items-center gap-1">
              Open Document Library <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {docsLoading && <LoadingState message="Loading recent documents..." />}
          {docsError && (
            <ErrorState
              title="Could not load documents"
              message={docsError}
              onRetry={() => {
                setDocsError(null);
                setDocsLoading(true);
                kmsApi.documents.list(0, 5)
                  .then((data) => {
                    const items = Array.isArray(data) ? data : (data as { content?: Document[] }).content ?? [];
                    setDocuments(items);
                  })
                  .catch((err: unknown) => setDocsError(err instanceof Error ? err.message : 'Error'))
                  .finally(() => setDocsLoading(false));
              }}
            />
          )}
          {!docsLoading && !docsError && documents.length === 0 && (
            <EmptyState
              title="No documents yet"
              message="The repository is empty. Upload the first document to get started."
              action={
                roles.includes('ROLE_ADMIN') || roles.includes('ROLE_CONTRIBUTOR') ? (
                  <Link href="/upload">
                    <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                      Upload First Document
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          )}
          {!docsLoading && !docsError && documents.length > 0 && (
            <Table
              columns={docColumns}
              data={documents}
              keyExtractor={(item) => item.id}
              emptyText="No recent documents."
            />
          )}
        </div>

        {/* Top 3 Active Employees / Contributors — Visible in everyone's dashboard */}
        <TopContributorsSection limit={3} />

        {/* 3 Recent Blogs — Visible in everyone's dashboard */}
        <RecentBlogsSection limit={3} />

        {/* Contributor Dashboard */}
        {!isAdmin && (
          <div className="space-y-6">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">My Documents</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                      {myDocsLoading ? '...' : myDocsCount.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Documents you uploaded</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-blue-700" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Shared With Me</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                      {sharedLoading ? '...' : sharedCount.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Documents shared with you</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5 text-emerald-700" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Favorites</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                      {favoritesLoading ? '...' : favorites.length.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Bookmarked documents</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-2.5 sm:gap-3">
                <Link href="/upload">
                  <Button variant="primary" size="sm" icon={<Upload className="w-4 h-4" />}>
                    Upload Document
                  </Button>
                </Link>
                <Link href="/search">
                  <Button variant="outline" size="sm" icon={<Search className="w-4 h-4" />}>
                    Search Documents
                  </Button>
                </Link>
                <Link href="/library">
                  <Button variant="outline" size="sm" icon={<Folder className="w-4 h-4" />}>
                    My Documents
                  </Button>
                </Link>
              </div>
            </div>

            {/* My Favorites */}
            {favorites.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">My Favorites</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {favorites.map((doc) => (
                    <Link key={doc.id} href={`/preview/${doc.id}`}>
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                            <Star className="w-4 h-4 text-amber-600 fill-amber-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {doc.title || doc.fileName || doc.id}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge
                                label={getClassification(doc)}
                                classification={getClassification(doc)}
                              />
                              <span className="text-[11px] text-slate-500">{doc.department || ''}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

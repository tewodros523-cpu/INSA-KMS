'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Tabs } from '@/src/components/ui/Tabs';
import { Alert } from '@/src/components/ui/Alert';
import { Card } from '@/src/components/ui/Card';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import {
  Download,
  Share2,
  History,
  MessageSquare,
  FileText,
  ShieldCheck,
  Tag,
  FileCheck,
  Calendar,
  User,
  Building,
  ExternalLink,
  Star,
  Send,
  Loader2,
  Bell,
  BellOff,
  BookOpen,
  Maximize2,
  ChevronDown,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';

interface ApiDocument {
  id: string;
  title?: string;
  fileName?: string;
  mimeType?: string;
  department?: string;
  owner?: string;
  ownerEmail?: string;
  documentType?: string;
  confidentialityLevel?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  status?: string;
  fileSizeBytes?: number;
  createdAt?: string;
  updatedAt?: string;
  folderName?: string | null;
  legalHold?: boolean;
  tags?: string[];
  currentVersion?: {
    versionNumber?: number;
    fileName?: string;
    createdAt?: string;
    storageObject?: { fileSizeBytes?: number; checksumSha256?: string };
  };
}

interface VersionRow {
  id: string;
  versionNumber: number;
  fileName?: string;
  changeSummary?: string;
  createdAt?: string;
  createdBy?: string;
  fileSizeBytes?: number;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

const INLINE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'text/plain'];

export default function DocumentPreviewWorkspacePage({ params }: { params: { id: string } }) {
  const docId = params.id;
  const { roles, user } = useAuth();
  const [activeTab, setActiveTab] = useState('metadata');
  const [doc, setDoc] = useState<ApiDocument | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subPrefs, setSubPrefs] = useState({ notifyVersions: true, notifyComments: true, notifyShares: true });
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [showSubPrefs, setShowSubPrefs] = useState(false);
  const [textContent, setTextContent] = useState<string[] | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      kmsApi.documents.getById(docId),
      kmsApi.documents.getVersions(docId).catch(() => []),
      kmsApi.documents.getFavoriteStatus(docId).catch(() => ({ favorited: false })),
      kmsApi.subscriptions.getDocStatus(docId).catch(() => ({ subscribed: false })),
      kmsApi.documents.getTextContent(docId).catch(() => null),
    ])
      .then(([docData, versionData, favData, subData, textData]) => {
        setDoc(docData as ApiDocument);
        setVersions((versionData ?? []) as VersionRow[]);
        setIsFavorited(favData.favorited);
        setIsSubscribed((subData as any).subscribed);
        if ((subData as any).notifyVersions !== undefined) {
          setSubPrefs({
            notifyVersions: (subData as any).notifyVersions,
            notifyComments: (subData as any).notifyComments,
            notifyShares: (subData as any).notifyShares,
          });
        }
        if (textData && Array.isArray(textData.paragraphs) && textData.paragraphs.length > 0) {
          setTextContent(textData.paragraphs);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load document'))
      .finally(() => setIsLoading(false));
  }, [docId]);

  useEffect(() => {
    load();
  }, [load]);


  // Stream the binary with the bearer token, then render it from a blob URL
  useEffect(() => {
    if (!doc) return;
    const mime = doc.mimeType || '';
    if (!INLINE_TYPES.includes(mime)) return;

    let revoked: string | null = null;
    let cancelled = false;
    kmsApi.documents
      .downloadBlob(docId, 'inline')
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setObjectUrl(url);
      })
      .catch((err: unknown) => setPreviewError(err instanceof Error ? err.message : 'Preview unavailable'));

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [doc, docId]);

  const handleDownload = async () => {
    try {
      const blob = await kmsApi.documents.downloadBlob(docId, 'attachment');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc?.fileName || doc?.title || 'document';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Download failed');
    }
  };



  const handleToggleFavorite = async () => {
    setFavoriteLoading(true);
    try {
      const res = await kmsApi.documents.toggleFavorite(docId);
      setIsFavorited(res.favorited);
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Could not update favorite status');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleToggleSubscription = async () => {
    setSubscriptionLoading(true);
    try {
      if (isSubscribed) {
        await kmsApi.subscriptions.unsubscribeDoc(docId);
        setIsSubscribed(false);
        setShowSubPrefs(false);
      } else {
        const res = await kmsApi.subscriptions.subscribeDoc(docId, subPrefs);
        setIsSubscribed(true);
        setShowSubPrefs(false);
        setStatusMessage('Subscribed to notifications for this document.');
      }
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Could not update subscription');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleUpdateSubPrefs = async (prefs: typeof subPrefs) => {
    setSubPrefs(prefs);
    try {
      await kmsApi.subscriptions.subscribeDoc(docId, prefs);
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Could not update preferences');
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <LoadingState message="Loading document..." />
      </AppShell>
    );
  }

  if (error || !doc) {
    return (
      <AppShell>
        <ErrorState title="Could not open document" message={error || 'Document not found'} onRetry={load} />
      </AppShell>
    );
  }

  const classification = (doc.confidentialityLevel || 'INTERNAL') as 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  const title = doc.title || doc.fileName || doc.id;
  const mime = doc.mimeType || '';
  const canInline = INLINE_TYPES.includes(mime);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-kms-slate-200 pb-3 gap-3">
          <div className="min-w-0">
            <Breadcrumb items={[{ label: 'Document Library', href: '/library' }, { label: title }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-700 shrink-0" />
              <span className="truncate">{title}</span>
              {doc.status && (
                <Badge
                  label={doc.status}
                  variant={doc.status === 'PUBLISHED' ? 'green' : doc.status === 'UNDER_REVIEW' ? 'amber' : doc.status === 'DRAFT' ? 'slate' : 'slate'}
                />
              )}
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1 font-mono">{doc.id}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              className="p-1.5 rounded hover:bg-kms-slate-100 text-kms-slate-500 hover:text-amber-500 disabled:opacity-50 transition-colors"
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {favoriteLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Star className={`w-4 h-4 ${isFavorited ? 'fill-amber-500 text-amber-500' : ''}`} />
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => { if (isSubscribed) setShowSubPrefs(!showSubPrefs); else handleToggleSubscription(); }}
                disabled={subscriptionLoading}
                className="p-1.5 rounded hover:bg-kms-slate-100 text-kms-slate-500 hover:text-blue-600 disabled:opacity-50 transition-colors"
                title={isSubscribed ? 'Notification preferences' : 'Subscribe to notifications'}
              >
                {subscriptionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSubscribed ? (
                  <Bell className="w-4 h-4 text-blue-600" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </button>
              {showSubPrefs && isSubscribed && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-kms-slate-200 rounded-lg shadow-lg p-3 z-50 w-52 space-y-2">
                  <div className="text-[11px] font-bold text-kms-slate-700 uppercase tracking-wider">Notify me about:</div>
                  {(['notifyVersions', 'notifyComments', 'notifyShares'] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-xs text-kms-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subPrefs[key]}
                        onChange={(e) => handleUpdateSubPrefs({ ...subPrefs, [key]: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      {key === 'notifyVersions' ? 'New versions' : key === 'notifyComments' ? 'New comments' : 'Share events'}
                    </label>
                  ))}
                  <button onClick={() => handleToggleSubscription()} className="text-[11px] text-red-600 hover:underline font-medium pt-1">
                    Unsubscribe
                  </button>
                </div>
              )}
            </div>
            <Link href={`/share/${doc.id}`}>
              <Button variant="outline" size="sm" icon={<Share2 className="w-4 h-4" />}>
                Share Link
              </Button>
            </Link>
            <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleDownload}>
              Download
            </Button>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-blue-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {doc.legalHold && (
          <Alert type="legal-hold" title="LITIGATION LEGAL HOLD ACTIVE">
            This document is frozen under an active legal hold. Retention disposition and deletion are suspended and
            blocked by database triggers until the hold is released.
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Viewer */}
          <div className="lg:col-span-8 space-y-3">
            <div className="bg-kms-slate-900 text-kms-slate-300 p-2 rounded flex items-center justify-between text-xs">
              <span className="font-mono truncate">{doc.fileName || '—'}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-kms-slate-400">{formatSize(doc.fileSizeBytes)}</span>
                <Badge label={classification} classification={classification} />
              </div>
            </div>

            <div className="kms-card bg-slate-100 border border-kms-slate-300 min-h-[360px] sm:min-h-[480px] md:min-h-[600px] flex items-center justify-center overflow-hidden shadow-inner p-4">
              {objectUrl && mime.startsWith('image/') ? (
                <img src={objectUrl} alt={title} className="max-h-[450px] sm:max-h-[600px] md:max-h-[750px] max-w-full object-contain bg-white rounded shadow-sm" />
              ) : objectUrl && mime === 'application/pdf' ? (
                <iframe src={objectUrl} title={title} className="w-full h-[450px] sm:h-[600px] md:h-[750px] bg-white rounded border-0" />
              ) : textContent && textContent.length > 0 ? (
                <div className="bg-white shadow-md p-6 sm:p-10 w-full max-w-3xl border border-slate-200 rounded-lg text-slate-800 font-sans leading-relaxed text-sm overflow-y-auto max-h-[600px] space-y-4">
                  <div className="border-b border-slate-200 pb-3 mb-3">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>File: <strong className="text-slate-700">{doc.fileName || 'Document'}</strong></span>
                      <span>•</span>
                      <Badge label={doc.status || 'PUBLISHED'} classification={classification} />
                    </div>
                  </div>
                  <div className="space-y-3 font-normal text-slate-800 leading-7">
                    {textContent.map((p, idx) => (
                      <p key={idx} className="whitespace-pre-wrap">{p}</p>
                    ))}
                  </div>
                </div>
              ) : objectUrl ? (
                <iframe src={objectUrl} title={title} className="w-full h-[450px] sm:h-[600px] md:h-[750px] bg-white rounded border-0" />
              ) : previewError ? (
                <div className="text-center p-8 space-y-3">
                  <FileText className="w-10 h-10 text-kms-slate-400 mx-auto" />
                  <p className="text-xs text-kms-slate-700 font-semibold">{previewError}</p>
                  <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleDownload}>
                    Download instead
                  </Button>
                </div>
              ) : (
                <div className="text-center p-8 space-y-3">
                  <FileText className="w-10 h-10 text-kms-slate-400 mx-auto" />
                  <p className="text-xs text-kms-slate-700 font-semibold">{title}</p>
                  <p className="text-[11px] text-kms-slate-500">Document ready for viewing.</p>
                  <div className="pt-2">
                    <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleDownload}>
                      Download File
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Inspector */}
          <div className="lg:col-span-4 space-y-4">
            <Card>
              <Tabs
                tabs={[
                  { id: 'metadata', label: 'Details' },
                  { id: 'versions', label: 'Versions', icon: <History className="w-3.5 h-3.5" /> },
                  { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-3.5 h-3.5" /> },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
              />

              <div className="pt-4 space-y-4 text-xs">
                {activeTab === 'metadata' && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-kms-slate-500 font-medium">Security Classification</div>
                      <div className="mt-1">
                        <Badge label={classification} classification={classification} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 divide-x divide-kms-slate-100">
                      <div>
                        <div className="text-kms-slate-500 flex items-center gap-1">
                          <User className="w-3 h-3 text-kms-slate-400" /> Owner
                        </div>
                        <div className="font-semibold text-kms-slate-900 mt-0.5 truncate" title={doc.ownerEmail}>
                          {doc.owner || '—'}
                        </div>
                      </div>
                      <div className="pl-3">
                        <div className="text-kms-slate-500 flex items-center gap-1">
                          <Building className="w-3 h-3 text-kms-slate-400" /> Department
                        </div>
                        <div className="font-semibold text-kms-slate-900 mt-0.5">{doc.department || '—'}</div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-kms-slate-100">
                      <div className="flex justify-between text-kms-slate-600">
                        <span>Document Type:</span>
                        <span className="font-medium text-kms-slate-900">{doc.documentType || '—'}</span>
                      </div>
                      <div className="flex justify-between text-kms-slate-600">
                        <span>Workflow Status:</span>
                        <span className="font-mono font-bold text-blue-700">{doc.status || '—'}</span>
                      </div>
                      <div className="flex justify-between text-kms-slate-600">
                        <span>Current Version:</span>
                        <span className="font-mono font-bold text-blue-700">v{doc.currentVersion?.versionNumber ?? 1}</span>
                      </div>
                      <div className="flex justify-between text-kms-slate-600">
                        <span>File Size:</span>
                        <span className="font-medium text-kms-slate-900">{formatSize(doc.fileSizeBytes)}</span>
                      </div>
                      <div className="flex justify-between text-kms-slate-600">
                        <span>Folder:</span>
                        <span className="font-medium text-kms-slate-900">{doc.folderName || 'Unfiled'}</span>
                      </div>
                      <div className="flex justify-between text-kms-slate-600">
                        <span>Created:</span>
                        <span className="font-medium text-kms-slate-900">{formatDate(doc.createdAt)}</span>
                      </div>
                      <div className="flex justify-between text-kms-slate-600">
                        <span>Last Modified:</span>
                        <span className="font-medium text-kms-slate-900">{formatDate(doc.updatedAt)}</span>
                      </div>
                    </div>

                    {doc.currentVersion?.storageObject?.checksumSha256 && (
                      <div className="pt-2 border-t border-kms-slate-100 space-y-1">
                        <div className="text-kms-slate-500 font-medium">SHA-256 Integrity Checksum</div>
                        <div className="font-mono text-[10px] text-kms-slate-700 break-all bg-kms-slate-50 p-2 rounded border border-kms-slate-200">
                          {doc.currentVersion.storageObject.checksumSha256}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-kms-slate-100 space-y-1">
                      <div className="text-kms-slate-500 font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3 text-kms-slate-400" /> Taxonomy Tags
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(doc.tags ?? []).length === 0 ? (
                          <span className="text-[11px] text-kms-slate-500">No tags assigned</span>
                        ) : (
                          doc.tags!.map((tag) => (
                            <span key={tag} className="bg-kms-slate-100 text-kms-slate-700 px-2 py-0.5 rounded text-[11px] border border-kms-slate-200">
                              #{tag}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'versions' && (
                  <div className="space-y-2">
                    {versions.length === 0 ? (
                      <p className="text-[11px] text-kms-slate-500">No version history recorded.</p>
                    ) : (
                      versions.map((v) => (
                        <div key={v.id} className="border border-kms-slate-200 rounded p-2 bg-kms-slate-50">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-blue-700 text-[11px]">v{v.versionNumber}</span>
                            <span className="text-[11px] text-kms-slate-500">{formatSize(v.fileSizeBytes)}</span>
                          </div>
                          <div className="text-[11px] text-kms-slate-700 truncate mt-0.5">{v.fileName}</div>
                          <div className="text-[10px] text-kms-slate-500 mt-0.5">
                            {v.createdBy || '—'} · {formatDate(v.createdAt)}
                          </div>
                          {v.changeSummary && (
                            <div className="text-[10px] text-kms-slate-600 mt-1 italic">{v.changeSummary}</div>
                          )}
                        </div>
                      ))
                    )}
                    <Link href={`/versions/${doc.id}`}>
                      <Button variant="outline" size="sm" className="w-full justify-center" icon={<History className="w-3.5 h-3.5" />}>
                        View Full Revision Timeline
                      </Button>
                    </Link>
                  </div>
                )}

                {activeTab === 'comments' && (
                  <div className="space-y-2">
                    <Link href={`/comments/${doc.id}`}>
                      <Button variant="outline" size="sm" className="w-full justify-center" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                        Open Discussion Workspace
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Retention & Governance">
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-1 text-kms-slate-500 font-medium">
                  <Calendar className="w-3 h-3 text-kms-slate-400" /> Retention is applied by document type
                </div>
                <p className="text-kms-slate-600">
                  Schedules for <span className="font-semibold">{doc.documentType || 'this type'}</span> are configured
                  under Governance → Retention Policies, and enforced daily by the disposition engine.
                </p>
                {doc.legalHold && (
                  <p className="text-amber-800 font-semibold pt-1">Disposition suspended — active legal hold.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

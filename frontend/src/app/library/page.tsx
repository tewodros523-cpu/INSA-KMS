'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Card } from '@/src/components/ui/Card';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Pagination } from '@/src/components/ui/Pagination';
import { Modal } from '@/src/components/ui/Modal';
import { Input, Select } from '@/src/components/ui/Input';
import { LoadingState, EmptyState, ErrorState } from '@/src/components/ui/States';
import { 
  FileText, 
  Plus, 
  Filter, 
  FileCheck, 
  Share2, 
  FolderPlus,
  ShieldCheck,
  History,
  LayoutGrid,
  List,
  Eye,
  BookOpen,
  Building2,
  Calendar,
  HardDrive,
  Search,
  X,
  ChevronDown,
  ArrowRight,
  FileSpreadsheet,
  FileCode,
  FileImage,
  FileArchive,
  Presentation,
  Clock,
  Sparkles,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';

interface ApiDocument {
  id: string;
  title?: string;
  fileName?: string;
  department?: string;
  ownerDepartment?: { name?: string; code?: string };
  owner?: string;
  author?: { fullName?: string; username?: string; email?: string } | string;
  status?: string;
  confidentialityLevel?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  securityClassification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  currentVersion?: string | {
    versionNumber?: number;
    fileName?: string;
    mimeType?: string;
    changeSummary?: string;
    extractedText?: string;
    storageObject?: {
      fileSizeBytes?: number;
      checksumSha256?: string;
      contentType?: string;
    };
  };
  fileSizeBytes?: number;
  mimeType?: string;
  updatedAt?: string;
  isCheckedOut?: boolean;
  checkedOutBy?: string;
  description?: string;
  summary?: string;
  articleContent?: string;
  extractedText?: string;
  knowledgeType?: string;
  isArticle?: boolean;
}

function getDocDepartment(doc: ApiDocument): string {
  return doc.department || doc.ownerDepartment?.name || doc.ownerDepartment?.code || 'General';
}

function getDocClassification(doc: ApiDocument): 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' {
  return (doc.securityClassification || doc.confidentialityLevel || 'INTERNAL') as any;
}

function getDocVersionString(doc: ApiDocument): string {
  if (!doc.currentVersion) return 'v1';
  if (typeof doc.currentVersion === 'string') return doc.currentVersion;
  return `v${doc.currentVersion.versionNumber || 1}`;
}

function getDocSizeBytes(doc: ApiDocument): number | undefined {
  if (typeof doc.fileSizeBytes === 'number') return doc.fileSizeBytes;
  if (typeof doc.currentVersion === 'object' && doc.currentVersion?.storageObject?.fileSizeBytes) {
    return doc.currentVersion.storageObject.fileSizeBytes;
  }
  return undefined;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '?';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}

function getDocFileName(doc: ApiDocument): string {
  if (typeof doc.currentVersion === 'object' && doc.currentVersion?.fileName) {
    return doc.currentVersion.fileName;
  }
  return doc.fileName || doc.title || '';
}

function getDocMimeType(doc: ApiDocument): string {
  if (typeof doc.currentVersion === 'object' && (doc.currentVersion as any)?.mimeType) {
    return (doc.currentVersion as any).mimeType;
  }
  return (doc as any).mimeType || '';
}

function getDocSummary(doc: ApiDocument): string | null {
  if (doc.description) return doc.description;
  if (typeof doc.currentVersion === 'object' && (doc.currentVersion as any)?.changeSummary) {
    return (doc.currentVersion as any).changeSummary;
  }
  return null;
}

interface FileTypeDesign {
  ext: string;
  label: string;
  badgeBg: string;
  headerBg: string;
  accentDot: string;
  accentGradient: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getFileTypeDesign(doc: ApiDocument, isArticle: boolean): FileTypeDesign {
  if (isArticle) {
    return {
      ext: doc.knowledgeType || 'ARTICLE',
      label: 'Knowledge Article',
      badgeBg: 'bg-emerald-500/15 text-emerald-800 border-emerald-300/80',
      headerBg: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      accentDot: 'bg-emerald-500',
      accentGradient: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800',
      icon: BookOpen,
    };
  }

  const fileName = getDocFileName(doc);
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || '' : '';
  const mime = getDocMimeType(doc).toLowerCase();

  if (ext === 'pdf' || mime.includes('pdf')) {
    return {
      ext: 'PDF',
      label: 'PDF Document',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      headerBg: 'from-rose-500/20 via-red-500/10 to-transparent',
      accentDot: 'bg-rose-500',
      accentGradient: 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-800',
      icon: FileText,
    };
  }

  if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || mime.includes('word')) {
    return {
      ext: 'DOCX',
      label: 'Word Document',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      headerBg: 'from-blue-500/20 via-indigo-500/10 to-transparent',
      accentDot: 'bg-blue-500',
      accentGradient: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800',
      icon: FileText,
    };
  }

  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheet')) {
    return {
      ext: 'XLSX',
      label: 'Spreadsheet',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      headerBg: 'from-emerald-500/20 via-green-500/10 to-transparent',
      accentDot: 'bg-emerald-500',
      accentGradient: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800',
      icon: FileSpreadsheet,
    };
  }

  if (['ppt', 'pptx', 'odp'].includes(ext) || mime.includes('presentation')) {
    return {
      ext: 'PPTX',
      label: 'Presentation',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      headerBg: 'from-amber-500/20 via-orange-500/10 to-transparent',
      accentDot: 'bg-amber-500',
      accentGradient: 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-800',
      icon: Presentation,
    };
  }

  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext) || mime.includes('image')) {
    return {
      ext: ext.toUpperCase() || 'IMAGE',
      label: 'Image Asset',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      headerBg: 'from-purple-500/20 via-fuchsia-500/10 to-transparent',
      accentDot: 'bg-purple-500',
      accentGradient: 'bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 hover:from-purple-700 hover:to-violet-800',
      icon: FileImage,
    };
  }

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mime.includes('zip') || mime.includes('compressed')) {
    return {
      ext: 'ZIP',
      label: 'Archive',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
      headerBg: 'from-yellow-500/20 via-amber-500/10 to-transparent',
      accentDot: 'bg-amber-600',
      accentGradient: 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-700 hover:to-yellow-800',
      icon: FileArchive,
    };
  }

  if (['json', 'xml', 'sql', 'js', 'ts', 'java', 'py', 'html', 'css'].includes(ext)) {
    return {
      ext: ext.toUpperCase(),
      label: 'Code File',
      badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      headerBg: 'from-cyan-500/20 via-sky-500/10 to-transparent',
      accentDot: 'bg-cyan-500',
      accentGradient: 'bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-700 hover:from-cyan-700 hover:to-blue-800',
      icon: FileCode,
    };
  }

  return {
    ext: ext ? ext.toUpperCase() : 'DOC',
    label: 'Document',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    headerBg: 'from-blue-500/20 via-indigo-500/10 to-transparent',
    accentDot: 'bg-indigo-500',
    accentGradient: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800',
    icon: FileText,
  };
}

function extractArticleCoverImage(doc: any): string | null {
  const text = doc.articleContent || doc.extractedText || doc.content || '';
  if (!text) return null;

  const mdMatch = text.match(/!\[.*?\]\((.*?)\)/);
  if (mdMatch && mdMatch[1]) {
    return mdMatch[1];
  }

  const htmlMatch = text.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1];
  }

  return null;
}

export default function DocumentLibraryPage() {
  const { roles } = useAuth();
  const canWrite = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_CONTRIBUTOR');

  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 10;

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedDoc, setSelectedDoc] = useState<ApiDocument | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedDocType, setSelectedDocType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});
  const [departmentsList, setDepartmentsList] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [docTypesList, setDocTypesList] = useState<Array<{ id: string; name: string }>>([]);
  const [libraryMessage, setLibraryMessage] = useState<string | null>(null);
  const [folderCreating, setFolderCreating] = useState(false);

  const toggleDeptCollapse = (deptName: string) => {
    setCollapsedDepts((prev) => ({
      ...prev,
      [deptName]: !prev[deptName],
    }));
  };

  useEffect(() => {
    kmsApi.departments.getActive()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as any)?.content || [];
        setDepartmentsList(list);
      })
      .catch(() => {});
    kmsApi.documentTypes.getActive()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as any)?.content || [];
        setDocTypesList(list);
      })
      .catch(() => {});
  }, []);

  const loadDocuments = useCallback((
    page: number = currentPage,
    deptId: string = selectedDept,
    typeId: string = selectedDocType,
    conf: string = filterClass,
    status: string = selectedStatus,
    query: string = searchQuery
  ) => {
    setIsLoading(true);
    setError(null);
    const filters = {
      departmentId: deptId !== 'ALL' ? deptId : undefined,
      docTypeId: typeId !== 'ALL' ? typeId : undefined,
      confidentiality: conf !== 'ALL' ? conf : undefined,
      status: status !== 'ALL' ? status : undefined,
      search: query.trim() || undefined,
    };
    kmsApi.documents.list(page, PAGE_SIZE, filters)
      .then((data) => {
        let docs: ApiDocument[];
        if (Array.isArray(data)) {
          docs = data as ApiDocument[];
          setDocuments(docs);
          setTotalPages(1);
          setTotalItems(docs.length);
        } else {
          const paged = data as { content?: ApiDocument[]; totalPages?: number; totalElements?: number };
          docs = paged.content ?? [];
          setDocuments(docs);
          setTotalPages(paged.totalPages ?? 1);
          setTotalItems(paged.totalElements ?? 0);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load documents';
        setError(msg.includes('403') ? 'You do not have permission to view the document library.' : msg);
      })
      .finally(() => setIsLoading(false));
  }, [currentPage, selectedDept, selectedDocType, filterClass, selectedStatus, searchQuery]);

  useEffect(() => {
    loadDocuments(currentPage, selectedDept, selectedDocType, filterClass, selectedStatus, searchQuery);
  }, [loadDocuments, currentPage, selectedDept, selectedDocType, filterClass, selectedStatus, searchQuery]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setFolderCreating(true);
    try {
      await kmsApi.folders.create({ name: newFolderName.trim() });
      setIsFolderModalOpen(false);
      setNewFolderName('');
      setLibraryMessage('Folder created successfully.');
      loadDocuments(currentPage, selectedDept, selectedDocType, filterClass, selectedStatus, searchQuery);
    } catch (err: unknown) {
      setLibraryMessage(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setFolderCreating(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedDept('ALL');
    setSelectedDocType('ALL');
    setFilterClass('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
    setCurrentPage(0);
  };

  const filteredDocs = documents;

  const groupedDocs = React.useMemo(() => {
    const map = new Map<string, ApiDocument[]>();
    for (const doc of filteredDocs) {
      const deptName = getDocDepartment(doc);
      if (!map.has(deptName)) {
        map.set(deptName, []);
      }
      map.get(deptName)!.push(doc);
    }
    return map;
  }, [filteredDocs]);

  const columns = [
    {
      header: 'Title',
      accessor: (doc: ApiDocument & { isArticle?: boolean; knowledgeType?: string }) => {
        const isArt = doc.isArticle || doc.fileName?.endsWith('.md') || doc.knowledgeType === 'SOP';
        const targetUrl = isArt ? `/articles/${doc.id}` : `/preview/${doc.id}`;
        return (
          <div className="flex items-center gap-2.5">
            <FileText className={`w-4 h-4 shrink-0 ${isArt ? 'text-emerald-600' : 'text-blue-700'}`} />
            <div>
              <Link href={targetUrl} className="font-medium text-kms-slate-900 hover:text-blue-800 flex items-center gap-1.5">
                {doc.title || doc.fileName || doc.id}
                {isArt && <Badge label={doc.knowledgeType || 'ARTICLE'} variant="blue" />}
              </Link>
              {doc.isCheckedOut && (
                <span className="ml-2">
                  <Badge label="CHECKED OUT" stateBadge="CHECKED_OUT" />
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Department',
      accessor: (doc: ApiDocument) => <span className="text-xs text-kms-slate-600">{getDocDepartment(doc)}</span>,
    },
    {
      header: 'Version',
      accessor: (doc: ApiDocument) => (
        <Link href={`/versions/${doc.id}`} className="font-mono text-xs text-blue-700 hover:underline font-bold">
          {getDocVersionString(doc)}
        </Link>
      ),
    },
    {
      header: 'Classification',
      accessor: (doc: ApiDocument) => {
        const cls = getDocClassification(doc);
        return <Badge label={cls} classification={cls} />;
      },
    },
    {
      header: 'Size',
      accessor: (doc: ApiDocument) => <span className="text-xs text-kms-slate-500">{formatFileSize(getDocSizeBytes(doc))}</span>,
    },
    {
      header: 'Actions',
      accessor: (doc: ApiDocument & { isArticle?: boolean }) => {
        const isArt = doc.isArticle || doc.fileName?.endsWith('.md');
        const targetUrl = isArt ? `/articles/${doc.id}` : `/preview/${doc.id}`;
        return (
          <div className="flex items-center gap-1">
            <Link href={targetUrl}>
              <Button variant="ghost" size="sm" icon={<FileCheck className="w-3.5 h-3.5" />} title="View / Preview" />
            </Link>
            <Link href={`/share/${doc.id}`}>
              <Button variant="ghost" size="sm" icon={<Share2 className="w-3.5 h-3.5" />} title="Share" />
            </Link>
            <Link href={`/versions/${doc.id}`}>
              <Button variant="ghost" size="sm" icon={<History className="w-3.5 h-3.5" />} title="Version History" />
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-kms-slate-200 pb-3 gap-3">
          <div>
            <Breadcrumb items={[{ label: 'Document Library' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight">
              Document &amp; Knowledge Library
            </h1>
          </div>

          {canWrite && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<FolderPlus className="w-4 h-4" />}
                onClick={() => setIsFolderModalOpen(true)}
              >
                New Folder
              </Button>
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
            </div>
          )}
        </div>

        {libraryMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>{libraryMessage}</span>
            </div>
            <button onClick={() => setLibraryMessage(null)} className="text-blue-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Filter & View Mode Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white p-3 border border-kms-slate-200 rounded-xl shadow-2xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-kms-slate-700 font-semibold shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Filters:</span>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-48 lg:w-52 shrink-0">
              <Search className="w-3.5 h-3.5 text-kms-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCurrentPage(0);
                    loadDocuments(0, selectedDept, selectedDocType, filterClass, selectedStatus, searchQuery);
                  }
                }}
                className="w-full text-xs pl-8 pr-7 py-1.5 border border-kms-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(0);
                    loadDocuments(0, selectedDept, selectedDocType, filterClass, selectedStatus, '');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-kms-slate-400 hover:text-kms-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Department Filter */}
            <Select
              containerClassName="w-auto shrink-0"
              options={[
                { label: 'All Departments', value: 'ALL' },
                ...departmentsList.map((d) => ({ label: `${d.name} (${d.code})`, value: d.id })),
              ]}
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(0);
              }}
              className="w-40 sm:w-44 text-xs"
            />

            {/* Document Category Filter */}
            <Select
              containerClassName="w-auto shrink-0"
              options={[
                { label: 'All Categories / Types', value: 'ALL' },
                ...docTypesList.map((t) => ({ label: t.name, value: t.id })),
              ]}
              value={selectedDocType}
              onChange={(e) => {
                setSelectedDocType(e.target.value);
                setCurrentPage(0);
              }}
              className="w-40 sm:w-44 text-xs"
            />

            {/* Status Filter */}
            <Select
              containerClassName="w-auto shrink-0"
              options={[
                { label: 'All Statuses', value: 'ALL' },
                { label: 'PUBLISHED', value: 'PUBLISHED' },
                { label: 'UNDER_REVIEW', value: 'UNDER_REVIEW' },
                { label: 'DRAFT', value: 'DRAFT' },
                { label: 'ARCHIVED', value: 'ARCHIVED' },
              ]}
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(0);
              }}
              className="w-32 sm:w-36 text-xs"
            />

            {/* Classification Filter */}
            <Select
              containerClassName="w-auto shrink-0"
              options={[
                { label: 'All Classifications', value: 'ALL' },
                { label: 'PUBLIC', value: 'PUBLIC' },
                { label: 'INTERNAL', value: 'INTERNAL' },
                { label: 'CONFIDENTIAL', value: 'CONFIDENTIAL' },
                { label: 'RESTRICTED', value: 'RESTRICTED' },
              ]}
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setCurrentPage(0);
              }}
              className="w-32 sm:w-36 text-xs"
            />

            {(selectedDept !== 'ALL' || selectedDocType !== 'ALL' || filterClass !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-700 hover:text-blue-900 font-medium underline px-1 py-1 whitespace-nowrap shrink-0"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end xl:self-center">
            <div className="text-xs text-kms-slate-500 font-medium whitespace-nowrap">
              Showing <span className="font-semibold text-kms-slate-800">{filteredDocs.length}</span>
              {totalItems > documents.length && ` of ${totalItems} total`} items
            </div>

            <div className="flex items-center gap-1 bg-kms-slate-100 p-1 rounded-lg border border-kms-slate-200 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid Card View"
                className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white shadow-xs' : 'text-kms-slate-600 hover:text-kms-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Table List View"
                className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'table' ? 'bg-blue-600 text-white shadow-xs' : 'text-kms-slate-600 hover:text-kms-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {isLoading && <LoadingState message="Loading documents..." />}
        {error && <ErrorState title="Failed to load documents" message={error} onRetry={() => loadDocuments(currentPage)} />}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className={`space-y-4 ${selectedDoc ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
              {filteredDocs.length === 0 ? (
                <EmptyState
                  title="No documents found"
                  message="The repository is empty or no documents match your current filters."
                  action={canWrite ? (
                    <div className="flex items-center gap-2">
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
                    </div>
                  ) : undefined}
                />
              ) : (
                <>
                <div className="space-y-6">
                  {Array.from(groupedDocs.entries()).map(([deptName, docsInDept]) => {
                    const isCollapsed = collapsedDepts[deptName] || false;
                    return (
                      <div key={deptName} className="space-y-3.5">
                        {/* Department Group Banner */}
                        <div
                          onClick={() => toggleDeptCollapse(deptName)}
                          className="flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-white to-kms-slate-50 border border-kms-slate-200/90 hover:border-blue-300 rounded-xl px-4 py-2.5 shadow-2xs cursor-pointer transition-all select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="flex items-center gap-2.5">
                              <h2 className="text-sm font-bold text-kms-slate-900 tracking-tight">
                                {deptName}
                              </h2>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800 border border-blue-200/60">
                                {docsInDept.length} {docsInDept.length === 1 ? 'document' : 'documents'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-kms-slate-400 hover:text-kms-slate-700 p-1"
                            title={isCollapsed ? 'Expand Department' : 'Collapse Department'}
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                          </button>
                        </div>

                        {/* Department Content */}
                        {!isCollapsed && (
                          viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                              {docsInDept.map((doc: ApiDocument & { isArticle?: boolean; knowledgeType?: string }) => {
                                const isArt = Boolean(doc.isArticle || doc.fileName?.endsWith('.md') || doc.knowledgeType === 'SOP');
                                const coverImg = isArt ? extractArticleCoverImage(doc) : null;
                                const targetUrl = isArt ? `/articles/${doc.id}` : `/preview/${doc.id}`;
                                const cls = getDocClassification(doc);
                                const dept = getDocDepartment(doc);
                                const versionStr = getDocVersionString(doc);
                                const sizeStr = formatFileSize(getDocSizeBytes(doc));
                                const typeInfo = getFileTypeDesign(doc, isArt);
                                const TypeIcon = typeInfo.icon;
                                const fileName = getDocFileName(doc);
                                const summary = getDocSummary(doc);
                                const docTitle = doc.title || fileName || doc.id;

                                return (
                                  <div
                                    key={doc.id}
                                    className="bg-white rounded-2xl border border-kms-slate-200/90 hover:border-blue-400/80 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1.5 ring-1 ring-black/5"
                                  >
                                    <div>
                                      {/* Top Visual Canvas Header */}
                                      {isArt && coverImg ? (
                                        <div className="relative h-44 w-full bg-kms-slate-950 overflow-hidden select-none">
                                          <img
                                            src={coverImg}
                                            alt={docTitle}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-85"
                                            onError={(e) => {
                                              (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                                            }}
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-kms-slate-950 via-kms-slate-950/40 to-black/30 p-3.5 flex flex-col justify-between">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/90 text-white backdrop-blur-md shadow-xs">
                                                <BookOpen className="w-3 h-3" />
                                                <span>{doc.knowledgeType || 'ARTICLE'}</span>
                                              </span>
                                              <Badge label={cls} classification={cls} />
                                            </div>

                                            <div className="space-y-1">
                                              <div className="flex items-center gap-1.5 text-[10px] text-emerald-200 font-bold uppercase tracking-widest">
                                                <Sparkles className="w-3 h-3 text-emerald-300" />
                                                <span>Knowledge Base</span>
                                              </div>
                                              <Link
                                                href={targetUrl}
                                                className="text-base font-extrabold text-white group-hover:text-emerald-200 transition-colors line-clamp-2 leading-snug drop-shadow-md"
                                              >
                                                {docTitle}
                                              </Link>
                                            </div>
                                          </div>
                                        </div>
                                      ) : isArt ? (
                                        <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 p-3.5 flex flex-col justify-between select-none">
                                          {/* Abstract aesthetic accents */}
                                          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                                          <div className="absolute left-1/3 -top-6 w-24 h-24 rounded-full bg-emerald-400/20 blur-lg pointer-events-none" />

                                          <div className="flex items-center justify-between gap-2 relative z-10">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-md shadow-2xs">
                                              <BookOpen className="w-3 h-3" />
                                              <span>{doc.knowledgeType || 'ARTICLE'}</span>
                                            </span>
                                            <Badge label={cls} classification={cls} />
                                          </div>

                                          <div className="relative z-10 space-y-1">
                                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-200 font-bold uppercase tracking-widest">
                                              <Sparkles className="w-3 h-3 text-emerald-300" />
                                              <span>Knowledge Article</span>
                                            </div>
                                            <Link
                                              href={targetUrl}
                                              className="text-base font-extrabold text-white group-hover:text-emerald-100 transition-colors line-clamp-2 leading-snug drop-shadow-sm"
                                            >
                                              {docTitle}
                                            </Link>
                                          </div>
                                        </div>
                                      ) : (
                                        /* Document Modern Card Visual Header with Simulated Document Sheet Preview */
                                        <div className={`relative h-36 w-full overflow-hidden bg-gradient-to-br ${typeInfo.headerBg} border-b border-kms-slate-200/70 p-3.5 flex flex-col justify-between select-none`}>
                                          <div className="flex items-center justify-between gap-2 relative z-10">
                                            <div className="flex items-center gap-1.5">
                                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold tracking-wide uppercase shadow-2xs ${typeInfo.badgeBg}`}>
                                                <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                                                <span>{typeInfo.ext}</span>
                                              </span>
                                              <Badge label={cls} classification={cls} />
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                              {doc.isCheckedOut && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                                                  <Lock className="w-2.5 h-2.5 text-amber-600" />
                                                  <span>Locked</span>
                                                </span>
                                              )}
                                              {doc.status === 'PUBLISHED' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                  <span>Published</span>
                                                </span>
                                              )}
                                              {doc.status === 'UNDER_REVIEW' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                                                  <Clock className="w-2.5 h-2.5 text-amber-600" />
                                                  <span>Review</span>
                                                </span>
                                              )}
                                              {doc.status === 'DRAFT' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                  <span>Draft</span>
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Simulated Tactile Document Sheet Preview */}
                                          <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
                                            <div className="w-48 h-20 bg-white/95 backdrop-blur-xs rounded-t-xl shadow-md border-t border-x border-kms-slate-200/90 p-3 space-y-1.5 transform translate-y-3 group-hover:translate-y-1 group-hover:scale-102 transition-all duration-300">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                  <div className={`w-2 h-2 rounded-full ${typeInfo.accentDot}`} />
                                                  <div className="h-1.5 w-16 bg-kms-slate-300 rounded-full" />
                                                </div>
                                                <div className="h-1.5 w-7 bg-kms-slate-200 rounded-full" />
                                              </div>
                                              <div className="h-1.5 w-full bg-kms-slate-100 rounded-full" />
                                              <div className="h-1.5 w-5/6 bg-kms-slate-100 rounded-full" />
                                              <div className="h-1.5 w-3/4 bg-kms-slate-100 rounded-full" />
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Card Body Details */}
                                      <div className="p-4 space-y-3">
                                        {/* Document Title (if not shown in article header) */}
                                        {!isArt && (
                                          <div className="space-y-1">
                                            <Link
                                              href={targetUrl}
                                              className="text-sm font-extrabold text-kms-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug tracking-tight"
                                              title={docTitle}
                                            >
                                              {docTitle}
                                            </Link>
                                            {fileName && doc.title && fileName !== doc.title && (
                                              <p className="text-[11px] font-mono text-kms-slate-400 truncate flex items-center gap-1">
                                                <FileText className="w-3 h-3 text-kms-slate-400 shrink-0" />
                                                <span className="truncate">{fileName}</span>
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        {/* Excerpt / Summary */}
                                        {summary && (
                                          <p className="text-xs text-kms-slate-600 line-clamp-2 leading-relaxed">
                                            {summary}
                                          </p>
                                        )}

                                        {/* Metadata Pill Bar */}
                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-kms-slate-100 text-[11px] text-kms-slate-600">
                                          <div className="flex items-center gap-1.5 bg-kms-slate-50 px-2.5 py-1 rounded-lg border border-kms-slate-200/70 font-medium">
                                            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                            <span className="truncate max-w-[130px]">{dept}</span>
                                          </div>

                                          <Link
                                            href={`/versions/${doc.id}`}
                                            className="flex items-center gap-1 font-mono text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 px-2 py-1 rounded-md border border-blue-200/60 transition-colors"
                                            title="View Version History"
                                          >
                                            <span>{versionStr}</span>
                                          </Link>
                                        </div>

                                        {/* Additional Stats Strip */}
                                        <div className="flex items-center justify-between text-[11px] text-kms-slate-400 font-medium px-0.5">
                                          <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-kms-slate-400 shrink-0" />
                                            <span>{new Date(doc.updatedAt || Date.now()).toLocaleDateString()}</span>
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            <HardDrive className="w-3.5 h-3.5 text-kms-slate-400 shrink-0" />
                                            <span>{sizeStr}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="p-4 pt-0">
                                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-kms-slate-100">
                                        <Link href={targetUrl} className="flex-1">
                                          <button
                                            className={`w-full text-xs font-bold py-2.5 px-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-2xs hover:shadow-md text-white ${typeInfo.accentGradient} group/btn`}
                                          >
                                            <TypeIcon className="w-4 h-4 shrink-0 transition-transform group-hover/btn:scale-110" />
                                            <span>{isArt ? 'Read Article' : 'Preview Document'}</span>
                                            <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover/btn:translate-x-1 group-hover/btn:opacity-100 transition-all" />
                                          </button>
                                        </Link>

                                        <div className="flex items-center gap-1">
                                          <Link href={`/share/${doc.id}`}>
                                            <button
                                              title="Share Document"
                                              className="p-2 text-kms-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-kms-slate-200/80 transition-colors"
                                            >
                                              <Share2 className="w-4 h-4" />
                                            </button>
                                          </Link>
                                          <Link href={`/versions/${doc.id}`}>
                                            <button
                                              title="Version History"
                                              className="p-2 text-kms-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-xl border border-kms-slate-200/80 transition-colors"
                                            >
                                              <History className="w-4 h-4" />
                                            </button>
                                          </Link>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <Table
                              columns={columns}
                              data={docsInDept}
                              keyExtractor={(item: ApiDocument) => item.id}
                              emptyText="No documents match your active filters in this department."
                            />
                          )
                        )}
                      </div>
                    );
                  })}
                </div>

                  <Pagination
                    currentPage={currentPage + 1}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => setCurrentPage(page - 1)}
                  />
                </>
              )}
            </div>

            {/* Metadata Inspector Drawer */}
            {selectedDoc && (
              <div className="kms-card p-4 space-y-4 bg-white border border-kms-slate-300">
                <div className="flex items-center justify-between border-b border-kms-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-kms-slate-800 uppercase tracking-wide">
                    Metadata Inspector
                  </h3>
                  <button onClick={() => setSelectedDoc(null)} className="text-xs text-kms-slate-400 hover:text-kms-slate-700 font-bold">
                    ✕
                  </button>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-kms-slate-400 font-bold">Title</label>
                  <p className="text-xs font-bold text-kms-slate-900">{selectedDoc.title || selectedDoc.fileName}</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-kms-slate-400 font-bold">Classification</label>
                  <div className="mt-1">
                    <Badge label={getDocClassification(selectedDoc)} classification={getDocClassification(selectedDoc)} />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-kms-slate-400 font-bold">Department</label>
                  <p className="text-xs text-kms-slate-700">{getDocDepartment(selectedDoc)}</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-kms-slate-400 font-bold">Version</label>
                  <p className="text-xs font-mono font-bold text-blue-700">{getDocVersionString(selectedDoc)}</p>
                </div>

                <div className="pt-2 border-t border-kms-slate-200 flex flex-col gap-2">
                  <Link href={`/preview/${selectedDoc.id}`}>
                    <Button variant="primary" size="sm" className="w-full" icon={<FileCheck className="w-3.5 h-3.5" />}>
                      Open Preview
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title="Create New Folder">
        <div className="space-y-4">
          <Input
            label="Folder Name"
            placeholder="e.g., Q3 Financial Reports"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateFolder} disabled={folderCreating}>
              {folderCreating ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

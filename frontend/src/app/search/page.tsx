'use client';

import React, { useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Select } from '@/src/components/ui/Input';
import { Badge } from '@/src/components/ui/Badge';
import { Card } from '@/src/components/ui/Card';
import { LoadingState, EmptyState, ErrorState } from '@/src/components/ui/States';
import { Search, Filter, Bookmark, Sparkles, FileText, ArrowUpDown, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { kmsApi } from '@/src/lib/api';

interface SearchResult {
  id: string;
  title?: string;
  fileName?: string;
  snippet?: string;
  department?: string;
  owner?: string;
  currentVersion?: string | { versionNumber?: number };
  confidentialityLevel?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  securityClassification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  matchedField?: string;
  relevanceScore?: string | number;
  updatedAt?: string;
}

function AdvancedSearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedDocType, setSelectedDocType] = useState('ALL');
  const [sortBy, setSortBy] = useState('relevance');

  const [departmentsList, setDepartmentsList] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [docTypesList, setDocTypesList] = useState<Array<{ id: string; name: string }>>([]);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
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

  const executeSearch = async (overrideQuery?: string | unknown) => {
    const q = typeof overrideQuery === 'string' ? overrideQuery : query;
    if (!q.trim() && selectedDept === 'ALL' && selectedDocType === 'ALL' && selectedClass === 'ALL') return;
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const filters = {
        deptId: selectedDept !== 'ALL' ? selectedDept : undefined,
        docTypeId: selectedDocType !== 'ALL' ? selectedDocType : undefined,
        confidentiality: selectedClass !== 'ALL' ? selectedClass : undefined,
      };
      const data = await kmsApi.search.advanced(q.trim(), filters);
      const items = Array.isArray(data) ? data : (data as { content?: SearchResult[] }).content ?? [];
      setResults(items as SearchResult[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setError(msg.includes('403') ? 'You do not have permission to perform searches.' : msg);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const urlQ = searchParams?.get('q') || searchParams?.get('query');
    if (urlQ && urlQ.trim()) {
      const trimmed = urlQ.trim();
      setQuery(trimmed);
      executeSearch(trimmed);
    }
  }, [searchParams]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') executeSearch();
  };

  const clearSearch = () => {
    setQuery('');
    setSelectedClass('ALL');
    setSelectedDept('ALL');
    setSelectedDocType('ALL');
    setResults([]);
    setHasSearched(false);
    setError(null);
  };

  const filteredResults = [...results]
    .filter((r) => {
      if (selectedClass !== 'ALL' && r.securityClassification !== selectedClass && r.confidentialityLevel !== selectedClass) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recency') {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === 'title') {
        return (a.title || a.fileName || '').localeCompare(b.title || b.fileName || '');
      }
      return 0;
    });

  React.useEffect(() => {
    if (hasSearched) {
      executeSearch();
    }
  }, [selectedDept, selectedDocType, selectedClass]);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-kms-slate-200 pb-3 gap-3">
          <div>
            <Breadcrumb items={[{ label: 'Search & Discovery' }, { label: 'Advanced Search' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-700" />
              Full-Text &amp; Faceted Search Engine
            </h1>
          </div>
          <Link href="/search/saved" className="shrink-0">
            <Button variant="outline" size="sm" icon={<Bookmark className="w-4 h-4" />}>
              Saved Searches &amp; Alerts
            </Button>
          </Link>
        </div>

        {/* Search Query Builder */}
        <Card title="Query Builder &amp; Parameters">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-kms-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter keywords, phrase matches, or tags..."
                  className="w-full pl-9 pr-9 py-1.5 text-xs bg-white border border-kms-slate-300 rounded text-kms-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                {query && (
                  <button onClick={clearSearch} className="absolute right-3 top-2.5 text-kms-slate-400 hover:text-kms-slate-700">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={<Search className="w-4 h-4" />}
                onClick={executeSearch}
                disabled={isLoading}
              >
                Execute Search
              </Button>
            </div>

            {/* Advanced Query Syntax Helpers (FR-13) & Save Search (FR-15) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-kms-slate-100 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-kms-slate-500 text-[11px] font-medium">Syntax Helpers:</span>
                <button
                  type="button"
                  onClick={() => setQuery((prev) => prev ? `${prev} AND ` : 'Security AND Policy')}
                  className="px-2 py-0.5 bg-kms-slate-100 hover:bg-blue-50 border border-kms-slate-200 rounded font-mono text-[11px] text-kms-slate-700"
                >
                  AND
                </button>
                <button
                  type="button"
                  onClick={() => setQuery((prev) => prev ? `${prev} OR ` : 'Audit OR Compliance')}
                  className="px-2 py-0.5 bg-kms-slate-100 hover:bg-blue-50 border border-kms-slate-200 rounded font-mono text-[11px] text-kms-slate-700"
                >
                  OR
                </button>
                <button
                  type="button"
                  onClick={() => setQuery((prev) => prev ? `${prev} NOT ` : 'Draft NOT Legacy')}
                  className="px-2 py-0.5 bg-kms-slate-100 hover:bg-blue-50 border border-kms-slate-200 rounded font-mono text-[11px] text-kms-slate-700"
                >
                  NOT
                </button>
                <button
                  type="button"
                  onClick={() => setQuery((prev) => `"Exact Phrase"`)}
                  className="px-2 py-0.5 bg-kms-slate-100 hover:bg-blue-50 border border-kms-slate-200 rounded font-mono text-[11px] text-kms-slate-700"
                >
                  "Exact Phrase"
                </button>
              </div>

              {query.trim() && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const token = sessionStorage.getItem('kms_access_token');
                      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';
                      const res = await fetch(`${API_BASE_URL}/search/saved`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ name: query, queryJson: query }),
                      });
                      if (!res.ok) throw new Error('Failed to save');
                      alert(`Search "${query}" saved to your Saved Searches list!`);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : 'Failed to save search');
                    }
                  }}
                  className="text-blue-700 hover:underline font-semibold flex items-center gap-1 text-xs"
                >
                  <Bookmark className="w-3.5 h-3.5" /> Save This Search
                </button>
              )}
            </div>

            {/* Facets & Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <Select
                label="Department"
                options={[
                  { label: 'All Departments', value: 'ALL' },
                  ...departmentsList.map((d) => ({ label: `${d.name} (${d.code})`, value: d.id })),
                ]}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              />
              <Select
                label="Document Category / Type"
                options={[
                  { label: 'All Categories / Types', value: 'ALL' },
                  ...docTypesList.map((t) => ({ label: t.name, value: t.id })),
                ]}
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
              />
              <Select
                label="Confidentiality Facet"
                options={[
                  { label: 'All Classifications', value: 'ALL' },
                  { label: 'PUBLIC', value: 'PUBLIC' },
                  { label: 'INTERNAL', value: 'INTERNAL' },
                  { label: 'CONFIDENTIAL', value: 'CONFIDENTIAL' },
                  { label: 'RESTRICTED', value: 'RESTRICTED' },
                ]}
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              />
              <Select
                label="Relevance Order"
                options={[
                  { label: 'Best Match (Relevance)', value: 'relevance' },
                  { label: 'Most Recent First', value: 'recency' },
                  { label: 'Title (A-Z)', value: 'title' },
                ]}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Results Area */}
        {isLoading && <LoadingState message="Searching the repository..." />}
        {error && <ErrorState title="Search failed" message={error} onRetry={executeSearch} />}

        {!isLoading && !error && hasSearched && (
          <>
            {/* Results toolbar */}
            <div className="flex items-center justify-between bg-white p-3 border border-kms-slate-200 rounded text-xs text-kms-slate-600">
              <div>
                Search returned{' '}
                <span className="font-bold text-kms-slate-900">{filteredResults.length}</span>
                {' '}matching document(s) for{' '}
                <span className="font-mono text-blue-700 font-semibold">"{query}"</span>
              </div>
              <div className="flex items-center gap-1.5 text-kms-slate-500">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Sorted by: <strong className="text-kms-slate-800 uppercase">{sortBy}</strong></span>
              </div>
            </div>

            {filteredResults.length === 0 ? (
              <EmptyState
                title="No results found"
                message={`No documents matched your search for "${query}". Try different keywords or broaden your filters.`}
              />
            ) : (
              <div className="space-y-3">
                {filteredResults.map((result) => (
                  <div key={result.id} className="kms-card p-4 bg-white hover:border-blue-500 transition-all space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-5 h-5 text-blue-700 shrink-0" />
                        <Link href={`/preview/${result.id}`} className="text-sm font-bold text-blue-800 hover:underline">
                          {result.title || result.fileName || result.id}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.relevanceScore && (
                          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                            Score: {result.relevanceScore}
                          </span>
                        )}
                        {result.securityClassification && (
                          <Badge label={result.securityClassification} classification={result.securityClassification} />
                        )}
                      </div>
                    </div>

                    {result.snippet && (
                      <div className="text-xs text-kms-slate-700 bg-kms-slate-50 p-2.5 rounded border border-kms-slate-200 font-sans italic">
                        <span dangerouslySetInnerHTML={{ __html: result.snippet }} />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-kms-slate-500 pt-1 border-t border-kms-slate-100">
                      <div className="flex items-center gap-3">
                        {result.department && <span>Department: <strong>{result.department}</strong></span>}
                        {result.currentVersion && (
                          <span>
                            Version:{' '}
                            <strong className="font-mono">
                              {typeof result.currentVersion === 'string'
                                ? result.currentVersion
                                : `v${result.currentVersion.versionNumber ?? 1}`}
                            </strong>
                          </span>
                        )}
                      </div>
                      {result.matchedField && (
                        <div className="flex items-center gap-2 text-kms-slate-400">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Matched via: {result.matchedField}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!hasSearched && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-kms-slate-400">
            <Search className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Enter a query above to search the knowledge repository</p>
            <p className="text-xs mt-1">Supports full-text, boolean operators, and metadata facets</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AdvancedSearchPage() {
  return (
    <React.Suspense fallback={<AppShell><LoadingState message="Loading search engine..." /></AppShell>}>
      <AdvancedSearchContent />
    </React.Suspense>
  );
}

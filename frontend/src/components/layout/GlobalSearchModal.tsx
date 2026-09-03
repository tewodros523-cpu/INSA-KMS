'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { kmsApi } from '@/src/lib/api';
import { Badge, ClassificationType } from '@/src/components/ui/Badge';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchDocument {
  id: string;
  title?: string;
  fileName?: string;
  department?: string;
  ownerDepartment?: { name?: string; code?: string };
  documentType?: string;
  confidentialityLevel?: string;
  securityClassification?: string;
  updatedAt?: string;
  currentVersion?: string | { versionNumber?: number };
}

function getClassification(doc: SearchDocument): ClassificationType {
  const level = (doc.securityClassification || doc.confidentialityLevel || 'INTERNAL').toUpperCase();
  if (level === 'PUBLIC' || level === 'CONFIDENTIAL' || level === 'RESTRICTED') {
    return level as ClassificationType;
  }
  return 'INTERNAL';
}

function getDepartmentName(doc: SearchDocument): string {
  return doc.department || doc.ownerDepartment?.name || doc.ownerDepartment?.code || '';
}

function getVersionLabel(doc: SearchDocument): string {
  if (!doc.currentVersion) return 'v1';
  if (typeof doc.currentVersion === 'string') return doc.currentVersion;
  return `v${doc.currentVersion.versionNumber ?? 1}`;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened and reset state when closed
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Global Ctrl+K and Escape handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search method
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        let items: SearchDocument[] = [];
        try {
          const quickRes = await kmsApi.search.quick(trimmed);
          const raw = Array.isArray(quickRes) ? quickRes : (quickRes?.content || quickRes?.documents || []);
          if (Array.isArray(raw) && raw.length > 0) {
            items = raw;
          }
        } catch {
          // fallback to document list search
        }

        if (items.length === 0) {
          try {
            const listRes = await kmsApi.documents.list(0, 8, { search: trimmed });
            const rawList = Array.isArray(listRes) ? listRes : (listRes?.content || []);
            if (Array.isArray(rawList) && rawList.length > 0) {
              items = rawList;
            }
          } catch {
            // ignore fallback error
          }
        }

        setResults(items.slice(0, 8));
        setHasSearched(true);
      } catch {
        setResults([]);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev < results.length - 1 ? prev + 1 : 0) : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev > 0 ? prev - 1 : results.length - 1) : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        const selected = results[selectedIndex];
        onClose();
        router.push(`/preview/${selected.id}`);
      } else if (query.trim()) {
        onClose();
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-10 sm:pt-20 p-3 sm:p-4">
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-slate-200 flex items-center gap-2.5 bg-white">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-blue-700 animate-spin shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-blue-700 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quick search documents, metadata, OCR, and tags (Ctrl+K)..."
            className="w-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent min-w-0 font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-700 shrink-0"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded shrink-0"
            aria-label="Close search modal"
          >
            <span className="text-[10px] font-mono px-1.5 py-0.5 border border-slate-200 rounded text-slate-500">ESC</span>
          </button>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          {isLoading && results.length === 0 && (
            <div className="p-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-5 h-5 text-blue-700 animate-spin" />
              <span>Searching knowledge repository...</span>
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <p className="font-semibold text-slate-800 text-sm">No documents found matching &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-slate-400">
                Try searching with different terms or press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px]">Enter</kbd> to launch Advanced Search.
              </p>
            </div>
          )}

          {!query.trim() && (
            <div className="p-6 text-center text-xs text-slate-500 space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-2">
                <Search className="w-5 h-5" />
              </div>
              <p className="font-semibold text-slate-800">Quick Document Search</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Type keywords to search titles, extracted OCR content, and tags. Use <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px]">↓</kbd> to navigate and <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px]">Enter</kbd> to open.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Matching Documents ({results.length})</span>
                <span className="text-[10px] font-normal normal-case text-slate-400">Press Enter for full search</span>
              </div>
              {results.map((doc, index) => {
                const classification = getClassification(doc);
                const department = getDepartmentName(doc);
                const isSelected = index === selectedIndex;
                return (
                  <Link
                    key={doc.id}
                    href={`/preview/${doc.id}`}
                    onClick={onClose}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer group ${
                      isSelected ? 'bg-blue-50/80 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 group-hover:bg-blue-100'
                      }`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                            {doc.title || doc.fileName || 'Untitled Document'}
                          </span>
                          <Badge label={classification} classification={classification} />
                          <span className="font-mono text-[10px] text-blue-700 font-bold shrink-0">{getVersionLabel(doc)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          {department && <span>{department}</span>}
                          {doc.documentType && <span>• {doc.documentType}</span>}
                          {doc.updatedAt && (
                            <span>• {new Date(doc.updatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className={`w-4 h-4 shrink-0 ml-2 transition-opacity ${
                      isSelected ? 'text-blue-700 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                    }`} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-3.5 text-xs text-slate-600 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 flex items-center gap-2">
            <span><kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">↵</kbd> Select</span>
            <span><kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">ESC</kbd> Close</span>
          </span>
          <Link
            href={query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : `/search`}
            onClick={onClose}
            className="text-blue-700 hover:underline font-semibold flex items-center gap-1 text-[11px] sm:text-xs shrink-0"
          >
            Open Advanced Search Engine <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Trophy, 
  Award, 
  Medal, 
  FileText, 
  BookOpen, 
  FileEdit, 
  User as UserIcon, 
  Flame, 
  Sparkles, 
  Building2, 
  Briefcase 
} from 'lucide-react';
import { kmsApi } from '@/src/lib/api';

export interface TopContributor {
  rank: number;
  employeeId: string;
  name: string;
  username: string;
  email?: string;
  department?: string;
  jobTitle?: string;
  profileImage?: string | null;
  documents: number;
  blogs: number;
  articles: number;
  totalContributions: number;
}

interface TopContributorsSectionProps {
  limit?: number;
  title?: string;
  subtitle?: string;
}

export const TopContributorsSection: React.FC<TopContributorsSectionProps> = ({
  limit = 3,
  title = 'Top Active Contributors',
  subtitle = 'Recognizing the most active knowledge creators across Documents, Blogs, and Articles',
}) => {
  const [contributors, setContributors] = useState<TopContributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContributors = () => {
    setIsLoading(true);
    setError(null);
    kmsApi.analytics.getTopContributors(limit)
      .then((data) => {
        setContributors(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load top contributors';
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchContributors();
  }, [limit]);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
            <Trophy className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>#1 Champion</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs">
            <Medal className="w-3.5 h-3.5 text-slate-500 fill-slate-300" />
            <span>#2 Silver</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-900/10 text-amber-900 border border-amber-800/20 shadow-2xs">
            <Award className="w-3.5 h-3.5 text-amber-800" />
            <span>#3 Bronze</span>
          </div>
        );
      default:
        return (
          <div className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            #{rank}
          </div>
        );
    }
  };

  const getCardBorder = (rank: number) => {
    switch (rank) {
      case 1:
        return 'border-amber-300 ring-1 ring-amber-200/80 bg-gradient-to-b from-amber-50/50 via-white to-white';
      case 2:
        return 'border-slate-300 ring-1 ring-slate-200/70 bg-gradient-to-b from-slate-50/60 via-white to-white';
      case 3:
        return 'border-amber-800/20 ring-1 ring-amber-900/10 bg-gradient-to-b from-amber-100/20 via-white to-white';
      default:
        return 'border-slate-200 bg-white';
    }
  };

  const getAvatarBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-amber-400 to-yellow-600 text-white ring-2 ring-amber-300';
      case 2:
        return 'bg-gradient-to-br from-slate-400 to-slate-600 text-white ring-2 ring-slate-300';
      case 3:
        return 'bg-gradient-to-br from-amber-700 to-amber-900 text-white ring-2 ring-amber-600/50';
      default:
        return 'bg-blue-600 text-white';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <Trophy className="w-4 h-4 text-amber-600 fill-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                Top 3
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Score = Documents + Blogs + Articles</span>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 animate-pulse shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 bg-slate-100 rounded-full w-24" />
                <div className="h-7 bg-slate-100 rounded-lg w-16" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 shrink-0" />
                <div className="space-y-1.5 w-full">
                  <div className="h-4 bg-slate-100 rounded-sm w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-sm w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                <div className="h-10 bg-slate-100 rounded-md" />
                <div className="h-10 bg-slate-100 rounded-md" />
                <div className="h-10 bg-slate-100 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 flex items-center justify-between">
          <span>Failed to load contributor activity: {error}</span>
          <button
            onClick={fetchContributors}
            className="font-semibold underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && (contributors.length === 0 || contributors.every(c => c.totalContributions === 0)) && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-2xs">
          <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No contributor activity recorded yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Upload documents, create knowledge articles, or publish blogs to see rankings appear here.
          </p>
        </div>
      )}

      {/* Top 3 Contributor Cards */}
      {!isLoading && !error && contributors.length > 0 && contributors.some(c => c.totalContributions > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contributors.map((c) => {
            const isLeader = c.rank === 1;

            return (
              <div
                key={c.employeeId || c.username}
                className={`rounded-xl border p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${getCardBorder(
                  c.rank
                )}`}
              >
                {/* Top Badge & Score Row */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {getRankBadge(c.rank)}

                    {/* Total Activity Score */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <Flame className={`w-4 h-4 ${isLeader ? 'text-amber-500 fill-amber-500' : 'text-blue-600'}`} />
                      <span className="text-base font-black text-slate-900 font-mono">
                        {c.totalContributions}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 ml-0.5">
                        pts
                      </span>
                    </div>
                  </div>

                  {/* Profile & Name Details */}
                  <div className="flex items-start gap-3 mb-3.5">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${getAvatarBg(
                        c.rank
                      )}`}
                    >
                      {getInitials(c.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate leading-snug">
                        {c.name}
                      </h3>
                      <p className="text-xs text-slate-500 truncate font-medium">
                        @{c.username}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-slate-600">
                        {c.department && c.department !== 'Unassigned' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[120px]">{c.department}</span>
                          </span>
                        )}
                        {c.jobTitle && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[120px]">{c.jobTitle}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contribution Breakdown Grid */}
                <div className="pt-3 border-t border-slate-200/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Contribution Breakdown
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Documents */}
                    <div className="bg-white/80 border border-slate-200/90 rounded-lg p-2 text-center shadow-2xs">
                      <div className="flex items-center justify-center gap-1 text-slate-500 mb-0.5">
                        <FileText className="w-3 h-3 text-blue-600" />
                        <span className="text-[10px] font-semibold">Docs</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 font-mono">
                        {c.documents}
                      </p>
                    </div>

                    {/* Blogs */}
                    <div className="bg-white/80 border border-slate-200/90 rounded-lg p-2 text-center shadow-2xs">
                      <div className="flex items-center justify-center gap-1 text-slate-500 mb-0.5">
                        <BookOpen className="w-3 h-3 text-emerald-600" />
                        <span className="text-[10px] font-semibold">Blogs</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 font-mono">
                        {c.blogs}
                      </p>
                    </div>

                    {/* Articles */}
                    <div className="bg-white/80 border border-slate-200/90 rounded-lg p-2 text-center shadow-2xs">
                      <div className="flex items-center justify-center gap-1 text-slate-500 mb-0.5">
                        <FileEdit className="w-3 h-3 text-indigo-600" />
                        <span className="text-[10px] font-semibold">Articles</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 font-mono">
                        {c.articles}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

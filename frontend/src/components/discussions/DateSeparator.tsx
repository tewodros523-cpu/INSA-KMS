'use client';

import React from 'react';

interface DateSeparatorProps {
  dateString: string;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ dateString }) => {
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const label = formatDateLabel(dateString);
  if (!label) return null;

  return (
    <div className="flex items-center justify-center my-4 select-none">
      <span className="bg-white/90 text-slate-700 text-[11px] font-bold tracking-wide px-4 py-1 rounded-full shadow-2xs border border-slate-200/90 backdrop-blur-md">
        {label}
      </span>
    </div>
  );
};

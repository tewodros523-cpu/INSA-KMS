'use client';

import React from 'react';

interface MessageAvatarProps {
  username: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COLOR_PALETTES = [
  'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white',
  'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white',
  'bg-gradient-to-tr from-violet-600 to-purple-500 text-white',
  'bg-gradient-to-tr from-amber-500 to-orange-500 text-white',
  'bg-gradient-to-tr from-rose-500 to-pink-500 text-white',
  'bg-gradient-to-tr from-cyan-600 to-blue-500 text-white',
  'bg-gradient-to-tr from-sky-500 to-indigo-600 text-white',
];

function getAvatarColor(name: string): string {
  if (!name) return COLOR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTES.length;
  return COLOR_PALETTES[index];
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/[\s._-]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const MessageAvatar: React.FC<MessageAvatarProps> = ({
  username,
  size = 'md',
  className = '',
}) => {
  const initials = getInitials(username);
  const colorClass = getAvatarColor(username);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs font-bold',
    md: 'w-9 h-9 text-sm font-extrabold',
    lg: 'w-11 h-11 text-base font-black',
  }[size];

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 shadow-2xs select-none ${sizeClasses} ${colorClass} ${className}`}
      title={username}
    >
      {initials}
    </div>
  );
};

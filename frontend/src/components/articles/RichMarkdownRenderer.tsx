'use client';

import React from 'react';

interface RichMarkdownRendererProps {
  content: string;
  className?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

const resolveMediaUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api/v1')) {
    const baseDomain = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    return `${baseDomain}${url}`;
  }
  return url;
};

export const RichMarkdownRenderer: React.FC<RichMarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content || !content.trim()) {
    return <p className="text-kms-slate-400 italic">No content typed yet. Live preview will appear here.</p>;
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushCodeBlock = (key: string) => {
    if (codeLines.length > 0) {
      elements.push(
        <pre key={key} className="bg-kms-slate-900 text-blue-300 p-3 my-3 rounded-md font-mono text-xs overflow-x-auto border border-kms-slate-800 shadow-xs">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      codeLines = [];
    }
  };

  const flushTable = (key: string) => {
    if (tableHeader.length > 0) {
      elements.push(
        <div key={key} className="overflow-x-auto my-3 border border-kms-slate-200 rounded-lg shadow-xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-kms-slate-100 text-kms-slate-800 font-bold border-b border-kms-slate-200">
              <tr>
                {tableHeader.map((h, i) => (
                  <th key={i} className="p-2 border-r last:border-r-0 border-kms-slate-200">{formatInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b last:border-b-0 border-kms-slate-200 hover:bg-kms-slate-50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 border-r last:border-r-0 border-kms-slate-200 text-kms-slate-700">{formatInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeader = [];
      tableRows = [];
    }
  };

  const parseFormatting = (str: string): React.ReactNode => {
    let result = str;
    // inline code `code`
    result = result.replace(/`([^`]+)`/g, '<code class="bg-kms-slate-200 text-pink-700 font-mono text-[11px] px-1 py-0.5 rounded font-semibold">$1</code>');
    // bold italic ***bold italic***
    result = result.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // bold **bold** or __bold__
    result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');
    // italic *italic* or _italic_
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    result = result.replace(/_([^_]+)_/g, '<em>$1</em>');
    // strikethrough ~~del~~
    result = result.replace(/~~(.*?)~~/g, '<del class="line-through text-kms-slate-400">$1</del>');
    // underline <u>...</u>
    result = result.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  const formatInline = (text: string): React.ReactNode => {
    const videoMatch = text.match(/<video[^>]*src=["']([^"']+)["'][^>]*>.*?<\/video>/i) || text.match(/<video[^>]*src=["']([^"']+)["'][^>]*\/>/i);
    if (videoMatch) {
      const src = resolveMediaUrl(videoMatch[1]);
      return (
        <div className="my-3">
          <video controls src={src} className="w-full max-h-[450px] rounded-lg border border-kms-slate-200 bg-black shadow-sm" />
        </div>
      );
    }

    const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
    if (imgRegex.test(text)) {
      imgRegex.lastIndex = 0;
      const elements: React.ReactNode[] = [];
      let lastIndex = 0;
      let m: RegExpExecArray | null;

      while ((m = imgRegex.exec(text)) !== null) {
        if (m.index > lastIndex) {
          elements.push(parseFormatting(text.substring(lastIndex, m.index)));
        }
        const alt = m[1] || 'Article Image';
        const rawUrl = m[2];
        const src = resolveMediaUrl(rawUrl);

        elements.push(
          <div key={`img-${m.index}`} className="my-3 block">
            <img
              src={src}
              alt={alt}
              className="rounded-lg border border-kms-slate-200 max-h-[450px] w-auto max-w-full object-contain shadow-xs my-2 block"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.retried && rawUrl.startsWith('/api/v1')) {
                  target.dataset.retried = 'true';
                  target.src = `http://localhost:8081${rawUrl}`;
                }
              }}
            />
          </div>
        );
        lastIndex = m.index + m[0].length;
      }
      if (lastIndex < text.length) {
        elements.push(parseFormatting(text.substring(lastIndex)));
      }
      return <>{elements}</>;
    }

    const linkRegex = /\[(.*?)\]\((.*?)\)/g;
    let match: RegExpExecArray | null;
    const tokens: React.ReactNode[] = [];
    let lastIdx = 0;
    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        tokens.push(parseFormatting(text.substring(lastIdx, match.index)));
      }
      tokens.push(
        <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-semibold hover:text-blue-900">
          {match[1]}
        </a>
      );
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      tokens.push(parseFormatting(text.substring(lastIdx)));
    }

    return tokens.length > 0 ? <>{tokens}</> : parseFormatting(text);
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(`code-${idx}`);
        inCodeBlock = false;
      } else {
        if (inTable) { flushTable(`table-${idx}`); inTable = false; }
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      if (trimmed.includes('---')) {
        return;
      }
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      flushTable(`table-${idx}`);
      inTable = false;
    }

    if (!trimmed) {
      elements.push(<div key={`br-${idx}`} className="h-2" />);
      return;
    }

    // Horizontal Rule: ---, ***, ___
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      elements.push(<hr key={idx} className="my-4 border-t border-kms-slate-300" />);
      return;
    }

    // Headings: supports #top, # top, ##top, ## top, etc. up to 6 #'s
    const headingMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      if (headingText.length > 0) {
        switch (level) {
          case 1:
            elements.push(
              <h1 key={idx} className="text-2xl font-extrabold text-kms-slate-900 mt-5 mb-2.5 tracking-tight border-b border-kms-slate-200 pb-1.5">
                {formatInline(headingText)}
              </h1>
            );
            return;
          case 2:
            elements.push(
              <h2 key={idx} className="text-xl font-bold text-kms-slate-900 mt-4 mb-2 border-b border-kms-slate-100 pb-1">
                {formatInline(headingText)}
              </h2>
            );
            return;
          case 3:
            elements.push(
              <h3 key={idx} className="text-base font-bold text-kms-slate-900 mt-3 mb-1.5">
                {formatInline(headingText)}
              </h3>
            );
            return;
          case 4:
            elements.push(
              <h4 key={idx} className="text-sm font-semibold text-kms-slate-900 mt-2.5 mb-1">
                {formatInline(headingText)}
              </h4>
            );
            return;
          case 5:
            elements.push(
              <h5 key={idx} className="text-xs font-bold uppercase tracking-wider text-kms-slate-700 mt-2 mb-1">
                {formatInline(headingText)}
              </h5>
            );
            return;
          case 6:
          default:
            elements.push(
              <h6 key={idx} className="text-xs font-semibold italic text-kms-slate-600 mt-2 mb-1">
                {formatInline(headingText)}
              </h6>
            );
            return;
        }
      }
    }

    // Blockquote: supports > quote or >quote
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s*/, '');
      elements.push(
        <blockquote key={idx} className="p-3 my-2 bg-blue-50 border-l-4 border-blue-600 text-blue-950 font-medium italic rounded-r text-xs">
          {formatInline(quoteText)}
        </blockquote>
      );
      return;
    }

    // Checkbox / Task list: - [ ] Task or - [x] Task
    const taskMatch = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      elements.push(
        <div key={idx} className={`flex items-center gap-2 text-xs my-1 font-sans ${isChecked ? 'line-through text-kms-slate-400' : 'text-kms-slate-800'}`}>
          <input type="checkbox" checked={isChecked} readOnly className="rounded border-kms-slate-300 text-blue-600 focus:ring-0" />
          <span>{formatInline(taskMatch[2])}</span>
        </div>
      );
      return;
    }

    // Bullet list: - item, * item, + item, or -item, *item
    const bulletMatch = trimmed.match(/^[-*+]\s*(.+)$/);
    if (bulletMatch) {
      elements.push(
        <ul key={idx} className="list-disc list-inside space-y-1 text-xs text-kms-slate-800 my-1 font-sans">
          <li>{formatInline(bulletMatch[1])}</li>
        </ul>
      );
      return;
    }

    // Numbered list: 1. item, 2. item, etc.
    const numMatch = trimmed.match(/^(\d+)\.\s*(.+)$/);
    if (numMatch) {
      elements.push(
        <ol key={idx} className="list-decimal list-inside space-y-1 text-xs text-kms-slate-800 my-1 font-sans">
          <li>{formatInline(numMatch[2])}</li>
        </ol>
      );
      return;
    }

    // Standard paragraph
    elements.push(
      <p key={idx} className="text-xs text-kms-slate-800 leading-relaxed font-sans my-1">
        {formatInline(line)}
      </p>
    );
  });

  if (inCodeBlock) flushCodeBlock(`code-end`);
  if (inTable) flushTable(`table-end`);

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};

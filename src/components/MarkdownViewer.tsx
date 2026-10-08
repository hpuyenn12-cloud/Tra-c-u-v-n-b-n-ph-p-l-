import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Bookmark } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert basic markdown formatting into styled JSX
  const renderFormatted = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inBlockquote = false;
    let blockquoteLines: string[] = [];
    let inList = false;
    let listItems: string[] = [];

    const flushBlockquote = (key: string) => {
      if (blockquoteLines.length > 0) {
        elements.push(
          <div
            key={key}
            className="my-3 pl-4 border-l-4 border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 text-slate-800 dark:text-amber-100/90 py-2.5 px-3 rounded-r-lg text-sm italic font-serif"
          >
            {blockquoteLines.join('\n')}
          </div>
        );
        blockquoteLines = [];
      }
      inBlockquote = false;
    };

    const flushList = (key: string) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={key} className="my-2 space-y-1.5 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
            {listItems.map((item, i) => (
              <li key={i}>{formatInline(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
      inList = false;
    };

    const formatInline = (str: string) => {
      // Replace **bold** with <strong>
      const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
      return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const inner = part.slice(2, -2);
          const isArticle = /Điều\s+\d+|Khoản\s+\d+|Điểm\s+[a-z]/i.test(inner);
          return (
            <strong
              key={idx}
              className={`font-semibold ${
                isArticle
                  ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.5 rounded'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {inner}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={idx}
              className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 rounded font-mono"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('>')) {
        inList && flushList(`list-${index}`);
        inBlockquote = true;
        blockquoteLines.push(trimmed.replace(/^>\s*/, ''));
        return;
      } else if (inBlockquote) {
        flushBlockquote(`quote-${index}`);
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        inList = true;
        listItems.push(trimmed.replace(/^[-*]\s*/, ''));
        return;
      } else if (inList) {
        flushList(`list-${index}`);
      }

      if (trimmed.startsWith('### ')) {
        const title = trimmed.replace(/^###\s*/, '');
        const isWarning = title.includes('RỦI RO') || title.includes('CHẾ TÀI');
        const isBasis = title.includes('CĂN CỨ') || title.includes('TRÍCH LỤC');
        const isConclusion = title.includes('KẾT LUẬN') || title.includes('KẾT QUẢ');

        elements.push(
          <div
            key={index}
            className={`mt-5 mb-2.5 pb-1 border-b flex items-center gap-2 text-base font-bold ${
              isWarning
                ? 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                : isBasis
                ? 'text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900'
                : isConclusion
                ? 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                : 'text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>{title}</span>
          </div>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="mt-6 mb-3 text-lg font-bold text-slate-900 dark:text-white border-b pb-1.5">
            {trimmed.replace(/^##\s*/, '')}
          </h2>
        );
      } else if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="mt-4 mb-2 text-xl font-extrabold text-slate-900 dark:text-white">
            {trimmed.replace(/^#\s*/, '')}
          </h1>
        );
      } else if (trimmed.startsWith('---')) {
        elements.push(<hr key={index} className="my-4 border-slate-200 dark:border-slate-800" />);
      } else if (trimmed.length > 0) {
        elements.push(
          <p key={index} className="my-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {formatInline(trimmed)}
          </p>
        );
      }
    });

    if (inBlockquote) flushBlockquote('final-quote');
    if (inList) flushList('final-list');

    return elements;
  };

  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          title="Sao chép toàn bộ kết quả"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Đã sao chép' : 'Sao chép kết quả'}</span>
        </button>
      </div>

      <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
        {renderFormatted(content)}
      </div>
    </div>
  );
};

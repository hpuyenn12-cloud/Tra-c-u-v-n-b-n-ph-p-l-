import React, { useState, useMemo } from 'react';
import { Search, Hash, FileText, Check, Copy, Filter, Layers } from 'lucide-react';
import { UploadedDoc } from './DocumentUploader';
import { extractLegalQueryInfo, escapeRegex } from '../utils/legalSearchEngine';

interface ParagraphBrowserProps {
  documents: UploadedDoc[];
  searchQuery: string;
}

interface ScoredItem {
  docId: string;
  docName: string;
  index: number;
  label: string;
  text: string;
  score: number;
  matchedKeywords: string[];
}

export const ParagraphBrowser: React.FC<ParagraphBrowserProps> = ({
  documents,
  searchQuery,
}) => {
  const [filterText, setFilterText] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const effectiveQuery = filterText || searchQuery;

  // Flatten and calculate matching scores using the legal query engine
  const scoredItems = useMemo(() => {
    const activeDocs =
      selectedDocId === 'all'
        ? documents
        : documents.filter((d) => d.id === selectedDocId);

    const queryInfo = extractLegalQueryInfo(effectiveQuery);
    const { cleanKeywords, phrases, targetArticle } = queryInfo;

    const items: ScoredItem[] = [];

    activeDocs.forEach((doc) => {
      const paras =
        doc.paragraphs ||
        (doc.textContent
          ? doc.textContent.split(/\n\s*\n/).map((t, idx) => ({
              index: idx + 1,
              label: `Đoạn ${idx + 1}`,
              text: t.trim(),
            }))
          : []);

      paras.forEach((p) => {
        const textLower = p.text.toLowerCase();
        let score = 0;
        const matchedKws: string[] = [];

        if (targetArticle && p.text.toLowerCase().includes(targetArticle.toLowerCase())) {
          score += 100;
          matchedKws.push(targetArticle);
        }

        // Match phrases
        for (const phrase of phrases) {
          if (phrase.length > 4 && textLower.includes(phrase)) {
            score += 25;
            matchedKws.push(phrase);
          }
        }

        // Match clean keywords (no stopwords)
        for (const kw of cleanKeywords) {
          try {
            const count = (textLower.match(new RegExp(`\\b${escapeRegex(kw)}\\b`, 'g')) || []).length;
            if (count > 0) {
              score += count * 5;
              matchedKws.push(kw);
            }
          } catch (e) {
            if (textLower.includes(kw)) {
              score += 5;
              matchedKws.push(kw);
            }
          }
        }

        items.push({
          docId: doc.id,
          docName: doc.name,
          index: p.index,
          label: p.label,
          text: p.text,
          score,
          matchedKeywords: Array.from(new Set(matchedKws)),
        });
      });
    });

    if (effectiveQuery.trim()) {
      items.sort((a, b) => b.score - a.score);
    }

    return items;
  }, [documents, selectedDocId, effectiveQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  const highlightMatches = (text: string, query: string) => {
    if (!query.trim()) return text;
    const queryInfo = extractLegalQueryInfo(query);
    const allMatches = Array.from(new Set([...queryInfo.phrases, ...queryInfo.cleanKeywords])).filter(
      (m) => m.length > 2
    );

    if (allMatches.length === 0) return text;

    try {
      const regex = new RegExp(`(${allMatches.map(escapeRegex).join('|')})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, i) =>
        allMatches.some((m) => m.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="bg-amber-200 dark:bg-amber-800/70 text-slate-900 dark:text-white px-0.5 rounded font-medium">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch (e) {
      return text;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Trình Duyệt & Lọc Từ Khóa Theo Trang / Đoạn</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tổng cộng {scoredItems.length} trang/đoạn trích xuất từ {documents.length} văn bản
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Document filter dropdown */}
          <div className="relative">
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="text-xs py-1.5 pl-2.5 pr-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tất cả văn bản ({documents.length})</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name.length > 30 ? d.name.slice(0, 30) + '...' : d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search keyword input */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Lọc từ khóa..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Paragraphs / Pages list */}
      <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
        {scoredItems.slice(0, 40).map((item, idx) => {
          const uniqueKey = `${item.docId}-${item.index}-${idx}`;
          const isMatched = item.score > 0;

          return (
            <div
              key={uniqueKey}
              className={`p-3 rounded-lg border text-xs transition ${
                isMatched
                  ? 'border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs'
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between mb-1.5 gap-2 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                    {item.docName}
                  </span>
                  <span className="font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded text-[11px] border border-indigo-200/50 dark:border-indigo-800/50">
                    {item.label}
                  </span>
                  {isMatched && (
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      Điểm khớp: {item.score} ({item.matchedKeywords.join(', ')})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(item.text, uniqueKey)}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition ml-auto"
                  title="Sao chép đoạn này"
                >
                  {copiedIndex === uniqueKey ? (
                    <span className="text-emerald-600 flex items-center gap-0.5 font-medium">
                      <Check className="w-3 h-3" /> Đã sao chép
                    </span>
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                {highlightMatches(item.text, effectiveQuery)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

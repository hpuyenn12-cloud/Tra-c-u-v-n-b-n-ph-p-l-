import React, { useState } from 'react';
import { X, FileText, Search, BookOpen, Layers, Check, Copy, AlertTriangle, ArrowRight } from 'lucide-react';
import { UploadedDoc } from './DocumentUploader';

interface DocumentPreviewModalProps {
  doc: UploadedDoc | null;
  onClose: () => void;
  onSelectOnly: (id: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  doc,
  onClose,
  onSelectOnly,
}) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'raw'>('articles');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  if (!doc) return null;

  const isPdf = doc.mimeType === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf');
  const isWord = doc.name.toLowerCase().endsWith('.docx') || doc.name.toLowerCase().endsWith('.doc');

  // Filter articles or paragraphs by search term
  const filteredArticles = (doc.articlesList || []).filter(
    (a) =>
      a.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.snippet.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyAll = () => {
    if (doc.textContent) {
      navigator.clipboard.writeText(doc.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                isPdf
                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                  : isWord
                  ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400'
                  : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-md">
                  {doc.name}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                  {isPdf ? 'PDF' : isWord ? 'DOCX' : 'Văn bản'}
                </span>
                {doc.selected && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Đang kích hoạt tra cứu
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                <span>Dung lượng: {(doc.size / 1024).toFixed(1)} KB</span>
                {doc.wordCount ? <span>• {doc.wordCount.toLocaleString()} từ</span> : null}
                {doc.articlesCount ? (
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                    • {doc.articlesCount} điều khoản nhận diện
                  </span>
                ) : null}
                {doc.paragraphs && doc.paragraphs.length > 0 ? (
                  <span>• {doc.paragraphs.length} {isPdf ? 'trang/phân đoạn' : 'đoạn văn'}</span>
                ) : null}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning if text is small or empty */}
        {doc.warning && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{doc.warning}</span>
          </div>
        )}

        {/* Navigation Tabs & Search */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('articles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'articles'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Điều khoản nhận diện ({doc.articlesCount || doc.articlesList?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'raw'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Toàn văn trích xuất ({doc.paragraphs?.length || 1} trang/đoạn)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'articles' && (
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Lọc điều khoản..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
            <button
              onClick={handleCopyAll}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 shrink-0"
              title="Sao chép toàn bộ văn bản"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {activeTab === 'articles' ? (
            doc.articlesList && doc.articlesList.length > 0 ? (
              <div className="space-y-2.5">
                {filteredArticles.map((art, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-300 transition text-xs"
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {art.number || art.label}
                      </span>
                      {art.title && art.title !== art.number && (
                        <span className="truncate">{art.title}</span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans line-clamp-3">
                      {art.snippet}...
                    </p>
                  </div>
                ))}
                {filteredArticles.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Không tìm thấy điều khoản nào khớp với từ khóa "{searchTerm}"
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <Layers className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Văn bản này chưa có cấu trúc phân chia theo số hiệu Điều cụ thể hoặc là tài liệu văn bản tự do.
                </p>
                <button
                  onClick={() => setActiveTab('raw')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Xem theo toàn văn trích xuất →
                </button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {doc.paragraphs && doc.paragraphs.length > 0 ? (
                doc.paragraphs.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs"
                  >
                    <div className="font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {p.label}
                      </span>
                      <span className="text-[11px] text-slate-400">{p.text.length} ký tự</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                      {p.text}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300 font-sans">
                  {doc.textContent || 'Chưa có nội dung trích xuất.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Nội dung đã được chuẩn hóa Unicode tiếng Việt (NFC) sẵn sàng tra cứu
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSelectOnly(doc.id);
                onClose();
              }}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5"
            >
              <span>🎯 Chỉ tra cứu tệp này</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

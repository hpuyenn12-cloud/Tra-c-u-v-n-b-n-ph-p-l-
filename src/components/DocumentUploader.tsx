import React, { useRef, useState, useMemo } from 'react';
import {
  Upload,
  FileText,
  X,
  BookOpen,
  FileCode,
  Sparkles,
  AlertCircle,
  FileUp,
  Check,
  Trash2,
  Plus,
  Eye,
  Layers,
  Edit2,
  Search,
  CheckSquare,
  AlertTriangle,
  RotateCcw,
  BookMarked,
  ShieldCheck,
} from 'lucide-react';
import { SAMPLE_LAWS, SampleLaw } from '../data/sampleLaws';
import { parseDocumentArticles, detectLegalDocumentTitle } from '../utils/legalSearchEngine';

export interface UploadedDoc {
  id: string;
  name: string;
  originalFileName?: string;
  size: number;
  mimeType: string;
  base64?: string;
  textContent?: string;
  paragraphs?: { index: number; label: string; text: string }[];
  articlesCount?: number;
  articlesList?: Array<{ number: string | null; title: string; label: string; snippet: string }>;
  wordCount?: number;
  warning?: string;
  isSample?: boolean;
  selected?: boolean;
}

interface DocumentUploaderProps {
  importedDocs: UploadedDoc[];
  onAddDocs: (docs: UploadedDoc[]) => void;
  onRemoveDoc: (id: string) => void;
  onToggleDoc: (id: string) => void;
  onRenameDoc?: (id: string, newName: string) => void;
  onSelectOnlyDoc?: (id: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onSelectSampleQuestion?: (q: string) => void;
  onViewDocParagraphs?: (doc: UploadedDoc) => void;
  onViewDocDetail?: (doc: UploadedDoc) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  importedDocs,
  onAddDocs,
  onRemoveDoc,
  onToggleDoc,
  onRenameDoc,
  onSelectOnlyDoc,
  onSelectAll,
  onDeselectAll,
  onSelectSampleQuestion,
  onViewDocParagraphs,
  onViewDocDetail,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'samples' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter imported documents in list view
  const filteredDocs = useMemo(() => {
    if (!listSearchQuery.trim()) return importedDocs;
    const q = listSearchQuery.toLowerCase().trim();
    return importedDocs.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.originalFileName && d.originalFileName.toLowerCase().includes(q))
    );
  }, [importedDocs, listSearchQuery]);

  // Aggregate stats across selected documents
  const selectedDocs = useMemo(() => importedDocs.filter((d) => d.selected), [importedDocs]);
  const totalArticlesRecognized = useMemo(() => {
    return selectedDocs.reduce((acc, d) => acc + (d.articlesCount || d.articlesList?.length || 0), 0);
  }, [selectedDocs]);

  const processSingleFile = async (file: File): Promise<UploadedDoc> => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isDocx =
      file.name.toLowerCase().endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isDoc = file.name.toLowerCase().endsWith('.doc') || file.type === 'application/msword';
    const isTxt =
      file.type.startsWith('text/') ||
      file.name.toLowerCase().endsWith('.txt') ||
      file.name.toLowerCase().endsWith('.md');

    if (!isPdf && !isDocx && !isDoc && !isTxt) {
      throw new Error(
        `Định dạng tệp "${file.name}" không được hỗ trợ. Vui lòng chọn PDF, DOCX, DOC hoặc TXT.`
      );
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const base64 = result.split(',')[1];

          // Parse on server to extract exact pages (PDF) or paragraphs (DOCX/TXT) and identify legal articles
          const resp = await fetch('/api/parse-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64,
              fileName: file.name,
              mimeType: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
            }),
          });

          if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Lỗi phân tích tệp');
          }

          const data = await resp.json();
          resolve({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name: data.name || file.name,
            originalFileName: file.name,
            size: file.size,
            mimeType: isPdf ? 'application/pdf' : file.type,
            base64,
            textContent: data.rawText,
            paragraphs: data.paragraphs,
            articlesCount: data.articlesCount,
            articlesList: data.articlesList,
            wordCount: data.wordCount,
            warning: data.warning,
            selected: true,
          });
        } catch (err: any) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error(`Không thể đọc tệp ${file.name}`));
    });
  };

  const processMultipleFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    setErrorMsg(null);
    const newDocs: UploadedDoc[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingStatus(`Đang đọc và phân tích cấu trúc điều khoản: ${file.name} (${i + 1}/${files.length})...`);
        const doc = await processSingleFile(file);
        newDocs.push(doc);
      }

      if (newDocs.length > 0) {
        onAddDocs(newDocs);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tải tệp');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processMultipleFiles(e.dataTransfer.files);
    }
  };

  const handleSelectSample = (sample: SampleLaw) => {
    const alreadyExists = importedDocs.some((d) => d.name.includes(sample.title));
    if (alreadyExists) return;

    const paras = sample.content
      .split(/\n\s*\n/)
      .map((p, idx) => ({
        index: idx + 1,
        label: `Điều ${idx + 1}`,
        text: p.trim(),
      }))
      .filter((p) => p.text.length > 0);

    const structured = parseDocumentArticles(sample.content, sample.title, paras);

    const doc: UploadedDoc = {
      id: `sample-${sample.id}`,
      name: `${sample.title} (${sample.number})`,
      originalFileName: `${sample.title}.txt`,
      size: sample.content.length,
      mimeType: 'text/plain',
      textContent: sample.content,
      paragraphs: paras,
      articlesCount: structured.length,
      articlesList: structured.slice(0, 150).map((a) => ({
        number: a.articleNumber,
        title: a.articleTitle,
        label: a.label,
        snippet: a.fullText.slice(0, 180),
      })),
      wordCount: sample.content.split(/\s+/).filter(Boolean).length,
      isSample: true,
      selected: true,
    };

    onAddDocs([doc]);

    if (onSelectSampleQuestion && sample.suggestedQuestions.length > 0) {
      onSelectSampleQuestion(sample.suggestedQuestions[0]);
    }
  };

  const handleApplyPasted = () => {
    if (!pastedText.trim()) return;
    const title = pastedTitle.trim() || `Văn bản quy định ${importedDocs.length + 1}`;
    const paras = pastedText
      .split(/\n\s*\n/)
      .map((p, idx) => ({
        index: idx + 1,
        label: `Đoạn ${idx + 1}`,
        text: p.trim(),
      }))
      .filter((p) => p.text.length > 0);

    const structured = parseDocumentArticles(pastedText, title, paras);

    const doc: UploadedDoc = {
      id: `pasted-${Date.now()}`,
      name: title,
      originalFileName: 'Nội dung dán trực tiếp.txt',
      size: pastedText.length,
      mimeType: 'text/plain',
      textContent: pastedText,
      paragraphs: paras,
      articlesCount: structured.length,
      articlesList: structured.slice(0, 150).map((a) => ({
        number: a.articleNumber,
        title: a.articleTitle,
        label: a.label,
        snippet: a.fullText.slice(0, 180),
      })),
      wordCount: pastedText.split(/\s+/).filter(Boolean).length,
      selected: true,
    };

    onAddDocs([doc]);
    setPastedTitle('');
    setPastedText('');
  };

  const handleStartEdit = (doc: UploadedDoc) => {
    setEditingDocId(doc.id);
    setEditNameValue(doc.name);
  };

  const handleSaveEdit = (id: string) => {
    if (onRenameDoc && editNameValue.trim()) {
      onRenameDoc(id, editNameValue.trim());
    }
    setEditingDocId(null);
  };

  const selectedCount = selectedDocs.length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-4">
      {/* Header & Overall Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Danh Sách Văn Bản Pháp Luật Đã Import ({importedDocs.length})</span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hệ thống tự động đọc từng trang PDF, nhận diện điều khoản và cho phép tra cứu chính xác theo văn bản đang chọn
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          >
            Chọn tất cả
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          >
            Bỏ chọn
          </button>
          <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
            Đang chọn {selectedCount}/{importedDocs.length} văn bản
            {totalArticlesRecognized > 0 && ` (${totalArticlesRecognized} điều)`}
          </span>
        </div>
      </div>

      {/* Filter / Search within imported documents list */}
      {importedDocs.length > 2 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={listSearchQuery}
            onChange={(e) => setListSearchQuery(e.target.value)}
            placeholder="Lọc nhanh theo tên văn bản pháp luật trong danh sách đã tải lên..."
            className="w-full text-xs pl-8.5 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Enhanced List of Currently Imported Documents */}
      {importedDocs.length > 0 ? (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {filteredDocs.map((doc) => {
            const isPdf = doc.mimeType === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf');
            const isWord = doc.name.toLowerCase().endsWith('.docx') || doc.name.toLowerCase().endsWith('.doc');
            const isEditing = editingDocId === doc.id;

            return (
              <div
                key={doc.id}
                className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  doc.selected
                    ? 'border-indigo-400 dark:border-indigo-700/80 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 opacity-75'
                }`}
              >
                {/* Left: Checkbox + Icon + Title & Metadata */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={Boolean(doc.selected)}
                    onChange={() => onToggleDoc(doc.id)}
                    className="w-4 h-4 mt-1 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer shrink-0"
                    title="Tích để chọn văn bản này vào phạm vi tra cứu"
                  />

                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isPdf
                        ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                        : isWord
                        ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400'
                        : doc.isSample
                        ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400'
                        : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Title or Inline Edit */}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 max-w-md">
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="text-xs px-2.5 py-1 rounded border border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(doc.id);
                            if (e.key === 'Escape') setEditingDocId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(doc.id)}
                          className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                          title="Lưu tên mới"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDocId(null)}
                          className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          title="Hủy"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-md">
                          {doc.name}
                        </span>

                        {/* Format Badge */}
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase shrink-0">
                          {isPdf ? 'PDF' : isWord ? 'DOCX' : doc.isSample ? 'Luật mẫu' : 'TXT'}
                        </span>

                        {/* Active Badge */}
                        {doc.selected ? (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
                            ✓ Đang kích hoạt tra cứu
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
                            Tạm bỏ qua
                          </span>
                        )}
                      </div>
                    )}

                    {/* Subtitle / Technical Stats */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2.5 flex-wrap">
                      {doc.originalFileName && doc.originalFileName !== doc.name && (
                        <span className="text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                          Tệp gốc: {doc.originalFileName}
                        </span>
                      )}

                      <span>{(doc.size / 1024).toFixed(1)} KB</span>

                      {/* Articles Count */}
                      {doc.articlesCount || doc.articlesList?.length ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                          • {doc.articlesCount || doc.articlesList?.length} điều khoản
                        </span>
                      ) : null}

                      {/* Pages / Paragraphs Count */}
                      {doc.paragraphs && (
                        <span>
                          • {doc.paragraphs.length}{' '}
                          {isPdf ? 'trang PDF (OCR)' : 'phân đoạn'}
                        </span>
                      )}

                      {/* Word count */}
                      {doc.wordCount ? <span>• {doc.wordCount.toLocaleString()} từ</span> : null}

                      {/* Reading Status indicator */}
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Đã đọc xong
                      </span>
                    </div>

                    {/* Low text warning if any */}
                    {doc.warning && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium mt-0.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{doc.warning}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions on this Document */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {onSelectOnlyDoc && (
                    <button
                      type="button"
                      onClick={() => onSelectOnlyDoc(doc.id)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 transition"
                      title="Chỉ tra cứu duy nhất văn bản này"
                    >
                      🎯 Chỉ tra cứu tệp này
                    </button>
                  )}

                  {onViewDocDetail && (
                    <button
                      type="button"
                      onClick={() => onViewDocDetail(doc)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition flex items-center gap-1 text-[11px] font-medium"
                      title="Xem toàn bộ các điều khoản & trang đã trích xuất"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Xem & Đọc trước</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleStartEdit(doc)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    title="Đổi tên văn bản để trích dẫn chuẩn hơn"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveDoc(doc.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                    title="Xóa văn bản này khỏi danh sách"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
          <BookMarked className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chưa có văn bản pháp luật nào trong danh sách. Hãy tải tệp PDF hoặc chọn văn bản mẫu bên dưới.
          </p>
        </div>
      )}

      {/* Tabs to Add More Documents */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2 text-xs font-bold px-3 transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            + Tải thêm tệp PDF / DOCX (Chọn nhiều tệp)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`pb-2 text-xs font-bold px-3 transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'samples'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Văn bản mẫu có sẵn
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-2 text-xs font-bold px-3 transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Dán văn bản trực tiếp
          </button>
        </div>

        {/* Tab 1: Upload (Multi-file enabled) */}
        {activeTab === 'upload' && (
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processMultipleFiles(e.target.files);
                  }
                }}
              />
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Chọn hoặc kéo thả một hoặc nhiều tệp PDF / DOCX
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Hệ thống tự động đọc từng <strong>Trang (PDF)</strong> hoặc <strong>Đoạn (DOCX)</strong>, nhận diện cấu trúc các <strong>Điều khoản</strong> để tra cứu chính xác nhất
                </p>
              </div>
              {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse mt-2 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>{processingStatus || 'Đang xử lý tài liệu...'}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Samples */}
        {activeTab === 'samples' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SAMPLE_LAWS.map((law) => {
              const isAdded = importedDocs.some((d) => d.name.includes(law.title));

              return (
                <div
                  key={law.id}
                  onClick={() => !isAdded && handleSelectSample(law)}
                  className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                    isAdded
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 cursor-default'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 cursor-pointer shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {law.category}
                      </span>
                      {isAdded && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Đã thêm
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white mt-1">
                      {law.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {law.description}
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    <span>{isAdded ? 'Đang kích hoạt trong list' : '+ Thêm vào danh sách'}</span>
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Paste */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <input
              type="text"
              value={pastedTitle}
              onChange={(e) => setPastedTitle(e.target.value)}
              placeholder="Tên văn bản hoặc điều khoản (Ví dụ: Nghị định 152/2020/NĐ-CP hoặc Hợp đồng nguyên tắc số 05)..."
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={3}
              placeholder="Dán nội dung điều luật, điều khoản hợp đồng hoặc văn bản pháp lý cần tra cứu tại đây..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!pastedText.trim()}
                onClick={handleApplyPasted}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm vào danh sách văn bản</span>
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};

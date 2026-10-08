/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Scale,
  Search,
  FileText,
  Sparkles,
  BookOpen,
  MessageSquare,
  History,
  CheckCircle,
  AlertTriangle,
  Download,
  ShieldCheck,
  Layers,
  HelpCircle,
  CheckSquare,
  Square,
  Tag,
  BarChart3,
  FileCheck2,
  ListChecks,
  ChevronRight,
  Database
} from 'lucide-react';
import { DocumentUploader, UploadedDoc } from './components/DocumentUploader';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { MarkdownViewer } from './components/MarkdownViewer';
import { ParagraphBrowser } from './components/ParagraphBrowser';
import { LegalChatDrawer } from './components/LegalChatDrawer';
import { ComplianceMatrixView } from './components/ComplianceMatrixView';
import { AuditReportView } from './components/AuditReportView';
import { SAMPLE_LAWS } from './data/sampleLaws';
import {
  INITIAL_COMPLIANCE_DATA,
  ComplianceRule,
  ComplianceStatus,
  SystemConfig
} from './data/complianceData';
import { parseDocumentArticles } from './utils/legalSearchEngine';

interface SearchResult {
  answer: string;
  modelUsed: string;
  fileNames: string[];
  question: string;
  keywords?: string[];
  articlesMentioned: string[];
  matchedExcerptsCount?: number;
  timestamp: string;
}

interface SearchHistoryItem {
  id: string;
  question: string;
  fileNames: string[];
  timestamp: string;
  result: SearchResult;
}

export default function App() {
  // Navigation tabs: 'matrix' | 'search' | 'library' | 'report'
  const [activeTab, setActiveTab] = useState<'matrix' | 'search' | 'library' | 'report'>('matrix');

  // Compliance state
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(INITIAL_COMPLIANCE_DATA.system_config);
  const [rulesMatrix, setRulesMatrix] = useState<ComplianceRule[]>(INITIAL_COMPLIANCE_DATA.rules_matrix);

  // Documents and Search state
  const [importedDocs, setImportedDocs] = useState<UploadedDoc[]>([]);
  const [question, setQuestion] = useState(
    'Quy định mới về chữ ký số, cấm chèn chữ ký scan theo TT99/2025 so với TT200/2014 và yêu cầu Audit Log 10 năm?'
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);
  const [activeView, setActiveView] = useState<'result' | 'paragraphs'>('result');
  const [previewingDoc, setPreviewingDoc] = useState<UploadedDoc | null>(null);
  const [modelName] = useState('gemini-3.6-flash');

  // Load compliance state and initialize the 4 supported sources
  useEffect(() => {
    // 1. Restore compliance matrix from localStorage if available
    try {
      const savedMatrix = localStorage.getItem('compliance_rules_matrix');
      const savedConfig = localStorage.getItem('compliance_system_config');
      if (savedMatrix) {
        setRulesMatrix(JSON.parse(savedMatrix));
      }
      if (savedConfig) {
        setSystemConfig(JSON.parse(savedConfig));
      }
    } catch (e) {
      console.error('Error loading compliance storage:', e);
    }

    // 2. Restore search history
    try {
      const savedHistory = localStorage.getItem('legal_ai_history');
      if (savedHistory) {
        setSearchHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error('Error loading search history:', e);
    }

    // 3. Initialize all 4 supported legal sources
    if (importedDocs.length === 0) {
      const initialDocs: UploadedDoc[] = [];

      SAMPLE_LAWS.forEach((law) => {
        const rawParas = law.content
          .split(/\n\s*\n/)
          .map((p, idx) => ({
            index: idx + 1,
            label: `Điều ${idx + 1}`,
            text: p.trim(),
          }))
          .filter((p) => p.text.length > 0);

        const structured = parseDocumentArticles(law.content, law.title, rawParas);

        initialDocs.push({
          id: `source-${law.id}`,
          name: `${law.title} (${law.number})`,
          originalFileName: `${law.title}.txt`,
          size: law.content.length,
          mimeType: 'text/plain',
          textContent: law.content,
          paragraphs: rawParas,
          articlesCount: structured.length,
          articlesList: structured.slice(0, 150).map((a) => ({
            number: a.articleNumber,
            title: a.articleTitle,
            label: a.label,
            snippet: a.fullText.slice(0, 180),
          })),
          wordCount: law.content.split(/\s+/).filter(Boolean).length,
          isSample: true,
          // Select TT99/2025 and TT200/2014 by default for instant comparative search
          selected: law.id === 'tt99-2025' || law.id === 'tt200-2014',
        });
      });

      setImportedDocs(initialDocs);
    }
  }, []);

  // Save rules changes to localStorage
  const saveComplianceState = (newRules: ComplianceRule[], newConfig?: SystemConfig) => {
    setRulesMatrix(newRules);
    try {
      localStorage.setItem('compliance_rules_matrix', JSON.stringify(newRules));
      if (newConfig) {
        setSystemConfig(newConfig);
        localStorage.setItem('compliance_system_config', JSON.stringify(newConfig));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRuleStatus = (ruleId: string, status: ComplianceStatus) => {
    const updated = rulesMatrix.map((r) =>
      r.rule_id === ruleId ? { ...r, compliance_status: status } : r
    );
    saveComplianceState(updated);
  };

  const handleToggleChecklistItem = (ruleId: string, itemId: string) => {
    const updated = rulesMatrix.map((r) => {
      if (r.rule_id !== ruleId) return r;
      return {
        ...r,
        checklist_items: r.checklist_items.map((item) =>
          item.item_id === itemId ? { ...item, collected: !item.collected } : item
        ),
      };
    });
    saveComplianceState(updated);
  };

  const handleAddChecklistItem = (ruleId: string, title: string, description: string) => {
    const updated = rulesMatrix.map((r) => {
      if (r.rule_id !== ruleId) return r;
      const newItem = {
        item_id: `CHK-${ruleId}-${Date.now()}`,
        title,
        description,
        required: true,
        collected: false,
      };
      return {
        ...r,
        checklist_items: [...r.checklist_items, newItem],
      };
    });
    saveComplianceState(updated);
  };

  const handleAddNewRule = (newRule: ComplianceRule) => {
    const updated = [newRule, ...rulesMatrix];
    saveComplianceState(updated);
  };

  const handleResetToDefault = () => {
    saveComplianceState(INITIAL_COMPLIANCE_DATA.rules_matrix, INITIAL_COMPLIANCE_DATA.system_config);
  };

  const handleExportJson = () => {
    const exportData = {
      system_config: systemConfig,
      rules_matrix: rulesMatrix,
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rules_matrix_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (imported: { system_config?: SystemConfig; rules_matrix: ComplianceRule[] }) => {
    if (imported.system_config) {
      setSystemConfig(imported.system_config);
    }
    saveComplianceState(imported.rules_matrix, imported.system_config);
  };

  // Cross-feature: Search Rule directly in Sources
  const handleSearchRuleInSources = (keywords: string[], queryHint: string) => {
    // Select TT99/2025 and TT200/2014
    setImportedDocs((prev) =>
      prev.map((d) => ({
        ...d,
        selected: d.id.includes('tt99') || d.id.includes('tt200') || d.id.includes('lkt'),
      }))
    );
    setQuestion(queryHint);
    setActiveTab('search');
    // Automatically execute search
    setTimeout(() => {
      handleSearch(queryHint);
    }, 150);
  };

  // Cross-feature: Consult AI about a rule
  const handleConsultAIRule = (rule: ComplianceRule) => {
    const prompt = `Phân tích chuyên sâu quy định "${rule.title}" (${rule.rule_id}):
- Mức độ rủi ro: ${rule.risk_level}
- So sánh quy định cũ (${rule.version_comparison.old_document.law_name} ${rule.version_comparison.old_document.article}) và quy định mới (${rule.version_comparison.new_document.law_name} ${rule.version_comparison.new_document.article})
- Đề xuất lộ trình xử lý cho các phòng ban: ${rule.impact_map.departments.join(', ')} và cấu hình ERP.`;
    setChatInitialPrompt(prompt);
    setIsChatOpen(true);
  };

  const handleAddDocs = (newDocs: UploadedDoc[]) => {
    setImportedDocs((prev) => [...prev, ...newDocs]);
    setErrorMsg(null);
  };

  const handleRemoveDoc = (id: string) => {
    setImportedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const handleToggleDoc = (id: string) => {
    setImportedDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  };

  const handleRenameDoc = (id: string, newName: string) => {
    setImportedDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name: newName.trim() || d.name } : d))
    );
  };

  const handleSelectOnlyDoc = (id: string) => {
    setImportedDocs((prev) =>
      prev.map((d) => ({ ...d, selected: d.id === id }))
    );
  };

  const handleSelectAll = () => {
    setImportedDocs((prev) => prev.map((d) => ({ ...d, selected: true })));
  };

  const handleDeselectAll = () => {
    setImportedDocs((prev) => prev.map((d) => ({ ...d, selected: false })));
  };

  const saveToHistory = (item: SearchResult) => {
    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      question: item.question,
      fileNames: item.fileNames || [],
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      result: item,
    };
    const updated = [newItem, ...searchHistory.slice(0, 8)];
    setSearchHistory(updated);
    try {
      localStorage.setItem('legal_ai_history', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (overrideQuestion?: string) => {
    const queryToRun = overrideQuestion || question;
    if (!queryToRun.trim()) {
      setErrorMsg('Vui lòng nhập câu hỏi hoặc từ khóa cần tra cứu!');
      return;
    }

    const activeDocs = importedDocs.filter((d) => d.selected);
    if (activeDocs.length === 0) {
      setErrorMsg('Vui lòng tích chọn ít nhất 1 văn bản pháp luật trong danh sách để tra cứu!');
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);
    setActiveView('result');

    try {
      const payload = {
        question: queryToRun.trim(),
        model: modelName,
        files: activeDocs.map((d) => ({
          name: d.name,
          mimeType: d.mimeType,
          base64: d.base64,
          textContent: d.textContent,
          paragraphs: d.paragraphs,
        })),
      };

      const response = await fetch('/api/legal-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Lỗi trong quá trình tra cứu văn bản');
      }

      const data: SearchResult = await response.json();
      setSearchResult(data);
      saveToHistory(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi kết nối với máy chủ AI');
    } finally {
      setIsSearching(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!searchResult) return;
    const blob = new Blob([searchResult.answer], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tra-cuu-phap-ly-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedDocsCount = importedDocs.filter((d) => d.selected).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                  {systemConfig.app_name}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                  {systemConfig.version}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  TT99/2025 &amp; TT200/2014
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block">
                Ma trận tuân thủ • So sánh thay đổi pháp lý • Tra cứu &amp; trích lục căn cứ với Gemini AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setChatInitialPrompt(undefined);
                setIsChatOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trợ Lý Pháp Lý AI</span>
              <span className="sm:hidden">Tư Vấn</span>
            </button>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center space-x-1 sm:space-x-2 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Ma Trận Tuân Thủ &amp; So Sánh (Rules Matrix)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
              {rulesMatrix.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'search'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Tra Cứu &amp; Trích Lục AI</span>
            {searchResult && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'report'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Báo Cáo Đánh Giá &amp; Khoảng Trống</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'library'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Kho Văn Bản &amp; Tải Tệp ({importedDocs.length})</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* TAB 1: RULES MATRIX VIEW */}
        {activeTab === 'matrix' && (
          <ComplianceMatrixView
            systemConfig={systemConfig}
            rules={rulesMatrix}
            onUpdateRuleStatus={handleUpdateRuleStatus}
            onToggleChecklistItem={handleToggleChecklistItem}
            onAddChecklistItem={handleAddChecklistItem}
            onSearchRuleInSources={handleSearchRuleInSources}
            onConsultAIRule={handleConsultAIRule}
            onAddNewRule={handleAddNewRule}
            onResetToDefault={handleResetToDefault}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
          />
        )}

        {/* TAB 2: AI SEARCH & CITATION VIEW */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Quick Scope Filter Chips */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Phạm vi văn bản đối chiếu:</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">
                      {selectedDocsCount === 0
                        ? 'Chưa chọn văn bản nào'
                        : selectedDocsCount === 1
                        ? `1 văn bản (${importedDocs.find((d) => d.selected)?.name})`
                        : `${selectedDocsCount} văn bản được chọn`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-xs font-bold text-slate-500 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-indigo-100 dark:border-indigo-900/60">
                  {importedDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleToggleDoc(doc.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-medium transition border flex items-center gap-1.5 cursor-pointer ${
                        doc.selected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <span className="truncate max-w-[220px]">{doc.name}</span>
                      {doc.selected && <span className="text-[11px] font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    <span>Nội dung hoặc điều khoản cần tra cứu &amp; đối chiếu</span>
                  </h3>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveView('result')}
                      className={`px-3 py-1 rounded-lg transition font-medium ${
                        activeView === 'result'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Kết quả tra cứu AI
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('paragraphs')}
                      className={`px-3 py-1 rounded-lg transition font-medium ${
                        activeView === 'paragraphs'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Duyệt theo Điều khoản
                    </button>
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Nhập câu hỏi tra cứu (Ví dụ: So sánh quy định chữ ký số và cấm scan ảnh chữ ký theo Điều 4 TT99/2025 với Điều 118 TT200/2014)..."
                  className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />

                {/* Suggested prompt chips from rules matrix */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Gợi ý từ ma trận:</span>
                  {rulesMatrix.map((r) => (
                    <button
                      key={r.rule_id}
                      type="button"
                      onClick={() => {
                        const prompt = `So sánh quy định về "${r.title}" giữa ${r.version_comparison.new_document.law_name} và ${r.version_comparison.old_document.law_name}, các yêu cầu kỹ thuật và tác động đến quy trình?`;
                        setQuestion(prompt);
                        handleSearch(prompt);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 transition"
                    >
                      🔍 [{r.rule_id}] {r.title}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    Nhấn Ctrl + Enter hoặc bấm nút để bắt đầu tra cứu
                  </span>

                  <button
                    type="button"
                    disabled={isSearching}
                    onClick={() => handleSearch()}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition cursor-pointer ${
                      isSearching
                        ? 'bg-indigo-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-500/25'
                    }`}
                  >
                    {isSearching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Đang phân tích &amp; trích lục...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Tra Cứu Với Gemini AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message if any */}
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                <div className="flex-1 font-medium">{errorMsg}</div>
                <button
                  onClick={() => setErrorMsg(null)}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Đóng
                </button>
              </div>
            )}

            {/* Search Result or Paragraphs Browser */}
            {activeView === 'result' ? (
              searchResult ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Đã trích xuất căn cứ pháp lý
                        </span>
                        <span className="text-xs text-slate-400">
                          Mô hình: {searchResult.modelUsed}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        {searchResult.question}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportMarkdown}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Xuất Markdown</span>
                      </button>

                      <button
                        onClick={() => {
                          setChatInitialPrompt(
                            `Giải thích chi tiết hơn về kết quả tra cứu: ${searchResult.question}`
                          );
                          setIsChatOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Hỏi sâu hơn</span>
                      </button>
                    </div>
                  </div>

                  {/* Articles and keywords tags */}
                  {(searchResult.articlesMentioned?.length > 0 || searchResult.keywords?.length) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
                      {searchResult.articlesMentioned?.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-bold text-slate-500">Điều khoản viện dẫn:</span>
                          {searchResult.articlesMentioned.map((art, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold font-mono text-[11px]"
                            >
                              {art}
                            </span>
                          ))}
                        </div>
                      )}

                      {searchResult.keywords && searchResult.keywords.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap ml-auto">
                          <span className="font-bold text-slate-500">Từ khóa:</span>
                          {searchResult.keywords.slice(0, 5).map((kw, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Render Answer */}
                  <div className="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed">
                    <MarkdownViewer content={searchResult.answer} />
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    Sẵn sàng tra cứu quy định kế toán &amp; chứng từ
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Hệ thống sẽ quét các văn bản TT99/2025, TT200/2014, Luật Kế toán 88/2015 và các tệp bạn tải lên để đưa ra trích lục chính xác từng điều khoản.
                  </p>
                </div>
              )
            ) : (
              <ParagraphBrowser
                documents={importedDocs.filter((d) => d.selected)}
                searchQuery={question}
              />
            )}
          </div>
        )}

        {/* TAB 3: AUDIT REPORT VIEW */}
        {activeTab === 'report' && (
          <AuditReportView
            systemConfig={systemConfig}
            rules={rulesMatrix}
            onConsultAI={(prompt) => {
              setChatInitialPrompt(prompt);
              setIsChatOpen(true);
            }}
          />
        )}

        {/* TAB 4: LEGAL SOURCES & UPLOADER */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            <DocumentUploader
              importedDocs={importedDocs}
              onAddDocs={handleAddDocs}
              onRemoveDoc={handleRemoveDoc}
              onToggleDoc={handleToggleDoc}
              onRenameDoc={handleRenameDoc}
              onSelectOnlyDoc={handleSelectOnlyDoc}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onSelectSampleQuestion={(q) => {
                setQuestion(q);
                setActiveTab('search');
              }}
              onViewDocParagraphs={() => {
                setActiveTab('search');
                setActiveView('paragraphs');
              }}
              onViewDocDetail={(doc) => setPreviewingDoc(doc)}
            />
          </div>
        )}
      </main>

      {/* Document Preview Modal */}
      {previewingDoc && (
        <DocumentPreviewModal
          doc={previewingDoc}
          onClose={() => setPreviewingDoc(null)}
          onSelectOnly={(id) => handleSelectOnlyDoc(id)}
        />
      )}

      {/* AI Chat Drawer */}
      <LegalChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialPrompt={chatInitialPrompt}
        documentName={importedDocs.filter((d) => d.selected).map((d) => d.name).join(', ')}
        documentContext={importedDocs
          .filter((d) => d.selected)
          .map((d) => `=== ${d.name} ===\n${(d.textContent || '').slice(0, 10000)}`)
          .join('\n\n')}
      />
    </div>
  );
}

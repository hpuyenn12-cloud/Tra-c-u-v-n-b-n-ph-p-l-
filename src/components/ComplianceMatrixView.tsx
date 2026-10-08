import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  Layers,
  Database,
  Building2,
  FileCheck,
  Download,
  Upload,
  Plus,
  RefreshCw,
  ExternalLink,
  Tag,
  ChevronDown,
  ChevronUp,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import {
  ComplianceRule,
  ComplianceStatus,
  SystemConfig,
  ChecklistItem,
  RiskLevel
} from '../data/complianceData';

interface ComplianceMatrixViewProps {
  systemConfig: SystemConfig;
  rules: ComplianceRule[];
  onUpdateRuleStatus: (ruleId: string, status: ComplianceStatus) => void;
  onToggleChecklistItem: (ruleId: string, itemId: string) => void;
  onAddChecklistItem: (ruleId: string, title: string, description: string) => void;
  onSearchRuleInSources: (keywords: string[], queryHint: string) => void;
  onConsultAIRule: (rule: ComplianceRule) => void;
  onAddNewRule: (newRule: ComplianceRule) => void;
  onResetToDefault: () => void;
  onExportJson: () => void;
  onImportJson: (imported: { system_config?: SystemConfig; rules_matrix: ComplianceRule[] }) => void;
}

export const ComplianceMatrixView: React.FC<ComplianceMatrixViewProps> = ({
  systemConfig,
  rules,
  onUpdateRuleStatus,
  onToggleChecklistItem,
  onAddChecklistItem,
  onSearchRuleInSources,
  onConsultAIRule,
  onAddNewRule,
  onResetToDefault,
  onExportJson,
  onImportJson,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedRuleIds, setExpandedRuleIds] = useState<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => {
      setCopiedText((curr) => (curr === text ? null : curr));
    }, 2000);
  };

  const toggleExpandRule = (ruleId: string) => {
    setExpandedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedRuleIds.size === rules.length) {
      setExpandedRuleIds(new Set());
    } else {
      setExpandedRuleIds(new Set(rules.map((r) => r.rule_id)));
    }
  };

  // New rule modal state
  const [newRuleData, setNewRuleData] = useState<Partial<ComplianceRule>>({
    rule_id: `CMP-0${rules.length + 1}`,
    title: '',
    subtitle: '',
    risk_level: 'Rủi ro cao',
    compliance_status: 'Chưa rõ',
    search_metadata: {
      keywords: [],
      intent_category: 'Chế độ kế toán & Chứng từ'
    },
    version_comparison: {
      is_modified: true,
      change_type: 'MODIFIED',
      old_document: {
        law_name: 'TT200/2014',
        article: 'Điều 118',
        chunk_id: 'TT200-new',
        content: ''
      },
      new_document: {
        law_name: 'TT99/2025',
        article: 'Điều 4',
        chunk_id: 'TT99-new',
        content: ''
      }
    },
    impact_map: {
      process_affected: '',
      departments: ['Phòng Kế toán'],
      erp_fields: []
    },
    checklist_items: []
  });

  // Calculate statistics
  const totalRules = rules.length;
  const compliantCount = rules.filter((r) => r.compliance_status === 'Đã tuân thủ').length;
  const inProgressCount = rules.filter((r) => r.compliance_status === 'Đang xử lý').length;
  const nonCompliantCount = rules.filter((r) => r.compliance_status === 'Chưa tuân thủ').length;
  const unclearCount = rules.filter((r) => r.compliance_status === 'Chưa rõ').length;

  const totalChecklistItems = rules.reduce((acc, r) => acc + r.checklist_items.length, 0);
  const completedChecklistItems = rules.reduce(
    (acc, r) => acc + r.checklist_items.filter((i) => i.collected).length,
    0
  );

  const compliancePercentage = totalRules > 0 ? Math.round((compliantCount / totalRules) * 100) : 0;

  // Extract all distinct departments and categories
  const allDepartments = Array.from(
    new Set(rules.flatMap((r) => r.impact_map.departments || []))
  );
  const allCategories = Array.from(
    new Set(rules.map((r) => r.search_metadata.intent_category).filter(Boolean))
  );

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      searchTerm === '' ||
      rule.rule_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.search_metadata.keywords.some((k) => k.toLowerCase().includes(searchTerm.toLowerCase())) ||
      rule.impact_map.process_affected.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk =
      selectedRisk === 'all' || rule.risk_level.toLowerCase().includes(selectedRisk.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' || rule.compliance_status === selectedStatus;

    const matchesDept =
      selectedDept === 'all' || rule.impact_map.departments.includes(selectedDept);

    const matchesCategory =
      selectedCategory === 'all' || rule.search_metadata.intent_category === selectedCategory;

    return matchesSearch && matchesRisk && matchesStatus && matchesDept && matchesCategory;
  });

  const getRiskBadge = (level: string) => {
    if (level.includes('nghiêm trọng')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
          {level}
        </span>
      );
    }
    if (level.includes('cao')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          {level}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
        {level}
      </span>
    );
  };

  const getStatusBadge = (status: ComplianceStatus) => {
    switch (status) {
      case 'Đã tuân thủ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Đã tuân thủ
          </span>
        );
      case 'Đang xử lý':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
            <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            Đang xử lý
          </span>
        );
      case 'Chưa tuân thủ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Chưa tuân thủ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            Chưa rõ / Đang rà soát
          </span>
        );
    }
  };

  const getChangeTypeBadge = (type: string) => {
    if (type === 'MODIFIED') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          SỬA ĐỔI (MODIFIED)
        </span>
      );
    }
    if (type === 'ADDED') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          QUY ĐỊNH MỚI (ADDED)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        BÃI BỎ (REMOVED)
      </span>
    );
  };

  const handleImportSubmit = () => {
    try {
      setImportError(null);
      const parsed = JSON.parse(importJsonText);
      if (!parsed.rules_matrix || !Array.isArray(parsed.rules_matrix)) {
        throw new Error('Dữ liệu JSON phải chứa trường "rules_matrix" dạng mảng');
      }
      onImportJson(parsed);
      setShowImportModal(false);
      setImportJsonText('');
    } catch (err: any) {
      setImportError(err.message || 'Cú pháp JSON không hợp lệ');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / System Metadata */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white">
                {systemConfig.version}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {systemConfig.app_name}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Cập nhật: {systemConfig.last_updated}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Ma trận đánh giá tuân thủ quy định kế toán số, so sánh đối chiếu TT200/2014 &amp; TT99/2025,
              nhận diện rủi ro ERP và tự động hóa checklist kiểm toán.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAddRuleModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Quy Định Mới</span>
            </button>

            <button
              onClick={onExportJson}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              title="Xuất file JSON ma trận tuân thủ"
            >
              <Download className="w-4 h-4" />
              <span>Xuất JSON</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              title="Nhập dữ liệu JSON"
            >
              <Upload className="w-4 h-4" />
              <span>Nhập JSON</span>
            </button>

            <button
              onClick={onResetToDefault}
              className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Khôi phục ma trận mẫu mặc định"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Supported Sources Tags */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            Văn bản pháp lý nền tảng:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {systemConfig.supported_sources.map((src, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium"
              >
                <FileText className="w-3 h-3 text-indigo-500" />
                {src}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Dashboard / Compliance Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Overall Compliance Rate */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-2xl p-4 sm:p-5 text-white flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-indigo-200 text-xs font-semibold mb-1">
              <span>Độ Tuân Thủ Chung</span>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-3xl font-black">{compliancePercentage}%</div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-indigo-950/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${compliancePercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-indigo-200 mt-1.5">
              {compliantCount}/{totalRules} quy định đã xác nhận tuân thủ
            </p>
          </div>
        </div>

        {/* Card 2: Đã tuân thủ */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <span>Đã Tuân Thủ</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {compliantCount}
            </span>
            <span className="text-xs text-slate-500 ml-1.5">quy định</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Hệ thống &amp; quy chế đã đáp ứng
          </div>
        </div>

        {/* Card 3: Đang xử lý */}
        <div className="bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-700 dark:text-sky-400 text-xs font-bold">
            <span>Đang Xử Lý</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400">
              {inProgressCount}
            </span>
            <span className="text-xs text-slate-500 ml-1.5">quy định</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Đang triển khai nâng cấp kỹ thuật
          </div>
        </div>

        {/* Card 4: Chưa tuân thủ / Cần xử lý */}
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-bold">
            <span>Chưa Tuân Thủ</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              {nonCompliantCount}
            </span>
            <span className="text-xs text-slate-500 ml-1.5">quy định</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Khoảng trống pháp lý cần khắc phục
          </div>
        </div>

        {/* Card 5: Checklist Hành Động */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs font-bold">
            <span>Checklist Nhiệm Vụ</span>
            <FileCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {completedChecklistItems}/{totalChecklistItems}
            </span>
            <span className="text-xs text-slate-500 ml-1.5">đã xong</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {unclearCount > 0 ? `${unclearCount} điều khoản chưa rõ` : 'Đã rà soát toàn bộ'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã CMP, tiêu đề, từ khóa (chữ ký số, audit log, WORM, timestamp...)"
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Quick Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">⚡ Tất cả mức rủi ro</option>
              <option value="nghiêm trọng">Rủi ro nghiêm trọng</option>
              <option value="cao">Rủi ro cao</option>
              <option value="trung bình">Rủi ro trung bình</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">🛡️ Tất cả trạng thái</option>
              <option value="Đã tuân thủ">Đã tuân thủ</option>
              <option value="Đang xử lý">Đang xử lý</option>
              <option value="Chưa tuân thủ">Chưa tuân thủ</option>
              <option value="Chưa rõ">Chưa rõ</option>
            </select>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">🏢 Tất cả phòng ban</option>
              {allDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">🏷️ Nhóm chủ đề</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter summary and category quick bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {filteredRules.length} / {rules.length} quy chuẩn
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                }`}
              >
                Tất cả nhóm
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleExpandAll}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {expandedRuleIds.size === rules.length ? 'Thu gọn tất cả' : 'Mở rộng tất cả chi tiết'}
            </button>

            {(searchTerm || selectedRisk !== 'all' || selectedStatus !== 'all' || selectedDept !== 'all' || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedRisk('all');
                  setSelectedStatus('all');
                  setSelectedDept('all');
                  setSelectedCategory('all');
                }}
                className="text-slate-500 hover:text-rose-600 font-semibold hover:underline cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rules List / Cards */}
      <div className="space-y-4">
        {filteredRules.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center">
            <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700 dark:text-slate-200">Không tìm thấy quy định phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1">
              Thử tìm kiếm với từ khóa khác hoặc xóa bớt tiêu chí lọc.
            </p>
          </div>
        ) : (
          filteredRules.map((rule) => {
            const isExpanded = expandedRuleIds.has(rule.rule_id);
            const completedInRule = rule.checklist_items.filter((c) => c.collected).length;
            const totalInRule = rule.checklist_items.length;

            return (
              <div
                key={rule.rule_id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition hover:border-indigo-300 dark:hover:border-indigo-800/80 overflow-hidden"
              >
                {/* Rule Card Header */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {rule.rule_id}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                          {rule.search_metadata.intent_category}
                        </span>
                        {getRiskBadge(rule.risk_level)}
                        {getChangeTypeBadge(rule.version_comparison.change_type)}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {rule.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {rule.subtitle}
                      </p>
                    </div>

                    {/* Status switcher */}
                    <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500">Trạng thái:</span>
                        <select
                          value={rule.compliance_status}
                          onChange={(e) =>
                            onUpdateRuleStatus(rule.rule_id, e.target.value as ComplianceStatus)
                          }
                          className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="Chưa rõ">❓ Chưa rõ</option>
                          <option value="Đang xử lý">⏳ Đang xử lý</option>
                          <option value="Đã tuân thủ">✅ Đã tuân thủ</option>
                          <option value="Chưa tuân thủ">⚠️ Chưa tuân thủ</option>
                        </select>
                      </div>

                      {/* Checklist progress pill */}
                      {totalInRule > 0 && (
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Checklist: {completedInRule}/{totalInRule} hoàn thành
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Version Comparison Preview (Side-by-side) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {/* Old Document */}
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Văn bản cũ: {rule.version_comparison.old_document.law_name} ({rule.version_comparison.old_document.article})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(rule.version_comparison.old_document.chunk_id)}
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 transition cursor-pointer"
                          title="Sao chép Chunk ID"
                        >
                          {copiedText === rule.version_comparison.old_document.chunk_id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5 opacity-60" />
                              <span>{rule.version_comparison.old_document.chunk_id}</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                        "{rule.version_comparison.old_document.content}"
                      </p>
                    </div>

                    {/* New Document */}
                    <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          Văn bản mới: {rule.version_comparison.new_document.law_name} ({rule.version_comparison.new_document.article})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(rule.version_comparison.new_document.chunk_id)}
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 transition cursor-pointer"
                          title="Sao chép Chunk ID"
                        >
                          {copiedText === rule.version_comparison.new_document.chunk_id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5 opacity-60" />
                              <span>{rule.version_comparison.new_document.chunk_id}</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                        "{rule.version_comparison.new_document.content}"
                      </p>
                    </div>
                  </div>

                  {/* Impact Map summary badges */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        Phòng ban:
                      </span>
                      {rule.impact_map.departments.map((dept, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]"
                        >
                          {dept}
                        </span>
                      ))}

                      {rule.impact_map.erp_fields.length > 0 && (
                        <div className="flex items-center gap-1.5 ml-2 flex-wrap">
                          <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Database className="w-3.5 h-3.5 text-indigo-500" />
                            ERP fields:
                          </span>
                          {rule.impact_map.erp_fields.map((fld, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleCopy(fld)}
                              className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-100/70 hover:bg-indigo-200 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 transition cursor-pointer"
                              title="Sao chép tên trường ERP"
                            >
                              <span>{fld}</span>
                              {copiedText === fld ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 opacity-40" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expand/Collapse details button */}
                    <button
                      type="button"
                      onClick={() => toggleExpandRule(rule.rule_id)}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <span>{isExpanded ? 'Thu gọn chi tiết' : 'Xem chi tiết & Checklist'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Section: Detailed Impact Map, Checklist & Action triggers */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 bg-slate-50/70 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 space-y-5">
                    {/* Detailed Impact Map */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Bản Đồ Tác Động Quy Trình Nội Bộ</span>
                      </h4>
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs space-y-2">
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200">Quy trình ảnh hưởng: </strong>
                          <span className="text-slate-600 dark:text-slate-400">{rule.impact_map.process_affected}</span>
                        </div>
                        {rule.impact_map.erp_fields.length > 0 && (
                          <div>
                            <strong className="text-slate-800 dark:text-slate-200">Trường dữ liệu kỹ thuật ERP/DB cần bổ sung: </strong>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rule.impact_map.erp_fields.map((f, i) => (
                                <code
                                  key={i}
                                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-mono text-[11px]"
                                >
                                  {f}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interactive Checklist Items */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Checklist Các Hạng Mục Cần Thực Hiện</span>
                        </h4>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {completedInRule} / {totalInRule} hoàn thành
                        </span>
                      </div>

                      <div className="space-y-2">
                        {rule.checklist_items.map((item) => (
                          <div
                            key={item.item_id}
                            onClick={() => onToggleChecklistItem(rule.rule_id, item.item_id)}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                              item.collected
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.collected}
                              onChange={() => {}} // handled by parent div click
                              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="flex-1 text-xs">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-bold ${item.collected ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                  {item.title}
                                </span>
                                {item.required && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold">
                                    Bắt buộc
                                  </span>
                                )}
                              </div>
                              <p className={`mt-0.5 ${item.collected ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                {item.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fast Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onSearchRuleInSources(
                              rule.search_metadata.keywords,
                              `${rule.title}: ${rule.subtitle}`
                            )
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs cursor-pointer"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Tra Cứu Đối Chiếu Trong TT99 &amp; TT200</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onConsultAIRule(rule)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>AI Đánh Giá Rủi Ro &amp; Lộ Trình</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Tag className="w-3 h-3" />
                        <span>Từ khóa: {rule.search_metadata.keywords.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Import JSON Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Nhập Dữ Liệu Ma Trận Tuân Thủ (JSON)</span>
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dán nội dung JSON chứa cấu hình <code>system_config</code> và danh sách <code>rules_matrix</code> để cập nhật trực tiếp vào hệ thống.
            </p>

            <textarea
              rows={10}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='{\n  "system_config": {...},\n  "rules_matrix": [...]\n}'
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {importError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
              >
                Xác Nhận Nhập JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Rule Modal */}
      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Thêm Quy Định Tuân Thủ Mới</span>
              </h3>
              <button
                onClick={() => setShowAddRuleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Mã Quy Định (Rule ID):</label>
                  <input
                    type="text"
                    value={newRuleData.rule_id || ''}
                    onChange={(e) => setNewRuleData({ ...newRuleData, rule_id: e.target.value })}
                    placeholder="CMP-03"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Mức Rủi Ro:</label>
                  <select
                    value={newRuleData.risk_level || 'Rủi ro cao'}
                    onChange={(e) => setNewRuleData({ ...newRuleData, risk_level: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Rủi ro nghiêm trọng">Rủi ro nghiêm trọng</option>
                    <option value="Rủi ro cao">Rủi ro cao</option>
                    <option value="Rủi ro trung bình">Rủi ro trung bình</option>
                    <option value="Rủi ro thấp">Rủi ro thấp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tiêu Đề Quy Định:</label>
                <input
                  type="text"
                  value={newRuleData.title || ''}
                  onChange={(e) => setNewRuleData({ ...newRuleData, title: e.target.value })}
                  placeholder="Ví dụ: Lưu trữ hóa đơn điện tử và chứng từ ngoại tệ"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tóm Tắt Yêu Cầu Thay Đổi:</label>
                <textarea
                  rows={2}
                  value={newRuleData.subtitle || ''}
                  onChange={(e) => setNewRuleData({ ...newRuleData, subtitle: e.target.value })}
                  placeholder="Mô tả nội dung chính cần thay đổi..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nhóm Chủ Đề (Intent):</label>
                  <input
                    type="text"
                    value={newRuleData.search_metadata?.intent_category || ''}
                    onChange={(e) =>
                      setNewRuleData({
                        ...newRuleData,
                        search_metadata: {
                          keywords: newRuleData.search_metadata?.keywords || [],
                          intent_category: e.target.value
                        }
                      })
                    }
                    placeholder="Thẩm quyền & Chữ ký / Bảo mật"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Loại Thay Đổi:</label>
                  <select
                    value={newRuleData.version_comparison?.change_type || 'MODIFIED'}
                    onChange={(e) =>
                      setNewRuleData({
                        ...newRuleData,
                        version_comparison: {
                          ...newRuleData.version_comparison!,
                          change_type: e.target.value as any
                        }
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="MODIFIED">Sửa đổi (MODIFIED)</option>
                    <option value="ADDED">Bổ sung mới (ADDED)</option>
                    <option value="REMOVED">Bãi bỏ (REMOVED)</option>
                  </select>
                </div>
              </div>

              {/* Version Comparison Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Văn bản cũ (TT200/2014):</label>
                  <input
                    type="text"
                    value={newRuleData.version_comparison?.old_document.article || ''}
                    onChange={(e) =>
                      setNewRuleData({
                        ...newRuleData,
                        version_comparison: {
                          ...newRuleData.version_comparison!,
                          old_document: {
                            ...newRuleData.version_comparison!.old_document,
                            article: e.target.value
                          }
                        }
                      })
                    }
                    placeholder="Điều 118"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mb-1"
                  />
                  <textarea
                    rows={2}
                    value={newRuleData.version_comparison?.old_document.content || ''}
                    onChange={(e) =>
                      setNewRuleData({
                        ...newRuleData,
                        version_comparison: {
                          ...newRuleData.version_comparison!,
                          old_document: {
                            ...newRuleData.version_comparison!.old_document,
                            content: e.target.value
                          }
                        }
                      })
                    }
                    placeholder="Nội dung điều khoản cũ..."
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">Văn bản mới (TT99/2025):</label>
                  <input
                    type="text"
                    value={newRuleData.version_comparison?.new_document.article || ''}
                    onChange={(e) =>
                      setNewRuleData({
                        ...newRuleData,
                        version_comparison: {
                          ...newRuleData.version_comparison!,
                          new_document: {
                            ...newRuleData.version_comparison!.new_document,
                            article: e.target.value
                          }
                        }
                      })
                    }
                    placeholder="Điều 4"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mb-1"
                  />
                  <textarea
                    rows={2}
                    value={newRuleData.version_comparison?.new_document.content || ''}
                    onChange={(e) =>
                      setNewRuleData({
                        ...newRuleData,
                        version_comparison: {
                          ...newRuleData.version_comparison!,
                          new_document: {
                            ...newRuleData.version_comparison!.new_document,
                            content: e.target.value
                          }
                        }
                      })
                    }
                    placeholder="Nội dung điều khoản mới..."
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddRuleModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newRuleData.title || !newRuleData.rule_id) return;
                  const ruleToSave: ComplianceRule = {
                    rule_id: newRuleData.rule_id,
                    title: newRuleData.title,
                    subtitle: newRuleData.subtitle || '',
                    risk_level: newRuleData.risk_level || 'Rủi ro cao',
                    compliance_status: 'Chưa rõ',
                    search_metadata: {
                      keywords: newRuleData.title.split(/\s+/).slice(0, 5),
                      intent_category: newRuleData.search_metadata?.intent_category || 'Chế độ kế toán'
                    },
                    version_comparison: newRuleData.version_comparison || {
                      is_modified: true,
                      change_type: 'MODIFIED',
                      old_document: {
                        law_name: 'TT200/2014',
                        article: 'Điều 118',
                        chunk_id: 'TT200-038',
                        content: ''
                      },
                      new_document: {
                        law_name: 'TT99/2025',
                        article: 'Điều 4',
                        chunk_id: 'TT99-012',
                        content: ''
                      }
                    },
                    impact_map: {
                      process_affected: 'Quy trình kế toán doanh nghiệp',
                      departments: ['Phòng Kế toán'],
                      erp_fields: []
                    },
                    checklist_items: [
                      {
                        item_id: `CHK-${newRuleData.rule_id}-1`,
                        title: 'Đánh giá ảnh hưởng và rà soát hệ thống',
                        description: 'Khảo sát hiện trạng quy trình nội bộ so với quy định mới.',
                        required: true,
                        collected: false
                      }
                    ]
                  };
                  onAddNewRule(ruleToSave);
                  setShowAddRuleModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
              >
                Lưu Quy Định Mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

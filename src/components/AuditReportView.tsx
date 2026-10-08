import React from 'react';
import {
  FileText,
  Download,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Database,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Printer
} from 'lucide-react';
import { ComplianceRule, SystemConfig } from '../data/complianceData';

interface AuditReportViewProps {
  systemConfig: SystemConfig;
  rules: ComplianceRule[];
  onConsultAI: (prompt: string) => void;
}

export const AuditReportView: React.FC<AuditReportViewProps> = ({
  systemConfig,
  rules,
  onConsultAI,
}) => {
  const total = rules.length;
  const compliant = rules.filter((r) => r.compliance_status === 'Đã tuân thủ');
  const inProgress = rules.filter((r) => r.compliance_status === 'Đang xử lý');
  const nonCompliant = rules.filter((r) => r.compliance_status === 'Chưa tuân thủ');
  const unclear = rules.filter((r) => r.compliance_status === 'Chưa rõ');

  const severeRisks = rules.filter((r) => r.risk_level.toLowerCase().includes('nghiêm trọng'));
  const highRisks = rules.filter((r) => r.risk_level.toLowerCase().includes('cao'));

  const allChecklistItems = rules.flatMap((r) => r.checklist_items);
  const completedTasks = allChecklistItems.filter((i) => i.collected).length;

  const score = total > 0 ? Math.round((compliant.length / total) * 100) : 0;

  // Departmental breakdown
  const deptMap: { [key: string]: { total: number; compliant: number; nonCompliant: number } } = {};
  rules.forEach((r) => {
    r.impact_map.departments.forEach((d) => {
      if (!deptMap[d]) {
        deptMap[d] = { total: 0, compliant: 0, nonCompliant: 0 };
      }
      deptMap[d].total += 1;
      if (r.compliance_status === 'Đã tuân thủ') deptMap[d].compliant += 1;
      if (r.compliance_status === 'Chưa tuân thủ') deptMap[d].nonCompliant += 1;
    });
  });

  const generateMarkdownReport = () => {
    let md = `# BÁO CÁO ĐÁNH GIÁ TUÂN THỦ PHÁP LÝ KẾ TOÁN & HỆ THỐNG ERP\n\n`;
    md += `**Hệ thống:** ${systemConfig.app_name} (${systemConfig.version})\n`;
    md += `**Ngày lập báo cáo:** ${new Date().toLocaleDateString('vi-VN')} (Cập nhật chuẩn: ${systemConfig.last_updated})\n`;
    md += `**Văn bản căn cứ:** ${systemConfig.supported_sources.join(', ')}\n\n`;
    md += `---\n\n`;
    md += `## 1. TỔNG QUAN TÌNH HÌNH TUÂN THỦ\n\n`;
    md += `- **Điểm số tuân thủ:** ${score}% (${compliant.length}/${total} quy định đạt chuẩn)\n`;
    md += `- **Số quy định đang xử lý:** ${inProgress.length}\n`;
    md += `- **Số vi phạm / khoảng trống chưa tuân thủ:** ${nonCompliant.length}\n`;
    md += `- **Số quy chuẩn chưa xác định rõ:** ${unclear.length}\n`;
    md += `- **Tiến độ checklist nhiệm vụ:** ${completedTasks}/${allChecklistItems.length} hạng mục hoàn thành\n\n`;

    md += `## 2. DANH MỤC RỦI RO TRỌNG YẾU CẦN KHẮC PHỤC NGAY\n\n`;
    [...severeRisks, ...highRisks].forEach((r, idx) => {
      md += `### ${idx + 1}. [${r.rule_id}] ${r.title} (${r.risk_level})\n`;
      md += `- **Hiện trạng:** ${r.compliance_status}\n`;
      md += `- **Văn bản mới (TT99/2025):** ${r.version_comparison.new_document.article}: "${r.version_comparison.new_document.content}"\n`;
      md += `- **Quy trình bị ảnh hưởng:** ${r.impact_map.process_affected}\n`;
      md += `- **Phòng ban phụ trách:** ${r.impact_map.departments.join(', ')}\n`;
      if (r.impact_map.erp_fields.length > 0) {
        md += `- **Trường dữ liệu ERP cần nâng cấp:** \`${r.impact_map.erp_fields.join('`, `')}\`\n`;
      }
      md += `- **Hành động bắt buộc:**\n`;
      r.checklist_items.forEach((c) => {
        md += `  - [${c.collected ? 'x' : ' '}] ${c.title}: ${c.description} ${c.required ? '*(Bắt buộc)*' : ''}\n`;
      });
      md += `\n`;
    });

    md += `## 3. PHÂN BỔ TRÁCH NHIỆM THEO PHÒNG BAN\n\n`;
    Object.entries(deptMap).forEach(([dept, st]) => {
      md += `- **${dept}:** ${st.total} quy định liên quan (Đã tuân thủ: ${st.compliant}, Chưa tuân thủ: ${st.nonCompliant})\n`;
    });

    md += `\n---\n*Báo cáo được trích xuất tự động từ Hệ thống ${systemConfig.app_name}.*`;

    return md;
  };

  const handleDownloadReport = () => {
    const md = generateMarkdownReport();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao-cao-tuan-thu-phap-ly-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Báo Cáo Kiểm Toán &amp; Đánh Giá Khoảng Trống
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              Báo Cáo Tuân Thủ Pháp Lý Chế Độ Kế Toán &amp; ERP
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Phân tích khoảng cách giữa TT200/2014 và TT99/2025, đo lường tỷ lệ an toàn pháp lý doanh nghiệp.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Tải Báo Cáo Markdown</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
            >
              <Printer className="w-4 h-4" />
              <span>In / Lưu PDF</span>
            </button>
          </div>
        </div>

        {/* Score Gauge & Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shrink-0">
              {score}%
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Chỉ Số Tuân Thủ</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {score >= 80 ? 'An toàn pháp lý cao' : score >= 50 ? 'Rủi ro trung bình, cần đẩy nhanh' : 'Mức độ rủi ro xử phạt cao'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white font-black text-xl flex items-center justify-center shrink-0">
              {severeRisks.length + highRisks.length}
            </div>
            <div>
              <div className="text-xs font-bold text-rose-900 dark:text-rose-300">Điểm Nóng Rủi Ro Cao</div>
              <div className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
                {severeRisks.length} nghiêm trọng, {highRisks.length} rủi ro cao
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shrink-0">
              {completedTasks}/{allChecklistItems.length}
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Checklist Đã Hoàn Thành</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Các giải pháp kỹ thuật &amp; quy chế đã thực hiện
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Phân Bổ Trách Nhiệm Tuân Thủ Theo Phòng Ban</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(deptMap).map(([dept, stat]) => {
            const deptScore = stat.total > 0 ? Math.round((stat.compliant / stat.total) * 100) : 0;
            return (
              <div
                key={dept}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2"
              >
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                  <span>{dept}</span>
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {deptScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full"
                    style={{ width: `${deptScore}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>{stat.total} quy chuẩn</span>
                  <span>{stat.nonCompliant} chưa tuân thủ</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Rules Detail */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Kế Hoạch Khắc Phục Các Điểm Nóng Pháp Lý</span>
          </h3>

          <button
            onClick={() =>
              onConsultAI(
                `Lập kế hoạch hành động 30 ngày cho doanh nghiệp để chuyển đổi chế độ kế toán từ TT200/2014 sang TT99/2025 đối với chữ ký số chứng từ và Audit Log 10 năm.`
              )
            }
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Gợi Ý Lộ Trình 30 Ngày</span>
          </button>
        </div>

        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.rule_id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {rule.rule_id}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{rule.title}</span>
                  <span className="text-[11px] text-slate-500">({rule.risk_level})</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {rule.impact_map.process_affected}
                </p>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400">
                  Phụ trách: {rule.impact_map.departments.join(', ')}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    rule.compliance_status === 'Đã tuân thủ'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : rule.compliance_status === 'Đang xử lý'
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                      : rule.compliance_status === 'Chưa tuân thủ'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  {rule.compliance_status}
                </span>

                <span className="text-slate-500 font-medium">
                  {rule.checklist_items.filter((i) => i.collected).length}/
                  {rule.checklist_items.length} nhiệm vụ
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

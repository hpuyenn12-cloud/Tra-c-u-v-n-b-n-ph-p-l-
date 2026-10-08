export interface VersionDoc {
  law_name: string;
  article: string;
  chunk_id: string;
  content: string;
}

export interface VersionComparison {
  is_modified: boolean;
  change_type: 'MODIFIED' | 'ADDED' | 'REMOVED';
  old_document: VersionDoc;
  new_document: VersionDoc;
}

export interface ImpactMap {
  process_affected: string;
  departments: string[];
  erp_fields: string[];
}

export interface ChecklistItem {
  item_id: string;
  title: string;
  description: string;
  required: boolean;
  collected: boolean;
}

export interface SearchMetadata {
  keywords: string[];
  intent_category: string;
}

export type ComplianceStatus = 'Đã tuân thủ' | 'Chưa tuân thủ' | 'Đang xử lý' | 'Chưa rõ';
export type RiskLevel = 'Rủi ro nghiêm trọng' | 'Rủi ro cao' | 'Rủi ro trung bình' | 'Rủi ro thấp';

export interface ComplianceRule {
  rule_id: string;
  title: string;
  subtitle: string;
  risk_level: RiskLevel | string;
  compliance_status: ComplianceStatus;
  search_metadata: SearchMetadata;
  version_comparison: VersionComparison;
  impact_map: ImpactMap;
  checklist_items: ChecklistItem[];
  notes?: string;
}

export interface SystemConfig {
  app_name: string;
  version: string;
  last_updated: string;
  supported_sources: string[];
}

export interface ComplianceState {
  system_config: SystemConfig;
  rules_matrix: ComplianceRule[];
}

export const INITIAL_COMPLIANCE_DATA: ComplianceState = {
  system_config: {
    app_name: "Tra Cứu & Tuân Thủ Pháp Lý",
    version: "1.0-final",
    last_updated: "2026-10-03",
    supported_sources: [
      "Luật Kế toán 88/2015/QH13",
      "Thông tư 200/2014/TT-BTC",
      "Thông tư 99/2025/TT-BTC",
      "VAS 21"
    ]
  },
  rules_matrix: [
    {
      rule_id: "CMP-01",
      title: "Ký duyệt chứng từ kế toán điện tử & Chữ ký số",
      subtitle: "Chuyển từ ký tay chứng từ giấy sang chuẩn chữ ký số xác thực thời gian thực và liên kết dữ liệu.",
      risk_level: "Rủi ro cao",
      compliance_status: "Chưa rõ",
      search_metadata: {
        keywords: [
          "chữ ký số",
          "ký duyệt",
          "chứng từ điện tử",
          "timestamp",
          "scan"
        ],
        intent_category: "Thẩm quyền & Chữ ký"
      },
      version_comparison: {
        is_modified: true,
        change_type: "MODIFIED",
        old_document: {
          law_name: "TT200/2014",
          article: "Điều 118",
          chunk_id: "TT200-038",
          content: "Chứng từ bằng giấy phải có đủ chữ ký bằng bút mực không phai của các bên liên quan theo từng chức danh quy định."
        },
        new_document: {
          law_name: "TT99/2025",
          article: "Điều 4",
          chunk_id: "TT99-012",
          content: "Bắt buộc ký số hoặc chữ ký điện tử hợp lệ với timestamp thời gian thực; nghiêm cấm chèn hình ảnh chữ ký scan vào chứng từ số."
        }
      },
      "impact_map": {
        process_affected: "Quy trình lập, luân chuyển và phê duyệt chứng từ kế toán điện tử",
        departments: [
          "Phòng Kế toán",
          "Khối Vận hành",
          "Ban Giám đốc"
        ],
        erp_fields: [
          "DigitalSignatureHash",
          "SignerCertificateId",
          "SignedTimestamp",
          "ApprovalWorkflowState"
        ]
      },
      checklist_items: [
        {
          item_id: "CHK-CMP01-1",
          title: "Tích hợp chữ ký số vào ERP",
          description: "Cập nhật phân hệ ký duyệt điện tử, loại bỏ tính năng upload ảnh chữ ký scan.",
          required: true,
          collected: false
        },
        {
          item_id: "CHK-CMP01-2",
          title: "Ký quy chế nội bộ mới",
          description: "Ban hành quy định nội bộ về quản lý và sử dụng Token/HSM.",
          required: true,
          collected: false
        }
      ]
    },
    {
      rule_id: "CMP-02",
      title: "Nhật ký kiểm toán hệ thống (Audit Log) bất biến",
      subtitle: "Quy định mới bắt buộc cấu hình bảo lưu Audit Log 10 năm chống xóa sửa.",
      risk_level: "Rủi ro nghiêm trọng",
      compliance_status: "Chưa rõ",
      search_metadata: {
        keywords: [
          "audit log",
          "nhật ký kiểm toán",
          "bảo lưu",
          "chống xóa sửa",
          "10 năm"
        ],
        intent_category: "Bảo mật & Lưu trữ"
      },
      version_comparison: {
        is_modified: true,
        change_type: "ADDED",
        old_document: {
          law_name: "TT200/2014",
          article: "Điều 122",
          chunk_id: "TT200-045",
          content: "Chưa có quy định bắt buộc về lưu trữ nhật ký Audit Log đối với các phần mềm kế toán tự xây dựng hoặc phần mềm độc lập."
        },
        new_document: {
          law_name: "TT99/2025",
          article: "Điều 5",
          chunk_id: "TT99-015",
          content: "Bắt buộc hệ thống ERP/kế toán phải tự động ghi nhận Audit Log mọi thao tác tạo lập, sửa đổi, hủy bỏ và bảo lưu bất biến tối thiểu 10 năm."
        }
      },
      impact_map: {
        process_affected: "Quy trình quản trị cơ sở dữ liệu kế toán & Sao lưu dữ liệu ERP định kỳ",
        departments: [
          "Phòng CNTT (IT)",
          "Phòng Kế toán"
        ],
        erp_fields: [
          "AuditLogId",
          "ActionType",
          "ChangedByUserId",
          "OldValue",
          "NewValue"
        ]
      },
      checklist_items: [
        {
          item_id: "CHK-CMP02-1",
          title: "Cấu hình chính sách WORM",
          description: "Kích hoạt chính sách WORM (Write Once, Read Many) cho database lưu trữ chứng từ.",
          required: true,
          collected: false
        }
      ]
    },
    {
      rule_id: "CMP-05",
      title: "Sử dụng chứng từ giấy in sẵn đóng dấu chữ ký khắc sẵn",
      subtitle: "Bãi bỏ quy định cũ, yêu cầu chuyển đổi số toàn diện các quy trình xuất phiếu.",
      risk_level: "Rủi ro trung bình",
      compliance_status: "Chưa rõ",
      search_metadata: {
        keywords: [
          "chữ ký khắc sẵn",
          "con dấu chữ ký",
          "bãi bỏ",
          "chứng từ in sẵn"
        ],
        intent_category: "Thẩm quyền & Chữ ký"
      },
      version_comparison: {
        is_modified: true,
        change_type: "REMOVED",
        old_document: {
          law_name: "TT200/2014",
          article: "Điều 118",
          chunk_id: "TT200-039",
          content: "Cho phép sử dụng biểu mẫu chứng từ in sẵn và đóng dấu chữ ký khắc sẵn trong một số trường hợp cụ thể."
        },
        new_document: {
          law_name: "TT99/2025",
          article: "Điều 4 Khoản 2",
          chunk_id: "TT99-013",
          content: "Bãi bỏ việc sử dụng con dấu chữ ký khắc sẵn trên mọi loại hình chứng từ kế toán."
        }
      },
      impact_map: {
        process_affected: "Quy trình xuất hóa đơn, phiếu thu, phiếu chi tại quầy",
        departments: [
          "Phòng Kế toán",
          "Phòng Hành chính"
        ],
        erp_fields: []
      },
      checklist_items: [
        {
          item_id: "CHK-CMP05-1",
          title: "Thu hồi con dấu chữ ký khắc",
          description: "Lập biên bản thu hồi và tiêu hủy toàn bộ con dấu chữ ký khắc sẵn đang lưu hành.",
          required: true,
          collected: false
        }
      ]
    }
  ]
};

export interface SampleLaw {
  id: string;
  title: string;
  number: string;
  category: string;
  description: string;
  suggestedQuestions: string[];
  content: string;
}

export const SAMPLE_LAWS: SampleLaw[] = [
  {
    id: 'tt99-2025',
    title: 'Thông tư 99/2025/TT-BTC',
    number: '99/2025/TT-BTC',
    category: 'Chế Độ Kế Toán & Chứng Từ Số',
    description: 'Quy định mới nhất về chứng từ điện tử, chuẩn chữ ký số xác thực thời gian thực, nhật ký kiểm toán hệ thống (Audit Log) bất biến 10 năm và bãi bỏ con dấu khắc sẵn.',
    suggestedQuestions: [
      'Quy định về chữ ký số và cấm chèn chữ ký scan vào chứng từ kế toán điện tử theo TT99/2025?',
      'Yêu cầu bắt buộc về nhật ký kiểm toán Audit Log lưu trữ 10 năm chống xóa sửa?',
      'Quy định bãi bỏ con dấu chữ ký khắc sẵn trên chứng từ kế toán?',
      'Trách nhiệm của người đại diện theo pháp luật và kế toán trưởng đối với việc ký số chứng từ?'
    ],
    content: `THÔNG TƯ SỐ 99/2025/TT-BTC CỦA BỘ TÀI CHÍNH
HƯỚNG DẪN CHẾ ĐỘ KẾ TOÁN DOANH NGHIỆP, QUẢN LÝ CHỨNG TỪ ĐIỆN TỬ VÀ BẢO ĐẢM TÍNH BẤT BIẾN DỮ LIỆU KẾ TOÁN

Chương I: QUY ĐỊNH CHUNG VỀ CHỨNG TỪ KẾ TOÁN ĐIỆN TỬ
Điều 1. Phạm vi điều chỉnh và đối tượng áp dụng
Thông tư này hướng dẫn về việc lập, tiếp nhận, xử lý, ký duyệt, lưu trữ và hủy chứng từ kế toán điện tử; tiêu chuẩn kỹ thuật đối với hệ thống phần mềm kế toán, ERP; quản lý nhật ký kiểm toán (Audit Log) trong doanh nghiệp thành lập và hoạt động theo pháp luật Việt Nam.

Điều 2. Nguyên tắc quản lý chứng từ điện tử
1. Chứng từ kế toán điện tử phải bảo đảm tính toàn vẹn, tính xác thực của thông tin từ thời điểm khởi tạo cho đến khi hết thời hạn lưu trữ theo quy định của Luật Kế toán.
2. Dữ liệu chứng từ điện tử phải sẵn sàng truy cập và sử dụng được dưới dạng có thể đọc, kiểm tra và trích xuất hợp pháp bất cứ thời điểm nào khi cơ quan có thẩm quyền yêu cầu.

Điều 4. Ký duyệt chứng từ kế toán điện tử và Chữ ký số
1. Bắt buộc ký số hoặc chữ ký điện tử hợp lệ với timestamp thời gian thực; nghiêm cấm chèn hình ảnh chữ ký scan vào chứng từ số. Chữ ký số phải được cấp bởi tổ chức cung cấp dịch vụ chứng thực chữ ký số hợp pháp.
2. Bãi bỏ việc sử dụng con dấu chữ ký khắc sẵn trên mọi loại hình chứng từ kế toán. Mọi nghiệp vụ kinh tế tài sinh phải được ký trực tiếp bởi người có thẩm quyền bằng chữ ký sống (đối với văn bản giấy) hoặc ký số định danh (đối với chứng từ điện tử).
3. Chứng từ điện tử có từ hai người ký trở lên phải ghi nhận đầy đủ chuỗi chứng thư số, dấu thời gian (timestamp) của từng lần ký theo đúng thứ tự phân quyền quy chế nội bộ doanh nghiệp.
4. Trường hợp ủy quyền ký số, văn bản ủy quyền phải được đăng ký trước trong hệ thống phân quyền của phần mềm kế toán và lưu trữ cùng hồ sơ quản lý chứng thư số.

Điều 5. Nhật ký kiểm toán hệ thống (Audit Log) bất biến
1. Bắt buộc hệ thống ERP/kế toán phải tự động ghi nhận Audit Log mọi thao tác tạo lập, sửa đổi, hủy bỏ và bảo lưu bất biến tối thiểu 10 năm.
2. Nhật ký kiểm toán phải lưu giữ tối thiểu các trường thông tin: Mã định danh bản ghi (AuditLogId), loại hành động (ActionType: CREATE, UPDATE, DELETE, VOID), định danh người dùng (ChangedByUserId), địa chỉ IP/thiết bị, thời gian chính xác, giá trị cũ trước khi thay đổi (OldValue) và giá trị mới (NewValue).
3. Doanh nghiệp phải áp dụng công nghệ lưu trữ bất biến (như kiến trúc WORM - Write Once, Read Many hoặc liên kết chuỗi mã hóa bảo mật) nhằm ngăn chặn tuyệt đối can thiệp trái phép, chỉnh sửa hồi tố từ phía quản trị viên hệ thống (DBA).

Điều 8. Quy định về phân quyền và an toàn bảo mật dữ liệu kế toán
1. Doanh nghiệp phải ban hành Quy chế an toàn thông tin nội bộ cho hệ thống phần mềm kế toán, xác định rõ trách nhiệm của Kế toán trưởng, Giám đốc IT và các nhân sự liên quan.
2. Phải thực hiện sao lưu định kỳ hàng ngày (daily backup) và lưu giữ ít nhất một bản sao lưu ngoại vi (offsite backup) độc lập.`
  },
  {
    id: 'tt200-2014',
    title: 'Thông tư 200/2014/TT-BTC',
    number: '200/2014/TT-BTC',
    category: 'Chế Độ Kế Toán Doanh Nghiệp',
    description: 'Quy định chế độ kế toán doanh nghiệp truyền thống áp dụng từ 2015, bao gồm quy chuẩn chứng từ giấy, chữ ký tay bút mực và các nguyên tắc lập sổ kế toán.',
    suggestedQuestions: [
      'Điều 118 Thông tư 200/2014 quy định thế nào về chữ ký trên chứng từ kế toán?',
      'Quy định về việc sử dụng con dấu chữ ký khắc sẵn trước đây ra sao?',
      'Điều 122 Thông tư 200/2014 quy định gì về phần mềm kế toán và lưu trữ?',
      'Trách nhiệm của người lập biểu và kế toán trưởng theo TT200/2014?'
    ],
    content: `THÔNG TƯ SỐ 200/2014/TT-BTC CỦA BỘ TÀI CHÍNH
HƯỚNG DẪN CHẾ ĐỘ KẾ TOÁN DOANH NGHIỆP

Chương III: CHỨNG TỪ KẾ TOÁN
Điều 118. Lập và ký chứng từ kế toán
1. Mọi nghiệp vụ kinh tế, tài chính phát sinh liên quan đến hoạt động của doanh nghiệp đều phải lập chứng từ kế toán. Chứng từ kế toán chỉ được lập một lần cho mỗi nghiệp vụ kinh tế, tài chính.
2. Chứng từ bằng giấy phải có đủ chữ ký bằng bút mực không phai của các bên liên quan theo từng chức danh quy định. Không được ký chứng từ kế toán bằng mực đỏ hoặc đóng dấu chữ ký khắc sẵn.
3. Cho phép sử dụng biểu mẫu chứng từ in sẵn và đóng dấu chữ ký khắc sẵn trong một số trường hợp cụ thể theo văn bản thỏa thuận riêng hoặc hướng dẫn chi tiết của Bộ Tài chính với từng ngành nghề.
4. Chữ ký trên chứng từ kế toán của một người phải thống nhất. Chữ ký trên chứng từ kế toán phải do người có thẩm quyền hoặc người được ủy quyền ký. Nghiêm cấm ký chứng từ kế toán khi chưa ghi đủ nội dung chứng từ thuộc trách nhiệm của người ký.

Điều 119. Trình tự luân chuyển và kiểm tra chứng từ kế toán
1. Tất cả các chứng từ kế toán do doanh nghiệp lập hoặc từ bên ngoài chuyển đến đều phải tập trung vào bộ phận kế toán doanh nghiệp. Bộ phận kế toán phải kiểm tra những chứng từ kế toán đó và chỉ sau khi kiểm tra xác minh là hợp pháp, hợp lệ thì mới dùng làm căn cứ ghi sổ kế toán.
2. Trình tự luân chuyển chứng từ kế toán bao gồm: lập, tiếp nhận, xử lý, kiểm tra, sử dụng để ghi sổ và lưu trữ, bảo quản.

Điều 122. Phần mềm kế toán và ứng dụng công nghệ thông tin
1. Doanh nghiệp được phép sử dụng phần mềm kế toán tự xây dựng hoặc phần mềm thương mại để thực hiện công tác kế toán.
2. Chưa có quy định bắt buộc về lưu trữ nhật ký Audit Log đối với các phần mềm kế toán tự xây dựng hoặc phần mềm độc lập, miễn là phần mềm bảo đảm tính chính xác của số liệu và kết xuất được sổ kế toán theo mẫu biểu quy định.
3. Doanh nghiệp tự chịu trách nhiệm về tính an toàn, bảo mật dữ liệu lưu trữ trên máy vi tính.`
  },
  {
    id: 'lkt-2015',
    title: 'Luật Kế toán số 88/2015/QH13',
    number: '88/2015/QH13',
    category: 'Luật Khung Kế Toán',
    description: 'Quy định về nội dung công tác kế toán, tổ chức bộ máy kế toán, người làm kế toán, hoạt động kinh doanh dịch vụ kế toán, chứng từ điện tử và xử lý vi phạm.',
    suggestedQuestions: [
      'Điều 18 Luật Kế toán 2015 quy định gì về chứng từ điện tử và giá trị pháp lý?',
      'Điều 19 quy định về chữ ký trên chứng từ kế toán như thế nào?',
      'Hành vi nào bị nghiêm cấm trong hoạt động kế toán?',
      'Thời hạn lưu trữ tài liệu kế toán theo Luật Kế toán là bao nhiêu năm?'
    ],
    content: `LUẬT KẾ TOÁN SỐ 88/2015/QH13
ĐƯỢC QUỐC HỘI NƯỚC CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM THÔNG QUA NGÀY 20 THÁNG 11 NĂM 2015

Chương I: NHỮNG QUY ĐỊNH CHUNG
Điều 13. Các hành vi bị nghiêm cấm
1. Giả mạo, khai man hoặc thỏa thuận, ép buộc người khác giả mạo, khai man, tẩy xóa tài liệu kế toán.
2. Cố ý, thỏa thuận hoặc ép buộc người khác cung cấp, xác nhận thông tin, số liệu kế toán sai sự thật.
3. Để ngoài sổ kế toán tài sản, nợ phải trả của đơn vị kế toán hoặc có liên quan đến đơn vị kế toán.
4. Hủy hoại hoặc cố ý làm hư hỏng tài liệu kế toán trước khi hết thời hạn lưu trữ quy định tại Điều 41 của Luật này.
5. Ban hành, công bố chuẩn mực kế toán, chế độ kế toán không đúng thẩm quyền.

Chương II: NỘI DUNG CÔNG TÁC KẾ TOÁN
Mục 1: CHỨNG TỪ KẾ TOÁN
Điều 17. Giá trị của chứng từ điện tử
1. Chứng từ điện tử được coi là chứng từ kế toán khi có các nội dung quy định tại Điều 16 của Luật này và được thể hiện dưới dạng dữ liệu điện tử, được mã hóa mà không bị thay đổi trong quá trình truyền qua mạng máy tính, mạng viễn thông hoặc trên vật mang tin.
2. Chứng từ điện tử phải bảo đảm tính bảo mật và bảo toàn dữ liệu, thông tin trong quá trình sử dụng và lưu trữ; phải được quản lý, kiểm tra chống các hình thức lợi dụng khai thác, xâm nhập, sao chép, đánh cắp hoặc sử dụng chứng từ điện tử không đúng quy định.
3. Chứng từ điện tử có giá trị như chứng từ kế toán bằng giấy.

Điều 18. Lập và lưu trữ chứng từ điện tử
1. Khi nghiệp vụ kinh tế, tài chính phát sinh bằng chứng từ điện tử thì phải lập chứng từ điện tử.
2. Chứng từ điện tử được in ra giấy và lưu trữ theo quy định về lưu trữ tài liệu kế toán. Trường hợp chứng từ điện tử được lưu trữ trên các phương tiện điện tử thì phải bảo đảm an toàn, bảo mật thông tin dữ liệu và phải bảo đảm tra cứu được trong thời hạn lưu trữ.

Điều 19. Ký chứng từ kế toán
1. Chứng từ kế toán phải có đủ chữ ký. Chữ ký trên chứng từ kế toán phải được ký bằng loại mực không phai. Không được ký chứng từ kế toán bằng mực đỏ hoặc đóng dấu chữ ký khắc sẵn. Chữ ký trên chứng từ kế toán của một người phải thống nhất. Chữ ký trên chứng từ điện tử có giá trị như chữ ký trên chứng từ bằng giấy.
2. Chữ ký trên chứng từ kế toán phải do người có thẩm quyền hoặc người được ủy quyền ký. Nghiêm cấm ký chứng từ kế toán khi chưa ghi đủ nội dung chứng từ thuộc trách nhiệm của người ký.

Điều 41. Bảo quản, lưu trữ tài liệu kế toán
1. Tài liệu kế toán phải được đơn vị kế toán bảo quản đầy đủ, an toàn trong quá trình sử dụng và lưu trữ.
2. Thời hạn lưu trữ tài liệu kế toán:
a) Tối thiểu 05 năm đối với tài liệu kế toán dùng cho quản lý, điều hành của đơn vị;
b) Tối thiểu 10 năm đối với chứng từ kế toán sử dụng trực tiếp để ghi sổ kế toán và lập báo cáo tài chính, các bảng kê, bảng tổng hợp chi tiết, các sổ kế toán chi tiết, các sổ kế toán tổng hợp, báo cáo tài chính tháng, quý, năm;
c) Lưu trữ vĩnh viễn đối với tài liệu kế toán có tính sử liệu, có ý nghĩa quan trọng về kinh tế, an ninh, quốc phòng.`
  },
  {
    id: 'vas-21',
    title: 'Chuẩn mực Kế toán VAS 21',
    number: 'VAS 21',
    category: 'Chuẩn Mực Báo Cáo Tài Chính',
    description: 'Chuẩn mực kế toán số 21 về Trình bày Báo cáo tài chính, yêu cầu trung thực, hợp lý, tuân thủ nguyên tắc hoạt động liên tục, cơ sở dồn tích và tính nhất quán.',
    suggestedQuestions: [
      'Nguyên tắc trình bày trung thực và hợp lý theo VAS 21 đòi hỏi những gì?',
      'Nguyên tắc cơ sở dồn tích trong lập báo cáo tài chính theo VAS 21?',
      'Quy định về tính trọng yếu và tập hợp số liệu trên BCTC?',
      'Trách nhiệm giải trình đối với các thay đổi chính sách kế toán?'
    ],
    content: `CHUẨN MỰC KẾ TOÁN VIỆT NAM SỐ 21 (VAS 21)
TRÌNH BÀY BÁO CÁO TÀI CHÍNH
(Ban hành và công bố theo Quyết định số 234/2003/QĐ-BTC ngày 30 tháng 12 năm 2003 của Bộ trưởng Bộ Tài chính)

QUY ĐỊNH CHUNG
01. Mục đích của chuẩn mực này là quy định các nguyên tắc và phương pháp lập và trình bày Báo cáo tài chính nhằm đảm bảo tính so sánh được giữa các kỳ kế toán của cùng một doanh nghiệp và giữa các doanh nghiệp với nhau.
02. Chuẩn mực này áp dụng cho việc lập và trình bày Báo cáo tài chính của doanh nghiệp, bao gồm:
- Bảng cân đối kế toán;
- Báo cáo kết quả hoạt động kinh doanh;
- Báo cáo lưu chuyển tiền tệ;
- Bản thuyết minh Báo cáo tài chính.

CÁC NGUYÊN TẮC TRÌNH BÀY BÁO CÁO TÀI CHÍNH
08. Trình bày trung thực và hợp lý:
Báo cáo tài chính phải trình bày một cách trung thực và hợp lý tình hình tài chính, kết quả kinh doanh và các luồng tiền của doanh nghiệp. Để đảm bảo trình bày trung thực và hợp lý, doanh nghiệp phải tuân thủ các Chuẩn mực kế toán Việt Nam và Chế độ kế toán hiện hành.

10. Hoạt động liên tục:
Báo cáo tài chính phải được lập trên cơ sở giả định là doanh nghiệp đang hoạt động liên tục và sẽ tiếp tục hoạt động kinh doanh bình thường trong tương lai gần, trừ khi doanh nghiệp có ý định giải thể hoặc buộc phải ngừng hoạt động.

13. Cơ sở dồn tích:
Doanh nghiệp phải lập báo cáo tài chính trên cơ sở dồn tích, ngoại trừ các thông tin liên quan đến các luồng tiền. Theo cơ sở dồn tích, các nghiệp vụ kinh tế, tài chính được ghi nhận vào thời điểm phát sinh, không căn cứ vào thời điểm thực tế thu hoặc thực tế chi tiền.

16. Nhất quán:
Cách trình bày và phân loại các khoản mục trong báo cáo tài chính phải nhất quán từ niên độ này sang niên độ khác, trừ khi có sự thay đổi lớn về bản chất hoạt động của doanh nghiệp hoặc có quy định sửa đổi chuẩn mực kế toán mới thay thế.`
  }
];

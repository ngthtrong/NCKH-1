# Hồ sơ nghiên cứu

Thư mục này là nguồn làm việc cho các đầu ra nghiên cứu của đề tài **Xây dựng ứng dụng quản lý công việc theo kiến trúc đa thuê bao**. Bản thuyết minh tại `resource/thuyetMinhSaasMultiTenancy.md` là nguồn phạm vi chính; `resource/plan.md` là kế hoạch thực thi. Nếu hai tài liệu khác nhau, thay đổi phải được ghi vào sổ quyết định trước khi cập nhật đặc tả.

## Bản đồ tài liệu

| Tài liệu | Mục đích | Trạng thái ban đầu |
| --- | --- | --- |
| [protocol.md](protocol.md) | Giao thức nghiên cứu, dữ liệu, đạo đức và quản lý thay đổi | Đã thiết lập; chờ nhóm khóa ngày tìm kiếm |
| [traceability-matrix.md](traceability-matrix.md) | Truy vết câu hỏi → phương pháp → bằng chứng → sản phẩm | Đã thiết lập; cập nhật suốt đề tài |
| [literature-review.md](literature-review.md) | Tổng quan có cấu trúc và khoảng trống nghiên cứu | Bản tổng hợp sơ bộ, không phải kết quả SLR cuối |
| [literature-search-log.md](literature-search-log.md) | Chuỗi tìm kiếm, nhật ký và quy trình sàng lọc | Đã ghi pilot; tìm kiếm toàn bộ CSDL chưa chạy |
| [source-register.md](source-register.md) | Nguồn đã xác minh, trạng thái và bằng chứng trích xuất | Bản đầu |
| [references.bib](references.bib) | BibTeX cho các nguồn đã xác minh | Bản đầu |
| [product-survey.md](product-survey.md) | Khảo sát MISA, Base, KiotViet, Jira, Salesforce | Hoàn thành khảo sát công khai ban đầu |
| [srs.md](srs.md) | Đặc tả yêu cầu phần mềm có mã định danh | Baseline v0.1 |
| [use-cases.md](use-cases.md) | Tác nhân, use case và luồng ngoại lệ | Baseline v0.1 |
| [permission-matrix.md](permission-matrix.md) | Quyền cấp hệ thống, tenant và dự án | Baseline v0.1 |
| [risk-register.md](risk-register.md) | Rủi ro nghiên cứu, kỹ thuật và vận hành | Đang mở |
| [decision-log.md](decision-log.md) | Chỉ mục quyết định và câu hỏi đang chờ bằng chứng | Đang mở |
| [adr-template.md](adr-template.md) | Mẫu ADR thống nhất | Sẵn dùng |
| [research-log.md](research-log.md) | Nhật ký hoạt động và thay đổi giao thức | Đang mở |
| [reporting-and-handoff.md](reporting-and-handoff.md) | Khung Giai đoạn F, kiểm soát tuyên bố và bàn giao | Sẵn dùng; chưa có kết quả thực nghiệm |

## Quy ước trạng thái bằng chứng

- `VERIFIED`: metadata hoặc nội dung đã đối chiếu với DOI/publisher/tài liệu chính thức.
- `CANDIDATE`: có liên quan nhưng chưa hoàn tất sàng lọc toàn văn hoặc đánh giá chất lượng.
- `UNVERIFIED`: không đủ metadata/nguồn để trích dẫn; không được dùng làm bằng chứng.
- `PENDING_DATA`: chỉ được điền sau khi đo, kiểm thử hoặc khảo sát thật.

Không biến một thiết kế dự kiến thành kết quả nghiên cứu. Các con số p95, throughput, SUS, số người tham gia và tỷ lệ lỗi chỉ được công bố khi có tệp dữ liệu thô và manifest tương ứng.


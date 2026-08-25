# Giao thức nghiên cứu

**Phiên bản:** 0.1  
**Ngày thiết lập:** 2026-08-25  
**Trạng thái:** đang thực hiện; chưa khóa tìm kiếm tài liệu và chưa thu dữ liệu người dùng

## 1. Mục tiêu và câu hỏi nghiên cứu

Mục tiêu là thiết kế, hiện thực và kiểm chứng một khung kiến trúc tham chiếu Bridge cho ứng dụng quản lý công việc Kanban trong môi trường đại học. Khung dùng chung danh tính, onboarding, mã nghiệp vụ và vận hành; dữ liệu nghiệp vụ được đặt ở Pool hoặc database Silo theo tenant.

- **RQ1:** Ứng dụng quản lý công việc trong môi trường đại học cần các yêu cầu nghiệp vụ và đa thuê bao nào?
- **RQ2:** Làm thế nào xây dựng khung Bridge kết hợp Pool và Silo nhưng vẫn dùng chung danh tính, cấp phát, mã nghiệp vụ và trải nghiệm vận hành?
- **RQ3:** Kiến trúc đáp ứng đến mức nào các yêu cầu về cô lập dữ liệu, phân quyền, cấp phát, hiệu năng, kiểm soát noisy neighbor và khả dụng?
- **RQ4:** Cơ chế và công nghệ nào phù hợp nhất để hiện thực kiến trúc trên một VPS tài nguyên giới hạn?

Phạm vi chi tiết được cố định trong SRS. Không nghiên cứu mobile, Kubernetes, autoscaling, full-stack silo, di chuyển tenant sau onboarding hoặc cộng tác thời gian thực.

## 2. Thiết kế nghiên cứu hỗn hợp

| Pha | Phương pháp | Đơn vị phân tích | Bằng chứng bắt buộc |
| --- | --- | --- | --- |
| Tổng quan | Systematic mapping có sàng lọc hai vòng | Công bố 2015–ngày khóa; nguồn nền tảng cũ hơn nếu cần | Search log, bản ghi khử trùng, lý do loại, extraction form |
| Khảo sát sản phẩm | Phân tích tài liệu chính thức | Tính năng/cơ chế được nhà cung cấp công bố | URL, ngày truy cập, đoạn bằng chứng; không suy đoán nội bộ |
| Lựa chọn kiến trúc | Spike so sánh có cùng workload | Ba cơ chế Pool; hai storage; hai payment provider | Mã spike, cấu hình, dữ liệu thô, bảng điểm, ADR |
| Kiểm chứng kỹ thuật | Kiểm thử tự động và thí nghiệm tải lặp | Tenant, request, job, lần chạy | Test report, k6 output, metric, manifest môi trường |
| Đánh giá người dùng | Bộ tác vụ chuẩn + SUS + câu hỏi mở | Người tham gia đã đồng thuận | Biểu mẫu đồng thuận, dữ liệu ẩn danh, codebook |

Giao thức systematic mapping tham chiếu hướng dẫn cập nhật của Petersen, Vakkalanka và Kuzniarz (2015), DOI `10.1016/j.infsof.2015.03.007`. PRISMA 2020 chỉ được dùng như checklist minh bạch báo cáo và sơ đồ luồng; đây không phải khẳng định rằng nghiên cứu là systematic review về can thiệp y khoa.

## 3. Tổng quan tài liệu

### 3.1 Nguồn và khoảng thời gian

Nguồn mục tiêu: ACM Digital Library, IEEE Xplore, SpringerLink, ScienceDirect và Google Scholar. Nguồn công nghiệp phải là tài liệu chính thức của nhà cung cấp hoặc dự án. Khoảng công bố chính từ 2015 đến ngày khóa tìm kiếm; tài liệu trước 2015 chỉ giữ để định nghĩa hoặc mô tả công trình nền tảng.

Ngày khóa tìm kiếm chưa được nhóm xác nhận. Khi khóa, ghi ngày, múi giờ, người chạy và chuỗi truy vấn chính xác trong `literature-search-log.md`; không sửa bản ghi cũ, chỉ thêm bản chạy mới.

### 3.2 Tiêu chí chọn

Một tài liệu học thuật được chọn khi đáp ứng tất cả điều kiện áp dụng:

1. Toàn văn tiếng Anh hoặc tiếng Việt có thể truy cập hợp pháp cho nhóm.
2. Tập trung vào ít nhất một chủ đề: kiến trúc SaaS đa thuê bao, cô lập tenant, phân vùng dữ liệu, SaaS identity/authorization, provisioning, noisy neighbor hoặc tenant-aware operations.
3. Có đóng góp dùng được cho RQ2–RQ4: mô hình, cơ chế, đánh đổi, phương pháp đánh giá hoặc kết quả thực nghiệm.
4. Là công bố peer-reviewed; whitepaper/tài liệu chính thức được giữ trong luồng bằng chứng công nghiệp riêng.
5. Metadata đủ để định danh duy nhất; DOI được xác minh khi nhà xuất bản cấp DOI.

### 3.3 Tiêu chí loại

- Chỉ nhắc “multi-tenant” nhưng không phân tích cơ chế hay đánh đổi.
- Chỉ nói về tenancy ở IaaS/container/Kubernetes mà không chuyển giao được sang phạm vi ứng dụng hoặc dữ liệu của đề tài.
- Trùng DOI/tiêu đề; giữ bản hoàn chỉnh và metadata đáng tin cậy nhất.
- Blog, nội dung SEO, tài liệu không xác định tác giả/nhà phát hành hoặc nguồn thứ cấp thay cho tài liệu gốc.
- Không truy cập được toàn văn sau khi ghi nhận nỗ lực tìm kiếm.
- Tuyên bố không thể kiểm chứng hoặc metadata mâu thuẫn chưa giải quyết.

### 3.4 Sàng lọc và chất lượng

1. Xuất metadata của từng CSDL; tạo `record_id` ổn định.
2. Khử trùng theo DOI chuẩn hóa, sau đó theo tiêu đề+năm.
3. Hai người sàng lọc độc lập tiêu đề/tóm tắt; bất đồng được thảo luận hoặc chuyển người thứ ba.
4. Hai người sàng lọc toàn văn và ghi đúng một mã loại: `E1_OUT_OF_SCOPE`, `E2_NOT_PEER_REVIEWED`, `E3_NO_FULL_TEXT`, `E4_DUPLICATE`, `E5_INSUFFICIENT_EVIDENCE`, `E6_LANGUAGE`.
5. Đánh giá chất lượng từ 0–2 cho: mục tiêu rõ, bối cảnh, mô tả phương pháp, bằng chứng/đánh giá, giới hạn, khả năng tái lập. Không dùng tổng điểm để “tạo” kết luận; điểm thấp làm giảm trọng số diễn giải.
6. Trích xuất bằng biểu mẫu thống nhất: mô hình tenancy, tầng cô lập, workload, stack, mối đe dọa, metric, kết quả, giới hạn và RQ liên quan.

## 4. Spike và thí nghiệm kỹ thuật

- So sánh trên cùng mã nghiệp vụ `Project CRUD`, seed, workload và cấu hình máy.
- Ba ứng viên Pool: tenant predicate tường minh; cơ chế tenant toàn cục Hibernate; PostgreSQL RLS kết hợp application guard.
- Mọi ứng viên chạy ở Pool và Silo, có native query, bulk update, background job, IDOR và test truy cập chéo.
- Điều kiện loại: bất kỳ đọc/ghi/xóa chéo tenant thành công hoặc thiếu đường kiểm thử khả thi.
- Đo warm-up tách khỏi lần chạy chính; số lần lặp được khóa sau pilot. Lưu median, p95, throughput, error rate, CPU, RAM và connection count; không chỉ lưu ảnh dashboard.
- Mỗi run có manifest: commit, image digest, Java/Node/PostgreSQL/k6 version, VPS CPU/RAM, seed, tenant count, VU, duration, placement và rate-limit policy.
- SLO chỉ được khóa sau pilot đúng cấu hình VPS; trước đó mọi threshold hiệu năng là `PENDING_DATA`.

## 5. Đánh giá người dùng và đạo đức

- Nhóm nghiên cứu trực tiếp xin phê duyệt cần thiết, tuyển 30–60 người thuộc 3–5 nhóm và lấy đồng thuận trước khi thu dữ liệu.
- Chỉ thu mã người tham gia ngẫu nhiên, nhóm vai trò, kết quả tác vụ, thời gian tác vụ, SUS và góp ý. Không thu mật khẩu, token, nội dung học tập thật hoặc định danh không cần thiết.
- Bảng ánh xạ định danh (nếu bắt buộc) lưu ngoài repo, mã hóa và giới hạn quyền; xóa theo chính sách được phê duyệt.
- Repo chỉ chứa dữ liệu đã ẩn danh hoặc tổng hợp. Trích dẫn góp ý phải được diễn giải hoặc xin phép rõ ràng.
- Người tham gia có thể dừng bất cứ lúc nào; dữ liệu của họ được loại theo quy trình đồng thuận.
- SUS được báo cáo mô tả; không dùng như điều kiện nghiệm thu kiến trúc và không tự đặt “điểm đạt” sau khi xem kết quả.

## 6. Quản trị dữ liệu, secrets và tái lập

| Loại | Nơi lưu trong repo | Quy tắc |
| --- | --- | --- |
| Protocol, SRS, ADR | `docs/` | Review như mã nguồn; liên kết issue/commit khi đổi |
| Dữ liệu tải thô đã phi nhạy cảm | `experiments/results/<run-id>/` | Bất biến; có checksum và manifest |
| Notebook/biểu đồ tái tạo | `experiments/analysis/` | Không sửa dữ liệu đầu vào; cố định seed |
| Dữ liệu người dùng ẩn danh | Vị trí do nhóm phê duyệt | Không commit nếu còn nguy cơ tái định danh |
| Secrets/credentials | Secret store hoặc `.env` không theo dõi | Không ghi log, screenshot, fixture hoặc tài liệu |

Tên run khuyến nghị: `YYYYMMDD-HHMMZ_<scenario>_<placement>_<git-short-sha>`. Mọi biểu đồ trong báo cáo phải ghi `run_id` hoặc đường dẫn dữ liệu nguồn.

## 7. Kiểm soát thay đổi và cổng nghiệm thu

- Thay đổi RQ, phạm vi, tiêu chí chọn/loại, metric chính hoặc cỡ mẫu phải ghi trước trong `research-log.md` với lý do và ảnh hưởng.
- Quyết định kiến trúc lâu dài dùng ADR; không sửa nội dung ADR đã Accepted, thay bằng ADR mới đánh dấu supersede.
- **Cổng A:** tất cả yêu cầu và tiêu chí đánh giá truy được về RQ hoặc nguồn khảo sát.
- **Cổng B:** mã spike, dữ liệu thô, bảng điểm và ADR có thể tái kiểm tra.
- **Cổng E:** không có truy cập chéo thành công; provisioning idempotent; môi trường và kết quả dựng lại được.
- **Cổng F:** mỗi kết luận phân loại là `MEASURED`, `INFERRED`, `LIMITATION` hoặc `PENDING_DATA` và liên kết bằng chứng.


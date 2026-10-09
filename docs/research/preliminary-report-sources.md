# Kiểm chứng nguồn dùng trong bản sơ bộ — 09/10/2026

Lượt này đối chiếu các nguồn dùng trong báo cáo, không thực hiện systematic search trên tất cả CSDL. Không sửa register/protocol hoặc nhật ký lịch sử. Ngày truy cập mới áp dụng cho BibTeX báo cáo, không thay ngày truy cập cũ của nhóm.

| Khóa | Nguồn gốc đối chiếu | Phạm vi đã kiểm tra | Giới hạn |
|---|---|---|---|
| olabanji2023multitenancy | [WSEAS](https://wseas.com/journals/articles.php?id=7661) | Title/author/DOI/vol.22, pp.25–43 và abstract 921→64 | Dữ liệu mapping của tác giả, không của nhóm; không đánh giá toàn bộ chất lượng corpus |
| narasayya2021cloud | [Publisher summary](https://www.nowpublishers.com/article/DownloadSummary/DBS-060) | Vol.10(1), pp.1–107, DOI 10.1561/1900000060 và abstract | Trang Details trả 403; dùng bản summary của publisher, không tuyên bố đọc toàn văn 107 trang |
| petersen2015mapping | [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0950584915000646) | Metadata/abstract của publisher qua kết quả tìm kiếm: vol.64, pp.1–18, DOI | Open trực tiếp trả 403; không trích chi tiết toàn văn chưa đọc |
| page2021prisma | [BMJ](https://www.bmj.com/content/372/bmj.n71.long) | Statement metadata và nội dung hướng dẫn hiển thị qua publisher index | PRISMA hỗ trợ minh bạch; không xác nhận systematic mapping của nhóm đã hoàn tất |
| pushpan2024multitenant | [Publisher](https://ijsrcseit.com/index.php/home/article/view/CSEIT241061151) | Metadata publisher index/PDF summary: pp.1117–1126, DOI đúng | Trang view có lượt 403; quality appraisal còn pending, không quyết định lựa chọn công nghệ |
| azureTenantMapping | [Microsoft](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/map-requests) | Domain/path/header/claim và tách mapping khỏi authorization | Hướng dẫn, không benchmark của nguyên mẫu |
| azureTenantIdentity | [Microsoft](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/identity) | Quyết định identity và IdP ở mức kiến trúc | Chưa tích hợp/kiểm chứng IdP mới |
| postgresql2026rls | [PostgreSQL 18](https://www.postgresql.org/docs/18/ddl-rowsecurity.html) | Owner, FORCE RLS, superuser/BYPASSRLS | Cần runtime role/policy thực tế; URL ghim phiên bản 18 |
| postgresqlSchemas | [PostgreSQL 18](https://www.postgresql.org/docs/18/ddl-schemas.html) | Namespace, search_path và schema privileges | search_path không thay hàng rào quyền |
| awsTransactionalOutbox | [AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) | Dual write, outbox và duplicate processing | Không exactly-once SMTP end-to-end |
| awsTargetedIsolation | [AWS](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/targeted-isolation.html) | Compute dùng chung/data isolation có mục tiêu | Không đồng nhất Silo database với full-stack silo |
| awsNoisyNeighbor | [AWS](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/noisy-neighbor.html) | Tải của một tenant ảnh hưởng tài nguyên chung | Efficacy limiter của hệ thống chưa có số đo |

Kumar thiếu nguồn gốc và hai tài liệu trong nước thiếu metadata chính thức không được đưa vào BibTeX/lập luận chính. Các citation hỗ trợ khái niệm/phương pháp; hành vi nguyên mẫu truy về E01–E17. Không có flow count hoặc claim tổng quan toàn diện được tạo trong lượt này.

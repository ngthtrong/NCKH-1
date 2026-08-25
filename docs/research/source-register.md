# Danh mục nguồn và trích xuất bằng chứng

**Ngày kiểm tra:** 2026-08-25. `VERIFIED` nghĩa là metadata/nội dung đã đối chiếu với DOI, nhà xuất bản hoặc trang chính thức; không đồng nghĩa nguồn có chất lượng học thuật như nhau.

## 1. Nguồn học thuật/phương pháp

| ID | Nguồn | Trạng thái | Bằng chứng dùng trong đề tài | RQ | Ghi chú chất lượng |
| --- | --- | --- | --- | --- | --- |
| A01 | D. Olabanji, T. Fitch, O. Matthew, “Multi-tenancy in Cloud-native Architecture: A Systematic Mapping Study,” 2023, DOI [`10.37394/23205.2023.22.4`](https://doi.org/10.37394/23205.2023.22.4) | VERIFIED | Từ 921 bản ghi ban đầu, tác giả chọn 64 công bố về cloud-native/multi-tenancy giai đoạn 2015–2022; taxonomy tập trung nhiều vào container/IaaS | RQ2, RQ4 | Hữu ích để lập bản đồ, nhưng phạm vi cloud-native rộng hơn ứng dụng SaaS dữ liệu của đề tài |
| A02 | V. R. Narasayya, S. Chaudhuri, “Multi-Tenant Cloud Data Services: State-of-the-Art, Challenges and Opportunities,” SIGMOD 2022, pp. 2465–2473, DOI [`10.1145/3514221.3522566`](https://doi.org/10.1145/3514221.3522566) | VERIFIED | Tổng quan kiến trúc dịch vụ dữ liệu, elasticity, SLA, performance isolation, chi phí và serverless database | RQ3, RQ4 | Tutorial/survey ngắn; dùng làm nền dữ liệu, không thay bằng chứng spike cục bộ |
| A03 | V. R. Narasayya, S. Chaudhuri, “Cloud Data Services: Workloads, Architectures and Multi-Tenancy,” 2021, DOI [`10.1561/1900000060`](https://doi.org/10.1561/1900000060) | VERIFIED | Bản survey dài về workload, kiến trúc và multi-tenancy của cloud data services | RQ3, RQ4 | Phạm vi database service, không đặc tả nghiệp vụ Kanban |
| A04 | K. Petersen, S. Vakkalanka, L. Kuzniarz, “Guidelines for conducting systematic mapping studies in software engineering: An update,” 2015, DOI [`10.1016/j.infsof.2015.03.007`](https://doi.org/10.1016/j.infsof.2015.03.007) | VERIFIED | Quy trình lập kế hoạch, tìm kiếm, chọn, đánh giá chất lượng, trích xuất và báo cáo systematic map | Tất cả | Nguồn phương pháp chính |
| A05 | M. J. Page et al., “The PRISMA 2020 statement,” BMJ, 2021, DOI [`10.1136/bmj.n71`](https://doi.org/10.1136/bmj.n71) | VERIFIED | Checklist minh bạch báo cáo và flow diagram | Tất cả | PRISMA vốn thiết kế chủ yếu cho review can thiệp sức khỏe; chỉ dùng để tăng minh bạch báo cáo |
| A06 | S. Pushpan, “Multi-Tenant Architecture: A Comprehensive Framework for Building Scalable SaaS Applications,” vol. 10, no. 6, pp. 1117–1126, 2024, DOI [`10.32628/CSEIT241061151`](https://doi.org/10.32628/CSEIT241061151) | VERIFIED metadata / CANDIDATE evidence | Tổng hợp các chủ đề partitioning, isolation, authentication/authorization và resource allocation | RQ2, RQ4 | Trang đúng theo bản publisher là 1117–1126; cần đánh giá chất lượng trước khi dùng cho kết luận chính |

## 2. Nguồn kiến trúc/kỹ thuật chính thức

| ID | Nguồn | Trạng thái | Bằng chứng dùng được | RQ |
| --- | --- | --- | --- | --- |
| I01 | [AWS Well-Architected SaaS Lens](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html) | VERIFIED official | Định nghĩa Pool/Silo/Bridge, SaaS identity, tenant isolation, onboarding, noisy neighbor và tenant-aware operations | RQ2–RQ4 |
| I02 | [AWS SaaS Lens — General design principles](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/general-design-principles.html) | VERIFIED official | Cô lập mọi tài nguyên tenant; tenant context là cấu trúc hạng nhất; hạn chế logic tenancy rải rác trong mã | RQ2, RQ3 |
| I03 | [AWS SaaS Lens — Targeted isolation](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/targeted-isolation.html) | VERIFIED official | Có thể dùng compute chung nhưng database riêng cho một số tenant; isolation không phải quyết định tất-cả-hoặc-không | RQ2 |
| I04 | [PostgreSQL 18 — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | VERIFIED official | Superuser/`BYPASSRLS` luôn bypass; owner thường bypass trừ `FORCE ROW LEVEL SECURITY` | RQ3, RQ4 |
| I05 | [Salesforce Platform Multitenant Architecture](https://architect.salesforce.com/docs/architect/fundamentals/guide/platform-multitenant-architecture.html) | VERIFIED official | Shared database/schema gắn `OrgID` vào bản ghi và kernel dùng định danh này để giữ riêng hoạt động tenant | RQ1, RQ2 |
| I06 | [Hibernate ORM User Guide — multitenancy](https://docs.hibernate.org/orm/current/userguide/html_single/#multitenacy) | VERIFIED official | API/khái niệm multitenancy của ORM là ứng viên spike | RQ4 |
| I07 | [VNPay Sandbox PAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html) | VERIFIED official | Return URL và IPN là luồng khác nhau; `vnp_HashSecret`/checksum kiểm tra toàn vẹn; transaction ref phải duy nhất | RQ2, RQ3, RQ4 |
| I08 | [Stripe Webhooks](https://docs.stripe.com/webhooks) | VERIFIED official | Endpoint webhook cần xác minh chữ ký và chịu được delivery lặp/không đồng bộ theo hướng dẫn provider | RQ4 |

## 3. Nguồn khảo sát sản phẩm chính thức

| ID | Nguồn | Trạng thái | Bằng chứng giới hạn |
| --- | --- | --- | --- |
| P01 | [MISA AMIS — Theo dõi công việc dạng Bảng (Kanban)](https://helpamis.misa.vn/amis-cong-viec/kb/quan-ly-cong-viec-dang-bang/) | VERIFIED official | Cột, thẻ, kéo thả, hạn, tiến độ, người thực hiện; không suy ra kiến trúc tenancy |
| P02 | [Base Wework — Phân quyền thao tác](https://help.base.vn/support/solutions/articles/63000273353-base-wework-ph%C3%A2n-quy%E1%BB%81n-thao-t%C3%A1c-trong-wework) | VERIFIED official | Vai trò project manager/member/follower/guest và quyền theo dự án; không suy ra cơ chế DB |
| P03 | [KiotViet — Quản lý người dùng](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-thiet-lap/quan-ly-nguoi-dung/) | VERIFIED official | Người dùng có thể có quyền ở nhiều chi nhánh; một role mỗi chi nhánh; role tùy chỉnh; vô hiệu hóa tài khoản |
| P04 | [Atlassian — Configure a Jira space/project](https://support.atlassian.com/jira-cloud-administration/docs/configure-a-project/) | VERIFIED official | Project/space roles, permission scheme, work-item security và notification scheme |
| P05 | [Salesforce Platform Multitenant Architecture](https://architect.salesforce.com/docs/architect/fundamentals/guide/platform-multitenant-architecture.html) | VERIFIED official | Đối chứng public về shared schema + tenant identifier; không sao chép mô hình metadata phức tạp vào v1 |

## 4. Nguồn chưa đủ điều kiện trích dẫn

| ID | Mô tả | Trạng thái | Hành động |
| --- | --- | --- | --- |
| U01 | R. Kumar, “Multi-Tenant SaaS Architectures: Design Principles and Security Considerations,” được thuyết minh ghi là overview paper, 2025 | UNVERIFIED | Thiếu venue, URL và DOI; không dùng cho kết luận hoặc BibTeX cho tới khi tìm được bản gốc |
| U02 | `related/Nov-2020_Multi-TenantSaaSArchitectures.pdf` | UNVERIFIED | Filename và PDF metadata không đủ nhất quán để gắn chắc với U01; chỉ sàng lọc sau khi xác minh title/author/venue |
| U03 | Hai báo cáo/khóa luận trong nước [1], [2] của thuyết minh | UNVERIFIED | Cần URL thư viện/repository, tác giả đầy đủ và metadata chính thức trước khi trích dẫn |

## 5. Sửa metadata cần đưa qua change control

- Nguồn Pushpan trong thuyết minh đang ghi trang `860–867`; bản PDF của nhà xuất bản ghi `1117–1126`.
- Nguồn Kumar chưa đủ metadata; không nên ghi như nguồn đã xác minh.
- Ngày “Accessed Dec. 16, 2025” trong thuyết minh cần đối chiếu lịch sử thực tế của nhóm; register này chỉ xác nhận lượt truy cập 2026-08-25.

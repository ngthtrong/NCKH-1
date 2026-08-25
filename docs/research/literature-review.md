# Tổng quan tài liệu có cấu trúc — bản sơ bộ

## 1. Trạng thái và giới hạn

Đây là bản tổng hợp nền tảng từ các nguồn đã xác minh trong `source-register.md`, không phải kết quả cuối của systematic mapping. Chưa chạy toàn bộ truy vấn trên năm cơ sở dữ liệu, chưa sàng lọc hai người và chưa có flow count; vì vậy các phát biểu về “toàn bộ lĩnh vực” được tránh.

## 2. Khung khái niệm

AWS SaaS Lens phân biệt ba mô hình. **Pool** dùng tài nguyên chung nhưng vẫn phải bảo vệ tuyệt đối biên tenant. **Silo** cấp tài nguyên riêng cho tenant nhưng vẫn có onboarding, danh tính, triển khai và vận hành thống nhất. **Bridge** phối hợp Pool và Silo ở những phần khác nhau của hệ thống. Tài liệu targeted isolation của AWS còn mô tả trường hợp compute chung nhưng database riêng, khớp với nhánh Silo database-only của đề tài [I01–I03].

Điểm quan trọng là tenancy không chỉ là cách đặt bảng. SaaS identity kết hợp user identity và tenant identity; tenant context phải đi xuyên authorization, data access, storage, background work, logging và metrics. Vì vậy một câu truy vấn có `tenant_id` chưa đủ để chứng minh isolation nếu URL tệp, cache key, job nền hoặc host routing vẫn có thể vượt biên [I02].

## 3. Bằng chứng nghiên cứu đã xác minh

Olabanji, Fitch và Matthew thực hiện systematic mapping về multi-tenancy trong cloud-native architecture. Bài báo báo cáo 921 bản ghi ban đầu và 64 công bố được chọn trong giai đoạn 2015–2022. Taxonomy của họ bao phủ nhiều chủ đề container, scheduling, resource management và isolation. Nguồn này xác nhận multi-tenancy là vấn đề liên tầng, đồng thời cho thấy tập bằng chứng cloud-native không đồng nhất với bài toán SaaS nghiệp vụ chạy trên một VPS [A01].

Narasayya và Chaudhuri khảo sát cloud data services từ góc workload, architecture và multi-tenancy. Các chủ đề trọng tâm gồm elasticity, SLA, performance isolation, cost và serverless database. Nguồn này là nền tảng cho việc đo connection, latency, throughput và noisy-neighbor; tuy nhiên nó không quyết định thay cơ chế tenant nào sẽ hiệu quả trong Spring/PostgreSQL với workload Kanban cụ thể [A02–A03].

Pushpan tổng hợp các chủ đề partitioning, tenant isolation, authentication/authorization và resource allocation. Do chất lượng và mức độ bằng chứng của nguồn này chưa được chấm theo protocol, tài liệu hiện chỉ dùng như nguồn định hướng từ khóa, không làm bằng chứng quyết định [A06].

## 4. Đánh đổi dữ liệu và cơ chế cô lập

Ba topology dữ liệu liên quan trực tiếp:

| Topology | Điểm mạnh dự kiến | Rủi ro/cost cần đo | Vai trò trong đề tài |
| --- | --- | --- | --- |
| Shared DB/shared schema | Mật độ tài nguyên và migration tập trung | Sai filter có thể lộ dữ liệu; noisy neighbor; index phải chứa tenant | Pool |
| Shared DB/separate schema | Biên namespace rõ hơn | Nhiều schema/migration; vẫn chung connection/resource | Chỉ là nguồn so sánh, không nằm trong baseline triển khai |
| Database per tenant | Biên dữ liệu mạnh, backup/restore theo tenant | Connection/migration/provisioning tăng theo tenant | Silo database-only |

Salesforce công khai một ví dụ shared schema: bản ghi theo tổ chức có `OrgID` và platform kernel thực thi phạm vi tổ chức [I05]. Đây là đối chứng cho việc tenant identifier xuất hiện ở mọi bản ghi Pool và enforcement được tập trung, không phải bằng chứng rằng đề tài có thể sao chép cơ chế nội bộ của Salesforce.

PostgreSQL Row-Level Security là ứng viên defense-in-depth, không phải đáp án mặc định. Tài liệu PostgreSQL ghi rõ superuser và role có `BYPASSRLS` luôn vượt RLS; owner bảng thường cũng vượt, trừ khi bật `FORCE ROW LEVEL SECURITY` [I04]. Do đó spike phải dùng app role không phải owner, test owner/superuser/native query/bulk job riêng và kết hợp application guard. Một test pass khi chạy bằng cấu hình “an toàn sẵn” không chứng minh cấu hình production không thể bypass.

## 5. Identity, authorization và vòng đời tenant

Khảo sát sản phẩm cho thấy quyền có nhiều phạm vi. Base Wework và Jira có vai trò/quyền theo dự án; KiotViet công khai việc một user có thể nằm ở nhiều chi nhánh nhưng role được gán theo từng chi nhánh [P02–P04]. Từ đó, mô hình của đề tài tách `TenantMembership` khỏi `ProjectMembership`. Quyền tenant không tự động đồng nghĩa quyền thao tác mọi project; ngược lại project role không cấp quyền billing/provisioning.

Luồng đăng nhập cần ràng buộc host và token vì subdomain là một input do client kiểm soát. Membership hiện tại và trạng thái tenant phải được kiểm tra ở mỗi request nhạy cảm để thu hồi quyền có hiệu lực dù access token chưa hết hạn. `tenant_id` trong payload nghiệp vụ không bao giờ là nguồn authorization.

Provisioning là workflow nhiều bước có lỗi từng phần. VNPay công khai Return URL cho trải nghiệm trình duyệt và IPN để merchant cập nhật kết quả, kèm secret/checksum kiểm tra toàn vẹn [I07]. Điều này dẫn tới yêu cầu xác minh server-side, deduplicate callback và chỉ queue provisioning sau trạng thái thanh toán hợp lệ; Return URL không phải nguồn chân lý.

## 6. Noisy neighbor và tenant-aware operations

Chia sẻ compute/database tạo khả năng tenant tải cao làm giảm chất lượng tenant khác. Chỉ đo tổng CPU hoặc độ trễ toàn hệ thống sẽ che khuất tác động. Thí nghiệm phải quan sát đồng thời aggressor và victim, cùng workload trước/sau rate limit, đồng thời ghi placement, tier, connection pool và background jobs. Metric cần gắn tenant nhưng không được làm lộ nội dung nhạy cảm.

Database-per-tenant không loại bỏ mọi noisy neighbor vì API process, CPU, object storage và network vẫn dùng chung. Vì vậy so sánh Pool/Silo được mô tả là đặc tính của khung Bridge, không phải phép chứng minh Silo luôn tốt hơn.

## 7. Khoảng trống mà đề tài sẽ kiểm chứng

Từ các nguồn hiện đã xác minh, có thể xác định một **khoảng trống thực hành của đề tài**: chưa có bằng chứng ngay trong bối cảnh repo này cho thấy cùng một modular monolith Kanban, cùng API và mã nghiệp vụ có thể chạy trên shared-schema Pool lẫn database-per-tenant Silo, với provisioning idempotent, host–token binding, kiểm thử chống truy cập chéo và đo noisy-neighbor trên một VPS giới hạn.

Đây chưa phải tuyên bố rằng không tồn tại công trình tương tự trên toàn bộ học thuật. Tuyên bố khoảng trống rộng hơn chỉ được phép sau MAIN-ACM/IEEE/SPRINGER/SD/GS, snowballing và sàng lọc hoàn tất.

## 8. Hệ quả thiết kế có truy vết

1. Tenant context là hợp đồng hạng nhất, không truyền tùy ý từ controller xuống repository.
2. Tất cả bảng application plane có `tenant_id`, kể cả database Silo, để giữ contract/test/audit giống nhau.
3. Pool mechanism được chọn qua spike có điều kiện loại zero-cross-tenant; RLS chỉ là ứng viên.
4. Control plane và application plane không dùng distributed transaction; payment/provisioning dùng state machine và idempotency.
5. Mọi kết luận hiệu năng phải truy tới raw run; SLO khóa sau pilot.
6. Báo cáo cuối tách rõ `MEASURED`, `INFERRED`, `LIMITATION` và `PENDING_DATA`.

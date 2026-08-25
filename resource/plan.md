# Kế hoạch chi tiết thực hiện đề tài ứng dụng quản lý công việc đa thuê bao

## 1. Mục tiêu và định hướng đã thống nhất

### Mục tiêu nghiên cứu

Thiết kế, hiện thực và kiểm chứng một **khung kiến trúc tham chiếu đa thuê bao theo mô hình Bridge** cho ứng dụng quản lý công việc Kanban trong môi trường đại học.

Khung kiến trúc phải thống nhất được:

- Quản lý danh tính và ngữ cảnh thuê bao.
- Cô lập dữ liệu và phân quyền xuyên suốt các tầng.
- Nhánh **Pool** dùng chung CSDL và nhánh **Silo** dùng CSDL riêng cho từng thuê bao.
- Quy trình đăng ký, thanh toán thử nghiệm và cấp phát tự động.
- Vận hành, ghi log, thu thập chỉ số và giới hạn tải theo thuê bao.
- Cùng một nghiệp vụ ứng dụng hoạt động nhất quán trên cả Pool và Silo.

### Câu hỏi nghiên cứu

1. Ứng dụng quản lý công việc trong môi trường đại học cần những yêu cầu nghiệp vụ và yêu cầu đa thuê bao nào?
2. Làm thế nào xây dựng một khung kiến trúc Bridge kết hợp Pool và Silo nhưng vẫn dùng chung danh tính, quy trình cấp phát, mã nghiệp vụ và trải nghiệm vận hành?
3. Kiến trúc đề xuất đáp ứng đến mức nào các yêu cầu về cô lập dữ liệu, phân quyền, cấp phát, hiệu năng, kiểm soát noisy neighbor và khả dụng?
4. Những cơ chế và công nghệ nào phù hợp nhất để hiện thực kiến trúc trên một VPS có tài nguyên giới hạn?

### Phạm vi đã khóa

- Ứng dụng web; không xây ứng dụng di động.
- Một tài khoản có thể tham gia nhiều tenant/workspace.
- Mọi tài khoản được tạo tenant; người tạo trở thành Owner.
- Tenant chọn Pool hoặc Silo khi đăng ký; không hiện thực chuyển đổi gói sau khi đã có dữ liệu.
- Silo chỉ tách CSDL; ứng dụng, compute, định danh, giám sát và kho tệp vẫn dùng chung.
- Tenant được nhận diện bằng subdomain và token chứa `tenant_id`; hai giá trị bắt buộc khớp.
- Thanh toán dùng sandbox, nhà cung cấp được chọn sau khảo sát kỹ thuật.
- Thông báo gồm trong ứng dụng, email và Web Push.
- Có giới hạn request và logging/metrics theo tenant.
- Đánh giá với 3–5 nhóm, tổng cộng 30–60 người, chủ yếu là sinh viên; tải đồng thời được bổ sung bằng người dùng ảo.
- Không phân chia đầu việc theo thành viên hoặc thời gian; thứ tự dưới đây biểu thị quan hệ phụ thuộc.

## 2. Các nhóm đầu việc và nội dung nghiên cứu

### 2.1. Chuẩn hóa đề cương và giao thức nghiên cứu

- Đối chiếu mục tiêu, phạm vi, phương pháp và sản phẩm tại [thuyet_minh_SaaS.md](/home/ngthtrong/NCKH-1/resource/thuyet_minh_SaaS.md:176).
- Lập bảng ánh xạ: câu hỏi nghiên cứu → phương pháp → dữ liệu cần thu → tiêu chí đánh giá → đầu ra.
- Thiết lập nhật ký nghiên cứu, sổ quyết định kiến trúc (ADR), danh mục rủi ro và quy tắc quản lý phiên bản tài liệu.
- Áp dụng thống nhất thuật ngữ theo [chuan_hoa_thuat_ngu.md](/home/ngthtrong/NCKH-1/resource/chuan_hoa_thuat_ngu.md:1).
- Xây dựng quy trình lưu dữ liệu thực nghiệm, ẩn danh người tham gia và loại bỏ secrets khỏi mã nguồn.

**Đầu ra:** giao thức nghiên cứu, bảng truy vết và danh sách chỉnh sửa thuyết minh.

### 2.2. Tổng quan tài liệu có cấu trúc

- Xây dựng chuỗi tìm kiếm tiếng Anh và tiếng Việt xoay quanh multi-tenancy, tenant isolation, data partitioning, SaaS identity, provisioning, Bridge/Pool/Silo, noisy neighbor và tenant-aware operations.
- Tìm kiếm trong ACM Digital Library, IEEE Xplore, SpringerLink, ScienceDirect, Google Scholar và các tài liệu kiến trúc chính thức.
- Dùng khoảng công bố từ năm 2015 đến thời điểm khóa tìm kiếm; tài liệu nền tảng cũ hơn vẫn được giữ nếu có giá trị định nghĩa.
- Quy định tiêu chí chọn, loại, loại tài liệu trùng lặp và biểu mẫu trích xuất bằng chứng.
- Phân loại bằng chứng theo:
  - Mô hình Pool, Silo và Bridge.
  - Cô lập tại ứng dụng, CSDL, lưu trữ và hạ tầng.
  - Định danh, xác thực và phân quyền.
  - Cấp phát và vòng đời tenant.
  - Hiệu năng, noisy neighbor và quan sát hệ thống.
  - Phương pháp kiểm chứng rò rỉ dữ liệu.
- Xác minh DOI, tác giả, năm công bố và nơi xuất bản; hiệu chỉnh hoặc thay thế nguồn yếu, đặc biệt tài liệu Ritesh Kumar đang có thông tin năm chưa nhất quán.
- Dùng [AWS SaaS Lens](/home/ngthtrong/NCKH-1/related/SaaSAWS.md:118) làm nguồn công nghiệp chính về Pool/Silo/Bridge, SaaS identity, onboarding và tenant-aware operations.
- Xem PostgreSQL RLS là **ứng viên cần đánh giá**, không mặc định là giải pháp thắng. Tài liệu PostgreSQL xác nhận RLS có thể kiểm soát các hàng được đọc và sửa, nhưng cũng có trường hợp owner hoặc role đặc quyền bypass chính sách nên phải kiểm thử riêng. [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

**Đầu ra:** danh mục tài liệu đã xác minh, bảng trích xuất bằng chứng, báo cáo tổng quan và phát biểu khoảng trống nghiên cứu.

### 2.3. Khảo sát các hệ thống SaaS thực tế

Lập ma trận khảo sát theo cùng một bộ tiêu chí, chỉ ghi nhận chức năng hoặc kiến trúc được nguồn chính thức công bố; không suy đoán bí mật triển khai.

- **MISA AMIS Công Việc:** Kanban, giao việc, hạn việc, vai trò, thông báo và lịch sử hoạt động. [Tài liệu Kanban của MISA](https://helpamis.misa.vn/amis-cong-viec/kb/quan-ly-cong-viec-dang-bang/)
- **Base Wework:** vai trò quản lý dự án, thành viên, người theo dõi, khách và phân quyền theo dự án. [Tài liệu phân quyền Base Wework](https://help.base.vn/support/solutions/articles/63000273353-base-wework-ph%C3%A2n-quy%E1%BB%81n-thao-t%C3%A1c-trong-wework)
- **KiotViet:** mô hình tài khoản, vai trò và quyền theo chi nhánh; dùng để tham khảo cách một SaaS Việt Nam tổ chức phạm vi dữ liệu nghiệp vụ. [Tài liệu quản lý người dùng KiotViet](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-thiet-lap/quan-ly-nguoi-dung/)
- **Jira:** project/space, bảng Kanban, vai trò, permission scheme và notification scheme. [Tài liệu cấu hình project Jira](https://support.atlassian.com/jira-cloud-administration/docs/configure-a-project/)
- **Salesforce:** đối chứng công nghiệp cho mô hình dữ liệu dùng chung có tenant ID và cơ chế tự động giới hạn truy vấn. [Salesforce Platform Fundamentals](https://help.salesforce.com/s/articleView?id=000392678&language=en_US&type=1)

Các chiều so sánh:

- Tenant/workspace và vòng đời tenant.
- Quan hệ tài khoản–tenant.
- Cấu trúc dự án, bảng, cột và công việc.
- Vai trò ở cấp tổ chức và dự án.
- Onboarding, gói dịch vụ và thanh toán.
- Thông báo, nhật ký và quan sát hoạt động.
- Cách giải quyết cô lập hoặc mở rộng nếu có tài liệu công khai.
- Tính năng phù hợp để học hỏi và tính năng phải loại khỏi phạm vi.

**Đầu ra:** ma trận đối sánh sản phẩm, danh sách bài học thiết kế và danh sách yêu cầu ứng dụng được truy nguồn.

### 2.4. Phân tích yêu cầu và mô hình nghiệp vụ

#### Tác nhân

- Quản trị hệ thống.
- Owner và Admin của tenant.
- Member của tenant.
- Manager, Member và Viewer của dự án.
- Hệ thống thanh toán sandbox.
- Dịch vụ email, Web Push và bộ xử lý công việc nền.

#### Chức năng ứng dụng

- Đăng ký, đăng nhập, tạo tenant và chọn gói Pool hoặc Silo.
- Thanh toán thử nghiệm và theo dõi trạng thái cấp phát.
- Chuyển đổi ngữ cảnh giữa các tenant mà tài khoản đang tham gia.
- Mời, chấp nhận lời mời, thu hồi thành viên và gán vai trò.
- Tạo dự án, quản lý thành viên và vai trò cấp dự án.
- Tạo bảng Kanban, cột trạng thái, sắp xếp và kéo thả công việc.
- Công việc gồm tiêu đề, mô tả, người thực hiện, hạn hoàn thành, trạng thái và phiên bản dữ liệu.
- Hỗ trợ một cấp công việc con và bình luận cơ bản.
- Kho tài nguyên tenant gồm tệp và liên kết; một tài nguyên có thể gắn với nhiều công việc.
- Thông báo khi được mời, giao việc, bình luận, thay đổi trạng thái, sắp đến hạn hoặc quá hạn.
- Tùy chọn nhận thông báo qua ứng dụng, email và Web Push.
- Nhật ký các hành động quản trị, phân quyền và thay đổi nghiệp vụ quan trọng.
- Màn hình quản trị theo dõi tenant, loại placement, thanh toán, cấp phát và lỗi vận hành.

#### Luồng cần đặc tả

1. Đăng ký → tạo yêu cầu tenant → chọn tier → thanh toán sandbox → xác minh callback/webhook → cấp phát → kích hoạt subdomain.
2. Đăng nhập trung tâm → chọn tenant → phát hành token theo tenant → chuyển đến subdomain → kiểm tra host–token.
3. Mời thành viên → chấp nhận → tạo membership → gán vai trò.
4. Tạo dự án → bảng → cột → công việc → giao việc → cập nhật trạng thái.
5. Tải tài nguyên → gắn với công việc → cấp URL tải có kiểm soát.
6. Phát sinh sự kiện → ghi outbox → gửi ba kênh thông báo → lưu kết quả gửi.
7. Thanh toán hoặc cấp phát thất bại → retry có kiểm soát → rollback tài nguyên dở dang → ghi audit.

#### Yêu cầu phi chức năng

- Không cho phép đọc, ghi, xóa, tải tệp hoặc nhận thông báo chéo tenant.
- Cùng một API nghiệp vụ hoạt động trên cả Pool và Silo.
- Cấp phát có tính idempotent và có thể thử lại.
- Giới hạn tải theo tenant/tier.
- Mọi request và background job đều truy vết được theo tenant.
- Không ghi token, mật khẩu, khóa thanh toán hoặc nội dung nhạy cảm vào log.
- Hỗ trợ đồng thời 3–5 tenant và 10–20 tài khoản hoạt động trên mỗi tenant trong thí nghiệm.
- Xử lý nhất quán cơ bản bằng transaction và optimistic locking; không làm đồng bộ thời gian thực hoặc giải quyết xung đột nâng cao.

**Đầu ra:** SRS, use case, quy tắc nghiệp vụ, sơ đồ luồng và ma trận quyền.

### 2.5. Xây dựng tiêu chí và lựa chọn giải pháp kiến trúc

- Chuyển yêu cầu phi chức năng thành các kịch bản thuộc tính chất lượng: bảo mật, hiệu năng, khả năng sửa đổi, triển khai, quan sát và phục hồi.
- So sánh ba cách cô lập dữ liệu Pool:
  - Điều kiện `tenant_id` tại repository/service.
  - Bộ lọc truy vấn toàn cục của framework/ORM.
  - PostgreSQL RLS kết hợp ngữ cảnh tenant.
- So sánh dựa trên khả năng chống bỏ sót điều kiện tenant, kiểm thử, hiệu năng, độ phức tạp migration, nguy cơ bypass và mức phụ thuộc công nghệ.
- Thiết kế nhánh Silo theo database-per-tenant, không triển khai full-stack-per-tenant.
- Xác định thành phần dùng chung và thành phần tách riêng bằng sơ đồ control plane/application plane.
- Ghi mọi lựa chọn quan trọng bằng ADR và liên kết về bằng chứng nghiên cứu.

**Đầu ra:** ma trận đánh đổi, tập ADR và kiến trúc cơ sở được duyệt.

### 2.6. Lựa chọn tech stack bằng spike kỹ thuật

Không chọn framework theo cảm tính. Thực hiện như sau:

- Kiểm kê năng lực công nghệ hiện có của nhóm.
- Lập tối đa ba stack ứng viên.
- Chấm điểm theo trọng số:
  - Cô lập tenant và quản lý nhiều CSDL: 25%.
  - Khả năng kiểm thử bảo mật: 20%.
  - Migration và cấp phát tự động: 15%.
  - Kinh nghiệm của nhóm: 15%.
  - Mức tiêu thụ VPS: 10%.
  - Email, Web Push, background jobs và object storage: 10%.
  - Tài liệu và khả năng bảo trì: 5%.
- Với mỗi ứng viên, làm cùng một spike: nhận diện tenant, CRUD một bảng Pool, kết nối một database Silo, chạy migration và một kiểm thử truy cập chéo.
- Đánh giá riêng giải pháp lưu trữ tệp dùng chung: filesystem có kiểm soát hoặc object storage tương thích S3.
- So sánh VNPay Sandbox và Stripe Test Mode về khả năng cấp credentials, xác minh chữ ký, callback/webhook, tài liệu, hỗ trợ stack và khả năng mô phỏng tier. VNPay cung cấp Return URL, IPN và secret kiểm tra toàn vẹn nên phải kiểm thử callback phía máy chủ, không chỉ dựa vào trang trả về. [Tài liệu VNPay Sandbox](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html)
- Chọn stack và cổng thanh toán có điểm cao nhất trong số ứng viên không vi phạm điều kiện bắt buộc; ghi ADR trước khi phát triển chính.

**Đầu ra:** mã spike, bảng điểm, biên bản chọn stack, cổng thanh toán và giải pháp lưu trữ.

### 2.7. Thiết kế chi tiết kiến trúc

- Vẽ C4 Context, Container và Component.
- Tách:
  - **Control plane:** người dùng, tenant, membership, tier, thanh toán, placement, tuyến subdomain và trạng thái cấp phát.
  - **Application plane:** dự án, Kanban, công việc, bình luận, tài nguyên và thông báo.
- Thiết kế ERD riêng cho control database, pooled database và silo database.
- Thiết kế sequence diagram cho đăng nhập, đổi tenant, payment callback, provisioning, truy vấn Pool/Silo, tải tệp và gửi thông báo.
- Thiết kế pool kết nối CSDL có giới hạn để số tenant Silo không làm cạn kết nối trên VPS.
- Thiết kế migration chung và cách theo dõi phiên bản schema của từng database Silo.
- Thiết kế backup, restore, health check và xử lý tenant provisioning thất bại.
- Thiết kế reverse proxy, wildcard DNS, TLS và ánh xạ subdomain mà không phải tạo thủ công từng DNS record.
- Thiết kế kho tệp dùng chung với namespace/prefix tenant, quota và URL tải có thời hạn.
- Thực hiện threat modeling cho giả mạo token, IDOR, sửa subdomain, webhook giả, URL tệp bị đoán, lạm quyền và background job sai tenant.

**Đầu ra:** tài liệu đặc tả kiến trúc hoàn chỉnh và mô hình đe dọa.

### 2.8. Phát triển nền tảng đa thuê bao

- Xây dựng xác thực và phát hành token theo tenant đang chọn.
- Middleware xác minh token, subdomain, trạng thái tenant và membership.
- Tenant context trở thành dữ liệu bắt buộc xuyên suốt request, log, metric và job nền.
- Xây dựng abstraction chọn nguồn dữ liệu Pool hoặc Silo.
- Không nhận `tenant_id` trong payload nghiệp vụ làm nguồn phân quyền.
- Xây control plane và các trạng thái tenant, thanh toán, provisioning.
- Xây quy trình tạo database, tài khoản CSDL, quyền tối thiểu và migration cho tenant Silo.
- Xây cơ chế tạo tenant logic cho Pool.
- Xây retry, idempotency, timeout và rollback cho provisioning.
- Xây rate limiting theo tenant/tier và chính sách phản hồi khi vượt giới hạn.

**Đầu ra:** nền tảng đa thuê bao và bộ kiểm thử tích hợp nền tảng.

### 2.9. Phát triển nghiệp vụ ứng dụng

Phát triển theo lát cắt dọc; mỗi chức năng phải chạy và được kiểm thử ngay trên cả Pool lẫn Silo:

1. Tài khoản, tenant và membership.
2. Dự án và phân quyền cấp dự án.
3. Bảng, cột và thẻ Kanban.
4. Công việc con và bình luận.
5. Kho tài nguyên, upload/download và liên kết lại nhiều công việc.
6. Thông báo trong ứng dụng.
7. Email và Web Push.
8. Nhật ký hoạt động.
9. Quản trị tenant, thanh toán và provisioning.

**Đầu ra:** ứng dụng web hoàn chỉnh theo phạm vi đã khóa.

### 2.10. Quan sát, triển khai và khả năng tái lập

- Chuẩn bị VPS Linux, domain, wildcard DNS và TLS.
- Đóng gói các thành phần bằng container; cấu hình tách secrets khỏi mã nguồn.
- Thiết lập kiểm tra chất lượng, test và build tự động.
- Log có `tenant_id`, tier, placement, request ID và correlation ID nhưng không chứa dữ liệu nhạy cảm.
- Thu thập độ trễ, tỷ lệ lỗi, số request, số job và sử dụng tài nguyên theo tenant/tier.
- Chuẩn bị dashboard hoặc truy vấn tổng hợp để so sánh tải giữa các tenant.
- Viết script khởi tạo môi trường, migration, seed dữ liệu, tạo tenant thử nghiệm và chạy thí nghiệm.
- Viết hướng dẫn backup/restore và quy trình xử lý database Silo lỗi.

**Đầu ra:** bản triển khai HTTPS, cấu hình mẫu và bộ tái lập không chứa bí mật.

### 2.11. Thực nghiệm kỹ thuật

- Chạy pilot trên đúng cấu hình VPS.
- Từ pilot, khóa SLO về p95, tỷ lệ lỗi, throughput, thời gian cấp phát Pool/Silo và giới hạn tài nguyên trước thí nghiệm chính.
- Giữ điều kiện tải, bộ dữ liệu và kịch bản giống nhau giữa các lần đo.
- Lặp mỗi kịch bản đủ số lần, ghi median/p95 và độ biến thiên.
- So sánh Pool và Silo để mô tả đặc tính của khung Bridge; không biến so sánh này thành câu hỏi nghiên cứu trung tâm.
- Thử nghiệm noisy neighbor bằng cách tạo tải lớn từ một tenant và quan sát ảnh hưởng đến tenant khác trước/sau rate limiting.
- Công bố cấu hình VPS, phiên bản phần mềm, dữ liệu seed và tham số tải để kết quả có thể tái lập.

**Đầu ra:** bộ dữ liệu thực nghiệm, biểu đồ, bảng kết quả và báo cáo phân tích.

### 2.12. Đánh giá với người dùng

- Tuyển 30–60 người thuộc 3–5 nhóm, chủ yếu sinh viên; giảng viên hoặc người phụ trách hỗ trợ xác nhận nghiệp vụ.
- Có thông tin đồng thuận tham gia và không thu dữ liệu cá nhân không cần thiết.
- Tổ chức bộ tác vụ chuẩn:
  - Tạo hoặc tham gia tenant.
  - Tạo dự án và phân quyền.
  - Tạo bảng/công việc, giao việc và đổi trạng thái.
  - Tạo công việc con và bình luận.
  - Tải tài nguyên và gắn vào nhiều công việc.
  - Cấu hình và nhận thông báo.
- Thu tỷ lệ hoàn thành, thời gian, lỗi, điểm SUS và góp ý mở.
- SUS và các số liệu khả dụng chỉ dùng để mô tả, không phải điều kiện đạt/không đạt.
- Phân tích theo vai trò nếu số mẫu cho phép; không suy rộng vượt quá cỡ mẫu và phương pháp chọn mẫu.

**Đầu ra:** bộ dữ liệu ẩn danh, kết quả SUS, thống kê tác vụ và tổng hợp góp ý.

### 2.13. Tổng hợp và bàn giao

- Trả lời từng câu hỏi nghiên cứu bằng bằng chứng tương ứng.
- Phân biệt rõ kết quả đo được, suy luận và giới hạn nghiên cứu.
- Hoàn thiện báo cáo tổng quan, tài liệu giải pháp, đặc tả kiến trúc, báo cáo kiểm thử và báo cáo khoa học.
- Chuẩn bị bản tin, báo cáo tóm tắt và video tối đa hai phút.
- Bàn giao mã nguồn, migration, cấu hình mẫu, script triển khai, test, script thí nghiệm và hướng dẫn tái lập; loại bỏ toàn bộ secrets.
- Chuẩn bị demo bao gồm một tenant Pool, một tenant Silo, tấn công chéo bị từ chối, provisioning tự động và quan sát theo tenant.

## 3. Giao diện và mô hình dữ liệu kiến trúc bắt buộc

### Các hợp đồng lõi

- `TenantContext`: `user_id`, `tenant_id`, `tier`, `placement`, vai trò, subdomain, request/correlation ID.
- `TenantPlacement`: tối thiểu `POOL` và `SILO_DATABASE`.
- `TenantDataSourceResolver`: nhận tenant context và trả đúng kết nối; mã nghiệp vụ không tự chọn connection.
- `PaymentProvider`: tạo phiên thanh toán, xác minh callback/webhook và truy vấn trạng thái.
- `ProvisioningService`: nhận yêu cầu idempotent, cấp phát, migration, rollback và trả trạng thái.
- `ResourceStorage`: lưu, tải, xóa và tạo URL có thời hạn trong namespace tenant.
- `NotificationDispatcher`: phát cùng một sự kiện qua in-app, email và Web Push.
- `TenantEvent`: chứa tenant, actor, loại sự kiện, phiên bản và correlation ID.

### Thực thể chính

- `User`, `Tenant`, `TenantMembership`.
- `SubscriptionTier`, `PaymentTransaction`, `TenantPlacement`, `ProvisioningJob`, `TenantRoute`.
- `Project`, `ProjectMembership`, `Board`, `Column`, `Task`, `Comment`.
- `Resource`, `TaskResource`.
- `Notification`, `NotificationPreference`, `PushSubscription`.
- `AuditEvent`, `OutboxEvent`.

### Quy tắc giao diện

- API nghiệp vụ lấy tenant từ context đã xác thực; không tin `tenant_id` do client gửi.
- Token tenant A dùng trên subdomain tenant B phải bị từ chối trước khi vào service nghiệp vụ.
- Background job và notification phải mang tenant context rõ ràng.
- Cùng endpoint, DTO và quy tắc nghiệp vụ được dùng cho Pool và Silo.
- Callback thanh toán chỉ kích hoạt provisioning sau khi được xác minh phía máy chủ và xử lý idempotent.

## 4. Kế hoạch kiểm thử và tiêu chí hoàn tất

### Kiểm thử chức năng

- Toàn bộ luồng tài khoản, tenant, dự án, Kanban, công việc con, bình luận, tài nguyên và thông báo.
- Ma trận quyền tenant và quyền dự án.
- Các chức năng chạy tương đương trên Pool và Silo.
- Kiểm thử optimistic locking khi hai người cùng cập nhật công việc.

### Kiểm thử cô lập và bảo mật

- Sửa subdomain nhưng giữ token cũ.
- Sửa hoặc giả mạo `tenant_id` trong token/header/payload.
- Dùng ID biết trước để đọc, sửa hoặc xóa đối tượng tenant khác.
- Liệt kê hoặc tìm kiếm nhằm làm lộ dữ liệu tenant khác.
- Tải tệp bằng URL hoặc object key của tenant khác.
- Mạo danh callback thanh toán hoặc gửi callback trùng.
- Background job và thông báo gửi sai tenant/người nhận.
- User bị thu hồi membership nhưng còn token cũ.
- Kiểm tra role đặc quyền, owner CSDL hoặc cấu hình sai có bypass RLS nếu RLS được chọn.

**Tiêu chí bắt buộc:** không có trường hợp đọc, ghi, xóa, tải tệp hoặc gửi thông báo chéo tenant thành công.

### Kiểm thử provisioning

- Trùng slug/subdomain.
- Thanh toán thất bại, hủy hoặc hết hạn.
- Callback đến nhiều lần hoặc sai thứ tự.
- Tạo database thành công nhưng migration thất bại.
- Mất kết nối trong quá trình cấp phát.
- Retry không tạo tài nguyên trùng.
- Tenant chỉ chuyển sang `ACTIVE` khi toàn bộ bước bắt buộc hoàn tất.

### Kiểm thử tải và noisy neighbor

- 3–5 tenant, mỗi tenant 10–20 tài khoản hoạt động đồng thời.
- Tải đọc bảng, tạo/cập nhật công việc, tải tài nguyên và gửi thông báo.
- So sánh p50/p95, throughput, tỷ lệ lỗi và tài nguyên Pool/Silo.
- Một tenant tạo tải vượt mức; tenant khác vẫn được phục vụ theo SLO đã khóa sau pilot.
- Rate limiter phân biệt đúng tenant và tier.

### Điều kiện hoàn tất toàn đề tài

- Các câu hỏi nghiên cứu đều có phương pháp và bằng chứng trả lời.
- Chức năng cốt lõi hoạt động trên cả Pool và Silo.
- Không phát hiện truy cập chéo trong ma trận kiểm thử tự động.
- Provisioning có thể retry, rollback và audit.
- Bản triển khai đáp ứng SLO được khóa sau pilot.
- Thực nghiệm và khảo sát có dữ liệu ẩn danh, phương pháp và giới hạn rõ ràng.
- Một người khác có thể dựng lại môi trường từ bộ mã nguồn và hướng dẫn bàn giao.

## 5. Chỉnh sửa thuyết minh, sản phẩm và giả định

### Chỉnh sửa đề xuất cho thuyết minh

- **Mục 12:** bổ sung mục tiêu xây dựng và kiểm chứng khung kiến trúc Bridge.
- **Mục 13:** thay câu “cô lập trên cùng một CSDL” bằng mô tả Pool dùng chung CSDL và Silo dùng CSDL riêng; nêu rõ Silo không tách toàn bộ stack.
- **Mục 13:** bổ sung sandbox payment, kho tài nguyên, ba kênh thông báo, rate limiting và tenant-aware observability.
- **Mục 13:** phân biệt 30–60 người dùng thật với 10–20 tài khoản đồng thời mỗi tenant do công cụ tải tạo ra.
- **Mục 14:** bổ sung tổng quan có cấu trúc, threat modeling, kiểm thử tự động chống truy cập chéo, pilot khóa SLO và đánh giá SUS.
- **Mục 15:** mở rộng sáu đầu việc hiện tại thành các nhóm nghiên cứu–phân tích–thiết kế–spike–phát triển–thực nghiệm nêu trong kế hoạch.
- **Mục 16:** giữ các sản phẩm nghiệm thu chính, nhưng mô tả bộ mã nguồn, đặc tả kiến trúc và bằng chứng kiểm thử là thành phần bàn giao kèm ứng dụng.
- Rà soát lại năm, DOI và độ tin cậy của tài liệu tham khảo; không thay đổi tên hoặc bản chất đề tài.

### Sản phẩm nghiên cứu và minh chứng

- Báo cáo tổng quan có cấu trúc.
- Ma trận khảo sát sản phẩm SaaS.
- SRS, use case, luồng nghiệp vụ và ma trận quyền.
- Ma trận đánh đổi và tập ADR.
- Đặc tả kiến trúc Bridge, ERD và threat model.
- Ứng dụng web và bản triển khai trên VPS.
- Bộ kiểm thử cô lập, phân quyền, provisioning, tải và noisy neighbor.
- Dữ liệu, script và báo cáo thực nghiệm.
- Dữ liệu khảo sát ẩn danh và kết quả SUS.
- Mã nguồn và bộ tái lập không chứa secrets.
- Báo cáo khoa học, báo cáo tóm tắt, bản tin và video.

### Giả định và giới hạn

- Nhóm sẽ chuẩn bị VPS, domain, wildcard DNS và chứng chỉ TLS.
- Pool dùng shared database/shared schema; cơ chế cô lập cụ thể được chọn qua spike.
- Silo dùng database-per-tenant nhưng chia sẻ application stack và object storage.
- Kho tệp dùng namespace tenant và kiểm tra quyền trước khi cấp URL tải.
- Không chuyển tenant giữa Pool và Silo sau onboarding.
- Không giao dịch tiền thật.
- Không triển khai mobile, autoscaling, Kubernetes, full-stack silo, báo cáo nâng cao hoặc đồng bộ thời gian thực phức tạp.
- Điểm SUS chỉ được báo cáo mô tả; không dùng làm điều kiện nghiệm thu.

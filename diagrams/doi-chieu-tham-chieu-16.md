# Đối chiếu theo bản tham chiếu 16 sơ đồ Mermaid

Chuẩn áp dụng: **“BẢN LƯU TRỮ: CHƯƠNG 2 KÈM HƯỚNG DẪN VẼ VÀ MÃ NGUỒN SƠ ĐỒ CHI TIẾT”** người dùng gửi bổ sung. [Xem ảnh hiện tại](xem-tat-ca.html) · [Danh mục và nguồn](danh-muc-hinh.md) · [Bản tham chiếu nguyên văn](tham-chieu-16-hinh/ban-tham-chieu-goc.txt).

**Kết luận:** bộ gốc 16 hình bám sát bản tham chiếu này. Lần sửa thành 14 hình chính + 4 hình phụ đã áp dụng một dàn ý khác, làm thay đổi số/chủ đề và làm mất nhiều quan hệ kiến trúc khi chuyển thành bảng tầng. Bản đó đã được thay thế; không dùng những kết luận “thiếu Compute-Isolated/Shared-Data”, “thiếu Tiered Hybrid + Cells” hay “cây quyết định phải có nhánh chạy plugin” để đánh giá bản tham chiếu mới.

## Danh mục đúng và kết quả xử lý

| Hình | Nội dung theo bản mới | Bản hiện tại |
|---|---|---|
| 2.1 | Master Blueprint 9 tầng | Khôi phục các khối và đường nối; dùng tên chức năng chung, phân biệt tầng với chuỗi request. |
| 2.2 | Silo | Client → Gateway → đúng App Instance; App → Middleware / Database riêng. |
| 2.3 | Pool | Client → Gateway → App Pool → Middleware / Database dùng chung. |
| 2.4 | Bridge | Gateway → App chung → schema riêng; sửa search_path thành phạm vi transaction. |
| 2.5 | Hybrid | Router → Standard App / Enterprise Instance → Database tương ứng; sửa quy ước khung. |
| 2.6 | Trọng tâm cô lập dữ liệu | Giữ App chung → DBMS riêng → volume riêng; bỏ port/path/tên sản phẩm không cần thiết. |
| 2.7 | TCO và RLS Engine | Giữ query/context → RLS → bảng → kết quả; sửa điểm thực thi và chú thích fail-closed. |
| 2.8 | Tùy biến cấu trúc/schema | Giữ Worker → chọn schema → bảng beta; hai schema riêng cùng kiểu khung. |
| 2.9 | Phân khúc khách hàng | Request → Gateway → xác thực/registry → Shared/Dedicated Instances. |
| 2.10 | SMB / Startup Profile | Khôi phục luồng context → flags → nghiệp vụ → Cache/Database; thay tên sản phẩm bằng vai trò. |
| 2.11 | Enterprise / Regulated Profile | Gateway nối trực tiếp Instance; Instance → sandbox, Cache và Database; bố trí lại để đường nối rõ. |
| 2.12 | Global Hyper-Scale Cell-Based Profile | Router → App Cluster từng cell → DB Cluster; định tuyến phù hợp dải tenant ghi trên hình. |
| 2.13 | Context và cờ tính năng | Giữ luồng client, gateway, đánh giá flag, truy vấn DB; thêm Backend để làm rõ nơi giữ context và cleanup. |
| 2.14 | SET LOCAL | Transaction có UUID hợp lệ, COMMIT/ROLLBACK và trả connection trong finally; sửa chú thích reset. |
| 2.15 | Two-Tier Caching W-TinyLFU | Bổ sung đủ L1/L2 Hit/Miss, đọc DB, trả kết quả và cập nhật cache; không bỏ request vì cache admission. |
| 2.16 | Cây quyết định | Giữ nhánh tùy biến bảng → Schema-per-Tenant / Bridge; không thay bằng Compute-Isolated. |

## Phân biệt góp ý biên tập và lỗi kỹ thuật trong mã mẫu

**Theo góp ý của người dùng:** các hình mô hình tổng quát dùng `Cache`, `Message Queue`, `Object Storage`, `Database`, `App Instance`, `API Gateway`. Không gắn các khối này với Redis, MinIO, Kubernetes, RDS, OpenFeature hoặc tên nhà cung cấp. Hình giải thích cơ chế cụ thể mới giữ thuật ngữ cần thiết như SQL, RLS, SET LOCAL, W-TinyLFU.

**Middleware không đồng nghĩa Cache/Message Queue.** Theo phạm vi minh họa của bản nguồn, Middleware gồm API Gateway ở cửa vào và các dịch vụ trung gian ứng dụng sử dụng như Cache, Message Queue, Object Storage. Một hình zoom-in/profile có thể chỉ chọn vài vai trò phù hợp với luồng đang giải thích; điều đó không phải định nghĩa đầy đủ của Middleware. Gateway ngoài khung tenant ở Silo là thành phần định tuyến chung, còn dịch vụ hỗ trợ bên trong là tài nguyên dành riêng.

**Các lỗi có thật trong chính bản nguồn đã hiệu chỉnh:**

1. Hybrid: mã gốc vẽ Pool nét đứt, Silo nét liền, trái quy ước shared/dedicated đang dùng.
2. Cell: dải 1–1.000 / 1.001–2.000 / 2.001–3.000 không tương đương phép modulo 3. Hình mới dùng ánh xạ phù hợp dải, nối tới App Cluster.
3. Cache: nhánh cold data kết thúc ở “bỏ qua”, thiếu truy vấn/trả dữ liệu; L2 thiếu Hit. W-TinyLFU của L1 không tự động kiểm soát các lần ghi L2.
4. SET LOCAL: kết thúc transaction khôi phục giá trị session trước đó; không bảo đảm mọi trạng thái connection sạch hoặc current_setting luôn NULL. Thiếu/rỗng context phải được policy xử lý rõ.
5. Context: ThreadLocal không tự truyền qua HTTP hoặc sang luồng khác. Hình hiện tại làm rõ Backend giữ context, cleanup trong finally; local evaluation không phải bảo đảm độ trễ <1ms.
6. RLS/Isolation: RLS là cơ chế trong DBMS, không phải OS kernel; policy gắn bảng không đồng nghĩa engine thực thi ở schema. Process/port/volume riêng không tự chứng minh cô lập vật lý.
7. Cây quyết định: giữ ý nghĩa các nhánh, nhưng không coi tên tiêu chuẩn tuân thủ/BYOK hoặc ngưỡng tải 70% là điều kiện phổ quát tự quyết định kiến trúc. Cell-Based cần yêu cầu quy mô/vùng/phạm vi sự cố cụ thể.

Nguồn kỹ thuật đã đối chiếu trong phiên làm việc: [PostgreSQL SET](https://www.postgresql.org/docs/current/sql-set.html), [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [Caffeine Design](https://github.com/ben-manes/caffeine/wiki/Design), [OpenFeature Providers](https://openfeature.dev/specification/sections/providers/).

## File bàn giao và kiểm tra

Thư mục chính chứa đúng 16 nguồn `.drawio`, 16 `.drawio.png` và 16 `.svg` theo số/chủ đề của bản mới. Các đoạn Mermaid nguyên bản được lưu riêng, không sửa âm thầm. Bản 14+4 được giữ trong `_archive/2026-11-06-ban-14-cong-4/`; bộ gốc nằm trong `_archive/2026-11-06-ban-cu/`.

Đã kiểm tra cấu trúc XML, các đầu nối, ảnh PNG/SVG và trình xem ảnh. Đây là kiểm tra sơ đồ và diễn giải, không phải kiểm thử hệ thống thực thi hoặc đo hiệu năng.

# Danh mục 16 hình — đối chiếu bản tham chiếu mới

[Mở bộ xem ảnh](xem-tat-ca.html). PNG 2.400 px; SVG và nguồn Draw.io có thể chỉnh sửa.

File được phân loại trong `png/`, `svg/` và `drawio/`; PNG xem nhanh cũng nằm trong `png/`.

Chuẩn áp dụng: bản lưu trữ gồm 16 sơ đồ Mermaid người dùng gửi. Bản 14 hình chính + 4 hình phụ trước đó dùng một dàn ý khác và đã được thay thế. Các file nguồn Mermaid nguyên bản nằm tại `tham-chieu-16-hinh/`.

Đã khôi phục đúng số/chủ đề 2.1–2.16 và các quan hệ Client → Gateway → App Instance, App → Middleware / Database. Các hình mô hình dùng tên chức năng chung. Middleware không đồng nghĩa Cache/Message Queue: API Gateway ở cửa vào cũng thuộc nhóm Middleware; khối hỗ trợ ứng dụng liệt kê Cache, Message Queue, Object Storage. Các profile chỉ vẽ thành phần có luồng sử dụng tương ứng.

Các hiệu chỉnh có chủ đích so với mã mẫu:

- Hybrid: Pool khung liền, Silo khung đứt; hai schema riêng cùng dùng nét đứt.
- Cell: dùng bảng ánh xạ/dải tenant như nhãn; mũi tên Router nối trực tiếp App Cluster. Bỏ modulo không khớp dải.
- Cache: đủ Hit/Miss ở L1/L2, đọc DB, trả dữ liệu và cập nhật cache. Từ chối admission không làm mất request; W-TinyLFU không tự điều khiển L2.
- SET LOCAL: UUID hợp lệ, COMMIT/ROLLBACK, finally trả connection; không khẳng định session luôn reset thành NULL.
- Context/flags: thêm Backend để xác định nơi giữ context và truy cập DB; cleanup trong finally. Không khẳng định độ trễ <1ms nếu chưa đo.
- Decision tree: giữ nhánh tùy biến cấu trúc bảng → Schema-per-Tenant / Bridge theo đúng bản mới; không thay bằng Compute-Isolated. Giảm các khẳng định tuyệt đối và ngưỡng tải không có căn cứ.
- DBMS/RLS: phân biệt điểm thực thi engine với bảng/schema; tách process/volume không tự chứng minh tách phần cứng.

Tên công nghệ chỉ giữ ở hình giải thích cơ chế cần thiết (ví dụ SQL, RLS, SET LOCAL); không gắn tên sản phẩm cụ thể lên các khối Cache/Message Queue trong mô hình tổng quát.

## Ảnh và nguồn

### Hình 2.1 · Sơ đồ gốc 9 tầng ngăn xếp hệ thống

[PNG](png/hinh_2_1_master_blueprint.drawio.png) · [SVG](svg/hinh_2_1_master_blueprint.svg) · [Draw.io](drawio/hinh_2_1_master_blueprint.drawio)

![Hình 2.1 · Sơ đồ gốc 9 tầng ngăn xếp hệ thống](png/hinh_2_1_master_blueprint.drawio.png)

### Hình 2.2 · Mô hình Silo

[PNG](png/hinh_2_2_silo_model.drawio.png) · [SVG](svg/hinh_2_2_silo_model.svg) · [Draw.io](drawio/hinh_2_2_silo_model.drawio)

![Hình 2.2 · Mô hình Silo](png/hinh_2_2_silo_model.drawio.png)

### Hình 2.3 · Mô hình Pool

[PNG](png/hinh_2_3_pool_model.drawio.png) · [SVG](svg/hinh_2_3_pool_model.svg) · [Draw.io](drawio/hinh_2_3_pool_model.drawio)

![Hình 2.3 · Mô hình Pool](png/hinh_2_3_pool_model.drawio.png)

### Hình 2.4 · Mô hình Bridge

[PNG](png/hinh_2_4_bridge_model.drawio.png) · [SVG](svg/hinh_2_4_bridge_model.svg) · [Draw.io](drawio/hinh_2_4_bridge_model.drawio)

![Hình 2.4 · Mô hình Bridge](png/hinh_2_4_bridge_model.drawio.png)

### Hình 2.5 · Mô hình Hybrid

[PNG](png/hinh_2_5_hybrid_model.drawio.png) · [SVG](svg/hinh_2_5_hybrid_model.svg) · [Draw.io](drawio/hinh_2_5_hybrid_model.drawio)

![Hình 2.5 · Mô hình Hybrid](png/hinh_2_5_hybrid_model.drawio.png)

### Hình 2.6 · Trọng tâm cô lập dữ liệu

[PNG](png/hinh_2_6_data_isolation.drawio.png) · [SVG](svg/hinh_2_6_data_isolation.svg) · [Draw.io](drawio/hinh_2_6_data_isolation.drawio)

![Hình 2.6 · Trọng tâm cô lập dữ liệu](png/hinh_2_6_data_isolation.drawio.png)

### Hình 2.7 · Trọng tâm TCO và RLS Engine

[PNG](png/hinh_2_7_tco_rls_engine.drawio.png) · [SVG](svg/hinh_2_7_tco_rls_engine.svg) · [Draw.io](drawio/hinh_2_7_tco_rls_engine.drawio)

![Hình 2.7 · Trọng tâm TCO và RLS Engine](png/hinh_2_7_tco_rls_engine.drawio.png)

### Hình 2.8 · Trọng tâm tùy biến cấu trúc

[PNG](png/hinh_2_8_schema_namespace.drawio.png) · [SVG](svg/hinh_2_8_schema_namespace.svg) · [Draw.io](drawio/hinh_2_8_schema_namespace.drawio)

![Hình 2.8 · Trọng tâm tùy biến cấu trúc](png/hinh_2_8_schema_namespace.drawio.png)

### Hình 2.9 · Trọng tâm phân khúc khách hàng

[PNG](png/hinh_2_9_customer_segmentation.drawio.png) · [SVG](svg/hinh_2_9_customer_segmentation.svg) · [Draw.io](drawio/hinh_2_9_customer_segmentation.drawio)

![Hình 2.9 · Trọng tâm phân khúc khách hàng](png/hinh_2_9_customer_segmentation.drawio.png)

### Hình 2.10 · SMB / Startup Profile

[PNG](png/hinh_2_10_smb_profile.drawio.png) · [SVG](svg/hinh_2_10_smb_profile.svg) · [Draw.io](drawio/hinh_2_10_smb_profile.drawio)

![Hình 2.10 · SMB / Startup Profile](png/hinh_2_10_smb_profile.drawio.png)

### Hình 2.11 · Enterprise / Regulated Profile

[PNG](png/hinh_2_11_enterprise_profile.drawio.png) · [SVG](svg/hinh_2_11_enterprise_profile.svg) · [Draw.io](drawio/hinh_2_11_enterprise_profile.drawio)

![Hình 2.11 · Enterprise / Regulated Profile](png/hinh_2_11_enterprise_profile.drawio.png)

### Hình 2.12 · Global Hyper-Scale Cell-Based Profile

[PNG](png/hinh_2_12_cell_based_profile.drawio.png) · [SVG](svg/hinh_2_12_cell_based_profile.svg) · [Draw.io](drawio/hinh_2_12_cell_based_profile.drawio)

![Hình 2.12 · Global Hyper-Scale Cell-Based Profile](png/hinh_2_12_cell_based_profile.drawio.png)

### Hình 2.13 · Lan truyền ngữ cảnh và cờ tính năng

[PNG](png/hinh_2_13_feature_flags_sequence.drawio.png) · [SVG](svg/hinh_2_13_feature_flags_sequence.svg) · [Draw.io](drawio/hinh_2_13_feature_flags_sequence.drawio)

![Hình 2.13 · Lan truyền ngữ cảnh và cờ tính năng](png/hinh_2_13_feature_flags_sequence.drawio.png)

### Hình 2.14 · SET LOCAL và tái sử dụng Connection Pool

[PNG](png/hinh_2_14_set_local_sequence.drawio.png) · [SVG](svg/hinh_2_14_set_local_sequence.svg) · [Draw.io](drawio/hinh_2_14_set_local_sequence.drawio)

![Hình 2.14 · SET LOCAL và tái sử dụng Connection Pool](png/hinh_2_14_set_local_sequence.drawio.png)

### Hình 2.15 · Two-Tier Caching và W-TinyLFU

[PNG](png/hinh_2_15_two_tier_caching.drawio.png) · [SVG](svg/hinh_2_15_two_tier_caching.svg) · [Draw.io](drawio/hinh_2_15_two_tier_caching.drawio)

![Hình 2.15 · Two-Tier Caching và W-TinyLFU](png/hinh_2_15_two_tier_caching.drawio.png)

### Hình 2.16 · Cây quyết định kiến trúc

[PNG](png/hinh_2_16_decision_tree.drawio.png) · [SVG](svg/hinh_2_16_decision_tree.svg) · [Draw.io](drawio/hinh_2_16_decision_tree.drawio)

![Hình 2.16 · Cây quyết định kiến trúc](png/hinh_2_16_decision_tree.drawio.png)


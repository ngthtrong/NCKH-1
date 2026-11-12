# Danh mục hình Chương 2 — bản đã sửa

[Mở bộ xem ảnh](xem-tat-ca.html). Nhấn ảnh để xem lớn. PNG rộng 2.400 px; SVG và PNG chứa bản XML có thể mở lại bằng Draw.io.

14 hình chính được đánh số theo chỉ định trong bản báo cáo đính kèm. Bốn hình phụ nằm trong `bo-sung/`, không làm đổi số hình chính. Bản gốc đã được giữ trong `_archive/2026-11-06-ban-cu/` cùng mã SHA-256.

## Những sửa đổi đã hoàn thành

- Bổ sung Hình 2.6 Compute-Isolated/Shared-Data và Hình 2.10 Tiered Hybrid + Cells.
- Chuẩn hóa 9 tầng, VM/container, Shared/Dedicated; bổ sung queue và phạm vi hạ tầng Enterprise.
- Dùng tenant registry để ánh xạ cell ổn định; bỏ phép modulo mâu thuẫn với dải tenant.
- Sửa luồng cache đủ L1/L2 hit/miss, đọc DB, cập nhật cache và trả dữ liệu; phân biệt W-TinyLFU nội bộ L1 với chính sách L2.
- Khôi phục nhánh script/plugin trong cây quyết định; bỏ ngưỡng tải không có luận chứng.
- Bổ sung Backend/Worker, context bất biến, cleanup trong finally và lựa chọn local flag provider.
- SET LOCAL dùng UUID hợp lệ, có COMMIT/ROLLBACK và hoàn trả connection; bỏ khẳng định reset luôn thành NULL.
- RLS có điểm thực thi, điều kiện fail-closed, kiểm tra đọc/ghi và giới hạn role.

## Các câu trong báo cáo cần đồng bộ

Bản báo cáo là file đính kèm bên ngoài workspace, nên các điểm dưới đây được ghi thành câu thay thế để chèn vào bản thảo:

1. Bridge: “Chia sẻ tầng ứng dụng 8–9 và Middleware 7; trong biến thể schema-per-tenant, tách schema tầng 6 trên DB tầng 5 và DBMS tầng 4 dùng chung; hạ tầng tầng 1–3 vẫn có thể được chia sẻ.” Thay câu gán Compute=1–5 và Data=6–9.
2. Chi phí: “Mức cô lập tăng thường làm chi phí tài nguyên trên tenant tăng và mật độ giảm, phụ thuộc tải và cách triển khai.” Thay cách gọi tương quan nghịch đảo giữa chi phí biên và độ dày.
3. Cache: “L1 Caffeine dùng W-TinyLFU để quản lý admission/eviction nội bộ. L1 miss kiểm tra L2 Redis, L2 miss đọc DB; ứng dụng cập nhật các lớp cache theo chính sách. Caffeine không tự lọc các lần ghi Redis L2.”
4. SET LOCAL: “Giá trị cục bộ hết hiệu lực ở COMMIT/ROLLBACK và khôi phục giá trị session trước đó. Không để session mang tenant context tồn dư; RLS xử lý thiếu/rỗng bằng NULLIF(current_setting(..., true), '').”
5. Cây quyết định: “Yêu cầu tuân thủ/BYOK cần được chuyển thành yêu cầu triển khai cụ thể trước khi chọn Silo. Nhu cầu chạy script/plugin riêng dẫn đến phương án Compute-Isolated/Shared-Data; nhiều ràng buộc cùng tồn tại cần phối hợp cơ chế.”
6. “Level 1–5 là hệ quy chiếu phân loại của nghiên cứu; số Level khác số tầng 1–9.” Những kết luận về chi phí, onboarding, p99 và phạm vi sự cố cần giả định hoặc kết quả đo; không dùng khẳng định tuyệt đối từ topology.

## Tài liệu kỹ thuật đã đối chiếu

- [PostgreSQL SET](https://www.postgresql.org/docs/current/sql-set.html)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL Schemas](https://www.postgresql.org/docs/current/ddl-schemas.html)
- [Caffeine Design](https://github.com/ben-manes/caffeine/wiki/Design)
- [Kubernetes multi-tenancy](https://kubernetes.io/docs/concepts/security/multi-tenancy/)
- [OpenFeature provider specification](https://openfeature.dev/specification/sections/providers/)

## Ảnh và nguồn

### Hình 2.1 · Hệ quy chiếu 9 tầng

[PNG](hinh_2_1_master_blueprint.drawio.png) · [SVG](hinh_2_1_master_blueprint.svg) · [Draw.io](hinh_2_1_master_blueprint.drawio)

![Hình 2.1 · Hệ quy chiếu 9 tầng](hinh_2_1_master_blueprint.drawio.png)

### Hình 2.2 · Silo: ngăn xếp dành riêng cho từng tenant

[PNG](hinh_2_2_silo_model.drawio.png) · [SVG](hinh_2_2_silo_model.svg) · [Draw.io](hinh_2_2_silo_model.drawio)

![Hình 2.2 · Silo: ngăn xếp dành riêng cho từng tenant](hinh_2_2_silo_model.drawio.png)

### Hình 2.3 · Pool: tài nguyên dùng chung, dữ liệu tách logic

[PNG](hinh_2_3_pool_model.drawio.png) · [SVG](hinh_2_3_pool_model.svg) · [Draw.io](hinh_2_3_pool_model.drawio)

![Hình 2.3 · Pool: tài nguyên dùng chung, dữ liệu tách logic](hinh_2_3_pool_model.drawio.png)

### Hình 2.4 · Bridge: app chung, schema riêng

[PNG](hinh_2_4_bridge_model.drawio.png) · [SVG](hinh_2_4_bridge_model.svg) · [Draw.io](hinh_2_4_bridge_model.drawio)

![Hình 2.4 · Bridge: app chung, schema riêng](hinh_2_4_bridge_model.drawio.png)

### Hình 2.5 · Hybrid: Pool và Silo cùng tồn tại

[PNG](hinh_2_5_hybrid_model.drawio.png) · [SVG](hinh_2_5_hybrid_model.svg) · [Draw.io](hinh_2_5_hybrid_model.drawio)

![Hình 2.5 · Hybrid: Pool và Silo cùng tồn tại](hinh_2_5_hybrid_model.drawio.png)

### Hình 2.6 · Compute-Isolated / Shared-Data

[PNG](hinh_2_6_compute_isolated_shared_data.drawio.png) · [SVG](hinh_2_6_compute_isolated_shared_data.svg) · [Draw.io](hinh_2_6_compute_isolated_shared_data.drawio)

![Hình 2.6 · Compute-Isolated / Shared-Data](hinh_2_6_compute_isolated_shared_data.drawio.png)

### Hình 2.7 · Cell-Based / Deployment Stamps

[PNG](hinh_2_7_cell_based.drawio.png) · [SVG](hinh_2_7_cell_based.svg) · [Draw.io](hinh_2_7_cell_based.drawio)

![Hình 2.7 · Cell-Based / Deployment Stamps](hinh_2_7_cell_based.drawio.png)

### Hình 2.8 · SMB / Startup Profile

[PNG](hinh_2_8_smb_profile.drawio.png) · [SVG](hinh_2_8_smb_profile.svg) · [Draw.io](hinh_2_8_smb_profile.drawio)

![Hình 2.8 · SMB / Startup Profile](hinh_2_8_smb_profile.drawio.png)

### Hình 2.9 · Enterprise / Regulated Profile

[PNG](hinh_2_9_enterprise_profile.drawio.png) · [SVG](hinh_2_9_enterprise_profile.svg) · [Draw.io](hinh_2_9_enterprise_profile.drawio)

![Hình 2.9 · Enterprise / Regulated Profile](hinh_2_9_enterprise_profile.drawio.png)

### Hình 2.10 · Tiered Platform: Hybrid + Cell-Based

[PNG](hinh_2_10_tiered_platform.drawio.png) · [SVG](hinh_2_10_tiered_platform.svg) · [Draw.io](hinh_2_10_tiered_platform.drawio)

![Hình 2.10 · Tiered Platform: Hybrid + Cell-Based](hinh_2_10_tiered_platform.drawio.png)

### Hình 2.11 · TenantContext xuyên luồng và feature flags

[PNG](hinh_2_11_context_feature_flags.drawio.png) · [SVG](hinh_2_11_context_feature_flags.svg) · [Draw.io](hinh_2_11_context_feature_flags.drawio)

![Hình 2.11 · TenantContext xuyên luồng và feature flags](hinh_2_11_context_feature_flags.drawio.png)

### Hình 2.12 · SET LOCAL và tái sử dụng connection

[PNG](hinh_2_12_set_local_sequence.drawio.png) · [SVG](hinh_2_12_set_local_sequence.svg) · [Draw.io](hinh_2_12_set_local_sequence.drawio)

![Hình 2.12 · SET LOCAL và tái sử dụng connection](hinh_2_12_set_local_sequence.drawio.png)

### Hình 2.13 · Two-Tier Cache: đọc dữ liệu và admission

[PNG](hinh_2_13_two_tier_caching.drawio.png) · [SVG](hinh_2_13_two_tier_caching.svg) · [Draw.io](hinh_2_13_two_tier_caching.drawio)

![Hình 2.13 · Two-Tier Cache: đọc dữ liệu và admission](hinh_2_13_two_tier_caching.drawio.png)

### Hình 2.14 · Cây quyết định kiến trúc

[PNG](hinh_2_14_decision_tree.drawio.png) · [SVG](hinh_2_14_decision_tree.svg) · [Draw.io](hinh_2_14_decision_tree.drawio)

![Hình 2.14 · Cây quyết định kiến trúc](hinh_2_14_decision_tree.drawio.png)

### Bổ sung 01 · Tách DBMS theo tenant

[PNG](bo-sung/bs_01_dedicated_database.drawio.png) · [SVG](bo-sung/bs_01_dedicated_database.svg) · [Draw.io](bo-sung/bs_01_dedicated_database.drawio)

![Bổ sung 01 · Tách DBMS theo tenant](bo-sung/bs_01_dedicated_database.drawio.png)

### Bổ sung 02 · PostgreSQL RLS và fail-closed

[PNG](bo-sung/bs_02_rls_engine.drawio.png) · [SVG](bo-sung/bs_02_rls_engine.svg) · [Draw.io](bo-sung/bs_02_rls_engine.drawio)

![Bổ sung 02 · PostgreSQL RLS và fail-closed](bo-sung/bs_02_rls_engine.drawio.png)

### Bổ sung 03 · Schema namespace và tùy biến dữ liệu

[PNG](bo-sung/bs_03_schema_namespace.drawio.png) · [SVG](bo-sung/bs_03_schema_namespace.svg) · [Draw.io](bo-sung/bs_03_schema_namespace.drawio)

![Bổ sung 03 · Schema namespace và tùy biến dữ liệu](bo-sung/bs_03_schema_namespace.drawio.png)

### Bổ sung 04 · Resolve tenant, tier và đích triển khai

[PNG](bo-sung/bs_04_customer_segmentation.drawio.png) · [SVG](bo-sung/bs_04_customer_segmentation.svg) · [Draw.io](bo-sung/bs_04_customer_segmentation.drawio)

![Bổ sung 04 · Resolve tenant, tier và đích triển khai](bo-sung/bs_04_customer_segmentation.drawio.png)


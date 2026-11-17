
# TÀI LIỆU 02: THIẾT KẾ GIAO DIỆN (UI), TRẢI NGHIỆM NGƯỜI DÙNG (UX) VÀ HÀNH TRÌNH TƯƠNG TÁC ĐA THUÊ BAO

> **Căn cứ thiết kế:** Chương 4 (Mục 4.2.2, 4.2.3 và Hình 4.4) — Báo cáo tổng kết đề tài NCKH Sinh viên `THS2026-67`.
> **Kiến trúc Frontend:** Ứng dụng Trang đơn (*Single-Page Application — SPA*) xây dựng bằng **React 18 + TypeScript (`Vite`)**.

---

## 1. Nguyên tắc Thiết kế UI/UX cho Ứng dụng Đa thuê bao Cấp độ 3

1. **Một bộ mã nguồn giao diện — Đa bản sắc hiển thị (*Single UI Codebase, Multi-Brand Experience*):** Không viết mã giao diện rẽ nhánh cứng (`if (tenant === 't-acme')`) cho từng khách hàng. Toàn bộ màu sắc, biểu trưng, mật độ thẻ, danh sách cột, chế độ cảnh báo WIP và biểu mẫu nhập liệu phải được kết xuất động (*Metadata-Driven Rendering*) từ gói JSON cấu hình tải về sau khi chọn không gian làm việc.
2. **Phản hồi trạng thái quy tắc nghiệp vụ tường minh (*Explicit Policy Feedback*):** Người dùng luôn nhìn thấy rõ không gian làm việc hiện tại đang vận hành ở chế độ `WIP STRICT` hay `WIP WARN`, số lượng thẻ hiện tại trên hạn mức tối đa của từng cột (`3/3`, `3/2`), và nhận được phản hồi thị giác ngay lập tức khi thao tác kéo–thả thẻ chạm ngưỡng giới hạn.
3. **Chuyển đổi ngữ cảnh mượt mà không tải lại toàn trang (*Seamless Workspace Switching*):** Khi một người dùng thuộc nhiều tổ chức chuyển đổi qua lại giữa các Workspace, ứng dụng tự động thay thẻ bài `JWT`, nạp lại cấu hình 3 lớp và biến đổi toàn bộ chủ đề giao diện ngay tức thì.

---

## 2. Thiết kế Chi tiết Các Màn hình và Khu vực Chức năng

### 2.1. Màn hình Đăng nhập & Chọn Không gian làm việc (`Workspace Selector` — Mục 4.2.3)

* **Mục đích:** Minh họa bước khởi tạo ngữ cảnh định danh thuê bao (`UC02`) trước khi đi vào bảng Kanban.
* **Thành phần hiển thị:**
  - Sau khi xác thực email/mật khẩu, nếu tài khoản tham gia nhiều tổ chức, hệ thống hiển thị danh sách **Thẻ Không gian làm việc (*Workspace Cards*)** mà người dùng có quyền truy cập:
    - *Ví dụ thẻ 1:* **Acme Software** (`slug: t-acme` · Nhãn gói: `Enterprise Tier` · Vai trò: `TENANT_ADMIN` · Chế độ: `WIP STRICT`).
    - *Ví dụ thẻ 2:* **Lotus Media** (`slug: t-lotus` · Nhãn gói: `Pro Tier` · Vai trò: `TENANT_ADMIN` · Chế độ: `WIP WARN`).
  - Khi nhấp chọn một tổ chức, client gọi API cấp phát `JWT` gắn cứng `tenant_id` tương ứng, lưu vào bộ nhớ phiên của ứng dụng và nạp cấu hình Lớp 1–3.

### 2.2. Bố cục Ba Khu vực của Màn hình Làm việc Chính (`Kanban Workspace View` — Hình 4.4)

```text
+--------------------------------------------------------------------------------------------------+
| [KHU VỰC 1: THANH ĐIỀU HƯỚNG & NHẬN DIỆN KHÔNG GIAN LÀM VIỆC (TOP NAVBAR)]                       |
| [Logo] Tên Tổ chức (VD: Acme Software) [Badge: Enterprise] | [Chuyển Workspace v] [Cấu hình (Admin)] |
+--------------------------------------------------------------------------------------------------+
| [KHU VỰC 2: THANH TRẠNG THÁI CHÍNH SÁCH NGHIỆP VỤ & CÔNG CỤ LỌC (POLICY & FILTER BAR)]          |
| Chính sách WIP: [Badge Đỏ: STRICT - Chặn cứng khi vượt trần] | Trường mở rộng: [story_points] [sprint] |
| Tìm kiếm: [Nhập từ khóa...] | Lọc độ ưu tiên: [Tất cả v] | Lọc trường động: [Sprint v] [+ Tạo thẻ] |
+--------------------------------------------------------------------------------------------------+
| [KHU VỰC 3: KHÔNG GIAN BẢNG CÔNG VIỆC KANBAN TRUNG TÂM (KANBAN BOARD CANVAS)]                    |
|                                                                                                  |
| +-------------------------+  +-----------------------------+  +-------------------------+        |
| | Chờ xử lý · WIP 2/5     |  | Đang làm · WIP 2/2 [ĐẠT TRẦN]|  | Rà soát · WIP 1/3       |        |
| +-------------------------+  +-----------------------------+  +-------------------------+        |
| | +---------------------+ |  | +-------------------------+ |  | +---------------------+ |        |
| | | Thiết kế API        | |  | | Bộ lọc JWT              | |  | | Tích hợp RLS        | |        |
| | | [5 điểm] [Đợt 1]    | |  | | [8 điểm] [Đợt 1]        | |  | | [3 điểm] [Đợt 1]    | |        |
| | +---------------------+ |  | +-------------------------+ |  | +---------------------+ |        |
| |                         |  | | [!] Kéo thẻ mới vào đây | |  |                         |        |
| |                         |  | | -> Chặn cứng HTTP 422   | |  |                         |        |
| +-------------------------+  +-----------------------------+  +-------------------------+        |
+--------------------------------------------------------------------------------------------------+
```

1. **Khu vực 1 — Thanh điều hướng và Nhận diện Không gian làm việc (*Top Navigation Bar*):**
   - Nền hoặc đường viền nhấn sử dụng biến màu chủ đạo `--tenant-primary-color` nạp từ Lớp 1.
   - Hiển thị tên tổ chức thuê bao, biểu trưng, nhãn gói dịch vụ (`Enterprise` / `Pro`), menu thả xuống **Workspace Switcher** để chuyển nhanh sang tổ chức khác, và nút **Cấu hình Thuê bao (*Tenant Policy Drawer*)** (chỉ hiển thị khi `role == ADMIN`).
2. **Khu vực 2 — Thanh trạng thái Chính sách Nghiệp vụ và Bộ lọc (*Policy Status & Filter Bar*):**
   - Hiển thị huy hiệu trực quan cho biết chế độ kiểm soát WIP đang kích hoạt:
     - Chế độ `STRICT`: Nhãn màu đỏ/xanh đậm *"Chính sách WIP: STRICT (Chặn cứng khi vượt giới hạn)"*.
     - Chế độ `WARN`: Nhãn màu vàng hổ phách *"Chính sách WIP: WARN (Cảnh báo mềm khi vượt giới hạn)"*.
   - Liệt kê các huy hiệu trường dữ liệu mở rộng đang áp dụng của tổ chức (VD: `story_points`, `sprint` hoặc `channel`, `budget_usd`) và thanh công cụ lọc thẻ công việc.
3. **Khu vực 3 — Không gian Bảng công việc Kanban trung tâm (*Kanban Board Canvas*):**
   - Hiển thị chuỗi các cột trạng thái theo chiều ngang (`board_columns` sắp xếp theo `position`).
   - Trên mỗi tiêu đề cột có **Bộ đếm tỷ lệ WIP** dạng `<số_thẻ_hiện_tại> / <wip_limit>` (ví dụ: `WIP 2/2` hoặc `WIP 3/2`).
   - Bên trong mỗi cột là danh sách các thẻ công việc (`cards` sắp xếp theo `position`), hỗ trợ kéo–thả trực tiếp bằng chuột và kết xuất động các huy hiệu thuộc tính mở rộng từ cột `custom_fields`.

### 2.3. Ngăn kéo Cấu hình Tùy biến Thuê bao (`Tenant Customization Drawer / Modal`)

* Dành riêng cho `Tenant Admin` để thực hiện `UC03` và `UC04` ngay trên giao diện mà không cần tải lại trang:
  - **Phần Lớp 1 (Giao diện):** Bộ chọn màu chủ đạo (`Color Picker` hoặc bảng màu chuẩn `#1D4ED8`, `#B45309`, `#0F766E`...) và nút gạt chọn mật độ thẻ (`Đầy đủ` / `Thu gọn`).
  - **Phần Lớp 2 (Quy trình & Luật WIP):** Công tắc chuyển đổi tức thời chế độ `WIP Enforcement Mode` (`STRICT` <-> `WARN` <-> `OFF`) và chỉnh sửa danh sách cột mặc định.
  - **Phần Lớp 3 (Trường dữ liệu mở rộng):** Danh sách các trường động hiện có kèm nút **"+ Thêm trường mở rộng"** (nhập mã trường `key`, tên hiển thị `label`, chọn kiểu `NUMBER` / `TEXT` / `SELECT`, tích chọn `Bắt buộc nhập`).

---

## 3. Cơ chế Kỹ thuật Giao diện và Luồng Hành trình UX Cốt lõi

### 3.1. Cơ chế tiêm biến CSS động (`Dynamic CSS Variables`) cho Lớp 1

Ngay khi nhận được gói siêu dữ liệu `tenants.settings` từ API `GET /api/v1/tenant-settings/kanban`, ứng dụng React cập nhật trực tiếp vào phần tử gốc `:root`:

```typescript
function applyTenantTheme(settings: TenantSettings) {
  const root = document.documentElement;
  root.style.setProperty('--tenant-primary', settings.themeColor || '#1D4ED8');
  root.style.setProperty('--tenant-card-padding', settings.cardDensity === 'COMPACT' ? '8px' : '14px');
  root.dataset.cardDensity = settings.cardDensity || 'FULL';
}
```

### 3.2. Bộ kết xuất Biểu mẫu Động (`Dynamic Custom Field Form Renderer`) cho Lớp 3

Khi người dùng mở hộp thoại **Tạo / Chỉnh sửa Thẻ công việc (`UC08`)**, ngoài các ô nhập liệu cố định (`Tiêu đề`, `Mức độ ưu tiên`, `Hạn chót`), giao diện tự động duyệt mảng `settings.customFieldsSchema` để sinh các ô nhập liệu tương ứng:

* Nếu `type === 'NUMBER'` (như `story_points` hoặc `budget_usd`): Kết xuất `<input type="number" required={field.required} min={field.min} />`.
* Nếu `type === 'SELECT'` (như `channel` hoặc `sprint`): Kết xuất `<select required={field.required}>` chứa danh sách `field.options`.
* Nếu `type === 'TEXT'`: Kết xuất `<input type="text" required={field.required} />`.

### 3.3. Đối chứng Hành trình UX Kéo–Thả Thẻ giữa `t-acme` (`STRICT`) và `t-lotus` (`WARN`)

| Bước tương tác                         | Trải nghiệm trên **Acme Software (`t-acme` — Chế độ `STRICT`)**                                                                                                                                                                                           | Trải nghiệm trên **Lotus Media (`t-lotus` — Chế độ `WARN`)**                                                                                                                                                                                           |
| :------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Trạng thái trước khi kéo**  | Cột *"Đang làm (`In-Development`)"* đang có `2/2` thẻ (hoặc `3/3` thẻ), chạm trần `wip_limit`.                                                                                                                                                         | Cột *"Sản xuất (`Producing`)"* đang có `2/2` thẻ, chạm ngưỡng khuyến nghị `wip_limit = 2`.                                                                                                                                                           |
| **2. Thao tác của người dùng**   | Thành viên nhấn giữ thẻ từ cột *"Chờ xử lý"* và thả vào cột *"Đang làm"*.                                                                                                                                                                              | Thành viên nhấn giữ thẻ chiến dịch khẩn cấp từ cột *"Ý tưởng"* và thả vào cột *"Sản xuất"*.                                                                                                                                                     |
| **3. Phản hồi từ Backend API**     | API `PATCH /boards/{id}/tasks/{cardId}/position` trả về mã lỗi **HTTP 422 Unprocessable Entity** kèm thông điệp vi phạm hạn mức WIP.                                                                                                                    | API `PATCH /boards/{id}/tasks/{cardId}/position` chấp nhận lưu vào CSDL và trả về **HTTP 200 OK** kèm cờ `wipWarning: true`.                                                                                                                         |
| **4. Phản hồi thị giác trên UI** | • Thẻ tự động **trượt ngược về cột cũ** (*Rollback*).• Khung cột *"Đang làm"* nháy viền đỏ.• Hiển thị Toast/Banner thông báo lỗi màu đỏ: *"Chặn kéo thẻ mới (HTTP 422): Cột Đang làm đã đạt giới hạn WIP tối đa!"* | • Thẻ **nằm lại ở cột *"Sản xuất"*** thành công.• Bộ đếm tiêu đề cột cập nhật thành **`WIP 3/2`**.• Tiêu đề cột chuyển sang nền **Cảnh báo vàng/cam** kèm nhãn *"Vượt giới hạn WIP — Cần điều phối!"* |

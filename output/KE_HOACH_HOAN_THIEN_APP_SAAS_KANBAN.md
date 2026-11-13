# Kế hoạch hoàn thiện ứng dụng SaaS Kanban đa thuê bao

## Mục tiêu

Hoàn thiện ứng dụng minh họa quản lý công việc cho nhóm giảng viên/sinh viên sau khi đã có bản Pool mức 3 và kết quả thực nghiệm. Kế hoạch tập trung vào nghiệp vụ, trải nghiệm sử dụng và độ tin cậy. Đây là backlog phát triển sản phẩm; không dùng tính năng UX mới làm bằng chứng cho kết luận thực nghiệm.

## Trạng thái hiện tại

- Bản mặc định là Pool mức 3: một API, database/schema/bảng dùng chung, phân định tenant bằng tenant_id và RLS.
- Các luồng nền tảng gồm xác thực tenant, cô lập dữ liệu, WIP STRICT/WARN, cấu hình Kanban theo tenant, cache và rate limiting đã được hiện thực/kiểm tra.
- Thực nghiệm cuối có năm cặp trước/sau. Các lượt sau ghi nhận hai nhóm victim đạt 100% request thành công; 4/5 cặp đạt p95 < 500 ms, một cặp nhóm large đạt 570,51 ms. N=5 chỉ hỗ trợ mô tả trong phạm vi protocol; cache và rate limiter thay đổi cùng lúc nên chưa tách được tác động từng cơ chế.
- Kiểm tra UX hiện tại gồm ảnh desktop/mobile và một luồng Playwright; đây chưa phải đánh giá khả dụng với người dùng đại học.
- Không mô tả ứng dụng là prototype chưa qua thực nghiệm. Cũng chưa gọi là production-grade khi chưa có bằng chứng triển khai và vận hành thực tế.

Nguồn hiện trạng: output/report-app-check.md, output/report-experiment-results.md, output/Chuong_5_Ban_Moi_Nhat_Hoan_Chinh.docx.

## Nguyên tắc triển khai

1. Kiểm kê code/API hiện tại trước mỗi hạng mục để tránh làm lại tính năng đã có.
2. Workspace gần nhất trên trình duyệt chỉ là gợi ý. Backend vẫn xác định tenant từ host/token và kiểm tra quyền.
3. Phân biệt vai trò cấp workspace với vai trò project/board; UI chỉ hiển thị quyền backend thực thi.
4. Chia từng lát nhỏ, gồm UI, API/data phụ thuộc, trạng thái lỗi/loading/empty và tiêu chí nghiệm thu.
5. Optimistic UI phải xử lý rollback khi gặp 401/403/409/422, lỗi mạng và cập nhật đồng thời. Không hứa “0 ms”.
6. Chỉ thêm nghiệp vụ khi có yêu cầu và backend hỗ trợ đầy đủ.

## Lộ trình ưu tiên

### P0 — Rà soát nền và hoàn thiện luồng hiện có

- Lập bảng kiểm kê từng màn hình: hành vi hiện có, API, quyền, thiếu trạng thái UI và lỗi đã biết.
- Kiểm tra workspace switcher, định tuyến đăng nhập và khôi phục workspace gần nhất; bảo đảm slug/localStorage không tự cấp quyền.
- Rà soát role workspace/project để nhãn giao diện khớp backend.
- Kiểm tra responsive cho board, project, thành viên và cấu hình workspace trên laptop/tablet/mobile.
- Chuẩn hóa trạng thái tải, rỗng, lỗi, không có quyền, hết phiên và thông báo thành công.

**Nghiệm thu:** đăng nhập → chọn workspace → mở project/board → thao tác task; đổi workspace không lẫn dữ liệu, cache hoặc tenant context.

### P1 — Kanban và dự án

- Chỉ tách KanbanPage.tsx sau khi xác định ranh giới state/API. Ưu tiên bảo trì và giảm lỗi; chỉ tuyên bố nhanh hơn nếu có đo trước/sau.
- Thêm quick-add nếu API hiện có hỗ trợ đủ trường bắt buộc; giữ kiểm tra WIP ở server.
- Bổ sung tìm kiếm/lọc theo assignee, ưu tiên, deadline sau khi xác nhận nguồn dữ liệu và API. Ghi rõ giới hạn nếu lọc phía client.
- Cải thiện drag-and-drop: trạng thái kéo/thả rõ, hỗ trợ bàn phím/touch, rollback chính xác khi server từ chối; giữ đúng hành vi WIP STRICT/WARN.
- Card dự án và progress chỉ dùng chỉ số có định nghĩa rõ, ví dụ số task hoàn tất chia tổng task chưa archive.

**Nghiệm thu:** tạo, sửa, lọc, kéo thả và mở chi tiết task; xác nhận 422/409 không làm UI lệch dữ liệu server.

### P2 — Chi tiết công việc và cộng tác

Làm từng phần, không gộp tất cả vào Drawer:

1. Drawer/modal: trạng thái, assignee, ưu tiên, deadline, mô tả và custom fields backend đang hỗ trợ.
2. Checklist chỉ khi có API/data model, kiểm tra quyền sửa và cập nhật đồng thời.
3. Comments chỉ khi có API, phân quyền và quy tắc sửa/xóa; không chỉ tạo giao diện tĩnh.
4. Markdown cần giới hạn định dạng và sanitize khi hiển thị.

**Nghiệm thu:** dữ liệu lưu bền, tenant-scoped, quyền đúng, có trạng thái loading/error/empty.

### P3 — Thành viên và lời mời

- Danh sách thành viên dùng dữ liệu thật và vai trò backend thực thi.
- Lời mời email cần token có hạn dùng, chống dùng lại, kiểm tra tenant và xử lý email đã có tài khoản. Nếu chưa có provider email, giới hạn ở luồng tạo/copy link demo và ghi rõ.
- Mời nhiều email là bước sau khi luồng một người ổn định.
- Không mặc định giảng viên luôn Owner hoặc sinh viên luôn Viewer; vai trò cần theo nghiệp vụ và lựa chọn người tạo.

**Nghiệm thu:** sửa URL không cho phép tự gia nhập tenant; lời mời hết hạn/sai tenant bị từ chối.

### P4 — Deadline, thông báo và tài nguyên

- Thống nhất timezone, deadline là ngày hay thời điểm, thời điểm nhắc, trạng thái đã đọc và cách chống gửi trùng.
- Làm nhắc hạn trong ứng dụng trước; email/Web Push cần worker, provider, retry và tùy chọn nhận thông báo.
- Liên kết tệp với task sau khi xác nhận quyền truy cập, tenant scoping, giới hạn dung lượng/loại tệp và chính sách lưu trữ.
- Dashboard dùng cùng quy tắc quyền và timezone như board.

**Nghiệm thu:** chỉ thành viên có quyền trong tenant truy cập tệp; reminder đúng thời điểm, không lặp khi retry.

### P5 — Template dự án giáo dục

- Template tạo project/board/cột, không tạo bộ quyền hoặc kiến trúc riêng.
- Cho xem trước cột, WIP và trường trước khi tạo.
- Sửa template không làm thay đổi project đã tạo.

**Nghiệm thu:** project tạo từ template có cấu hình đúng và có thể chỉnh theo nhu cầu.

## Ngoài phạm vi đợt UX

- Không gọi ứng dụng production-grade chỉ từ giao diện hoặc test local.
- Không thêm thanh toán, SSO, Web Push hay email provider nếu chưa có yêu cầu và cấu hình vận hành.
- Không đổi placement/RLS khi chỉ làm UI.
- Không gộp thay đổi UX vào kết luận benchmark. Nếu thay đổi API, truy vấn, cache, limiter, dữ liệu hoặc hạ tầng có thể ảnh hưởng số đo, lập protocol đo riêng; giữ nguyên các kết quả cũ.

## Tiêu chí hoàn thành

- Workspace, project, board và task có trạng thái loading/empty/error/unauthorized.
- Đổi tenant không rò dữ liệu; quyền luôn được kiểm tra ở backend.
- Tính năng mới có API/data contract và tiêu chí nghiệm thu, không chỉ mock UI.
- Giao diện dùng được trên laptop/tablet/mobile và có thao tác bàn phím cơ bản.
- Tài liệu phân biệt rõ đã làm, chưa làm và giới hạn; giữ nguyên phạm vi kết luận Chương 5.

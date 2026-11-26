# Rà soát Report V4 ngày 26/11/2026

Nguồn đối chiếu gồm `Report_V4.md`, `Report_V4.pdf` và `Report_V4.docx`.
Manifest ghi hash của ba tệp, nội dung và tài nguyên đưa vào báo cáo.
Các chỉnh sửa thân bài đã duyệt có vị trí trước và sau trong
[v4-approved-edits.json](assets/v4-approved-edits.json).

| Mã | Kết quả xử lý |
| --- | --- |
| BT-01 | Sửa cụm thừa, lỗi gõ và câu phân quyền xóa bảng. Quyền xóa bảng trong phạm vi thuê bao được đối chiếu với `KanbanService.deleteBoard` ở commit `8678bfe`. |
| BT-02 | Thống nhất cách gọi thuê bao, bể kết nối và hiện tượng láng giềng ồn ào. Sửa các cụm dịch sát nghĩa trong phần định danh, cơ sở dữ liệu và tùy biến. |
| BT-03 | Bỏ cụm lặp và ghi chú soạn thảo trong Chương 4. Bản tin Việt dùng tên chính thức của đề tài. Bản tin Anh dùng tiêu đề “Research Project News Brief” và chuẩn hóa tên trường. |
| LG-01 | Mô tả Acme Software và Lotus Media là chân dung giả lập dùng để thiết kế và thử nghiệm. Giới hạn nội dung nhất quán trạng thái vào các thao tác nguyên mẫu có mô tả. |
| LG-04 | Đồng bộ tên UC02, luồng đăng nhập theo tên miền phụ, chú thích 4.5–4.6 và Bảng 4.3. API và tên trường được đối chiếu tĩnh với `AuthController`, `PublicController`, `KanbanController`, `TenantSettingsController` và `TenantSettings` ở commit `8678bfe`. Báo cáo dùng `cardDensity` và ghi khả năng tương thích với `cardDisplayMode`. |
| LG-05 | Giữ mẫu số truy vấn lọc thủ công tại NFR-03. Với số liệu V4, phụ trội 0,45 ms tương ứng 36,0% ở phép đo vi mô, vượt ngưỡng 5%. Ước tính 1,8% dùng độ trễ API đầu-cuối làm mẫu số. Số đo L1 được thống nhất khoảng 0,12 ms. |

## Điểm tạm hoãn

| Mã | Vị trí | Nội dung cần xem lại |
| --- | --- | --- |
| LG-02 | §1.1–1.3, §2.2–2.3, §3.3 và Kết luận | Làm rõ TCO và `δ → 0` là giả định. Rà các ngưỡng quy mô, “miễn nhiễm” và `O(1)`. Kiểm tra sự nhất quán giữa mô tả Silo dùng chung bộ mã nguồn ở Chương 2 và mô tả tách mã nguồn ở §3.3. |
| LG-03 | §3.2–3.4, §4.3 | Kiểm tra phạm vi RLS, logic ba giá trị và khẳng định về kế hoạch truy vấn. Xác định các cơ chế giới hạn đồng thời và xử lý nền đang được mô tả ở mức nguyên lý, hiện thực hay kiểm thử. |
| LG-06 | §5.1–5.4 và các biểu mẫu kết quả | Đồng bộ 80 VU nghiệp vụ và tối đa 82 VU. Làm rõ mẫu số 92,66%, cách tính RPS và phản hồi 429. Rà cách diễn giải phép so sánh khi Baseline và Proposed đồng thời thay đổi bộ đệm và giới hạn lưu lượng. Xác nhận cách gọi ngưỡng 500 ms. |
| LG-07 | §5.3.2, §5.4 và Phần III | Kiểm tra số lần chạy, nghĩa của `±`, cửa sổ telemetry 17/14 mẫu và phạm vi kiểm tra đồng bộ. Rà giả thuyết CPU/p99, kết luận về mức độ đạt mục tiêu, vòng đời thuê bao, di trú, giám sát và tên đề tài trong câu mở đầu Kết luận. |
| LG-08 | Danh mục viết tắt, tài liệu tham khảo và phụ lục | Hạng mục chưa được duyệt. Giữ danh mục viết tắt của template đã khôi phục và 25 mục tham khảo V4. Cần rà metadata nguồn, số liệu trong tổng quan và các mục [1], [9], [12], [13], [17], [25]. |

Ở Phụ lục C.1, ba giá trị cấu hình mật khẩu/khóa được biểu diễn bằng
chỗ giữ giá trị. Phụ lục D.1 và D.2 trình bày phạm vi, phép đo và chỉ dẫn
đọc kết quả. Manifest đánh dấu cách trình bày của từng khối phụ lục.

## Biểu mẫu

- Hai đơn vị phối hợp tiếp tục là Trường Công nghệ Thông tin và Truyền
  thông, Đại học Cần Thơ và Phòng Quản lý Khoa học, Đại học Cần Thơ.
- `image.png` xác nhận điểm học tập năm 1, 2 và 3 lần lượt là
  3.32/4.0, 3.48/4.0 và 3.79/4.0, khớp mục II trong V4. Phần ảnh hiển thị
  kết thúc ở năm 3. Ảnh chân dung 4×6 vẫn ở trạng thái chờ bổ sung.
- Ngày ký, chữ ký, nhận xét của người hướng dẫn và xác nhận của trường
  được bỏ qua ở lần cập nhật này theo yêu cầu. Biểu mẫu giữ các vị trí
  dành cho người có thẩm quyền.
- Kinh phí 15.000.000 đồng là dự toán. V4 ghi “Không” ở mục công bố.
  Thuyết minh đã ký/đóng dấu, minh chứng sản phẩm nhóm III, tình trạng
  bàn giao và số quyết toán cần hồ sơ xác nhận khi hoàn tất quyển nộp.

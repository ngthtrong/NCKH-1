# Hướng dẫn cho agent trong báo cáo

`report/` là nơi soạn và lưu bản báo cáo tổng kết của đề tài THS2026-67.
Thông tin hành chính lấy từ `../resource/infoGroup.md` và thuyết minh;
nội dung nghiên cứu được cập nhật theo phạm vi người dùng yêu cầu.
Không dùng `archive/` làm nguồn báo cáo hiện hành. Giữ dữ liệu còn thiếu,
nhận xét, ảnh và chữ ký chưa được cung cấp ở trạng thái trống; không tạo
kết quả thực nghiệm, thành tích hoặc xác nhận học thuật giả.

[HinhThucBC.pdf](HinhThucBC.pdf) là căn cứ ưu tiên về hình thức và trình
tự quyển. Chỉ đồng bộ thay đổi từ báo cáo đang dùng khi phù hợp với PDF
này; phân biệt quy định bắt buộc với lựa chọn dàn trang của dự án.

Khi vẽ/chỉnh sơ đồ dữ liệu CDM, LDM hoặc PDM, dùng skill
[cdm-ldm-pdm](.agents/skills/cdm-ldm-pdm/SKILL.md). Đọc skill trước khi
tạo đặc tả/hình; đặt đầu vào và hình của đề tài ở `assets/diagrams/`,
giữ dữ liệu minh họa trong skill. Nếu nhiệm vụ chỉ tạo skill hoặc xem
mẫu, sinh ảnh tạm dưới `build/` và không chèn vào báo cáo chính.

Quy tắc trình bày và đồng bộ mới nhất nằm trong [RULES.md](RULES.md).
Khi sửa khung trình bày, đọc tệp này, giữ cùng nguồn biểu mẫu giữa quyển
và bốn PDF riêng, rồi chạy `make all smoke` và `make check`. Hình/bảng
phải giữ đủ thông tin, bảng thân bài cỡ 13 bp; không thu nhỏ toàn bảng
để ép vừa trang. Nội dung minh họa chỉ nằm trong `examples/`.

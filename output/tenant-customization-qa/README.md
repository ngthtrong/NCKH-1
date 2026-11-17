# Kiểm tra giao diện cấu hình tenant

Các ảnh trong thư mục này được chụp từ frontend thật bằng Playwright, với **API giả lập** để kiểm tra giao diện. Acme Enterprise, Lotus Pro và các cấu hình trong ảnh là dữ liệu kiểm thử; chúng không phản ánh trạng thái cơ sở dữ liệu đang triển khai và không phải bằng chứng thực nghiệm cho báo cáo.

Đã kiểm tra: đăng nhập → chọn workspace → chuyển sang host của tenant → mở ngăn kéo cấu hình; gửi màu sắc và WIP kèm version; bố cục desktop/mobile; đóng bằng nút và Escape; ẩn ngăn kéo đối với thành viên. Chi tiết tại `verification.json`.

Để chụp hình đưa vào mục 4.2.3, chạy backend với dữ liệu của đề tài, đăng nhập bằng Owner/Admin, rồi chọn **Cấu hình tenant** trên thẻ workspace. Ngăn kéo cũng mở được bằng nút cấu hình trên thanh công cụ. Các gói dịch vụ trong danh sách luôn lấy từ API; dữ liệu seed hiện tại đặt Acme và Lotus ở gói Professional.

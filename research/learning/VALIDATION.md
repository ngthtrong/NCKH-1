# Kiểm tra bản biên tập theo định dạng report — 24/10/2026

Bản hiện tại có **36 trang A4**. Nội dung được biên tập theo văn phong báo cáo; thời điểm đối chiếu bằng chứng giữ ở ngày 23/10/2026. Các câu hỏi Chương 1–5 được chuyển đầy đủ vào Phụ lục A cùng gợi ý trả lời và tình huống vận dụng.

## Định dạng

- Điểm vào LaTeX: [main.tex](main.tex). Dùng trực tiếp lớp `report/template/ctu-report.cls` và các tệp `typography.tex`, `packages.tex`, `commands.tex` của báo cáo hiện tại.
- Times New Roman thật, cỡ thân bài 13 bp; giãn dòng 1,3; thụt đầu dòng 1 cm. Lề trái 3 cm, phải/trên/dưới 2 cm, theo lớp dùng chung.
- Bìa chuyên đề có khung và logo CTU; mục lục, danh sách bảng/hình; số trang La Mã ở phần đầu và Ả Rập từ Chương 1. Bảng/hình có số và chú thích.
- Giữ sáu chương; tiêu đề được biên tập theo cấu trúc báo cáo. Tài liệu nguồn và các giới hạn kết luận được giữ để truy vết.

## Kiểm tra

- `bash research/learning/build.sh` đạt: Pandoc chuyển nội dung sang LaTeX, XeLaTeX chạy ba lượt đồng bộ mục lục và tham chiếu.
- Log cuối `build/main.log`: không có lỗi, overfull box, missing character, undefined reference hoặc cảnh báo cần chạy lại.
- `pdffonts` xác nhận Times New Roman Regular/Bold được nhúng trong PDF; mã dùng font monospace và ký hiệu toán dùng font toán của template.
- Đã xem trực tiếp bìa, trang mở đầu chương, sơ đồ và các bảng nội dung/thực nghiệm. Hình giữ tỷ lệ, chữ và chú thích đọc được.
- Kiểm tra tọa độ từ trên toàn bộ PDF: 0 mục ngoài vùng an toàn (trái 25 pt, phải 20 pt, trên/dưới 20 pt). Đây là kiểm tra bổ trợ cho xem bố cục.
- Đối chiếu checksum trước/sau: các thay đổi chỉ nằm trong `research/learning/`; các tệp của báo cáo chính và các nguồn nghiên cứu trước được giữ nguyên.
- Không chạy lại ứng dụng hoặc thực nghiệm. Việc biên tập định dạng không cập nhật trạng thái khoa học của các nguồn.

SHA-256 của PDF đã kiểm: `1a38574786a7f8eca7311568142a0f7a38aa41b151038a9d43e71b11fda5214a`.

## Dựng lại

Chạy `bash research/learning/build.sh` từ gốc repo. Cần Pandoc, XeLaTeX, các gói LaTeX mà `report/` sử dụng, Times New Roman (font hệ thống hoặc bốn tệp trong `/mnt/c/Windows/Fonts/`), DejaVu Sans Mono và Poppler. File `build/` là đầu ra tạm; PDF chính nằm cạnh Markdown. Template dùng chung phải còn ở `report/`. Manifest ghi checksum của các tệp template đã dùng.

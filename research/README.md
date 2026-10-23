# Nghiên cứu nền tảng cho báo cáo đề tài THS2026-67

**Tài liệu học chung và trạng thái đề tài (23/10/2026):** [đọc bản đầy đủ](learning/bao-cao-hoc-tap.md) · [PDF](learning/bao-cao-hoc-tap.pdf). Tài liệu đi theo sáu chương đề cương, giải thích từ nền tảng, đối chiếu mã/biên bản lịch sử và phân biệt đề xuất S3 với ứng dụng Bridge đã có. Xem [phạm vi kiểm chứng](learning/VALIDATION.md) và [cách dựng lại](learning/build.sh). Các mục 01–08 bên dưới giữ nguyên nội dung nghiên cứu trước khi tổng hợp.

Các tài liệu này là kết quả nghiên cứu cho bốn việc thầy yêu cầu: làm rõ khái niệm, dựng mô hình đa thuê bao tổng thể và ngăn xếp hiện đại, sinh kịch bản và phân tích đánh đổi, rồi chọn kiến trúc để cài đặt. Chúng là nguyên liệu cho báo cáo, chưa phải văn bản báo cáo; phần viết báo cáo để cuối quá trình.

Mọi trích dẫn được lấy từ văn bản nguồn trong phiên làm việc ngày 2026-10-23. Cái gì đã đọc, cái gì chưa kiểm chứng được ghi ở [07](07-nguon-va-hieu-chinh.md).

## Thứ tự đọc

| Tài liệu | Nội dung | Hình đi kèm (`report/assets/diagrams/`) |
|---|---|---|
| [01-khai-niem.md](01-khai-niem.md) | Định nghĩa thống nhất, Việt hóa; chia sẻ và dùng riêng; kiểm bằng năm tiêu chí định nghĩa tốt | |
| [02-mo-hinh-mta.md](02-mo-hinh-mta.md) | Mô hình MTA tổng thể, sáu tính chất, phân biệt đa người dùng, đa thể hiện, đa thuê bao | `fig-mta-reference-model`, `fig-mu-mi-mt` |
| [03-ngan-xep-hien-dai.md](03-ngan-xep-hien-dai.md) | Ngăn xếp thay Figure 2.2 của Kabbedijk; hai trục A và D; tầng vệ tinh cố định | `fig-modern-stack` |
| [04-kich-ban-va-danh-doi.md](04-kich-ban-va-danh-doi.md) | Kịch bản S0 đến S5, đánh đổi theo hiệu năng, an toàn dữ liệu, vận hành, tùy biến; giả thuyết cần đo | `fig-scenarios` |
| [05-lua-chon-kien-truc.md](05-lua-chon-kien-truc.md) | Phương pháp chọn, kết quả định lượng và độ nhạy, quyết định và điều kiện lật | `fig-selected-architecture` |
| [06-thiet-ke-thuc-nghiem.md](06-thiet-ke-thuc-nghiem.md) | Thí nghiệm E1 đến E8 và MB-scale, giao thức, quyết định đặt trước, hạng mục cần có ở local | |
| [07-nguon-va-hieu-chinh.md](07-nguon-va-hieu-chinh.md) | Sổ nguồn, trích dẫn nguyên văn, các hiệu chỉnh so với ghi chú trước | |
| [08-cap-nhat-va-ban-kinh-anh-huong.md](08-cap-nhat-va-ban-kinh-anh-huong.md) | Cập nhật hệ thống, bán kính ảnh hưởng, phạm vi thông tin đăng nhập | |
| [analysis/](analysis/) | `mta_matrix.py` (chạy lại được) và `mta_matrix_results.md` | |

Mỗi hình có hai bản `.en.pdf` và `.vi.pdf`, cùng nguồn TikZ. Dựng lại: `report/assets/diagrams/build.sh` (cần XeLaTeX và Times New Roman như template). Nhãn của hình ngăn xếp bằng tiếng Anh học thuật theo yêu cầu của thầy; các hình còn lại có thể chọn bản Việt hoặc Anh.

## Kết quả chính

1. **Khái niệm.** Đổi "chia được / không chia được" thành "chia sẻ / dùng riêng": định nghĩa khẳng định, chỉ dùng "thể hiện" và "thuê bao" đã định nghĩa trước, và có phép thử một câu. Lý do: tiêu chí T5 (không phủ định khi có thể khẳng định) và việc định nghĩa cũ chứa khái niệm mới.
2. **Mô hình.** Thêm Bản triển khai, Thể hiện, Ngữ cảnh thuê bao, mặt phẳng điều khiển và mặt phẳng ứng dụng vào mô hình tổng thể; đa thuê bao hay đa thể hiện áp dụng *theo từng tầng*, không phải nhãn cho cả hệ thống.
3. **Ngăn xếp.** Bổ sung bốn mảng mà ngăn xếp 2014 thiếu: nhận diện thuê bao và định danh, dịch vụ dữ liệu ngoài CSDL, mặt phẳng điều khiển và vận hành, trình diễn và cấu hình.
4. **Đánh đổi.** Vị trí dữ liệu chỉ quyết định lớp bảo vệ cuối cùng (một trong năm chốt chặn); không mua được cô lập hiệu năng hay PITR theo thuê bao trên một máy chủ PostgreSQL; chỉ tùy biến *dữ liệu* mới phụ thuộc kiến trúc.
5. **Lựa chọn: S3 ⟨AI,DB⟩.** Kiến trúc ít hối tiếc nhất ở quy mô thiết kế (0,03 so với 0,18 và 0,53), thắng ổn định khi trọng số thay đổi. **Bảng 6.3 không ủng hộ mô hình lai (Bridge) như lựa chọn chính**: cận trên lợi ích chỉ 0,00 đến 0,01 điểm. Bridge chỉ còn vai trò biến thể có điều kiện.
6. **Sửa sai ghi chú trước.** Bảng 6.3 có n = 16 (10 là nhóm thẩm định danh sách); hai con số ủng hộ K2 hơn K1 (Throughput, Number of End-Users) sai; "Bridge" là mô hình lai theo AWS; PITR chỉ ở mức cluster; luận án năm 2014 chứ không phải 2015 (chi tiết ở 07).

## Việc nhóm cần xác nhận

| # | Điều cần chốt | Vì sao | Nằm ở |
|---|---|---|---|
| 1 | Quy mô **thiết kế**: nhiều thuê bao nhỏ (vài chục đến vài trăm) | Quyết định S3 hay S2; ở quy mô thực nghiệm công cụ ưu tiên S2 | 05, mục 1 |
| 2 | Chọn S3 làm kiến trúc đề xuất, S2 và S4 làm đối chứng và biến thể | Đây là lựa chọn của đề tài; có thể đổi nếu nhóm giữ Bridge làm kiến trúc chính, nhưng khi đó cần biện minh ngoài Bảng 6.3 | 05, mục 5 |
| 3 | Trọng số của ba lớp thuê bao | Là giả định của nhóm; kết quả đã kiểm độ nhạy nhưng nhóm nên rà lại | 05, mục 3 |
| 4 | Ngưỡng quyết định đặt trước (cấp phát, migration, khôi phục, chi phí ba placement) | Phải ghi trước khi thu số liệu chính thức | 05, mục 5; 06, mục 5 |
| 5 | Cách dùng vai trò CSDL ở S3: kết nối bằng vai trò thuê bao hay đăng nhập chung rồi chuyển vai trò | Ảnh hưởng cả bảo mật lẫn phân mảnh nhóm kết nối | 08, mục 3 |
| 6 | Phụ lục A (ba placement, ba mức tùy biến, Bridge) chưa được phê duyệt; cổng "phê duyệt và tự động hóa chỉ cho Silo" không có lý do kỹ thuật | Hội đồng đối chiếu với thuyết minh gốc | 03, mục 5; 05, mục 6 |
| 7 | Silo hiện là S2 (cùng máy chủ) hay S1 (máy chủ riêng) | Hai kịch bản khác nhau trong K14 | 07, C9 |

## Ánh xạ sang cấu trúc báo cáo

Đề cương trong PDF có sáu chương; khung LaTeX trong `report/chapters/` hiện có bốn chương. Gợi ý ghép:

| Chương (đề cương PDF) | Khung LaTeX | Lấy từ |
|---|---|---|
| 2. Cơ sở lý thuyết | `01-foundations` | 01, 02, 03; các thách thức: định danh (02), cô lập và hàng xóm ồn ào (04), bán kính ảnh hưởng và cập nhật (08), khôi phục (04, mục 3.3) |
| 3. Phân tích thiết kế kiến trúc | `03-system` | 04, 05, hai hình kịch bản và kiến trúc được chọn |
| 4. Kỹ thuật xây dựng | `03-system` | Năm chốt chặn trong `fig-selected-architecture`; 08, mục 3 |
| 5. Thực nghiệm | `02-data-methods` và `04-evaluation` | 06 (phương pháp), kết quả sau khi chạy |

Phần "đo mức tiêu thụ" và "định giá" của đề cương đã có ghi chú riêng trong PDF; tài liệu ở đây không nghiên cứu lại hai mục đó.

## Chưa làm

- Chưa đọc toàn văn Chong và Carraro (2006), Weissman và Bobrowski (2009), Narasayya và Chaudhuri (2022).
- Chưa tìm tình hình thực tế Base.vn mà đề cương Chương 1 yêu cầu.
- Chưa kiểm mã ứng dụng (repo này chỉ chứa tài liệu); mô tả ứng dụng lấy từ PDF của nhóm.
- Chưa chạy bất kỳ thực nghiệm nào. Mọi nhãn [GT] ở tài liệu 04 vẫn là giả thuyết.

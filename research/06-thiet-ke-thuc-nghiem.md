# 06. Thiết kế thực nghiệm

Mục đích: kiểm chứng các giả thuyết [GT] ở tài liệu 04 và các điều kiện lật ở tài liệu 05, bằng phép đo có thể lặp lại. Thực nghiệm chạy trên máy local trước (diễn tập giao thức, số liệu chỉ để chỉnh phương pháp), rồi trên VPS (số liệu chính thức), sau khi hệ thống ở local đã đủ các hạng mục ở mục 6.

## 1. Nguyên tắc

1. **Một yếu tố mỗi lần.** Chỉ vị trí dữ liệu thay đổi giữa các lần chạy; cùng bản dựng ứng dụng, cùng phiên bản và cấu hình PostgreSQL, cùng dữ liệu mồi, cùng kịch bản tải, cùng chính sách hạn mức.
2. **Lặp lại và xen kẽ.** Mỗi điều kiện chạy ít nhất 5 lần; thứ tự giữa các placement được ngẫu nhiên hóa theo khối để trôi dạt của VPS không thiên về một placement.
3. **Quyết định đặt trước.** Ngưỡng ở mục 5 được ghi lại trước khi thu số liệu chính thức.
4. **Kiểm chứng cả công cụ đo.** Bộ test cô lập phải bắt được lỗi khi cố ý gây lỗi (đối chứng âm tính); nếu không thì "0 vụ rò rỉ" không có giá trị.
5. **Tách số liệu diễn tập khỏi số liệu chính thức.** Đúng với tinh thần của ghi chú đo lường trong PDF: chỉ những lần chạy hợp lệ theo giao thức mới đi vào kết luận; số liệu diễn tập local không được gắn nhãn kết quả thực nghiệm.
6. **Lưu mọi thứ.** Bản kê (manifest) gồm commit, cấu hình, phiên bản, phần cứng; số liệu thô; mã băm; nhật ký. Báo cáo cả các lần chạy lỗi.

## 2. Biến và môi trường

| Loại | Nội dung |
|---|---|
| Biến độc lập | Vị trí dữ liệu: S2 (`SILO_DATABASE`), S3 (`SCHEMA_PER_TENANT`), S4 (`POOL`). Biến tùy chọn S1: mỗi thuê bao một container PostgreSQL riêng có giới hạn CPU và bộ nhớ, dùng làm đối chứng cho cô lập hiệu năng |
| Cố định | Bản dựng ứng dụng, PostgreSQL (phiên bản, `shared_buffers`, `max_connections`, `work_mem`), kích thước nhóm kết nối, dữ liệu mồi, giới hạn tài nguyên container, chính sách hạn mức |
| Quy mô theo thuyết minh | 3–5 thuê bao, mỗi thuê bao 10–20 người dùng đồng thời, một VPS giới hạn |
| Máy sinh tải | Máy riêng; nếu không thì gắn CPU cố định để không tranh tài nguyên với ứng dụng |
| Hai giai đoạn | Local (diễn tập) → VPS (chính thức) |

## 3. Các thí nghiệm

### E1. Ma trận truy cập chéo (H1)

Cho mỗi placement. Vectơ tấn công, mỗi vectơ có nhiều ca:
- Host ≠ token, token hết hạn, thuê bao bị tạm ngưng.
- Đổi ID ở đường dẫn, tham số truy vấn, thân yêu cầu (IDOR), kể cả `tenantId` do máy khách gửi.
- Truy cập trực tiếp CSDL bằng vai trò hoặc thông tin đăng nhập của thuê bao A vào dữ liệu của B (S3: `SELECT` trên lược đồ của B; S2: kết nối CSDL của B; S4: truy vấn thiếu hoặc sai ngữ cảnh).
- SQL injection hoặc lạm dụng tài khoản đăng nhập của ứng dụng: thực thi `SET ROLE` hoặc `SET app.tenant_id` để chuyển sang thuê bao khác (kiểm cách dùng vai trò ở tài liệu 08, mục 3).
- Khóa đối tượng của B với phiên hoặc URL ký của A.
- Tác vụ nền: thiếu định danh thuê bao, định danh sai, thông báo gửi chéo.
- Quản trị hệ thống đọc nội dung thuê bao (tính chất P3).
- Phân quyền trong thuê bao: người được mời chỉ truy cập bảng thuộc phạm vi của mình; chủ thuê bao xóa được bảng còn thành viên thì không (thuyết minh 13.1).

**Đối chứng âm tính:** lần lượt tắt từng chốt chặn (bỏ kiểm tra host–token, cấp thừa đặc quyền cho vai trò, tắt RLS, bỏ định danh thuê bao khỏi tác vụ) và xác nhận ít nhất một test báo lỗi. **Tiêu chí:** ở cấu hình đúng, 0 truy cập trái phép thành công; ở mỗi cấu hình hỏng, ít nhất một test phát hiện.

### E2. Hàng xóm ồn ào (H2)

Hai thuê bao "nạn nhân" chạy tải ổn định (ví dụ 10 người dùng ảo mỗi thuê bao) trong khi một thuê bao "ồn ào" tăng cường độ theo bậc 0×, 1×, 2×, 4× với bốn loại tải: truy vấn nặng, ghi hàng loạt, tải tệp lớn, bùng nổ tự động hóa. Chạy ở hai chế độ: có và không có biện pháp kiểm soát ở ứng dụng (hạn mức tốc độ, vách ngăn đồng thời, giới hạn thời gian truy vấn). Số đo: p50, p95, p99 và tỉ lệ lỗi của nạn nhân; **tỉ số can thiệp IR = p95 của nạn nhân khi có tải ồn ào / p95 khi không có**. So sánh IR giữa S2, S3, S4 và với S1.
**Tiêu chí trước:** nếu IR của S2 không nhỏ hơn IR của S3 và S4 một cách có ý nghĩa (khoảng tin cậy 95% của tỉ số IR giữa hai placement chứa 1), giả thuyết "đổi placement không đổi cô lập hiệu năng trên cùng máy chủ" được giữ.

### E3. Cấp phát thuê bao mới (H3)

Thời gian từ yêu cầu đăng ký đến trạng thái ACTIVE khỏe mạnh, mỗi placement 30 lần, kèm phân rã theo bước: tạo lược đồ hoặc CSDL, tạo vai trò, migration, dữ liệu mồi, kiểm tra sức khỏe, kích hoạt định tuyến. Chèn lỗi tại từng bước (dừng tiến trình, migration thất bại): xác nhận thử lại hoặc hoàn tác không để lại tài nguyên mồ côi và không ảnh hưởng thuê bao khác. Đây là chỉ tiêu "tốc độ triển khai cho khách hàng mới" của thuyết minh và là bài toán vận hành thầy nêu.

### E4. Cập nhật lược đồ (H4)

Áp dụng một migration (thêm cột và chỉ mục; thêm một thay đổi theo mẫu mở rộng rồi thu hẹp) cho N thuê bao tổng hợp với N ∈ {5, 20, 50, 200}. Số đo: tổng thời gian, thời gian từng thuê bao (p95), số thất bại khi chèn lỗi ở thuê bao thứ k, độ đúng của việc theo dõi phiên bản lược đồ theo thuê bao. S4 là mốc một lần.

### E5. Sao lưu, khôi phục, xóa một thuê bao (H5)

Dữ liệu mỗi thuê bao 10 MB, 100 MB, 1 GB. Đo: thời gian xuất, thời gian khôi phục vào môi trường sạch, kiểm chứng bằng số dòng và mã băm, thời gian xóa, và độ trễ của thuê bao khác trong lúc thao tác diễn ra. Không đo PITR vì PostgreSQL chỉ hỗ trợ ở mức cluster; ghi rõ giới hạn này trong báo cáo.

### E6. Tải và năng lực (H6)

Cùng một hỗn hợp tải (đọc nhiều: mở bảng Kanban, tạo và di chuyển thẻ, bình luận, tải tệp) cho 3–5 thuê bao với 10–20 người dùng ảo mỗi thuê bao; tăng tải theo bậc để tìm điểm gãy; chạy chính thức 10 phút sau 2 phút làm nóng, lặp 5 lần. Số đo: p50, p95, p99, thông lượng, tỉ lệ lỗi, CPU và RAM của từng container, số kết nối PostgreSQL, mức bão hòa của nhóm kết nối, tỉ lệ trúng bộ nhớ đệm.

### E7. Chi phí kỹ thuật của mô hình lai (H7)

Số đường mã phụ thuộc placement (lớp, nhánh rẽ), kích thước ma trận kiểm thử, thời gian chạy bộ test, độ trễ cộng thêm của bộ định tuyến nguồn dữ liệu. So với ngưỡng đặt trước ở tài liệu 05.

### MB-scale. Trần quy mô (bổ sung, ngoài phạm vi 3–5 thuê bao của thuyết minh)

Chỉ ở tầng CSDL, không người dùng: tạo N = 50, 200, 1000 lược đồ (mỗi lược đồ khoảng 20 bảng và chỉ mục) và N = 50, 200 CSDL. Đo: thời gian tạo, thời gian migration toàn bộ, kích thước và số đối tượng của danh mục hệ thống, thời gian lập kế hoạch cho một truy vấn đơn giản, thời gian sao lưu một thuê bao và các giới hạn khóa phát sinh khi sao lưu nhiều bảng, số kết nối và nhóm kết nối cần thiết cho S2. Đây là phần trả lời cho hiệu chỉnh C10 (trần quy mô của S3); cần ghi rõ là phần mở rộng.

### E8. Chi phí đo lường (tùy chọn)

Chỉ khi đã cài bộ đo mức tiêu thụ: so sánh khi tắt và bật (ý tưởng ở mục 17 của ghi chú đo lường trong PDF).

## 4. Giao thức và thống kê

- **Môi trường:** ghi cấu hình VPS (CPU, RAM, đĩa, nhân và phiên bản hệ điều hành), giới hạn cgroup, đồng bộ đồng hồ; khôi phục trạng thái CSDL sạch giữa các lần chạy; làm nóng trước khi đo.
- **Dữ liệu:** hạt giống cố định cho dữ liệu mồi và kịch bản tải; thư mục `experiments/<mã>/<lần chạy>/` chứa manifest, số liệu thô của bộ sinh tải, số liệu Prometheus, ảnh chụp `pg_stat_*`, nhật ký, mã băm.
- **Thống kê:** báo cáo trung vị, khoảng tứ phân vị và khoảng tin cậy bootstrap 95% của trung vị; so sánh giữa placement bằng tỉ số kèm khoảng tin cậy; không chọn số liệu sau khi thấy kết quả; báo cáo cả lần chạy hỏng.
- **Mối đe dọa tính hợp lệ:** nhiễu của VPS dùng chung (giảm bằng lặp và xen kẽ); tải tổng hợp khác hành vi thật; 3–5 thuê bao không phản ánh quy mô lớn (bù bằng MB-scale ở tầng CSDL); một nút PostgreSQL; kết quả gắn với ứng dụng này; bộ test cô lập có thể không nhạy (bù bằng đối chứng âm tính).

## 5. Quyết định đặt trước

Ánh xạ từ các điều kiện lật ở tài liệu 05. Ngưỡng là đề xuất, cần nhóm xác nhận trước khi thu số liệu chính thức.

| Điều kiện | Ngưỡng đề xuất | Quyết định nếu vi phạm | Đo ở |
|---|---|---|---|
| Cấp phát S3 ở N = 200 | p95 ≤ 30 giây | Dùng S4 cho nhóm thuê bao nhỏ | E3, MB-scale |
| Migration toàn bộ S3 ở N = 200 | ≤ 15 phút | Như trên, hoặc hạ trần số thuê bao cho S3 | E4, MB-scale |
| Lỗi cô lập ở S3 bộ test không bắt được | 0 | Chuyển sang S2 hoặc bổ sung kiểm tra tự động trước khi tuyên bố an toàn | E1 |
| IR của S3 | không tệ hơn S4 và S2 quá 1,5 lần (hoặc theo khoảng tin cậy ở E2) | Không có thay đổi chọn placement vì cô lập hiệu năng; tăng mức kiểm soát ở ứng dụng | E2 |
| Khôi phục một thuê bao ở S3 (1 GB) | ≤ 10 phút và dữ liệu khớp | Nếu vượt, nêu rõ như giới hạn; thuê bao cần RTO thấp hơn dùng S2 | E5 |
| Chi phí hỗ trợ ba placement | ma trận test ≤ 2× so với một placement | Giữ một placement chính thức | E7 |

## 6. Hạng mục cần có ở local trước khi lên VPS

Rút ra từ các khoảng trống ghi trong PDF của nhóm và từ các thí nghiệm trên.

| # | Hạng mục | Phục vụ | Ghi chú |
|---|---|---|---|
| 1 | Bộ test truy cập chéo tự động cho cả ba placement, có công tắc "đột biến" tắt từng chốt chặn | E1 | PDF đã nêu ma trận test chéo là việc ưu tiên |
| 2 | Ghi thời gian từng bước cấp phát và điểm chèn lỗi | E3 | Provisioning đã có retry và rollback |
| 3 | Trình chạy migration hàng loạt cho N thuê bao có theo dõi phiên bản lược đồ trong `control_db` | E4 | Azure khuyến nghị theo dõi phiên bản theo thuê bao |
| 4 | Kịch bản xuất, khôi phục, xóa một thuê bao cho từng placement, kèm kiểm tra số dòng và mã băm | E5 | |
| 5 | Bộ sinh dữ liệu mồi có hạt giống và kịch bản k6 gồm cả tải "ồn ào" | E2, E6 | |
| 6 | Số liệu: endpoint cho worker, số liệu nhóm kết nối, thu thập `pg_stat_*`; nhãn thuê bao giới hạn ở môi trường nghiên cứu | E2, E6 | PDF: worker chưa có endpoint số liệu; nhãn `tenant_id` làm tăng số chuỗi |
| 7 | Hạn mức tốc độ, vách ngăn đồng thời, giới hạn thời gian truy vấn bật tắt được | E2 | PDF: hạn mức đang nằm trong bộ nhớ của một tiến trình API, chỉ đúng khi chạy một thể hiện |
| 8 | Cấu hình thí nghiệm ghim placement cho từng thuê bao và hạt giống | tất cả | |
| 9 | Công cụ xuất manifest và số liệu thô | tất cả | PDF nêu bộ công cụ nghiên cứu đã có |
| 10 | Chạy được S1 bằng container PostgreSQL riêng (nếu muốn đối chứng) | E2 | Tùy chọn; cần xác nhận bộ cấp phát hỗ trợ trỏ tới máy chủ khác |
| 11 | Bộ đo mức tiêu thụ tối thiểu | E8 | Chỉ khi chọn làm E8 |

**Không cần làm hết để chạy thực nghiệm:** offboarding hoàn chỉnh ngoài phép thử xóa ở E5, MFA, nhiều stamp, nhiều vùng, tự động chọn placement theo năng lực, chuyển thuê bao giữa placement. Những mục này vào phần hạn chế và hướng phát triển.

## 7. Thứ tự và ánh xạ sang thuyết minh

Thứ tự đề nghị: hoàn thiện mục 6 ở local → diễn tập E1, E3, E6 ở local → E1 chính thức trên VPS (vì là điều kiện tiên quyết của mọi kết luận khác) → E3 → E6 → E2 → E4 và E5 → MB-scale → E7.

| Chỉ tiêu đánh giá trong thuyết minh (mục 14.2) | Thí nghiệm |
|---|---|
| Tốc độ triển khai cho khách hàng mới | E3 |
| Độ tin cậy của cô lập dữ liệu | E1 (kèm đối chứng âm tính) |
| Phân quyền | E1 (phần phân quyền trong thuê bao) |
| Khả năng chịu tải và mở rộng khi số người dùng tăng | E6, E2, MB-scale |
| Ba bài toán thầy nêu: hiệu năng, an toàn dữ liệu, vận hành | E2 + E6; E1; E3 + E4 + E5 |

# Nguyên tắc thiết kế hình ảnh cho báo cáo nghiên cứu

Tài liệu này thống nhất cách thiết kế và rà soát hình ảnh từ Chương 1 đến Chương 5. Mục tiêu là giúp các hình có cùng ngôn ngữ thị giác, đọc được khi in trên A4, và hỗ trợ trực tiếp cho lập luận của báo cáo.

## 1. Nguyên tắc chung

- Mỗi hình chỉ trả lời một câu hỏi.
- Không đặt tiêu đề dài bên trong hình. Dùng caption dưới hình theo dạng `Hình X.Y. ...`.
- Trong hình chỉ giữ tiêu đề panel ngắn, ví dụ `(a) Định danh` và `(b) Cô lập dữ liệu`.
- Ưu tiên nền trắng, khoảng thở rộng, không dùng gradient hoặc bóng đổ.
- Không dùng quá ba màu ngữ nghĩa chính trong một hình. Có thể dùng thêm một màu nhấn duy nhất cho lỗi, cảnh báo hoặc sự kiện khi thật sự cần.
- Gắn trực tiếp số liệu quan trọng trên cột, đường hoặc box; tránh legend dài.
- Một hình phải đọc được khi thu về chiều rộng khoảng 15 đến 16 cm trên trang A4.

## 2. Hệ màu thống nhất

Sáu màu dưới đây là palette dùng cho toàn bộ báo cáo, không phải yêu cầu dùng đồng thời trong một hình. Một hình chỉ chọn các màu có ý nghĩa trực tiếp với thông điệp của nó.

| Ý nghĩa | Màu |
| --- | --- |
| Cấu trúc chung, tiêu đề, đường kết nối | Navy `#1F2937` |
| Luồng hợp lệ, cơ chế đề xuất, đạt yêu cầu | Teal `#00856A` |
| Thành phần hoặc baseline trung tính | Slate `#64748B` |
| Middleware, cache, cảnh báo hoặc điều tiết | Cam `#D97706` |
| Sự kiện, đồng bộ, tùy biến | Tím `#7E22CE` |
| Lỗi, tấn công, rủi ro | Đỏ `#C2413B` |

Không dùng đỏ và xanh lá làm cách phân biệt duy nhất. Mọi biểu đồ phải có nhãn trực tiếp như `Baseline`, `Đề xuất`, `Bị chặn` hoặc `Đạt`.

### 2.1. Màu tenant

Màu tenant tách biệt khỏi màu trạng thái và tầng kỹ thuật.

- Khi so sánh giao diện của hai tenant, dùng cố định `Acme = xanh dương đậm` và `Lotus = cam đất`; trong cùng hình không dùng thêm màu trạng thái.
- Khi sơ đồ cần thể hiện cả tenant lẫn trạng thái hệ thống, nhận diện tenant bằng nhãn, biểu tượng hoặc viền nét đứt; không thêm màu tenant mới.
- Không dùng màu tenant để biểu thị đạt, lỗi, baseline hoặc đề xuất.

## 3. Chữ, đường nét và bố cục

- Dùng cùng font với báo cáo. Cỡ chữ tối thiểu là 8.5 đến 9 pt sau khi đặt vào Word.
- Tiêu đề panel dùng chữ đậm; nội dung dùng chữ regular. Không dùng toàn chữ in hoa trừ nhãn ngắn.
- Viền box dày 1 đến 1.5 pt; đường mũi tên dày 1.25 đến 1.5 pt.
- Box dùng nền màu nhạt 5 đến 10 phần trăm; chỉ header hoặc nhãn mới dùng màu đậm.
- Pattern gạch hoặc chấm chỉ dùng khi cần in trắng đen và phải dùng nhẹ, không phủ dày toàn bộ cột.
- Không để quá 5 đến 7 box chính trong một sơ đồ. Sơ đồ lớn phải chia thành các panel.

### 3.1. Thuật ngữ trên hình

- Ưu tiên tiếng Việt dễ hiểu, rồi mới đặt từ khóa kỹ thuật trong ngoặc khi cần.
- Ví dụ: `Biến phiên giao dịch (SET LOCAL)`, `Người dùng ảo đồng thời (80 VU)`, `Tệp mô tả lần chạy (run manifest)`.
- Chỉ dùng viết tắt như RLS, JWT, API, UI hoặc VU sau khi chúng đã được giải thích ở caption, chú giải hoặc lần xuất hiện đầu tiên trong chương.

### 3.2. Mẫu bố cục chuẩn

Để các thành viên vẽ nhất quán, chọn một trong ba mẫu sau thay vì tự tạo bố cục mới:

- **Mẫu luồng:** tối đa 6 box, đọc từ trái sang phải hoặc từ trên xuống dưới; box bắt đầu và kết quả dùng navy, bước xử lý dùng nền nhạt.
- **Mẫu đối chiếu:** hai cấu hình cùng trục, `Baseline` luôn slate và `Đề xuất` luôn teal; có nhãn số ở cuối cột hoặc đường.
- **Mẫu UI đối chứng:** hai ảnh giao diện cùng kích thước, một hàng callout ngắn dưới mỗi ảnh; `Acme` và `Lotus` chỉ dùng màu tenant quy định tại Mục 2.1.

## 4. Quy ước theo chương

### 4.1. Chương 1 — Khái niệm và vấn đề

- Dùng sơ đồ khái niệm, taxonomy, timeline hoặc chuỗi `vấn đề → hệ quả`.
- Hạn chế số liệu; ưu tiên quan hệ, phân cấp và mũi tên.
- Dùng navy và slate làm màu chủ đạo; đỏ hoặc cam chỉ để nhấn thách thức.

### 4.2. Chương 2 — So sánh và lựa chọn kiến trúc

- Dùng cùng một template cho Silo, Pool, Bridge và Hybrid.
- Thành phần dùng chung là khung nét liền; thành phần tách riêng là khung nét đứt.
- Một tenant giữ cùng màu nhận diện xuyên suốt các sơ đồ so sánh.
- Sơ đồ quyết định phải kết thúc bằng node rõ ràng: `Lựa chọn: Pool cấp độ 3`.
- Không lặp lại sơ đồ so sánh các phương án ở Chương 3.

### 4.3. Chương 3 — Cơ chế kỹ thuật K1 đến K4

- Mỗi khía cạnh có một sơ đồ kỹ thuật chính:
  - K1: pipeline định danh và ngữ cảnh.
  - K2: transaction, `SET LOCAL` và RLS.
  - K3: rate limit và cache có namespace tenant.
  - K4: metadata và cấu hình động lúc chạy.
- Dùng sequence diagram, boundary diagram hoặc layered architecture; không dùng screenshot giao diện.
- Tập trung vào nguyên lý và bất biến cần bảo đảm; không nhồi tên class quá chi tiết.
- Chỉ có bốn sơ đồ chính tương ứng K1 đến K4. Nếu cần nhắc Silo hoặc Bridge để đối chiếu, chỉ dùng tối đa một hình nhỏ và dẫn chiếu lại Chương 2.

### 4.4. Chương 4 — Ứng dụng Kanban

- Ưu tiên use case, luồng nghiệp vụ, ERD rút gọn và ảnh giao diện.
- Ảnh UI phải có callout chỉ đúng yếu tố cần chứng minh: branding tenant, WIP, field động hoặc role.
- Dùng cố định hai tenant mẫu để tạo câu chuyện nhất quán.
- Có một hình hoặc bảng ánh xạ gọn: nghiệp vụ Kanban → K1 đến K4 → module hiện thực → kiểm thử.
- Chi tiết code chỉ dùng trong sơ đồ thành phần hoặc caption; không lặp lại lý thuyết Chương 3.

### 4.5. Chương 5 — Thực nghiệm

- Mỗi hình trả lời một giả thuyết hoặc nhóm câu hỏi đo kiểm.
- Baseline luôn dùng slate; cấu hình đề xuất luôn dùng teal.
- Đỏ dành cho nguy cơ, lỗi hoặc tấn công; cam dành cho rate limit/cảnh báo; tím dành cho Pub/Sub.
- Không đặt ba biểu đồ ngang trên một trang A4 nếu trục và nhãn dài; xếp dọc hoặc tách hình.
- Mỗi caption phải ghi workload, đơn vị, số lần lặp và nguồn run/manifest.
- Kết quả như `0 leak`, `100% block`, p50/p95 hoặc RPS phải có nhãn trực tiếp; không cần lặp lại nguyên bảng số liệu.

## 5. Caption chuẩn

### 5.1. Hình lý thuyết, kiến trúc và ứng dụng ở Chương 1 đến Chương 4

Dùng cấu trúc:

> Hình X.Y. [Đối tượng thể hiện] theo [tiêu chí hoặc góc nhìn].

Nếu hình kế thừa hoặc tổng hợp từ tài liệu khác, thêm nguồn dưới caption:

> Nguồn: tổng hợp từ [Tác giả, năm].

Hình do nhóm tự thiết kế từ lập luận của báo cáo không cần dòng nguồn thực nghiệm.

### 5.2. Hình thực nghiệm ở Chương 5

Dùng cấu trúc:

> Hình X.Y. [Đối tượng được thể hiện]. [Điều kiện hoặc workload chính]. Nguồn: kết quả thực nghiệm của nhóm, [mã run hoặc ngày].

Ví dụ:

> Hình 5.4. Độ trễ p50 và p95 của các tenant trong kịch bản noisy-neighbor, trước và sau khi bật cache hai tầng và rate limit. Workload: 80 VU, 5 tenant, 5 lần lặp.

## 6. Checklist trước khi chèn hình

- Có thể hiểu ý chính của hình trong năm giây không?
- Có đọc được khi in A4 không?
- Màu có ý nghĩa nhất quán với các hình trước không?
- Tên component, cache key và biến phiên giao dịch có khớp với code không?
- Hình thực nghiệm có số liệu, đơn vị và workload không?
- Caption có tự giải thích hình mà không cần đoạn văn dài không?
- Hình có lặp ý với hình khác không?

## 7. Mạch thị giác của báo cáo

Toàn bộ hình trong báo cáo phải củng cố cùng một mạch lập luận:

`Chương 1 đặt vấn đề → Chương 2 chọn Pool → Chương 3 giải thích K1 đến K4 → Chương 4 hiện thực bằng Kanban → Chương 5 kiểm chứng thực nghiệm.`

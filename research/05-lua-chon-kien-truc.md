# 05. Lựa chọn kiến trúc cho ứng dụng

Hình: `report/assets/diagrams/fig-selected-architecture.{en,vi}.pdf`. Số liệu: `research/analysis/mta_matrix.py` (chạy lại được, kết quả ở `mta_matrix_results.md`).

"Pick" ở đây nghĩa là chọn **một kiến trúc** để thực thi trên ứng dụng của đề tài. Kết luận ngắn: **chọn S3 ⟨AI,DB⟩** (một thể hiện ứng dụng dùng chung, một CSDL, mỗi thuê bao một lược đồ riêng) làm kiến trúc đề xuất. S2 và S4 là hai kịch bản đối chứng được đo, đồng thời là các biến thể có điều kiện (Bridge) chỉ kích hoạt khi một trong các điều kiện lật ở mục 5 xảy ra. Bảng 6.3 **không** ủng hộ mô hình lai như lựa chọn chính.

## 1. Phạm vi và một giả định cần nhóm xác nhận

Ràng buộc từ thuyết minh: một hệ thống phần mềm duy nhất phục vụ nhiều thuê bao; PostgreSQL; so sánh các mô hình CSDL chung–lược đồ chung, chung–lược đồ riêng (mục 13.2) và, ở phụ lục chưa duyệt, CSDL riêng; thực nghiệm 3–5 thuê bao, mỗi thuê bao 10–20 người dùng đồng thời, trên một VPS giới hạn.

**Giả định cần xác nhận (chi phối kết quả):** quy mô **thiết kế** của dịch vụ là nhiều thuê bao nhỏ (từ vài chục đến vài trăm lớp học, nhóm, phòng thí nghiệm; mỗi thuê bao khoảng 5–50 người dùng). Thuyết minh mục 11 chỉ nói dịch vụ dùng chung cho "nhiều lớp học, nhóm nghiên cứu hoặc dự án", không nêu con số. Quy mô **thực nghiệm** (3–5 thuê bao) chỉ dùng để kiểm chứng cơ chế, không phải quy mô mà kiến trúc nhắm tới. Nếu nhóm chốt quy mô thiết kế nhỏ hơn nhiều (chỉ vài thuê bao), kết quả ở mục 4.2 đổi theo.

## 2. Phương pháp: hai giai đoạn

**Giai đoạn 1, lọc theo ràng buộc cứng.** Loại kịch bản không thể là ứng viên:

| Kịch bản | Kết quả | Lý do |
|---|---|---|
| S0 ⟨AD,DD⟩ | Loại, chỉ tham chiếu | Mỗi thuê bao một bộ ứng dụng: trái yêu cầu "một hệ thống phần mềm duy nhất" của thuyết minh |
| S1 ⟨AI,DD⟩ | Loại, chỉ tham chiếu (có thể chạy thử bằng container) | Cần một máy chủ CSDL cho mỗi thuê bao trên một VPS giới hạn; K14 xếp khả thi thấp nhất |
| S2, S3, S4 | Giữ lại | Đúng các mô hình dữ liệu mà thuyết minh yêu cầu nghiên cứu, S2 thêm ở phụ lục |

Một số yêu cầu *không thể* biểu diễn bằng trọng số mà là điều kiện bắt buộc theo từng thuê bao. Azure nêu rõ: khi thuê bao cần khóa mã hóa riêng, chính sách sao lưu và khôi phục riêng, hoặc vị trí địa lý riêng thì có thể phải cô lập chúng hoặc nhóm với thuê bao cùng chính sách. Các yêu cầu này không đi vào điểm số; chúng là **điều kiện kích hoạt biến thể** ở mục 5.

**Giai đoạn 2, xếp hạng bằng phương pháp MAAM của K14 (mục 6.3).** Lấy điểm từng tiêu chí của Bảng 6.3 nhân trọng số rồi cộng. Vì Bảng 6.3 là ý kiến chuyên gia và trọng số là giả định, kết quả luôn đi kèm kiểm tra độ nhạy:
- Mô phỏng Monte Carlo: mỗi trọng số nhân với số ngẫu nhiên đều trong [0,5; 1,5], 20.000 lần; đếm tỉ lệ thắng của từng kiến trúc.
- Hối tiếc tối đa (min-regret): nếu dùng một kiến trúc cho cả ba lớp thuê bao thì thiệt hại lớn nhất so với lựa chọn tốt nhất của một lớp là bao nhiêu.
- Điểm lật theo quy mô: trọng số các tiêu chí phụ thuộc quy mô phải thay đổi bao nhiêu thì người thắng đổi.

## 3. Hồ sơ trọng số (giả định của nhóm)

Ba lớp thuê bao theo gói trong Phụ lục A; thang trọng số 0 đến 3. Lý do:
- **Starter** (nhóm học tập, lớp học phần): nhiều, nhỏ, chi phí thấp, tùy biến ít, dữ liệu ít nhạy cảm hơn. Ưu tiên mật độ, vận hành đơn giản, cấp phát nhanh.
- **Professional** (bộ môn, phòng thí nghiệm): ít hơn, cần trường dữ liệu riêng, dữ liệu có giá trị hơn, muốn tự xuất và khôi phục dữ liệu của mình.
- **Enterprise** (đơn vị nhạy cảm hoặc có yêu cầu tuân thủ): ít, ưu tiên bí mật, toàn vẹn, khôi phục độc lập, hiệu năng ổn định, di chuyển được.
- **Uniform**: mọi trọng số bằng 1, làm mốc trung tính.

| Tiêu chí | Starter | Professional | Enterprise | Phụ thuộc quy mô |
|---|---|---|---|---|
| Time Behavior | 2 | 2 | 3 | |
| Resource Utilization | 3 | 2 | 1 | có |
| Throughput | 2 | 2 | 2 | |
| Number of Tenants | 3 | 2 | 1 | có |
| Number of End-Users | 2 | 2 | 2 | có |
| Availability | 2 | 2 | 3 | |
| Recoverability | 1 | 2 | 3 | |
| Confidentiality | 2 | 3 | 3 | |
| Integrity | 2 | 3 | 3 | |
| Authenticity | 2 | 2 | 3 | |
| Maintainability | 3 | 2 | 1 | có |
| Portability | 1 | 2 | 3 | |
| Deployment Time | 3 | 2 | 1 | có |
| Variability | 1 | 3 | 3 | |
| Diverse SLA | 1 | 2 | 3 | |
| Software Complexity | 3 | 2 | 1 | |
| Monitoring | 3 | 2 | 1 | có |

Cột cuối đánh dấu sáu tiêu chí phản ánh công sức vận hành và mật độ tài nguyên: chúng chỉ trở nên phân biệt khi số thuê bao đủ lớn. Hệ số quy mô *f* nhân vào trọng số của sáu tiêu chí này: *f* = 1 cho quy mô thiết kế, *f* = 0,25 cho quy mô thực nghiệm 3–5 thuê bao. **Đây là cấu trúc phân tích của nhóm, không phải của K14.**

## 4. Kết quả

### 4.1 Điểm trung bình không trọng số (17 tiêu chí)

S1 3,32 · S2 3,32 · **S3 3,41** · S4 3,18 · tham chiếu ⟨AD,DD⟩ 3,62. Khớp với "≈ 3,4 / 3,3 / 3,2" trong ghi chú của nhóm, và S3 cao nhất vì không có điểm rất thấp.

### 4.2 Quy mô thiết kế (*f* = 1), chỉ S2–S4

| Hồ sơ | S2 | S3 | S4 | Thắng | Tỉ lệ thắng trong 20.000 lần |
|---|---|---|---|---|---|
| Starter | 3,36 | 3,54 | 3,53 | S3 | S3 59%, S4 41% |
| Professional | 3,30 | 3,35 | 3,07 | S3 | S3 89%, S2 11% |
| Enterprise | 3,27 | 3,24 | 2,74 | S2 | S2 73%, S3 27% |
| Uniform | 3,32 | 3,41 | 3,18 | S3 | S3 98%, S2 2% |

Hối tiếc tối đa nếu dùng một kiến trúc cho cả ba lớp: **S3 0,03** (ở lớp Enterprise), S2 0,18 (ở lớp Starter), S4 0,53 (ở lớp Enterprise).

### 4.3 Quy mô thực nghiệm 3–5 thuê bao (*f* = 0,25)

| Hồ sơ | S2 | S3 | S4 | Thắng | Tỉ lệ thắng |
|---|---|---|---|---|---|
| Starter | 3,28 | 3,24 | 2,80 | S2 | S2 85%, S3 15% |
| Professional | 3,23 | 3,12 | 2,50 | S2 | S2 100% |
| Enterprise | 3,23 | 3,11 | 2,41 | S2 | S2 100% |
| Uniform | 3,26 | 3,17 | 2,58 | S2 | S2 99% |

Hối tiếc tối đa: **S2 0,00**, S3 0,13, S4 0,83.

### 4.4 Điểm lật

S3 vượt S2 khi hệ số quy mô *f* lớn hơn: Starter 0,35 · Professional 0,71 · Enterprise 1,25 · Uniform 0,57.
S4 vượt S3 khi *f* lớn hơn: Starter 1,04 · Professional 2,17 · Enterprise 4,70 · Uniform 1,89.

### 4.5 Hybrid lý tưởng so với kiến trúc đơn tốt nhất

Giả sử mỗi lớp thuê bao dùng kịch bản tốt nhất của lớp đó (cận trên của lợi ích mô hình lai, chưa trừ chi phí phức tạp). Với các cơ cấu 80/18/2, 50/40/10, 34/33/33 và 0/100/0 (Starter/Professional/Enterprise), mức hơn kiến trúc đơn tốt nhất chỉ **0,00 đến 0,01** điểm trên thang 5, ở cả quy mô thiết kế lẫn thực nghiệm.

### 4.6 Điều các số liệu nói và không nói

1. Ở quy mô thiết kế, S3 gần như luôn là lựa chọn tốt nhất hoặc kém lựa chọn tốt nhất rất ít (0,03). Nó là kiến trúc **ít hối tiếc nhất**.
2. Ở quy mô 3–5 thuê bao, công cụ ưu tiên S2, vì các tiêu chí về mật độ và công vận hành chưa phát huy. Đây là lý do không chọn kiến trúc theo quy mô thực nghiệm: nó sẽ chọn theo thứ không phải đối tượng mà ứng dụng nhắm tới.
3. Với lớp Starter, S3 và S4 gần như hòa (3,54 so với 3,53); S4 vượt S3 ngay khi trọng số quy mô tăng 4%. Công cụ **không phân biệt được** hai kiến trúc này cho nhóm thuê bao nhỏ; cần dữ liệu đo (MB-scale, H3, H4).
4. Mô hình lai không có lợi thế định lượng: cận trên của lợi ích là 0,01 điểm, trong khi nó phải trả chi phí duy trì nhiều đường mã. **Bảng 6.3 không biện minh được S5.**
5. Nếu cho S1 vào tập, nó dẫn đầu lớp Enterprise (3,39) và mọi lớp ở quy mô thực nghiệm. Điều này nhất quán với việc chỉ S1 mới cô lập hiệu năng thật (H2) nhưng không khả thi trong ràng buộc.

## 5. Quyết định

**Kiến trúc đề xuất: S3 ⟨AI,DB⟩.** Các tầng khác: biên dùng chung (host → thuê bao), định danh dùng chung với định danh thuê bao trong token, một bản dựng giao diện, ứng dụng dùng chung (AI), lưu trữ đối tượng dùng chung với tiền tố do máy chủ tạo, hàng đợi dùng chung có định danh thuê bao, một mặt phẳng điều khiển, một bản triển khai (hình `fig-selected-architecture`).

### Lý do

| # | Lý do | Bằng chứng |
|---|---|---|
| L1 | Hối tiếc tối đa nhỏ nhất ở quy mô thiết kế và thắng ổn định khi trọng số thay đổi (98% Uniform, 89% Professional) | Mục 4.2 |
| L2 | Có lớp bảo vệ cuối **từ chối khi lỗi** (bộ định tuyến nguồn dữ liệu cộng vai trò CSDL riêng không có quyền trên lược đồ khác; phần vai trò cần kiểm bằng H1) mà (khi dùng chuyển vai trò trong một nhóm kết nối chung) không phải trả giá phân mảnh nhóm kết nối như S2: một kết nối chỉ truy cập một CSDL, nên S2 cần một nhóm kết nối cho mỗi thuê bao. Lưu ý lợi thế này mất đi nếu S3 kết nối bằng chính vai trò thuê bao (tài liệu 08, mục 3) | K14 tr. 127; PostgreSQL *Managing Databases*; Azure PostgreSQL (mô hình process-per-connection) |
| L3 | Khôi phục, xuất và xóa theo thuê bao ở mức lược đồ, điều S4 không có sẵn (S4 phải khôi phục CSDL sang nơi khác rồi chọn lọc) | Azure *Storage and data*; ISO 3.2.35 |
| L4 | Cho phép tùy biến dữ liệu bằng cột thường trong lược đồ riêng (Datasource Router), đáp ứng phạm vi tùy biến dữ liệu mà không cần bảng thuộc tính định kiểu | K14 mục 7.6.2; tài liệu 03 mục 5 |
| L5 | Nằm trong phạm vi đã duyệt của thuyết minh (mô hình "chung CSDL, riêng lược đồ"); S4 cũng thuộc mục 13.2; S2 là phần mở rộng cần duyệt | Thuyết minh 13.2 |
| L6 | Chi phí đã biết có thể kiểm: không có PITR theo thuê bao, không cô lập hiệu năng, cập nhật lược đồ tăng theo số thuê bao, trần quy mô | Tài liệu 04; H2 đến H5, MB-scale |

### Điều kiện lật, đặt trước khi chạy thực nghiệm

Ngưỡng cụ thể là **đề xuất**, nhóm cần chốt và ghi lại *trước* khi thu số liệu để kết luận không bị điều chỉnh theo kết quả.

| Điều kiện | Quyết định | Đo bằng |
|---|---|---|
| Với N vài trăm thuê bao tổng hợp, thời gian cấp phát hoặc thời gian migration toàn bộ vượt ngưỡng chấp nhận (đề xuất: cấp phát p95 > 30 giây hoặc migration toàn bộ > 15 phút) | Dùng S4 cho nhóm thuê bao nhỏ (Starter); S3 giữ cho các lớp còn lại | MB-scale, H3, H4 |
| Thuê bao có yêu cầu cứng: khóa mã hóa riêng, SLA khôi phục độc lập, hoặc vị trí lưu trữ riêng | S2 cho thuê bao đó; S1 nếu cần cô lập hiệu năng | Yêu cầu thuê bao, H2, H5 |
| Kiểm thử đột biến H1 cho thấy cấu hình đặc quyền của S3 có lỗi mà bộ test không bắt được, trong khi S2 thì bắt được | Chuyển sang S2 hoặc bổ sung kiểm tra tự động cho vai trò và `search_path` trước khi tuyên bố an toàn | H1 |
| Chi phí kỹ thuật của hỗ trợ đồng thời ba placement vượt ngưỡng (đề xuất: ma trận test tăng quá hai lần so với một placement) | Giữ một placement chính thức, các placement còn lại chuyển thành phụ lục thực nghiệm | H7 |

Nếu không điều kiện nào xảy ra, hệ thống chỉ cần S3, và S2, S4 chỉ còn vai trò đối chứng.

## 6. Hệ quả cho ứng dụng và báo cáo

- **Ứng dụng:** vẫn giữ ba placement vì (a) thuyết minh yêu cầu so sánh các mô hình CSDL và (b) mẫu Datasource Router làm cho chúng rẻ để hỗ trợ. Trong báo cáo, S3 là kiến trúc đề xuất; S2 và S4 xuất hiện là đối chứng và biến thể.
- **"Bridge":** chỉ dùng cho mô hình lai khi có điều kiện kích hoạt; đây là phần mở rộng thuộc Phụ lục A, chờ phê duyệt học thuật.
- **Cổng tính năng theo placement:** Phụ lục A hiện gán phê duyệt và tự động hóa cho `SILO_DATABASE`. Về kỹ thuật chúng không phụ thuộc vị trí dữ liệu (tài liệu 03 mục 5); nếu giữ, phải phát biểu là chính sách sản phẩm.
- **Ghép gói với placement** (Starter ↔ POOL, Professional ↔ SCHEMA, Enterprise ↔ SILO trong ghi chú định giá): xem như giả thuyết đóng gói thương mại. Với Starter công cụ chỉ hòa giữa S3 và S4, nên việc dùng S4 cho Starter cần được xác lập bằng điều kiện lật thứ nhất, không phải bằng Bảng 6.3.

## 7. Hạn chế của phương pháp

1. Bảng 6.3 là đánh giá của 16 kiến trúc sư từ ba công ty năm 2014, không phải số đo trên hệ thống của nhóm; K14 tr. 104 tự nêu cần đánh giá thêm.
2. Trọng số và hệ số quy mô là giả định của nhóm; độ nhạy giảm rủi ro nhưng không loại bỏ.
3. Giả định quy mô thiết kế (mục 1) quyết định S3 so với S2.
4. Công cụ không mô hình hóa mô hình lai và các ràng buộc cứng theo thuê bao.
5. Lợi thế của S3 về nhóm kết nối và về cô lập thông tin đăng nhập phụ thuộc cách ứng dụng dùng vai trò CSDL (tài liệu 08, mục 3); nhóm phải chọn và kiểm bằng E1.
6. Những khác biệt kỹ thuật mà 2014 chưa có (RLS trưởng thành trong PostgreSQL, IaC cho cấp phát, PgBouncer) không có trong bảng; chúng chỉ được tính qua phần phân tích định tính ở tài liệu 04 và qua thực nghiệm.

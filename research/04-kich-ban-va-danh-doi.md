# 04. Kịch bản kiến trúc và phân tích đánh đổi

Hình: `report/assets/diagrams/fig-scenarios.{en,vi}.pdf`. Mọi con số "CG" là **đánh giá chuyên gia** (K14, Bảng 6.3, n = 16, thang 1 = bất lợi đến 5 = tích cực, năm 2014), không phải kết quả đo của nhóm.

Nhãn bằng chứng: **[Đ]** tài liệu chuẩn hoặc tài liệu chính thức của nhà cung cấp; **[CG]** đánh giá chuyên gia của K14; **[GT]** giả thuyết nhóm chưa có số đo, sẽ kiểm bằng thí nghiệm ở tài liệu 06 (mã H1 đến H8).

## 1. Cách sinh kịch bản

1. Một kịch bản là một tổ hợp quyết định *chia sẻ hay dùng riêng* trên các tầng của ngăn xếp (tài liệu 03).
2. Quy luật bất biến của K14 (tr. 94) loại tổ hợp vô nghĩa: trong cùng một trục, nếu chia sẻ ở một tầng thì mọi tầng dưới nó cũng chia sẻ. Ví dụ không tồn tại "CSDL chung nhưng máy chủ CSDL riêng".
3. Hai trục A và D cho 12 tổ hợp ⟨A,D⟩ (K14 tr. 95–96). Nhóm cố định A = AI (tài liệu 03, mục 4) và cố định mọi tầng vệ tinh, nên chỉ còn trục D biến thiên.
4. Thêm một kịch bản tham chiếu (S0, đa thể hiện thuần) để thấy đầu kia của phổ, và một kịch bản chính sách (S5, Bridge) cho mô hình lai.
5. Trục bản triển khai (nhiều stamp) bị loại khỏi tập kịch bản; lý do ở tài liệu 03, mục 4.

| ID | ⟨A,D⟩ | Mô tả | Tên trong ứng dụng | Vai trò | Đánh giá khả thi của K14 (10 kiến trúc sư, thang 1–7) |
|---|---|---|---|---|---|
| S0 | ⟨AD,DD⟩ | Mỗi thuê bao một bộ ứng dụng và một máy chủ CSDL riêng | ngoài phạm vi | Tham chiếu, đầu "dùng riêng" của phổ | Cao: 7 chuyên gia cho là "at least very strongly feasible" |
| S1 | ⟨AI,DD⟩ | Ứng dụng chung, mỗi thuê bao một máy chủ CSDL riêng | ngoài phạm vi (có thể chạy thử bằng container) | Tham chiếu, thí nghiệm tùy chọn | Thấp nhất: "between slightly and moderately" |
| S2 | ⟨AI,DS⟩ | Ứng dụng chung, mỗi thuê bao một CSDL riêng trên máy chủ CSDL chung | `SILO_DATABASE` | Ứng viên | "moderately feasible" |
| S3 | ⟨AI,DB⟩ | Ứng dụng chung, một CSDL, mỗi thuê bao một lược đồ riêng | `SCHEMA_PER_TENANT` | Ứng viên | "moderately feasible" (hai nhóm ý kiến trái chiều) |
| S4 | ⟨AI,DC⟩ | Ứng dụng chung, một CSDL, một lược đồ, cột `tenant_id` | `POOL` | Ứng viên | "very strong degree of feasibility" |
| S5 | ⟨AI, {DS, DB, DC}⟩ | Chính sách gán từng thuê bao vào S2, S3 hoặc S4 | Bridge | Mô hình lai | **Chưa được đánh giá**: K14 tr. 104 nêu rõ không xét mẫu lai |

Nếu Silo đặt trên máy chủ khác cho từng thuê bao thì đó là S1, không phải S2 (hiệu chỉnh C9).

## 2. Cô lập bằng gì và điểm mù ở mỗi kịch bản

| Kịch bản | Ranh giới ở tầng dữ liệu | Cô lập theo cấu trúc hay do thực thi | Điểm mù đã biết |
|---|---|---|---|
| S2 | Một CSDL mỗi thuê bao, thông tin đăng nhập riêng | Cấu trúc ở mức CSDL: một kết nối chỉ truy cập một CSDL ("It is not possible to access more than one database per connection") | Các CSDL cùng cluster chia sẻ WAL và tài nguyên; PITR chỉ ở mức cluster; nếu bộ định tuyến cấp nhầm thông tin đăng nhập thì lộ |
| S3 | Một lược đồ mỗi thuê bao, vai trò CSDL riêng chỉ có quyền trên lược đồ của mình | Do thực thi bằng đặc quyền: "schemas are not rigidly separated: a user can access objects in any of the schemas… if they have privileges" | `GRANT` sai; `search_path` và lược đồ `public` mặc định; "adding a schema to search_path effectively trusts all users having CREATE privilege on that schema" |
| S4 | Cột `tenant_id`, khóa kép (tenant_id, id), chính sách mức dòng (RLS) | Do thực thi bằng chính sách và bộ lọc ứng dụng | Chủ bảng và vai trò BYPASSRLS bỏ qua RLS (cần FORCE); kiểm tra khóa ngoại và khóa duy nhất bỏ qua RLS ("covert channel"); quên điều kiện lọc; quên đặt biến phiên |

K14 tr. 127 về mẫu Datasource Router (S2 và S3 thuộc họ này): "Failing to select a datasource would simply crash the application instead of mixing data from other tenants". Đây là tính chất *từ chối khi lỗi* (fail-closed). S4 chỉ đạt tính chất này khi chính sách được viết để từ chối khi biến phiên chưa đặt; điều đó cần kiểm bằng test (H1).

## 3. Đánh đổi theo ba bài toán của thầy và theo tùy biến

Trong các bảng dưới, S2, S3, S4 theo thứ tự. Với ô có số, đó là điểm CG.

### 3.1 Hiệu năng và hàng xóm ồn ào

| Tiêu chí | S2 | S3 | S4 | Nhãn | Nguồn và ghi chú |
|---|---|---|---|---|---|
| Time Behavior | 3,0 | 3,0 | 2,5 | CG | K14 Bảng 6.3 |
| Throughput | 3,0 | 3,0 | 3,0 | CG | Ba kịch bản bằng nhau |
| Resource Utilization | 3,0 | 4,0 | 4,5 | CG | Chia sẻ nhiều thì dùng tài nguyên tốt hơn |
| Nhóm kết nối | một nhóm cho mỗi CSDL | một nhóm chung | một nhóm chung | Đ | PostgreSQL: một kết nối chỉ truy cập một CSDL; Azure PostgreSQL: mô hình process-per-connection nên nhiều kết nối nhàn rỗi tốn kém |
| Cô lập hiệu năng trên cùng một máy chủ CSDL | không có theo thiết kế | không có | không có | Đ, GT (H2) | PostgreSQL: các CSDL trong cluster "closely bound… shared WAL". Azure nêu CSDL riêng giúp giảm noisy neighbor khi tài nguyên của CSDL được quản lý riêng; PostgreSQL chuẩn không có bộ điều tiết CPU/I/O theo CSDL |
| Biện pháp kiểm soát không phụ thuộc kịch bản | hạn mức tốc độ, vách ngăn đồng thời, giới hạn thời gian truy vấn, hàng đợi công bằng, giám sát theo thuê bao | giống | giống | Đ | Azure *Noisy Neighbor*: "apply resource governance", "restrict the operations that tenants can perform" |

### 3.2 An toàn dữ liệu và cô lập

| Tiêu chí | S2 | S3 | S4 | Nhãn | Nguồn và ghi chú |
|---|---|---|---|---|---|
| Confidentiality | 4,0 | 3,0 | 2,5 | CG | K14 Bảng 6.3 |
| Integrity | 3,0 | 3,0 | 2,0 | CG | |
| Authenticity | 3,0 | 3,0 | 2,5 | CG | |
| Khi định tuyến hay ngữ cảnh sai | từ chối | từ chối nếu vai trò không có quyền | phụ thuộc chính sách | Đ, GT (H1) | K14 tr. 127 |
| Bảo vệ khi lộ tài khoản đăng nhập hoặc có SQL injection | có (mỗi CSDL một thông tin đăng nhập) | có nếu kết nối bằng chính vai trò thuê bao (cách a); không nếu đăng nhập chung rồi chuyển vai trò (cách b) | không (biến phiên có thể bị đặt lại, tài khoản chung truy cập mọi thuê bao) | Đ, GT (H1) | Tài liệu 08, mục 3 |
| Độ phức tạp của cơ chế | thông tin đăng nhập mỗi CSDL | vai trò mỗi lược đồ, quản lý `search_path` | RLS, biến phiên, khóa kép, test | Đ | Azure: RLS "can be complex to design, implement, test, and maintain" |

### 3.3 Vận hành

| Tiêu chí | S2 | S3 | S4 | Nhãn | Nguồn và ghi chú |
|---|---|---|---|---|---|
| Cấp phát thuê bao mới | tạo CSDL, vai trò, migration | tạo lược đồ, vai trò, migration | thêm bản ghi | GT (H3) | Thời gian và số bước thất bại cần đo |
| Deployment Time | 4,0 | 4,0 | 5,0 | CG | |
| Cập nhật lược đồ | N lần, mỗi CSDL | N lần, mỗi lược đồ | một lần | Đ, GT (H4) | Azure: phải theo dõi phiên bản lược đồ từng thuê bao; antipattern "version dependencies", "manual schema changes" |
| Maintainability | 3,5 | 4,5 | 5,0 | CG | |
| Sao lưu, khôi phục một thuê bao | dump hoặc khôi phục một CSDL | dump hoặc khôi phục một lược đồ | xuất và khôi phục theo dòng; "restore the database to a separate resource and selectively recover" | Đ, GT (H5) | Azure *Storage and data* |
| PITR theo thuê bao | không | không | không | Đ | PostgreSQL: chỉ khôi phục "an entire database cluster, not a subset". Chỉ có khi mỗi thuê bao một cluster (S1) |
| Recoverability | 4,0 | 3,0 | 2,0 | CG | |
| Portability (chuyển thuê bao) | 4,5 | 4,0 | 2,5 | CG | |
| Xóa thuê bao khi chấm dứt | xóa cả CSDL | xóa cả lược đồ | xóa theo `tenant_id` rồi dọn | Đ, GT (H5) | ISO 3.2.35: nhà cung cấp phải xóa dữ liệu sau thời hạn thỏa thuận |
| Giám sát và đo theo thuê bao | thống kê có sẵn theo CSDL | cần gom theo lược đồ | cần đo ở ứng dụng | Đ | Azure: kiểm tra số liệu có theo ranh giới cô lập không, nếu không thì dùng "application-level metering". Monitoring (công giám sát) 3,0 / 4,0 / 5,0 theo CG |
| Trần quy mô | số CSDL và số nhóm kết nối | số lược đồ và bảng | cao nhất | Đ, GT (MB-scale) | Azure *Storage and data*: antipattern "table-based isolation"; Azure PostgreSQL: schema-based sharding "well-suited for… between 1 and 10,000 tenants" trên cụm phân tán. Number of Tenants 4,0 / 4,0 / 5,0 |

### 3.4 Tùy biến dữ liệu

| Tiêu chí | S2 | S3 | S4 | Nhãn | Nguồn và ghi chú |
|---|---|---|---|---|---|
| Variability | 2,0 | 2,0 | 1,0 | CG | |
| Thêm trường dữ liệu riêng | cột thường trong CSDL riêng | cột thường trong lược đồ riêng | bảng thuộc tính định kiểu | Đ | K14 mục 7.6: Datasource Router và Custom Property Object |
| Chi phí | phải kiểm thử nhiều biến thể lược đồ; lỗi của một thuê bao khó tái hiện | giống | lược đồ tĩnh nên dễ kiểm thử; nhưng nếu không định kiểu thì mất tối ưu hóa của CSDL | Đ | K14 Bảng 7.2 |
| Rào chắn cần có | chỉ cho phép thay đổi cộng thêm, có phiên bản, do mặt phẳng điều khiển quản lý, không sửa tay | giống | không cho DDL hay SQL tùy ý | Đ | Azure antipattern "column-level tenant customization", "manual schema changes" |

### 3.5 Kịch bản S5 (Bridge)

Chi phí đã biết của mô hình lai: "Your codebase needs to be designed to support both multitenant and single-tenant deployments"; nếu cho phép chuyển thuê bao giữa hai mô hình thì phải thiết kế việc di chuyển (Azure *Tenancy models*, phân vùng dọc). K14 tr. 104 xếp "hybrid patterns" vào mối đe dọa tính hợp lệ chưa được giải quyết. Vì vậy mọi tuyên bố về lợi ích của S5 phải đến từ thí nghiệm của nhóm (H7), không thể mượn Bảng 6.3.

## 4. Phát hiện chính

1. **Vị trí dữ liệu chỉ quyết định lớp bảo vệ cuối cùng.** Trong năm chốt chặn của hình `fig-selected-architecture`, chỉ chốt 3 (ranh giới dữ liệu) thay đổi giữa S2, S3, S4; bốn chốt còn lại (biên, dịch vụ, đối tượng, bất đồng bộ) giữ nguyên. Vì vậy khác biệt về an toàn giữa các kịch bản là khác biệt về độ mạnh của lớp cuối, chứ không phải về an toàn cả hệ thống. Báo cáo không được diễn đạt "Pool kém an toàn hơn" nếu bốn chốt kia chưa được kiểm chứng.
2. **Chọn S2 không mua được cô lập hiệu năng** trên một máy chủ PostgreSQL (hiệu chỉnh C6). Muốn có phải lên S1. Đây là giả thuyết H2 và là điểm có thể khiến một số tuyên bố phổ biến sai.
3. **Chọn S2 không mua được PITR theo thuê bao** (hiệu chỉnh C5). Khôi phục theo thuê bao ở S2 và S3 là khôi phục logic (dump/restore), không phải PITR.
4. **S3 là kịch bản trung gian.** Trong 17 tiêu chí của Bảng 6.3, S3 không dẫn đầu ở các tiêu chí có σ² lớn (Variability, Recoverability, Monitoring, Number of Tenants, Maintainability); nó nằm trong khoảng giữa S2 và S4 ở 15 trong 17 tiêu chí (ngoại lệ Availability và Diverse SLA, nơi S3 cao hơn cả hai). Điểm trung bình không trọng số của nó cao nhất (3,41 so với 3,32 và 3,18) chính vì không có điểm rất thấp nào.
5. **Chỉ tùy biến dữ liệu phụ thuộc kiến trúc** (tài liệu 03, mục 5).
6. **Bảng 6.3 chưa nói gì về mô hình lai** (K14 tr. 104), nên không thể dùng nó để biện minh S5.
7. **Giá trị bảo mật của vai trò riêng phụ thuộc cách kết nối** (tài liệu 08, mục 3): vai trò theo thuê bao chỉ bảo vệ trước lộ tài khoản khi ứng dụng kết nối bằng chính vai trò đó, và khi ấy nhóm kết nối bị tách theo vai trò.

## 5. Giả thuyết cần đo

| Mã | Giả thuyết | Kịch bản liên quan |
|---|---|---|
| H1 | Với mỗi kịch bản, mọi truy cập chéo thuê bao qua API, CSDL, đối tượng, tác vụ nền đều bị chặn; các test phát hiện được khi cố ý tắt một chốt chặn | S2, S3, S4 |
| H2 | Khi một thuê bao gây tải nặng, mức suy giảm hiệu năng của thuê bao còn lại tương đương giữa S2, S3, S4 trên cùng một máy chủ CSDL; biện pháp hạn mức ở ứng dụng giảm đáng kể ảnh hưởng ở cả ba; chỉ S1 cô lập thật | S1 đến S4 |
| H3 | Thời gian cấp phát một thuê bao mới: S4 < S3 < S2 | S2, S3, S4 |
| H4 | Thời gian và rủi ro cập nhật lược đồ tăng tuyến tính theo số thuê bao ở S2 và S3, không đổi ở S4 | S2, S3, S4 |
| H5 | Khôi phục và xóa một thuê bao: S2 nhanh nhất và đơn giản nhất, S4 chậm và dễ sai nhất | S2, S3, S4 |
| H6 | Thông lượng và độ trễ khi tải bằng nhau: S2 và S3 không kém S4 đáng kể ở 3–5 thuê bao; S2 tốn nhiều kết nối hơn | S2, S3, S4 |
| H7 | Chi phí kỹ thuật của mô hình lai (số đường mã, ma trận kiểm thử, thời gian chạy test) nằm dưới ngưỡng đã định trước | S5 |
| MB-scale | Thời gian cấp phát, thời gian migration và kích thước danh mục hệ thống tăng thế nào khi số thuê bao tăng đến vài trăm | S2, S3 |

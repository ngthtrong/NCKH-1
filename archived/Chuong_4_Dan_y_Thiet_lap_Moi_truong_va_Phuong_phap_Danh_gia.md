# DÀN Ý CHI TIẾT CHƯƠNG 4: THIẾT LẬP MÔI TRƯỜNG VÀ PHƯƠNG PHÁP ĐÁNH GIÁ THỰC NGHIỆM (EXPERIMENTAL SETUP AND EVALUATION METHODOLOGY)

**Đề tài:** Nghiên cứu và Hiện thực hóa Kiến trúc Đa thuê bao (Multi-Tenant Architecture) cho Nền tảng SaaS Kanban  
**Vai trò của Chương 4 trong chỉnh thể báo cáo:**  
Nếu **Chương 1** đặt nền móng mô hình hóa toán học và phát biểu hai quy luật đánh đổi cốt lõi (Giả thuyết $H_1, H_2$), **Chương 2** kiến tạo khung phân tích đa chiều 9 tầng – 4 chiều ranh giới (`B1`–`B4`) – 5 cấp độ độ dày (`Cấp độ 1` $\rightarrow$ `Cấp độ 5`), và **Chương 3** hiện thực hóa kiến trúc *Full-Stack Pool + 4-Layer Defense-in-Depth* kèm bộ định tuyến đa chiến lược (`TenantAwareRoutingDataSource`) trên nền tảng SaaS Kanban, thì **Chương 4** đóng vai trò là **Cầu nối Phương pháp luận Thực nghiệm (Empirical Methodology Bridge)**. Chương này thiết lập một môi trường kiểm thử có kiểm soát nghiêm ngặt (Controlled Testbed), chuẩn hóa bộ dữ liệu hạt giống và kịch bản tải (Workload Modeling), định nghĩa hệ thống chỉ số đo lường đa chiều (Multi-Dimensional Evaluation Framework), và thiết kế chi tiết 4 nhóm kịch bản thực nghiệm (`E1`–`E4`) nhằm chuẩn bị đầy đủ cơ sở dữ liệu khách quan cho Chương 5 phân tích và kiểm định.

---

## PHẦN I. KIỂM TRA TÍNH NHẤT QUÁN LIÊN CHƯƠNG & NGUYÊN TẮC PHƯƠNG PHÁP LUẬN

Để đảm bảo mạch logic xuyên suốt từ lý thuyết (Chương 1, 2) sang thực thi (Chương 3) và kiểm chứng thực nghiệm (Chương 4, 5), dàn ý Chương 4 tuân thủ nghiêm ngặt **5 trụ cột nhất quán**:

1. **Nhất quán với Các Câu hỏi Nghiên cứu và Giả thuyết Đánh đổi (Chương 1 & 2):**
   - Mọi kịch bản thực nghiệm trong Chương 4 đều được ánh xạ trực tiếp tới việc kiểm chứng **Quy luật Đánh đổi 1** (*Chi phí Đơn vị và Hiệu suất Tài nguyên vs. Cường độ Cô lập và Bảo mật* — Giả thuyết $H_1$) và **Quy luật Đánh đổi 2** (*Tính Kinh tế theo Quy mô và Tốc độ Vận hành vs. Mức độ Tự chủ và Tùy biến Thuê bao* — Giả thuyết $H_2$), cũng như kiểm chứng thực nghiệm **Khung Quyết định Kiến trúc Đa tầng** (Hình 2.13, Bảng 2.8 Chương 2).
2. **Nhất quán với Thang đo 5 Cấp độ Độ dày Ranh giới (`Cấp độ 1` $\rightarrow$ `Cấp độ 5`) và 3 Chiến lược Định tuyến Dữ liệu (Chương 2 & 3):**
   - Thực nghiệm đối sánh định lượng tại Tầng 6 (`Logical Database & Schema`) và Tầng 5 (`DBMS Instance`) sử dụng chính xác 3 chế độ cấu hình của `TenantAwareRoutingDataSource` đã thiết kế ở Mục 3.3.5 Chương 3:
     - **`POOL_RLS` (Cấp độ 1 – Ranh giới Logic/Hàng):** Bảng dùng chung + PostgreSQL Row-Level Security (`ENABLE` & `FORCE ROW LEVEL SECURITY`) + biến phiên `SET LOCAL app.current_tenant`.
     - **`SCHEMA_PER_TENANT` (Cấp độ 2 – Ranh giới Không gian tên/Schema – Mô hình Bridge):** Mỗi thuê bao sở hữu một Schema độc lập (`tenant_i.cards`, `tenant_i.boards`) trong cùng một tiến trình PostgreSQL, chuyển đổi qua `SET LOCAL search_path`.
     - **`SILO_DB` (Cấp độ 4 – Ranh giới Cơ sở dữ liệu Độc lập – Mô hình Silo Dữ liệu):** Mỗi thuê bao (hoặc nhóm thuê bao VIP) kết nối tới một Database/Connection Pool tách biệt hoàn toàn.
3. **Nhất quán với Ma trận 4 Chiều Ranh giới (`B1`–`B4`) và 7 Thách thức Cốt lõi (`C1`–`C7`):**
   - Bộ chỉ số đánh giá (Bảng 4.4) và 4 nhóm kịch bản thực nghiệm (`E1`–`E4`) bao phủ trọn vẹn 4 chiều ranh giới:
     - `B1` (Định danh & Xác thực) + `B2` (Dữ liệu) $\leftrightarrow$ Kịch bản `E1` (Kiểm định An toàn Ranh giới & Chống Rò rỉ Dữ liệu, giải quyết `C1`, `C6`, `C7`).
     - `B2` (Dữ liệu) + `B3` (Hiệu năng & Tài nguyên) $\leftrightarrow$ Kịch bản `E2` (Đối sánh Hiệu năng, Mật độ Thuê bao & Tiêu thụ Tài nguyên giữa `POOL_RLS`, `SCHEMA_PER_TENANT`, `SILO_DB`, giải quyết `C2`, `C4`).
     - `B3` (Hiệu năng & Chống Noisy Neighbor) $\leftrightarrow$ Kịch bản `E3` (Kiểm định Khả năng Chịu đựng Hiệu ứng Láng giềng Ồn ào với Token Bucket Rate Limiting & Two-Tier Cache W-TinyLFU, giải quyết `C2`, `C5`).
     - `B4` (Cấu hình & Tùy biến) + `C4` (Vòng đời Vận hành) $\leftrightarrow$ Kịch bản `E4` (Đánh giá Chi phí Tùy biến Động OpenFeature, `JSONB` GIN Index và Tốc độ Onboarding/Schema Migration, giải quyết `C3`, `C4`).
4. **Nhất quán với Phương pháp luận Thực nghiệm Hệ thống Phân tán (Grounded in `MT_ThucNghiem_AI_EAT.pdf`):**
   - Áp dụng nguyên tắc **Cô lập Tài nguyên Cấp độ Container (Container Resource Pinning)** bằng Docker `cpus` và `mem_limit` để loại bỏ nhiễu nền của hệ điều hành chủ (Host OS jitter) và kích hoạt sớm các nút thắt cổ chai (CPU throttling, RAM pressure, Connection Pool exhaustion) ở quy mô phòng thí nghiệm.
   - Áp dụng nguyên tắc **Mô hình hóa Tải Thực tế (Realistic Workload Modeling)** phân tầng theo phân phối Pareto/Zipfian (Free/Small, Pro/Medium, Enterprise/Large + Noisy Neighbor) và tỷ lệ đọc/ghi đặc trưng của ứng dụng Kanban cộng tác thời gian thực ($80\%$ Read / $20\%$ Write).
   - Áp dụng nguyên tắc **Đo lường Đa phân vị và Lặp lại Thống kê (Multi-Percentile & Statistical Rigor)**: Thu thập phân vị độ trễ $p_{50}$ (trung vị), $p_{95}$, $p_{99}$ (độ trễ đuôi – tail latency), thông lượng (RPS), tỷ lệ lỗi ($\%$), cùng độ lệch chuẩn (SD) qua tối thiểu $n = 5$ lần chạy độc lập sau giai đoạn làm nóng (Warm-up phase).

---

## PHẦN II. CÂY DÀN Ý TỔNG THỂ CHƯƠNG 4 (MASTER OUTLINE TREE)

* **CHƯƠNG 4: THIẾT LẬP MÔI TRƯỜNG VÀ PHƯƠNG PHÁP ĐÁNH GIÁ THỰC NGHIỆM**
  * **4.1. Mục tiêu Thực nghiệm và Hệ thống Câu hỏi Nghiên cứu (Experimental Objectives & Research Questions)**
    * 4.1.1. Mục tiêu Kiểm chứng Thực nghiệm từ Mô hình Lý thuyết (Chương 1, 2) đến Hệ thống Hiện thực (Chương 3)
    * 4.1.2. Phát biểu Hệ thống Câu hỏi Nghiên cứu Thực nghiệm (`RQ1` – `RQ4`) và Giả thuyết Kiểm định
    * 4.1.3. Ánh xạ Câu hỏi Nghiên cứu (`RQ1`–`RQ4`) vào 4 Chiều Ranh giới (`B1`–`B4`) và 7 Thách thức (`C1`–`C7`)
  * **4.2. Thiết lập Môi trường Thực nghiệm Chuẩn hóa và Cô lập Tài nguyên (Standardized Experimental Testbed)**
    * 4.2.1. Kiến trúc Triển khai Hệ thống Kiểm thử (Testbed Topology) và Tách biệt Cụm Sinh tải (Load Generator Isolation)
    * 4.2.2. Cấu hình Phần cứng, Hệ điều hành và Phiên bản Phần mềm Hạ tầng (Hardware & Software Stack Specification)
    * 4.2.3. Chiến lược Cô lập và Giới hạn Tài nguyên Container (`cgroups` Resource Pinning) để Mô phỏng Nút thắt Cổ chai
    * 4.2.4. Tinh chỉnh Tham số Cơ sở dữ liệu (PostgreSQL 16), Bộ nhớ đệm (Caffeine/Redis 7) và Hồ kết nối (HikariCP)
  * **4.3. Phân tầng Thuê bao, Khởi tạo Dữ liệu Hạt giống và Mô hình hóa Tải Kanban (Workload & Data Modeling)**
    * 4.3.1. Phân bố Kích thước Thuê bao theo Quy luật Pareto/Zipfian (Small/Free, Medium/Pro, Large/Enterprise)
    * 4.3.2. Quy trình Khởi tạo Dữ liệu Hạt giống Chuẩn hóa (Seed Data Generation) cho Bảng Kanban (`boards`, `lists`, `cards`, `custom_fields`)
    * 4.3.3. Mô hình hóa Hành vi Người dùng (Virtual User Behavior) và Tỷ lệ Tác vụ Đặc trưng của SaaS Kanban ($80\%$ Read / $20\%$ Write)
    * 4.3.4. Thiết kế Các Hình thái Giao thông Tải (Traffic Shapes): Tải Nền Ổn định (Steady-State), Tải Tăng bậc thang (Ramp-up), và Tải Đột biến Cục bộ (Burst/Spike)
  * **4.4. Hệ thống Quan sát Thực nghiệm và Khung Chỉ số Đánh giá Đa chiều (Telemetry & Evaluation Metrics Framework)**
    * 4.4.1. Kiến trúc Thu thập Số liệu Không xâm lấn (Non-Intrusive Observability Stack: k6, Micrometer, Prometheus, Grafana, `pg_stat_statements`)
    * 4.4.2. Nhóm Chỉ số An toàn Ranh giới và Bảo mật Dữ liệu (Security & Boundary Integrity Metrics – `B1`, `B2`)
    * 4.4.3. Nhóm Chỉ số Hiệu năng Phản hồi và Khả năng Chịu tải (Performance & Scalability Metrics: $p_{50}, p_{95}, p_{99}$, RPS, Error Rate – `B3`)
    * 4.4.4. Nhóm Chỉ số Hiệu quả Sử dụng Tài nguyên và Mật độ Thuê bao (Resource Efficiency & Density Metrics: CPU, RAM, DB Connections, Cache Hit Ratio – `B2`, `B3`)
    * 4.4.5. Nhóm Chỉ số Chi phí Vận hành và Độ linh hoạt Tùy biến (Operational & Customization Agility Metrics: Onboarding Latency, Migration Time, Flag Evaluation Overhead – `B4`)
    * 4.4.6. Ma trận Tổng hợp Khung Đánh giá Thực nghiệm Đa chiều (Bảng 4.4 – Đối chiếu Chỉ số, Công cụ đo và Ngưỡng Chấp nhận SLA)
  * **4.5. Thiết kế Chi tiết Các Kịch bản Thực nghiệm (`E1` – `E4`) và Quy trình Kiểm soát Sai số**
    * 4.5.1. Kịch bản `E1`: Kiểm định Tính Toàn vẹn Ranh giới Bảo mật 4 Lớp và Chống Rò rỉ Dữ liệu Chéo (Boundary Security & Isolation Verification)
    * 4.5.2. Kịch bản `E2`: Đối sánh Định lượng 3 Chiến lược Cô lập Dữ liệu (`POOL_RLS` Cấp độ 1 vs. `SCHEMA_PER_TENANT` Cấp độ 2 vs. `SILO_DB` Cấp độ 4)
    * 4.5.3. Kịch bản `E3`: Kiểm định Khả năng Kháng Hiệu ứng Láng giềng Ồn ào (Noisy Neighbor Resilience: Token Bucket Rate Limiting & Two-Tier Cache W-TinyLFU)
    * 4.5.4. Kịch bản `E4`: Đánh giá Chi phí Tùy biến Động (OpenFeature + `JSONB` GIN Index) và Vận hành Vòng đời Thuê bao (Zero-Downtime Onboarding & Migration)
    * 4.5.5. Giao thức Thực thi Thực nghiệm Chuẩn hóa (Warm-up, Steady Measurement, Cooldown/Reset) và Kiểm soát Nhiễu Thống kê
  * **4.6. Tiểu kết Chương 4**

---

## PHẦN III. NỘI DUNG CHI TIẾT VÀ ĐỊNH HƯỚNG TRIỂN KHAI TỪNG MỤC

### Dẫn nhập Chương 4 (Opening Hook)
* **Mục đích:** Tạo cầu nối mạch lạc từ hệ thống phần mềm đã hiện thực hóa ở Chương 3 sang phương pháp kiểm chứng khoa học ở Chương 4.
* **Ý chính cần triển khai:**
  * Ở Chương 3, kiến trúc *Full-Stack Pool kết hợp Phòng thủ 4 Lớp (Defense-in-Depth)* và bộ định tuyến đa chiến lược `TenantAwareRoutingDataSource` đã được hiện thực hóa thành công trên nền tảng SaaS Kanban. Tuy nhiên, trong kỹ thuật phần mềm thực nghiệm (Empirical Software Engineering), một thiết kế kiến trúc chỉ thực sự có giá trị khoa học khi các tuyên bố về tính an toàn cô lập, hiệu năng xử lý, khả năng kháng nhiễu láng giềng ồn ào và chi phí đánh đổi của nó được đặt lên bàn cân đo lường định lượng dưới các điều kiện tải khắc nghiệt.
  * Chương 4 trình bày toàn bộ phương pháp luận thiết kế thực nghiệm: từ việc định nghĩa các câu hỏi nghiên cứu (`RQ1`–`RQ4`), thiết lập môi trường kiểm thử cô lập bằng container (`cgroups` pinning), xây dựng mô hình tải Kanban tuân theo phân phối thực tế, cho đến định nghĩa khung chỉ số đo lường đa chiều và 4 nhóm kịch bản thực nghiệm cốt lõi (`E1`–`E4`).

---

### 4.1. Mục tiêu Thực nghiệm và Hệ thống Câu hỏi Nghiên cứu (Experimental Objectives & Research Questions)

#### 4.1.1. Mục tiêu Kiểm chứng Thực nghiệm từ Mô hình Lý thuyết đến Hệ thống Hiện thực
* **Nội dung trọng tâm:**
  * Chuyển hóa các công thức toán học ở Chương 1 (chi phí hạ tầng bình quân $\bar{C}_{\text{Silo}}$ vs. $\bar{C}_{\text{Pool}}$, hệ số ghép kênh thống kê, xác suất rủi ro rò rỉ dữ liệu $R_{\text{Pool}}$) và ma trận phân tích ở Chương 2 thành các đại lượng vật lý có thể đo đếm được bằng công cụ thực nghiệm (ms, requests/sec, MB RAM, $\%$ CPU, số lượng kết nối CSDL, tỷ lệ rò rỉ dữ liệu $= 0\%$).
  * Đảm bảo tính công bằng (Apples-to-Apples Comparison): Mọi phép đối sánh giữa các mô hình cô lập dữ liệu (`POOL_RLS` Cấp độ 1, `SCHEMA_PER_TENANT` Cấp độ 2, `SILO_DB` Cấp độ 4) đều được chạy trên **cùng một mã nguồn nghiệp vụ Kanban duy nhất**, **cùng một tập dữ liệu hạt giống**, và **cùng một ngân sách tài nguyên phần cứng giới hạn**.

#### 4.1.2. Phát biểu Hệ thống Câu hỏi Nghiên cứu Thực nghiệm (`RQ1` – `RQ4`) và Giả thuyết Kiểm định
* **Nội dung trọng tâm:** Thiết lập 4 câu hỏi nghiên cứu cốt lõi dẫn dắt toàn bộ Chương 4 và Chương 5:
  * **`RQ1` (Tính Toàn vẹn Ranh giới & An toàn Cô lập – Kiểm chứng `B1`, `B2` và `C1`, `C7`):** *Cơ chế Phòng thủ Chiều sâu 4 lớp (JWT/Header Identity Binding $\rightarrow$ ThreadLocal `TenantContext` $\rightarrow$ Hibernate `@TenantId` $\rightarrow$ PostgreSQL RLS `ENABLE/FORCE` với `SET LOCAL` và MinIO Prefix Isolation) có ngăn chặn triệt để $100\%$ các véc-tơ tấn công vượt ranh giới thuê bao (IDOR, giả mạo Header, quên mệnh đề lọc `WHERE`, tái sử dụng kết nối từ Pool) hay không, và chi phí độ trễ (latency overhead) mà lớp phòng thủ kép này gây ra là bao nhiêu mili-giây?*
  * **`RQ2` (Đánh đổi Hiệu năng, Tài nguyên & Mật độ Thuê bao giữa 3 Chiến lược Dữ liệu – Kiểm chứng Quy luật Đánh đổi 1, `B2`, `B3` và `C2`, `C4`):** *Khi mở rộng số lượng thuê bao hoạt động đồng thời ($N \in \{10, 50, 100, 200\}$), 3 chiến lược cô lập dữ liệu tại Tầng 5–6 (`POOL_RLS` – Cấp độ 1, `SCHEMA_PER_TENANT` – Cấp độ 2, và `SILO_DB` – Cấp độ 4) thể hiện sự đánh đổi như thế nào về độ trễ phản hồi ($p_{50}, p_{95}, p_{99}$), thông lượng cực đại (RPS), mức tiêu thụ bộ nhớ đệm hệ thống (`pg_catalog` / Buffer Pool) và chi phí kết nối CSDL?*
  * **`RQ3` (Khả năng Kháng Hiệu ứng Láng giềng Ồn ào – Kiểm chứng `B3` và `C2`, `C5`):** *Khi một thuê bao phát sinh lưu lượng đột biến gấp $10\times$–$20\times$ mức bình thường (Burst/Flooding) hoặc thực hiện truy vấn quét dữ liệu lớn (Scan Pollution), sự kết hợp giữa bộ giới hạn tốc độ Token Bucket theo từng thuê bao và kiến trúc bộ nhớ đệm hai tầng (L1 Caffeine dùng thuật toán nhận thức tần suất `W-TinyLFU` + L2 Redis) bảo vệ độ trễ $p_{95}, p_{99}$ và tỷ lệ Cache Hit của các thuê bao láng giềng bình thường hiệu quả ra sao so với kiến trúc không có cơ chế bảo vệ hoặc dùng bộ nhớ đệm `LRU` truyền thống?*
  * **`RQ4` (Chi phí Tùy biến Động và Tốc độ Vận hành Vòng đời – Kiểm chứng Quy luật Đánh đổi 2, `B4` và `C3`, `C4`):** *Việc áp dụng cờ tính năng động theo ngữ cảnh thuê bao (OpenFeature) kết hợp cột mở rộng bán cấu trúc `JSONB` (có chỉ mục GIN) ảnh hưởng như thế nào đến hiệu năng truy xuất bảng Kanban, đồng thời thời gian cấp phát thuê bao mới (Zero-Downtime Onboarding) và nâng cấp lược đồ (Schema Migration) của mô hình `POOL_RLS` nhanh hơn bao nhiêu lần so với `SCHEMA_PER_TENANT` và `SILO_DB`?*

#### 4.1.3. Ánh xạ Câu hỏi Nghiên cứu (`RQ1`–`RQ4`) vào 4 Chiều Ranh giới (`B1`–`B4`) và 7 Thách thức (`C1`–`C7`)
* **Nội dung trọng tâm:** Trình bày **Bảng 4.1** đối chiếu trực tiếp từng câu hỏi nghiên cứu (`RQ1`–`RQ4`) với các chiều ranh giới (`B1`–`B4`), cấp độ độ dày (`Cấp độ 1`–`4`), thách thức cốt lõi (`C1`–`C7`) và kịch bản thực nghiệm tương ứng (`E1`–`E4`).

---

### 4.2. Thiết lập Môi trường Thực nghiệm Chuẩn hóa và Cô lập Tài nguyên (Standardized Experimental Testbed)

#### 4.2.1. Kiến trúc Triển khai Hệ thống Kiểm thử (Testbed Topology) và Tách biệt Cụm Sinh tải
* **Nội dung trọng tâm:**
  * Thiết kế sơ đồ tô-pô triển khai thực nghiệm (**Hình 4.1**): Tách biệt rõ ràng giữa **Phân vùng Sinh tải & Quan sát (Load Generation & Observability Zone)** và **Phân vùng Hệ thống Đang được Kiểm thử (System Under Test – SUT Zone)** giao tiếp qua mạng cầu nối ảo tốc độ cao (Docker Bridge Network).
  * Giải thích lý do phương pháp luận: Việc tách tiến trình sinh tải (`k6`) khỏi tài nguyên CPU/RAM của container ứng dụng (`Spring Boot`) và cơ sở dữ liệu (`PostgreSQL`) là bắt buộc để tránh hiện tượng *Self-Interference* (công cụ sinh tải tranh chấp CPU với chính hệ thống đang đo, làm sai lệch phân vị độ trễ $p_{99}$).

#### 4.2.2. Cấu hình Phần cứng, Hệ điều hành và Phiên bản Phần mềm Hạ tầng
* **Nội dung trọng tâm:**
  * Liệt kê chi tiết thông số máy chủ thực nghiệm và phiên bản phần mềm cố định (**Bảng 4.2**) nhằm đảm bảo tính tái lập hoàn toàn (Reproducibility):
    * **Application Runtime (Tầng 8–9):** Java 21 LTS (Eclipse Temurin, G1GC), Spring Boot 3.3.x, Hibernate 6.5.x, Caffeine Cache 3.1.8, OpenFeature Java SDK 1.12.x, Bucket4j 8.10.x.
    * **Middleware & Cache (Tầng 7):** Nginx 1.26 (API Gateway/Reverse Proxy), Redis 7.2-alpine (Distributed Cache & Token Bucket State Store).
    * **Database & Storage (Tầng 4–6):** PostgreSQL 16.4 (kích hoạt RLS, `pg_stat_statements`), HikariCP 5.1.0, MinIO RELEASE.2024 (S3-compatible Object Storage).
    * **Load Testing & Telemetry:** Grafana k6 v0.52+, Prometheus v2.53+, Grafana v11.1+, cAdvisor / Docker Stats.

#### 4.2.3. Chiến lược Cô lập và Giới hạn Tài nguyên Container (`cgroups` Resource Pinning)
* **Nội dung trọng tâm (Bàn luận học thuật từ `MT_ThucNghiem_AI_EAT.pdf`):**
  * Tại sao không cấp phát tài nguyên không giới hạn (Unbounded Host Resources) cho các container? Trên một máy chủ vật lý hiện đại có 16–32 nhân CPU và 32–64 GB RAM, nếu để container tự do chiếm dụng toàn bộ tài nguyên, cần tới hàng chục nghìn người dùng ảo mới làm lộ rõ điểm bão hòa, đồng thời các tiến trình nền của hệ điều hành sẽ gây nhiễu (noise).
  * Do đó, nghiên cứu áp dụng kỹ thuật **Container Resource Pinning** thông qua Linux `cgroups` (Docker Compose `deploy.resources.limits`):
    * Container `kanban-app` (Spring Boot): Giới hạn cố định `2.0 vCPUs`, `2048 MB RAM` (JVM Heap `-Xms1024m -Xmx1536m`).
    * Container `postgres-db` (PostgreSQL 16): Giới hạn cố định `2.0 vCPUs`, `2048 MB RAM` (`shared_buffers = 512MB`, `work_mem = 16MB`, `max_connections = 200`).
    * Container `redis-cache` (Redis 7): Giới hạn cố định `0.5 vCPU`, `512 MB RAM` (`maxmemory 256mb`).
    * Container `minio-storage` (MinIO): Giới hạn cố định `0.5 vCPU`, `512 MB RAM`.
  * Việc "đóng khung" ngân sách tài nguyên này tạo ra một **Môi trường Thực nghiệm Thu nhỏ Có Kiểm soát (Controlled Micro-Cloud Testbed)**, giúp tái hiện chính xác hiện tượng tranh chấp CPU, áp lực bộ nhớ đệm (`shared_buffers` eviction) và cạn kiệt hồ kết nối (Connection Pool Exhaustion) một cách minh bạch và công bằng tuyệt đối giữa các chiến lược kiến trúc.

#### 4.2.4. Tinh chỉnh Tham số Cơ sở dữ liệu, Bộ nhớ đệm và Hồ kết nối
* **Nội dung trọng tâm:**
  * Cấu hình HikariCP (`maximumPoolSize = 50` cho `POOL_RLS` và `SCHEMA_PER_TENANT`; đối với `SILO_DB`, tổng số kết nối phải chia sẻ hoặc nhân lên theo số lượng Database độc lập để kiểm chứng chi phí kết nối thực tế).
  * Cấu hình chỉ mục PostgreSQL: Đảm bảo mọi bảng nghiệp vụ trong cả 3 mô hình đều được đánh chỉ mục tương đương (trong `POOL_RLS` dùng chỉ mục tổ hợp dẫn đầu bằng `tenant_id` như `idx_cards_tenant_board_pos (tenant_id, board_id, list_id, position)`; trong `SCHEMA_PER_TENANT` và `SILO_DB` dùng `idx_cards_board_pos (board_id, list_id, position)`). Điều này loại bỏ thiên kiến cấu hình (Configuration Bias) khi so sánh hiệu năng.

---

### 4.3. Phân tầng Thuê bao, Khởi tạo Dữ liệu Hạt giống và Mô hình hóa Tải Kanban (Workload & Data Modeling)

#### 4.3.1. Phân bố Kích thước Thuê bao theo Quy luật Pareto/Zipfian (Small/Free, Medium/Pro, Large/Enterprise)
* **Nội dung trọng tâm:**
  * Trong các nền tảng SaaS B2B thực tế (như Trello, Jira, Asana), dữ liệu và lưu lượng giữa các thuê bao không bao giờ phân bố đều (Uniform Distribution) mà tuân theo **Phân phối Đuôi dài (Heavy-tailed Pareto / Zipfian Distribution)**: khoảng $70\%$ số thuê bao thuộc nhóm nhỏ (Small/Free), $20\%$ thuộc nhóm trung bình (Medium/Pro), và $10\%$ thuộc nhóm doanh nghiệp lớn (Large/Enterprise) nhưng nhóm $10\%$ này lại nắm giữ tới $60\%–70\%$ tổng khối lượng dữ liệu và lưu lượng truy cập.
  * Thiết lập **Bảng 4.3 (Cấu trúc Phân tầng Thuê bao và Khối lượng Dữ liệu Hạt giống)** cho quy mô chuẩn $N = 100$ thuê bao (và mở rộng lên $N = 200$):
    * **Nhóm Tier 1 – Small/Free ($70\%$ số thuê bao):** Mỗi thuê bao có $5–10$ người dùng, $3$ bảng Kanban (`boards`), $15$ danh sách (`lists`), $\sim 500$ thẻ công việc (`cards`), không dùng `custom_fields` phức tạp.
    * **Nhóm Tier 2 – Medium/Pro ($20\%$ số thuê bao):** Mỗi thuê bao có $25–50$ người dùng, $15$ bảng Kanban, $75$ danh sách, $\sim 5.000$ thẻ công việc, bật $3–5$ `custom_fields` trong `JSONB`.
    * **Nhóm Tier 3 – Large/Enterprise ($10\%$ số thuê bao):** Mỗi thuê bao có $100–250$ người dùng, $50$ bảng Kanban, $300$ danh sách, $\sim 50.000$ thẻ công việc, bật đầy đủ tính năng nâng cao (OpenFeature flags, `JSONB` custom fields, bình luận và tệp đính kèm MinIO).

#### 4.3.2. Quy trình Khởi tạo Dữ liệu Hạt giống Chuẩn hóa (Seed Data Generation)
* **Nội dung trọng tâm:**
  * Xây dựng bộ công cụ sinh dữ liệu tự động có tính tất định (Deterministic Seed Generator với `random_seed` cố định) để nạp tổng cộng $\sim 635.000$ bản ghi `cards`, hàng triệu bản ghi `card_comments` / `activity_logs` vào CSDL trước khi chạy thực nghiệm.
  * Sau khi nạp dữ liệu hạt giống, bắt buộc chạy lệnh `VACUUM ANALYZE` trên PostgreSQL để trình tối ưu hóa truy vấn (Query Planner) cập nhật chính xác thống kê phân phối dữ liệu (Histogram & Most Common Values – MCV) trước mọi lượt đo.

#### 4.3.3. Mô hình hóa Hành vi Người dùng và Tỷ lệ Tác vụ Đặc trưng của SaaS Kanban ($80\%$ Read / $20\%$ Write)
* **Nội dung trọng tâm:**
  * Khác với các hệ thống thương mại điện tử hay ngân hàng thuần giao dịch, hành vi sử dụng bảng Kanban cộng tác mang tính tương tác thị giác cao với **Tỷ lệ Đọc/Ghi chuẩn là $80\%$ Read / $20\%$ Write** (**Hình 4.2**):
    * **Nhóm Tác vụ Đọc ($80\%$ tổng lưu lượng):**
      * `W_READ_BOARD` ($45\%$): Tải toàn bộ cấu trúc bảng Kanban (Board Metadata + Lists + danh sách Cards đang hoạt động theo thứ tự `position` + cấu hình Feature Flags của thuê bao). Tác vụ này kiểm tra hiệu quả của Two-Tier Cache (`L1 Caffeine` / `L2 Redis`) và truy vấn kết hợp (Join/Index Scan).
      * `W_SEARCH_FILTER` ($20\%$): Tìm kiếm và lọc thẻ công việc theo người được giao (`assignee_id`), nhãn (`labels`), hạn chót (`due_date`) và thuộc tính tùy biến động (`custom_fields @> '{"priority": "CRITICAL"}'`). Tác vụ này đánh giá trực tiếp hiệu năng của PostgreSQL RLS kết hợp chỉ mục B-Tree và GIN Index.
      * `W_READ_CARD_DETAIL` ($15\%$): Xem chi tiết thẻ công việc, lịch sử hoạt động, bình luận và yêu cầu tạo liên kết tải tệp đính kèm (`Pre-signed GET URL` từ MinIO).
    * **Nhóm Tác vụ Ghi ($20\%$ tổng lưu lượng):**
      * `W_MOVE_CARD` ($10\%$): Kéo-thả thẻ công việc sang cột khác hoặc thay đổi vị trí (`PATCH /api/v1/cards/{id}/move`). Tác vụ này phát sinh giao dịch `UPDATE` kèm cơ chế xóa/cập nhật bộ nhớ đệm (`Cache Eviction`) theo khóa cô lập `tenant_{id}:board:{boardId}`.
      * `W_CREATE_UPDATE_CARD` ($7\%$): Tạo mới thẻ công việc hoặc cập nhật nội dung, thêm trường tùy biến `JSONB` (`POST/PUT /api/v1/cards`), kiểm tra ràng buộc `WITH CHECK` của RLS và hạn ngạch tính năng (OpenFeature).
      * `W_COMMENT_ATTACHMENT` ($3\%$): Thêm bình luận vào thẻ và yêu cầu cấp `Pre-signed PUT URL` để tải tệp đính kèm lên không gian tiền tố `tenants/{tenant_id}/boards/{board_id}/...` trên MinIO.

#### 4.3.4. Thiết kế Các Hình thái Giao thông Tải (Traffic Shapes)
* **Nội dung trọng tâm:**
  * Thiết kế 3 mẫu hình giao thông tải trong kịch bản `k6` (**Hình 4.3**):
    1. **Steady-State Load (Tải Nền Ổn định):** Duy trì số lượng người dùng ảo đồng thời (VUs) cố định trong 5–10 phút để đo độ trễ ổn định và mức tiêu thụ tài nguyên nền.
    2. **Step Ramp-Up Load (Tải Tăng Bậc thang):** Tăng dần cường độ tải từ $50 \rightarrow 100 \rightarrow 250 \rightarrow 500$ VUs để xác định điểm uốn hiệu năng (Knee of the Curve) và thông lượng cực đại trước khi vi phạm SLA ($p_{95} > 200\text{ ms}$).
    3. **Noisy Neighbor Spike/Flood Load (Tải Đột biến Láng giềng Ồn ào):** Trong khi $99$ thuê bao duy trì tải nền bình thường, 1 thuê bao (Aggressor Tenant) bất ngờ bắn lưu lượng đột biến gấp $15\times$–$20\times$ (ví dụ: chạy script cào dữ liệu hoặc vòng lặp gọi API lỗi) trong 120 giây để kiểm tra khả năng cô lập lỗi và tốc độ phục hồi (Recovery Time).

---

### 4.4. Hệ thống Quan sát Thực nghiệm và Khung Chỉ số Đánh giá Đa chiều (Telemetry & Evaluation Metrics Framework)

#### 4.4.1. Kiến trúc Thu thập Số liệu Không xâm lấn (Non-Intrusive Observability Stack)
* **Nội dung trọng tâm:**
  * Mô tả luồng thu thập dữ liệu đo lường (**Hình 4.4**):
    * **Phía Client-side (`k6`):** Ghi nhận chính xác thời gian phản hồi đầu-cuối (End-to-End HTTP Response Time), thông lượng (RPS), tỷ lệ lỗi HTTP ($4\text{xx}/5\text{xx}$), và phân tách thống kê theo từng nhóm thuê bao (` victim_tenants` vs. `noisy_tenant`) nhờ gắn thẻ (Tagging) trong kịch bản `k6`.
    * **Phía Application-side (`Micrometer` + `Prometheus`):** Thu thập các chỉ số nội tại của JVM và các lớp ranh giới đa thuê bao thông qua `TenantMetricsFilter` đã hiện thực ở Chương 3: thời gian thực thi từng lớp filter, tỷ lệ trúng/trượt bộ nhớ đệm L1 Caffeine (`cache_gets_total{result="hit|miss"}`), số lượng yêu cầu bị từ chối bởi Token Bucket (`rate_limit_rejected_total{tenant_id}`).
    * **Phía Database & Infrastructure-side (`pg_stat_statements` + `cAdvisor`):** Thu thập thời gian lập kế hoạch và thực thi câu lệnh SQL (Planning Time vs. Execution Time), tỷ lệ trúng bộ đệm `shared_buffers` của PostgreSQL, số lượng kết nối đang hoạt động (`pg_stat_activity`), cùng mức sử dụng `% CPU` và `Memory RSS` của từng container.

#### 4.4.2 – 4.4.5. Định nghĩa 4 Nhóm Chỉ số Đánh giá Cốt lõi
* **Nội dung trọng tâm:** Định nghĩa công thức toán học và ý nghĩa vật lý của từng nhóm chỉ số:
  1. **Nhóm Chỉ số An toàn Ranh giới (`B1`, `B2`):**
     * *Tỷ lệ Rò rỉ Dữ liệu Chéo (Cross-Tenant Data Leakage Rate – $LR$):*
       $$LR = \frac{\text{Số phản hồi chứa dữ liệu của } T_j \text{ khi xác thực là } T_i \text{ } (i \neq j)}{\text{Tổng số yêu cầu kiểm thử tấn công vượt ranh giới}} \times 100\%$$
       Yêu cầu bắt buộc (Hard Constraint): $LR = 0,00\%$ trong mọi kịch bản.
     * *Tỷ lệ Chặn Truy cập Trái phép (Unauthorized Access Block Rate – $BR$):* Phải đạt $100\%$ trước cả các lỗi lập trình cố ý (như truy vấn thiếu `WHERE tenant_id` nhờ chốt chặn PostgreSQL RLS `FORCE`).
  2. **Nhóm Chỉ số Hiệu năng và Độ trễ Phản hồi (`B3`):**
     * *Phân vị Độ trễ ($p_{50}, p_{95}, p_{99}$):* Giải thích tại sao trung bình cộng (Mean/Average) là chỉ số đánh lừa trong hệ thống đa thuê bao (do che giấu các điểm nghẽn đuôi dài), và tại sao $p_{95}, p_{99}$ mới phản ánh đúng cam kết chất lượng dịch vụ (SLA).
     * *Thông lượng Bão hòa (Sustained Throughput – RPS)* và *Hệ số Phóng đại Độ trễ Láng giềng (Victim Latency Amplification Factor – $LAF$)*:
       $$LAF_{p95} = \frac{p_{95}(\text{Victim Tenants khi có Noisy Neighbor})}{p_{95}(\text{Victim Tenants ở trạng thái Baseline})}$$
       Một kiến trúc cô lập hiệu năng tốt phải giữ $LAF_{p95} \approx 1,0 - 1,25$ ngay cả khi thuê bao ồn ào tấn công.
  3. **Nhóm Chỉ số Hiệu quả Tài nguyên và Mật độ Thuê bao (`B2`, `B3`):**
     * *Chi phí Bộ nhớ trên mỗi Thuê bao (Memory Footprint per Tenant – $\text{MB/Tenant}$)* và *Thời gian Khởi tạo Kết nối/Metadata CSDL*.
     * *Tỷ lệ Trúng Bộ nhớ đệm Hai tầng (L1/L2 Cache Hit Ratio – $CHR$)* dưới tác động của truy vấn quét lớn (Scan Pollution).
  4. **Nhóm Chỉ số Chi phí Vận hành và Độ linh hoạt Tùy biến (`B4`, `C4`):**
     * *Thời gian Cấp phát Thuê bao Mới (Tenant Onboarding Latency – $T_{\text{onboard}}$):* Thời gian từ lúc gọi API đăng ký thuê bao mới đến khi thuê bao đó tạo được bảng Kanban đầu tiên.
     * *Thời gian Nâng cấp Lược đồ Toàn hệ thống (Fleet-wide Schema Migration Time – $T_{\text{migrate}}(N)$):* Thời gian chạy Flyway migration để thêm một cột/bảng mới cho toàn bộ $N$ thuê bao.
     * *Chi phí Độ trễ Tùy biến Động (Customization Overhead – $\Delta L_{\text{custom}}$):* Độ trễ tăng thêm khi đánh giá quy tắc OpenFeature và truy vấn cột `JSONB` có chỉ mục GIN.

#### 4.4.6. Ma trận Tổng hợp Khung Đánh giá Thực nghiệm Đa chiều (Bảng 4.4)
* **Nội dung trọng tâm:** Thiết lập **Bảng 4.4** (tương đương Bảng 1 chuẩn mực trong phương pháp luận thực nghiệm) tổng hợp: Mã nhóm chỉ số, Tên chỉ số cụ thể, Đơn vị đo, Công cụ thu thập, Chiều ranh giới/Thách thức liên quan (`B1`–`B4`, `C1`–`C7`), và Ngưỡng mục tiêu cần đạt (Target SLA / Acceptance Criteria).

---

### 4.5. Thiết kế Chi tiết Các Kịch bản Thực nghiệm (`E1` – `E4`) và Quy trình Kiểm soát Sai số

#### 4.5.1. Kịch bản `E1`: Kiểm định Tính Toàn vẹn Ranh giới Bảo mật 4 Lớp và Chống Rò rỉ Dữ liệu Chéo (Giải quyết `RQ1`)
* **Mục tiêu:** Chứng minh thực nghiệm cơ chế *Defense-in-Depth* 4 lớp bảo vệ tuyệt đối ranh giới dữ liệu (`B1`, `B2`) trước cả các cuộc tấn công từ bên ngoài lẫn lỗi sơ suất của lập trình viên bên trong.
* **Thiết kế 5 ca kiểm thử tấn công và tiêm lỗi (Fault Injection & Penetration Test Cases):**
  * **Ca `E1.1` (Cross-Tenant IDOR via REST API):** Thuê bao $T_A$ sử dụng JWT hợp lệ của mình nhưng truyền `board_id` và `card_id` thuộc sở hữu của thuê bao $T_B$ vào các endpoint `GET/PUT/DELETE /api/v1/cards/{id}`.
  * **Ca `E1.2` (Header & Subdomain Spoofing):** Thuê bao $T_A$ gửi kèm JWT của $T_A$ nhưng cố tình ghi đè HTTP Header `X-Tenant-Id: tenant_B` hoặc truy cập qua subdomain `tenant-b.kanban.local` để đánh lừa bộ giải phân giải định danh.
  * **Ca `E1.3` (Developer Omit Error – Bỏ qua Bộ lọc Ứng dụng để Kiểm chứng Chốt chặn Cuối PostgreSQL RLS):** Cố tình tạo một endpoint nội bộ thực thi câu lệnh Native SQL `SELECT * FROM cards` (bỏ qua hoàn toàn `@TenantId` của Hibernate ở Tầng 9) trong khi biến phiên `app.current_tenant` đang là `tenant_A` (hoặc chưa được gán – `NULL`). Kiểm chứng xem chính sách RLS `ENABLE & FORCE` (với nguyên lý *Fail-Closed* trả về `0` dòng khi `app.current_tenant` rỗng) có chặn đứng rò rỉ dữ liệu hay không.
  * **Ca `E1.4` (Connection Pool Reuse & ThreadLocal Contamination Under Concurrency):** Chạy $200$ luồng đồng thời từ $50$ thuê bao khác nhau bắn liên tục $50.000$ yêu cầu qua hồ kết nối HikariCP chỉ có $20$ kết nối vật lý. Kiểm tra xem mỗi phản hồi trả về có khớp $100\%$ với `tenant_id` của người gọi hay không (chứng minh hiệu lực tự hủy của `SET LOCAL` khi kết thúc giao dịch và `finally { TenantContext.clear(); }`).
  * **Ca `E1.5` (Object Storage Prefix Traversal & Pre-signed URL Tampering):** Thuê bao $T_A$ yêu cầu tạo Pre-signed URL với đường dẫn chứa ký tự leo thang thư mục (`../tenant_B/attachment.pdf`) hoặc sửa đổi chữ ký URL của MinIO.
* **Đo lường chi phí bảo mật (Security Overhead Sub-test):** So sánh độ trễ truy vấn của `POOL_RLS` khi tắt RLS (chỉ lọc bằng `WHERE tenant_id` ở tầng ứng dụng) và khi bật đầy đủ RLS (`ENABLE + FORCE + SET LOCAL`) để lượng hóa chính xác chi phí mili-giây của lớp bảo mật thứ 4.

#### 4.5.2. Kịch bản `E2`: Đối sánh Định lượng 3 Chiến lược Cô lập Dữ liệu (`POOL_RLS` Cấp độ 1 vs. `SCHEMA_PER_TENANT` Cấp độ 2 vs. `SILO_DB` Cấp độ 4) (Giải quyết `RQ2`)
* **Mục tiêu:** Lượng hóa đường cong đánh đổi giữa Hiệu năng – Mật độ Thuê bao – Tiêu thụ Tài nguyên (Quy luật Đánh đổi 1) khi thay đổi độ dày ranh giới dữ liệu từ `Cấp độ 1` lên `Cấp độ 2` và `Cấp độ 4`.
* **Thiết kế ma trận thực nghiệm:**
  * **Biến độc lập 1 (Chiến lược Kiến trúc Dữ liệu):** Chuyển đổi lần lượt 3 chế độ cấu hình trên cùng hệ thống:
    1. `POOL_RLS` (Cấp độ 1 – Shared Table + PostgreSQL RLS).
    2. `SCHEMA_PER_TENANT` (Cấp độ 2 – Bridge: 1 Schema riêng biệt cho mỗi thuê bao trên cùng PostgreSQL Instance).
    3. `SILO_DB` (Cấp độ 4 – Silo: Database và Connection Pool riêng biệt cho từng thuê bao).
  * **Biến độc lập 2 (Quy mô Số lượng Thuê bao Đồng thời $N$):** Tăng dần số lượng thuê bao hoạt động từ $N = 10 \rightarrow 50 \rightarrow 100 \rightarrow 200$ thuê bao (với cường độ tải tổng từ $100$ đến $500$ VUs theo tỷ lệ $80\%$ Read / $20\%$ Write).
* **Các đại lượng thu thập:** Độ trễ $p_{50}, p_{95}, p_{99}$ (ms), Thông lượng (RPS), Bộ nhớ RAM tiêu thụ của PostgreSQL (đặc biệt là hiện tượng phình to bộ nhớ đệm danh mục hệ thống `pg_catalog` khi có hàng nghìn bảng trong mô hình `SCHEMA_PER_TENANT`), số lượng kết nối CSDL tiêu thụ và tỷ lệ lỗi quá tải kết nối (`Connection Timeout`).

#### 4.5.3. Kịch bản `E3`: Kiểm định Khả năng Kháng Hiệu ứng Láng giềng Ồn ào (Noisy Neighbor Resilience) (Giải quyết `RQ3`)
* **Mục tiêu:** Chứng minh hiệu quả của cơ chế Cô lập Hiệu năng Chủ động (Active Performance Isolation – Chiều ranh giới `B3`) thông qua sự kết hợp giữa **Token Bucket Rate Limiting** và **Two-Tier Cache (L1 Caffeine W-TinyLFU + L2 Redis)**.
* **Thiết kế 2 tiểu kịch bản thực nghiệm chuyên sâu:**
  * **Tiểu kịch bản `E3.1` (Chống Bão Yêu cầu API – API Burst Flooding):**
    * Thiết lập $99$ thuê bao bình thường (Victim Tenants) tạo tải ổn định $150$ RPS. Tại giây thứ $t = 60\text{s}$, thuê bao thứ $100$ (Noisy Tenant $T_{\text{noisy}}$) bất ngờ phát động cuộc tấn công ngập lụt với cường độ $1.000$ RPS liên tục trong $120\text{s}$, sau đó dừng lại ở $t = 180\text{s}$.
    * So sánh 2 cấu hình: **(A) Unprotected Baseline** (không có Rate Limiting theo thuê bao) và **(B) Protected Architecture** (bật bộ giới hạn Token Bucket phân tầng theo gói cước: Free $= 20$ req/s, Pro $= 100$ req/s, Enterprise $= 300$ req/s).
    * Đo lường chuỗi thời gian (Time-series) độ trễ $p_{95}, p_{99}$ và tỷ lệ thành công của nhóm $99$ thuê bao hiền lành trước, trong và sau cơn bão tải.
  * **Tiểu kịch bản `E3.2` (Chống Ô nhiễm Bộ nhớ đệm – Cache Scan Pollution):**
    * Trong khi các thuê bao bình thường truy cập lặp đi lặp lại các bảng Kanban đang làm việc (Working Set nóng), thuê bao $T_{\text{noisy}}$ liên tục thực hiện tác vụ xuất báo cáo/quét toàn bộ hàng chục nghìn thẻ công việc lịch sử (One-hit Wonders – dữ liệu chỉ đọc 1 lần duy nhất).
    * So sánh 3 cấu hình bộ nhớ đệm: **(1) Không dùng L1 Cache (Direct DB/L2)**, **(2) L1 Cache dùng thuật toán `LRU` truyền thống**, và **(3) L1 Cache Caffeine dùng thuật toán nhận thức tần suất `W-TinyLFU`** (đã thiết kế ở Chương 3).
    * Đo lường sự biến thiên của **Tỷ lệ Trúng Bộ nhớ đệm (Cache Hit Ratio – $\%$)** của các thuê bao bình thường và số lượng truy vấn bị đẩy xuống làm nghẽn PostgreSQL.

#### 4.5.4. Kịch bản `E4`: Đánh giá Chi phí Tùy biến Động và Vận hành Vòng đời Thuê bao (Giải quyết `RQ4`)
* **Mục tiêu:** Kiểm chứng Quy luật Đánh đổi 2 giữa khả năng tùy biến linh hoạt cho từng thuê bao (`B4`) và hiệu quả vận hành tập trung (`C3`, `C4`).
* **Thiết kế 2 tiểu kịch bản thực nghiệm:**
  * **Tiểu kịch bản `E4.1` (Đánh giá Chi phí Tùy biến Động OpenFeature & `JSONB` GIN Index):**
    * So sánh độ trễ truy vấn và cập nhật thẻ công việc (`cards`) trong 3 trường hợp: (a) Chỉ truy vấn các cột quan hệ cố định (Standard Relational Columns), (b) Truy vấn kết hợp đánh giá cờ tính năng OpenFeature + lọc trên cột `custom_fields` kiểu `JSONB` **không có** chỉ mục GIN, và (c) Truy vấn kết hợp OpenFeature + lọc trên cột `JSONB` **có** chỉ mục GIN (`jsonb_path_ops`).
  * **Tiểu kịch bản `E4.2` (Đối sánh Tốc độ Onboarding Thuê bao Mới và Schema Migration Toàn Hệ thống):**
    * Đo thời gian cấp phát tự động 1 thuê bao mới ($T_{\text{onboard}}$) và thời gian chạy kịch bản nâng cấp lược đồ CSDL (thêm 1 bảng mới và 2 cột mới bằng Flyway) khi hệ thống đang có $N \in \{10, 50, 100, 200\}$ thuê bao giữa 3 chiến lược: `POOL_RLS` (chỉ chạy DDL 1 lần duy nhất trên bảng dùng chung, độ phức tạp $\mathcal{O}(1)$) so với `SCHEMA_PER_TENANT` và `SILO_DB` (phải lặp DDL qua toàn bộ $N$ schema/database, độ phức tạp $\mathcal{O}(N)$).

#### 4.5.5. Giao thức Thực thi Thực nghiệm Chuẩn hóa và Kiểm soát Nhiễu Thống kê
* **Nội dung trọng tâm:**
  * Để loại bỏ sai số do cơ chế biên dịch động của JVM (JIT Compilation) và bộ nhớ đệm lạnh (Cold Cache), mọi lượt chạy thực nghiệm đều tuân thủ nghiêm ngặt **Giao thức 4 Giai đoạn (4-Phase Execution Protocol)** (**Hình 4.5**):
    1. **Environment Reset & Database Pre-condition (60s):** Khởi động lại sạch trạng thái bộ nhớ đệm, khôi phục snapshot dữ liệu hạt giống và chạy `VACUUM ANALYZE`.
    2. **JVM & Cache Warm-up Phase (120s):** Chạy tải làm nóng ở mức $30\%$ công suất để JVM C2 JIT Compiler tối ưu hóa mã máy và nạp các trang chỉ mục nóng vào `shared_buffers` (không ghi nhận số liệu trong giai đoạn này).
    3. **Steady-State Measurement Window (300s):** Thu thập dữ liệu thực nghiệm chính thức với tần suất lấy mẫu 1 giây/lần.
    4. **Cooldown & Telemetry Aggregation (60s):** Giảm tải về $0$, trích xuất báo cáo JSON/CSV từ `k6`, Prometheus và `pg_stat_statements`.
  * Mỗi kịch bản được lặp lại độc lập **$n = 5$ lần**; kết quả báo cáo ở Chương 5 sẽ trình bày giá trị trung bình mẫu ($\mu$) kèm độ lệch chuẩn ($\sigma$) để đảm bảo độ tin cậy thống kê.

---

### 4.6. Tiểu kết Chương 4 (Closing Summary & Transition to Chapter 5)
* **Nội dung trọng tâm:**
  * Tóm tắt lại toàn bộ thiết lập môi trường kiểm thử chuẩn hóa (Docker `cgroups` pinning), mô hình tải Kanban phân tầng theo phân phối Pareto ($80\%$ Read / $20\%$ Write), hệ thống chỉ số đo lường đa chiều (Bảng 4.4) và 4 nhóm kịch bản thực nghiệm (`E1`–`E4`).
  * Khẳng định rằng phương pháp luận thực nghiệm đã được thiết kế chặt chẽ, loại bỏ các thiên kiến cấu hình và nhiễu nền hệ thống, tạo tiền đề khách quan để **Chương 5** trình bày kết quả đo lường định lượng, kiểm định các giả thuyết nghiên cứu và bàn luận sâu về ý nghĩa kiến trúc.

---

## PHẦN IV. DANH MỤC HÌNH VẼ VÀ BẢNG BIỂU DỰ KIẾN CỦA CHƯƠNG 4

### 1. Danh mục Hình vẽ (Figures)
* **Hình 4.1:** Kiến trúc Tô-pô Môi trường Thực nghiệm (Experimental Testbed Topology) với sự tách biệt giữa Cụm Sinh tải/Quan sát (`k6`, Prometheus, Grafana) và Cụm Hệ thống Kiểm thử (SUT: Nginx, Spring Boot, PostgreSQL 16, Redis 7, MinIO) được đóng khung tài nguyên qua Docker `cgroups`.
* **Hình 4.2:** Biểu đồ Phân bố Tỷ lệ Tác vụ Nghiệp vụ Đặc trưng của Nền tảng SaaS Kanban ($80\%$ Read / $20\%$ Write) và Phân tầng Kích thước Thuê bao theo Quy luật Pareto ($70\%$ Small – $20\%$ Medium – $10\%$ Enterprise).
* **Hình 4.3:** Đồ thị Mô tả 3 Hình thái Giao thông Tải Thực nghiệm (Steady-State Load, Step Ramp-Up Load, và Noisy Neighbor Burst/Flood Spike).
* **Hình 4.4:** Kiến trúc Thu thập Số liệu Quan sát Đa tầng Không xâm lấn (End-to-End Telemetry Pipeline từ `k6` Client, `Micrometer` JVM/Tenant Filter đến `pg_stat_statements` và `cAdvisor`).
* **Hình 4.5:** Lưu đồ Giao thức Thực thi Thực nghiệm 4 Giai đoạn (Reset & `VACUUM ANALYZE` $\rightarrow$ JVM/Cache Warm-up 120s $\rightarrow$ Measurement Window 300s $\rightarrow$ Cooldown & Statistical Aggregation) lặp lại $n = 5$ lần.

### 2. Danh mục Bảng biểu (Tables)
* **Bảng 4.1:** Ma trận Ánh xạ Câu hỏi Nghiên cứu (`RQ1`–`RQ4`) với Giả thuyết Đánh đổi, 4 Chiều Ranh giới (`B1`–`B4`), 7 Thách thức (`C1`–`C7`) và Kịch bản Thực nghiệm (`E1`–`E4`).
* **Bảng 4.2:** Đặc tả Cấu hình Phần cứng, Phiên bản Phần mềm và Tham số Giới hạn Tài nguyên Container (`cgroups` CPU/Memory Pinning) của Môi trường Kiểm thử.
* **Bảng 4.3:** Cấu trúc Phân tầng Thuê bao (Tier 1 Small, Tier 2 Medium, Tier 3 Enterprise) và Quy mô Bộ Dữ liệu Hạt giống Chuẩn hóa (Seed Data Specification).
* **Bảng 4.4:** Khung Chỉ số Đánh giá Thực nghiệm Đa chiều (Multi-Dimensional Evaluation Framework: Chỉ số Bảo mật, Hiệu năng, Tài nguyên, Vận hành, Công cụ đo và Ngưỡng Chấp nhận SLA).
* **Bảng 4.5:** Bảng Tổng hợp Ma trận Thiết kế Tham số của 4 Nhóm Kịch bản Thực nghiệm (`E1` – `E4`).

# **DÀN Ý CHI TIẾT VÀ CẨM NANG TRIỂN KHAI NỘI DUNG CHƯƠNG 3**
# **CHƯƠNG 3: PHÂN TÍCH, THIẾT KẾ VÀ HIỆN THỰC HÓA HỆ THỐNG QUẢN LÝ CÔNG VIỆC ĐA THUÊ BAO (MULTI-TENANT SAAS KANBAN PLATFORM)**

> **Tài liệu cơ sở đối chiếu và bảo đảm tính nhất quán xuyên suốt:**
> 1. `resources/Tong_hop_Dieu_chinh_Kiem_tra_So_do_va_Noi_dung_Chuong_1.md` *(Chuẩn hóa Bộ ba khái niệm Tenant – Service – Instance, 5 Đặc trưng kiến trúc cốt lõi, Ngăn xếp 9 tầng Cloud-Native Figure 2 mới, Bốn chiều Ranh giới Thuê bao B1–B4, Phổ 5 cấp độ độ dày ranh giới từ Cấp độ 1 mỏng nhất đến Cấp độ 5 dày nhất, và 7 Thách thức cốt lõi C1–C7 tại Bảng 1.3)*.
> 2. `resources/Tong_hop_Dieu_chinh_Kiem_tra_So_do_va_Noi_dung_Chuong_2.md` *(Chuẩn hóa khái niệm Tách – Gộp, Hai trục phân tích kiến trúc, Hệ quy ước biểu diễn hai cấp độ, 4 mô hình Silo/Pool/Bridge/Hybrid, 4 cơ chế thực thi lúc chạy tại Mục 2.5, Cây quyết định Hình 2.16 và Cấu hình định vị kiến trúc 9 tầng của nền tảng SaaS Kanban tại Mục 2.6.3 – Bảng 2.8 & Bảng 2.9)*.

---

## **PHẦN I: ĐỊNH VỊ HỌC THUẬT, TÍNH NHẤT QUÁN LIÊN CHƯƠNG VÀ PHƯƠNG PHÁP LUẬN CỦA CHƯƠNG 3**

### **1.1. Vai trò "Bản lề Thực nghiệm" của Chương 3 trong Chuỗi Logic 5 Chương**

Trong tổng thể đề tài nghiên cứu khoa học, nếu **Chương 1** xây dựng hệ quy chiếu lý thuyết và mô hình hóa khái niệm, **Chương 2** giải phẫu không gian kiến trúc và xác lập các cơ chế kỹ thuật bảo vệ vách ngăn, thì **Chương 3** đóng vai trò là **Không gian Hiện thực hóa Kỹ nghệ (Engineering Realization & Architectural Synthesis)**. Mục tiêu cốt lõi của Chương 3 không phải là mô tả một đồ án lập trình ứng dụng web thông thường, mà là **chứng minh khả năng chuyển hóa toàn bộ các mô hình lý thuyết và quyết định kiến trúc ở Chương 1 & Chương 2 thành một nguyên mẫu hệ thống SaaS Kanban hoàn chỉnh, chuẩn mực và có thể đo kiểm định lượng ở Chương 4 & Chương 5**.

Để đảm bảo tính nhất quán tuyệt đối với Chương 1 và Chương 2 vừa hoàn thiện, dàn ý Chương 3 tuân thủ nghiêm ngặt **5 nguyên tắc đồng bộ cốt lõi**:
1. **Đồng bộ Hệ thống 9 Tầng Ngăn xếp Cloud-Native (Figure 2 mới):** Xuyên suốt Chương 3, mọi sơ đồ và bảng biểu ánh xạ kiến trúc đều tuân thủ chính xác thứ tự 9 tầng từ đáy lên đỉnh đã chuẩn hóa ở Chương 1 (Mục 5.3) và Chương 2 (Mục 2.1.2 & Mục 2.3):
   * *Phân vùng Hạ tầng Nền tảng (Khung nét đứt – Tầng 1 đến Tầng 3):* **Tầng 1** (Phần cứng Vật lý – *Physical Hardware*), **Tầng 2** (Hạ tầng Mạng – *Network Infrastructure*), **Tầng 3** (Ảo hóa & Container – *Virtualization & Container Runtime*).
   * *Phân vùng Nhận thức Thuê bao (Khung nét liền – Tầng 4 đến Tầng 9):* **Tầng 4** (Lưu trữ Đám mây – *Cloud Storage*), **Tầng 5** (Hệ Quản trị CSDL – *DBMS Instance*), **Tầng 6** (Cơ sở Dữ liệu Logic – *Logical Database & Schema*), **Tầng 7** (Phần mềm Trung gian – *Middleware*), **Tầng 8** (Thực thi Ứng dụng – *Application Runtime*), **Tầng 9** (Mã nguồn & Cấu hình Logic – *Application Code & Logical Configuration*).
2. **Đồng bộ Bốn Chiều Ranh giới (B1 – B4) và Phổ Độ dày Ranh giới (Cấp độ 1 $\rightarrow$ Cấp độ 5):**
   * Toàn bộ các mô-đun bảo vệ hệ thống ở Mục 3.4 được tổ chức khớp 100% với **4 Chiều Ranh giới Thuê bao**: **Chiều B1** (*Nhận diện & Xác thực*), **Chiều B2** (*Cô lập Dữ liệu*), **Chiều B3** (*Cô lập Hiệu năng*) và **Chiều B4** (*Cô lập Cấu hình & Tùy biến*).
   * Thang đo độ dày ranh giới giữ nguyên chiều tăng dần trực quan của Chương 1 và Chương 2: từ **Cấp độ 1 (Mỏng nhất – Ranh giới logic câu lệnh/dòng bản ghi RLS)**, **Cấp độ 2 (Ranh giới không gian tên Schema/Cache/Queue)**, **Cấp độ 3 (Ranh giới tiến trình & Container)**, **Cấp độ 4 (Ranh giới máy ảo, mạng ảo & DBMS riêng)** đến **Cấp độ 5 (Dày nhất – Ranh giới phần cứng vật lý)**.
3. **Đồng bộ Bảy Thách thức Cốt lõi (C1 – C7):** Các Yêu cầu Phi chức năng (NFRs) ở Mục 3.1.3 và bảng truy vết cuối chương (Mục 3.6.2) khóa chặt theo đúng mã định danh **C1 đến C7** đã thiết lập tại Bảng 1.3 (Chương 1) và Bảng 2.9 (Chương 2).
4. **Đồng bộ Định vị Kiến trúc Hệ thống SaaS Kanban (Hạt nhân *Full-Stack Pool + Defense-in-Depth* kết hợp *Khả năng Định tuyến Phân tầng Đa chế độ*):**
   * Bám sát **Mục 2.6.3 (Bảng 2.8) của Chương 2**, hệ thống SaaS Kanban lấy **Mô hình *Full-Stack Pool* được gia cố bằng hệ thống Phòng thủ Chiều sâu 4 lớp (Cấp độ 1)** làm hạt nhân vận hành trọng tâm (nơi thử thách khắc nghiệt nhất về kỹ thuật phần mềm).
   * Đồng thời, để hiện thực hóa nhánh mở rộng phân tầng của **Cây Quyết định (Hình 2.16 Chương 2)** và phục vụ trực tiếp bài toán **Benchmark đối sánh thực nghiệm ở Chương 4 & Chương 5**, tầng truy cập dữ liệu của hệ thống được thiết kế theo mẫu **Định tuyến Đa chiến lược (*Multi-Strategy Data Router*)**, hỗ trợ vận hành và đo kiểm cả 3 chế độ cô lập: `SHARED_POOL_RLS` (Cấp độ 1 – Mặc định cho gói *Free/Pro*), `SCHEMA_PER_TENANT` (Cấp độ 2 – Mô hình *Bridge* cho gói *Business/Pro nâng cao*), và `DEDICATED_SILO_DB` (Cấp độ 4 – Mô hình *Silo DB* cho gói *Enterprise VIP*).
5. **Đồng bộ Văn phong Dẫn dắt và Bàn luận Học thuật:** Mỗi mục lớn và tiểu mục trong Chương 3 đều có đoạn dẫn nhập giải thích lý do xuất hiện, câu chuyển ý nối mạch giữa các tầng/mô-đun và đoạn bàn luận đánh giá ý nghĩa kỹ thuật.

---

## **PHẦN II: CẤU TRÚC DÀN Ý TỔNG QUÁT CỦA CHƯƠNG 3 (MASTER OUTLINE)**

```text
CHƯƠNG 3: PHÂN TÍCH, THIẾT KẾ VÀ HIỆN THỰC HÓA HỆ THỐNG QUẢN LÝ CÔNG VIỆC ĐA THUÊ BAO (MULTI-TENANT SAAS KANBAN PLATFORM)
│
├── Mở đầu Chương 3: Dẫn nhập từ Bản thiết kế Kiến trúc (Chương 2) sang Bài toán Kỹ nghệ Hệ thống Thực nghiệm
│
├── 3.1. Xác định Bài toán và Phân tích Yêu cầu Hệ thống theo Hướng Dịch vụ SaaS
│   ├── 3.1.1. Bối cảnh Nghiệp vụ Quản lý Công việc Kanban, Tiếp cận "Ngoài–Vào" (Outside-In) và Phân khúc Thuê bao (Bảng 3.1, Hình 3.1)
│   ├── 3.1.2. Phân tích Yêu cầu Chức năng theo Hai Mặt phẳng Kiến trúc: Control Plane và Data/Application Plane (Hình 3.2, Hình 3.3)
│   └── 3.1.3. Đặc tả Yêu cầu Phi chức năng (NFRs) Ánh xạ từ 7 Thách thức Cốt lõi (C1–C7) và 4 Chiều Ranh giới (B1–B4) (Bảng 3.2)
│
├── 3.2. Tổng hợp Kiến trúc Hệ thống, Mô hình hóa Ngăn xếp 9 Tầng và Biện luận Ngăn xếp Công nghệ
│   ├── 3.2.1. Thực thi Cây Quyết định Kiến trúc: Hạt nhân Full-Stack Pool Phòng thủ Chiều sâu và Mở rộng Phân tầng Đa chế độ (Hình 3.4)
│   ├── 3.2.2. Ánh xạ Hệ thống SaaS Kanban lên Ngăn xếp 9 Tầng Cloud-Native và Định vị Độ dày Ranh giới (Hình 3.5, Bảng 3.3)
│   └── 3.2.3. Phương pháp luận "Kỹ thuật Thực thi Ranh giới Quyết định Công nghệ" (Techniques -> Tech Stack) và Kiến trúc Triển khai (Bảng 3.4, Hình 3.6)
│
├── 3.3. Thiết kế Chi tiết Kiến trúc Thành phần, Luồng Xử lý và Cơ sở Dữ liệu Đa thuê bao
│   ├── 3.3.1. Kiến trúc Thành phần Tổng thể và Vòng đời Xử lý Yêu cầu Xuyên suốt (End-to-End Request Lifecycle) (Hình 3.7)
│   ├── 3.3.2. Thiết kế Lược đồ Cơ sở Dữ liệu Mặt phẳng Điều khiển (Control Plane Catalog Schema) (Hình 3.8)
│   ├── 3.3.3. Thiết kế Lược đồ Cơ sở Dữ liệu Mặt phẳng Nghiệp vụ Kanban (Data Plane Schema) và Chiến lược Chỉ mục theo Thuê bao (Hình 3.9)
│   └── 3.3.4. Thiết kế Mô hình Dữ liệu Tùy biến Động (JSONB Custom Fields & GIN Index) và Bộ Định tuyến Dữ liệu Đa chế độ (Bảng 3.5, Hình 3.10)
│
├── 3.4. Hiện thực hóa Bốn Hệ thống Kỹ thuật Bảo vệ Ranh giới Thuê bao Lúc chạy (B1 – B4)
│   ├── 3.4.1. Hiện thực hóa Chiều B1 (Ranh giới Nhận diện & Ngữ cảnh): JWT AuthFilter, TenantContext cô lập luồng và Dọn dẹp finally (Hình 3.11)
│   ├── 3.4.2. Hiện thực hóa Chiều B2 (Ranh giới Cô lập Dữ liệu & Lưu trữ): PostgreSQL RLS Kép (ENABLE/FORCE), Giao dịch SET LOCAL và MinIO Pre-signed URL
│   ├── 3.4.3. Hiện thực hóa Chiều B3 (Ranh giới Cô lập Hiệu năng): Bộ nhớ đệm Hai tầng (L1 Caffeine W-TinyLFU + L2 Redis) và Token Bucket Rate Limiting (Bảng 3.6)
│   └── 3.4.4. Hiện thực hóa Chiều B4 (Ranh giới Cấu hình & Tùy biến Động): Công cụ Đánh giá Cờ tính năng OpenFeature và Tùy biến Giao diện/Quy trình
│
├── 3.5. Hiện thực hóa Vận hành Vòng đời Tự động và Khả năng Quan sát Nhận thức Thuê bao
│   ├── 3.5.1. Động cơ Khởi tạo Thuê bao Tự phục vụ (Automated Onboarding Engine) và Di trú Lược đồ Không gián đoạn (Flyway Pipeline) (Hình 3.12)
│   └── 3.5.2. Hiện thực hóa Khả năng Quan sát theo Thuê bao (Tenant-Aware Telemetry: Logs, Metrics) và Minh họa Nguyên mẫu Hệ thống (Hình 3.13)
│
├── 3.6. Tổng kết Chương 3 và Ma trận Đối soát Chuyển giao sang Chương 4 & Chương 5
│   ├── 3.6.1. Đánh giá Mức độ Trưởng thành Kiến trúc của Hệ thống (Đối chiếu Mô hình Chong & Carraro)
│   └── 3.6.2. Bảng Ma trận Đối soát Truy vết Xuyên suốt (Chương 1 -> Chương 2 -> Chương 3 -> Chương 4 & 5) (Bảng 3.7)
│
└── Tài liệu Tham khảo Chương 3
```

---

## **PHẦN III: ĐẶC TẢ CHI TIẾT NỘI DUNG VÀ HƯỚNG DẪN TRIỂN KHAI TỪNG MỤC**

### **Mở đầu Chương 3 (Đoạn dẫn nhập chương)**
* **Mục đích:** Tạo cầu nối chuyển tiếp mượt mà từ cuối Chương 2 (Mục 2.6.3 & Bảng 2.9) sang Chương 3.
* **Nội dung triển khai:** Khẳng định rằng sau khi đã xác lập khung lý thuyết (Chương 1) và định vị cấu hình kiến trúc mục tiêu thông qua Cây quyết định 4 nút cùng 4 cơ chế kỹ thuật cốt lõi (Chương 2), nhiệm vụ của Chương 3 là hiện thực hóa bản thiết kế đó thành một nền tảng phần mềm thực tế: **Nền tảng Quản lý Công việc Đa thuê bao theo phương pháp Kanban (*Multi-Tenant SaaS Kanban Platform*)**. Giới thiệu cấu trúc 6 mục của chương đi theo quy trình kỹ nghệ phần mềm chuẩn mực: từ phân tích yêu cầu hướng dịch vụ thị trường (Mục 3.1), tổng hợp kiến trúc 9 tầng và biện luận công nghệ (Mục 3.2), thiết kế chi tiết thành phần và cơ sở dữ liệu (Mục 3.3), hiện thực hóa 4 hệ thống bảo vệ ranh giới B1–B4 (Mục 3.4), tự động hóa vòng đời và đo lường quan sát (Mục 3.5), đến đóng gói chuyển giao cho thực nghiệm (Mục 3.6).

---

### **Mục 3.1. Xác định Bài toán và Phân tích Yêu cầu Hệ thống theo Hướng Dịch vụ SaaS**

* **Đoạn dẫn nhập Mục 3.1:** Giải thích sự khác biệt căn bản giữa phân tích yêu cầu cho phần mềm đơn chiếc (*Bespoke Software* – phỏng vấn một khách hàng cố định) và phân tích yêu cầu cho nền tảng SaaS đa thuê bao (*Market-Driven SaaS Requirements Engineering – MDRE*). Trong mô hình SaaS, khách hàng không mua mã nguồn mà đăng ký sử dụng các **Gói Dịch vụ (*Service Tiers*)**, đòi hỏi quá trình phân tích phải đi từ khảo sát thị trường ngoài–vào (*Outside-In*), phân khúc thuê bao và tách bạch hệ thống thành hai mặt phẳng chức năng.

#### **3.1.1. Bối cảnh Nghiệp vụ Quản lý Công việc Kanban, Tiếp cận "Ngoài–Vào" (*Outside-In*) và Phân khúc Thuê bao**
* **Nội dung cốt lõi:**
  1. **Đặc trưng miền bài toán Quản lý công việc Kanban:** Trực quan hóa luồng công việc qua Không gian làm việc (*Workspace* – tương ứng 1 đơn vị Thuê bao *Tenant*), Bảng (*Board*), Cột trạng thái (*Column/List*), Thẻ công việc (*Card/Task*), Giới hạn công việc đang làm (*Work-In-Progress – WIP Limit*), kéo thả vị trí thời gian thực (*Fractional Indexing / LexoRank ordering*), bình luận, tệp đính kèm và nhật ký hoạt động (*Activity/Audit Log*).
  2. **Phân khúc Khách hàng Thuê bao và Đóng gói Danh mục Dịch vụ (*Tiered Service Catalog*):** Khảo sát nhu cầu thực tế từ các nền tảng chuẩn công nghiệp (Jira Cloud, Trello, Linear) để chia tập khách hàng thành 3 phân khúc gói cước với các điểm biến đổi (*Variability Points*) về hạn mức, tính năng tùy biến và độ dày ranh giới cô lập:
     * **Gói Miễn phí (*Free Tier* – Đội nhóm nhỏ / Cá nhân):** Giới hạn tối đa 3 bảng Kanban, 50 thẻ/bảng, 5 thành viên; không bật *WIP Limit* nâng cao và không bật *Custom Fields*; vận hành hoàn toàn trên phân vùng **Hạt nhân Gộp (`SHARED_POOL_RLS` – Ranh giới Cấp độ 1)**.
     * **Gói Chuyên nghiệp (*Pro / Business Tier* – Doanh nghiệp vừa và nhỏ SMB / Startup):** Mở khóa không giới hạn bảng, bật kiểm soát *WIP Limit* theo cột, tùy biến nhận diện thương hiệu (*Workspace Branding*) và trường dữ liệu mở rộng cơ bản; vận hành mặc định trên phân vùng **Gộp có bảo vệ chiều sâu (`SHARED_POOL_RLS` – Cấp độ 1)** với hạn mức *Rate Limit* cao, đồng thời hỗ trợ tùy chọn phân vùng **Tách Lược đồ (`SCHEMA_PER_TENANT` – Mô hình *Bridge* Cấp độ 2)** để phục vụ sao lưu độc lập và đối sánh thực nghiệm.
     * **Gói Doanh nghiệp (*Enterprise Tier* – Tập đoàn / Tổ chức quy mô lớn):** Mở khóa toàn bộ tính năng cao cấp (*Custom Fields* động với chỉ mục tìm kiếm nhanh, quy trình phê duyệt thẻ việc *Approval Workflow*, nhật ký kiểm toán *Audit Log* dài hạn, dung lượng tệp đính kèm lớn); hỗ trợ định tuyến sang phân vùng **Tách Cơ sở Dữ liệu Độc lập (`DEDICATED_SILO_DB` – Ranh giới Cấp độ 3–4)**.
* **Bảng biểu & Sơ đồ đi kèm:**
  * **Bảng 3.1:** *Ma trận phân tích phân khúc thuê bao, danh mục gói dịch vụ SaaS Kanban (Free, Pro, Enterprise) và ánh xạ chiến lược cô lập.*
  * **Hình 3.1:** *Sơ đồ tiến trình Kỹ nghệ Yêu cầu Hướng Dịch vụ SaaS Ngoài–Vào (Market-Driven Outside-In Service Engineering).*

#### **3.1.2. Phân tích Yêu cầu Chức năng theo Hai Mặt phẳng Kiến trúc (*Control Plane* và *Data/Application Plane*)**
* **Nội dung cốt lõi:**
  * Giải thích vì sao một hệ thống SaaS đa thuê bao bắt buộc phải phân tách chức năng thành **Hai mặt phẳng kiến trúc** (kế thừa từ Mục 2.2.1 Chương 2) thay vì gộp chung như ứng dụng truyền thống:
    1. **Nhóm Dịch vụ Mặt phẳng Điều khiển (*Control Plane Services* – Dành cho Quản trị viên Nền tảng & Luồng Tự phục vụ):**
       - *Dịch vụ Đăng ký & Khởi tạo Thuê bao Tự động (Tenant Onboarding & Provisioning Service):* Tiếp nhận đăng ký tổ chức mới, cấp phát định danh `tenant_id`, định cấu hình phân vùng lưu trữ (`placement_strategy`) và khởi tạo dữ liệu hạt giống.
       - *Dịch vụ Quản trị Gói cước & Cờ tính năng (Subscription & Feature Governance Service):* Quản lý vòng đời gói cước (*Free $\leftrightarrow$ Pro $\leftrightarrow$ Enterprise*), cập nhật tập quy tắc *OpenFeature Ruleset* và hạn mức *Quota* thời gian thực.
       - *Dịch vụ Giám sát & Định lượng Tiêu thụ (Tenant Metering & Observability Service):* Theo dõi số lượng người dùng, số bảng/thẻ, dung lượng lưu trữ MinIO và lưu lượng API theo từng `tenant_id`.
    2. **Nhóm Dịch vụ Mặt phẳng Dữ liệu Nghiệp vụ (*Data / Application Plane Services* – Dành cho Người dùng Thuê bao):**
       - *Dịch vụ Quản trị Không gian làm việc & Phân quyền Đa cấp (Workspace & Tenant-Scoped IAM Service):* Quản lý thành viên trong tổ chức, phân quyền hai lớp (`tenant_id` $\to$ vai trò `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
       - *Dịch vụ Lõi Quản lý Bảng & Thẻ Kanban (Core Kanban Board, List & Card Service):* Thực thi các thao tác CRUD bảng/cột/thẻ, thuật toán kéo thả sắp xếp vị trí thẻ, kiểm tra ràng buộc *WIP Limit* lúc chạy.
       - *Dịch vụ Tùy biến Động theo Thuê bao (Tenant Customization Service):* Quản lý siêu dữ liệu giao diện (*Theme/Branding*), định nghĩa và lưu trữ trường dữ liệu mở rộng (*Custom Fields*) và quy tắc tự động hóa/phê duyệt.
       - *Dịch vụ Lưu trữ Đính kèm & Cộng tác Thời gian thực (Attachment & Real-Time Collaboration Service):* Cấp phát *Pre-signed URL* tải tệp đính kèm theo tiền tố thuê bao và phát thông báo cập nhật bảng Kanban.
* **Sơ đồ đi kèm:**
  * **Hình 3.2:** *Sơ đồ cây phân rã chức năng hệ thống SaaS Kanban theo Hai Mặt phẳng Kiến trúc (Control Plane vs. Data Plane).*
  * **Hình 3.3:** *Sơ đồ Use Case tổng quát và phân quyền tác nhân đa cấp (Platform Admin, Tenant Owner/Admin, Project Member, Viewer).*

#### **3.1.3. Đặc tả Yêu cầu Phi chức năng (NFRs) Ánh xạ từ 7 Thách thức Cốt lõi (C1–C7) và 4 Chiều Ranh giới (B1–B4)**
* **Nội dung cốt lõi:** Chuyển hóa trực tiếp 7 thách thức lý thuyết (**C1 $\rightarrow$ C7**) của Chương 1 thành 7 nhóm Yêu cầu Phi chức năng định lượng được (**NFR-1 $\rightarrow$ NFR-7**) gắn với các ngưỡng cam kết chất lượng mục tiêu (*SLO / Target Benchmarks*) để làm tiêu chuẩn kiểm định cho Chương 4 và Chương 5:
  * `NFR-1 (Ánh xạ C1 & Chiều B1, B2 – Cô lập Dữ liệu Tuyệt đối):` Đảm bảo $0\%$ tỷ lệ rò rỉ dữ liệu đọc/ghi chéo giữa các thuê bao trước mọi kịch bản tấn công sửa đổi tham số IDOR, giả mạo Header hoặc bỏ sót điều kiện lọc ở tầng ứng dụng.
  * `NFR-2 (Ánh xạ C2 & Chiều B3 – Cô lập Hiệu năng & Chống Noisy Neighbor):` Đảm bảo khi một thuê bao phát sinh tải đột biến vượt hạn mức, các yêu cầu vượt ngưỡng bị chặn ngay tại tầng biên (HTTP `429 Too Many Requests`), giữ cho độ suy giảm độ trễ phân vị $p_{95}$ của các thuê bao bình thường lân cận ở mức tối thiểu, đồng thời duy trì tỷ lệ trúng bộ nhớ đệm L1 trước tác vụ quét dữ liệu hàng loạt.
  * `NFR-3 (Ánh xạ C3 & Chiều B4 – Tùy biến Động Không Phân nhánh Mã nguồn):` 100% các gói cước (*Free, Pro, Enterprise*) vận hành trên cùng một bản đóng gói mã nguồn duy nhất (*Single Artifact*); thời gian đồng bộ thay đổi cờ tính năng hoặc nâng cấp gói cước trên toàn cụm đạt mức $< 100\text{ ms}$ qua cơ chế xóa bộ nhớ đệm Pub/Sub mà không cần khởi động lại tiến trình.
  * `NFR-4 (Ánh xạ C4 – Tự động hóa Vòng đời & Khởi tạo Nhanh):` Thời gian khởi tạo hoàn chỉnh một không gian làm việc mới (*Self-Service Onboarding*) ở chế độ `POOL_RLS` đạt $< 500\text{ ms}$ và ở chế độ `SCHEMA_PER_TENANT` đạt $< 3.000\text{ ms}$; hỗ trợ di trú lược đồ CSDL tự động.
  * `NFR-5 (Ánh xạ C5 – Khả năng Quan sát Nhận thức Thuê bao):` 100% các bản ghi nhật ký hệ thống (*Structured Logs*) và chỉ số đo lường hiệu năng (*Prometheus Metrics*) phải mang nhãn ngữ cảnh `tenant_id` và `tier`.
  * `NFR-6 (Ánh xạ C6 – Tuân thủ, Kiểm toán & Đa chiến lược Lưu trữ):` Ghi nhận đầy đủ nhật ký kiểm toán (*Tenant Audit Trail*) cho các thao tác nhạy cảm và hỗ trợ định tuyến linh hoạt thuê bao vào các chế độ lưu trữ khác nhau theo yêu cầu tuân thủ.
  * `NFR-7 (Ánh xạ C7 – Thiết kế Đóng an toàn & Kiểm thử Tự động):` Áp dụng triệt để nguyên lý *Fail-Closed* (mặc định trả về 0 bản ghi hoặc từ chối truy cập nếu ngữ cảnh `tenant_id` bị rỗng/lỗi) và đi kèm bộ kiểm thử tự động kiểm chứng vách ngăn.
* **Bảng biểu đi kèm:**
  * **Bảng 3.2:** *Bảng đặc tả Yêu cầu Phi chức năng (NFR-1 đến NFR-7) đối chiếu với 7 Thách thức Chương 1 (C1–C7), 4 Chiều Ranh giới (B1–B4) và Chỉ số Đo kiểm Mục tiêu.*
* **Đoạn bàn luận cuối Mục 3.1:** Nhấn mạnh rằng tập yêu cầu chức năng hai mặt phẳng và 7 yêu cầu phi chức năng trên chính là "đầu vào định lượng" để bước sang Mục 3.2: tổng hợp kiến trúc 9 tầng và lựa chọn ngăn xếp công nghệ.

---

### **Mục 3.2. Tổng hợp Kiến trúc Hệ thống, Mô hình hóa Ngăn xếp 9 Tầng và Biện luận Ngăn xếp Công nghệ**

* **Đoạn dẫn nhập Mục 3.2:** Kết nối từ tập yêu cầu ở Mục 3.1 với Khung quyết định lựa chọn kiến trúc ở Mục 2.6 của Chương 2 để trình bày cách hệ thống SaaS Kanban được tổng hợp thành một kiến trúc hoàn chỉnh.

#### **3.2.1. Thực thi Cây Quyết định Kiến trúc: Hạt nhân *Full-Stack Pool* Phòng thủ Chiều sâu và Mở rộng Phân tầng Đa chế độ**
* **Nội dung cốt lõi:**
  * Trình bày quá trình đưa các biến số của bài toán SaaS Kanban (từ Mục 3.1) đi qua 4 nút của **Cây Quyết định Kiến trúc Tổng quát (Hình 2.16 Chương 2)** và đối chiếu với định vị tại **Mục 2.6.3 Chương 2**:
    1. **Thiết kế Hạt nhân Trọng tâm (*Core Architecture*):** Lựa chọn mô hình **Full-Stack Pool gia cố bằng Phòng thủ Chiều sâu 4 lớp (Ranh giới Cấp độ 1)** làm cấu hình cốt lõi phục vụ đại đa số thuê bao (*Free / Pro*). Giải thích rõ giá trị khoa học: đây là hình thái có mật độ chia sẻ tài nguyên cao nhất, chi phí biên $\delta \to 0$, và là môi trường thử lửa lý tưởng nhất để kiểm chứng hiệu lực của các cơ chế phần mềm hiện đại (*RLS + `SET LOCAL` + Two-Tier W-TinyLFU Cache + OpenFeature*).
    2. **Thiết kế Cơ chế Mở rộng Phân tầng Đa chế độ (*Tier-Ready Multi-Strategy Extension*):** Để đáp ứng nhánh rẽ phân khúc khách hàng cao cấp trên Cây quyết định (Nút 2 và Nút 3 của Hình 2.16) đồng thời tạo lập cơ sở đối sánh thực nghiệm khách quan cho Chương 4 & Chương 5, tầng truy cập dữ liệu của hệ thống được thiết kế mở rộng theo mô hình **Hybrid / Bridge**, cho phép định tuyến động theo cấu hình `storage_strategy` của từng thuê bao vào 3 chế độ:
       * Chế độ `POOL_RLS` (Ranh giới Cấp độ 1 – *Shared DBMS, Shared DB, Shared Table + PostgreSQL RLS*).
       * Chế độ `SCHEMA_PER_TENANT` (Ranh giới Cấp độ 2 – *Shared DBMS, Shared DB, Dedicated Schema* với `SET LOCAL search_path`).
       * Chế độ `SILO_DATABASE` (Ranh giới Cấp độ 4 – *Dedicated Logical/Physical Database Instance* qua bộ định tuyến `RoutingDataSource`).
* **Sơ đồ đi kèm:**
  * **Hình 3.4:** *Sơ đồ kiến trúc tổng hợp của Nền tảng SaaS Kanban: Tầng thực thi & Middleware hợp nhất kết hợp Bộ định tuyến Lưu trữ Đa chế độ (Pool RLS, Schema Bridge, Silo DB).*

#### **3.2.2. Ánh xạ Hệ thống SaaS Kanban lên Ngăn xếp 9 Tầng Cloud-Native và Định vị Độ dày Ranh giới**
* **Nội dung cốt lõi:**
  * Cụ thể hóa bản thiết kế tham chiếu *Master Blueprint* (Hình 2.1 và Bảng 2.8 Chương 2) vào đúng 9 tầng thực tế của hệ thống SaaS Kanban đang xây dựng, chỉ rõ tại mỗi tầng thành phần nào được **Gộp**, thành phần nào có thể **Tách**, **Độ dày ranh giới (Cấp độ 1 $\rightarrow$ 4)** và **Chiều ranh giới (B1–B4)** được thực thi:
    - **Tầng 9 (*Application Code & Config*):** Gộp 100% trên một bộ mã nguồn chuẩn (*Single Codebase*); tách cấu hình logic qua *OpenFeature Ruleset* và siêu dữ liệu `JSONB` (Chiều B1, B4 – Cấp độ 1).
    - **Tầng 8 (*Application Runtime*):** Gộp trên cụm tiến trình Backend không trạng thái (*Stateless Spring Boot / JVM Runtime*); cô lập ngữ cảnh luồng bằng `ThreadLocal<TenantContext>` và khối `finally` (Chiều B1, B3 – Cấp độ 1; hỗ trợ nhân bản nhiều Pod theo Cấp độ trưởng thành 4).
    - **Tầng 7 (*Middleware*):** Gộp trên tầng điều phối nhận thức thuê bao gồm bộ lọc xác thực JWT tại biên, bộ điều tiết lưu lượng *Bucket4j + Redis Rate Limiter*, và bộ nhớ đệm hai tầng (*L1 Caffeine W-TinyLFU + L2 Redis Cluster*) với khóa tiền tố `tenant:{id}:*` (Chiều B1, B3, B4 – Cấp độ 2).
    - **Tầng 6 (*Logical Database & Schema*):** Vận hành trọng tâm ở chế độ bảng dùng chung (`public.boards`, `public.cards`...) bảo vệ bởi **PostgreSQL RLS (`ENABLE` + `FORCE`)** (Cấp độ 1), đồng thời hỗ trợ chế độ tách `schema_tenant_{id}` (Cấp độ 2) và tách `db_tenant_{id}` (Cấp độ 4) (Chiều B2).
    - **Tầng 5 (*DBMS Instance*):** Cụm máy chủ **PostgreSQL 15+** quản lý bể kết nối *HikariCP* với giao dịch nguyên tử `SET LOCAL` và giới hạn `statement_timeout` (Chiều B2, B3).
    - **Tầng 4 (*Cloud Storage*):** Hệ thống lưu trữ đối tượng chuẩn S3 (**MinIO**) dùng chung Bucket, phân vùng theo tiền tố `tenants/{tenant_id}/boards/{board_id}/...` và cấp phát *Pre-signed URL* ngắn hạn (Chiều B2 – Cấp độ 2).
    - **Tầng 3 (*Virtualization & Container Runtime*):** Đóng gói và điều phối qua **Docker Containers** với cấu hình giới hạn cứng tài nguyên (`cpus`, `mem_limit` qua Linux `cgroups v2`) (Chiều B3 – Cấp độ 3).
    - **Tầng 2 (*Network Infrastructure*):** Mạng cầu nối nội bộ Docker (`kanban-internal-net`) cô lập cổng CSDL/Redis/MinIO, chỉ mở duy nhất cổng giao tiếp qua tầng cổng biên (Chiều B1, B3).
    - **Tầng 1 (*Physical Hardware*):** Hạ tầng máy chủ vật lý thực thi dùng chung (Chiều B2, B3).
* **Sơ đồ & Bảng biểu đi kèm:**
  * **Hình 3.5:** *Sơ đồ mô hình hóa Ngăn xếp 9 tầng Cloud-Native thực tế của Hệ thống SaaS Kanban và vị trí các đường Ranh giới Thuê bao.*
  * **Bảng 3.3:** *Bảng ánh xạ chi tiết 9 tầng của Hệ thống SaaS Kanban với Chiến lược Tách/Gộp, Độ dày Ranh giới (Cấp độ 1–4) và Chiều Ranh giới (B1–B4).*

#### **3.2.3. Phương pháp luận *"Kỹ thuật Thực thi Ranh giới Quyết định Công nghệ"* (*Techniques $\to$ Tech Stack*) và Kiến trúc Triển khai**
* **Nội dung cốt lõi:**
  * Khẳng định nguyên tắc phương pháp luận khoa học: Không chọn công nghệ theo cảm tính hay thói quen lập trình, mà đi theo chuỗi suy diễn:
    $$\text{Yêu cầu Chiều Ranh giới (B1–B4)} \longrightarrow \text{Cơ chế Kỹ thuật Cần thiết (Chương 2)} \longrightarrow \text{Ngăn xếp Công nghệ Đáp ứng Tối ưu}$$
  * Biện luận lý do lựa chọn từng công nghệ trong ngăn xếp thực nghiệm:
    1. *Tại sao chọn **PostgreSQL 15+** cho Tầng 5–6 thay vì MySQL hay SQLite?* Vì PostgreSQL hỗ trợ chính sách **Row-Level Security (RLS) cấp nhân** hoàn chỉnh nhất (có phân biệt `USING` và `WITH CHECK`, có `FORCE ROW LEVEL SECURITY`), hỗ trợ biến phiên phạm vi giao dịch **`SET LOCAL`**, hỗ trợ chuyển mạch không gian tên **`search_path`** cực nhanh cho mô hình *Bridge*, và hỗ trợ kiểu dữ liệu **`JSONB` kèm chỉ mục đảo `GIN Index`** cho trường tùy biến động.
    2. *Tại sao chọn **Java 17+ & Spring Boot 3 (Spring Security, Spring Data JPA/JDBC, HikariCP)** cho Tầng 8–9?* Vì kiến trúc chuỗi bộ lọc (*Security Filter Chain*) chuẩn mực, cơ chế quản lý giao dịch khai báo (`@Transactional`) cho phép gắn *Interceptor* tiêm lệnh `SET LOCAL` chính xác trước mọi truy vấn, hỗ trợ lớp trừu tượng `AbstractRoutingDataSource` để chuyển mạch động giữa `POOL_RLS`, `SCHEMA` và `SILO_DB`, và tích hợp gốc với thư viện bộ nhớ đệm *Caffeine (W-TinyLFU)* cùng *Micrometer Prometheus*.
    3. *Tại sao chọn **Caffeine Cache (L1) + Redis 7 (L2) + Bucket4j** cho Tầng 7–8?* Vì *Caffeine* là thư viện chuẩn mực hiện thực hóa giải thuật **W-TinyLFU** (Einziger et al., 2017) đã phân tích ở Mục 2.5.3 Chương 2, kết hợp cùng *Redis 7* cung cấp kênh *Pub/Sub* xóa cache phân tán và lưu trữ bộ đếm nguyên tử (Lua script) cho thuật toán *Token Bucket* của *Bucket4j*.
    4. *Tại sao chọn **OpenFeature SDK** cho Tầng 9, **MinIO** cho Tầng 4, **React + TypeScript + Vite + TailwindCSS** cho Frontend và **Docker Compose** cho Tầng 3?* Biện luận rõ tính tương thích chuẩn S3 của MinIO (hỗ trợ sinh *Pre-signed URL* giống hệt AWS S3), chuẩn CNCF của OpenFeature và khả năng cố định tài nguyên phục vụ đo kiểm của Docker.
* **Bảng biểu & Sơ đồ đi kèm:**
  * **Bảng 3.4:** *Ma trận ánh xạ từ Yêu cầu Ranh giới (B1–B4) $\rightarrow$ Kỹ thuật Kiến trúc (Chương 2) $\rightarrow$ Công nghệ Lựa chọn & Lý do Biện luận.*
  * **Hình 3.6:** *Sơ đồ Kiến trúc Triển khai Hạ tầng Tổng thể (Containerized Deployment Topology) của Nền tảng SaaS Kanban.*

---

### **Mục 3.3. Thiết kế Chi tiết Kiến trúc Thành phần, Luồng Xử lý và Cơ sở Dữ liệu Đa thuê bao**

* **Đoạn dẫn nhập Mục 3.3:** Từ bức tranh kiến trúc tổng thể và ngăn xếp công nghệ ở Mục 3.2, mục này đi sâu vào thiết kế cấu trúc bên trong của hệ thống: các thành phần mô-đun phần mềm, luồng tuần tự xử lý một yêu cầu đa thuê bao từ đầu đến cuối, và thiết kế lược đồ cơ sở dữ liệu cho cả hai mặt phẳng *Control Plane* và *Data Plane*.

#### **3.3.1. Kiến trúc Thành phần Tổng thể và Vòng đời Xử lý Yêu cầu Xuyên suốt (*End-to-End Request Lifecycle*)**
* **Nội dung cốt lõi:**
  * Thiết kế kiến trúc phân lớp mô-đun bên trong Backend API (`Ingress & Security Filter Layer` $\rightarrow$ `Rate Limit & Feature Guard Layer` $\rightarrow$ `Application Service Layer` $\rightarrow$ `Two-Tier Tenant-Aware Cache Layer` $\rightarrow$ `Multi-Strategy Data Routing & RLS Persistence Layer`).
  * Phân tích chi tiết **Biểu đồ tuần tự 8 bước của một yêu cầu nghiệp vụ điển hình** (ví dụ: người dùng kéo thả di chuyển thẻ công việc `PATCH /api/v1/cards/{cardId}/move` hoặc tạo bảng mới `POST /api/v1/boards`):
    1. *Bước 1:* Client gửi yêu cầu HTTPS kèm thẻ bài `Authorization: Bearer <JWT>`.
    2. *Bước 2:* `JwtTenantAuthenticationFilter` xác thực chữ ký số, trích xuất `{tenant_id, tier, user_id, roles, storage_strategy}` và nạp vào `TenantContextHolder`.
    3. *Bước 3:* `TenantRateLimitInterceptor` kiểm tra hạn ngạch *Token Bucket* của `tenant_id` theo `tier` trên Redis; nếu vượt ngưỡng thì trả về ngay `429 Too Many Requests`.
    4. *Bước 4:* Tầng Service gọi `OpenFeatureClient` (tra cứu qua *L1 Caffeine W-TinyLFU* $\rightarrow$ *L2 Redis*) để kiểm tra quyền tính năng và hạn mức nghiệp vụ (như kiểm tra số bảng tối đa hoặc quy tắc *WIP Limit* của cột đích).
    5. *Bước 5:* Khi mở giao dịch `@Transactional`, `TenantDataSourceRouter` chọn nguồn kết nối và `RlsSessionInterceptor` thực thi ngay câu lệnh `SET LOCAL app.current_tenant_id = '<tenant_uuid>'` (hoặc `SET LOCAL search_path` đối với thuê bao dùng *Schema Bridge*).
    6. *Bước 6:* Thực thi câu lệnh SQL nghiệp vụ dưới sự kiểm duyệt tự động của nhân PostgreSQL RLS (`USING` và `WITH CHECK`).
    7. *Bước 7:* Khi giao dịch `COMMIT`, PostgreSQL tự động hủy biến `app.current_tenant_id`, trả kết nối vật lý sạch về *HikariCP Pool*; đồng thời phát sự kiện xóa cache/thông báo kèm tiêu đề `X-Tenant-ID`.
    8. *Bước 8:* Trong khối `finally` của Filter biên, hệ thống bắt buộc gọi `TenantContextHolder.clear()` để xóa trắng ngữ cảnh trên luồng trước khi trả luồng về *Thread Pool*.
* **Sơ đồ đi kèm:**
  * **Hình 3.7:** *Biểu đồ tuần tự (Sequence Diagram) vòng đời xử lý yêu cầu đa thuê bao xuyên suốt 8 bước từ Client qua các lớp bảo vệ xuống CSDL và dọn dẹp ngữ cảnh.*

#### **3.3.2. Thiết kế Lược đồ Cơ sở Dữ liệu Mặt phẳng Điều khiển (*Control Plane Catalog Schema*)**
* **Nội dung cốt lõi:**
  * Thiết kế các bảng quản trị trung tâm nằm trong lược đồ điều khiển (`control_plane`), đóng vai trò là "bộ não định vị" cho toàn nền tảng:
    - Bảng `tenants`: Lưu định danh duy nhất (`id UUID PRIMARY KEY`), mã định danh tên miền phụ (`slug VARCHAR UNIQUE`), tên tổ chức, trạng thái vòng đời (`ACTIVE`, `SUSPENDED`, `ARCHIVED`), thời điểm tạo.
    - Bảng `tenant_subscriptions`: Lưu gói cước hiện hành (`tier_code`: `FREE`, `PRO`, `ENTERPRISE`), hạn mức cấu hình (`max_boards`, `max_members`, `rate_limit_per_min`), chu kỳ hiệu lực.
    - Bảng `tenant_placements`: Lưu cấu hình định vị chiến lược lưu trữ của thuê bao (`storage_strategy`: `POOL_RLS`, `SCHEMA_PER_TENANT`, `SILO_DB`, cùng tên `schema_name` hoặc `datasource_key` tương ứng).
    - Bảng `feature_flag_rules`: Lưu trữ tập quy tắc đánh giá cờ tính năng động (`flag_key`, `default_value`, `tier_overrides JSONB`, `tenant_overrides JSONB`, `rollout_percentage`).
    - Bảng `tenant_audit_logs`: Lưu vết kiểm toán các sự kiện cấp quản trị và bảo mật theo từng `tenant_id`.
* **Sơ đồ đi kèm:**
  * **Hình 3.8:** *Sơ đồ Thực thể – Liên kết (ERD) của Lược đồ Mặt phẳng Điều khiển (Control Plane Schema).*

#### **3.3.3. Thiết kế Lược đồ Cơ sở Dữ liệu Mặt phẳng Nghiệp vụ Kanban (*Data Plane Schema*) và Chiến lược Chỉ mục theo Thuê bao**
* **Nội dung cốt lõi:**
  * Thiết kế các bảng nghiệp vụ cốt lõi của hệ thống Kanban (`users`, `workspace_members`, `kanban_boards`, `kanban_columns`, `kanban_cards`, `card_comments`, `card_attachments`).
  * **Nguyên lý thiết kế Khóa và Chỉ mục Nhận thức Thuê bao (*Tenant-Aware Indexing & Foreign Keys*):**
    - Mọi bảng nghiệp vụ trong phân vùng dùng chung đều bắt buộc có cột `tenant_id UUID NOT NULL` (phi chuẩn hóa có chủ đích – *Intentional Denormalization of `tenant_id`* – ngay cả trên các bảng con như `kanban_columns`, `kanban_cards`, `card_comments` để bộ lọc *PostgreSQL RLS* có thể kiểm tra trực tiếp trên từng dòng mà không cần thực hiện phép `JOIN` đắt đỏ lên bảng cha `kanban_boards`).
    - Thiết kế **Chỉ mục B-Tree Tổ hợp dẫn đầu bởi `tenant_id`** (ví dụ: `CREATE INDEX idx_cards_tenant_board_col ON kanban_cards (tenant_id, board_id, column_id, position)`). Giải thích rõ về mặt cấu trúc dữ liệu: việc đặt `tenant_id` ở vị trí đầu tiên của khóa chỉ mục giúp gom toàn bộ các nút lá B-Tree của cùng một thuê bao nằm liền kề nhau trên trang bộ nhớ (*Spatial Locality in Buffer Pool*), biến thao tác lọc RLS từ quét toàn bảng (*Sequential Scan*) thành quét phạm vi chỉ mục cực hẹp (*Index Range Scan*).
* **Sơ đồ đi kèm:**
  * **Hình 3.9:** *Sơ đồ Thực thể – Liên kết (ERD) của Lược đồ Mặt phẳng Nghiệp vụ Kanban (Data Plane Schema) và cấu trúc chỉ mục tổ hợp `(tenant_id, ...)`.*

#### **3.3.4. Thiết kế Mô hình Dữ liệu Tùy biến Động (*JSONB Custom Fields & GIN Index*) và Bộ Định tuyến Dữ liệu Đa chế độ**
* **Nội dung cốt lõi:**
  * **Giải quyết bài toán Tùy biến Cấu trúc Dữ liệu trên Bảng Gộp (*Shared-Table Schema Extensibility*):**
    - Thay vì dùng mô hình *EAV (Entity-Attribute-Value)* cổ điển đòi hỏi nhiều phép tự kết nối (`SELF JOIN`) làm suy thoái hiệu năng, hệ thống kết hợp bảng siêu dữ liệu định nghĩa trường `custom_field_definitions (id, tenant_id, board_id, field_key, field_type, validation_schema JSONB)` với cột `custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb` ngay trên bảng `kanban_cards`.
    - Đánh chỉ mục đảo **`CREATE INDEX idx_cards_custom_attrs_gin ON kanban_cards USING GIN (custom_attributes jsonb_path_ops)`** kết hợp điều kiện `tenant_id`, cho phép mỗi thuê bao tự thêm hàng chục trường dữ liệu riêng (như `"story_points"`, `"sprint_id"`, `"risk_level"`) và truy vấn lọc với tốc độ tương đương cột vật lý mà không cần chạy lệnh `ALTER TABLE`.
  * **Thiết kế Kiến trúc Bộ Định tuyến Dữ liệu Đa chế độ (`TenantAwareRoutingDataSource` & `MultiStrategyConnectionProvider`):**
    - Mô tả thiết kế lớp định tuyến cho phép cùng một tầng Repository của ứng dụng có thể làm việc trong suốt với cả 3 chế độ lưu trữ (`POOL_RLS`, `SCHEMA_PER_TENANT`, `SILO_DB`) dựa trên thuộc tính `storage_strategy` trong `TenantContext`.
* **Bảng biểu & Sơ đồ đi kèm:**
  * **Bảng 3.5:** *Đặc tả cấu trúc lưu trữ và kiểm tra hợp lệ (JSON Schema Validation) cho mô-đun Trường dữ liệu Tùy biến Động (`Custom Fields`).*
  * **Hình 3.10:** *Sơ đồ kiến trúc Bộ Định tuyến Truy cập Dữ liệu Đa chế độ (`TenantAwareRoutingDataSource`) kết nối 3 phân vùng `POOL_RLS`, `SCHEMA_PER_TENANT` và `SILO_DB`.*

---

### **Mục 3.4. Hiện thực hóa Bốn Hệ thống Kỹ thuật Bảo vệ Ranh giới Thuê bao Lúc chạy (B1 – B4)**

* **Đoạn dẫn nhập Mục 3.4:** Đây là phần trọng tâm kỹ thuật của Chương 3, trình bày cách 4 cơ chế lý thuyết ở Mục 2.5 (Chương 2) được hiện thực hóa thành mã nguồn và cấu hình hệ thống thực tế nhằm bảo vệ vững chắc 4 chiều của Ranh giới Thuê bao (**B1, B2, B3, B4**).

#### **3.4.1. Hiện thực hóa Chiều B1 (Ranh giới Nhận diện & Ngữ cảnh): `JwtTenantAuthFilter`, `TenantContext` Cô lập Luồng và Dọn dẹp `finally`**
* **Nội dung cốt lõi:**
  * Hiện thực hóa cấu trúc dữ liệu bất biến (*Java `record` / Immutable Class*) `TenantContext(UUID tenantId, TenantTier tier, StorageStrategy strategy, UUID userId, Set<String> roles)`.
  * Hiện thực hóa lớp lưu trữ ngữ cảnh `TenantContextHolder` cùng bộ lọc `OncePerRequestFilter`:
    - Trích xuất và xác thực chữ ký JWT; đối chiếu chéo với header `X-Tenant-ID` hoặc tên miền phụ (nếu có) để chống tấn công giả mạo ngữ cảnh (*Tenant Spoofing*).
    - Bọc toàn bộ lời gọi `filterChain.doFilter(request, response)` trong khối `try ... finally { TenantContextHolder.clear(); }`.
  * Hiện thực hóa bộ truyền ngữ cảnh bất đồng bộ `TenantAwareTaskDecorator` cho các luồng xử lý nền (`@Async`, gửi thông báo WebSocket, ghi *Audit Log*) để đảm bảo ngữ cảnh không bị rơi khi chuyển luồng.
* **Sơ đồ đi kèm:**
  * **Hình 3.11:** *Sơ đồ lớp (Class Diagram) và luồng tương tác của mô-đun Nhận diện, Lưu trữ và Lan truyền Ngữ cảnh Thuê bao (Bảo vệ Chiều B1).*

#### **3.4.2. Hiện thực hóa Chiều B2 (Ranh giới Cô lập Dữ liệu & Lưu trữ): PostgreSQL RLS Kép (`ENABLE`/`FORCE`), Giao dịch `SET LOCAL` và MinIO `Pre-signed URL`**
* **Nội dung cốt lõi:**
  1. **Cài đặt Rào chắn Kép PostgreSQL RLS trên toàn bộ các bảng nghiệp vụ Kanban:**
     - Trình bày kịch bản migration SQL thực tế áp dụng `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` và chính sách `CREATE POLICY ... USING (...) WITH CHECK (...)` với biểu thức `NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`.
     - Chứng minh cơ chế **Đóng an toàn (*Fail-Closed*)**: tạo tài khoản runtime riêng `kanban_app_user` (không có quyền `BYPASSRLS` hay `SUPERUSER`) để kết nối từ ứng dụng.
  2. **Cài đặt Cơ chế Tiêm Ngữ cảnh Giao dịch Nguyên tử (`SET LOCAL`):**
     - Hiện thực hóa `TenantRlsTransactionInterceptor` (hoặc `ConnectionCustomizer` / AOP Aspect bám vào sự kiện bắt đầu giao dịch `@Transactional`): ngay khi mượn kết nối từ *HikariCP Pool*, tự động thực thi `PreparedStatement` chạy lệnh `SELECT set_config('app.current_tenant_id', ?, true)` (tương đương `SET LOCAL app.current_tenant_id = ?`, trong đó tham số thứ ba `is_local = true` khóa chặt phạm vi biến chỉ tồn tại trong giao dịch hiện tại và chống hoàn toàn lỗi *SQL Injection*).
     - Đối với thuê bao ở chế độ *Bridge* (`SCHEMA_PER_TENANT`), thực thi chuyển mạch an toàn `SET LOCAL search_path TO tenant_<slug>, public`.
  3. **Cài đặt Cô lập Lưu trữ Tệp đính kèm trên MinIO / S3 (Tầng 4):**
     - Hiện thực hóa `TenantStorageService`: tự động chuẩn hóa đường dẫn đối tượng theo mẫu `tenants/{tenantId}/boards/{boardId}/cards/{cardId}/{attachmentId}_{fileName}`, kiểm tra quyền sở hữu thẻ Kanban trước khi ký số sinh `Pre-signed PUT/GET URL` có thời hạn ngắn (180 giây).

#### **3.4.3. Hiện thực hóa Chiều B3 (Ranh giới Cô lập Hiệu năng): Bộ nhớ Đệm Hai tầng (*L1 Caffeine W-TinyLFU + L2 Redis*) và *Token Bucket Rate Limiting***
* **Nội dung cốt lõi:**
  1. **Hiện thực hóa `TwoTierTenantCacheManager`:**
     - Cấu hình tầng **L1 (*Caffeine Cache*)** ngay trong vùng nhớ tiến trình với kích thước giới hạn (`maximumSize`) để kích hoạt bộ lọc tần suất **W-TinyLFU**, bảo vệ bộ nhớ đệm trước các truy vấn quét dữ liệu hàng loạt.
     - Cấu hình tầng **L2 (*Redis 7*)** kết hợp kênh phát sóng `RedisMessageListenerContainer` (*Pub/Sub Invalidation Channel*) để đồng bộ xóa khóa L1 trên toàn bộ các thực thể ứng dụng khi cấu hình hoặc dữ liệu bảng thay đổi.
     - Cài đặt bộ tạo khóa bắt buộc `TenantCacheKeyGenerator` luôn gắn tiền tố `tenant:{tenantId}:{cacheName}:{key}` (ném ngoại lệ bảo mật ngay lập tức nếu luồng gọi cache mà không có `TenantContext`).
  2. **Hiện thực hóa Bộ Điều tiết Lưu lượng Phân tán (*Distributed Per-Tenant Rate Limiter*):**
     - Cài đặt `Bucket4j + Redis Lettuce/Redisson` áp dụng thuật toán *Token Bucket* riêng cho từng `tenant_id` với tốc độ nạp thẻ bài (*Refill Rate*) và dung lượng xô (*Burst Capacity*) lấy động từ gói cước (`FREE`, `PRO`, `ENTERPRISE`), trả về kèm các tiêu đề HTTP chuẩn (`X-RateLimit-Remaining`, `X-RateLimit-Retry-After-Seconds`).
* **Bảng biểu đi kèm:**
  * **Bảng 3.6:** *Bảng thông số cấu hình Hạn ngạch Rate Limiting (Token Bucket) và Chính sách Bộ nhớ đệm Hai tầng (L1/L2 TTL & Capacity) theo từng phân khúc Gói dịch vụ.*

#### **3.4.4. Hiện thực hóa Chiều B4 (Ranh giới Cô lập Cấu hình & Tùy biến Động): Công cụ Đánh giá Cờ tính năng *OpenFeature* và Tùy biến Giao diện/Quy trình**
* **Nội dung cốt lõi:**
  * Hiện thực hóa `DatabaseAndCacheFeatureProvider` cài đặt giao diện chuẩn `FeatureProvider` của **OpenFeature SDK**:
    - Tự động chuyển đổi `TenantContext` thành `EvaluationContext` (chứa `targetingKey = tenantId`, thuộc tính `tier`, `storageStrategy`).
    - Thực thi thuật toán phân giải 4 mức ưu tiên đã thiết lập ở Mục 2.5.4 Chương 2: *(1) Ghi đè theo `tenant_id` cụ thể $\rightarrow$ (2) Quy tắc theo gói cước `tier` $\rightarrow$ (3) Băm nhất quán tỷ lệ phần trăm $\text{MurmurHash3}(\text{flagKey} \oplus \text{tenantId}) \bmod 100$ $\rightarrow$ (4) Giá trị mặc định an toàn*.
  * Áp dụng trực tiếp vào mã nguồn nghiệp vụ Kanban (Tầng 9): kiểm tra cờ `kanban.wip_limit.enforced` khi kéo thả thẻ vào cột, kiểm tra hạn mức `kanban.board.max_count` khi tạo bảng mới, và kiểm tra cờ `kanban.custom_fields.enabled` khi thêm thuộc tính động — chứng minh 100% không cần phân nhánh mã nguồn.

---

### **Mục 3.5. Hiện thực hóa Vận hành Vòng đời Tự động và Khả năng Quan sát Nhận thức Thuê bao**

* **Đoạn dẫn nhập Mục 3.5:** Giải thích rằng một hệ thống đa thuê bao chỉ thực sự hoàn chỉnh ở Cấp độ trưởng thành 3–4 khi quá trình đăng ký thuê bao mới, nâng cấp lược đồ CSDL và giám sát tài nguyên diễn ra hoàn toàn tự động mà không cần can thiệp thủ công của quản trị viên.

#### **3.5.1. Động cơ Khởi tạo Thuê bao Tự phục vụ (*Automated Onboarding Engine*) và Di trú Lược đồ Không gián đoạn (*Flyway Pipeline*)**
* **Nội dung cốt lõi:**
  * Hiện thực hóa quy trình **Tự động hóa Khởi tạo Không gian làm việc (*Zero-Touch Tenant Provisioning Workflow*)** điều phối bởi Mặt phẳng Điều khiển (*Control Plane*):
    - Khi tổ chức đăng ký ở gói *Free/Pro (`POOL_RLS`)*: Khởi tạo bản ghi trong bảng `tenants`, `subscriptions`, `placements` và tạo bảng Kanban mẫu trong cùng một giao dịch nguyên tử (hoàn tất trong $< 100\text{ ms}$).
    - Khi tổ chức đăng ký hoặc nâng cấp lên chế độ *Bridge (`SCHEMA_PER_TENANT`)*: Động cơ tự động tạo không gian tên `CREATE SCHEMA IF NOT EXISTS tenant_<slug>`, kích hoạt `Flyway.configure().schemas("tenant_<slug>").load().migrate()` để dựng bộ bảng chuẩn và nạp dữ liệu khởi tạo.
    - Khi tổ chức ở chế độ *Enterprise (`SILO_DB`)*: Tự động khởi tạo nguồn dữ liệu mới, chạy *Flyway Migration* và đăng ký động vào `TenantAwareRoutingDataSource` lúc chạy mà không cần khởi động lại máy chủ ứng dụng.
* **Sơ đồ đi kèm:**
  * **Hình 3.12:** *Lưu đồ hoạt động (Activity Diagram) của Động cơ Khởi tạo Thuê bao Tự động (Automated Onboarding) và Di trú Lược đồ theo 3 chiến lược lưu trữ.*

#### **3.5.2. Hiện thực hóa Khả năng Quan sát theo Thuê bao (*Tenant-Aware Telemetry*) và Minh họa Nguyên mẫu Hệ thống**
* **Nội dung cốt lõi:**
  * Hiện thực hóa bộ lọc gắn nhãn quan sát tự động (`TenantObservabilityFilter`):
    - Đưa `tenant_id`, `tier` và `storage_strategy` vào **MDC (*Mapped Diagnostic Context*)** của bộ ghi nhật ký cấu trúc JSON (*SLF4J / Logback*) để mọi dòng log đều truy vết được theo thuê bao.
    - Đính kèm thẻ nhãn (`MeterFilter / Tag("tenant_tier", ...)` và bộ đếm theo `tenant_id`) vào **Micrometer & Prometheus Actuator Endpoint (`/actuator/prometheus`)** để thu thập thời gian phản hồi phân vị ($p_{50}, p_{95}, p_{99}$), thông lượng RPS, tỷ lệ trúng cache L1/L2 và số lượng yêu cầu bị chặn bởi *Rate Limiter* — làm đầu vào trực tiếp cho hệ thống đo kiểm ở Chương 4 & Chương 5.
  * Trình bày tổng quan giao diện và luồng trải nghiệm thực tế của nguyên mẫu ứng dụng SaaS Kanban đã xây dựng (Màn hình Quản trị *Control Plane* và Màn hình Không gian làm việc *Kanban Board* của các thuê bao ở các gói cước khác nhau).
* **Sơ đồ / Hình minh họa đi kèm:**
  * **Hình 3.13:** *Minh họa giao diện Mặt phẳng Điều khiển (Control Plane) và Không gian làm việc Bảng Kanban Đa thuê bao với các mức tùy biến theo gói dịch vụ.*

---

### **Mục 3.6. Tổng kết Chương 3 và Ma trận Đối soát Chuyển giao sang Chương 4 & Chương 5**

#### **3.6.1. Đánh giá Mức độ Trưởng thành Kiến trúc của Hệ thống**
* Đối chiếu hệ thống SaaS Kanban đã hiện thực hóa với **Mô hình 4 cấp độ trưởng thành của Chong & Carraro (2006)** (từ Chương 1, Mục 1.2) và **5 Đặc trưng Kiến trúc Cốt lõi** (từ Chương 1, Mục 3): khẳng định hệ thống đạt đầy đủ tiêu chuẩn của **Cấp độ trưởng thành 3 (Multi-Tenant, Configurable)** và **sẵn sàng cho Cấp độ 4 (Scalable, Load-Balanced Multi-Instance)** nhờ thiết kế tiến trình ứng dụng hoàn toàn phi trạng thái (*Stateless*) kết hợp bộ nhớ đệm phân tán và bộ định tuyến dữ liệu đa chế độ.

#### **3.6.2. Bảng Ma trận Đối soát Truy vết Xuyên suốt (Chương 1 $\rightarrow$ Chương 2 $\rightarrow$ Chương 3 $\rightarrow$ Chương 4 & 5)**
* Thiết lập **Bảng 3.7 – Ma trận Đối soát Truy vết Toàn diện**, khép kín mạch logic từ 7 thách thức cốt lõi (**C1–C7** ở Chương 1) $\rightarrow$ Các quyết định kiến trúc & cơ chế (Chương 2) $\rightarrow$ Các lớp mã nguồn, cấu hình CSDL và thành phần đã cài đặt (Chương 3) $\rightarrow$ Các kịch bản thực nghiệm và chỉ số đo kiểm tương ứng sẽ thực hiện tại Chương 4 và Chương 5.

---

## **PHẦN IV: TỔNG HỢP DANH MỤC 13 SƠ ĐỒ VÀ 7 BẢNG BIỂU QUY CHUẨN CỦA CHƯƠNG 3**

### **4.1. Danh mục 13 Sơ đồ Chuẩn hóa trong Chương 3**
1. **Hình 3.1:** *Sơ đồ tiến trình Kỹ nghệ Yêu cầu Hướng Dịch vụ SaaS Ngoài–Vào (Market-Driven Outside-In Service Engineering).* (Mục 3.1.1)
2. **Hình 3.2:** *Sơ đồ cây phân rã chức năng hệ thống SaaS Kanban theo Hai Mặt phẳng Kiến trúc (Control Plane vs. Data Plane).* (Mục 3.1.2)
3. **Hình 3.3:** *Sơ đồ Use Case tổng quát và phân quyền tác nhân đa cấp của nền tảng SaaS Kanban.* (Mục 3.1.2)
4. **Hình 3.4:** *Sơ đồ kiến trúc tổng hợp của Nền tảng SaaS Kanban: Hạt nhân Full-Stack Pool Phòng thủ Chiều sâu kết hợp Mở rộng Phân tầng Đa chế độ.* (Mục 3.2.1)
5. **Hình 3.5:** *Sơ đồ mô hình hóa Ngăn xếp 9 tầng Cloud-Native thực tế của Hệ thống SaaS Kanban và vị trí các đường Ranh giới Thuê bao.* (Mục 3.2.2)
6. **Hình 3.6:** *Sơ đồ Kiến trúc Triển khai Hạ tầng Tổng thể (Containerized Deployment Topology) của Nền tảng SaaS Kanban.* (Mục 3.2.3)
7. **Hình 3.7:** *Biểu đồ tuần tự (Sequence Diagram) vòng đời xử lý yêu cầu đa thuê bao xuyên suốt 8 bước từ Client xuống CSDL và dọn dẹp ngữ cảnh.* (Mục 3.3.1)
8. **Hình 3.8:** *Sơ đồ Thực thể – Liên kết (ERD) của Lược đồ Mặt phẳng Điều khiển (Control Plane Catalog Schema).* (Mục 3.3.2)
9. **Hình 3.9:** *Sơ đồ Thực thể – Liên kết (ERD) của Lược đồ Mặt phẳng Nghiệp vụ Kanban (Data Plane Schema) và cấu trúc chỉ mục tổ hợp `(tenant_id, ...)`.* (Mục 3.3.3)
10. **Hình 3.10:** *Sơ đồ kiến trúc Bộ Định tuyến Truy cập Dữ liệu Đa chế độ (`TenantAwareRoutingDataSource`) kết nối 3 phân vùng `POOL_RLS`, `SCHEMA_PER_TENANT` và `SILO_DB`.* (Mục 3.3.4)
11. **Hình 3.11:** *Sơ đồ lớp (Class Diagram) và luồng tương tác của mô-đun Nhận diện, Lưu trữ và Lan truyền Ngữ cảnh Thuê bao (Bảo vệ Chiều B1).* (Mục 3.4.1)
12. **Hình 3.12:** *Lưu đồ hoạt động (Activity Diagram) của Động cơ Khởi tạo Thuê bao Tự động (Automated Onboarding) và Di trú Lược đồ theo 3 chiến lược lưu trữ.* (Mục 3.5.1)
13. **Hình 3.13:** *Minh họa giao diện Mặt phẳng Điều khiển (Control Plane) và Không gian làm việc Bảng Kanban Đa thuê bao theo gói dịch vụ.* (Mục 3.5.2)

### **4.2. Danh mục 7 Bảng Biểu Chuẩn hóa trong Chương 3**
1. **Bảng 3.1:** *Ma trận phân tích phân khúc thuê bao, danh mục gói dịch vụ SaaS Kanban (Free, Pro, Enterprise) và ánh xạ chiến lược cô lập.* (Mục 3.1.1)
2. **Bảng 3.2:** *Bảng đặc tả Yêu cầu Phi chức năng (NFR-1 đến NFR-7) đối chiếu với 7 Thách thức Chương 1 (C1–C7), 4 Chiều Ranh giới (B1–B4) và Chỉ số Đo kiểm Mục tiêu.* (Mục 3.1.3)
3. **Bảng 3.3:** *Bảng ánh xạ chi tiết 9 tầng của Hệ thống SaaS Kanban với Chiến lược Tách/Gộp, Độ dày Ranh giới (Cấp độ 1–4) và Chiều Ranh giới (B1–B4).* (Mục 3.2.2)
4. **Bảng 3.4:** *Ma trận ánh xạ từ Yêu cầu Ranh giới (B1–B4) $\rightarrow$ Kỹ thuật Kiến trúc (Chương 2) $\rightarrow$ Công nghệ Lựa chọn & Lý do Biện luận.* (Mục 3.2.3)
5. **Bảng 3.5:** *Đặc tả cấu trúc lưu trữ và kiểm tra hợp lệ (JSON Schema Validation) cho mô-đun Trường dữ liệu Tùy biến Động (`Custom Fields`).* (Mục 3.3.4)
6. **Bảng 3.6:** *Bảng thông số cấu hình Hạn ngạch Rate Limiting (Token Bucket) và Chính sách Bộ nhớ đệm Hai tầng (L1/L2 TTL & Capacity) theo từng phân khúc Gói dịch vụ.* (Mục 3.4.3)
7. **Bảng 3.7:** *Ma trận đối soát truy vết xuyên suốt từ Chương 1 $\rightarrow$ Chương 2 $\rightarrow$ Chương 3 $\rightarrow$ Chương 4 & Chương 5.* (Mục 3.6.2)

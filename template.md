Dưới đây là mẫu thuyết minh chi tiết hóa cho các mục 10, 11, 12, 13, 14, 15 và 18, được thiết kế chuyên biệt cho đề tài **"XÂY DỰNG ỨNG DỤNG QUẢN LÝ CÔNG VIỆC THEO KIẾN TRÚC ĐA THUÊ BAO (MULTI-TENANCY)"**.

Các phần chữ _nghiêng trong ngoặc đơn_ là các gợi ý/hướng dẫn cụ thể về mặt kỹ thuật để sinh viên điền nội dung phù hợp.

---

**10. TỔNG QUAN TÌNH HÌNH NGHIÊN CỨU THUỘC LĨNH VỰC CỦA ĐỀ TÀI Ở TRONG VÀ NGOÀI NƯỚC**

**10.1. Trong nước**
_(Phân tích tình hình chuyển đổi số và nhu cầu sử dụng phần mềm dạng SaaS - Software as a Service tại Việt Nam)_

- _Gợi ý nội dung cần điền:_
  - _Nhu cầu quản lý công việc của các doanh nghiệp vừa và nhỏ (SME) và các nhóm làm việc (Startup) tại Việt Nam._
  - _Đánh giá các nền tảng quản lý công việc "Make in Vietnam" hiện có (Ví dụ: Base.vn, 1Office, Amis,...)._
  - _Phân tích hạn chế của các giải pháp truyền thống (Single-tenant) về chi phí triển khai, bảo trì so với mô hình SaaS._
  - _Liệt kê các công trình/bài báo trong nước liên quan đến xây dựng ứng dụng SaaS hoặc quản lý quy trình._

**10.2. Ngoài nước**
_(Phân tích xu hướng công nghệ Multi-tenancy và các ứng dụng hàng đầu thế giới)_

- _Gợi ý nội dung cần điền:_
  - _Xu hướng dịch chuyển lên Cloud và kiến trúc Đa thuê bao (Multi-tenancy) trên thế giới._
  - _Tổng quan về các "ông lớn" trong ngành (Trello, Jira, Asana, Monday.com, ClickUp)._
  - _Các nghiên cứu lý thuyết về kiến trúc dữ liệu cho Multi-tenancy (Database per tenant, Shared database - Shared schema, Shared database - Separate schema)._

**10.3. Danh mục các công trình đã công bố**
a) Của chủ nhiệm đề tài: _(Ghi "Không" nếu chưa có)_
b) Của các thành viên tham gia nghiên cứu: _(Ghi "Không" nếu chưa có)_

---

**11. TÍNH CẤP THIẾT CỦA ĐỀ TÀI**

_(Lập luận tại sao cần xây dựng ứng dụng này với kiến trúc Đa thuê bao)_

- _Gợi ý các ý chính cần triển khai:_
  - **Về mặt thực tiễn:** _Nhu cầu tiết kiệm chi phí phần cứng và vận hành. Nếu mỗi công ty khách hàng cần một server riêng (Single-tenant) thì chi phí rất cao. Kiến trúc Đa thuê bao cho phép một lần triển khai (instance) phục vụ nhiều khách hàng, tối ưu tài nguyên._
  - **Về mặt kỹ thuật:** _Thách thức trong việc đảm bảo tính cô lập dữ liệu (Data Isolation) và bảo mật giữa các khách hàng (Tenants) trên cùng một hệ thống. Việc nghiên cứu đề tài giúp làm chủ kỹ thuật phân tách dữ liệu phức tạp này._
  - **Ý nghĩa:** _Tạo ra một sản phẩm demo có khả năng mở rộng (Scalability) cao, phục vụ mục đích học tập và hướng tới ứng dụng thực tế cho các nhóm sinh viên hoặc doanh nghiệp nhỏ._

---

**12. MỤC TIÊU ĐỀ TÀI**

_(Ghi cụ thể, định lượng được)_

- **Mục tiêu tổng quát:** Xây dựng hoàn thiện ứng dụng web quản lý công việc hoạt động theo mô hình SaaS, hỗ trợ đa thuê bao.
- **Mục tiêu cụ thể:**
  1.  _Nghiên cứu và áp dụng thành công kiến trúc Multi-tenancy (lựa chọn chiến lược cụ thể: ví dụ Discriminator Column hoặc Schema-per-tenant)._
  2.  _Xây dựng phân hệ Quản trị hệ thống (SaaS Admin): Đăng ký Tenant mới, quản lý gói dịch vụ._
  3.  _Xây dựng phân hệ Người dùng (Tenant User): Quản lý dự án, quản lý Task (Thêm/Sửa/Xóa/Kéo thả), gán việc, bình luận._
  4.  _Đảm bảo an toàn dữ liệu: Dữ liệu của Tenant A không bị lộ sang Tenant B._
  5.  _Triển khai thử nghiệm ứng dụng trên môi trường thực tế (Localhost hoặc Cloud free tier)._

---

**13. ĐỐI TƯỢNG, PHẠM VI NGHIÊN CỨU**

**13.1. Đối tượng nghiên cứu**

- _Kiến trúc phần mềm Đa thuê bao (Multi-tenant Architecture)._
- _Quy trình quản lý công việc (Task Management Workflow: Kanban, List, Scrum)._
- _Các công nghệ phát triển Web (Ví dụ: .NET Core/NodeJS cho Backend, React/Vue cho Frontend, SQL/NoSQL cho Database)._

**13.2. Phạm vi nghiên cứu**

- **Phạm vi nội dung:**
  - _Tập trung vào kỹ thuật xử lý dữ liệu đa thuê bao (Tenant Resolution, Data Isolation)._
  - _Các chức năng cốt lõi: Quản lý Board, Column, Card, Member, Label, Due Date._
  - _Không nghiên cứu sâu các tính năng nâng cao như: AI gợi ý công việc, tích hợp bên thứ 3 phức tạp (trừ xác thực cơ bản)._
- **Phạm vi không gian/thời gian:**
  - _Nghiên cứu và triển khai tại trường ĐH Cần Thơ._
  - _Thời gian thực hiện: 06 tháng._
- **Mẫu dữ liệu:** _Giả lập dữ liệu cho khoảng 3-5 Tenant (Công ty) khác nhau để kiểm thử tính cô lập._

---

**14. CÁCH TIẾP CẬN, PHƯƠNG PHÁP NGHIÊN CỨU**

**14.1. Cách tiếp cận**

- _(Gợi ý: Tiếp cận theo hướng Nghiên cứu lý thuyết kết hợp Thực nghiệm)_
  1.  _Nghiên cứu lý thuyết về các mô hình Multi-tenancy._
  2.  _Lựa chọn mô hình phù hợp với quy mô sinh viên (Ví dụ: Shared Database - Discriminator Column vì dễ triển khai và tiết kiệm tài nguyên)._
  3.  _Phân tích thiết kế hệ thống._
  4.  _Cài đặt (Coding) và Kiểm thử (Testing)._

**14.2. Phương pháp nghiên cứu**

- **Phương pháp thu thập và tổng hợp tài liệu:** _Tìm hiểu các Design Pattern liên quan đến SaaS._
- **Phương pháp phân tích thiết kế hệ thống:** _Sử dụng UML để vẽ biểu đồ Use Case, Class Diagram, ERD (đặc biệt lưu ý quan hệ giữa Tenant và Data)._
- **Phương pháp thực nghiệm:** _Xây dựng ứng dụng Web (Web Application)._
- **Phương pháp kiểm thử:** _Black-box testing (chức năng) và Security testing (kiểm tra việc truy cập chéo dữ liệu giữa các Tenant)._

---

**15. NỘI DUNG NGHIÊN CỨU VÀ TIẾN ĐỘ THỰC HIỆN**

**15.1. Nội dung nghiên cứu (Mô tả chi tiết)**

- **Nội dung 1: Nghiên cứu cơ sở lý thuyết.**
  - _Tìm hiểu về SaaS và Multi-tenancy._
  - _So sánh 3 chiến lược: Database riêng biệt, Schema riêng biệt, và Chung Schema (dùng ID phân loại)._
  - _Lựa chọn công nghệ (Tech stack): Ví dụ Backend (Laravel/Spring Boot/.NET), Frontend (ReactJS/Angular), Database (PostgreSQL/MySQL)._
- **Nội dung 2: Phân tích và Thiết kế hệ thống.**
  - _Xác định yêu cầu chức năng (Functional) và phi chức năng (Non-functional)._
  - _Thiết kế Cơ sở dữ liệu (Database Design) hỗ trợ đa thuê bao._
  - _Thiết kế Kiến trúc hệ thống (System Architecture) và Giao diện (UI/UX)._
- **Nội dung 3: Xây dựng Module Quản trị (System/Tenant Management).**
  - _Chức năng đăng ký/đăng nhập cho Tenant._
  - _Cơ chế "Tenant Resolution" (Xác định Tenant dựa trên Domain hoặc Subdomain hoặc Header)._
- **Nội dung 4: Xây dựng Module Quản lý công việc (Core App).**
  - _Tạo Dự án/Bảng (Board)._
  - _Tạo Danh sách (List) và Thẻ công việc (Card)._
  - _Các thao tác: Gán thành viên, Comment, Đính kèm file._
- **Nội dung 5: Kiểm thử và Đánh giá.**
  - _Kiểm thử chức năng._
  - _Kiểm thử bảo mật (Data Isolation Test)._
- **Nội dung 6: Viết báo cáo tổng kết và nghiệm thu.**

**15.2. Tiến độ thực hiện**

| STT | Các nội dung, công việc thực hiện                                                                                                               | Sản phẩm                                                                           | Thời gian | Chức danh, người thực hiện                       |
| :-- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :-------- | :----------------------------------------------- |
| 1   | **Nghiên cứu lý thuyết & Công nghệ**<br>- Tìm hiểu kiến trúc Multi-tenancy.<br>- Tìm hiểu ngôn ngữ lập trình/Framework lựa chọn.                | - Báo cáo tổng quan về Multi-tenancy.<br>- Danh sách công nghệ sử dụng.            | Tháng 1   | Chủ nhiệm (1 tháng)<br>Thành viên A (1 tháng)    |
| 2   | **Phân tích & Thiết kế hệ thống**<br>- Đặc tả yêu cầu.<br>- Thiết kế CSDL (ERD) có cột TenantID.<br>- Thiết kế giao diện (Figma/Sketch).        | - Tài liệu đặc tả yêu cầu.<br>- Bản vẽ thiết kế CSDL.<br>- Bản thiết kế giao diện. | Tháng 2   | Chủ nhiệm (1 tháng)<br>Thành viên B (1 tháng)    |
| 3   | **Xây dựng Module Tenant & Auth**<br>- Lập trình Backend: Middleware xác định Tenant.<br>- Lập trình Frontend: Trang đăng ký/đăng nhập.         | - Source code Module Authentication.<br>- Demo chức năng tạo Tenant mới.           | Tháng 3   | Thành viên A (1 tháng)<br>Thành viên C (1 tháng) |
| 4   | **Xây dựng Module Quản lý công việc**<br>- Lập trình tính năng: Board, List, Task.<br>- Kéo thả (Drag & drop) công việc.<br>- API CRUD dữ liệu. | - Source code Module Task Management.<br>- Giao diện tương tác hoàn chỉnh.         | Tháng 4   | Chủ nhiệm (1 tháng)<br>Thành viên B (1 tháng)    |
| 5   | **Kiểm thử & Tinh chỉnh**<br>- Test case kiểm tra lọt dữ liệu giữa các Tenant.<br>- Sửa lỗi (Bug fixing).                                       | - Bảng kết quả kiểm thử (Test report).<br>- Phiên bản phần mềm ổn định.            | Tháng 5   | Thành viên C (1 tháng)<br>Chủ nhiệm (0.5 tháng)  |
| 6   | **Viết báo cáo & Nghiệm thu**<br>- Viết báo cáo tổng kết.<br>- Quay video demo.<br>- Chuẩn bị slide báo cáo.                                    | - Quyển báo cáo tổng kết.<br>- Slide, Video, Poster.                               | Tháng 6   | Toàn bộ nhóm (0.5 tháng)                         |

---

**18. TÁC ĐỘNG VÀ LỢI ÍCH MANG LẠI CỦA KẾT QUẢ NGHIÊN CỨU**

**18.1. Đối với lĩnh vực giáo dục và đào tạo**

- _Là tài liệu tham khảo giá trị cho sinh viên ngành CNTT về cách triển khai kiến trúc phần mềm nâng cao (SaaS/Multi-tenancy)._
- _Giúp sinh viên tham gia đề tài rèn luyện kỹ năng Full-stack development và tư duy thiết kế hệ thống._

**18.2. Đối với lĩnh vực khoa học và công nghệ có liên quan**

- _Góp phần làm rõ quy trình chuyển đổi từ ứng dụng đơn lẻ sang mô hình điện toán đám mây cho các nhà phát triển trẻ._
- _Thử nghiệm các kỹ thuật tối ưu hóa truy vấn dữ liệu trong môi trường dữ liệu lớn phân tán._

**18.3. Đối với phát triển kinh tế-xã hội**

- _Cung cấp một giải pháp phần mềm mã nguồn mở hoặc chi phí thấp giúp các nhóm sinh viên, CLB, hoặc doanh nghiệp nhỏ quản lý công việc hiệu quả, thúc đẩy chuyển đổi số._

**18.4. Đối với tổ chức chủ trì và các cơ sở ứng dụng kết quả nghiên cứu**

- _Nâng cao năng lực nghiên cứu khoa học của sinh viên trường Đại học Cần Thơ._
- _Sản phẩm có thể được phát triển tiếp để trở thành công cụ quản lý nội bộ cho các phòng thí nghiệm hoặc nhóm nghiên cứu trong trường._

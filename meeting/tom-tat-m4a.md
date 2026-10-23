Dưới đây là biên bản tóm tắt nội dung buổi họp báo cáo tiến độ đề tài:

---

### 1. Báo cáo tiến độ của nhóm sinh viên

* **Kiến trúc hệ thống Multi-tenant:**
* Nhóm trình bày sự phân biệt giữa **Multi-user** (dùng chung dữ liệu) và **Multi-tenant** (có ranh giới phân tách dữ liệu rõ ràng giữa các tổ chức/tenant).


* Ba mô hình lưu trữ dữ liệu được tìm hiểu và thử nghiệm:
* *Pool (Dùng chung DB và Schema):* Chi phí thấp nhất nhưng khó tùy biến tính năng sâu, phân quyền bằng Tenant ID/Row-Level Security.


* *Schema riêng biệt (Bridge):* Cân bằng giữa tính tùy biến và chi phí, nhưng vẫn chịu ảnh hưởng hiệu năng nếu dùng chung một Database instance.


* *Database riêng biệt (Silo):* Độc lập, an toàn dữ liệu cao nhất nhưng tốn chi phí quản trị/vận hành.






* **Demo ứng dụng:**
* Nhóm xây dựng ứng dụng mẫu quản lý công việc theo mô hình Kanban/phân tầng công việc và thử nghiệm cấu hình cho cả 3 mô hình lưu trữ.


* Hệ thống giới hạn tài nguyên và phân quyền theo gói dịch vụ (tenant/role).





---

### 2. Nhận xét và định hướng của Giảng viên hướng dẫn

* **Làm rõ bản chất Multi-tenant thay vì chỉ tập trung vào Database:**
* Không nhảy ngay vào phần cơ sở dữ liệu mà phải xuất phát từ **bài toán tổng thể** và **kiến trúc ứng dụng đa tầng** (Presentation, Business Logic, Data).


* Phải phân tích rõ: Thành phần nào dùng chung, thành phần nào tách riêng cho từng tenant trên toàn bộ các tầng kiến trúc (giao diện, logic nghiệp vụ, dữ liệu).




* **Xác định mức độ tùy biến (Customization):**
* Tùy biến ở mức giao diện (Theme/Layout).


* Tùy biến ở mức quy trình nghiệp vụ (Business logic/quy tắc hoạt động khác nhau theo tenant).


* Nhóm cần xác định rõ phạm vi đề tài chấp nhận mức độ tùy biến đến đâu để chọn mô hình kiến trúc phù hợp, không làm lan man.




* **Các bài toán trọng tâm của hệ thống Multi-tenant cần giải quyết trong báo cáo:**
* **Hiệu năng (Performance):** Kiểm soát quá tải, giải quyết vấn đề tài nguyên khi có tenant lớn ảnh hưởng tenant khác (Noise Neighbor).


* **An toàn dữ liệu (Data Security & Isolation):** Cơ chế cô lập và bảo mật dữ liệu.


* **Vận hành (Operation):** Cơ chế cấp phát tenant mới (provisioning), sao lưu (backup), nâng cấp dữ liệu/hệ thống.




* **Hình thức báo cáo đề tài:**
* Báo cáo khoa học cần tập trung vào việc nghiên cứu mô hình, giải pháp kiến trúc, so sánh ưu/nhược điểm và đánh giá tiêu chí; sản phẩm phần mềm chỉ đóng vai trò demo minh chứng cho giải pháp đề xuất.





---

### 3. Kế hoạch nghiệm thu & Danh sách Hội đồng

* **Tiến độ hành chính:**
* Nộp đơn xin nghiệm thu đề tài trước (thời hạn thủ tục ngày 09/10), không xin gia hạn để giải quyết dứt điểm.


* Thời gian tổ chức nghiệm thu chính thức dự kiến trong vòng 1 tháng sau khi có quyết định thành lập hội đồng.




* **Đề xuất thành viên Hội đồng nghiệm thu:**
* **Chủ tịch hội đồng:** Thầy Trương Minh Thái.


* **Thành viên/Phản biện:** Thầy Cù Nguyễn Lộc, Cô Phan Phương Lan (đại diện bên Trung tâm Phần mềm/ngoài bộ môn), Thầy Nguyễn Thanh Khoa, Thầy Huỳnh Minh Trí, Thầy Bằng.


* *Lưu ý:* Thầy yêu cầu rà soát đúng quy định về số lượng thành viên ngoài khoa/trường và chuẩn hóa lại chức danh ủy viên/thư ký trong mẫu đơn.





---

### 4. Công việc tiếp theo (Action Items)

1. Hoàn thiện đơn đăng ký nghiệm thu và nộp theo đúng hạn.


2. Hệ thống lại nội dung báo cáo: Nêu rõ định nghĩa/đặc trưng Multi-tenant vs Multi-user $\rightarrow$ Vấn đề đặt ra $\rightarrow$ So sánh các mô hình kiến trúc $\rightarrow$ Lý do lựa chọn giải pháp của nhóm.


3. Chuẩn bị slide báo cáo ngắn gọn, súc tích và hẹn gặp thầy phản biện trực tiếp trước buổi báo cáo chính thức.
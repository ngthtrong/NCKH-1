# 08. Cập nhật hệ thống, bán kính ảnh hưởng và phạm vi thông tin đăng nhập

Tài liệu này lấp hai chỗ trống đã nêu: phần "cập nhật" trong ghi chú của nhóm mới có bốn gạch đầu dòng (ba mục để trống), và bán kính ảnh hưởng chưa được phân tích theo kịch bản. Nó cũng nêu một lựa chọn thiết kế mà các tài liệu 04 và 05 phụ thuộc vào (mục 3).

## 1. Cập nhật trong hệ thống đa thuê bao

Khung của Azure (*Updating a multitenant solution*): xác định yêu cầu của khách hàng; xác định yêu cầu của chính mình; tìm điểm cân bằng; truyền thông rõ ràng. Cách triển khai cập nhật "phụ thuộc nhiều vào mô hình thuê bao". Bốn kỹ thuật, dùng riêng hoặc phối hợp:

| Kỹ thuật | Nội dung | Khi dùng | Áp dụng cho kiến trúc đề xuất |
|---|---|---|---|
| Bản triển khai (stamp) | Triển khai nhiều bản sao; cập nhật dần từng bản mà không ảnh hưởng bản khác | Khi cần cô lập giữa nhóm thuê bao, nhịp cập nhật khác nhau | Chưa dùng: chỉ một bản triển khai (tài liệu 03, mục 4). Là hướng mở rộng |
| Cờ tính năng (feature flags) | Thêm chức năng nhưng chỉ bật cho một nhóm thuê bao | Muốn triển khai thường xuyên nhưng chưa lộ chức năng chưa xong, hoặc chỉ đổi hành vi khi thuê bao đồng ý | Dùng cho chức năng ứng dụng; trạng thái cờ lưu theo thuê bao trong cấu hình |
| Vòng triển khai (rings) | Cập nhật dần qua các nhóm thuê bao: canary (thuê bao thử và người muốn nhận sớm), early adopter, users | Muốn giới hạn rủi ro khi phát hành | Dùng cho cả mã ứng dụng lẫn migration: chia thuê bao thành vòng trong danh mục thuê bao |
| Phiên bản API | Quản lý thay đổi phá vỡ với bên tích hợp | Khi có API công khai cho khách hàng hay đối tác | Khi nào có API công khai mới cần |

Các điểm cần dùng của Azure cho phần dữ liệu:
- Theo dõi phiên bản lược đồ của từng thuê bao ("Track the schema version that you use for each tenant in a dedicated database or lookup table") và đặt trách nhiệm đó ở mặt phẳng điều khiển.
- Ứng dụng phải tương thích ngược với ít nhất một phiên bản lược đồ trước, và các thay đổi phá vỡ phải được xếp thành nhiều bước ("version dependencies" là antipattern). Tức là dùng mẫu mở rộng rồi thu hẹp.
- Cập nhật khẩn cấp (vá bảo mật) có thể cần quyền triển khai với thông báo tối thiểu; thuê bao cần biết trước nguyên tắc này.

**Tác động của vị trí dữ liệu.** Azure nói về mô hình dùng chung hoàn toàn: bảo trì đơn giản vì chỉ cập nhật một bộ tài nguyên, "However, it's also often riskier because changes might affect your entire customer base." Ngược lại ở S2 và S3 có thể áp dụng vòng triển khai cho chính migration: migrate thuê bao canary trước, quan sát, rồi mới đến các vòng sau; S4 chỉ có một lần cho tất cả. Đây là một lợi ích của lược đồ riêng mà Bảng 6.3 (tiêu chí Maintainability) không thể hiện, vì nó đo công sức chứ không đo rủi ro. Giả thuyết H4 đo cả hai (tài liệu 06).

## 2. Bán kính ảnh hưởng theo sự cố và kịch bản

Bán kính ảnh hưởng là phạm vi thuê bao bị tác động khi một sự cố xảy ra. Ba kịch bản dùng chung thể hiện ứng dụng và máy chủ CSDL, nên phần lớn sự cố hạ tầng chung đều chạm mọi thuê bao.

| Sự cố | S2 | S3 | S4 | Ghi chú |
|---|---|---|---|---|
| Migration hỏng ở dữ liệu của một thuê bao | thuê bao đó | thuê bao đó | **mọi thuê bao** | Với S2 và S3 phụ thuộc có áp dụng vòng triển khai hay không |
| Khóa dài hoặc phình bảng trên một bảng | CSDL của thuê bao đó | bảng của thuê bao đó (danh mục hệ thống vẫn dùng chung) | bảng dùng chung, **mọi thuê bao** | Cần đo ở H2 và MB-scale |
| Khôi phục dữ liệu một thuê bao | thuê bao đó | thuê bao đó | khôi phục CSDL sang nơi khác rồi chọn lọc (Azure) | H5 |
| Máy chủ PostgreSQL sập hoặc khởi động lại | mọi thuê bao | mọi thuê bao | mọi thuê bao | Chỉ S1 (hoặc nhiều cluster) thu hẹp được |
| Lỗi hay quá tải của thể hiện ứng dụng | mọi thuê bao | mọi thuê bao | mọi thuê bao | AI: tầng ứng dụng dùng chung nên cần kiểm soát hàng xóm ồn ào ở ứng dụng |
| Mặt phẳng điều khiển ngừng | không onboard được, không quản lý, không đo; thuê bao đang chạy có tiếp tục hay không phụ thuộc yêu cầu có cần tra `control_db` lúc chạy | như S2 | như S2 | Azure *Control planes*: "In extreme cases, an outage might make your entire solution unavailable"; PDF của nhóm đã nêu câu hỏi này, cần kiểm bằng thí nghiệm lỗi |
| Lộ thông tin đăng nhập của bộ cấp phát | mọi thuê bao | mọi thuê bao | mọi thuê bao | Bộ cấp phát phải giữ thông tin đăng nhập riêng, tách khỏi ứng dụng (Azure: mặt phẳng điều khiển là hệ thống đặc quyền) |

## 3. Phạm vi thông tin đăng nhập ở tầng dữ liệu: một lựa chọn thiết kế cần chốt

Cô lập theo đặc quyền (S3) hay theo CSDL (S2) chỉ có giá trị bảo mật nếu *cách ứng dụng kết nối* phù hợp. Có hai cách dùng vai trò CSDL theo thuê bao:

| Cách | Mô tả | Bảo vệ được | Không bảo vệ được | Hệ quả về nhóm kết nối |
|---|---|---|---|---|
| (a) Kết nối bằng chính vai trò của thuê bao | Mỗi thuê bao có thông tin đăng nhập riêng; ứng dụng kết nối với tư cách vai trò đó | Lỗi định tuyến **và** lộ thông tin đăng nhập hoặc SQL injection: kẻ tấn công chỉ có quyền của một thuê bao | | Nhóm kết nối tách theo vai trò, giống phân mảnh của S2 |
| (b) Đăng nhập chung rồi chuyển vai trò (`SET LOCAL ROLE`) | Một nhóm kết nối chung, mỗi giao dịch chuyển sang vai trò của thuê bao | Lỗi định tuyến, lỗi viết truy vấn thiếu điều kiện | Lộ hoặc lạm dụng tài khoản đăng nhập chung: tài khoản này phải là thành viên của mọi vai trò thuê bao nên có thể chuyển sang bất kỳ vai trò nào; SQL injection có thể thực hiện `SET ROLE` | Một nhóm kết nối chung |

Tương tự ở S4: biến phiên như `app.tenant_id` có thể được đặt bởi bất kỳ phiên nào (đây là tham số tùy chỉnh), nên RLS ở S4 bảo vệ trước lỗi quên điều kiện lọc, nhưng không bảo vệ khi kẻ tấn công thực thi được SQL tùy ý với tài khoản đăng nhập chung. Cả S3 ở cách (b) và S4 đều ở trong tình huống này; chỉ S2 (mỗi CSDL một thông tin đăng nhập) và S3 ở cách (a) tránh được.

**Hệ quả cho các tài liệu trước:**
- Lập luận L2 trong tài liệu 05 (S3 từ chối khi lỗi mà không phân mảnh nhóm kết nối) đúng với cách (b) *đối với lỗi định tuyến*; với cách (a), S3 cũng phải có nhiều nhóm kết nối, và lợi thế so với S2 ở điểm này không còn. Điều này không đổi kết luận chọn S3 (L1, L3, L4, L5 vẫn đứng) nhưng làm yếu L2.
- Nhóm cần **chọn cách (a) hay (b)** cho S3, ghi rõ trong báo cáo và đưa vectơ tấn công "SQL injection thực thi `SET ROLE` hoặc `SET app.tenant_id`" vào thí nghiệm E1. Đây là một dấu hiệu rõ rằng khẳng định "S3 an toàn hơn S4" phải đi kèm điều kiện cấu hình.
- Cần xác nhận cách đang cài đặt trong ứng dụng; repo này không chứa mã nên chưa kiểm được.

*Ghi chú nguồn:* các hành vi `SET ROLE` và biến phiên tùy chỉnh là kiến thức chuẩn của PostgreSQL, chưa được trích từ tài liệu trong phiên này (xem 07, mục 4). Thực nghiệm E1 sẽ kiểm chúng bằng test.

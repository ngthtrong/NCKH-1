# 03. Ngăn xếp kiến trúc đa thuê bao hiện đại

Hình: `report/assets/diagrams/fig-modern-stack.{en,vi}.pdf`. Nhãn hình bằng tiếng Anh học thuật theo yêu cầu của thầy; bản `.vi.pdf` có cùng bố cục.

## 1. Vì sao không dùng nguyên Figure 2.2 của Kabbedijk

Figure 2.2 (K14 tr. 41, 12/2014) liệt kê chín tầng "mà đa thuê bao có thể áp dụng": phần cứng, máy ảo, hệ điều hành, máy chủ CSDL, CSDL, lược đồ, middleware, máy chủ ứng dụng, thể hiện ứng dụng. Đó là ngăn xếp **tài nguyên chạy**. So với hướng dẫn hiện hành của Azure và AWS, nó thiếu bốn mảng mà một hệ thống đa thuê bao ngày nay phải quyết định:

| Khoảng trống | Vì sao quan trọng | Căn cứ |
|---|---|---|
| Không có tầng nhận diện thuê bao và định danh | Đây là cơ chế đa thuê bao đầu tiên mà mọi yêu cầu đi qua; sai ở đây thì mọi tầng sau đều sai | Azure *Map requests*; AWS-f |
| Chỉ có CSDL; không có lưu trữ đối tượng, bộ nhớ đệm, hàng đợi | Tệp, cache, thông điệp cũng mang dữ liệu thuê bao và cũng cần ranh giới | Azure *Storage and data* (mục file và blob); Azure liệt kê các mảng compute, networking, storage, data, messaging, identity |
| Không có mặt phẳng điều khiển và vận hành | Cấp phát, vòng đời, đo lường, sao lưu, cập nhật là phần nặng của vận hành, và là bài toán thứ ba thầy yêu cầu | AWS-f; Azure *Control planes*, *Updates* |
| Không có tầng trình diễn và cấu hình | Tùy biến giao diện và quy trình là phần thầy yêu cầu xác định phạm vi | K14 chương 7 (variability); Azure: "use feature flags and other forms of tenant configuration" |

K14 tr. 95 cố ý loại phần cứng, máy ảo, hệ điều hành và middleware khỏi các kiến trúc ⟨A,D⟩ vì với nhà cung cấp dịch vụ chúng "little importance" cho thiết kế phần mềm. Hình mới giữ tầng nền tảng thực thi nhưng vẽ nét đứt, đúng với tinh thần đó.

## 2. Các tầng, thành phần và mức chia sẻ

Cột "Mức chia sẻ" xếp từ chia sẻ nhiều nhất đến dùng riêng nhiều nhất (tương ứng chiều từ trái sang phải trên hình).

| Tầng | Thành phần | Mức chia sẻ | Ranh giới thuê bao được thực thi bằng | Căn cứ |
|---|---|---|---|---|
| Máy khách và biên | DNS và TLS ký tự đại diện, CDN, proxy ngược hoặc API gateway, nhận diện thuê bao (host → thuê bao) | lối vào dùng chung → tên miền và chứng chỉ riêng → gateway riêng | Đối chiếu host, token, tư cách thành viên, trạng thái thuê bao | Azure *Map requests*, *Domain names* |
| Định danh và truy cập | Nhà cung cấp danh tính, phiên và token mang định danh thuê bao, vai trò (RBAC), chính sách, kiểm tra quyền sử dụng | thư mục dùng chung với định danh thuê bao trong token → vùng riêng → nhà cung cấp riêng | Token kiểm ở máy chủ; một người dùng có thể thuộc nhiều thuê bao | Azure *Map requests* (token claims) |
| Trình diễn | Gói SPA, cấu hình giao diện và bố cục, biểu mẫu và bảng dựng từ siêu dữ liệu | một bản dựng, cấu hình nạp lúc chạy → một bản dựng cho mỗi thuê bao | Giao diện chỉ là trải nghiệm, ranh giới thật ở máy chủ | K14 (variability); nguyên tắc của nhóm |
| Logic ứng dụng (trục A) | Máy chủ và thể hiện ứng dụng, ngữ cảnh thuê bao, quy tắc nghiệp vụ, bộ máy quy trình và chính sách, tiến trình nền mang định danh thuê bao | AI → AS → AD | Ngữ cảnh thuê bao bất biến; hạn mức tốc độ và vách ngăn đồng thời theo thuê bao | K14 tr. 95; Azure *Noisy Neighbor* |
| Dịch vụ dữ liệu (trục D) | CSDL quan hệ (máy chủ, CSDL, lược đồ, bảng, dòng), lưu trữ đối tượng, bộ nhớ đệm, hàng đợi và outbox | DC → DB → DS → DD; đối tượng: một bucket với tiền tố → bucket riêng | Chính sách mức dòng, đặc quyền trên lược đồ, thông tin đăng nhập từng CSDL, tiền tố khóa | K14 tr. 95–96; PostgreSQL; Azure *Storage and data* |
| Nền tảng thực thi | Tiến trình hoặc container, máy ảo, hệ điều hành, phần cứng | nút dùng chung với giới hạn tài nguyên → nút riêng | Giới hạn tài nguyên | K14 tr. 95 (ngoài quyết định phần mềm) |
| Mặt phẳng điều khiển (dọc) | Danh mục thuê bao, đăng ký, vòng đời, vị trí, quyền sử dụng và hạn mức, đo lường | một mặt phẳng toàn cục | Thông tin đăng nhập riêng, tách khỏi mặt phẳng ứng dụng | Azure *Control planes* |
| Vận hành (ngang) | Quan sát theo thuê bao, sao lưu và khôi phục, quản lý phát hành và cập nhật, xử lý sự cố | chia sẻ | Nhãn thuê bao trong số liệu; quy trình cập nhật theo thuê bao | Azure *Updates*, *Noisy Neighbor* |

## 3. Hai trục A và D và quy luật bất biến

K14 tr. 94: "When multi-tenancy is applied at a specific level, the levels below that level are shared among tenants as well, but isolation occurs at the levels above." Quy luật áp dụng độc lập cho tầng ứng dụng (A) và tầng dữ liệu (D). Hệ quả: mỗi trục chỉ có một dãy lựa chọn tuyến tính từ nhiều chia sẻ đến ít chia sẻ.

| Trục | Lựa chọn (từ nhiều chia sẻ đến ít) | Ý nghĩa |
|---|---|---|
| A | **AI**: một thể hiện ứng dụng cho nhiều thuê bao; **AS**: mỗi thuê bao một thể hiện trên máy chủ ứng dụng chung; **AD**: mỗi thuê bao một máy chủ ứng dụng | K14 tr. 95 |
| D | **DC**: lược đồ chung, bảng chung; **DB**: CSDL chung, bộ bảng (lược đồ) riêng; **DS**: CSDL riêng trên máy chủ CSDL chung; **DD**: máy chủ CSDL riêng | K14 tr. 95–96 |

Vì sao chỉ hai trục này định nghĩa kiến trúc? K14 quy tắc RT1 (tr. 102): tác động của lựa chọn MTA lên các tiêu chí "is largest on the database dimension", và chiều ứng dụng đứng sau. Các tầng còn lại là tầng "vệ tinh": chúng cần quyết định nhưng ít làm đổi tính chất tổng thể (mục 4).

Mười hai tổ hợp ⟨A,D⟩ = 3 × 4 của K14; trong đề tài chỉ ba tổ hợp thực sự khác nhau về tầng dữ liệu được đo (S2, S3, S4), cộng hai tổ hợp tham chiếu. Chi tiết ở tài liệu 04.

## 4. Các tầng vệ tinh: giữ cố định và lý do

Trong mọi kịch bản S1 đến S4, các tầng sau giữ nguyên. Hai lý do chung: (1) *một yếu tố mỗi lần*: chênh lệch đo được chỉ quy cho tầng dữ liệu; (2) K14 RT1 cho thấy tầng dữ liệu là chiều ảnh hưởng nhiều nhất, nên đáng được cô lập để nghiên cứu.

| Tầng | Giữ cố định ở | Lý do cụ thể |
|---|---|---|
| Biên | Lối vào ký tự đại diện dùng chung, ánh xạ host sang thuê bao | Azure *Map requests*: khi mỗi thuê bao có tên miền hoặc miền con riêng thì ánh xạ qua header `Host` là đơn giản; một lối vào dùng chung giữ chi phí và công vận hành ở mức một VPS |
| Định danh | Một thư mục người dùng, định danh thuê bao nằm trong token và được kiểm ở máy chủ | Giữ thống nhất cách xác thực giữa các kịch bản; kiểm tra chéo host–token–tư cách thành viên là chốt chặn 1 |
| Trình diễn | Một bản dựng, cấu hình nạp lúc chạy | Tùy biến giao diện thành dữ liệu cấu hình (P6); một bản dựng giữ một đường phát hành duy nhất |
| Ứng dụng | AI | (i) Thuyết minh yêu cầu "một hệ thống phần mềm duy nhất phục vụ nhiều thuê bao"; (ii) K14 RT3: thể hiện dùng chung "helps maintainability and performance, but harms variability", nên khả năng tùy biến phải đến từ cấu hình chứ không đến từ tách thể hiện; (iii) không biến thiên trục A để thí nghiệm sạch |
| Lưu trữ đối tượng | Một bucket, tiền tố khóa do máy chủ tạo, URL ký ngắn hạn | Azure *Storage and data*: có thể dùng container hoặc đường dẫn chung để tách dữ liệu, nhưng phải thiết kế xác thực và phân quyền để thuê bao không truy cập dữ liệu của nhau, và nên dùng mẫu Valet Key khi cấp quyền truy cập; khóa đối tượng do máy chủ sinh, không nhận từ máy khách (nguyên tắc P1) |
| Cache và hàng đợi | Dùng chung, định danh thuê bao nằm trong khóa hoặc thông điệp | Chốt chặn 5; cô lập hàng đợi là chủ đề riêng (hàng đợi công bằng) |
| Mặt phẳng điều khiển | Một mặt phẳng | Azure: "Most solutions need only one control plane"; dưới 10 thuê bao có thể làm tối giản, nhưng vì ứng dụng có đăng ký tự phục vụ nên cần control plane sớm (cũng theo Azure) |
| Bản triển khai | Một cụm (một stamp) | Azure: dùng mẫu stamp thì phải triển khai tối thiểu hai stamp và chi phí tăng đáng kể; với 3–5 thuê bao chưa có lý do. Giữ stamp ở mức hướng mở rộng |

## 5. Đọc ngăn xếp cho ứng dụng quản lý công việc: mức tùy biến phụ thuộc tầng nào

Thầy yêu cầu xác định mức tùy biến chấp nhận được để chọn kiến trúc. Ngăn xếp cho phép trả lời: mỗi mức tùy biến nằm ở tầng nào, và chỉ những mức nằm ở tầng dữ liệu mới bị lựa chọn D chi phối.

| Mức tùy biến (Phụ lục A.2, chưa phê duyệt) | Thực hiện ở tầng | Phụ thuộc lựa chọn D? |
|---|---|---|
| Giao diện: màu, logo (`BRANDING`) | Trình diễn và cấu hình thuê bao | Không |
| Quy trình: phê duyệt nhiều bước, tự động hóa hữu hạn (`APPROVALS`, `AUTOMATION`) | Logic ứng dụng (bộ máy quy trình và chính sách) | **Không về mặt kỹ thuật.** Chúng chạy trong thể hiện ứng dụng dùng chung; rủi ro chính là tải tính toán (noisy neighbor), không phải vị trí dữ liệu. Phụ lục A hiện chỉ cấp chúng cho `SILO_DATABASE`: đó là chính sách sản phẩm, nên báo cáo phải nêu lý do thương mại hoặc tải chứ không viện lý do cô lập CSDL |
| Dữ liệu: trường mở rộng, bảng mới theo dự án (`CUSTOM_DATA`) | Dữ liệu | **Có.** Lược đồ riêng hoặc CSDL riêng cho phép thêm cột như cột thường (K14 Datasource Router); lược đồ chung buộc phải dùng bảng thuộc tính định kiểu (K14 Custom Property Object). Mỗi cách có đánh đổi riêng (tài liệu 04) |

Đây là kết luận của nhóm, tổng hợp từ K14 mục 7.6 và Azure. Nó thu hẹp đáng kể phạm vi "tùy biến phụ thuộc kiến trúc": chỉ còn tùy biến dữ liệu.

## 6. Nhãn tiếng Anh dùng trong hình

Client and edge · Identity and access · Presentation · Application logic · Data services · Runtime platform · Control plane · Operations · tenant resolution · tenant context · entitlement · shared · dedicated · AI, AS, AD · DC, DB, DS, DD.

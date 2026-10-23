# 02. Mô hình kiến trúc đa thuê bao (MTA) tổng thể

Hình: `report/assets/diagrams/fig-mta-reference-model.{en,vi}.pdf` và `fig-mu-mi-mt.{en,vi}.pdf`. Thuật ngữ theo [01-khai-niem.md](01-khai-niem.md).

Yêu cầu của thầy: trước khi lên kịch bản phải có một mô hình trình bày MTA toàn diện, gồm nhưng không dừng ở thuê bao, dịch vụ và thể hiện; không đào sâu kỹ thuật; các khối liên kết chặt; nhìn vào không nhầm với đa người dùng và đa thể hiện.

## 1. Các thành phần của mô hình và lý do có mặt

| Thành phần | Vai trò trong mô hình | Vì sao bắt buộc phải có |
|---|---|---|
| Nhà cung cấp, Dịch vụ | Nhà cung cấp vận hành dịch vụ; khách hàng thấy dịch vụ chứ không thấy hạ tầng | ISO 3.2.8, 3.2.15; NIST SaaS: người dùng không quản lý hạ tầng bên dưới |
| Gói (plan) | Quy định quyền sử dụng và hạn mức của một thuê bao | Không có gói thì không có cơ sở để hạn mức, tính tiền hay gác tính năng. Azure và AWS đều coi hạn mức theo thuê bao là trách nhiệm của hệ thống |
| Tổ chức khách hàng, Thuê bao, Người dùng | Khách hàng sở hữu một hoặc nhiều thuê bao; thuê bao gồm nhiều người dùng; người dùng có thể thuộc nhiều thuê bao với vai trò độc lập | ISO 3.2.37 và mục 6; Azure: "Tenants are distinct from users" |
| Bản triển khai, thể hiện ứng dụng, thể hiện kho dữ liệu | Nơi dịch vụ thực sự chạy; một thuê bao được đặt vào một bản triển khai | Azure *Tenancy models*: phải phân biệt thuê bao logic và bản triển khai, vì khác nhau ở cách cô lập được thực thi. Không có khái niệm này thì không mô tả được cả mô hình dùng chung lẫn mô hình dùng riêng |
| Đường truy cập: yêu cầu → nhận diện thuê bao → ngữ cảnh thuê bao | Biến một yêu cầu thành ngữ cảnh đã xác minh, rồi mới chạm vào thành phần nghiệp vụ | Azure *Map requests*: "Whenever a request arrives… you need to determine the tenant context". Đây là cơ chế đa thuê bao đầu tiên mà ngăn xếp 2014 của K14 không có |
| Cấu hình thuê bao (siêu dữ liệu) | Chứa khác biệt giữa các thuê bao thay cho mã riêng | K14: đa thuê bao đòi hỏi "exclusively configure"; NIST: cấu hình có giới hạn; Azure: tránh tách nhánh mã |
| Ranh giới cô lập | Nằm giữa thành phần dùng chung và dữ liệu từng thuê bao | ISO 3.2.27: định nghĩa đa thuê bao đòi hỏi cô lập |
| Mặt phẳng điều khiển (danh mục thuê bao, đăng ký và cấp phát, vòng đời, quyền và hạn mức, đo lường, phát hành và cập nhật) | Quản lý thuê bao ở cấp toàn hệ thống | AWS-f: "foundational to any multi-tenant SaaS model". Azure *Control planes* liệt kê đúng các trách nhiệm này; Azure *Updates*: theo dõi phiên bản của từng thuê bao là việc của control plane |
| Mặt phẳng ứng dụng | Phần nhận biết thuê bao, nơi người dùng làm việc | AWS-f: nơi chức năng đa thuê bao của ứng dụng nằm |

Các mũi tên giữa mặt phẳng điều khiển và mặt phẳng ứng dụng có ba nội dung: cấp phát, cấu hình, định tuyến và áp hạn mức đi xuống; số liệu sử dụng và tình trạng đi lên; thuê bao được đăng ký và ghi vào danh mục. Nhờ vậy mô hình trả lời được cả ba bài toán thầy nêu: hiệu năng (hạn mức, đo lường), an toàn dữ liệu (ranh giới, ngữ cảnh), vận hành (cấp phát, vòng đời, cập nhật).

## 2. Sáu tính chất mà mô hình ngụ ý

Mỗi tính chất có căn cứ và đưa ra một phép kiểm chứng được (liên kết sang tài liệu 06).

| # | Tính chất | Căn cứ | Phép kiểm |
|---|---|---|---|
| P1 | Mỗi yêu cầu có đúng một ngữ cảnh thuê bao, suy ra từ bằng chứng đã xác minh, không nhận định danh thuê bao từ máy khách | Azure *Map requests*: "Even though the request includes a domain name or other tenant identifier, it doesn't mean you should automatically grant access" | Thử đổi host, token, tham số đường dẫn, tham số truy vấn (H1) |
| P2 | Ngữ cảnh thuê bao tách biệt với quyền người dùng; cả hai phải thỏa | Azure *Map requests*: "Tenant mapping is a separate activity" | Người dùng hợp lệ của thuê bao A gọi tài nguyên của B (H1) |
| P3 | Mặt phẳng điều khiển dùng chung toàn hệ thống và không nhận biết thuê bao; mặt phẳng ứng dụng nhận biết thuê bao | AWS-f: "the control plane and its services are not actually multi-tenant" | Quản trị hệ thống không đọc được nội dung thuê bao (H1) |
| P4 | Tại một thời điểm một thuê bao thuộc đúng một bản triển khai và một vị trí dữ liệu; chuyển vị trí là thao tác riêng, tốn kém | Azure *Deployment Stamps*: "moving tenants between stamps can be difficult" | Không có luồng chuyển placement trong phạm vi; kiểm tra bất biến sau khi có dữ liệu |
| P5 | Cô lập được thực thi ở ít nhất hai tầng độc lập | Azure *Map requests* nêu nguyên tắc "assume breach"; PostgreSQL: chủ bảng và vai trò BYPASSRLS bỏ qua RLS, kiểm tra khóa ngoại là kênh lộ thông tin; K14 mục 7.6.4.1: lỗi lập trình làm lẫn dữ liệu khi chỉ dựa bộ lọc ở ứng dụng | Kiểm thử đột biến: tắt từng chốt chặn và xác nhận chốt khác bắt được (H1) |
| P6 | Tùy biến là dữ liệu cấu hình, không phải mã hay hạ tầng riêng cho từng thuê bao | Azure *Storage and data*: "Avoid forking or providing customized infrastructure for individual tenants" | Hai thuê bao khác cấu hình chạy cùng một bản dựng |

## 3. Phân biệt đa người dùng, đa thể hiện và đa thuê bao

Hình `fig-mu-mi-mt` vẽ ba mô hình bằng cùng một bộ ký hiệu: màu xanh là dùng chung, màu theo thuê bao là dùng riêng, đứt nét đỏ là ranh giới thuê bao.

| Tiêu chí | Đa người dùng (MU) | Đa thể hiện (MI) | Đa thuê bao (MT) | Nguồn |
|---|---|---|---|---|
| Thể hiện ứng dụng | 1 | N (mỗi thuê bao một) | 1 dùng chung | K14 tr. 43, 94 |
| Dùng chung tài nguyên | có | có thể | có | K14 Bảng 2.5 |
| Cấu hình lúc chạy | một phần | có thể | đầy đủ | K14 Bảng 2.5 |
| Ranh giới giữa các nhóm người dùng | không có; chỉ có vai trò | theo cấu trúc (các thể hiện riêng) | do phần mềm và chính sách thực thi bên trong thể hiện chung | Nhóm tổng hợp |
| Đơn vị nâng cấp | 1 | N | 1 | Nhóm tổng hợp từ K14 mục 6.1 (số thể hiện thấp thì bảo trì dễ hơn) |
| Điều kiện loại trừ | | | cần tính "trong suốt": khách hàng không biết có khách hàng khác dùng chung | K14 tr. 43 |

**Phép thử ba câu khi nhìn một hình hay một hệ thống:**
1. Có ranh giới giữa các nhóm người dùng thuộc các tổ chức khác nhau không? Không có: đa người dùng.
2. Mỗi khách hàng có bộ thể hiện riêng không? Có: đa thể hiện.
3. Một bộ chung, với ranh giới đặt bên trong và cấu hình riêng cho mỗi thuê bao: đa thuê bao.

**Lưu ý quan trọng (lý do dùng ký hiệu ⟨A,D⟩):** đa thuê bao hay đa thể hiện không phải một nhãn nhị phân cho cả hệ thống mà áp dụng cho **từng tầng**. K14 tr. 43 yêu cầu gán thuộc tính này cho "a system, service, database, or hardware resource". Một hệ thống có thể là đa thuê bao ở tầng ứng dụng nhưng đa thể hiện ở tầng dữ liệu (ví dụ một ứng dụng dùng chung với CSDL riêng cho từng thuê bao). Đây là lý do mô hình tổng thể ở tài liệu này tách ứng dụng và dữ liệu, và là cơ sở để sinh kịch bản ở tài liệu 04.

## 4. Những gì mô hình cố ý không có

| Bị lược | Lý do |
|---|---|
| Công nghệ cụ thể (JWT, RLS, PostgreSQL, MinIO) | Mô hình phải dùng chung cho mọi cài đặt; công nghệ chỉ xuất hiện từ hình ngăn xếp và hình kiến trúc được chọn |
| Nhiều bản triển khai (stamp) | Là cách mở rộng quy mô, không phải thành phần bắt buộc. Có mặt dưới dạng quan hệ "thuê bao được đặt vào bản triển khai" (1–nhiều) |
| Thanh toán và hóa đơn | Chỉ xuất hiện dưới dạng gói, quyền sử dụng, hạn mức và đo lường ở mặt phẳng điều khiển |
| Phần cứng, máy ảo, hệ điều hành | K14 tr. 95: với nhà cung cấp dịch vụ, nhiều thuê bao ở các tầng thấp này ít quan trọng vì không ảnh hưởng quyết định thiết kế phần mềm |

## 5. Ánh xạ sang ứng dụng (theo ghi chú của nhóm, chưa kiểm mã)

| Khái niệm | Hiện thực nêu trong PDF của nhóm |
|---|---|
| Thuê bao | Không gian làm việc (workspace) |
| Danh mục thuê bao | `control_db` (tenant, membership, tier, route, placement, capability, payment) |
| Nhận diện thuê bao | Đối chiếu host với route, token và membership |
| Ngữ cảnh thuê bao | `TenantContext` (user, tenant, tier, placement, role, correlation ID) |
| Mặt phẳng điều khiển | API `/api/v1/admin/*`, trang quản trị, worker cấp phát |
| Thể hiện kho dữ liệu | Pool / schema / database theo placement |

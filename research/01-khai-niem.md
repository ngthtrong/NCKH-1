# 01. Khái niệm nền: thuê bao, dịch vụ, thể hiện, bản triển khai, chia sẻ và dùng riêng

Mục tiêu: một bộ định nghĩa chung dùng xuyên suốt báo cáo, không gắn với ngữ cảnh ứng dụng Kanban, ai đọc cũng hiểu, và không sinh thêm khái niệm mới bên trong một khái niệm. Mã nguồn trích dẫn xem [07-nguon-va-hieu-chinh.md](07-nguon-va-hieu-chinh.md).

## 1. Cách kiểm tra một định nghĩa

Kabbedijk (K14 tr. 41–42) chấm 43 định nghĩa đa thuê bao trong tài liệu bằng năm tiêu chí của Copi và Miller (1972). Nhóm dùng đúng danh sách này làm phép tự kiểm cho mọi định nghĩa trong tài liệu này:

| # | Tiêu chí | Hỏi |
|---|---|---|
| T1 | Nêu thuộc tính thiết yếu | Có nói được điều cốt lõi của khái niệm không? |
| T2 | Không vòng tròn | Có dùng chính khái niệm đó (hoặc khái niệm được định nghĩa dựa vào nó) để giải thích nó không? |
| T3 | Không quá rộng, không quá hẹp | Có bao hết và chỉ bao các trường hợp đúng không? |
| T4 | Không tối nghĩa | Người không chuyên có hiểu không? |
| T5 | Không phủ định khi có thể khẳng định | Có thể phát biểu bằng điều nó *là* thay vì điều nó *không phải* không? |

Hai yêu cầu bổ sung của thầy: (a) định nghĩa phải chung, chỉ rút gọn theo bài toán khi cần; (b) làm rõ rồi Việt hóa, và không để một khái niệm sinh ra khái niệm mới.

## 2. Bảng thuật ngữ

Quy ước: thuật ngữ tiếng Việt viết trước, tiếng Anh trong ngoặc ở lần đầu xuất hiện. Cột "Căn cứ" cho biết định nghĩa lấy từ đâu; những dòng ghi "đề xuất của nhóm" là cách diễn đạt do nhóm viết, tuân theo T1 đến T5, vì không có văn bản chuẩn.

| Thuật ngữ | Định nghĩa dùng trong báo cáo | Căn cứ |
|---|---|---|
| **Dịch vụ** (service) | Một hoặc nhiều chức năng được cung cấp qua mạng thông qua một giao diện xác định. Người dùng nhận kết quả, không cần biết hệ thống bên dưới. | ISO/IEC 17788 mục 3.2.8 |
| **Nhà cung cấp** (provider) | Bên làm cho dịch vụ sẵn sàng để sử dụng. | ISO 3.2.15 |
| **Khách hàng** (customer) | Bên có quan hệ kinh doanh để sử dụng dịch vụ (không nhất thiết có thanh toán). | ISO 3.2.11 |
| **Người dùng** (user) | Cá nhân, hoặc thực thể hành động thay mặt, thuộc một khách hàng và sử dụng dịch vụ. | ISO 3.2.17 |
| **Thuê bao** (tenant) | Một hoặc nhiều người dùng cùng truy cập dịch vụ như một đơn vị. Thường họ thuộc cùng một tổ chức khách hàng; một khách hàng có thể có nhiều thuê bao. | ISO 3.2.37 và mục 6; Azure (tenant khác user) |
| **Cô lập** (isolation) | Bảo đảm một thuê bao, cùng tính toán và dữ liệu của nó, không bị thuê bao khác truy cập hoặc can thiệp. | ISO 3.2.27 |
| **Đa thuê bao** (multi-tenancy) | Thuộc tính của một hệ thống mà nhiều thuê bao dùng chung tài nguyên của hệ thống (dịch vụ, ứng dụng, CSDL, phần cứng) để giảm chi phí, nhưng vẫn được cấu hình riêng theo nhu cầu và được cô lập với nhau. | K14 tr. 42 kết hợp ISO 3.2.27; nhóm thêm vế "cô lập" của ISO |
| **Thể hiện** (instance) | Một bản đang chạy của một thành phần phần mềm hoặc hạ tầng. Luôn đi kèm tên tầng: thể hiện ứng dụng, thể hiện máy chủ CSDL. | Cách dùng của K14 tr. 43; đề xuất của nhóm |
| **Bản triển khai** (deployment) | Tập hợp các thể hiện cùng hạ tầng đi kèm, được cài đặt và vận hành cùng nhau để phục vụ một nhóm thuê bao xác định. Còn gọi là cụm hoặc stamp. | Azure *Tenancy models*; đề xuất của nhóm |
| **Chia sẻ** (shared) | Một thể hiện của thành phần phục vụ đồng thời từ hai thuê bao trở lên. | Đề xuất của nhóm (mục 3) |
| **Dùng riêng** (dedicated) | Một thể hiện của thành phần chỉ phục vụ đúng một thuê bao. | Đề xuất của nhóm (mục 3) |
| **Ngữ cảnh thuê bao** (tenant context) | Thông tin đã được xác minh cho biết yêu cầu đang xử lý thuộc thuê bao nào (kèm người dùng, vai trò, gói). Tách biệt với việc kiểm tra quyền của người dùng. | Azure *Map requests to tenants* |
| **Mặt phẳng ứng dụng** (application plane) | Phần hệ thống nơi người dùng thực hiện công việc chính; nhận biết thuê bao. | AWS-f; Azure gọi là data plane |
| **Mặt phẳng điều khiển** (control plane) | Phần hệ thống quản lý thuê bao ở cấp toàn hệ thống: đăng ký, cấp phát, cấu hình, vòng đời, đo lường. Dùng chung toàn hệ thống và không nhận biết thuê bao. | AWS-f; Azure *Control planes* |
| **Vị trí dữ liệu** (placement) | Cách một thuê bao được gán vào tầng dữ liệu: lược đồ dùng chung, lược đồ riêng, hoặc CSDL riêng. | Thuật ngữ của đề tài |
| **Tùy biến** (customization) | Khả năng mỗi thuê bao có cấu hình riêng trên cùng một thể hiện ứng dụng, thực hiện bằng dữ liệu cấu hình chứ không bằng mã riêng cho từng thuê bao. | K14 (variability); NIST SaaS ("limited user-specific application configuration settings"); Azure |
| **Hàng xóm ồn ào** (noisy neighbor) | Hiện tượng hiệu năng của một thuê bao suy giảm do hoạt động của thuê bao khác. | Azure *Noisy Neighbor antipattern* |
| **Bán kính ảnh hưởng** (blast radius) | Phạm vi các thuê bao bị ảnh hưởng khi một sự cố xảy ra. | Cách dùng của Azure *Deployment Stamps* |

## 3. Chia sẻ và dùng riêng

### 3.1 Phát biểu và phép thử

- **Chia sẻ**: một thể hiện của thành phần phục vụ đồng thời từ hai thuê bao trở lên.
- **Dùng riêng**: một thể hiện của thành phần chỉ phục vụ đúng một thuê bao.

Phép thử một câu, ai cũng dùng được: *"Khi thêm một thuê bao mới, có phải chạy thêm một thể hiện của thành phần này không?"* Có: dùng riêng. Không: chia sẻ.

Chia sẻ hay dùng riêng được xác định **theo từng thành phần**, không theo cả hệ thống. Các nhãn trọn gói như "pool" hay "silo" chỉ là cách gọi tắt cho một tổ hợp các quyết định đó (xem tài liệu 03 và 04).

Ví dụ với ba thuê bao A, B, C:

| Thành phần | Thể hiện chạy | Kết luận |
|---|---|---|
| Một tiến trình API phục vụ cả A, B, C | 1 | chia sẻ |
| Mỗi thuê bao một container API | 3 | dùng riêng |
| Một máy chủ CSDL, ba CSDL (mỗi thuê bao một) | máy chủ: 1; CSDL: 3 | máy chủ chia sẻ, CSDL dùng riêng |
| Một CSDL, một lược đồ, bảng có cột `tenant_id` | 1 | chia sẻ |

### 3.2 Vì sao đổi tên "chia được / không chia được"

1. **Tiêu chí T5.** "Không chia được" là phát biểu phủ định. "Dùng riêng" nói điều nó *là*.
2. **Nhầm khả năng với quyết định.** Về kỹ thuật, tầng nào cũng chia sẻ được nếu chấp nhận rủi ro và chi phí kiểm soát. Điều phân biệt các kiến trúc là *quyết định* chia sẻ hay dùng riêng, chứ không phải tầng đó "có chia được" hay không. Vì vậy cặp từ phải mô tả quyết định.
3. **Định nghĩa cũ vi phạm T2 và T4.** Bản trong ghi chú của nhóm định nghĩa "chia được" bằng *multiplexing*, *software-enforced isolation*, *Tenant-scoped JWT*, *ThreadLocal TenantContext*. Ba khái niệm đầu là khái niệm mới nằm bên trong định nghĩa; hai khái niệm cuối gắn với một cách cài đặt cụ thể. Đúng lỗi thầy chỉ ra.

### 3.3 Tách riêng cơ chế cô lập khỏi định nghĩa

Chia sẻ tạo ra **nhu cầu** cô lập; cô lập là một vấn đề riêng, có hai cách thực hiện:

- **Cô lập theo cấu trúc**: dữ liệu hoặc tính toán của hai thuê bao nằm ở hai thể hiện khác nhau nên không thể chạm nhau nếu không có đường kết nối (ví dụ CSDL riêng).
- **Cô lập do thực thi**: hai thuê bao dùng chung một thể hiện nên phần mềm và chính sách phải ngăn (ví dụ điều kiện `tenant_id`, chính sách mức dòng, đặc quyền trên lược đồ, hạn mức tốc độ).

Việc tách này giữ nguyên ý của ghi chú cũ ("software-enforced isolation") nhưng đưa nó ra khỏi định nghĩa của "chia sẻ". Ba chiều cô lập, trùng với ba bài toán thầy nêu:

| Chiều cô lập | Bảo đảm | Bài toán của thầy |
|---|---|---|
| Dữ liệu | Không đọc, ghi chéo | An toàn dữ liệu |
| Hiệu năng | Hoạt động của thuê bao này không làm chậm thuê bao khác | Hiệu năng (noisy neighbor) |
| Sự cố và vòng đời | Sự cố, sao lưu, khôi phục, nâng cấp của thuê bao này không kéo theo thuê bao khác | Vận hành |

Điều quan trọng: **dùng riêng ở một tầng không bảo đảm cô lập ở tầng khác.** CSDL riêng không cô lập API, hàng đợi hay mặt phẳng điều khiển đang dùng chung; có thể chọn mức cô lập khác nhau cho từng tầng (Azure *Tenancy models*; AWS: "a mix of the silo and pool models"). Và cô lập dữ liệu khác cô lập hiệu năng: các CSDL trong cùng một cluster PostgreSQL vẫn chia sẻ WAL, bộ nhớ, CPU và I/O (PostgreSQL, *Managing Databases*).

## 4. Những cặp khái niệm hay nhầm

| Cặp | Phân biệt | Căn cứ |
|---|---|---|
| Khách hàng, thuê bao, người dùng | Một tổ chức khách hàng có thể có nhiều thuê bao; mỗi thuê bao có nhiều người dùng; một người dùng có thể thuộc nhiều thuê bao với vai trò độc lập | ISO mục 6; Azure |
| Thuê bao và bản triển khai | Thuê bao là khái niệm nghiệp vụ (logic); bản triển khai là tập thể hiện (vật lý). Quan hệ thuê bao–bản triển khai có thể 1–nhiều hoặc 1–1. Khác nhau ở *cách cô lập được thực thi*: trong một bản triển khai chung thì dựa vào mã ứng dụng và định danh thuê bao; bản triển khai riêng thì cô lập bằng hạ tầng | Azure *Tenancy models*: "A key difference between tenants and deployments is how isolation is enforced" |
| Thể hiện và bản triển khai | Thể hiện là một bản đang chạy của *một* thành phần; bản triển khai là *tập* các thể hiện vận hành cùng nhau | Nhóm |
| Đa thuê bao, đa người dùng, đa thể hiện | Xem Bảng 2.5 của K14 trích ở dưới và hình `fig-mu-mi-mt` | K14 tr. 43 |
| Silo, pool, bridge (AWS) và Pool, Schema-per-tenant, Silo (ứng dụng) | AWS: *bridge* là mô hình **lai** giữa silo và pool. Vì vậy schema-per-tenant không phải "Bridge"; "Bridge" trong Phụ lục A là mô hình lai ba placement, đúng nghĩa AWS | AWS-i |
| Cô lập dữ liệu và cô lập hiệu năng | Hai chiều khác nhau, cần hai nhóm biện pháp khác nhau | mục 3.3 |

Bảng 2.5 của K14 (tr. 43): đa thuê bao: chia sẻ tài nguyên *có*, cấu hình lúc chạy *đầy đủ*; đa người dùng: *có*, *một phần*; đa thể hiện: *có thể*, *có thể*. Kabbedijk còn đặt điều kiện "một cách trong suốt" (*transparently*) để loại những ứng dụng web mở cho nhiều người như Google hay Facebook khỏi định nghĩa đa thuê bao.

## 5. Quy tắc dùng trong báo cáo

1. Không viết "instance" hay "thể hiện" đứng một mình; luôn kèm tầng.
2. Dùng "thuê bao" cho tenant, "không gian làm việc" (workspace) chỉ khi nói về cách ứng dụng này hiện thực hóa thuê bao.
3. Dùng "chia sẻ" và "dùng riêng"; bỏ "chia được" và "không chia được".
4. "Bridge" chỉ dùng cho mô hình lai. Đừng dùng cho schema-per-tenant.
5. Nhãn trọn gói (pool, silo, shared schema…) luôn kèm bộ ký hiệu ⟨A,D⟩ của K14 ở lần đầu.
6. Mọi con số từ K14 phải ghi "đánh giá chuyên gia, n = 16" khi nhắc.

## 6. Tự kiểm bằng năm tiêu chí

| Khái niệm | T1 | T2 | T3 | T4 | T5 | Ghi chú |
|---|---|---|---|---|---|---|
| Thuê bao | đạt | đạt | đạt | đạt | đạt | Đồng nghĩa với ISO, thêm ví dụ tổ chức |
| Thể hiện | đạt | đạt | đạt | đạt | đạt | Không có chuẩn, nên chỉ nêu cách dùng |
| Bản triển khai | đạt | đạt | đạt | đạt | đạt | Dùng "thể hiện" đã định nghĩa trước |
| Chia sẻ | đạt | đạt | đạt | đạt | đạt | Chỉ dùng "thể hiện" và "thuê bao" |
| Dùng riêng | đạt | đạt | đạt | đạt | đạt | Phát biểu khẳng định ("đúng một") |
| Cô lập | đạt | đạt | đạt | đạt | đạt | Lấy nguyên ý ISO |

Thứ tự định nghĩa tránh vòng tròn: dịch vụ, khách hàng, người dùng → thuê bao → thể hiện → bản triển khai → chia sẻ, dùng riêng → cô lập, đa thuê bao.

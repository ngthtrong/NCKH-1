**CHƯƠNG 1. CƠ SỞ LÝ THUYẾT VÀ MÔ HÌNH HÓA KIẾN TRÚC ĐA THUÊ BAO (MULTI-TENANCY)**

1.1. Tổng quan về SaaS và chi phí sở hữu (TCO)
1.1.1. Khái niệm SaaS và tiến trình tiến hóa của các mô hình chia sẻ tài nguyên
1.1.2. Động lực kinh tế – kỹ thuật và phân tích Chi phí sở hữu (TCO) từ góc nhìn nhà cung cấp dịch vụ

1.2. Các khái niệm và thuật ngữ nền tảng trong kiến trúc Multi-Tenancy
1.2.1. Khách hàng, Thuê bao, Người dùng và Thành viên (Customer, Tenant, User & Membership)
1.2.2. Dịch vụ, Ứng dụng, Instance và Tài nguyên hệ thống (Service, Application, Instance & System Resources)
1.2.3. Định danh thuê bao, Siêu dữ liệu và định nghĩa tổng hợp Multi-Tenancy (Tenant ID, Metadata & Multi-Tenancy Definition)

1.3. Phân biệt và mô hình hóa các cách tổ chức hệ thống (ST, MI, MU, MT)
1.3.1. Mô hình Đơn thuê bao (Single-Tenant – ST)
1.3.2. Mô hình Đa instance (Multi-Instance – MI)
1.3.3. Mô hình Đa người dùng (Multi-User – MU)
1.3.4. Mô hình Đa thuê bao (Multi-Tenant – MT)
1.3.5. Đối chiếu tổng quát và mô hình hóa trực quan ST, MI, MU và MT

1.4. Bốn cấp độ trưởng thành kiến trúc SaaS theo mô hình Chong & Carraro
1.4.1. Cấp độ 1 – Ad Hoc / Custom
1.4.2. Cấp độ 2 – Configurable
1.4.3. Cấp độ 3 – Configurable, Multi-Tenant-Efficient
1.4.4. Cấp độ 4 – Scalable, Configurable, Multi-Tenant-Efficient
1.4.5. Tổng hợp so sánh bốn cấp độ và định vị kiến trúc mục tiêu Cấp độ 3 của đề tài

1.5. Mô hình kiến trúc ba tầng, ngăn xếp chín tầng và các đặc trưng cốt lõi
1.5.1. Mô hình kiến trúc ba tầng của ứng dụng đa thuê bao
1.5.2. Mô hình tích hợp kiểm soát xuyên tầng và ánh xạ vào kiến trúc mục tiêu Cấp độ 3
1.5.3. Ngăn xếp chín tầng nguyên bản và bản cập nhật cho kiến trúc Cloud-Native
1.5.4. Năm đặc trưng kiến trúc cốt lõi và liên hệ với tiêu chí kiểm chứng Cấp độ 3

1.6. Tổng kết chương

**CHƯƠNG 2. KIẾN TRÚC ĐA THUÊ BAO — CƠ CHẾ CHIA SẺ, CÔ LẬP VÀ CÁC ĐÁNH ĐỔI**

2.1. Nguyên lý chia sẻ, cô lập và các mô hình triển khai kiến trúc đa thuê bao
2.1.1. Nguyên lý chia sẻ – tách biệt tài nguyên, ranh giới thuê bao và quan hệ với mô hình trưởng thành SaaS
2.1.2. Mô hình Silo và Mô hình Pool
2.1.3. Mô hình Bridge, Mô hình Hybrid và so sánh điều kiện áp dụng

2.2. Các cơ chế kỹ thuật chia sẻ, cô lập và đánh đổi kiến trúc
2.2.1. Tổ chức, cô lập dữ liệu và quản lý ngữ cảnh thuê bao (Tenant ID, TenantContext & RLS)
2.2.2. Tùy biến giao diện, nghiệp vụ lúc chạy qua metadata và kiểm soát tài nguyên dùng chung
2.2.3. Đánh đổi về chi phí sở hữu (TCO), khả năng tùy biến và độ phức tạp vận hành

2.3. Kịch bản áp dụng và định vị kiến trúc mục tiêu Cấp độ 3 cho đề tài
2.3.1. Phân tích các kịch bản kiến trúc điển hình và căn cứ lựa chọn
2.3.2. Cấu hình kiến trúc Cấp độ 3 (Configurable, Multi-Tenant-Efficient) được lựa chọn cho đề tài

2.4. Tiêu chí kiểm chứng Cấp độ 3 và định hướng phát triển lên Cấp độ 4
2.4.1. Bộ ba tiêu chí chứng minh Cấp độ 3 và giới hạn của phương án dùng chung
2.4.2. Định hướng mở rộng lên Cấp độ 4 (Cân bằng tải, mở rộng ngang với container/pods và phân bố dữ liệu)

2.5. Tổng kết chương

**CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ ỨNG DỤNG QUẢN LÝ CÔNG VIỆC ĐA THUÊ BAO ĐẠT CHUẨN CẤP ĐỘ 3**

3.1. Phân tích bài toán và yêu cầu hệ thống
3.1.1. Bối cảnh sử dụng, tác nhân và phạm vi ứng dụng Demo Cấp độ 3
3.1.2. Yêu cầu chức năng, sơ đồ ca sử dụng và yêu cầu phi chức năng

3.2. Thiết kế kiến trúc tổng thể và cơ sở dữ liệu dùng chung
3.2.1. Kiến trúc thành phần trên một instance dùng chung và luồng xử lý yêu cầu theo ngữ cảnh tenant
3.2.2. Lược đồ cơ sở dữ liệu dùng chung, phân vùng logic bằng Tenant ID và lưu trữ metadata

3.3. Thiết kế các cơ chế đa thuê bao chứng minh Cấp độ 3
3.3.1. Khởi tạo thuê bao, xác lập ngữ cảnh (TenantContext) và cô lập truy cập giữa các thuê bao
3.3.2. Cơ chế tùy biến giao diện và quy tắc nghiệp vụ lúc chạy (runtime) qua metadata

3.4. Thiết kế chức năng nghiệp vụ Kanban và giao diện theo workspace
3.4.1. Quản lý không gian làm việc, thành viên và điều phối bảng công việc Kanban
3.4.2. Quản lý tài nguyên đính kèm, thông báo và thiết kế giao diện tùy biến theo tenant

3.5. Thiết kế triển khai thử nghiệm và kịch bản kiểm chứng tiêu chí Cấp độ 3
3.5.1. Mô hình triển khai Web Server, Application Server và Database Server dùng chung
3.5.2. Ma trận đối chiếu và kịch bản thực nghiệm chứng minh ba tiêu chí Cấp độ 3

3.6. Tổng kết chương

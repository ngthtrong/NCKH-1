# Định nghĩa các thuật ngữ hệ thống

Các định nghĩa làm việc dưới đây được tổng hợp từ hai báo cáo trong thư mục và đối chiếu nguồn [1]–[4], không phải trích nguyên văn. Phạm vi mặc định là tầng ứng dụng hoặc dịch vụ; khi xét cơ sở dữ liệu hay hạ tầng, cần ghi rõ.

**Quy ước:** *Tenant* là một cá nhân, nhóm hoặc tổ chức được quản lý như một đơn vị khách hàng có phạm vi dữ liệu, quyền truy cập và cấu hình riêng. *Instance* là một bản thực thi cụ thể của ứng dụng hoặc dịch vụ, có định danh và vòng đời riêng.

## 1. Multi-user — Đa người dùng

**Multi-user là khả năng của hệ thống cho phép nhiều người dùng truy cập và sử dụng các chức năng, với danh tính, phiên làm việc và quyền truy cập được quản lý theo từng người dùng.** Thuật ngữ này mô tả người dùng, không quyết định số tenant hay số instance. [1][2]

*Ví dụ:* Nhiều giáo viên cùng sử dụng hệ thống quản lý điểm của một trường.

## 2. Multi-tenant — Đa thuê bao

**Multi-tenant là đặc tính của hệ thống phục vụ nhiều tenant bằng cách chia sẻ tài nguyên tại một hoặc nhiều tầng xác định, đồng thời có cơ chế phân tách dữ liệu, quyền truy cập và quản lý cấu hình theo tenant.** Hệ thống có thể sử dụng một hoặc nhiều instance; chia sẻ tài nguyên không đồng nghĩa với cho phép truy cập dữ liệu của tenant khác. [1][2]

*Ví dụ:* Hai trường dùng chung tập instance quản lý điểm, nhưng dữ liệu, quyền truy cập và cấu hình được quản lý riêng theo trường.

## 3. Multi-instance — Đa thể hiện triển khai

**Multi-instance là cấu hình triển khai có từ hai instance trở lên của cùng một ứng dụng hoặc dịch vụ trong phạm vi đang xét.** Các instance có thể dùng để phân phối tải hoặc được cấp riêng cho từng tenant; thuật ngữ này không mặc định mỗi tenant có một instance. [2][3]

*Ví dụ:* Dịch vụ quản lý điểm chạy ba instance sau bộ cân bằng tải.

## 4. Single-instance — Đơn thể hiện triển khai

**Single-instance là cấu hình triển khai chỉ có một instance của ứng dụng hoặc dịch vụ trong phạm vi đang xét.** Instance đó có thể phục vụ nhiều người dùng và một hoặc nhiều tenant. Đây là quy ước về số lượng instance, tương ứng với cách dùng ở mục 3.

*Ví dụ:* Một instance quản lý điểm phục vụ cả hai trường, có phân tách dữ liệu và quyền truy cập theo trường.

## 5. Noisy neighbor — Hiện tượng ảnh hưởng hiệu năng do dùng chung tài nguyên

**Noisy neighbor là hiện tượng hoạt động của một hoặc nhiều tenant hay khối lượng công việc gây tranh chấp tài nguyên dùng chung, làm suy giảm hiệu năng của tenant hoặc khối lượng công việc khác.** Tài nguyên bị tranh chấp có thể là CPU, bộ nhớ, băng thông, I/O hoặc vùng kết nối cơ sở dữ liệu. [4]

*Ví dụ:* Trường A chạy báo cáo nặng chiếm nhiều kết nối cơ sở dữ liệu dùng chung, khiến yêu cầu của Trường B phải chờ lâu.

**Lưu ý phân biệt:** Multi-user, multi-tenant và multi-instance có thể đồng thời tồn tại. Single-instance không đồng nghĩa với single-tenant (môi trường dành riêng cho một tenant). Các instance riêng vẫn có thể chịu noisy neighbor nếu chia sẻ tài nguyên ở tầng bên dưới.

## Nguồn đối chiếu

[1] Kabbedijk và cộng sự (2015). *Defining multi-tenancy: A systematic mapping study on the academic and the industrial perspective*, mục 5. [Toàn văn](https://azaidman.github.io/publications/kabbedijkJSS.pdf).

[2] Bezemer & Zaidman (2010). *Multi-Tenant SaaS Applications: Maintenance Dream or Nightmare?*, mục 2. [Toàn văn](https://azaidman.github.io/publications/bezemerIWPSE2010.pdf). Bài dùng “multi-instance” theo nghĩa cấp instance riêng cho từng tenant; mục 3 ở đây dùng nghĩa triển khai rộng hơn.

[3] Dragoni và cộng sự (2017). *Microservices: How To Make Your Application Scale*, phần “Scalability”. [Toàn văn](https://arxiv.org/pdf/1702.07149).

[4] Microsoft Azure Architecture Center. *Noisy Neighbor antipattern*. [Tài liệu](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/noisy-neighbor/noisy-neighbor).

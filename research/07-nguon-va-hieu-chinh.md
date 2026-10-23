# 07. Sổ nguồn đã kiểm chứng và các hiệu chỉnh so với ghi chú trước

Ngày kiểm chứng: 2026-10-23. Mọi trích dẫn nguyên văn bên dưới được lấy trực tiếp từ văn bản nguồn trong phiên làm việc này (không trích lại từ ghi chú của nhóm hay bản tóm tắt).

Ký hiệu trạng thái: **Đ** = đã đọc toàn văn phần liên quan; **T** = chỉ xác nhận được sự tồn tại/tóm tắt, chưa đọc nội dung; **C** = chưa kiểm chứng được.

## 1. Sổ nguồn

| Mã | Nguồn | Dùng cho | TT |
|---|---|---|---|
| K14 | J. Kabbedijk, *Variability in Multi-Tenant Enterprise Software*, luận án tiến sĩ, Utrecht University, 12/2014 (SIKS 2014-29), 275 tr. Chương 6 viết cùng Pors, Jansen, Brinkkemper (ECSA 2014, "Multi-tenant Architecture Comparison"). https://research-portal.uu.nl/ws/files/6122833/Kabbedijk.pdf | Định nghĩa MT/MU/MI; 12 kiến trúc ⟨A,D⟩; Bảng 6.3; Datasource Router, Custom Property Object | Đ (Chương 2, 6, 7) |
| ISO | ISO/IEC 17788:2014 = ITU-T Y.3500 (08/2014), *Cloud computing – Overview and vocabulary*. Bản ITU-T miễn phí: https://www.itu.int/rec/T-REC-Y.3500 | Định nghĩa dịch vụ, khách hàng, người dùng, thuê bao, đa thuê bao, reversibility | Đ (mục 3, 6) |
| NIST | NIST SP 800-145 (2011). https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-145.pdf | Resource pooling "multi-tenant model"; định nghĩa SaaS và giới hạn cấu hình | Đ |
| AZ-ov | Azure Architecture Center, *Architect multitenant solutions on Azure* (cập nhật 2025-10-30) | Tenant khác user | Đ |
| AZ-ten | *Tenancy models for a multitenant solution* (cập nhật 2026-10-11) | Tenant khác deployment; phổ cô lập; mô hình phân vùng dọc/ngang | Đ |
| AZ-data | *Architectural approaches for storage and data* (cập nhật 2026-10-20) | Khôi phục theo thuê bao, antipattern, RLS, tùy biến lược đồ | Đ |
| AZ-map | *Map requests to tenants* | Cách nhận diện thuê bao, kiểm tra yêu cầu | Đ |
| AZ-ctl | *Considerations for multitenant control planes* | Trách nhiệm control plane; <10 thuê bao; cô lập control plane | Đ |
| AZ-upd | *Considerations for updating a multitenant solution* | Stamps, feature flags, rings, API versions | Đ |
| AZ-stamp | *Deployment Stamps pattern* | Stamp, tối thiểu 2 stamp, chi phí | Đ |
| AZ-nn | *Noisy Neighbor antipattern* | Phát hiện và giảm thiểu | Đ |
| AZ-pg | *Guidance for Azure Database for PostgreSQL in multitenant solution* | RLS, schema-based sharding 1–10.000 thuê bao, pooling | Đ |
| AWS-f | AWS, *SaaS Architecture Fundamentals* (2022-08-03; trang ghi "historical reference only") | Control plane/application plane | Đ (mục control vs application plane) |
| AWS-i | AWS, *SaaS Tenant Isolation Strategies* (cũng "historical reference only") | Silo, pool, bridge | Đ (mục bridge); T (silo, pool: qua kết quả tìm kiếm) |
| PG | PostgreSQL 18 docs: *Row Security Policies* (ddl-rowsecurity), *Schemas* (ddl-schemas), *Managing Databases* (manage-ag-overview), *Continuous Archiving and PITR* | Cơ chế cô lập, giới hạn sao lưu | Đ |
| WB09 | C. Weissman, S. Bobrowski, *The design of the force.com multitenant internet application development platform*, SIGMOD 2009 | Kiến trúc dựa trên siêu dữ liệu (Salesforce) | T (xác nhận tồn tại và tóm tắt; chưa đọc toàn văn) |
| NC22 | V. Narasayya, S. Chaudhuri, *Multi-Tenant Cloud Data Services…*, SIGMOD 2022 (tutorial) | Tổng quan học thuật | T (số trang "1-26" trong thuyết minh chưa xác minh) |
| CC06 | Chong, Carraro, *Architecture Strategies for Catching the Long Tail* (MSDN 2006) | Mô hình trưởng thành SaaS, ba kiểu dữ liệu | **C** (trang gốc 404, kho lưu trữ bị chặn). K14 tr. 95 xác nhận Chong, Carraro, Wolter (2006) là nguồn đầu tiên mô tả hai mức database và schema. |
| KU | R. Kumar, *Multi-Tenant SaaS Architectures: Design Principles and Security Considerations* — bản PDF trong repo (`related/`) ghi Quest Journals, *Journal of Architecture and Civil Engineering* 5(2), 11/2020, tr. 49–62 | Tài liệu tham khảo [7] của thuyết minh | Đ (đọc đầu bài). Xem hiệu chỉnh C8 |

## 2. Trích dẫn nguyên văn dùng làm nền cho báo cáo

**ISO/IEC 17788:2014 (= ITU-T Y.3500)**
- 3.2.8 *cloud service*: "One or more capabilities offered via cloud computing invoked using a defined interface."
- 3.2.11 *cloud service customer*: "Party which is in a business relationship for the purpose of using cloud services."
- 3.2.17 *cloud service user*: "Natural person, or entity acting on their behalf, associated with a cloud service customer that uses cloud services."
- 3.2.37 *tenant*: "One or more cloud service users sharing access to a set of physical and virtual resources."
- 3.2.27 *multi-tenancy*: "Allocation of physical or virtual resources such that multiple tenants and their computations and data are isolated from and inaccessible to one another."
- Mục 6 (đặc tính đa thuê bao): "…the group of cloud service users that form a tenant will all belong to the same cloud service customer organization… a given cloud service customer organization might have many different tenancies with a single cloud service provider representing different groups within the organization."
- 3.2.35 *reversibility*: "Process for cloud service customers to retrieve their cloud service customer data and application artefacts and for the cloud service provider to delete all cloud service customer data as well as contractually specified cloud service derived data after an agreed period."

**NIST SP 800-145**
- Resource pooling: "The provider's computing resources are pooled to serve multiple consumers using a multi-tenant model, with different physical and virtual resources dynamically assigned and reassigned according to consumer demand."
- SaaS: "…The consumer does not manage or control the underlying cloud infrastructure including network, servers, operating systems, storage, or even individual application capabilities, with the possible exception of limited user-specific application configuration settings."

**K14 (Kabbedijk 2014)**
- Tr. 42, định nghĩa: "Multi-tenancy is a property of a system where multiple customers, so-called tenants, transparently share the system's resources, such as services, applications, databases, or hardware, with the aim of lowering costs, while still being able to exclusively configure the system to the needs of the tenant."
- Tr. 43, về từ "instance": "The words 'single' and 'instance' have been deliberately avoided, such that a qualifier can be used to determine whether we are speaking of single-instance or multiple-instance."
- Tr. 43, về MT/MU/MI: "multi-instance systems do not necessarily need shared resources… Multi-tenant and multi-user systems, however, always share resources on one or more levels of the software stack. Multi-tenant systems share resources and allow only for mass-customization by using variability. Multi-user systems are only partly multi-tenant and offer the same invariable functionality to all customers." Bảng 2.5: đa thuê bao — chia sẻ tài nguyên *Yes*, cấu hình lúc chạy *Fully*; đa người dùng — *Yes*, *Partly*; đa thể hiện — *Possibly*, *Possibly*.
- Tr. 41–42, tiêu chí định nghĩa tốt (theo Copi và Miller 1972): nêu thuộc tính thiết yếu; tránh vòng tròn; không quá rộng/hẹp; không tối nghĩa; "should not be negative where it can be positive".
- Tr. 94, quy luật xếp chồng: "When multi-tenancy is applied at a specific level, the levels below that level are shared among tenants as well, but isolation occurs at the levels above, i.e. for each tenant a dedicated instance is running. This applies to the application and data layer independently."
- Tr. 95–96: A ∈ {AD, AS, AI}, D ∈ {DD, DS, DB, DC}; "the number of possible architectures is twelve"; MTA = ⟨{AD, AS, AI}, {DD, DS, DB, DC}⟩ (công thức 6.1).
- Tr. 90–92 và 102: 10 kiến trúc sư thẩm định danh sách MTA và tiêu chí (thang Likert 7 mức, ngưỡng trung vị ≥ 3); **16** kiến trúc sư từ ba công ty đánh giá Bảng 6.3 ("the average rating of the 16 experts", thang 1 = bất lợi, 5 = tích cực; chú thích bảng "n = 16").
- Tr. 102–104, các quy tắc RT1–RT5 (tr. 102–103) và mối đe dọa tính hợp lệ (tr. 104): "The set of twelve multi-tenant architecture patterns does not take into account possible hybrid patterns in which different solutions are used per sub-system."
- Tr. 124–131, *Datasource Router Pattern*: "…the application uses a different database instance (or schema) for each tenant. Custom properties are then added to the database as normal fields." Về an toàn: "Failing to select a datasource would simply crash the application instead of mixing data from other tenants." Về bảo trì: "Large number of possible database schemas must be tested". So sánh: *Custom Property Object Pattern* (một lược đồ cố định, thuộc tính tùy biến là đối tượng định kiểu): "Single static database schema", nhưng "Risk of losing data separation with programming errors".

**Azure Architecture Center**
- AZ-ov: "Tenants are distinct from users. Multiple users from a single organization, company, or group form a single tenant."
- AZ-ten: "A key difference between tenants and deployments is how isolation is enforced." — "Deployments are sometimes referred to as supertenants or stamps." — "Instead of viewing isolation as a discrete property, consider it a spectrum." — "Your solution architecture can influence your available options for isolation… You can use different levels of isolation for each tier."
- AZ-data: "In a shared database, restoring a single tenant might require you to restore the database to a separate resource and selectively recover that tenant's data." — Antipattern *Table-based isolation*: "When you work within a single database, avoid creating individual tables for each tenant." — Antipattern *Column-level tenant customization*; "Avoid forking or providing customized infrastructure for individual tenants… consider using feature flags and other forms of tenant configuration." — RLS: "This approach can be complex to design, implement, test, and maintain. Many multitenant solutions don't use row-level security because of those complexities."
- AZ-pg: "Schema-based sharding… is well-suited for workloads that have between 1 and 10,000 tenants." — "Postgres uses a process-based model for connections. This model makes it inefficient to maintain large numbers of idle connections."
- AZ-map: "Tenant mapping is a separate activity [from user permissions]." — "Even though the request includes a domain name or other tenant identifier, it doesn't mean you should automatically grant access."
- AZ-ctl: "In certain situations, you might not need a full control plane. This approach might work if your system has fewer than 10 tenants." — "If you provide self-service tenant management, you need a control plane early in your journey." — "You should separate your control plane's resources from resources that serve your tenants' data planes."
- AZ-stamp: "When you use the Deployment Stamps pattern, deploy at least two stamps of your solution." — "…substantially increases the cost of operating your solution."
- AZ-nn: "Sharing a single resource inherently carries the risk of noisy neighbor problems that you can't completely avoid." — giải pháp phía nhà cung cấp: giám sát theo thuê bao, resource governance (throttling/rate limiting), hạn chế thao tác tốn tài nguyên, QoS.

**AWS**
- AWS-i, bridge: "…you will often discover that your solution will require a mix of the silo and pool models. This mixed model is what we would refer to as a bridge model of isolation."
- AWS-f: "An important caveat is that the control plane and its services are not actually multi-tenant… These services are global to all tenants."

**PostgreSQL 18**
- Managing databases: "It is not possible to access more than one database per connection." — "While individual databases in the cluster are isolated when considered from the user's perspective, they are closely bound from the database administrator's point-of-view" (chia sẻ WAL; ảnh hưởng sao lưu và khôi phục).
- Schemas: "Unlike databases, schemas are not rigidly separated: a user can access objects in any of the schemas in the database they are connected to, if they have privileges to do so."
- RLS: "Superusers and roles with the BYPASSRLS attribute always bypass the row security system… Table owners normally bypass row security as well, though a table owner can choose to be subject to row security with ALTER TABLE ... FORCE ROW LEVEL SECURITY." — "If no policy exists for the table, a default-deny policy is used." — "Referential integrity checks… always bypass row security… Care must be taken… to avoid 'covert channel' leaks."
- Continuous archiving: "this method can only support restoration of an entire database cluster, not a subset."

## 3. Hiệu chỉnh so với ghi chú trước của nhóm

| Mã | Ghi chú trước | Điều kiểm chứng được | Ảnh hưởng |
|---|---|---|---|
| C1 | Bảng 6.3 do "10 chuyên gia" đánh giá (phần tuyên bố định hướng); ở chỗ khác ghi n = 16 | K14: **16** chuyên gia đánh giá Bảng 6.3; **10** chuyên gia chỉ thẩm định danh sách kiến trúc và tiêu chí. Hai con số không mâu thuẫn nhưng không được nhầm | Sửa mọi chỗ ghi 10 |
| C2 | "Throughput: K2 3,5 so với K1 3,0" và "Number of End-Users: K2 4,0 so với K1 3,0" | Throughput: K1 = K2 = K3 = **3,0**. End-Users: K1 **3,5**, K2 4,0, K3 4,5. Hai lập luận ủng hộ K2 hơn K1 này sai. Các số khác (Resource Utilization, Maintainability, Monitoring, Recoverability, Confidentiality, Portability, Integrity, Variability, Software Complexity, Diverse SLA…) khớp | Lập luận chọn K2 phải dựa vào phân tích trọng số (tài liệu 05) chứ không dựa vào hai số đó |
| C3 | Ghi chú: "Chương 6, tr. 93–94" cho quy luật bất biến | Đúng là tr. 94. Số năm là **2014** (không phải 2015); luận án đệ trình 12/2014 | Sửa trích dẫn |
| C4 | "Schema riêng biệt (Bridge)" (biên bản họp, đề cương Chương 2) | AWS định nghĩa *bridge* là mô hình **lai** giữa silo và pool. Phụ lục A của thuyết minh dùng Bridge đúng nghĩa AWS (hệ thống kết hợp ba placement) | Gọi schema riêng là *schema-per-tenant*; dành "Bridge" cho mô hình lai |
| C5 | Ghi chú AI: Silo DB cho phép "phục hồi về một thời điểm của một khách hàng cụ thể… không ảnh hưởng ai" | PostgreSQL: PITR chỉ khôi phục **cả cluster**, không khôi phục tập con. Trên cùng một máy chủ PostgreSQL, database riêng *không* cho PITR theo thuê bao. Chỉ khi mỗi thuê bao có cluster/máy chủ riêng (⟨AI,DD⟩) hoặc dịch vụ CSDL quản lý riêng mới có | Không tuyên bố PITR theo thuê bao cho S2 |
| C6 | Silo DB tách biệt hiệu năng ("không sợ ảnh hưởng hiệu năng từ các tenant khác") | Các database trong cùng cluster chia sẻ WAL, bộ nhớ, CPU, I/O (PostgreSQL docs). Cô lập *dữ liệu* khác cô lập *hiệu năng* | Giả thuyết H2 của bản thiết kế thực nghiệm (tài liệu 06) |
| C7 | "Pooled + Deployment Stamps là kiến trúc tối ưu duy nhất" | Stamp là một trục khác với vị trí dữ liệu; Azure yêu cầu tối thiểu hai stamp khi áp dụng và nêu rõ chi phí tăng đáng kể; dự án chỉ có 3–5 thuê bao. Bản đánh giá nội bộ trong PDF đã nêu đúng điểm này | Stamp chỉ là hướng mở rộng |
| C8 | Thuyết minh [7]: Kumar, "overview paper, 2025" | File trong `related/` ghi Quest Journals, tập 5, số 2, **tháng 11/2020**; tạp chí về kiến trúc và xây dựng dân dụng, không phải CNTT | Kiểm tra lại thông tin trích dẫn; dùng như nguồn thứ cấp, không làm bằng chứng chính |
| C9 | "Silo DB có thể nằm cùng hoặc khác máy chủ" (Phụ lục A.1) | Cùng máy chủ = ⟨AI,DS⟩ (K1); khác máy chủ riêng cho từng thuê bao = ⟨AI,DD⟩, một kiến trúc khác trong K14 | Phải nói rõ Silo đang là DS hay DD khi mô tả thực nghiệm |
| C10 | Azure có hướng dẫn thống nhất về schema-per-tenant | Azure *không* liệt kê schema-per-tenant trong các mẫu khuyến nghị; còn đặt "table-based isolation" (bảng riêng cho mỗi thuê bao trong một database) vào antipattern. Ở trang PostgreSQL, Azure lại coi schema-based sharding "phù hợp 1–10.000 thuê bao" (trên cụm elastic phân tán) | Trần quy mô của S3 là câu hỏi có điều kiện, cần đo (tài liệu 06, MB-scale) |

## 4. Điều chưa kiểm chứng được (không được viết như sự thật trong báo cáo)

1. Nguyên văn Chong và Carraro (2006) — chỉ dựa vào K14 tr. 95 để nói về nguồn gốc của hai mức database và schema.
2. Nội dung Weissman và Bobrowski (2009), Narasayya và Chaudhuri (2022): mới xác nhận tồn tại.
3. Cách ứng dụng thực tế đã cài đặt: repo này chỉ chứa tài liệu; mô tả về Bridge, RLS, provisioner lấy từ PDF của nhóm.
4. Hành vi của PostgreSQL khi biến phiên chưa đặt (`current_setting(..., true)` trả NULL nên chính sách RLS từ chối mọi dòng): là kiến thức chuẩn của PostgreSQL nhưng chưa được kiểm trong tài liệu này; thực nghiệm H1 sẽ kiểm bằng test.

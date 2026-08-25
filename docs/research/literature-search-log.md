# Nhật ký tìm kiếm và sàng lọc tài liệu

**Trạng thái:** pilot discovery đã thực hiện; lượt tìm kiếm có hệ thống trên từng CSDL chưa được chạy. Vì vậy chưa có số bản ghi PRISMA và chưa được mô tả bộ nguồn hiện tại là đầy đủ.

## 1. Chuỗi tìm kiếm chuẩn

### Nhóm A — kiến trúc và cô lập

```text
("multi-tenant" OR multitenancy OR "multi tenancy")
AND (SaaS OR "software as a service")
AND (architecture OR isolation OR partitioning OR "data isolation")
```

### Nhóm B — placement dữ liệu

```text
("multi-tenant" OR multitenancy)
AND (database OR PostgreSQL OR persistence)
AND (pool OR pooled OR silo OR bridge OR "database per tenant"
     OR "shared schema" OR "row level security")
```

### Nhóm C — danh tính, provisioning và vận hành

```text
("multi-tenant" OR multitenancy)
AND (identity OR authorization OR provisioning OR onboarding
     OR observability OR "noisy neighbor" OR "resource isolation")
AND (SaaS OR cloud)
```

### Tiếng Việt bổ trợ

```text
("đa thuê bao" OR "đa người thuê")
AND (SaaS OR "phần mềm dưới dạng dịch vụ")
AND (kiến trúc OR "cô lập dữ liệu" OR phân quyền OR cấp phát)
```

Khi chuyển sang cú pháp của từng CSDL, lưu nguyên chuỗi cuối cùng, filter, số trang kết quả và tệp export. Không tự suy số kết quả từ giao diện bị giới hạn.

## 2. Nhật ký đã chạy

| Run | Ngày UTC | Nguồn/cách truy cập | Truy vấn hoặc định danh | Kết quả có thể kiểm toán | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| PILOT-01 | 2026-08-25 | Web discovery, giới hạn domain ACM/IEEE/Springer/DOI | `multi-tenant SaaS architecture systematic mapping 2015 2022`; `tenant isolation database DOI` | Xác minh Olabanji et al. DOI `10.37394/23205.2023.22.4`; Narasayya & Chaudhuri DOI `10.1145/3514221.3522566`; Petersen et al. DOI `10.1016/j.infsof.2015.03.007` | Pilot, không dùng để tính flow |
| PILOT-02 | 2026-08-25 | DOI resolver/publisher | Ba DOI trong thuyết minh: Olabanji, Narasayya, Pushpan | Metadata ghi trong `source-register.md`; phát hiện trang của Pushpan là 1117–1126, không phải 860–867 | Cần sửa thuyết minh ở thay đổi riêng |
| PILOT-03 | 2026-08-25 | Tài liệu chính thức | AWS SaaS Lens, PostgreSQL RLS, Salesforce architecture, VNPay Sandbox | Các URL và bằng chứng được ghi trong register | Luồng bằng chứng công nghiệp |
| PILOT-04 | 2026-08-25 | Tài liệu sản phẩm chính thức | MISA, Base, KiotViet, Jira | Ma trận sản phẩm và yêu cầu truy nguồn | Không suy đoán kiến trúc nội bộ |

## 3. Lượt tìm kiếm chính cần thực hiện

| Run dự kiến | CSDL | Filter | Người chạy 1/2 | Export | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| MAIN-ACM | ACM Digital Library | 2015–ngày khóa; journal/conference | Chưa phân công | `PENDING_DATA` | Chưa chạy |
| MAIN-IEEE | IEEE Xplore | 2015–ngày khóa; journals/conferences | Chưa phân công | `PENDING_DATA` | Chưa chạy |
| MAIN-SPRINGER | SpringerLink | 2015–ngày khóa; Computer Science | Chưa phân công | `PENDING_DATA` | Chưa chạy |
| MAIN-SD | ScienceDirect | 2015–ngày khóa; research/review | Chưa phân công | `PENDING_DATA` | Chưa chạy |
| MAIN-GS | Google Scholar | 2015–ngày khóa; ghi giới hạn số trang | Chưa phân công | `PENDING_DATA` | Chưa chạy |
| SNOWBALL | Backward/forward từ nguồn đã chọn | Cho tới ngày khóa | Chưa phân công | `PENDING_DATA` | Chưa chạy |

## 4. Biểu mẫu bản ghi sàng lọc

```text
record_id,source_run,title,authors,year,venue,doi,url,
dedup_status,title_abstract_decision,full_text_decision,exclusion_code,
reviewer_1,reviewer_2,resolution,quality_score,rq_tags,evidence_note
```

Quy tắc: bản ghi bị loại toàn văn phải có đúng một `exclusion_code`; mọi bất đồng và cách giải quyết được giữ lại. Số lượng sơ đồ flow được tính từ export và register, không nhập tay từ trí nhớ.

## 5. Kiểm tra trước khi khóa

- [ ] Nhóm xác nhận ngày/giờ khóa và phạm vi năm.
- [ ] Mỗi CSDL có chuỗi cuối cùng và ảnh/chứng từ filter nếu cần.
- [ ] Export gốc được giữ nguyên, có checksum.
- [ ] Khử trùng theo DOI rồi tiêu đề+năm.
- [ ] Hai người hoàn tất title/abstract và full-text screening.
- [ ] DOI, trang, tác giả, năm và venue của nguồn được chọn đã xác minh.
- [ ] Số liệu flow được sinh từ register.
- [ ] Mọi thay đổi giao thức sau khi bắt đầu được ghi trong `research-log.md`.


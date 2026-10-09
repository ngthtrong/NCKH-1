
Đề tài hiện tại là **xây dựng và đánh giá khung kiến trúc SaaS đa thuê bao Bridge cho ứng dụng quản lý công việc Kanban trong môi trường đại học, trên hạ tầng tài nguyên giới hạn**.

Sau khi rà soát [trạng thái dự án](/home/ngthtrong/NCKH-1/docs/PROJECT_STATUS.md), [protocol](/home/ngthtrong/NCKH-1/docs/research/protocol.md), [ma trận truy vết](/home/ngthtrong/NCKH-1/docs/research/traceability-matrix.md) và nguồn báo cáo trong `report/`, kế hoạch cần bắt đầu từ **chuẩn hóa thiết kế nghiên cứu và kiểm toán bằng chứng hiện có**, rồi mới bổ sung hiện thực và tổ chức thực nghiệm.

**Đã có:** nguyên mẫu Bridge ba placement, nghiệp vụ Kanban, các cơ chế bảo vệ và bộ công cụ kiểm thử/thực nghiệm.
**Chưa đủ:** tổng quan được khóa, protocol so sánh ba placement, số đo chính thức, hồ sơ lựa chọn công nghệ hoàn chỉnh và dữ liệu người dùng.

Dưới đây là kế hoạch đề xuất; tôi chưa sửa tài liệu, mã nguồn hoặc chạy thí nghiệm.

### 1. Khóa bài toán, phạm vi và câu hỏi nghiên cứu

Giữ bốn RQ hiện có làm nền:

| RQ  | Câu hỏi cần trả lời                                                                                      | Sản phẩm nghiên cứu cần có                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| RQ1 | Nhóm đại học cần những yêu cầu nghiệp vụ và đa thuê bao nào?                                    | Yêu cầu có nguồn, use case, ma trận quyền; dữ liệu người dùng nếu thực hiện khảo sát |
| RQ2 | Làm thế nào xây dựng Bridge dùng chung danh tính, cấp phát và mã nghiệp vụ?                      | Kiến trúc, bất biến, hiện thực và kiểm chứng theo placement                                 |
| RQ3 | Hệ thống đáp ứng đến mức nào về cô lập, phân quyền, cấp phát, hiệu năng và noisy neighbor? | Kết quả kiểm chứng kỹ thuật và thực nghiệm có thể tái lập                               |
| RQ4 | Cơ chế và công nghệ nào phù hợp với VPS tài nguyên giới hạn?                                     | So sánh phương án, bảng điểm có bằng chứng và ADR                                         |

**Quyết định cần chốt đầu tiên:** protocol gốc và RQ2 hiện nói Pool/Silo, nhưng nguyên mẫu đã hỗ trợ Schema-per-tenant. Đề xuất đưa **ba placement vào phạm vi đánh giá chính**, bằng phụ lục protocol và điều chỉnh RQ2 được ghi nhận trước khi thu dữ liệu.

Phạm vi nên chia thành:

- **Cốt lõi:** tenant context, bố trí/cô lập dữ liệu, phân quyền, nhất quán cập nhật, provisioning, tài nguyên và noisy neighbor.
- **Mở rộng riêng:** branding, custom data, approval và automation. Chi phí các module này được đo riêng để tránh làm sai so sánh placement.
- **Ngoài phạm vi:** Kubernetes, autoscaling, full-stack silo, di chuyển tenant sau onboarding và cộng tác thời gian thực, trừ khi nhóm sửa phạm vi trước nghiên cứu.

Các giả thuyết dưới đây là **đề xuất để đăng ký**, chưa phải kết luận:

| Mã | Giả thuyết/mệnh đề kiểm chứng                                                                                                | Điều kiện bác bỏ hoặc giới hạn                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| H1  | Tenant context được ràng buộc bằng host, token và membership ngăn xử lý sai tenant trên các đường đã định nghĩa | Có request/job chạy với tenant sai hoặc context tồn dư                                   |
| H2  | RLS kết hợp application guard giữ được cô lập Pool khi bỏ sót guard ở các đường SQL đã đăng ký                  | Có đọc/ghi/xóa chéo thành công bằng runtime role                                       |
| H3  | Membership phía server và cơ chế thu hồi phiên thực thi đúng quyền hiện hành                                            | Token cũ tiếp tục mutation sau thu hồi hoặc thao tác bị từ chối vẫn gây side effect |
| H4  | Optimistic version và outbox ngăn mất cập nhật, xử lý lặp và side effect stale theo contract                               | Ghi đè im lặng, side effect trùng hoặc sự kiện cũ tác động sai                      |
| H5  | Provisioning có lease/retry phục hồi đúng sau các lỗi đã định nghĩa                                                     | Tài nguyên trùng, dọn nhầm tenant hoặc báo`ACTIVE` khi chưa hoàn tất               |
| H6  | Rate limit làm giảm suy giảm hiệu năng của tenant nạn nhân dưới workload noisy-neighbor                                   | Mức cải thiện không đạt tiêu chí khóa sau pilot, hoặc lỗi của nạn nhân tăng     |

Với ba placement, nên đặt câu hỏi **“đánh đổi như thế nào?”**, chưa giả định placement nào nhanh nhất hoặc tối ưu nhất.

### 2. Bảng truy vết sáu bước

N1–N5 bám theo khung đang có trong báo cáo. U1 bổ sung nhánh yêu cầu/người dùng để trả lời RQ1.

| Bài toán                                                     | Phương án và đối chứng                                                                                                        | Tiêu chí khóa trước                                                                                             | Hiện thực cần kiểm tra/bổ sung                                                         | Bằng chứng phải thu                                                          | Mục báo cáo                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **U1 — Nhu cầu Kanban đại học**; RQ1                | Phân tích thuyết minh, tài liệu sản phẩm và tác vụ người dùng; đối chiếu tính năng có/không có nguồn yêu cầu | Mỗi yêu cầu có nguồn và tác vụ; tỷ lệ hoàn tất, thời gian, lỗi và SUS nếu nghiên cứu người dùng | Bộ tác vụ chuẩn, biểu mẫu đồng thuận, schema dữ liệu ẩn danh                    | Search/extraction log, ma trận yêu cầu, dữ liệu tác vụ và SUS           | Chương 1: yêu cầu; Chương 2: phương pháp; Chương 4: đánh giá người dùng |
| **N1 — Định danh và truyền tenant context**; RQ2/3  | Host, path/header, token; lựa chọn hiện tại: host–token–membership đối chiếu phía server                                   | Mismatch bị chặn trước SQL nghiệp vụ; không tồn dư context sau commit, rollback hoặc lỗi                  | Rà filter, context holder,`TenantJdbcExecutor`, connection reuse và background job      | Case report, trạng thái DB trước/sau, trace đã loại secret               | Chương 3: N1; Chương 4: cô lập ngữ cảnh                                          |
| **N2a — Bố trí dữ liệu**; RQ2/3/4                   | Pool, Schema-per-tenant, Silo; cùng nghiệp vụ, seed và tải                                                                      | Contract tương đương; không truy cập chéo trong ma trận; p95, throughput, lỗi, CPU/RAM/connections         | Bổ sung coverage ba placement cho workload, manifest, metric và analyzer nếu còn thiếu | Raw k6, metric tài nguyên, catalog quyền, manifest, QA                       | Chương 3: N2; Chương 4: so sánh placement                                           |
| **N2b — Enforcement trong Pool**; RQ3/4                 | Predicate tường minh, Hibernate tenant mechanism, RLS + guard                                                                      | Loại ứng viên có leak theo protocol; chỉ chấm hiệu năng ứng viên đủ điều kiện                         | Tái sử dụng harness Project CRUD; hoàn thiện hồ sơ loại và đường đo            | Security report, elimination artifact, checksum, số đo ứng viên hợp lệ    | Chương 3: cơ chế cô lập; Chương 4: spike; ADR 0003                               |
| **N3 — Phân quyền tenant/project**; RQ1/2/3           | Role trong token, membership server, policy theo thuộc tính; so sánh định tính và kiểm chứng phương án hiện tại        | Toàn bộ ô nhạy cảm có allow/deny; revoke đúng; thao tác bị từ chối không đổi dữ liệu                | Đối chiếu permission matrix với endpoint, service và test; bổ sung ô thiếu          | Coverage matrix, test report, trạng thái trước/sau                          | Chương 3: N3; Chương 4: quyền; phụ lục ma trận                                   |
| **N4 — Cập nhật đồng thời và side effect**; RQ2/3 | LWW/version/locking; gửi trực tiếp/outbox/broker                                                                                  | Conflict không ghi đè im lặng; batch theo contract; retry không trùng; stale event bị loại                   | Kiểm tra version, transaction, outbox, deadline reminder và retry email                   | Concurrent execution trace, số event/job, fault report                         | Chương 3: nhất quán và workflow; Chương 4: concurrency/phục hồi                 |
| **N5a — Cấp phát và phục hồi**; RQ2/3              | Thủ công, synchronous request, worker có lease/retry                                                                              | Không tài nguyên trùng; rollback đúng chủ sở hữu; chỉ`ACTIVE` khi đủ bước                            | Rà fault point và coverage ba placement; đo phục hồi nếu thuộc phạm vi              | Timeline lỗi/retry, audit, catalog DB/schema/role trước/sau                  | Chương 3: provisioning; Chương 4: phục hồi                                         |
| **N5b — Chia sẻ tài nguyên/noisy neighbor**; RQ3/4   | Limiter tắt/bật; workload thường/tenant gây tải                                                                                | p95/error của nạn nhân; 429 tách riêng; ngưỡng cải thiện khóa sau pilot                                    | Workload theo tenant, nhãn metric, cấu hình limiter và connection pool                  | Paired runs, metric từng tenant, bảng chênh lệch                            | Chương 4: noisy neighbor và giới hạn VPS                                            |
| **Lựa chọn storage/payment**; RQ4                      | Filesystem/MinIO; VNPay sandbox/Stripe test mode                                                                                     | Storage: namespace, quota, URL hết hạn, restore; payment: signature, replay, amount, idempotency                   | Adapter/spike còn thiếu; sandbox phụ thuộc credential và HTTPS                         | Contract report, backup/restore report, log provider đã làm sạch, scorecard | Chương 3: quyết định công nghệ; Chương 4: spike; ADR 0004–0005                 |
| **Tùy biến hữu hạn**; phạm vi mở rộng             | Cấu hình module tắt/bật trong cùng placement được hỗ trợ                                                                   | Quyền/capability đúng; job idempotent; overhead đo riêng                                                        | Protocol module, workload tương ứng, metric job                                          | Contract/fault report và run module riêng                                     | Chương 3: mở rộng; Chương 4 hoặc phụ lục                                        |

**Quy tắc lựa chọn:** bảo mật là điều kiện loại, không được bù bằng điểm hiệu năng. Phương án chỉ phân tích định tính không được trình bày như đã so sánh thực nghiệm.

### 3. Các giai đoạn thực hiện

Thời lượng dưới đây là **ước lượng lập kế hoạch**, tính từ khi nhóm mở lại nghiên cứu; phụ thuộc nhân lực, VPS và quyền truy cập sandbox.

| Giai đoạn                                                  | Đầu việc cụ thể                                                                                                        | Phụ thuộc             | Sản phẩm đầu ra                                                             | Điều kiện hoàn thành                                                             |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **G0 — Chốt thiết kế, 2–3 ngày**                 | Chốt RQ, ba placement, module mở rộng, môi trường, vai trò người thực hiện/QA và nghiên cứu người dùng     | Quyết định nhóm     | Decision log, danh sách phạm vi, protocol amendment dự thảo                 | Không còn quyết định phạm vi chính chưa xác định                           |
| **G1 — Tổng quan và yêu cầu, 1–2 tuần**         | Khóa ngày tìm kiếm; xác minh metadata/DOI; khử trùng; sàng lọc; extraction; truy nguồn yêu cầu                  | G0                      | Search log, source register, extraction, SRS/traceability cập nhật            | Mọi yêu cầu và luận cứ quan trọng có nguồn hoặc ghi rõ còn thiếu         |
| **G2 — Kiểm toán bằng chứng, 3–5 ngày**         | Đối chiếu N1–N5 với source/test/biên bản; phân loại coverage, skip, phiên bản và giới hạn                     | G0; tận dụng G1       | Evidence register, coverage matrix, backlog khoảng trống                      | Mỗi tiêu chí có cách kiểm chứng; không dùng số test tổng thay coverage     |
| **G3 — Hoàn thiện công cụ và spike, 1–2 tuần** | Bổ sung khoảng trống cần thiết; hoàn thiện hồ sơ loại isolation, storage spike và payment nếu đủ điều kiện | G2; sandbox cho payment | Harness/workload hoàn chỉnh, artifact hợp lệ, scorecard, ADR được review | Cổng B có đủ bằng chứng trong phạm vi được chốt                            |
| **G4 — Pilot và khóa protocol, 3–5 ngày**         | Pilot môi trường mục tiêu; kiểm tra dữ liệu, độ biến thiên, warm-up, saturation; khóa SLO và số lần lặp    | G3; VPS sẵn sàng      | Pilot report, protocol cuối, cấu hình/version freeze                         | Metric thu được; tiêu chí/run exclusion và SLO được chốt trước experiment |
| **G5 — Thu dữ liệu chính thức, khoảng 1 tuần**  | Chạy placement, noisy-neighbor và fault scenario; nghiên cứu người dùng chạy nhánh riêng nếu được duyệt      | G4                      | Raw artifact bất biến, manifest/checksum, dữ liệu ẩn danh                  | Đủ run hợp lệ theo protocol; không thay logic giữa các run                     |
| **G6 — QA, phân tích và báo cáo, 1–2 tuần**    | QA độc lập; tái tạo bảng/biểu đồ; trả lời từng RQ; rà kết luận và giới hạn                                | G5                      | QA report, analysis output, báo cáo và phụ lục tái lập                   | Mọi kết luận truy được về bằng chứng; phần thiếu giữ`PENDING_DATA`      |

Chuỗi phụ thuộc chính: **G0 → G2 → G3 → G4 → G5 → G6**. G1 có thể thực hiện song song với G2, nhưng phải hoàn thành các luận cứ cần thiết trước khi khóa lựa chọn và viết kết luận.

### 4. Thiết kế thực nghiệm và tiêu chí chấp nhận

**So sánh placement**

- Dùng cùng commit, image, nghiệp vụ, dữ liệu tương đương và ngân sách CPU/RAM.
- Dùng Pool làm cấu hình tham chiếu; so sánh Schema/Silo và báo cáo các đánh đổi.
- Tắt các module tùy biến trong workload lõi.
- Khung khởi đầu đã có: 3–5 tenant, 10–20 VU/tenant, ít nhất ba lần lặp. Pilot phải xác nhận hoặc điều chỉnh trước khi đo chính thức.
- Khóa thời lượng, warm-up, workload mix, tốc độ tải, reset dữ liệu và thứ tự chạy xen kẽ/ngẫu nhiên.
- Nếu giữ RQ4 về VPS, phép đo chính phải thực hiện trên VPS mục tiêu.

**Chỉ số**

| Nhóm          | Chỉ số/cách quan sát                                                  | Tiêu chí                                                        |
| -------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Cô lập       | Đọc/ghi/xóa/tải/gửi chéo; trạng thái dữ liệu trước/sau        | 0 truy cập chéo thành công trong ma trận đã khóa          |
| Quyền         | Allow/deny theo role–action–resource; side effect                       | Mọi ô nhạy cảm có bằng chứng; deny không mutation         |
| Hiệu năng    | p50/p95 theo endpoint/tenant, throughput, lỗi nghiệp vụ, 429           | SLO`PENDING_DATA` đến khi pilot được duyệt                |
| Tài nguyên   | CPU, RSS/RAM, connections, dung lượng                                   | So sánh trên cùng ngân sách; ghi rõ cách tổng hợp        |
| Phục hồi     | Thời gian phục hồi, số tài nguyên/job/event, trạng thái cuối     | Đúng bất biến; mục tiêu thời gian khóa trước experiment |
| Noisy neighbor | Chênh p95/error của nạn nhân so với baseline và trước/sau limiter | Ngưỡng cải thiện khóa sau pilot; báo cáo cả chi phí 429  |
| Người dùng  | Hoàn tất tác vụ, thời gian, lỗi, SUS và góp ý                    | Báo cáo mô tả; không dùng SUS để chứng minh cô lập     |

Mỗi **run độc lập** là đơn vị lặp. Không coi hàng nghìn request trong một run là hàng nghìn mẫu độc lập. Với số run ít, ưu tiên kết quả từng run, mức biến thiên và chênh lệch quan sát; giới hạn kết luận thống kê.

### 5. Thu thập và kiểm soát bằng chứng

Mỗi bộ bằng chứng cần có: mã tiêu chí/RQ, protocol ID, commit/image, cấu hình máy, workload/seed, thời điểm, kết quả, raw artifact, checksum, QA và giới hạn.

Phân biệt rõ:

| Loại bằng chứng                  | Kết luận được hỗ trợ                                          |
| ----------------------------------- | -------------------------------------------------------------------- |
| Source/migration                    | Cơ chế đã được hiện thực                                    |
| Unit/integration/E2E/fault test     | Hành vi đúng trong case và môi trường đã chạy              |
| Experiment theo protocol đã khóa | Hiệu năng và đánh đổi trong cấu hình/tải đã nghiên cứu |
| Dữ liệu người dùng             | Khả năng sử dụng và nhu cầu trong mẫu đã tuyển             |

Các kiểm thử local hiện có vẫn hữu ích cho lập luận correctness, nhưng phải gắn phiên bản và phạm vi; chúng không thay số đo VPS hoặc chứng minh “tối ưu”.

QA cần kiểm tra thiếu metric, request bị bỏ, sai seed/version, dữ liệu chưa reset, thiếu replicate và lý do loại run. Giữ cả run bị loại cùng lý do; không loại vì kết quả bất lợi. Các lượt `development`, `pilot`, `experiment` phải giữ nguyên phân loại.

### 6. Hoàn thiện báo cáo theo bằng chứng

- **Chương 1:** bài toán, nguồn yêu cầu, khoảng trống và phạm vi.
- **Chương 2:** RQ/giả thuyết, biến độc lập/kiểm soát, đối chứng, metric, protocol và QA.
- **Chương 3:** mỗi N1–N5 viết theo bài toán → phương án → tiêu chí lựa chọn → hiện thực; nêu trạng thái ADR.
- **Chương 4:** thiết lập thực tế, kết quả từng phép đo, trả lời RQ và bàn luận đánh đổi. Thay các mục đánh giá còn chung hoặc trống bằng tên phép đánh giá cụ thể.
- **Kết luận:** chỉ chốt điều đã được hỗ trợ, kèm phạm vi áp dụng.
- **Phụ lục:** coverage quyền/security, evidence register, manifest, run ID, cách tái tạo và giới hạn mở rộng.

Mỗi kết luận được gắn `MEASURED`, `INFERRED`, `LIMITATION` hoặc `PENDING_DATA`. Mỗi bảng/biểu đồ thực nghiệm phải dẫn được tới dữ liệu và lệnh tái tạo.

### 7. Những điểm còn phải chốt

1. Phê duyệt sửa phạm vi từ hai sang ba placement.
2. Cấu hình VPS, ngân sách và người phụ trách môi trường.
3. Workload, dữ liệu, thời lượng, warm-up và số lần lặp cuối.
4. SLO và mức cải thiện noisy-neighbor sau pilot.
5. Giữ hay điều chỉnh phạm vi so sánh storage/payment; trọng số payment hiện chưa khóa.
6. Credential sandbox và endpoint HTTPS nếu nghiên cứu provider thật.
7. Có thực hiện nghiên cứu người dùng hay không; protocol hiện dự kiến 30–60 người thuộc 3–5 nhóm, chưa phải mẫu đã tuyển.
8. Người review protocol, QA và quyết định chấp nhận bằng chứng.
9. Phiên bản nghiên cứu được freeze. Working tree hiện có nhiều thay đổi báo cáo, nên cần chốt bản cụ thể trước thu dữ liệu.

**Đầu việc ưu tiên đầu tiên là G0 và G2:** khóa phạm vi/RQ, lập bảng tiêu chí–case–bằng chứng và xác định chính xác khoảng trống. Kết quả của hai bước này sẽ quyết định phần hiện thực nào thực sự cần bổ sung, tránh làm lại chức năng đã có hoặc viết kết luận trước khi đo.

# Đối chiếu bộ diagram Chương 2 với báo cáo

> **Đã xử lý bộ diagram ngày 06/11/2026.** Bộ mới gồm 14 hình chính đúng số báo cáo và 4 hình bổ sung, mỗi hình có Draw.io + PNG + SVG. [Xem toàn bộ ảnh](xem-tat-ca.html) · [Danh mục mới và câu cần đồng bộ trong báo cáo](danh-muc-hinh.md). Nội dung dưới đây lưu kết quả kiểm tra **bản cũ**; file gốc nằm trong `_archive/2026-11-06-ban-cu/`.

Ngày kiểm tra: 06/11/2026.

Tài liệu đối chiếu: bản “BÁO CÁO NGHIÊN CỨU KHOA HỌC: BỘ DÀN Ý CHÍNH THỨC VÀ CẨM NANG TRIỂN KHAI TOÀN DIỆN” người dùng đính kèm, đặc biệt PHẦN 3 với các chỉ định chèn Hình 2.1–2.14.

Phạm vi: đọc nội dung và cạnh nối của 16 file `.drawio`, xem trực tiếp 16 ảnh `.drawio.png`, kiểm tra 16 SVG đọc được bằng XML parser. Không kiểm thử hệ thống chạy thật, không khẳng định các bản xuất đồng nhất từng byte hay đã kiểm tra hiển thị SVG trên mọi phần mềm. Chưa sửa diagram.

**Kết luận: chưa đủ chuẩn để chèn nguyên bộ vào báo cáo.** Các mô hình cơ bản có thể giữ làm nền, nhưng có lỗi luồng, thiếu hai hình bắt buộc, lệch số hình và thiếu nhất quán về ranh giới.

## 1. Các vấn đề cần sửa trước

### A. Thiếu hình và lệch danh mục

Báo cáo yêu cầu Hình 2.6 là Compute-Isolated / Shared-Data. File hiện tại `hinh_2_6_data_isolation` vẽ **Shared App → hai PostgreSQL instance riêng**, gần như đảo ngược yêu cầu **Pod riêng → PostgreSQL dùng chung + RLS**. Bộ hiện tại chưa có hình thay thế đúng yêu cầu này.

Báo cáo yêu cầu Hình 2.10 là Tiered Platform: **Dynamic Gateway → Shared Pool Cell cho Free/Standard và Dedicated Silo Cell cho VIP/Enterprise**. Hình 2.12 hiện tại chỉ có ba cell cùng dạng App Cluster + Database Cluster. Hình 2.5 có Hybrid nhưng không có Cell; ghép hai ý này trong văn bản chưa thay thế được sơ đồ tích hợp mà báo cáo yêu cầu.

Các số 2.6–2.16 trong thư mục không khớp chuỗi 2.6–2.14 trong báo cáo. Không thể chỉ trừ đồng loạt một hằng số vì thứ tự nội dung cũng khác.

### B. Hình 2.15: luồng đọc cache bị đứt

- `L1 Miss → tần suất thấp → Bỏ qua` kết thúc, thiếu đọc dữ liệu từ Redis/DB và trả kết quả cho client. Từ chối cache không được đồng nghĩa từ chối phục vụ truy vấn.
- Redis chỉ có nhánh Miss, thiếu nhánh Hit và trả kết quả.
- Sau đọc DB chỉ có “Nạp vào L1”, thiếu trả kết quả và mô tả chính sách ghi L2.
- L1 miss không đồng nghĩa truy vấn quét/cold data.
- W-TinyLFU trong Caffeine quyết định admission/eviction của cache nội bộ. Nó không tự động làm cổng lọc ghi Redis L2. Nếu thiết kế thêm bộ admission cho L2 thì phải vẽ và ghi rõ đó là cơ chế bổ sung của ứng dụng.

Luồng đề xuất: `L1 lookup → hit: trả kết quả; miss: L2 lookup → hit: cân nhắc nạp L1 và trả kết quả; miss: đọc DB → trả kết quả + cập nhật cache theo chính sách`. Nhánh không nhận vào cache vẫn phải trả dữ liệu đã đọc. Bổ sung khóa chứa tenant cho cả L1 và L2; nếu tuyên bố bảo vệ hạn ngạch mỗi tenant thì cần cơ chế quota/partition riêng.

Nguồn: [Caffeine Design](https://github.com/ben-manes/caffeine/wiki/Design), [Caffeine Efficiency](https://github.com/ben-manes/caffeine/wiki/Efficiency).

### C. Hình 2.12: định tuyến Cell mâu thuẫn với dải tenant

Cell 01 ghi tenant 1–1.000 nhưng mũi tên ghi `Tenant ID % 3 == 1`; tenant 4.000 cũng thỏa điều kiện đó, còn tenant 2 không vào Cell 01 dù nằm trong dải 1–1.000. Tương tự cho hai cell còn lại.

Chọn một cách nhất quán: định tuyến theo dải đúng như nhãn, hoặc bỏ nhãn dải và mô tả nhóm được gán bằng hash. Để mở rộng số cell mà không đổi hàng loạt vị trí dữ liệu, nên minh họa bảng ánh xạ tenant→cell có quản lý; thêm cell không tự động cho phép tính lại modulo trên dữ liệu đang tồn tại.

Bổ sung nhãn Shared Tables/RLS Level 5 trong mỗi cell và ranh giới VM/Container Level 2/3 bên ngoài nếu tiếp tục dùng đúng hệ quy chiếu của báo cáo. Router/control plane chung cần được ghi là phụ thuộc chung; không suy ra mọi sự cố đều chỉ ảnh hưởng một cell.

### D. Hình 2.16: cây quyết định thay đổi nội dung báo cáo

Báo cáo 2.6.2 có câu hỏi thứ hai: **tenant cần chạy script/plugin độc lập? → Compute-Isolated / Shared-Data (Compute Level 3 + Data Level 5)**.

Hình hiện tại thay bằng **tùy biến cấu trúc bảng? → Schema-per-Tenant**. Đây là thay đổi tiêu chí và phương án, không phải diễn đạt tương đương. Cần khôi phục nhánh chạy mã tùy biến; Schema-per-Tenant có thể là nhánh bổ sung nếu sửa đồng bộ báo cáo.

Nhánh Hybrid chưa chỉ rõ kết hợp Cell-Based. Ngưỡng “whale >70% tải” và mặc định “không ưu tiên TCO → Cell-Based” do hình thêm vào, không có luận chứng trong bản đính kèm. Không nên giữ như quy tắc phổ quát. Chọn Cell cần tiêu chí về quy mô, vùng triển khai hoặc mục tiêu giới hạn phạm vi sự cố.

### E. Quy ước nét liền/nét đứt không nhất quán

Báo cáo 2.1.4 quy định **nét liền = shared; nét đứt = dedicated**.

- Hình 2.2 và 2.4 áp dụng đúng ở vùng tenant/schema riêng.
- Hình 2.5 bị đảo: Pool nét đứt, Silo nét liền.
- Hình 2.8 có hai schema riêng nhưng alpha nét đứt, beta nét liền; màu có thể biểu diễn tùy biến, kiểu nét cần cùng nghĩa dedicated.
- Hình 2.12 các cell độc lập đều nét liền.
- Hình 2.1 dùng nét đứt cho toàn bộ hạ tầng mà chưa gắn với lựa chọn tenant nào, làm lẫn loại tầng với trạng thái chia sẻ.

Thêm legend thống nhất; phân biệt khung nhóm chức năng với ranh giới thuê bao. Không dùng kiểu mũi tên request/response làm cùng một legend với kiểu khung shared/dedicated.

### F. Hình 2.14: SET LOCAL đúng hướng, chú thích reset sai

Chuỗi `BEGIN → SET LOCAL → SELECT → COMMIT → trả connection → tenant khác mượn lại` đúng ý báo cáo.

Nhưng `current_setting('app.current_tenant_id') = NULL` và “connection hoàn toàn sạch sẽ” là khẳng định quá mức. `SET LOCAL` hết hiệu lực khi COMMIT hoặc ROLLBACK và khôi phục giá trị session trước đó; không bảo đảm giá trị đó là NULL, cũng không reset toàn bộ trạng thái connection. Bản một tham số của `current_setting` có thể báo lỗi nếu setting chưa tồn tại.

Đổi chú thích thành: **“Giá trị đặt bằng SET LOCAL hết hiệu lực ở cuối transaction; session không được mang tenant context tồn dư.”** Chính sách RLS xử lý thiếu/rỗng bằng `NULLIF(current_setting('app.current_tenant_id', true), '')::uuid` như báo cáo. Giá trị `Tenant_A`, `Tenant_B` trong hình không hợp lệ với ép kiểu UUID; dùng UUID hợp lệ hoặc ghi rõ đây là ký hiệu minh họa. Thêm nhánh lỗi ROLLBACK và hoàn trả connection trong finally; kết thúc request B cũng trả connection.

Nguồn: [PostgreSQL SET](https://www.postgresql.org/docs/current/sql-set.html), [current_setting](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET).

## 2. Đối chiếu từng hình

| File hiện tại (bỏ phần mở rộng) | Đánh giá | Việc cần làm / vị trí phù hợp |
|---|---|---|
| `hinh_2_1_master_blueprint` | Đủ tên 9 tầng; thiếu legend, cách gộp VM/Container dễ gây hiểu lầm | Giữ Hình 2.1. Tách chú thích đường VM và đường container: container chia sẻ host kernel; không mô tả container như hypervisor có guest OS riêng. Ghi đường nối là hệ quy chiếu khái niệm, tránh hiểu Gateway/Cache/DB là một chuỗi triển khai bắt buộc. |
| `hinh_2_2_silo_model` | Đúng topology app/middleware/DB riêng | Giữ Hình 2.2, nhưng mới hiện tầng 4–9. Bổ sung tầng 1–3 hoặc chỉ rõ hạ tầng lược bỏ và lựa chọn Silo vật lý Level 1 hay Silo VM Level 2. Hai loại không có cùng mức chia sẻ hardware. |
| `hinh_2_3_pool_model` | Đúng topology cơ bản | Giữ Hình 2.3; ghi ranh giới logic Level 5, thêm RLS vào bảng chung; bổ sung/ghi chú hạ tầng 1–3 dùng chung. |
| `hinh_2_4_bridge_model` | Đúng biến thể schema-per-tenant | Giữ Hình 2.4, ghi rõ Level 4. `SET search_path` phải có quản lý vòng đời connection; ưu tiên SET LOCAL trong transaction. search_path chọn tên đối tượng, cần quyền truy cập để thực thi cô lập. |
| `hinh_2_5_hybrid_model` | Đúng phối hợp Pool/Silo; sai kiểu nét | Giữ Hình 2.5, đảo lại kiểu khung và ghi Level 5 / Level 2–3. |
| `hinh_2_6_data_isolation` | Phù hợp minh họa tách DB tại 2.3.3; không phải Compute-Isolated/Shared-Data | Chuyển sang hình bổ sung 2.3.3. Hai process, port và thư mục riêng chỉ thể hiện process/storage path riêng; chưa chứng minh VM/host/ổ vật lý riêng. Sửa nhãn “cô lập vật lý” hoặc vẽ tài nguyên thực sự dành riêng. |
| `hinh_2_7_tco_rls_engine` | Ý lọc tenant đúng; thiếu fail-closed và điều kiện áp dụng | Đặt ở 2.5.2 hoặc dùng bổ sung cho 2.3.3; đây không phải hình TCO. RLS thực thi trong PostgreSQL DBMS, tránh “kernel” gây hiểu là OS kernel. Theo blueprint, engine ở tầng 4, policy gắn bảng trong schema tầng 6; tách rõ điểm thực thi và đối tượng cấu hình. Thêm ENABLE/FORCE, USING/WITH CHECK, role không superuser/BYPASSRLS và nhánh thiếu tenant → không đọc được hàng. Sửa ký tự thừa `&[` / `&]`. |
| `hinh_2_8_schema_namespace` | Đúng khả năng schema khác nhau; sai nhất quán ranh giới | Dùng hình bổ sung cho 2.3.3/Bridge, không thay hình SMB 2.8. Dùng SET LOCAL + quyền schema; hai schema dedicated có cùng kiểu nét. Tùy biến cột không thay thế phân tích UI/UX ở 2.3.1. |
| `hinh_2_9_customer_segmentation` | Đúng ý định tuyến theo tier, nhưng chưa đủ Tiered Platform | Dùng hình bổ sung cho 2.4.3. Thêm xác thực JWT trước khi tin claim, xử lý PRO và tier không hợp lệ; thể hiện tenant→đích cụ thể thay vì chỉ tier→pool. Hình hiện có FREE/ENTERPRISE nên chưa bao phủ ba phân khúc báo cáo nêu. |
| `hinh_2_10_smb_profile` | Gần khớp nhất với kịch bản 2.4.1 | Nội dung phù hợp Hình 2.8 của báo cáo. Có Bucket4j, context, flags, RLS + SET LOCAL, Redis tenant key. Nhưng chưa là sơ đồ 9 tầng tích hợp; bổ sung nhãn tầng và Level 5. Node flag là hình thoi có câu hỏi nhưng chỉ có một lối ra: đổi thành bước đánh giá/cấu hình hoặc thêm nhánh True/False. |
| `hinh_2_11_enterprise_profile` | Khớp phần lớn 2.4.2 | Nội dung phù hợp Hình 2.9. Có Pod riêng, resource limits, sandbox, Redis riêng, DB BYOK; thiếu queue riêng và biểu diễn tầng 1–3/Level 2. Đừng đồng nhất Kubernetes namespace với Linux namespace/cgroups: namespace Kubernetes là phạm vi quản lý API; limits áp dụng cho container/Pod. Thêm NetworkPolicy/RBAC và node/VM boundary phù hợp mức cô lập tuyên bố. |
| `hinh_2_12_cell_based_profile` | Đúng ý nhiều cell độc lập, sai quy tắc ánh xạ | Sửa và chuyển thành Hình 2.7 (biến thể Cell-Based). Không dùng nó một mình làm Tiered Profile. Xem mục C. |
| `hinh_2_13_feature_flags_sequence` | Có lưu/clear context, đánh giá flag; thiếu phần lan truyền xuyên luồng | Nội dung gần Hình 2.11 nhưng cần thêm Backend Filter/Service, TaskDecorator/worker, immutable context và finally cleanup kể cả khi lỗi. Gateway riêng process không tự truyền ThreadLocal vào backend. Hiện Gateway gọi thẳng DB và thiếu backend nên trách nhiệm chưa rõ. Chú thích provider local là giả định; `<1ms` là mục tiêu/đo kiểm, không phải bảo đảm của chuẩn OpenFeature. |
| `hinh_2_14_set_local_sequence` | Đúng chuỗi chính, sai chú thích reset và kiểu ID | Sửa theo mục F rồi dùng làm Hình 2.12. |
| `hinh_2_15_two_tier_caching` | Chưa đạt do đứt luồng dữ liệu và lẫn admission L1/L2 | Sửa theo mục B rồi dùng làm Hình 2.13. |
| `hinh_2_16_decision_tree` | Không khớp bộ Decision Drivers 2.6.2 | Sửa theo mục D rồi dùng làm Hình 2.14. Cần rút gọn bố cục: ảnh hiện tại 3.584×5.848, khi ép vào một trang báo cáo chữ sẽ nhỏ. |

Nguồn bổ sung: [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [Schemas và search_path](https://www.postgresql.org/docs/current/ddl-schemas.html), [Kubernetes multi-tenancy](https://kubernetes.io/docs/concepts/security/multi-tenancy/), [OpenFeature providers](https://openfeature.dev/specification/sections/providers/).

## 3. Danh mục mục tiêu theo bản báo cáo đang đối chiếu

| Số trong báo cáo | Nội dung | Nguồn hiện có |
|---|---|---|
| 2.1 | Master Blueprint | Hiện 2.1, sửa legend/chú thích |
| 2.2 | Silo | Hiện 2.2, bổ sung phạm vi hạ tầng |
| 2.3 | Pool | Hiện 2.3, bổ sung ranh giới logic |
| 2.4 | Bridge | Hiện 2.4, sửa quản lý search_path |
| 2.5 | Hybrid | Hiện 2.5, sửa kiểu nét |
| 2.6 | Compute-Isolated / Shared-Data | **Thiếu, phải vẽ thêm** |
| 2.7 | Cell-Based / Deployment Stamps | Hiện 2.12, sửa ánh xạ và ranh giới |
| 2.8 | SMB / Startup Profile | Hiện 2.10, bổ sung hệ quy chiếu 9 tầng |
| 2.9 | Enterprise Profile | Hiện 2.11, bổ sung queue/hạ tầng |
| 2.10 | Tiered Platform: Hybrid + Cells | **Thiếu sơ đồ tích hợp, phải vẽ thêm** |
| 2.11 | Context propagation + In-memory flags | Hiện 2.13, bổ sung xuyên luồng/finally |
| 2.12 | SET LOCAL sequence | Hiện 2.14, sửa chú thích |
| 2.13 | Two-tier caching | Hiện 2.15, sửa luồng |
| 2.14 | Architecture decision tree | Hiện 2.16, khôi phục nhánh |

Hiện 2.6, 2.7, 2.8, 2.9 là bốn hình bổ sung, có thể giữ khi tác giả bổ sung chỉ định chèn vào báo cáo và đánh lại số toàn chương. Nếu giữ cả bốn và thêm hai hình thiếu, tổng sẽ là 18 hình; đây là phương án biên tập, không phải yêu cầu nguyên bản phải có 18 hình.

## 4. Những điểm trong chính báo cáo cần chốt trước khi sửa hình

1. **Số tầng của Bridge mâu thuẫn nội bộ.** Dàn ý ghi “Compute (1–5), CSDL/Schema (6–9)” nhưng blueprint ghi 1 Hardware, 2 VM/Container, 3 OS, 4 DB Server, 5 DB, 6 Schema, 7 Middleware, 8 App Server, 9 App Instance. Cần sửa câu mô tả Bridge theo số tầng đã chốt; hình Bridge hiện đúng ý chia sẻ app và tách schema hơn câu phân tầng đó.
2. **Quan hệ chi phí viết không thống nhất.** Có chỗ nói chi phí biên và độ dày “nghịch đảo”, nhưng phần giải thích nói dày hơn → chi phí tăng. Nên viết: “Mức cô lập tăng thường làm chi phí trên tenant tăng và mật độ giảm, phụ thuộc tải và triển khai”; không coi là định luật bất biến đã được định lượng.
3. **Mô tả cache trong báo cáo cũng cần sửa.** Câu L1 Caffeine tự lọc để chỉ hot data được nạp Redis L2 không phải hành vi mặc định của Caffeine. Chốt thiết kế L1/L2 chuẩn hoặc mô tả admission L2 tự xây rồi mới vẽ.
4. **Phổ Level 1–5 là hệ quy chiếu của báo cáo.** Cần ghi rõ đây là cách phân loại được sử dụng trong nghiên cứu và dẫn chứng cho từng cơ chế; không để người đọc nhầm với chuẩn đánh cấp độ phổ quát. Một deployment có thể có nhiều loại ranh giới ở các tầng khác nhau.
5. **Giảm các khẳng định tuyệt đối.** “Miễn nhiễm tuyệt đối”, “triệt tiêu hoàn toàn”, “không rò rỉ”, “TCO tiệm cận 0”, “onboarding mili-giây” cần giả định và/hoặc đo kiểm. Namespace/resource quota không bảo vệ mọi tài nguyên chung; RLS có các role bypass và không bảo vệ mọi thao tác cấp bảng. Đánh giá in-memory phụ thuộc provider, không được OpenFeature tự bảo đảm. Không suy từ tên tiêu chuẩn tuân thủ hoặc BYOK ra một topology bắt buộc nếu chưa có yêu cầu triển khai cụ thể.

## 5. Thứ tự sửa đề xuất

1. Chốt blueprint, legend và danh mục hình với nội dung báo cáo.
2. Vẽ thêm Compute-Isolated/Shared-Data và Tiered Hybrid + Cells.
3. Sửa cache, ánh xạ cell, cây quyết định và chú thích SET LOCAL.
4. Bổ sung context propagation/finally, RLS fail-closed và phạm vi Enterprise.
5. Đồng bộ số hình/caption, xuất lại cả `.drawio.png` và `.svg` từ nguồn `.drawio` cuối cùng.
6. Kiểm tra hình sau khi đặt vào trang báo cáo: các ảnh quá dài/ngang cần bố cục lại để chữ đọc được; hạn chế xuống dòng vụn ở tiêu đề schema và các hình thoi quá lớn so với nội dung.

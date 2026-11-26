# Rà soát nguồn báo cáo

## Phiên bản hiện hành từ Report_newest

Thân bài, hình, bảng, phụ lục và nội dung biểu mẫu dùng
`Report_newest.docx.md`, `Report_newest.docx` và `Report_newest.docx.pdf`.
Hình thức và thứ tự ghép quyển theo [HinhThucBC.pdf](HinhThucBC.pdf).
Các điểm R01–R10 đã được duyệt để cập nhật vào LaTeX. Vị trí và câu chữ
trước/sau được ghi trong [bản sửa đã duyệt](assets/newest-approved-edits.json).
[Manifest](assets/v4-import-manifest.json) ghi hash ba nguồn và nguồn ảnh
của từng hình. Thông tin kết quả và bản tóm tắt dùng chung nguồn biểu mẫu.

| Mục | Kết quả cập nhật |
| --- | --- |
| R01–R03 | Sửa số liệu tổng quan, gọi rõ hai chân dung giả lập, nối phạm vi đã hiện thực với thực nghiệm và nêu điều kiện của mô hình chi phí. |
| R04–R05 | Làm rõ phạm vi RLS, quyền xóa bảng, thứ tự kiểm tra WIP và tách các endpoint trong Bảng 4.3. Đối chiếu định tuyến và chữ ký phương thức với snapshot `8678bfe`. |
| R06 | NFR-03 dùng thời gian truy vấn lọc thủ công làm mẫu số. Phụ trội 36,0% vượt ngưỡng 5% theo số vi mô trong nguồn. Khoảng 1,8% là ước tính theo độ trễ API. Nhãn Hình 5.2 và Bảng D.1 dùng cùng cách diễn giải. |
| R07–R08 | Ghi 80 VU nghiệp vụ và tối đa 82 VU, phân biệt kiểm tra nghiệp vụ với RPS HTTP tổng. Giữ các trị số nguồn cùng giới hạn bằng chứng tại Chương 5, Phụ lục D và Kết luận. Các nhãn Hình 5.3b được hiệu chỉnh trong LaTeX để giữ nguyên luồng ảnh. |
| R09–R10 | Chuẩn hóa thuật ngữ chính và tiêu đề bản tin Anh. Danh mục dùng 24 nguồn theo [bản đồ trích dẫn](bibliography/v4-reference-map.json), có sửa dải trang Narasayya–Chaudhuri và liên kết PostgreSQL 16. |

Bìa dùng **tháng 10/2026** theo Report_newest. Danh sách đơn vị phối hợp
giữ hai đơn vị đã được nhóm xác nhận trong V4. Kinh phí **15.000.000
đồng** là dự toán. Bàn giao được trình bày là dự kiến, công bố ghi
“Không” theo nguồn. Điểm hệ 4 đã có đến năm 3.

### Tài liệu vừa bổ sung

- [Ảnh chân dung](assets/student-photo.png) đã được đưa vào ô ảnh của
  phiếu sinh viên chủ nhiệm. Khung mẫu và tỷ lệ ảnh được giữ nguyên.
- [Thuyết minh đã phê duyệt](assets/approved-proposal.pdf) gồm 16 trang
  scan, có chữ ký và dấu ở trang 16. Toàn bộ bản scan được ghép sau
  Phụ lục D và trước phần minh chứng sản phẩm, bản tin, tóm tắt.
- Trang 1 thuyết minh xác nhận tên đề tài, mã số và thời gian 05–10/2026.
  Trang 13, mục 16 ghi nhóm I và II “Không”, nhóm III có một ứng dụng
  web quản lý công việc đa thuê bao, nhóm IV có bản tin, báo cáo tóm
  tắt và video tối đa hai phút. Mục 17 nêu đơn vị tiếp nhận dự kiến.

### Thông tin và bằng chứng cần bổ sung

- **Đơn vị phối hợp chính.** Mục 9 trang 4 của thuyết minh ghi “Không”.
  Báo cáo hiện ghi hai đơn vị theo xác nhận trước của nhóm. Cần chốt
  cách ghi và căn cứ cập nhật nếu có. Đơn vị tiếp nhận dự kiến trong
  mục 17 là Trường Công nghệ Thông tin và Truyền thông, Đại học Cần Thơ.
- **Minh chứng sản phẩm nhóm III.** Bổ sung hồ sơ cho ứng dụng web quản
  lý công việc đa thuê bao, gắn với phiên bản nộp, bằng chứng truy cập
  dịch vụ, nghiệp vụ Kanban và kiểm thử cô lập dữ liệu. Mục 16 không
  đăng ký sản phẩm nhóm I hoặc II. Video nhóm IV nộp riêng, tối đa hai phút.
- **Biểu mẫu chủ nhiệm và kết quả nghiên cứu.** Bổ sung kết quả học tập
  năm 4 nếu đã có và sơ lược thành tích theo hồ sơ. Điền nhận xét của
  người hướng dẫn, ngày ký, chữ ký và xác nhận của trường khi hoàn tất.
- **Bàn giao và kinh phí.** Bổ sung biên bản hoặc thông tin bàn giao
  thực tế nếu đã bàn giao. Cung cấp số thực chi nếu biểu mẫu yêu cầu.
- Nhật ký cùng phiên bản cho các tập mẫu KB-1/KB-2 và phép đo vi mô RLS.
  Bản tổng hợp lưu trong Git hỗ trợ kiểm tra các số KB-3/KB-4 nêu ở
  Chương 5. Việc quy nhóm 12 yêu cầu chênh lệch, phân loại 63 lỗi
  Baseline và xác nhận đồng bộ bộ đệm giữa nhiều tiến trình cần dữ liệu gốc.
- Bản gốc hoặc bản ghi thư viện cho tài liệu [1]. Thông tin tác giả hiện
  được chép theo Report_newest.

## Lịch sử rà soát Report V4 ngày 26/11/2026

Nguồn đối chiếu gồm `Report_V4.md`, `Report_V4.pdf` và `Report_V4.docx`.
Manifest ghi hash của ba tệp, nội dung và tài nguyên đưa vào báo cáo.
Các chỉnh sửa thân bài đã duyệt có vị trí trước và sau trong
[v4-approved-edits.json](assets/v4-approved-edits.json).

| Mã | Kết quả xử lý |
| --- | --- |
| BT-01 | Sửa cụm thừa, lỗi gõ và câu phân quyền xóa bảng. Quyền xóa bảng trong phạm vi thuê bao được đối chiếu với `KanbanService.deleteBoard` ở commit `8678bfe`. |
| BT-02 | Thống nhất cách gọi thuê bao, bể kết nối và hiện tượng láng giềng ồn ào. Sửa các cụm dịch sát nghĩa trong phần định danh, cơ sở dữ liệu và tùy biến. |
| BT-03 | Bỏ cụm lặp và ghi chú soạn thảo trong Chương 4. Bản tin Việt dùng tên chính thức của đề tài. Bản tin Anh dùng tiêu đề “Research Project News Brief” và chuẩn hóa tên trường. |
| LG-01 | Mô tả Acme Software và Lotus Media là chân dung giả lập dùng để thiết kế và thử nghiệm. Giới hạn nội dung nhất quán trạng thái vào các thao tác nguyên mẫu có mô tả. |
| LG-04 | Đồng bộ tên UC02, luồng đăng nhập theo tên miền phụ, chú thích 4.5–4.6 và Bảng 4.3. API và tên trường được đối chiếu tĩnh với `AuthController`, `PublicController`, `KanbanController`, `TenantSettingsController` và `TenantSettings` ở commit `8678bfe`. Báo cáo dùng `cardDensity` và ghi khả năng tương thích với `cardDisplayMode`. |
| LG-05 | Giữ mẫu số truy vấn lọc thủ công tại NFR-03. Với số liệu V4, phụ trội 0,45 ms tương ứng 36,0% ở phép đo vi mô, vượt ngưỡng 5%. Ước tính 1,8% dùng độ trễ API đầu-cuối làm mẫu số. Số đo L1 được thống nhất khoảng 0,12 ms. |

## Điểm tạm hoãn

| Mã | Vị trí | Nội dung cần xem lại |
| --- | --- | --- |
| LG-02 | §1.1–1.3, §2.2–2.3, §3.3 và Kết luận | Làm rõ TCO và `δ → 0` là giả định. Rà các ngưỡng quy mô, “miễn nhiễm” và `O(1)`. Kiểm tra sự nhất quán giữa mô tả Silo dùng chung bộ mã nguồn ở Chương 2 và mô tả tách mã nguồn ở §3.3. |
| LG-03 | §3.2–3.4, §4.3 | Kiểm tra phạm vi RLS, logic ba giá trị và khẳng định về kế hoạch truy vấn. Xác định các cơ chế giới hạn đồng thời và xử lý nền đang được mô tả ở mức nguyên lý, hiện thực hay kiểm thử. |
| LG-06 | §5.1–5.4 và các biểu mẫu kết quả | Đồng bộ 80 VU nghiệp vụ và tối đa 82 VU. Làm rõ mẫu số 92,66%, cách tính RPS và phản hồi 429. Rà cách diễn giải phép so sánh khi Baseline và Proposed đồng thời thay đổi bộ đệm và giới hạn lưu lượng. Xác nhận cách gọi ngưỡng 500 ms. |
| LG-07 | §5.3.2, §5.4 và Phần III | Kiểm tra số lần chạy, nghĩa của `±`, cửa sổ telemetry 17/14 mẫu và phạm vi kiểm tra đồng bộ. Rà giả thuyết CPU/p99, kết luận về mức độ đạt mục tiêu, vòng đời thuê bao, di trú, giám sát và tên đề tài trong câu mở đầu Kết luận. |
| LG-08 | Danh mục viết tắt, tài liệu tham khảo và phụ lục | Hạng mục chưa được duyệt. Giữ danh mục viết tắt của template đã khôi phục và 25 mục tham khảo V4. Cần rà metadata nguồn, số liệu trong tổng quan và các mục [1], [9], [12], [13], [17], [25]. |

Ở Phụ lục C.1, ba giá trị cấu hình mật khẩu/khóa được biểu diễn bằng
chỗ giữ giá trị. Phụ lục D.1 và D.2 trình bày phạm vi, phép đo và chỉ dẫn
đọc kết quả. Manifest đánh dấu cách trình bày của từng khối phụ lục.

## Biểu mẫu

- Hai đơn vị phối hợp tiếp tục là Trường Công nghệ Thông tin và Truyền
  thông, Đại học Cần Thơ và Phòng Quản lý Khoa học, Đại học Cần Thơ.
- `image.png` xác nhận điểm học tập năm 1, 2 và 3 lần lượt là
  3.32/4.0, 3.48/4.0 và 3.79/4.0, khớp mục II trong V4. Phần ảnh hiển thị
  kết thúc ở năm 3. Ảnh chân dung 4×6 vẫn ở trạng thái chờ bổ sung.
- Ngày ký, chữ ký, nhận xét của người hướng dẫn và xác nhận của trường
  được bỏ qua ở lần cập nhật này theo yêu cầu. Biểu mẫu giữ các vị trí
  dành cho người có thẩm quyền.
- Kinh phí 15.000.000 đồng là dự toán. V4 ghi “Không” ở mục công bố.
  Thuyết minh đã ký/đóng dấu, minh chứng sản phẩm nhóm III, tình trạng
  bàn giao và số quyết toán cần hồ sơ xác nhận khi hoàn tất quyển nộp.

## Bằng chứng đối chiếu bổ sung

Đợt đối chiếu ngày 26/11/2026 dùng dữ liệu đã lưu và tài liệu gốc.
Các nhận định dưới đây được ghi để duyệt trước khi sửa thân bài.

### LG-06 và LG-07 — kết quả có thể tái tính

Đọc trực tiếp ba tệp dưới `experiments/results/ec2/` tại snapshot
`20d4dfbd3d3bb3710c37679c10d9b7a64d7ae23c`. Baseline trong snapshot
này được lưu ở commit `7c43e4e` (14/11), Proposed ở `2cf8a88` (15/11)
và telemetry ở `20d4dfb` (15/11). Đây là lịch sử lưu tệp.
Việc liên kết các tệp với cùng giao thức, phiên bản triển khai và lần
đo vẫn cần manifest và nhật ký thực nghiệm.

| Tệp | SHA-256 |
| --- | --- |
| `baseline_summary.json` | `9ad92c0955e6f94c1f3a2d88f31599ccaa129fb7cfbafd867e90ad1422b8cb37` |
| `proposed_summary.json` | `693ebdaaac7677794ece0d6377a04a59ac40786cdb240d3be3aedd648f396931` |
| `telemetry.csv` | `ae5a5f6835eb71a9bdafd3e460dda249eaed4831a9a339861456c156bac835f1` |

```sh
git show 20d4dfb:experiments/results/ec2/baseline_summary.json
git show 20d4dfb:experiments/results/ec2/proposed_summary.json
git show 20d4dfb:experiments/results/ec2/telemetry.csv
```

| Vị trí | Bằng chứng đọc được | Điểm cần sửa hoặc bổ sung |
| --- | --- | --- |
| §5.1, §5.3.1 và biểu mẫu | V4 mô tả 80 VU nghiệp vụ và 2 VU kiểm thử. Hai bản tổng hợp k6 đều có `vus_max = 82`. | Ghi 80 VU nghiệp vụ và tối đa 82 VU tính cả kiểm thử. Dùng 500 ms là ngưỡng mục tiêu của phép đo nếu thiếu cam kết SLA. |
| §5.3.1 và Hình 5.3b | `http_reqs` ghi 6.385 yêu cầu và 101,45 RPS ở Baseline, 20.423 yêu cầu và 327,56 RPS ở Proposed. Lấy số yêu cầu chia cho RPS chưa làm tròn cho khoảng 62,93 và 62,35 giây tương ứng. | Gọi đây là tốc độ HTTP tổng, có tính 429. Phân biệt cửa sổ tải khai báo 60 giây với mẫu số suy ra từ bản tổng hợp. Cần log có thời gian bắt đầu/kết thúc để xác nhận cửa sổ chính xác. |
| §5.3.1 và các bản tóm tắt | Proposed có 2.613/2.613 lần kiểm tra nghiệp vụ thông thường đạt. Nhóm gây nhiễu có 1.300 lần đạt và 16.423 lần nhận 429, tức 16.423/17.723 = 92,66%. | Ghi đúng mẫu số là toàn bộ yêu cầu của nhóm gây nhiễu. Tổng 20.423 lớn hơn 20.411 khi cộng 17.723, 2.613 và 75 lượt từ chối được nêu. Cần log cấp yêu cầu để giải thích chênh lệch 12 giữa các bộ đếm trước khi quy nhóm. |
| §5.3.1 và Hình 5.3a | Proposed có p95 **242,17–276,84 ms**, p99 **1.992,37–2.446,45 ms** ở bốn nhóm thông thường. Baseline ghi 63 yêu cầu mà k6 xếp thất bại trong `http_req_failed`. Bản tổng hợp thiếu phân loại timeout. | Ghi 63 thất bại HTTP theo k6 cho đến khi có log xác nhận timeout. Giới hạn kết luận ở cấu hình và dữ liệu đã lưu. Một đối chiếu thay đổi đồng thời bộ đệm và giới hạn tải chỉ định lượng tác động kết hợp. |
| §5.3.2 và Hình 5.4 | Mỗi vùng chứa dịch vụ có 17 mẫu (10:00:24–10:01:37). Bộ sinh tải có 14 mẫu (10:00:33–10:01:33). Khoảng giữa hai mẫu liên tiếp là 4 hoặc 5 giây. CPU API trung bình **95,02%**, cực đại **127,93%**. CSV còn có worker. | Sửa cách ghi chu kỳ mẫu và mô tả vai trò worker. Đối chiếu giới hạn CPU thực tế với cách thu mẫu CPU của Docker. Để kiểm chứng giải thích CPU/p99, cần ghép timestamp độ trễ với CPU hoặc số liệu phép đo tách bộ sinh tải. |
| §5.3.2 và §5.4 | Các kiểm tra k6 của Proposed ghi 19/19 lần đọc cấu hình và 19/19 lần tạo thẻ có trường mở rộng đạt. Ở 19 lần kiểm tra di chuyển thẻ, 17 lần kích hoạt WIP và hai lần còn lại thuộc nhóm mã kết quả chấp nhận. Chưa có thứ tự từng lượt trong bản tổng hợp. | Cần nhật ký đã che dữ liệu và trường nhận diện để xác nhận thứ tự “hai lượt đầu”, tên trường JSONB cụ thể và cấu hình WIP đúng lần chạy. Muốn ghi **2,45 ± 0,65 ms** và kết luận NFR-06, cần mẫu thời gian phát/nhận từ nhiều tiến trình, số mẫu, cách đồng bộ đồng hồ và định nghĩa `±`. |

`CHAPTER_5_TABLES.md` trong cùng snapshot chứa các số Proposed cũ
(ví dụ p95 Acme 1.135,73 ms). Khi đối chiếu V4, dùng số đo trong
`proposed_summary.json` và ghi rõ phiên bản tệp. Ý nghĩa bộ đếm HTTP
được đối chiếu với [tài liệu Grafana k6](https://grafana.com/docs/k6/latest/using-k6/metrics/reference/).

### LG-02, LG-03 và giới hạn bằng chứng Chương 5

- **LG-02, §1.1–1.3, §2.2–2.3, §3.3 và Kết luận.** Đồng bộ mô tả
  mã nguồn dùng chung với phạm vi tài nguyên được cấp riêng trong Silo.
  Giữ `δ → 0`, các mốc quy mô và `O(1)` dưới dạng giả định với điều
  kiện cụ thể hoặc bỏ khẳng định định lượng. AWS mô tả đánh đổi giữa
  chi phí, khả năng cô lập và cách triển khai. Nếu giữ kết luận định
  lượng chi phí của đề tài, cần dữ liệu chi phí theo cấu hình, tải và
  số thuê bao. [AWS SaaS Lens](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/software-and-architecture-patterns.html)
- **LG-03, §3.2–3.4 và §4.3.** Mô tả RLS theo phạm vi bảng, thao tác và
  vai trò mà chính sách áp dụng. Giải thích điều kiện chỉ nhận dòng khi
  biểu thức trả `TRUE`, đồng thời giữ phân biệt giữa `UNKNOWN` và
  `FALSE`. Cần kế hoạch truy vấn của cấu hình V4 để kết luận về chỉ
  mục. Mã tại `8678bfe` có quản lý bộ đệm và phát sự kiện vô hiệu hóa,
  là bằng chứng hiện thực tại snapshot. Cần nhật ký riêng cho kết quả
  đa tiến trình và các cơ chế giới hạn đồng thời hoặc xử lý nền được
  nêu là đã kiểm chứng. [PostgreSQL 16 về RLS](https://www.postgresql.org/docs/16/ddl-rowsecurity.html) ·
  [Chính sách và kết quả biểu thức](https://www.postgresql.org/docs/16/sql-createpolicy.html) ·
  [Chỉ mục nhiều cột](https://www.postgresql.org/docs/16/indexes-multicolumn.html)
- **LG-07, §5.2 và §5.4.** Cần kết quả gốc cùng phiên bản cho các tập
  **500 + 200 + 1.500** của KB-1, **600** của KB-2 và **500 mẫu đo vi mô**
  được trích ở NFR-03. Lịch sử có
  `8678bfe:experiments/results/controlled/20261112T155317Z/rls-overhead.json`
  và manifest của đợt 12/11. Đây là phép đo khác, có 250 mẫu mỗi nhánh,
  trung bình thời gian đo nội bộ **0,425/0,648 ms**. Các số này khác
  **1,25/1,70 ms** của V4 nên chỉ dùng làm đối chiếu nguồn, chưa thể
  gắn cho Hình 5.2c. Các tập KB-1/KB-2 lớn cần log hoặc bảng tổng hợp
  có ID phép thử và chỉ rõ phạm vi mẫu.
- **LG-07, §5.4 và Phần III.** Dùng tên đề tài chính thức. Phân biệt
  phần hiện thực, kết quả có log và hướng phát triển. Mỗi tuyên bố
  về độ trễ đuôi, vòng đời thuê bao, di trú hoặc giám sát cần phép đo
  tương ứng nếu dự kiến giữ dưới dạng kết quả thực nghiệm.

### LG-08 — nguồn và metadata đã tra được

Số trong bảng là số **gốc của V4**, đối chiếu bằng
[bản đồ tài liệu tham khảo](bibliography/v4-reference-map.json).

| Mục | Điểm cần chỉnh hoặc bằng chứng cần thêm |
| --- | --- |
| [1] | Cần họ tên tác giả, năm và bản gốc hoặc bản ghi thư viện của báo cáo đồ án. Chưa xác định được nguồn công khai đủ khớp. |
| [5] | Sửa **781** thành **761** bài sau loại trùng, trong đó **48** qua lọc toàn văn. **371** là số mục web công nghiệp. **2,1%** tương ứng với **1/48** bài thuộc nhóm báo cáo kinh nghiệm. Nguồn xếp **6/48** bài vào nhóm đánh giá trong thực tế. [Bài của Kabbedijk và cộng sự, §3.1–3.2](https://research.tudelft.nl/files/47060994/kabbedijkJSS_2.pdf) |
| [6] | Nhà xuất bản xác nhận **64** công bố qua chọn lọc trong giai đoạn 2015–2022. Nếu giữ nhận định “phần lớn” về mức độ hiện thực, cần nêu nhóm phân loại và mẫu số trong bài. [WSEAS](https://wseas.com/journals/articles.php?id=7661) |
| [9] | Bản nhà xuất bản ghi Ritesh Kumar, *Journal of Software Engineering and Simulation*, tập 6, số 5, trang 28–41, **2020**, DOI `10.35629/3795-06052841`. V4 đang ghi 2025. [Bản nhà xuất bản](https://www.questjournals.org/jses/papers/Vol6-issue-5/06052841.pdf) |
| [12]–[13] | Chuẩn hóa nhan đề GKE và ghi rõ [13] là kho kiến trúc tham chiếu. Nếu phân tích một phiên bản mã nhất định, bổ sung commit hoặc bản phát hành đã dùng. [Google Cloud GKE](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/multitenancy-overview) · [Kho mẫu AWS](https://github.com/aws-samples/saas-reference-architecture-ecs) |
| [17] | Xác định ISBN hoặc trang bản quyền của đúng bản đã đọc. Nhà xuất bản ghi tên *Essentials of Logic* cho Copi, Cohen và Flage. Mục V4 đang gộp nhan đề *Introduction to Logic* với thông tin tác giả và mốc năm cần xác minh. [Routledge](https://www.routledge.com/Essentials-of-Logic/Cohen-Copi-Flage/p/book/9780132380348) |
| [25] | Trỏ tới tài liệu **PostgreSQL 16** và dẫn đúng trang cho mục RLS, lệnh `SET` và chỉ mục nếu trích riêng. [RLS 16](https://www.postgresql.org/docs/16/ddl-rowsecurity.html) · [SET 16](https://www.postgresql.org/docs/16/sql-set.html) |

### Hồ sơ cần cung cấp để ghép quyển

- Bản thuyết minh **đã phê duyệt, có ký tên và đóng dấu**. Bản văn bản
  `c5d0957:resource/thuyetMinhSaasMultiTenancy.md` dùng để kiểm tra
  mục 16–17 và xác nhận sản phẩm nhóm III đã đăng ký là ứng dụng web
  Kanban đa thuê bao. Mục 17 ghi việc bàn giao dự kiến.
- Minh chứng **sản phẩm nhóm III** gắn với bản nộp hoặc bàn giao. Cần
  bản mô tả/bản xác nhận sản phẩm và thông tin định danh bản
  dựng hoặc hồ sơ triển khai tương ứng. Hình 4.5–4.6 minh họa nguyên mẫu.
- Biên bản hoặc ngày bàn giao và đơn vị tiếp nhận nếu hồ sơ ghi đã
  bàn giao. Cần khoản quyết toán nếu biểu mẫu yêu cầu số thực chi.
- Video giới thiệu tối đa hai phút là đầu ra nộp riêng của nhóm IV.
  Điểm năm 4, ảnh chân dung và các trường ký/nhận xét tiếp tục theo
  trạng thái ở phần Biểu mẫu.

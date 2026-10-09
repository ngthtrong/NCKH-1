# Biên bản xuất bản báo cáo sơ bộ — 09/10/2026

**Trạng thái:** hoàn thiện nội dung và xuất bản bản sơ bộ để review; chưa phải báo cáo tổng kết đủ điều kiện nộp hoặc nghiệm thu.

## Phiên bản và đầu ra

Nền mã ứng dụng: `main` / `e829f73d88beaea24e8cc2e4d71513ce2ee9127e`. Nội dung báo cáo và hồ sơ hỗ trợ ở working tree, chưa commit. Không có diff trong `apps/`, contract OpenAPI, migration hoặc cấu hình thực nghiệm do lượt viết này.

Thời điểm ghi biên bản: 2026-10-09T11:40:37+08:00.

| PDF | Tổng trang | Kiểm tra cuối |
| --- | ---: | --- |
| [content](build/content/content.pdf) | 70 | A4; phông nhúng; layout/reference đạt |
| [content-twoside](build/content-twoside/content.pdf) | 70 | A4; phông nhúng; layout/reference đạt |
| [bulletin-vi](build/bulletin-vi/bulletin-vi.pdf) | 1 | A4; phông nhúng; layout/reference đạt |
| [bulletin-en](build/bulletin-en/bulletin-en.pdf) | 1 | A4; phông nhúng; layout/reference đạt |
| [summary-vi](build/summary-vi/summary-vi.pdf) | 1 | A4; phông nhúng; layout/reference đạt |
| [summary-en](build/summary-en/summary-en.pdf) | 1 | A4; phông nhúng; layout/reference đạt |
| [smoke](build/smoke/smoke.pdf) | 5 | A4; phông nhúng; layout/reference đạt |

Báo cáo một mặt và hai mặt cùng **70 trang**: phần đầu 15 trang (PDF 1–15); phần khoa học từ Mở đầu đến Kết luận **41 trang**, đánh số Ả Rập 1–41 (PDF 16–56); tài liệu tham khảo 2 trang (PDF 57–58); phụ lục 12 trang (PDF 59–70). Số trang được đối chiếu `pdfinfo`, text và footer trong PDF, không lấy tổng 70 làm số trang nội dung.

[Hình thức báo cáo tổng kết](HinhThucBC.pdf), mục 2.2, yêu cầu ít nhất 50 trang, không tính mục lục, tài liệu tham khảo và phụ lục. Phần khoa học 41 trang của bản sơ bộ **chưa đáp ứng mức 50 trang nội dung**. Bộ `check` hiện không kiểm tra điều kiện này. Cần bổ sung kết quả nghiên cứu thực sự và bàn luận tương ứng cho bản cuối; không chèn trang trống hoặc số đo giả.

## Nội dung đã hoàn thiện

- Mở đầu, bốn chương, Kết luận, bibliography và hai phụ lục có nội dung; tiêu đề theo kiến trúc phần mềm đa thuê bao.
- N1 định danh/context; N2 bố trí/cô lập dữ liệu; N3 xác thực/quyền; N4 mutation/outbox; N5 provisioning/tài nguyên. Mỗi nhóm nối bài toán → phương án → tiêu chí → hiện thực → bằng chứng → mục đánh giá. Xem [ma trận sáu bước](../docs/research/preliminary-report-traceability.md).
- Bốn RQ có câu trả lời sơ bộ cùng bằng chứng, giới hạn và điều kiện bổ sung; phân biệt code, suy luận, checkpoint lịch sử, artifact cũ, test mới và dữ liệu chưa có.
- Có 17 mã bằng chứng E01–E17, anchor không trùng; [sổ bằng chứng](../docs/research/preliminary-report-evidence.md) lưu ngày, phiên bản, môi trường, skip và giới hạn.
- Bibliography dùng 12 nguồn thực: 5 nguồn học thuật và 7 tài liệu chính thức. [Hồ sơ nguồn](../docs/research/preliminary-report-sources.md) ghi cả giới hạn truy cập/toàn văn/chất lượng. Ví dụ citation trong smoke là tài nguyên riêng, không phải nguồn nghiên cứu.
- Năm sơ đồ TikZ: control/application plane, request context, ba topology, mutation/outbox và state machine provisioning. Không dựng biểu đồ kết quả khi chưa có dữ liệu.
- Bản tin/tóm tắt Việt–Anh đồng bộ trạng thái sơ bộ. Giữ thông tin nhân sự trong nguồn hiện tại và cập nhật mô tả trạng thái ở `infoGroup.md`; không tạo chữ ký, ảnh, thành tích hoặc nhận xét.

## Kiểm tra xuất bản và xem PDF

Các lệnh thực hiện từ root:

```bash
make -C report doctor
make -C report all smoke
make -C report content content-twoside  # xuất lại sau chỉnh bố cục cuối
make -C report check
git diff --check
```

Doctor đạt: XeLaTeX, Biber/BibTeX, Poppler, package và Times New Roman đủ bốn kiểu. Các mục tiêu build đạt; check cuối đạt cho cả bảy PDF: A4, phông nhúng, heading bắt buộc, citation/reference ổn định, không có overfull box, missing character hoặc lỗi LaTeX theo bộ kiểm tra. Đã xử lý cảnh báo bookmark do `slash` và ngoặc năm rỗng của nguồn online chưa xác minh năm xuất bản. Các cảnh báo underfull ở một số cột hẹp còn là thông báo dàn dòng; không được đánh đồng với tràn khung.

Đã xem ảnh render của bìa, mục lục, bảng truy vết, cả năm sơ đồ, coverage/skip, bibliography, sổ bằng chứng, Kết luận, bốn bản tin/tóm tắt và trang chẵn bản hai mặt. Chỉnh nhãn mũi tên đè vào box, đường retry, tên code dài và trang cuối N5/Kết luận có quá ít dòng. Bảng dài có header lặp; nguồn chữ và sơ đồ đọc được ở trang A4. Đây là review các trang đại diện và các vùng có rủi ro bố cục, không phải tuyên bố xem từng trang.

Các link nội bộ của hồ sơ mới đã kiểm tra; không có key trích dẫn thiếu hoặc label trùng. Log và ảnh review của phiên lưu ở `/tmp/nckh-report-*`; không coi thư mục tạm là kho lưu trữ dài hạn.

## Kiểm tra ứng dụng và giới hạn nghiên cứu

[Biên bản kỹ thuật](../docs/testing/preliminary-report-2026-10-09.md) và [JSON tổng hợp](../docs/testing/preliminary-report-2026-10-09.json) ghi lượt fresh compile/test: **106 tổng; 59 thực thi; 47 Docker skip; 0 failure/error**. Đã đối chiếu checksum 25 XML suite với JSON. Maven/test runtime Java 21.0.12.1; compiler fork javac 25.0.4.1 với release 21. Không mô tả là verification chuẩn hoàn toàn bằng JDK 21.

`verify` chưa hoàn tất do plugin Maven thiếu trong cache offline. Frontend contract/lint/test/build và E2E không chạy lại vì thiếu Node/runtime stack. Các số 96/16 hoặc 106/22 trong hồ sơ cũ được giữ đúng checkpoint, không ghép với 59 test mới thành kết quả tích hợp hiện tại.

Không mở lại P2 measurement, load/noisy-neighbor, fault injection, user study hoặc provider/VPS/Internet. Các bảng cần đo mang `PENDING_DATA`; chưa kết luận placement tối ưu, SLO, hiệu quả limiter, nhiều outbox worker, SUS hoặc tác động giáo dục. Cần xác nhận thời hạn/phạm vi, phụ lục protocol ba placement, tổng quan có sàng lọc đầy đủ, lựa chọn ADR và quy cách bibliography trước bản cuối. Hoàn thiện PDF không đóng cổng nghiên cứu.

## Checksum PDF tại lần xuất bản này

Hash đổi khi xuất lại PDF; dùng để nhận diện các artifact của biên bản này, không để suy ra tính tái lập byte tuyệt đối giữa các máy.

| Artifact | SHA-256 |
| --- | --- |
| `build/content/content.pdf` | `ceba0a5085fc676e9f8e5643cb62e25c4eb9b9d9d5bb60151f4021bcc82fb7e3` |
| `build/content-twoside/content.pdf` | `4c214b345d4b9f99c950ca211a0f06cb862e1686d55028e499c8053bbb23f259` |
| `build/bulletin-vi/bulletin-vi.pdf` | `8ea38eba7f2e6d87672876d33c8e90d5f0325d5540252a06002cd1fa087f8ccd` |
| `build/bulletin-en/bulletin-en.pdf` | `d26e5af7f9405a9955ec416627f63331cfa8ea9701e48cd7af387afe672051de` |
| `build/summary-vi/summary-vi.pdf` | `a055753cedbaa47ae131da473eb4f84ecec9b6ba16a9c4a74ba7b63796aa30e5` |
| `build/summary-en/summary-en.pdf` | `fcab50fa14f5e7a5ad04f5f7379aa72c46324f929584439bdc5f550a3b5a8da0` |
| `build/smoke/smoke.pdf` | `d3b7d7143a0497a8f0cfcf0f5174a1f04e791fb0e0cb617c8cd46cd4295bae8d` |

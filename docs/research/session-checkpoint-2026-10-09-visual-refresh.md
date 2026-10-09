# Checkpoint phiên chỉnh báo cáo và hình minh họa — 09/10/2026

## Yêu cầu đang thực hiện

Người dùng yêu cầu bỏ dòng **BẢN SƠ BỘ – CHƯA NGHIỆM THU** và bản tiếng Anh, hạn chế tối đa đường dẫn repository trong PDF, vẽ lại hình đẹp hơn và tăng hình giải thích. Sau đó yêu cầu lưu trạng thái/log trước giới hạn phiên. Yêu cầu lưu log không thay thế công việc chỉnh báo cáo.

## Nền và bảo toàn

- Repository `/home/ngthtrong/NCKH-1`, nhánh `main`, nền ứng dụng `e829f73d88beaea24e8cc2e4d71513ce2ee9127e`.
- Thư mục LaTeX thực tế `report/`; dùng Makefile hiện hữu. Không dùng đường dẫn cũ `reportTemplate/`.
- Working tree có rất nhiều diff báo cáo từ trước. Không reset, không commit, không thay mã ứng dụng, OpenAPI, migration, protocol hoặc biên bản nghiên cứu cũ.
- Giữ thông tin nhóm/nhân sự trong `report/config/metadata.tex`, `report/frontmatter/participants.tex`, `report/infoGroup.md`. Root `plan.md` có sẵn từ thao tác khác, không sửa.
- Không chạy P2/load/noisy-neighbor/fault injection/user study/provider/VPS. Không đổi trạng thái ADR Proposed.
- Nguồn và biên bản chi tiết vẫn ở `docs/research/preliminary-report-{evidence,sources,traceability}.md`; không xóa provenance để làm PDF gọn.
- Diff trước lượt chỉnh hình thức được lưu tạm ở `/tmp/nckh-report-before-visual-refresh.patch`. Đây không phải archive dài hạn; nguồn hiện tại trong working tree là trạng thái cần tiếp tục.

## Đã làm trong lượt chỉnh hình thức

1. Bỏ banner Việt/Anh khỏi bìa, hai nội dung thông tin nghiên cứu và hai bản tin. Tiêu đề bìa đổi `BÁO CÁO SƠ BỘ` thành `BÁO CÁO`. Giảm lời tự gắn nhãn bản tạm; vẫn giữ giới hạn thực nghiệm và kết luận có điều kiện.
2. Không còn `\Repo{...}` hoặc đường dẫn `apps/`, `docs/`, `report/`, `resource/`, `/tmp` trong nội dung khoa học/phụ lục/biểu mẫu. Đường dẫn API nghiệp vụ và URL tài liệu tham khảo vẫn là thông tin có ý nghĩa. Bảng E01–E17 trong PDF dùng tên nguồn theo chức năng; đường dẫn đầy đủ được giữ ở sổ Markdown.
3. Thêm `report/template/diagrams.tex`: palette xanh lam/xanh ngọc/vàng/đỏ, nhóm nền, box bo góc, kiểu đường hợp lệ/lỗi và font Times New Roman khoảng 10.5 bp. `template/packages.tex` dùng các thư viện TikZ có sẵn; cột X của bảng căn trái để giảm khoảng cách chữ.
4. Vẽ lại 5 hình: `planes`, `context`, `topologies`, `outbox`, `provisioning`.
5. Thêm 10 hình: `account-scope`, `trust-boundaries`, `research-chain`, `evidence-chain`, `experiment-design`, `authorization`, `version-conflict`, `storage-lifecycle`, `isolation-case`, `test-scope`.
6. Chèn các hình với đoạn dẫn/cách đọc trong cả bốn chương. Phân bố: Ch.1 có 2; Ch.2 có 3; Ch.3 có 8; Ch.4 có 2. Các ví dụ version 7/8 và thiết kế 36 run ghi rõ minh họa/đề xuất; không tạo số đo mới.
7. Bỏ các tên test rất dài lặp trong prose khi có thể; giữ chức năng, nhóm case và evidence ID. 47 skip được diễn giải theo nhóm chức năng, không đổi thành pass.

## Kết quả kiểm tra tới thời điểm checkpoint

- `make -C report content` **đạt** sau sửa nhãn state machine bị tràn và bố cục các sơ đồ.
- Bản chính hiện **73 trang**, phần Mở đầu–Kết luận **46 trang** (PDF 16–61), bibliography bắt đầu PDF 62. Đây chưa phải số trang cuối của toàn bộ lần xuất đồng bộ.
- Log đạt tại `/tmp/nckh-report-visual-build.log`. Không còn overfull, missing character, lỗi bookmark hoặc hình quá lớn trong log cuối của bản chính.
- Đã xem đủ 15 trang chứa hình ở lượt render đầu; đã xem lại 8 trang có chỉnh sửa ở lượt sau. Các lỗi nhãn plane đè box, schema A/B chạm nhau, đường từ chối đi xuyên box, đường retry bị note che và chữ trạng thái dài đã được xử lý.
- Map figure/page hiện tại: 1.1→20; 1.2→26; 2.1→28; 2.2→31; 2.3→34; 3.1→36; 3.2→38; 3.3→40; 3.4→43; 3.5→46; 3.6→47; 3.7→49; 3.8→51; 4.1→53; 4.2→55.
- Render/log QA tạm: `/tmp/nckh-report-visual-review/`, có `figure-pages.json`, `page-*.png`, `revised-*.png`.
- `git diff --check` đạt ở lượt gần nhất. Chưa chạy `make check` cho bộ PDF đồng bộ mới vì chỉ bản chính được xuất lại.
- Backend không chạy lại trong lượt hình thức. Giữ kết quả E04 trước đó: 106 tổng, 59 thực thi, 47 Docker skip, 0 failure/error; compiler fallback release 21 và verify/frontend/E2E chưa hoàn tất vẫn phải được diễn giải đúng.

## Việc cần hoàn tất tiếp theo

1. Chỉnh nhỏ khoảng cách header/schema row trong `topologies.tex` (hiện đọc được, có thể tăng khoảng đệm); sửa caption `research-chain.tex` để nói đúng nhánh nét đứt quay về hiện thực. Các hình khác đã review đạt.
2. Xuất đồng bộ bằng `make -C report all smoke`, rồi `make -C report check`. Hiện bản hai mặt/bản tin/tóm tắt còn là artifact lượt trước, có thể còn banner cũ; không báo hoàn tất toàn bộ trước khi build lại.
3. Xem bìa/mục lục/phụ lục bằng chứng, cả bốn biểu mẫu mới và trang chẵn bản hai mặt. Kiểm tra text PDF không chứa banner hoặc đường dẫn repo; kiểm tra 15 caption và 17 evidence anchor.
4. Cập nhật `report/README.md`, trạng thái mô tả trong `report/infoGroup.md` và E17 trong sổ Markdown để phản ánh hình thức mới; không sửa thông tin cá nhân.
5. Viết biên bản xuất bản lượt chỉnh hình thức, số trang thực tế và SHA-256 PDF mới. `report/PRELIMINARY_VALIDATION.md` giữ biên bản/checksum bản 70 trang trước sửa; cần thêm chú thích liên kết biên bản mới, không gọi hash cũ là hash PDF hiện tại.
6. Cập nhật `docs/PROJECT_STATUS.md`, nhật ký nghiên cứu và checkpoint này khi hoàn tất. Chỉ cần kiểm tra xuất bản phù hợp, không chạy lại backend hoặc thực nghiệm cho thay đổi LaTeX.
7. Trả lời người dùng bằng link PDF mới, số hình tăng 5→15 và kết quả build/check; không tự tuyên bố đã có dữ liệu nghiệm thu.

## Lệnh tiếp tục

```bash
make -C report all smoke
make -C report check
git diff --check
```

Nếu build lỗi: đọc log trong `report/build/<target>/`, sửa hình/nguồn gây lỗi rồi chỉ chạy lại mục tiêu bị ảnh hưởng trước khi kiểm tra toàn bộ. Đừng chạy lại các script generator cũ trong `/tmp`: một số sửa QA đã thực hiện trực tiếp sau generator; bản `.tex` trong repository là nguồn đúng.

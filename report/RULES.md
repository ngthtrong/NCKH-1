# Quy tắc trình bày báo cáo — đồng bộ ngày 02/11/2026

Theo yêu cầu của nhóm, `report/` là thư mục báo cáo tổng kết chính thức
của đề tài THS2026-67. Các quy tắc dàn trang kế thừa từ template dưới
đây tiếp tục áp dụng. Nội dung và metadata được điền từ hồ sơ đề tài;
phần chưa có bằng chứng giữ trống, không suy diễn kết quả nghiệm thu.

Căn cứ ưu tiên là [HinhThucBC.pdf](HinhThucBC.pdf), trang 1. Chỉ kế thừa
cấu hình đang dùng trong báo cáo khi phù hợp với PDF này. Đã đọc văn bản
và xem trang quy định; bản PDF tại template có SHA-256
`55a53c1f4411ad809faba96b1e67f225b9c6d6a009f6c931a7233203b863bb25`.
Đây là lần đồng bộ cách trình bày, không phải xác nhận quy định mới của
trường. Khung gốc là template trống; bản trong `report/` được điền theo
hồ sơ và phạm vi cập nhật của đề tài này.

## Đối chiếu trực tiếp HinhThucBC.pdf

| Mục trong PDF | Yêu cầu | Đáp ứng trong template / phần phải hoàn thiện |
| --- | --- | --- |
| 2.1–2.2 | A4, Times New Roman 13, giãn dòng 1,3–1,5, lề trái 3 cm; trên/dưới/phải 2 cm | Cấu hình thân bài 13 bp, giãn dòng 1,3 và lề đúng; biểu mẫu/bìa đối chiếu mẫu riêng |
| 2.2 | Ít nhất 50 trang, không tính mục lục, tài liệu tham khảo và phụ lục | Bắt buộc khi hoàn thiện; khung trống không chèn trang để đủ số. Nên đếm riêng từ Mở đầu đến hết Kết luận/kiến nghị để tránh phụ thuộc phần đầu |
| 3.1–3.2 | Bìa, bìa phụ | Hai trang đầu, theo mẫu bìa dùng chung |
| 3.3 | Thành viên và đơn vị phối hợp chính | `frontmatter/participants.tex`, thông tin để điền |
| 3.4–3.5 | Mục lục, danh mục bảng/hình | Sinh tự động theo thứ tự trong `main.tex` |
| 3.6 | Từ viết tắt theo bảng chữ cái | Có danh mục; phải sắp xếp các hàng sau khi điền |
| 3.7–3.9 | Kết quả Việt, kết quả Anh, thông tin chủ nhiệm | Đúng thứ tự, đã chèn ảnh chủ nhiệm, giữ vùng nhận xét và ký tên |
| 3.10 | Mở đầu đủ tổng quan trong/ngoài nước, lý do, mục tiêu, phương pháp, đối tượng, phạm vi | Sáu mục trong `chapters/introduction.tex` |
| 3.11 | Chương đánh số, trình bày kết quả và bàn luận | Có khung chương; phải điền kết quả và đánh giá có căn cứ |
| 3.12 | Kết luận và kiến nghị | Hai mục riêng; hướng dẫn điền đóng góp, khả năng ứng dụng và đề xuất |
| 3.13 | Tài liệu tham khảo chia loại, trong từng loại theo bảng chữ cái | Cả Biber/BibTeX chia nhóm và sắp xếp; chỉ có nguồn thật khi người dùng bổ sung |
| 3.14 | Phụ lục nếu có | Sau tài liệu tham khảo |
| 3.15 | Thuyết minh đã phê duyệt, có ký tên/đóng dấu | Đã ghép bản scan 16 trang sau phụ lục |
| 3.16 | Minh chứng sản phẩm nhóm I–III theo mục 16 của thuyết minh | Vị trí tiếp sau thuyết minh; chờ hồ sơ đăng ký/thực tế, không tạo minh chứng giả |
| 3.17 | Bản tin Việt/Anh rồi tóm tắt Việt/Anh; video không ghép quyển | Đã ghép đúng thứ tự, dùng chung nguồn với bốn PDF riêng; không ghép video |

Giới hạn 50 trang là yêu cầu với **báo cáo đã điền hoàn chỉnh**. `make
check` kiểm tra template trống nên không dùng yêu cầu này để báo lỗi.
PASS của bộ kiểm tra không đồng nghĩa đã đáp ứng toàn bộ quy định hoặc
đủ điều kiện nộp. Tài liệu này không quy định số/tên chương cụ thể hay
bắt buộc trích dẫn theo IEEE; đó là các lựa chọn của template.

## Quy tắc đang áp dụng

| Phần | Cấu hình trong template | Nơi thực hiện |
| --- | --- | --- |
| Thân bài | A4; Times New Roman 13 bp; giãn dòng 1,3; trái 30 mm, các lề khác 20 mm | `template/ctu-report.cls`, `template/typography.tex` |
| Hai mặt | Giữ lề vật lý trái/phải; không ép chương mở ở trang lẻ | `template/ctu-report.cls` |
| Mục lục | Chừa rộng hơn cho số trang La Mã dài; phần đầu La Mã, Mở đầu bắt đầu từ 1 | Class và `main.tex` |
| Đoạn văn và danh sách | Giãn dòng 1,3 cho đoạn thân bài, cách đoạn 2 bp. Danh sách không đánh số dùng `–`, `+`, `•` lần lượt ở cấp 1, 2, 3. Danh sách có thứ tự dùng `1.` ở cấp 1 | `main.tex`, `template/v4-content.tex` |
| Bảng thân bài | Cỡ 13 bp trong `tabular`, `tabularx`, `longtable`; bảng nhập từ nguồn dùng giãn dòng 1,10 và lặp đầu cột khi sang trang; bảng trong biểu mẫu có cỡ riêng | `template/packages.tex`, `template/v4-content.tex`, `template/forms.tex` |
| Vị trí hình/bảng | Hình đặt thành khối sau đoạn hoàn chỉnh. Các hình và bảng ngang liền nhau dùng chung luồng dàn trang, với đoạn dẫn ngay trước đối tượng | `scripts/import_v4.py`, `template/v4-content.tex` |
| Bảng/hình rộng | Tách nội dung hoặc dùng trang ngang A4; giữ cỡ chữ đọc được | `pdflscape`, ví dụ trong `examples/formatting.tex` |
| Chú thích | Hình ở dưới, bảng ở trên; `label` sau `caption`; tham chiếu bằng nhãn | Hướng dẫn trong README và ví dụ |
| Tài liệu tham khảo | Văn bản pháp quy → sách/báo/tạp chí → bài viết/tài liệu khác; xếp tác giả trong từng nhóm; số liên tục toàn danh mục | `template/bibliography.tex` |
| Bìa và biểu mẫu | Đầu trang/khung bìa vector từ mẫu CTU; lề, cỡ chữ và giãn dòng theo từng loại mẫu | `template/forms.tex`, `assets/*.pdf` |
| Công bố | Bảng sáu cột: STT, tên bài báo, tác giả/nhóm tác giả, tên tạp chí, số tạp chí, năm xuất bản | `frontmatter/research-body-vi.tex` |
| Sản phẩm Việt–Anh | Ghép bản tin Việt, bản tin Anh, tóm tắt Việt, tóm tắt Anh sau thuyết minh và minh chứng sản phẩm nếu có; dùng cùng nguồn để xuất riêng | `main.tex`, `deliverables/content/` |
| Build | Build quyển một/hai mặt tự dựng lại cả bốn PDF riêng; không xuất số liệu hoặc chạy mô hình | `scripts/build.py` |

Số chương và tên chương là mặc định có thể chỉnh theo đề tài, không phải
yêu cầu bắt buộc của hướng dẫn hình thức. Bản hiện hành dùng tiêu đề và
nội dung năm chương từ bộ Report_newest sau khi áp dụng các sửa đổi đã
duyệt. Biểu mẫu dùng khung CTU, nội dung nguồn mới và thông tin xác nhận
của nhóm.

Quy ước vị trí hình/bảng, cỡ tiêu đề, đánh số và cách dùng nhãn là lựa
chọn trình bày được kế thừa từ báo cáo. Không diễn giải mọi lựa chọn kỹ
thuật này thành quy định của trường.

## Điền nội dung mà vẫn giữ đúng quy tắc

- Không dùng `\small`, `\scriptsize`, `\resizebox` hoặc `\scalebox` để
  ép bảng thân bài vừa trang. Sửa độ rộng cột, chia bảng hoặc dùng trang
  ngang; bảng dài dùng `longtable` có tiêu đề lặp lại. Hook giữ cỡ chữ khi
  bắt đầu bảng; người soạn vẫn cần tránh lệnh giảm cỡ bên trong từng ô.
- Dùng `itemize` và `enumerate` cho danh sách. Nhánh con nằm trong mục
  cha. Bộ nhập nhận diện các dấu gõ tay của Word để dựng đúng cấp.
- Hình và sơ đồ phải giữ đủ nội dung, trạng thái, quan hệ và chú giải.
  Phóng to đồng đều một hình đang đặt `width=\textwidth` không làm chữ
  trong PDF lớn hơn; cần điều chỉnh cỡ chữ tương đối hoặc bố cục nguồn.
- Với Draw.io sửa tay, xuất lại PDF trước khi build và kiểm tra bản xuất
  đã cập nhật. Template không chạy generator hay cài draw.io tự động.
- Không in đường dẫn nội bộ hoặc dòng nguồn artifact vào nội dung để
  thay trích dẫn học thuật. Lưu provenance riêng; vẫn trích dẫn tài liệu
  khoa học thật và nêu nguồn dữ liệu theo yêu cầu của đề tài.
- Bảng công bố để trống đến khi có thông tin thật; nếu không có thì ghi
  rõ. Phân biệt bài được chấp nhận và bài đã xuất bản; không suy ra số
  tập/năm xuất bản từ năm tổ chức hội nghị.
- `bibliography/legal.bib`, `books.bib`, `articles.bib` và `references.bib`
  xác định nhóm. Biber dùng `style=ieee, sorting=nyt, defernumbers=true`;
  BibTeX dùng `plainurl`/`splitbib`. Hai nhánh cùng phân nhóm nhưng cách
  trình bày chi tiết có thể khác. Không mô tả danh mục là xếp theo lần
  trích dẫn đầu tiên. Kiểm tra thủ công thứ tự tác giả Việt khi hoàn thiện.
- Thay cơ quan cần thay cả logo và đầu trang vector, bên cạnh metadata.
  Hash và nguồn mẫu của tài nguyên chung nằm trong
  `assets/template-layout-provenance.json`; không cần thư mục báo cáo gốc
  khi biên dịch bản sao độc lập.

## Phạm vi thông tin được điền

Các trường hành chính lấy theo Report_newest và xác nhận được ghi ở
[V4-REVIEW.md](V4-REVIEW.md). Biểu mẫu chủ nhiệm ghi điểm hệ 4 của năm
1–3 và ảnh chân dung đã cung cấp. Thành tích, nhận xét và ngày ký/chữ ký
chưa có dữ liệu được giữ chỗ trong mẫu. Tài liệu định dạng minh họa nằm
trong `examples/`.

Không áp số trang tối thiểu hay kiểm tra hồ sơ nghiệm thu vào template
trống. Bổ sung minh chứng sản phẩm sau thuyết minh và trước bốn bản
tin/tóm tắt khi có hồ sơ. Video là đầu ra riêng.
Build/check thành công chỉ xác nhận kỹ thuật của template, chưa xác nhận
nội dung, chữ ký hoặc hồ sơ đủ điều kiện nộp.

## Kiểm tra sau khi sửa

```bash
make doctor
make all smoke
make check
```

Chạy từ thư mục `report/` hoặc thêm `-C report` khi ở gốc repository.
Kiểm tra thêm `content smoke BIBLIOGRAPHY=bibtex` trên bản sao độc lập
khi sửa danh mục. Xem PDF thực tế để kiểm tra logo, bảng sáu cột, hình,
bảng, cỡ chữ, trang ngang và bốn biểu mẫu cuối quyển; log không phát
hiện được mọi trường hợp chữ đè lên ảnh hoặc sai nội dung.

# Kiểm tra báo cáo V4 — cập nhật bố cục 20/11/2026

Nội dung nghiên cứu chỉ lấy từ `../Report_V4.md` và `../Report_V4.pdf`;
hai nguồn không bị sửa. Hash nguồn và bảng ánh xạ tài nguyên nằm trong
[`assets/v4-import-manifest.json`](assets/v4-import-manifest.json).
Hình thức theo `RULES.md`, `HinhThucBC.pdf` và template hiện tại.

Bố cục ngày 20/11 theo yêu cầu mới: ưu tiên hình nhỏ trên trang dọc,
đặt trực tiếp sau đoạn hoàn chỉnh, giảm trang gần trống và sửa Phần II.
Hai bản một/hai mặt hiện đều 129 trang, so với 164 trang trước điều chỉnh.
Phần II cùng trang đầu Chương 1, cỡ chữ theo tiêu đề hiện tại, không còn
trang riêng chỉ có tiêu đề. Nhóm Phụ lục cũng không tạo trang tiêu đề trống.
Có 35 hình dọc; chỉ năm sơ đồ dày thông tin dùng ngang: 2.7, 3.10, 4.4,
4.8, 4.9. Hình/chú thích là một khối không nổi, tại ranh giới đoạn,
không thể trôi vào giữa một đoạn văn. Đoạn giới thiệu bảng/hình ngang đi
cùng đối tượng; cột bảng được cân lại và vẫn dùng chữ 13 bp.

| PDF hiện hành | Số trang |
| --- | ---: |
| [Bản một mặt](build/content/content.pdf) | 129 |
| [Bản hai mặt](build/content-twoside/content.pdf) | 129 |
| [Bản tin Việt](build/bulletin-vi/bulletin-vi.pdf) | 1 |
| [Bản tin Anh](build/bulletin-en/bulletin-en.pdf) | 1 |
| [Tóm tắt Việt](build/summary-vi/summary-vi.pdf) | 1 |
| [Tóm tắt Anh](build/summary-en/summary-en.pdf) | 1 |
| [Minh họa template](build/smoke/smoke.pdf) | 6 |

Cả bảy PDF qua kiểm tra A4/phông nhúng, không có lỗi tràn khung, thiếu
ký tự hoặc tham chiếu chưa giải quyết. Hai quyển cùng đạt 27.470/27.470
cụm năm từ của 297 đoạn; đủ 40 ảnh gốc nhúng đúng thứ tự và số hình/bảng.

Rà soát trực quan: số trang thân bài không phải trang cuối chương có
khoảng trắng đáy trên 150 mm giảm từ 14 xuống 1; trên 100 mm từ 23 xuống 2.
Hai chỗ còn lại là hình dọc trước bảng ngang, giữ đúng thứ tự nguồn và
chữ bảng 13 bp. Không còn trang chỉ một dòng hoặc tiêu đề. Hình 4.7 được
giữ dọc sau đoạn giới thiệu, loại bỏ trang gần trống ở mục 4.3.1.

## Phạm vi chuyển đổi V4

- Mở đầu với bảy mục, năm chương, kết luận/kiến nghị và phụ lục A–D.
  Ánh xạ 85 tiêu đề Markdown, thêm cấp mục cho A.1–D.2; giữ tên đề mục
  và nội dung V4. Mục lục/danh mục do LaTeX sinh.
- 40 hình nội dung, đúng thứ tự và vị trí tương đối giữa các đoạn nguồn.
  Dùng nguyên luồng ảnh PDF, không vẽ lại/cắt/chỉnh ảnh. PDF rõ hơn ở
  39/40 cặp; ảnh còn lại giống từng pixel. Markdown làm méo tỉ lệ hai
  ảnh nên giữ tỉ lệ tự nhiên của PDF. Giữ số 1.6a/b và 5.3a/b.
- Chín bảng dữ liệu: bảy bảng có caption và hai bảng hành trình không
  có caption. Một hàng Markdown bị ngắt giữa ô STRICT/WARN được nối
  lại theo PDF. Bảng rộng dùng trang ngang, bảng dài lặp tiêu đề; chữ
  bảng thân bài vẫn 13 bp. Bảng API giữ số 4.3 sau hai bảng không chú thích.
- Mười khối mã: lấy lại dòng vật lý từ PDF, đối chiếu với Markdown sau
  khi bỏ khoảng trắng, có hash riêng. Mã không được thực thi. Consolas
  9 bp vừa toàn bộ dòng gốc trong khổ 160 mm; bản 10 bp gây thêm 38 ngắt dòng.
  Mã dùng giãn dòng 1, cho phép qua trang, bảo vệ các dòng đầu/cuối và
  chừa đủ chỗ cho tiêu đề/phần mở đầu; giãn dòng thân bài vẫn 1,3.
- Đủ 25 tài liệu tham khảo, chỉ dùng metadata V4. Khóa `v4-01`–`v4-25`
  giữ quan hệ với số cũ; số hiển thị được sắp xếp lại theo nhóm/tác giả.
  Nguyên văn nguồn tại [`bibliography/v4-reference-map.json`](bibliography/v4-reference-map.json).
- Giữ bìa, biểu mẫu, thông tin hành chính và các mẫu V4 bị thiếu từ bản
  hiện tại. Tháng trên bìa là 11/2026 theo V4. Ô nghiên cứu trống trong
  biểu mẫu tiếp tục để trống; công bố ghi “Không” theo biểu mẫu Việt V4.
  Tên mẫu “Nguyễn Văn A” không thay thế thông tin chủ nhiệm thật.

## Môi trường và quy trình kiểm tra V4

Đã cài MiKTeX 25.12, GNU Make 4.4.1, Poppler 25.07 và các gói TeX cần
thiết, gồm biblatex-ieee/Biber, unicode-math, fvextra, fancyvrb, caption,
lineno, upquote và phụ thuộc. Python 3.11 cùng bốn kiểu Times New Roman
đã có trên máy. PyMuPDF 1.26.7 và pypandoc_binary 1.17 phục vụ nhập/kiểm
tra nguồn, không cần cho build thông thường. Script dùng UTF-8 rõ ràng;
`scripts/build.ps1` làm mới PATH, dùng `python` thay alias Windows Store.

PDF khung bìa được khôi phục đúng byte của Git gốc: auto-CRLF trên Windows
đã làm sai xref/độ dài stream. `.gitattributes` ngăn đổi xuống dòng trong
PDF/ảnh; hình học và hash của tài nguyên gốc không đổi.

```powershell
make -C report doctor PYTHON=python
make -C report all smoke PYTHON=python BIBLIOGRAPHY=biblatex
make -C report check PYTHON=python
python report/scripts/verify_v4.py
```

Sau điều chỉnh số bảng/cỡ mã, hai quyển được chạy lại XeLaTeX với cùng
trạng thái Biber đến khi nhãn/mục lục ổn định, rồi kiểm tra PDF lần cuối.
Bản tin/tóm tắt dùng cùng nguồn giữa bản ghép và bốn PDF riêng. Smoke
BibTeX cũng đã dựng thành công trên bản sao độc lập, giữ PDF smoke chính
ở backend Biber.

Đối chiếu Markdown với PDF nguồn: đủ 297 đoạn, 27.470/27.470 cụm năm từ
khớp. PDF đầu ra dùng Poppler để giữ khoảng trắng tiếng Việt, nối khoảng
trắng do ngắt định danh sau dấu gạch dưới. Kiểm tra thêm `.lof`/`.lot`,
hash nguồn/mã, byte ảnh, ảnh nhúng và thứ tự cả 40 hình. Rà soát trực quan
gồm các trang bảng, chú thích a/b, phụ lục và biểu mẫu.

## Giới hạn của nguồn V4

Đây là chuyển định dạng, không phải xác minh lại kết quả nghiên cứu hoặc
tính tồn tại/độ chính xác của tài liệu tham khảo. Thông tin thiếu ở [1],
[9], [12], [13], khoảng năm 1972/2007 ở [17], nhan đề PostgreSQL 16 đi cùng
URL `/current/` ở [25] được giữ nguyên. Tên đề tài trong đoạn Kết luận
khác tên trên bìa cũng giữ theo nguồn. Một số chuỗi API dính nhau ở bảng
4.3 đã có trong PDF V4 và không được tự sửa nội dung.

Ảnh, nhận xét, chữ ký, thuyết minh có ký/đóng dấu và minh chứng nghiệm
thu chưa được cung cấp vẫn giữ chỗ. Build/check không xác nhận tính đúng
đắn khoa học hoặc hồ sơ đã đủ điều kiện nộp.

---

## Lịch sử kiểm tra template — 02/11/2026

Phần dưới là lịch sử trước khi nhập V4, không phải trạng thái hiện tại.

Đã đồng bộ các quy tắc dùng lại được từ báo cáo hiện tại và đối chiếu
trực tiếp [HinhThucBC.pdf](HinhThucBC.pdf), gồm văn bản và trang quy định.
Căn cứ ưu tiên, bảng đối chiếu mục 2/3.1–3.17 và phần cần điền nằm trong
[RULES.md](RULES.md). Không sửa nguồn hoặc PDF của `report/`.

## Kết quả phiên bản hiện tại

| PDF | Số trang |
| --- | ---: |
| `build/content/content.pdf` | 31 |
| `build/content-twoside/content.pdf` | 31 |
| `build/bulletin-vi/bulletin-vi.pdf` | 1 |
| `build/bulletin-en/bulletin-en.pdf` | 1 |
| `build/summary-vi/summary-vi.pdf` | 1 |
| `build/summary-en/summary-en.pdf` | 1 |
| `build/smoke/smoke.pdf` | 6 |

- `make doctor` đạt; Times New Roman đủ bốn kiểu, các gói mới có sẵn.
- Cả bảy PDF qua `make check`: A4, font nhúng, không có lỗi tràn khung,
  thiếu ký tự, nhãn lặp hoặc tham chiếu/trích dẫn chưa giải quyết trong
  log cuối. Trang ngang A4 trong PDF minh họa có góc xoay 90 độ.
- Nhánh Biber xuất ba nhóm tham khảo, số liên tục [1]–[4]; hai tác giả
  minh họa A/Z được xếp đúng chữ cái dù trích dẫn theo thứ tự Z/A.
  Các bản ghi minh họa chỉ có trong `examples/`.
- Bản sao tách riêng dưới `/tmp/`, không mang `build/` hoặc môi trường
  cũ, đã chạy thành công `make all smoke BIBLIOGRAPHY=bibtex` và
  `make check`. Số trang giống bản Biber; không đọc tài nguyên dự án cũ.
- Đã xem hình render của bìa chính/phụ, thông tin kết quả Việt, nhận xét
  GVHD, phiếu chủ nhiệm, tóm tắt Việt, bản tin Anh và các trang minh họa
  hình/bảng/trang ngang/tham khảo. Phiếu chủ nhiệm giữ ảnh trống và bốn
  năm học cùng khối ký trên một trang, không chồng chữ lên khung ảnh.
- Bảng công bố có đủ sáu cột trong biểu mẫu Việt và tóm tắt Việt. Bốn
  bản tin/tóm tắt hiện diện ở cuối hai quyển theo đúng thứ tự.
- PDF minh họa xác nhận chữ trong bảng dùng cùng font/cỡ thân bài, kể
  cả bảng nằm trong nhóm có `\small` ở ngoài môi trường bảng.
- Metadata và bốn tệp bibliography nghiên cứu vẫn để trống/placeholder;
  kiểm tra văn bản PDF không thấy thông tin cá nhân, liên kết ảnh hoặc
  tên mô hình riêng từ báo cáo gốc. `git diff --check` đạt.

## Phạm vi kết luận

Đây là **template trống đã kiểm tra kỹ thuật**, chưa phải báo cáo hoàn
chỉnh đáp ứng toàn bộ hồ sơ. Mục 2.2 yêu cầu ít nhất 50 trang khi điền
xong, không tính mục lục, tài liệu tham khảo và phụ lục. Không lấy số
trang của khung, trang minh họa hay trang đính kèm để thay điều kiện này.
Thuyết minh đã ký/đóng dấu và minh chứng thật theo mục 3.15–3.16 còn phải
được cung cấp và chèn vào các vị trí đã đánh dấu trước bốn bản tin/tóm
tắt. Nội dung khoa học, thứ tự từ viết tắt/tên tác giả sau khi điền và
chữ ký cũng cần được kiểm tra lại.

## Lệnh tái tạo

```bash
make -C reportTemplate doctor
make -C reportTemplate all smoke
make -C reportTemplate check
```

Để thử fallback, sao chép template ra thư mục độc lập rồi chạy
`make all smoke BIBLIOGRAPHY=bibtex` và `make check`. Phần bên dưới là
kết quả lịch sử của phiên bản ban đầu, không phải số trang hiện tại.

## Kiểm tra ban đầu — 09/10/2026

Đã hoàn tất biên dịch và kiểm tra bộ template ban đầu. Các ô trống và
placeholder là phần cần điền cho đề tài mới.

### PDF đã tạo

| Tệp | Số trang |
| --- | ---: |
| `build/content/content.pdf` | 27 |
| `build/content-twoside/content.pdf` | 27 |
| `build/bulletin-vi/bulletin-vi.pdf` | 1 |
| `build/bulletin-en/bulletin-en.pdf` | 1 |
| `build/summary-vi/summary-vi.pdf` | 1 |
| `build/summary-en/summary-en.pdf` | 1 |
| `build/smoke/smoke.pdf` | 5 |

Hai báo cáo giữ 116 tiêu đề chương/mục và 14 tiêu đề phụ lục của khung
ban đầu, với tên khái quát. Nội dung khoa học chỉ còn comment hướng dẫn
và lệnh ngắt trang vô hình `\par\penalty0` để chương trống không tràn.
Báo cáo chính không chứa hình, số liệu hay mục tài liệu tham khảo mẫu;
PDF minh họa và bản ghi placeholder nằm riêng trong `examples/`.

### Lệnh tái tạo

```bash
make -C reportTemplate doctor
make -C reportTemplate all smoke
make -C reportTemplate check
```

Đã kiểm tra thêm nhánh BibTeX trên bản sao độc lập:

```bash
make content smoke BIBLIOGRAPHY=bibtex
make check
```

### Kết quả

- Cả bảy PDF đều A4, phông Times New Roman được nhúng. Kiểm tra công cụ
  xác nhận đủ bốn kiểu chữ. Class giữ cỡ thân bài 13 bp, giãn dòng 1,3
  và lề 30/20/20/20 mm; hai bìa và biểu mẫu giữ cấu hình riêng.
- Log cuối không có lỗi LaTeX, tràn khung ngang/dọc, tham chiếu/trích
  dẫn chưa giải quyết, nhãn lặp, thiếu ký tự hoặc phông thay thế.
- Đã xem trực quan hai bìa, trang mục lục đầu, biểu mẫu kết quả Việt–Anh,
  trang nhận xét người hướng dẫn, thông tin chủ nhiệm, Mở đầu, các trang
  chương trống; cả bốn bản tin/tóm tắt và trang minh họa hình/bảng/công
  thức/tài liệu tham khảo. Đã xem thêm bìa, biểu mẫu và trang chẵn/lẻ ở
  bản hai mặt; không phát hiện chữ đè logo hoặc nội dung vượt lề.
- Rà soát nguồn và văn bản PDF: không còn giá trị metadata dài, tên các
  thành viên, mã sinh viên/lớp, khóa tài liệu tham khảo hoặc thuật ngữ
  nghiên cứu riêng của đề tài cũ. Thông tin cơ quan và logo dùng chung
  được giữ lại có chủ đích; logo khớp nguyên byte với tài nguyên gốc.
- Đã sao chép nguồn sang một thư mục độc lập trong `/tmp`, bỏ toàn bộ
  `build/` và file phụ, rồi biên dịch cả bảy PDF và chạy kiểm tra thành
  công. Nhánh BibTeX đã kiểm tra cả báo cáo không có trích dẫn và ví dụ
  có trích dẫn. Nguồn template không có liên kết tới dữ liệu/mã sản phẩm.
- Không áp dụng điều kiện số trang tối thiểu hoặc hồ sơ nghiệm thu.
- Không sửa nguồn LaTeX, metadata, script, tài nguyên hay PDF của báo
  cáo gốc. Thư mục build hiện tại của template được tạo mới khi biên
  dịch; không sao chép build, môi trường ảo hoặc tệp tạm của báo cáo gốc.
- Kiểm tra whitespace nguồn và `git diff --check` đạt.

## Danh sách tệp nguồn

Các đường dẫn dưới đây tương đối với `reportTemplate/`. Ngoài danh
sách này có bảy PDF được tạo ở bảng đầu; các log/file phụ sinh khi build
được bỏ qua bởi Git.

```text
.gitignore
Makefile
README.md
VALIDATION.md
appendices/reproducibility.tex
appendices/supplementary-results.tex
assets/README.md
assets/diagrams/.gitkeep
assets/figures/.gitkeep
bibliography/articles.bib
bibliography/books.bib
bibliography/legal.bib
bibliography/references.bib
chapters/01-foundations/chapter.tex
chapters/01-foundations/sections/background.tex
chapters/01-foundations/sections/related-work.tex
chapters/01-foundations/sections/requirements.tex
chapters/02-data-methods/chapter.tex
chapters/02-data-methods/sections/data.tex
chapters/02-data-methods/sections/methods.tex
chapters/02-data-methods/sections/research-design.tex
chapters/03-system/chapter.tex
chapters/03-system/sections/architecture.tex
chapters/03-system/sections/implementation.tex
chapters/03-system/sections/synchronization.tex
chapters/04-evaluation/chapter.tex
chapters/04-evaluation/sections/limitations.tex
chapters/04-evaluation/sections/results.tex
chapters/04-evaluation/sections/setup.tex
chapters/conclusion.tex
chapters/introduction.tex
config/members.tex
config/metadata.tex
deliverables/bulletin-en.tex
deliverables/bulletin-vi.tex
deliverables/content/bulletin-en.tex
deliverables/content/bulletin-vi.tex
deliverables/content/summary-en.tex
deliverables/content/summary-vi.tex
deliverables/summary-en.tex
deliverables/summary-vi.tex
examples/formatting.tex
examples/references.bib
frontmatter/abbreviations.tex
frontmatter/cover.tex
frontmatter/participants.tex
frontmatter/principal-investigator.tex
frontmatter/research-body-en.tex
frontmatter/research-body-vi.tex
frontmatter/research-info-en.tex
frontmatter/research-info-vi.tex
frontmatter/title-page.tex
logo-ctu.png
main.tex
scripts/build.py
scripts/check_template.py
scripts/doctor.py
template/bibliography.tex
template/commands.tex
template/ctu-report.cls
template/packages.tex
template/typography.tex
```

## Bổ sung skill CDM/LDM/PDM — 29/10/2026

- Skill độc lập tại `.agents/skills/cdm-ldm-pdm/`; bộ kiểm tra
  `skill-creator/scripts/quick_validate.py` báo `Skill is valid!`.
- Chạy bốn mẫu CDM, LDM, PDM chi tiết và PDM tổng quan bằng Python 3.12,
  Pillow 13.0.0, bốn phông Times New Roman của máy. Cả bốn đều có
  `geometry_errors=0`, `metrics.labels=0`; SVG hợp lệ, kích thước PNG bằng
  ba lần SVG và metadata ảnh đạt 300 dpi. Đã mở xem cả bốn PNG.
- Sao chép riêng toàn bộ skill ra thư mục tạm rồi chạy từ `/tmp` thành
  công; không cần `template-diagram-system/`, đặc tả hoặc CSV dự án cũ.
- Đã tối ưu LDM và PDM có nhóm, sau đó dùng `--layout` để dựng lại;
  SVG và PNG khớp từng byte với đầu ra của bố cục đã chọn.
- Đầu vào sai cardinality, lặp tên trong lưới, PK nullable, quan hệ trỏ
  tới hộp không tồn tại hoặc ẩn thuộc tính bằng compact đều bị từ chối.
  Mẫu một thực thể độc lập và tự quan hệ có khoảng trống dựng thành công;
  bố cục tự quan hệ quá chật bị chặn do nhãn va chạm, không xuất ảnh mới.
- `--check-only` không xuất ảnh; đường dẫn phông khai báo nhưng không
  tồn tại gây lỗi rõ ràng. `git diff --check` đạt.

Ảnh xem thử nằm trong `build/diagrams-demo/` (bị Git bỏ qua). Nội dung
LaTeX và PDF báo cáo không thay đổi trong lần bổ sung này; không biên
dịch lại báo cáo. Các kiểm tra trên đánh giá skill và hình minh họa,
không chứng minh ngữ nghĩa hoặc độ đầy đủ của schema một đề tài mới.
# Cập nhật thông tin đề tài — 02/11/2026

Mốc này chỉ điền thông tin nền của báo cáo THS2026-67, trước khi nhập
nội dung chương 1 và chương 2 để duyệt local. `report/` là thư mục báo
cáo hiện hành. Các biên bản kiểm tra template bên trên là lịch sử của
khung, không phải kết quả khoa học của đề tài.

- Nguồn: `resource/infoGroup.md`, thuyết minh mục 1–9, 12–14 và 19.
- Đã điền tên/mã đề tài, chủ nhiệm, năm học/ngành/lớp, thông tin liên
  hệ, năm thành viên/MSSV/lớp, người hướng dẫn, thời gian 05–10/2026,
  địa điểm/ngày bìa và dự toán 15.000.000 đồng từ Đại học Cần Thơ.
- Mục tiêu và phương pháp lấy từ thuyết minh, dùng chung trong quyển
  và bản tin/tóm tắt Việt–Anh. Chưa điền kết quả, công bố, đóng góp thực
  tế, xếp loại học tập, ảnh, nhận xét hoặc chữ ký chưa được cung cấp.
- `make -C report doctor`, `make -C report all smoke`,
  `make -C report check`, `git diff --check`: đạt.
- Quyển một mặt/hai mặt: 31 trang A4; bản tin Việt/Anh và tóm tắt
  Việt/Anh: mỗi bản 1 trang; PDF minh họa: 6 trang. Phông được nhúng,
  không lỗi tràn khung, thiếu ký tự hoặc tham chiếu chưa giải quyết.
- Đối chiếu văn bản PDF xác nhận mã đề tài/tên chủ nhiệm ở sáu đầu ra.
  Quét bounding box toàn bộ sáu PDF không có chữ sát mép dưới 15 bp.
  Đã xem hai bìa, thông tin chủ nhiệm và hai bản tin: không phát hiện
  đè chữ/logo hoặc mất nội dung.
- Đây là bản nền thông tin, chưa đáp ứng 50 trang nội dung hoặc xác
  nhận đủ hồ sơ nghiệm thu; không tạo số liệu hay minh chứng giả.

# Báo cáo tổng kết đề tài THS2026-67

`report/` là nơi lưu nguồn LaTeX và PDF của báo cáo **Xây dựng ứng dụng
quản lý công việc theo kiến trúc đa thuê bao**. Thông tin chung được
điền theo Report_newest và các xác nhận của nhóm. Nguồn thông tin hành chính dùng
chung nằm ở `config/metadata.tex` và `config/members.tex`. Biểu mẫu chủ
nhiệm có điểm hệ 4 của ba năm đầu theo ảnh được cung cấp.

Căn cứ ưu tiên là [HinhThucBC.pdf](HinhThucBC.pdf), không phải mọi thay
đổi trong báo cáo gốc. Bảng đối chiếu mục 2 và 3.1–3.17 nằm trong
[RULES.md](RULES.md). Báo cáo hoàn thiện phải đạt ít nhất 50 trang theo
quy định và có hồ sơ thật. Biên dịch thành công không xác nhận hồ sơ nghiệm thu.

Bộ template độc lập, giữ bố cục của báo cáo gốc: A4, Times New Roman
13 bp, giãn dòng 1,3; lề trái 30 mm, phải/trên/dưới 20 mm. Hai bìa dùng
khung đôi và đầu trang vector từ mẫu CTU; biểu mẫu có cấu hình cỡ chữ,
lề và giãn dòng riêng theo từng mẫu. Quy tắc và các thay đổi đã đồng bộ
được ghi tại [RULES.md](RULES.md). Header/footer giữ kiểu hiện có: không có
nội dung header, số trang ở giữa footer. Hai bìa không in số trang,
phần đầu dùng số La Mã, Mở đầu bắt đầu số Ả Rập từ 1. Trang biểu mẫu
không in số trang nhưng vẫn được tính trong phần đầu.

Bố cục thân bài: hình đặt sau đoạn văn hoàn chỉnh. Các cụm hình và bảng
ngang liền nhau dùng chung luồng trang, gồm Hình 2.6 với Bảng 2.1
và các bảng ở Phụ lục D. Tiêu đề Phần II nằm cùng trang
đầu Chương 1. Hình/chú thích không nổi giữa đoạn; cột bảng và vị trí các
đoạn giới thiệu được điều chỉnh để giảm trang gần trống, giữ đủ nội dung.
Đoạn thân bài cách nhau 2 bp. Danh sách không đánh số dùng gạch ngang
`–` ở cấp 1, dấu cộng `+` ở cấp 2 và dấu chấm tròn `•` ở cấp 3.
Danh sách có thứ tự dùng số kèm dấu chấm ở cấp 1.

Nội dung ngày 26/11/2026 được chuyển từ `Report_newest.docx.md`,
`Report_newest.docx.pdf` và `Report_newest.docx`: Mở đầu, năm chương,
kết luận, 24 tài liệu tham khảo
và phụ lục A–D. Có 40 số hình với 42 ảnh nội dung. Ba ảnh của Hình 4.6
dùng chung một chú thích. Biểu mẫu kết quả và bản tin/tóm tắt Việt–Anh
lấy nội dung tương ứng trong Report_newest. Bản scan thuyết minh đã
phê duyệt được ghép sau Phụ lục D. Bốn bản tin/tóm tắt nằm cuối quyển
và đồng thời có đầu ra PDF riêng.
Các mục đã duyệt, tạm hoãn và dữ liệu biểu mẫu còn thiếu được ghi ở
[V4-REVIEW.md](V4-REVIEW.md).

## Cài đặt

Yêu cầu Python **3.9+**, GNU Make, XeLaTeX và Poppler. Các script build
báo cáo chỉ dùng thư viện chuẩn; không cần môi trường ảo, pip hay latexmk.
Skill vẽ sơ đồ tùy chọn bên dưới có phụ thuộc riêng: Python 3.10+ và Pillow.

Trên Debian/Ubuntu có thể cài:

```bash
sudo apt update
sudo apt install make python3 texlive-xetex texlive-latex-extra \
  texlive-lang-other texlive-fonts-recommended texlive-bibtex-extra \
  biber poppler-utils fontconfig
```

Cần Times New Roman đủ bốn kiểu Regular/Bold/Italic/Bold Italic. Cài
phông có quyền sử dụng vào hệ thống rồi chạy `fc-cache -f`. Trên WSL,
template cũng nhận bốn tệp `times.ttf`, `timesbd.ttf`, `timesi.ttf`,
`timesbi.ttf` tại `/mnt/c/Windows/Fonts/`. Nếu dùng vị trí khác, chỉnh
`template/typography.tex`. Template báo lỗi khi không tìm thấy phông,
không tự thay bằng phông khác. Phông toán dùng Latin Modern Math.

Trên Windows/macOS có thể dùng TeX Live/MiKTeX/MacTeX cùng Python,
Make và Poppler tương ứng. Chạy `make doctor` để kiểm tra thực tế.

Trên Windows/PowerShell, chạy từ thư mục gốc:

```powershell
powershell -ExecutionPolicy Bypass -File report/scripts/build.ps1 -Target doctor
powershell -ExecutionPolicy Bypass -File report/scripts/build.ps1
```

Wrapper làm mới PATH của tài khoản, dùng `python`, bật UTF-8 và chạy
`all`, `smoke`, `check`. Make có thể dùng `PYTHON=python`.
Nội dung nhập từ Report_newest dùng thêm `enumitem`, `fvextra` và
`caption` (`ltcaption`). Khối mã dùng
Consolas 9 bp nếu có để giữ vừa dòng mã gốc PDF; thân bài và bảng vẫn
dùng Times New Roman 13 bp.

## Biên dịch

Từ repository:

```bash
make -C report doctor
make -C report all
make -C report smoke
make -C report check
```

Hoặc vào `report/` và bỏ `-C report` trong các lệnh.

| Lệnh Make | PDF được tạo trong thư mục template |
| --- | --- |
| `make content` | `build/content/content.pdf` — một mặt |
| `make content-twoside` | `build/content-twoside/content.pdf` — hai mặt |
| `make bulletin-vi` | `build/bulletin-vi/bulletin-vi.pdf` |
| `make bulletin-en` | `build/bulletin-en/bulletin-en.pdf` |
| `make summary-vi` | `build/summary-vi/summary-vi.pdf` |
| `make summary-en` | `build/summary-en/summary-en.pdf` |
| `make deliverables` | Bốn PDF bản tin/tóm tắt Việt–Anh |
| `make all` | Hai bản báo cáo và bốn bản tin/tóm tắt |
| `make smoke` | `build/smoke/smoke.pdf` — minh họa định dạng riêng |

Bản hai mặt giữ lề vật lý trái 30 mm/phải 20 mm trên cả trang chẵn và
lẻ như báo cáo gốc, không đảo lề và không ép chương mở ở trang lẻ.

Build mặc định ưu tiên biblatex-ieee/Biber; nếu thiếu, dùng
BibTeX với `plainurl` và `splitbib`. Có thể chọn rõ:

```bash
make content BIBLIOGRAPHY=biblatex
make content BIBLIOGRAPHY=bibtex
make smoke BIBLIOGRAPHY=bibtex
```

Script tự phát hiện `\cite`, `\citep`, `\citet`, `\nocite` và biên dịch
đến khi tham chiếu ổn định. Biber khởi tạo cả danh mục trống; BibTeX chỉ
chạy khi có trích dẫn. Báo cáo trống
vẫn có trang tài liệu tham khảo nhưng không sinh mục giả hoặc cảnh báo
tham chiếu chưa giải quyết. Dùng Make/script để cơ chế này hoạt động;
một lượt XeLaTeX trực tiếp chưa đủ giải quyết danh mục và tham chiếu.

`make content` và `make content-twoside` tự dựng lại bốn PDF bản tin/
tóm tắt từ cùng nguồn. `make check` kiểm tra sáu PDF, log, khổ A4, phông nhúng và tài nguyên
nội bộ; kiểm tra thêm PDF minh họa nếu đã build. Build dừng khi gặp lỗi
LaTeX, tràn khung, thiếu ký tự, nhãn lặp hoặc tham chiếu chưa giải quyết.
Log nằm cạnh từng PDF. Xem trực quan PDF sau khi thay nội dung, vì log
không phát hiện được mọi vấn đề như chữ đè lên logo.

`assets/v4-import-manifest.json` ghi hash ba nguồn, đề mục, thứ tự/chú
thích hình, vị trí ảnh gốc trong PDF/DOCX, số hàng/cột bảng và mục phụ lục.
`bibliography/v4-reference-map.json` ánh xạ số nguồn mới sang khóa trích
dẫn; số hiển thị do template sắp xếp theo nhóm/tác giả. Giữ các số hình
1.6a/b và 5.3a/b. Hai bảng luồng tương tác không có caption trong nguồn vẫn không
đánh số. Ngắt dòng bên trong ô được giữ theo nguồn.

Nhập lại thân bài và phụ lục bằng `python report/scripts/import_v4.py` (ghi lại
các tệp nội dung đã sinh); bước này cần `pypandoc_binary`, `PyMuPDF`,
`Pillow` và ba tệp Report_newest ở thư mục gốc. Các chỉnh sửa đã duyệt
cho thân bài nằm ở `assets/newest-approved-edits.json`. Kiểm tra nội dung PDF bằng
`python report/scripts/verify_v4.py`.
Các thư viện này không cần cho build LaTeX thông thường. Kết quả và những
điểm thiếu thông tin trong nguồn được ghi tại [VALIDATION.md](VALIDATION.md).

`make clean` xóa **đầu ra do template sinh trong `build/`**, gồm các PDF;
chạy `make all smoke` để tạo lại. Chỉ PDF cuối được phép theo dõi bằng
Git; file phụ, log và tệp tạm bị bỏ qua.

## Điền thông tin và nội dung

- `config/metadata.tex`: tên đề tài Việt–Anh, mã số, chủ nhiệm, thông
  tin cá nhân, lớp/khóa, người hướng dẫn, đơn vị, thời gian, kinh phí,
  địa điểm và ngày báo cáo. Thông tin cơ quan có thể chỉnh ở cuối tệp; khi đổi cơ quan,
  thay cả đầu trang vector/khung bìa trong `assets/` và logo.
- `config/members.tex`: tên các thành viên, hàng MSSV/lớp và danh sách
  dùng trên bản tin. Khi thêm/bớt thành viên, chỉnh cả `\MemberRows`
  và `\ProjectMembers` trong cùng tệp.
- `frontmatter/`: danh sách thành viên, chữ viết tắt, thông tin kết quả
  Việt–Anh và thông tin chủ nhiệm. Thay `\PendingField{...}` bằng nội
  dung cần kê khai. Phiếu chủ nhiệm dùng ảnh `assets/student-photo.png`.
- `assets/approved-proposal.pdf`: bản scan thuyết minh do nhóm cung cấp.
  `main.tex` ghép đủ 16 trang, canh vừa khổ A4 và thêm mục dẫn tới
  trang đầu của bản scan.
- `chapters/introduction.tex`: bảy mục Mở đầu.
- `chapters/01-foundations/chapter.tex`: cơ sở lý thuyết về kiến trúc đa thuê bao.
- `chapters/02-architecture/chapter.tex`: kiến trúc hệ thống đa thuê bao.
- `chapters/03-system/chapter.tex`: kỹ thuật/nguyên lý Pool 9 tầng, K1–K4.
- `chapters/04-implementation/chapter.tex`: nghiệp vụ, thiết kế và hiện thực Kanban.
- `chapters/04-evaluation/chapter.tex`: thực nghiệm và đánh giá kết quả.
  Nội dung hiện hành nằm trong các `chapter.tex`; section và khung cũ
  không được nhập vào `main.tex`. Số trong tên thư mục không quyết định số chương.
- `chapters/conclusion.tex`: kết luận và kiến nghị.
- `appendices/v4-a.tex` đến `v4-d.tex`: bốn phụ lục, gồm các trích đoạn trong
  `assets/code/v4/` và bảng số liệu tại Phụ lục D.
- `deliverables/content/`: nội dung bản tin Việt–Anh; hai bản tóm tắt
  dùng lại `frontmatter/research-body-vi.tex` và `research-body-en.tex`
  để thông tin thống nhất với biểu mẫu trong báo cáo.

Các dòng bắt đầu bằng `%` là hướng dẫn không hiển thị trong PDF. Điền
văn bản dưới tiêu đề tương ứng. Đổi tên chương/mục trong đối số
`\chapter{...}`, `\section{...}`, `\subsection{...}`. Nếu đổi tên tệp,
cập nhật `\input`/`\include` tại tệp cha hoặc `main.tex`. Thêm nhãn duy
nhất ngay sau tiêu đề, ví dụ `\label{sec:phuong-phap}`.

Chữ viết tắt hiện chỉ có hàng tiêu đề; thêm dòng
`TVT & Diễn giải đầy đủ \\` trước `\bottomrule`. Danh mục bảng/hình
của báo cáo chính để trống cho đến khi có đối tượng với `\caption`.

## Hình, bảng và công thức

Đặt tài nguyên của đề tài mới vào `assets/figures/` hoặc
`assets/diagrams/`. Các gói và đường dẫn đã cấu hình sẵn. Logo dùng
chung là `logo-ctu.png`; đầu trang/khung bìa dùng hai PDF trong `assets/`.
Thay các tài nguyên này khi đổi cơ quan.

```latex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=.8\textwidth]{ten-hinh.pdf}
  \caption{Tên hình}\label{fig:ten-hinh}
\end{figure}

\begin{table}[htbp]
  \centering
  \caption{Tên bảng}\label{tab:ten-bang}
  \begin{tabularx}{\textwidth}{lX}
    \toprule Tiêu chí & Mô tả \\
    \midrule
    {}[Tiêu chí] & [Mô tả] \\
    \bottomrule
  \end{tabularx}
\end{table}

\begin{equation}\label{eq:ten-cong-thuc}
  y = \sum_{i=1}^{n} w_i x_i.
\end{equation}
Hình~\ref{fig:ten-hinh}, Bảng~\ref{tab:ten-bang},
Công thức~\eqref{eq:ten-cong-thuc}.
```

Đặt chú thích hình bên dưới, chú thích bảng phía trên; đặt `\label`
sau `\caption`. Hình/bảng được giữ sau đoạn giới thiệu và chặn trước nội dung tiếp
theo bằng `flafter`/`FloatBarrier`. Bảng trong thân bài dùng 13 bp, kể
cả khi môi trường ngoài có `\small`; không dùng `\resizebox` để ép bảng.
Bảng rộng nên tách cột hoặc đặt trong `landscape` (gói `pdflscape`).
Bảng dài dùng `longtable` với `\endfirsthead` và
`\endhead` để lặp tiêu đề. Có thể viết sơ đồ TikZ ngay trong LaTeX;
không cần công cụ sinh sơ đồ từ nghiên cứu cũ. Có PDF minh họa riêng
từ `examples/formatting.tex` để xem định dạng trước khi điền nội dung.

## Skill vẽ sơ đồ CDM, LDM và PDM

Skill [cdm-ldm-pdm](.agents/skills/cdm-ldm-pdm/SKILL.md) đi kèm tại
`.agents/skills/cdm-ldm-pdm/`. Skill giữ phương pháp vẽ chân chim, bố cục
lưới, đường nối vuông góc và tối ưu từ `template-diagram-system`, có hướng
dẫn riêng cho từng lớp mô hình và kiểm đếm phần lược. Tài nguyên và bộ
vẽ nằm trong template; không cần thư mục nguồn hoặc dữ liệu dự án cũ.

Khi mở `reportTemplate/` hoặc bản sao của nó làm workspace, Codex có thể
phát hiện skill qua `.agents/skills/`; `AGENTS.md` cũng dẫn tới skill.
Nếu đang làm ở gốc repository cha, yêu cầu đọc đường dẫn đầy đủ:

> Dùng skill tại `reportTemplate/.agents/skills/cdm-ldm-pdm/SKILL.md`
> để vẽ CDM, LDM và PDM từ đặc tả của đề tài, xuất hình vào `assets/diagrams/`.

Cách chạy mẫu và cấu hình phông nằm trong `SKILL.md`. Các mẫu JSON là
dữ liệu thư viện giả định, chỉ phục vụ minh họa; không được đưa mặc định
vào nội dung báo cáo. SVG dùng cho Word, PNG 300 dpi dùng trực tiếp cho
LaTeX; nếu cần vector trong LaTeX, chuyển SVG sang PDF bằng công cụ có sẵn.

## Tài liệu tham khảo phân nhóm

Bốn tệp `bibliography/*.bib` ban đầu chỉ có comment. Thêm bản ghi
thật vào tệp phù hợp: `books.bib`, `articles.bib`, `legal.bib` hoặc
`references.bib`; trích dẫn bằng `\citep{khoa-tai-lieu}`. Dùng khóa
duy nhất, bảo vệ tên riêng bằng `{...}` trong tiêu đề khi cần.

Ví dụ cấu trúc để điền (không phải một nguồn đã xác minh):

```bibtex
@article{khoa-tai-lieu,
  author  = {[Họ, Tên]},
  title   = {{[Tên bài báo]}},
  journal = {[Tên tạp chí]},
  year    = {[Năm]},
  volume  = {[Tập]},
  pages   = {[Trang]},
  doi     = {[DOI]}
}
```

Thay tất cả trường mẫu bằng dữ liệu thật trước khi sử dụng. Danh mục chia nhóm theo thứ tự: văn bản pháp quy; sách, báo, tạp chí;
bài viết và tài liệu khác. Trong từng nhóm xếp theo tác giả (rồi năm/
tiêu đề), đánh số liên tục toàn danh mục. Số trích dẫn trong thân bài
vẫn ở ngoặc vuông; số không còn theo lần trích dẫn đầu tiên.
`legal.bib`, `books.bib`, `articles.bib`/`references.bib` xác định nhóm
ở cả hai backend; không bắt buộc tự điền `keywords`. Chỉ in nhóm có
nguồn được trích dẫn; kiểm tra thủ công thứ tự tên Việt khi hoàn thiện. `\nocite{khóa}` dùng khi
chủ ý đưa nguồn chưa trích dẫn vào danh mục. Bản ghi placeholder trong
`examples/*.bib` chỉ phục vụ kiểm tra định dạng và phân nhóm, không được
dùng trong báo cáo chính.

Kết quả kiểm tra và lần đồng bộ gần nhất được ghi tại
`VALIDATION.md`.

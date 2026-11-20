from pathlib import Path
from docx import Document
from docx.shared import Pt
root=Path(r'D:\NCKH')
d=Document(root/'Research Report.docx')
for t in d.tables:
    for c in t.rows[0].cells:
        for p in c.paragraphs: p.paragraph_format.keep_with_next=True
for p in d.paragraphs:
    if p.text.startswith('Nhờ quan hệ trên, việc đánh giá kiến trúc'):
        # Preserve comment anchors by keeping the paragraph and editing text nodes.
        texts=p._p.xpath('.//w:t')
        replacement='Mô hình ba tầng liên kết tenant phát sinh yêu cầu, dịch vụ xử lý, instance tiếp nhận và dữ liệu bị tác động. Quan hệ này được dùng để tổ chức bằng chứng kiểm chứng ở Chương 2.'
        if texts:
            texts[0].text=replacement
            for x in texts[1:]: x.text=''
    if p.text.startswith('Trong phạm vi demo, có thể áp dụng giới hạn lưu lượng'):
        texts=p._p.xpath('.//w:t')
        replacement='Trong phạm vi demo, có thể áp dụng giới hạn lưu lượng hoặc mức đồng thời theo tenant và theo dõi độ trễ, tỷ lệ lỗi riêng cho A và B. Việc đánh giá tập trung vào các cơ chế tài nguyên được hiện thực trong ứng dụng và tác động của chúng đến từng tenant.'
        if texts:
            texts[0].text=replacement
            for x in texts[1:]: x.text=''
d.save(root/'Research Report.docx')
print('Final table pagination and wording updated')

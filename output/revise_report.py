from pathlib import Path
import shutil, json, math, textwrap
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r'D:\NCKH')
QA = ROOT / 'output' / 'report-revision-qa'
QA.mkdir(parents=True, exist_ok=True)
BACKUP = ROOT / 'archived' / 'Research Report truoc chinh sua 2026-11-07.docx'
if not BACKUP.exists():
    shutil.copy2(ROOT / 'Research Report.docx', BACKUP)
src = Document(BACKUP)
doc = Document()
sec = doc.sections[0]
sec.page_width = Cm(21); sec.page_height = Cm(29.7)
sec.top_margin = Cm(2.54); sec.bottom_margin = Cm(2.54)
sec.left_margin = Cm(3.5); sec.right_margin = Cm(2.54)
sec.header_distance = Cm(1.2); sec.footer_distance = Cm(1.2)
for name in ['Normal','Title','Subtitle','Heading 1','Heading 2','Heading 3','Caption']:
    s = doc.styles[name]
    s.font.name = 'Times New Roman'
    s.font.color.rgb = RGBColor(0,0,0)
    s._element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'),'Times New Roman')
    s.font.size = Pt(13)
    for e in s._element.xpath('.//w:rFonts'):
        for a in list(e.attrib):
            if 'theme' in a.lower(): del e.attrib[a]
        for a in ['ascii','hAnsi','eastAsia','cs']: e.set(qn('w:'+a),'Times New Roman')
    for e in s._element.xpath('.//w:pBdr'):
        e.getparent().remove(e)
normal = doc.styles['Normal'].paragraph_format
normal.line_spacing = 1.3
normal.space_after = Pt(7)
normal.widow_control = True
normal.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
for name,size in [('Heading 1',15),('Heading 2',13),('Heading 3',13)]:
    s = doc.styles[name]; s.font.size = Pt(size); s.font.bold = True
    s.paragraph_format.space_before = Pt(13)
    s.paragraph_format.space_after = Pt(7)
    s.paragraph_format.keep_with_next = True
    s.paragraph_format.line_spacing = 1.15
    s.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
doc.styles['Heading 1'].paragraph_format.page_break_before = True
doc.styles['Title'].font.size = Pt(20)
doc.styles['Title'].font.bold = True
doc.styles['Title'].paragraph_format.space_after = Pt(14)
doc.styles['Title'].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
doc.styles['Caption'].font.size = Pt(11)
doc.styles['Caption'].font.italic = True
doc.styles['Caption'].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.styles['Caption'].paragraph_format.space_after = Pt(9)
doc.styles['Caption'].paragraph_format.line_spacing = 1.1
doc.core_properties.title = 'Kiến trúc đa thuê bao và thiết kế ứng dụng Kanban ở Cấp độ 3'
doc.core_properties.subject = 'Cơ sở lý thuyết và kiến trúc mục tiêu theo mô hình bốn cấp độ trưởng thành SaaS'
doc.core_properties.author = src.core_properties.author or ''

def p(text, comment=None):
    r = doc.add_paragraph(text)
    if comment:
        doc.add_comment(r.runs, comment, author='Biên tập', initials='BT')
    return r
def h(text, level=2): return doc.add_paragraph(text, f'Heading {level}')
def original(i): return p(src.paragraphs[i].text)
def table(caption, heads, rows, widths):
    cp = doc.add_paragraph(caption,'Caption'); cp.paragraph_format.keep_with_next=True
    t=doc.add_table(rows=1, cols=len(heads)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
    for c,w in zip(t.columns,widths): c.width=Cm(w)
    for c,txt,w in zip(t.rows[0].cells,heads,widths): c.text=txt; c.width=Cm(w)
    for row in rows:
        cells=t.add_row().cells
        for c,txt,w in zip(cells,row,widths): c.text=txt; c.width=Cm(w)
    borders=OxmlElement('w:tblBorders')
    for side in ['top','left','bottom','right','insideH','insideV']:
        e=OxmlElement('w:'+side); e.set(qn('w:val'),'single'); e.set(qn('w:sz'),'5'); e.set(qn('w:color'),'D9D9D9'); borders.append(e)
    t._tbl.tblPr.append(borders)
    for ri,row in enumerate(t.rows):
        trpr=row._tr.get_or_add_trPr()
        if ri==0: trpr.append(OxmlElement('w:tblHeader'))
        trpr.append(OxmlElement('w:cantSplit'))
        for ci,c in enumerate(row.cells):
            c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            tcpr=c._tc.get_or_add_tcPr()
            shd=OxmlElement('w:shd'); shd.set(qn('w:fill'),'E6EBEF' if ri==0 else 'FFFFFF'); tcpr.append(shd)
            mar=OxmlElement('w:tcMar')
            for side in ['top','bottom','left','right']:
                e=OxmlElement('w:'+side); e.set(qn('w:w'),'85'); e.set(qn('w:type'),'dxa'); mar.append(e)
            tcpr.append(mar)
            for pp in c.paragraphs:
                pp.paragraph_format.line_spacing=1.12
                pp.paragraph_format.space_after=Pt(3)
                pp.paragraph_format.space_before=Pt(2)
                if ri==0: pp.paragraph_format.keep_with_next=True
                pp.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.CENTER if ci==0 else WD_ALIGN_PARAGRAPH.LEFT
                for rr in pp.runs: rr.font.size=Pt(11); rr.font.bold=(ri==0)
    doc.add_paragraph().paragraph_format.space_after=Pt(0)
    return t

FONT = r'C:\Windows\Fonts\arial.ttf'
BOLD = r'C:\Windows\Fonts\arialbd.ttf'
def f(n,b=False): return ImageFont.truetype(BOLD if b else FONT,n)
def wrapped(draw,txt,box,size=30,bold=False):
    x0,y0,x1,y1=box; font=f(size,bold)
    lines=[]
    for para in txt.split('\n'):
        words=para.split(); line=''
        for word in words:
            candidate=(line+' '+word).strip()
            if draw.textlength(candidate,font=font)>x1-x0-30 and line:
                lines.append(line); line=word
            else: line=candidate
        lines.append(line)
    lh=int(size*1.3); y=(y0+y1-lh*len(lines))/2
    for line in lines:
        draw.text(((x0+x1-draw.textlength(line,font=font))/2,y),line,font=font,fill='#111111'); y+=lh
def arrow(draw,a,b,color='#303F4B',width=5):
    draw.line([a,b],fill=color,width=width)
    angle=math.atan2(b[1]-a[1],b[0]-a[0]); length=18
    pts=[b,(b[0]-length*math.cos(angle-.45),b[1]-length*math.sin(angle-.45)),(b[0]-length*math.cos(angle+.45),b[1]-length*math.sin(angle+.45))]
    draw.polygon(pts,fill=color)
def box(draw,xy,txt,fill='#F0F4F7',size=30,bold=False):
    draw.rounded_rectangle(xy,radius=12,fill=fill,outline='#778896',width=3); wrapped(draw,txt,xy,size,bold)
def figure(path,caption,width=14.7):
    pp=doc.add_paragraph(); pp.alignment=WD_ALIGN_PARAGRAPH.CENTER
    pp.paragraph_format.keep_with_next=True
    pp.add_run().add_picture(str(path),width=Cm(width))
    doc.add_paragraph(caption,'Caption')

# Three compact diagrams, replacing the old nine-layer figures.
im=Image.new('RGB',(1600,1000),'white'); dr=ImageDraw.Draw(im)
box(dr,(75,55,1525,255),'TẦNG 1  NGƯỜI THUÊ\nTenant A: tổ chức A và các user A   |   Tenant B: tổ chức B và các user B',size=34,bold=True)
arrow(dr,(800,265),(800,350))
box(dr,(75,365,1525,610),'TẦNG 2  NHÀ CUNG CẤP DỊCH VỤ\nXác thực và quyền thành viên → ngữ cảnh tenant\nNghiệp vụ Kanban + cấu hình và metadata theo tenant',size=34,bold=True)
arrow(dr,(800,620),(800,705))
box(dr,(75,720,1525,950),'TẦNG 3  CÁC INSTANCE VÀ HẠ TẦNG\nMột App/Web Server instance phục vụ A và B\nMột Database Server dùng chung: các bảng có tenant_id',size=34,bold=True)
im.save(QA/'three-layers.png')

im=Image.new('RGB',(1600,1050),'white'); dr=ImageDraw.Draw(im)
for i,(title,txt) in enumerate([
    ('CẤP ĐỘ 1','Mã tùy biến riêng\nApp riêng · DB riêng'),
    ('CẤP ĐỘ 2','Mã nguồn chung\nFile cấu hình trước khi chạy\nApp riêng · DB riêng'),
    ('CẤP ĐỘ 3','Mã nguồn chung\nMetadata lúc chạy\nApp chung · DB chung\nPhân tách bằng Tenant ID'),
    ('CẤP ĐỘ 4','Kế thừa Cấp độ 3\nCân bằng tải · nhiều App\nMở rộng ngang\nPhân bố dữ liệu theo nhu cầu')]):
    y=35+i*250
    box(dr,(65,y,430,y+190),title,fill='#E6EBEF',size=36,bold=True)
    box(dr,(465,y,1535,y+190),txt,size=32)
    if i<3: arrow(dr,(245,y+198),(245,y+245))
im.save(QA/'maturity.png')

im=Image.new('RGB',(1700,1140),'white'); dr=ImageDraw.Draw(im)
wrapped(dr,'Chi phí sở hữu của nhà cung cấp trong cùng một kỳ đánh giá',(100,20,1660,90),34,True)
left,bottom,right,top=200,900,1510,180
arrow(dr,(left,bottom),(right+50,bottom)); arrow(dr,(left,bottom),(left,top-35))
dr.text((225,125),'Chi phí sở hữu (TCO)',font=f(34,True),fill='black')
dr.text((left,950),'Số lượng tổ chức thuê dịch vụ (tenant)',font=f(34,True),fill='black')
def point(n,c): return (int(left+n*(right-left)),int(bottom-c*630))
dr.line([point(0,.10),point(1,1.0)],fill='#285D85',width=7)
dr.line([point(0,.40),point(1,.64)],fill='#A24B24',width=7)
cross=.30/.66; xy=point(cross,.1+.9*cross)
for y in range(int(xy[1])+15,bottom,28): dr.line((xy[0],y,xy[0],min(y+14,bottom)),fill='#666666',width=3)
dr.ellipse((xy[0]-9,xy[1]-9,xy[0]+9,xy[1]+9),fill='black')
dr.text((xy[0]-16,bottom+12),'n*',font=f(30),fill='black')
dr.text((1120,210),'Single-tenant',font=f(34,True),fill='#285D85')
dr.text((1110,460),'Multi-tenant',font=f(34,True),fill='#A24B24')
wrapped(dr,'Quy mô nhỏ\nSingle-tenant có thể rẻ hơn',(245,365,710,505),30)
wrapped(dr,'Sau điểm giao\nMulti-tenant tiết kiệm hơn',(970,650,1485,840),30)
wrapped(dr,'Minh họa quan hệ chi phí; không phải dữ liệu thực nghiệm hoặc báo giá',(180,1020,1600,1110),28)
im.save(QA/'tco.png')

doc.add_paragraph('Kiến trúc đa thuê bao và thiết kế ứng dụng Kanban ở Cấp độ 3','Title')
p('Tóm tắt').runs[0].bold=True
p('Đề tài hướng tới thiết kế, xây dựng và demo một ứng dụng quản lý công việc Kanban đa thuê bao đạt Cấp độ 3 trong mô hình trưởng thành SaaS của Chong và Carraro. Các tổ chức sử dụng chung mã nguồn, một instance ứng dụng và cơ sở dữ liệu; dữ liệu được phân tách logic bằng Tenant ID, còn khác biệt về giao diện và nghiệp vụ được xử lý lúc chạy thông qua metadata. Báo cáo dùng mô hình bốn cấp độ làm khung phân tích, từ đó xác định kiến trúc mục tiêu, cơ chế cô lập và tiêu chí kiểm chứng demo. Cấp độ 4 được đặt ở hướng phát triển với cân bằng tải, mở rộng ngang và phân bố dữ liệu theo nhu cầu.')
p('Phạm vi báo cáo').runs[0].bold=True
p('Hai chương trình bày cơ sở lý thuyết và kiến trúc phục vụ mục tiêu Cấp độ 3. Chương 1 làm rõ khái niệm, mô hình trưởng thành và cơ sở kinh tế. Chương 2 chuyển các tiêu chí đó thành thiết kế và kế hoạch kiểm chứng cho ứng dụng Kanban. Việc xác nhận ứng dụng đạt Cấp độ 3 cần dựa trên mã nguồn, cấu hình triển khai và kết quả chạy thử tương ứng với từng tiêu chí.')
p('Từ khóa: SaaS; multi-tenant; tenant; runtime metadata; Tenant ID; mô hình trưởng thành.')

toc_heading=doc.add_paragraph('Mục lục','TOC Heading')
toc_heading.paragraph_format.page_break_before=True
toc_heading.paragraph_format.keep_with_next=True
toc_heading.runs[0].font.name='Times New Roman'
toc_heading.runs[0].font.size=Pt(15)
toc_heading.runs[0].bold=True
toc_heading.runs[0].font.color.rgb=RGBColor(0,0,0)
toc=doc.add_paragraph()
field=OxmlElement('w:fldSimple'); field.set(qn('w:instr'),'TOC \\o "1-2" \\h \\z \\u')
run=OxmlElement('w:r'); text=OxmlElement('w:t'); text.text='Mục lục được cập nhật khi mở bằng Microsoft Word.'; run.append(text); field.append(run); toc._p.append(field)

h('CHƯƠNG 1  CƠ SỞ LÝ THUYẾT VÀ MÔ HÌNH TRƯỞNG THÀNH',1)
p('Chương này xác lập những khái niệm cần thiết để trả lời ba câu hỏi: hệ thống phục vụ ai, tài nguyên nào được dùng chung và điều kiện nào cho phép định vị demo ở Cấp độ 3. Mô hình bốn cấp độ được sử dụng xuyên suốt để liên kết cơ sở lý thuyết với lựa chọn kiến trúc và tiêu chí đánh giá.')
h('1.1 SaaS và tiến trình chia sẻ tài nguyên')
h('1.1.1 Phần mềm dưới dạng dịch vụ',3)
original(6)
original(7)
p('Nhà cung cấp duy trì việc phát hành, cập nhật và hỗ trợ ứng dụng; tổ chức khách hàng quản lý người dùng và các cấu hình được dịch vụ cho phép. Vì vậy, cùng một sản phẩm SaaS cần đáp ứng nhu cầu riêng của nhiều tổ chức mà vẫn kiểm soát được chi phí vận hành. Thu phí định kỳ là hình thức kinh doanh phổ biến, nhưng riêng phương thức thanh toán không quyết định cách tổ chức kiến trúc.')
p('SaaS mô tả cách cung cấp phần mềm; multi-tenancy mô tả cách nhiều thuê bao sử dụng chung tài nguyên. Một dịch vụ SaaS vẫn có thể bố trí ứng dụng riêng cho từng khách hàng. Ngược lại, gọi một hệ thống là đa thuê bao cần chỉ rõ tài nguyên dùng chung và cơ chế giữ riêng dữ liệu, cấu hình, quyền truy cập của từng tổ chức.')
h('1.1.2 Từ chia sẻ máy tính đến chia sẻ ứng dụng',3)
original(12)
original(13)
original(14)
p('Ở cách cài đặt tại chỗ (on-premise), mỗi tổ chức tự quản lý môi trường của mình. Mô hình ASP chuyển trách nhiệm vận hành ứng dụng sang nhà cung cấp, nhưng các bản ứng dụng dành riêng vẫn có thể tồn tại. Các ứng dụng web sau đó cho thấy khả năng phục vụ nhiều người dùng trên cùng nền tảng; SaaS đa thuê bao bổ sung việc quản trị dữ liệu và cấu hình theo từng tổ chức. Đây là những hướng phát triển có liên hệ và có thể cùng tồn tại, không phải một chuỗi trong đó mô hình sau thay thế hoàn toàn mô hình trước.')
original(16)
original(17)
p('Trong phạm vi đề tài, ý nghĩa của tiến trình này là chuyển đơn vị quản lý từ tài khoản cá nhân hoặc bản cài đặt riêng sang tổ chức thuê dịch vụ trên một ứng dụng chung. Mô hình trưởng thành ở Mục 1.4 mô tả cụ thể sự thay đổi đó qua mã nguồn, cách cấu hình, instance ứng dụng và dữ liệu.')
h('1.2 Các khái niệm nền tảng')
h('1.2.1 Tenant và user',3)
p('Tenant (thuê bao) trong đề tài là một tổ chức hoặc doanh nghiệp đăng ký sử dụng dịch vụ và có một định danh riêng. Tổ chức có phạm vi dữ liệu, danh sách thành viên, quyền quản trị và cấu hình riêng về giao diện hoặc nghiệp vụ trong giới hạn nền tảng hỗ trợ. Với ứng dụng Kanban, một workspace đại diện cho một tenant; các bảng và thẻ công việc của workspace thuộc phạm vi tenant đó.')
p('User (người dùng) là cá nhân truy cập hệ thống. Quyền của user được xác định trong quan hệ thành viên với tenant: cùng một cá nhân có thể là quản trị viên ở tổ chức A nhưng chỉ là thành viên ở tổ chức B. Do đó, user_id trả lời câu hỏi “ai đang thao tác”, còn tenant_id trả lời câu hỏi “thao tác thuộc tổ chức nào”. Hai định danh không được dùng thay thế cho nhau.')
p('Ví dụ, công ty A có 20 nhân viên và công ty B có 15 nhân viên. Hệ thống phục vụ hai tenant và 35 tài khoản người dùng nếu các tài khoản không trùng nhau. Việc thêm nhân viên cho công ty A làm tăng số user của A; việc thêm công ty C tạo một tenant mới với cấu hình và dữ liệu độc lập. Quy mô trên đồ thị TCO của báo cáo được tính bằng số tenant, không phải số tài khoản.')
p('Tenant ID là khóa định danh tổ chức trong hệ thống. Trong mô hình bảng dùng chung, các bản ghi thuộc tenant mang khóa này để phục vụ kiểm soát truy cập. Tuy nhiên, chỉ thêm cột tenant_id chưa tạo ra cô lập: ứng dụng phải xác thực quan hệ thành viên và thực thi giới hạn đọc, ghi theo tenant hiện hành.')
h('1.2.2 Service và instance',3)
original(81)
p('Instance là một bản thành phần phần mềm đang chạy và được cấp tài nguyên để xử lý yêu cầu. Ví dụ, một tiến trình Web Server hoặc Application Server chạy backend Kanban là một instance ứng dụng; một tiến trình Database Server như PostgreSQL là một instance hệ quản trị cơ sở dữ liệu. Cần gọi rõ loại instance đang xét thay vì chỉ dùng cụm “thực thể vận hành”.')
p('Một Web Server có thể xử lý yêu cầu của cả tenant A và B. Hai tiến trình backend chạy cùng một bộ mã nguồn vẫn là hai instance ứng dụng khác nhau. Tương tự, một Database Server có thể quản lý nhiều database; vì vậy “dùng chung Database Server” chưa đủ để kết luận các tenant dùng chung một database hoặc cùng các bảng dữ liệu.')
p('Trong kiến trúc mục tiêu của demo, “một instance” được hiểu là một instance backend thực thi nghiệp vụ Kanban cho đồng thời nhiều tenant. Trình duyệt của từng user không phải là instance backend riêng của tenant. Bằng chứng triển khai cần chỉ rõ tiến trình hoặc container backend và nguồn dữ liệu mà các yêu cầu thực sự sử dụng.')
h('1.2.3 Định nghĩa đa thuê bao trong phạm vi đề tài',3)
p('Kabbedijk và cộng sự (2015) xem đa thuê bao là thuộc tính của hệ thống trong đó nhiều khách hàng chia sẻ trong suốt tài nguyên như dịch vụ, ứng dụng, dữ liệu hoặc phần cứng nhằm giảm chi phí, đồng thời có thể cấu hình theo nhu cầu riêng. Định nghĩa này giúp xác định cả phần dùng chung và phạm vi riêng của mỗi thuê bao, thay vì đồng nhất đa thuê bao với việc có nhiều tài khoản.')
original(67)
original(68)
original(70)
p('Đề tài cụ thể hóa định nghĩa trên bằng mục tiêu Cấp độ 3: nhiều tổ chức dùng chung ứng dụng và database, khác biệt được biểu diễn bằng metadata theo tenant, dữ liệu và quyền truy cập được kiểm soát qua ngữ cảnh thuê bao. Khả năng tùy biến có giới hạn rõ ràng; không yêu cầu tenant tự sửa mã nguồn hoặc thực thi mã tùy ý trên hệ thống.')
h('1.3 Phân biệt multi user và multi tenant')
p('Multi-user là khả năng cho nhiều cá nhân sử dụng phần mềm với danh tính, phiên làm việc và quyền hạn tương ứng. Phần mềm nội bộ của một công ty có hàng trăm tài khoản vẫn có thể chỉ phục vụ một tenant. Multi-tenant bổ sung nhiều tổ chức khách hàng, mỗi tổ chức có phạm vi dữ liệu, quản trị thành viên và cấu hình riêng. Một ứng dụng SaaS có thể đồng thời là multi-user và multi-tenant.',comment='Sửa lỗi nội dung ở bản cũ: mục 4.1.3 mang tên Multi-Tenant nhưng chứa định nghĩa Multi-User. Đồng thời bỏ khẳng định quá rộng rằng mọi ứng dụng multi-user đều có quản trị phẳng hoặc giao diện cố định.')
table('Bảng 1.1 Đối chiếu các khái niệm dễ nhầm lẫn', ['Khái niệm','Đơn vị đang xét','Ý nghĩa đối với đề tài'],[
    ['Single-tenant','Một tổ chức tại tầng đang xét','Ứng dụng hoặc dữ liệu được dành riêng cho một tenant.'],
    ['Multi-user','Nhiều cá nhân','Nhiều tài khoản cùng sử dụng; chưa đủ chứng minh có nhiều tổ chức độc lập.'],
    ['Multi-instance','Nhiều bản ứng dụng đang chạy','Mô tả số bản chạy; mỗi bản có thể phục vụ một hoặc nhiều tenant.'],
    ['Multi-tenant','Nhiều tổ chức khách hàng','Quản lý dữ liệu, thành viên và cấu hình theo từng tenant trên tài nguyên dùng chung.'],
], [3,4,7.9])
p('Multi-instance không phải một cấp độ trưởng thành riêng. Ở Cấp độ 2, mỗi tenant có instance của mình; ở Cấp độ 4, một nhóm instance có thể cùng phục vụ nhiều tenant. Vì vậy, số bản chạy cần được xem cùng quan hệ tenant–instance và cơ chế tổ chức dữ liệu.')
p('Ví dụ đối chiếu: hệ thống Kanban nội bộ chỉ có công ty A, dù nhiều nhân viên cùng đăng nhập, chứng minh multi-user. Khi công ty B được khởi tạo, B tự quản lý thành viên và giao diện, dữ liệu B không xuất hiện trong phiên A, trong khi cả hai dùng chung backend và database, hệ thống mới thể hiện các thuộc tính đa thuê bao theo mục tiêu của đề tài.')
h('1.4 Bốn cấp độ trưởng thành kiến trúc SaaS')
p('Chong và Carraro (2006) đề xuất bốn cấp độ trưởng thành dựa trên khả năng cấu hình, hiệu quả phục vụ đa thuê bao và khả năng mở rộng. Báo cáo dùng mô hình này làm trục phân tích; phạm vi dùng chung database và cách biểu diễn metadata được đặc tả rõ cho demo để có thể kiểm chứng. Đây là khung định vị kiến trúc, không phải một chứng nhận độc lập về bảo mật hoặc hiệu năng.')
h('1.4.1 Cấp độ 1 mã tùy biến và môi trường riêng',3)
p('Mỗi khách hàng sử dụng một bản ứng dụng được tùy biến riêng, thường đi kèm nhánh mã nguồn, instance ứng dụng và database riêng. Việc sửa nghiệp vụ của A có thể tạo ra phiên bản khác với B. Nhà cung cấp phải quản lý các biến thể, kiểm thử và nâng cấp trên những môi trường tương ứng.')
p('Ưu điểm là dễ đáp ứng yêu cầu rất riêng ở quy mô nhỏ; hạn chế là chi phí duy trì tăng khi các phiên bản khác biệt tích lũy. Khả năng có nhiều khách hàng sử dụng các bản cài đặt này chưa chứng minh nhiều tenant cùng được phục vụ bởi một instance. Đề tài không chọn cách duy trì mã nguồn riêng theo tổ chức.')
h('1.4.2 Cấp độ 2 mã nguồn chung và cấu hình trước khi chạy',3)
p('Cấp độ 2 chuẩn hóa một codebase dùng chung. Theo phạm vi đối chiếu của báo cáo, khác biệt của từng khách hàng được đặt trong file cấu hình trước khi chạy, chẳng hạn thông tin nhận diện giao diện, các chức năng bật tắt và thông số kết nối. Mỗi tenant vẫn có instance ứng dụng và database riêng; thay vì sửa mã nguồn cho A và B, nhà cung cấp triển khai cùng mã với các file cấu hình khác nhau.')
p('Ví dụ, App A đọc file cấu hình A và kết nối DB A, còn App B đọc file cấu hình B và kết nối DB B. Cùng mã nguồn giúp giảm phân kỳ phiên bản nhưng không loại bỏ việc vận hành nhiều bản ứng dụng. Thay đổi cấu hình có thể đòi hỏi khởi động lại hoặc triển khai lại tùy cơ chế hiện thực; điểm phân biệt ở đây là cấu hình gắn với từng bản chạy riêng trước khi phục vụ.')
h('1.4.3 Cấp độ 3 ứng dụng chung và metadata lúc chạy',3)
p('Cấp độ 3 là mục tiêu của đề tài. Một instance backend phục vụ nhiều tenant trên cùng mã nguồn. Mỗi yêu cầu mang một ngữ cảnh tenant đã được xác thực; ứng dụng dựa vào ngữ cảnh đó để áp dụng metadata và kiểm soát dữ liệu. Trong phương án được chọn, các tenant cùng dùng một database và các bảng nghiệp vụ có tenant_id để phân tách logic.')
p('Metadata mô tả những điểm biến đổi được nền tảng cho phép, chẳng hạn tên workspace, màu giao diện, chức năng khả dụng hoặc giới hạn công việc đang làm. Ứng dụng đọc và diễn giải metadata theo tenant tại thời điểm xử lý. Cập nhật cấu hình A làm thay đổi hành vi được hỗ trợ cho A trong khi B giữ cấu hình của mình, không cần tạo nhánh mã hoặc instance riêng.')
p('Ví dụ, A bật giới hạn số thẻ đang thực hiện, B không bật; cùng một mã xử lý Kanban đọc cấu hình của tenant hiện hành và áp dụng quy tắc tương ứng. Sự khác biệt này phải được thực thi ở backend. Chỉ đổi màu trên trình duyệt hoặc ẩn một nút chức năng chưa chứng minh quyền sử dụng tính năng đã được kiểm soát.')
p('Ba thuộc tính cần kiểm chứng đồng thời là: mã nguồn chung với tùy biến runtime qua metadata; một instance phục vụ đồng thời nhiều tenant; database dùng chung có dữ liệu gắn Tenant ID và cơ chế cô lập ngữ cảnh. Một hình vẽ hoặc cột tenant_id đơn lẻ không đủ để kết luận đã đạt Cấp độ 3.')
h('1.4.4 Cấp độ 4 mở rộng ngang',3)
p('Cấp độ 4 kế thừa khả năng cấu hình và nhận biết tenant của Cấp độ 3, đồng thời tổ chức một tập hợp instance ứng dụng để mở rộng năng lực phục vụ. Yêu cầu được phân phối qua bộ cân bằng tải; việc bổ sung instance không làm thay đổi cách nhận diện tenant hoặc quyền truy cập. Ứng dụng cần quản lý trạng thái và dữ liệu sao cho một tenant có thể được xử lý đúng khi yêu cầu đi qua các instance khác nhau.')
p('Hướng phát triển của đề tài gồm nhiều instance backend hoặc container/pod sau bộ cân bằng tải, cùng phương án mở rộng dữ liệu như phân vùng, bản sao đọc hoặc cơ sở dữ liệu phân tán khi nhu cầu thực tế đòi hỏi. Pod và database phân tán là lựa chọn hiện thực, không phải tên gọi bắt buộc của mô hình gốc. Riêng việc đóng gói ứng dụng trong container không chứng minh đã đạt Cấp độ 4.')
table('Bảng 1.2 So sánh bốn cấp độ trong phạm vi báo cáo',['Cấp độ','Mã và cấu hình','Ứng dụng và dữ liệu','Vai trò'],[
    ['1','Mã tùy biến theo khách hàng','App riêng; DB riêng','Bối cảnh xuất phát'],
    ['2','Codebase chung; file cấu hình trước khi chạy','App riêng; DB riêng theo tenant','Mốc đối chiếu'],
    ['3','Codebase chung; metadata theo tenant lúc chạy','Một App chung; DB và bảng chung có tenant_id','Mục tiêu demo'],
    ['4','Kế thừa cấu hình động của Cấp độ 3','Nhiều App qua cân bằng tải; mở rộng dữ liệu theo tải','Hướng phát triển'],
],[1.6,4.5,5.4,3.4])
p('Sự khác nhau quyết định giữa Cấp độ 2 và 3 nằm ở quan hệ tenant–instance và thời điểm áp dụng biến thể. Cấp độ 2 gắn cấu hình của từng tenant vào bản chạy riêng. Cấp độ 3 chọn metadata theo ngữ cảnh trong cùng bản chạy đang phục vụ nhiều tenant. Khả năng có một repository mã nguồn hoặc một file cấu hình chung không tự phân biệt được hai cấp độ này.',comment='Bảng đã chuẩn hóa theo yêu cầu: Cấp độ 2 dùng cấu hình trước khi chạy và App/DB riêng; Cấp độ 3 dùng metadata lúc chạy và App/DB chung. Mô hình database ở đây là phương án mục tiêu của đề tài, tránh biến mọi lựa chọn hiện thực thành điều kiện phổ quát của mô hình gốc.')
h('1.5 Mô hình khái niệm ba tầng')
p('Mô hình ba tầng trong báo cáo thể hiện quan hệ giữa người thuê, nhà cung cấp và các thành phần đang chạy. Đây là cách nhìn theo vai trò cung ứng dịch vụ, giúp giải thích tenant sử dụng gì và tài nguyên nào được chia sẻ. Nó không thay thế cách chia giao diện, xử lý nghiệp vụ và truy cập dữ liệu khi thiết kế bên trong ứng dụng.')
figure(QA/'three-layers.png','Hình 1.1 Mô hình ba tầng của kiến trúc đa thuê bao mục tiêu')
p('Tầng người thuê gồm các tổ chức A, B và các user thuộc mỗi tổ chức. Quản trị viên tenant cấu hình những điểm biến đổi được nền tảng cho phép; user thao tác theo quyền thành viên. Tenant không trực tiếp quyết định việc cấp phát CPU hoặc sửa cấu hình database của nhà cung cấp.')
p('Tầng nhà cung cấp dịch vụ gồm chức năng Kanban, quản lý tenant, thành viên và cấu hình. Tầng này xác thực yêu cầu, xác định tenant hiện hành, áp dụng metadata và kiểm soát quyền trước khi thực hiện nghiệp vụ. Cùng một dịch vụ có thể cung cấp hành vi phù hợp cho A và B bằng việc chọn dữ liệu và cấu hình theo ngữ cảnh.')
p('Tầng các instance và hạ tầng thể hiện những thành phần thực thi, ví dụ Web/Application Server và Database Server. Ở Cấp độ 2, A và B được bố trí vào các instance ứng dụng và DB riêng. Ở Cấp độ 3, cả hai đi vào cùng instance backend và database; ranh giới được thực thi bằng định danh tenant, quyền và chính sách dữ liệu. Khi hướng đến Cấp độ 4, tầng này mở rộng thành tập instance phối hợp qua cân bằng tải.')
p('Nhờ quan hệ trên, việc đánh giá kiến trúc không cần bổ sung một hệ phân cấp cô lập khác. Với mỗi chức năng demo chỉ cần truy nguyên được tenant phát sinh yêu cầu, dịch vụ xử lý, instance tiếp nhận và dữ liệu bị tác động. Đây cũng là cách tổ chức bằng chứng kiểm chứng ở Chương 2.',comment='Thay mô hình ngăn xếp 9 tầng, phổ 5 mức cô lập và các sơ đồ phụ bằng mô hình ba tầng. Các phần so sánh chỉ giữ những đánh đổi phục vụ trực tiếp mục tiêu Cấp độ 3.')
h('1.6 Tổng chi phí sở hữu từ góc nhìn nhà cung cấp')
h('1.6.1 Phạm vi và các trục của đồ thị',3)
p('Tổng chi phí sở hữu (Total Cost of Ownership, TCO) ở đây là tổng chi phí mà nhà cung cấp dịch vụ phải bỏ ra để xây dựng, triển khai và vận hành hệ thống trong một kỳ đánh giá xác định. Các khoản cần xét gồm phát triển nền tảng, hạ tầng, cấp phát, bảo trì, giám sát, sao lưu và xử lý sự cố. Đây không phải tiền thuê bao mà khách hàng thanh toán hoặc TCO riêng của người đi thuê.')
p('Trục hoành biểu diễn quy mô khách hàng, tính bằng số tổ chức thuê dịch vụ (số tenant). Trục tung biểu diễn tổng chi phí của nhà cung cấp trong cùng kỳ đánh giá và cùng đơn vị tiền tệ hoặc chi phí quy đổi. So sánh phải giữ nhất quán yêu cầu chức năng, mức dịch vụ và tải trung bình mỗi tenant; nếu chỉ một mô hình phải gánh tải cao hơn thì hai đường không còn phản ánh cùng bài toán.')
figure(QA/'tco.png','Hình 1.2 Chi phí sở hữu của nhà cung cấp theo số tenant')
p('Hình 1.2 là đồ thị khái niệm. Độ dốc và vị trí điểm giao minh họa cơ chế kinh tế, không biểu diễn một mức tiết kiệm hay số lượng tenant đã đo được. Đồ thị dùng tổng chi phí, do đó đường multi-tenant vẫn tăng khi quy mô tăng; không thể suy ra rằng thêm tenant mới có chi phí bằng không.')
h('1.6.2 Chi phí khởi đầu và chi phí tăng thêm',3)
p('Ở quy mô nhỏ, triển khai single-tenant có thể đơn giản hơn vì ứng dụng chưa cần đầy đủ cơ chế phân giải tenant, cô lập bảng dùng chung và quản trị metadata theo tổ chức. Trong giả thiết của đồ thị, chi phí khởi đầu của single-tenant vì vậy thấp hơn. Multi-tenant phải đầu tư sớm cho những cơ chế này, nên tổng chi phí ban đầu có thể cao hơn dù chỉ phục vụ ít khách hàng.')
p('Khi quy mô tăng, single-tenant phải bổ sung và duy trì nhiều môi trường: instance, database, bản sao lưu và quy trình cập nhật tương ứng. Multi-tenant có thể tiếp nhận tenant mới bằng thêm định danh, thành viên, metadata và dữ liệu khởi tạo trên năng lực còn sẵn có. Nhiều tổ chức chia sẻ tài nguyên và công cụ vận hành, làm giảm chi phí tăng thêm bình quân trong điều kiện tải và chất lượng dịch vụ được kiểm soát.')
original(22)
p('Điểm giao n* là quy mô tại đó hai phương án có TCO bằng nhau theo các giả thiết đang xét. Trước n*, lợi thế triển khai ban đầu của single-tenant có thể lớn hơn phần tiết kiệm do chia sẻ. Sau n*, chi phí khởi đầu cao hơn của multi-tenant được bù bởi chi phí tăng thêm thấp hơn, nên tổng chi phí của nó thấp hơn single-tenant. n* là ngưỡng cân bằng chi phí giữa hai phương án, không phải điểm hòa vốn doanh thu của dịch vụ.')
h('1.6.3 Giới hạn của kết luận kinh tế',3)
original(24)
original(25)
p('Quan hệ hai đường có điểm giao chỉ đúng khi chi phí khởi đầu và chi phí tăng thêm có sự đánh đổi như đã mô tả. Nếu yêu cầu cô lập, tải hoặc vận hành thay đổi, điểm giao sẽ thay đổi và có thể không xuất hiện trong phạm vi khảo sát. Báo cáo vì vậy dùng đồ thị để giải thích động lực chuyển từ nhiều instance riêng sang Cấp độ 3, không khẳng định một kiến trúc luôn rẻ hơn ở mọi quy mô.',comment='Đồ thị mới nêu rõ hai trục, góc nhìn nhà cung cấp và điều kiện hình thành điểm giao. Không dùng số liệu giả hoặc trình bày mô hình chi phí khái niệm như kết quả thực nghiệm.')
p('Để lượng hóa TCO sau này, cần ghi rõ thời hạn tính chi phí, cấu hình tài nguyên, số tenant, tải từng tenant và công sức vận hành. Các chi phí dùng chung cần phân bổ theo một quy tắc nhất quán. Chỉ khi có dữ liệu đó mới có thể xác định điểm giao thực tế hoặc tỷ lệ tiết kiệm; phép đo độ trễ hay số request của demo không đủ để suy ra TCO.')
h('1.7 Tổng kết chương')
p('Mô hình bốn cấp độ cho thấy hướng chuyển từ mã và môi trường riêng sang nền tảng chung có cấu hình theo tenant. Đề tài chọn Cấp độ 3: chung mã nguồn, một instance backend, database dùng chung với Tenant ID và metadata được áp dụng lúc chạy. Tenant là tổ chức có quản trị riêng, user là cá nhân trong tổ chức; số user và số instance không tự quyết định tính đa thuê bao. Chương 2 cụ thể hóa các điều kiện này thành kiến trúc Kanban và kế hoạch kiểm chứng.')

h('CHƯƠNG 2  KIẾN TRÚC MỤC TIÊU VÀ KIỂM CHỨNG CẤP ĐỘ 3',1)
p('Kiến trúc mục tiêu của ứng dụng Kanban được lựa chọn để thể hiện rõ các thuộc tính Cấp độ 3 với số thành phần cần thiết. Phân tích tập trung vào nhận diện tenant, dùng chung ứng dụng và database, tùy biến runtime, cùng việc duy trì cô lập khi nhiều tenant hoạt động. Các cơ chế mở rộng nhiều instance được đặt ở hướng phát triển Cấp độ 4.')
h('2.1 Mục tiêu và phạm vi demo')
p('Mục tiêu của đề tài là thiết kế, xây dựng và demo thành công ứng dụng Kanban đa thuê bao đạt Cấp độ 3. Một instance backend phải phục vụ đồng thời tối thiểu hai tổ chức với các user tương ứng. Các tổ chức có dữ liệu và cấu hình khác nhau, nhưng cùng sử dụng một bộ mã nguồn và một database nghiệp vụ.')
p('Nghiệp vụ tối thiểu gồm tạo workspace, quản lý thành viên, tạo bảng Kanban, cột và thẻ công việc, cập nhật trạng thái thẻ. Workspace tương ứng một tenant. Các thao tác nghiệp vụ cung cấp tình huống để quan sát ranh giới tổ chức; mục tiêu đánh giá chính là kiến trúc phục vụ nhiều tenant và tính đúng đắn khi dùng chung tài nguyên.')
p('Tùy biến runtime cần có ít nhất một thuộc tính giao diện và một quy tắc nghiệp vụ có ý nghĩa, ví dụ nhận diện workspace và giới hạn thẻ đang thực hiện. Những lựa chọn này phải được biểu diễn bằng metadata theo tenant và có thể thay đổi trong khi backend đang chạy. Phạm vi cụ thể phải khớp với chức năng đã hiện thực trong mã nguồn demo.')
table('Bảng 2.1 Yêu cầu kiến trúc của demo',['Mã','Yêu cầu','Điều kiện kiểm chứng'],[
    ['R1','Một codebase cho các tenant','Cùng phiên bản backend và cơ chế xử lý; không có bản build riêng cho A hoặc B.'],
    ['R2','Một instance backend phục vụ nhiều tenant','A và B gửi yêu cầu chồng lấn thời gian vào cùng instance được định danh.'],
    ['R3','Metadata được áp dụng lúc chạy','Đổi cấu hình A; A nhận hành vi mới, B giữ nguyên; không build hoặc khởi động lại backend.'],
    ['R4','Một database và bảng nghiệp vụ chung','Bản ghi của A, B tồn tại trong cùng bảng với tenant_id khác nhau.'],
    ['R5','Cô lập dữ liệu và ngữ cảnh','Các phép đọc, ghi và tình huống thiếu hoặc giả tenant bị kiểm soát đúng quyền.'],
],[1.1,4.8,9])
p('R1–R5 là bộ tiêu chí kiểm chứng của đề tài, được dẫn xuất từ ba nhóm thuộc tính Cấp độ 3. Chúng không thay thế một đánh giá bảo mật toàn diện. Tính sẵn sàng cao, tự động co giãn và tối ưu TCO ở quy mô lớn cần những phép đánh giá riêng và không được suy ra từ việc hoàn thành demo chức năng.')
h('2.2 Lựa chọn cách chia sẻ ứng dụng và dữ liệu')
p('Để đánh giá đúng mục tiêu, cần chỉ rõ cả tầng ứng dụng lẫn tầng dữ liệu. Phương án dùng chung mã nguồn nhưng mỗi tenant có backend và DB riêng tương ứng mốc đối chiếu Cấp độ 2 trong báo cáo. Phương án một backend chung và các bảng có tenant_id được chọn làm kiến trúc mục tiêu Cấp độ 3.')
table('Bảng 2.2 Đối chiếu các phương án lưu trữ phục vụ lựa chọn',['Phương án','Đặc điểm','Liên hệ với mục tiêu'],[
    ['Database riêng','Mỗi tenant có database nghiệp vụ độc lập.','Dễ phân tách đơn vị sao lưu; tăng số nguồn dữ liệu phải quản lý. Khi App cũng riêng, thuộc phương án Cấp độ 2 đang đối chiếu.'],
    ['Schema riêng','Các tenant có nhóm bảng riêng trong cùng database.','Có thêm ranh giới tên; vẫn phải chọn đúng schema và quản lý nhiều nhóm bảng. Không phải phương án demo trọng tâm.'],
    ['Bảng chung có Tenant ID','Các tenant dùng chung bảng; mỗi hàng nghiệp vụ được gắn tenant_id.','Phù hợp phương án Cấp độ 3 đã chọn; bắt buộc thực thi quyền và giới hạn dữ liệu theo tenant.'],
],[3.2,4.4,7.3])
p('Những tên gọi như Silo, Pool, Bridge hoặc Hybrid mô tả cách bố trí tài nguyên ở các tầng. Chúng không tạo ra một thang trưởng thành thay thế và không tương ứng cứng với bốn cấp độ. Trong phạm vi demo, chỉ cần xác định rõ ứng dụng và dữ liệu đều dùng chung; các biến thể dành riêng theo phân khúc khách hàng chưa cần đưa vào kiến trúc triển khai chính.')
p('Lựa chọn bảng chung giúp trình bày trực tiếp bài toán Cấp độ 3: cùng điểm thực thi phải phân biệt hai tenant ở mọi thao tác. Đổi lại, lỗi kiểm soát ngữ cảnh hoặc truy vấn có thể ảnh hưởng nhiều tổ chức. Vì vậy, mức độ dùng chung phải đi kèm kiểm tra quyền, ràng buộc dữ liệu và các tình huống thử chéo tenant; lợi ích chi phí không thay thế cho tính đúng đắn.')
h('2.3 Cấu trúc ứng dụng theo mô hình ba tầng')
h('2.3.1 Tầng người thuê',3)
p('Tenant A và B có các workspace độc lập. Mỗi workspace có một quản trị viên quản lý thành viên, thông tin tổ chức và các cấu hình được cho phép. User chọn workspace đang thao tác trong phạm vi quyền của mình. Giao diện phải thể hiện rõ workspace hiện hành để tránh nhầm lẫn khi một người có quyền tham gia nhiều tổ chức.')
p('Khi user đổi workspace, ứng dụng phải xác minh lại quyền đối với tenant đích và cập nhật dữ liệu, cấu hình tương ứng. Không được giữ dữ liệu hiển thị hoặc metadata của workspace trước như thể thuộc workspace mới. Các thiết lập cá nhân của user được phân biệt với cấu hình dùng chung của cả tổ chức.')
h('2.3.2 Tầng nhà cung cấp dịch vụ',3)
p('Các trách nhiệm chính gồm quản lý tenant và thành viên; xác thực và xác lập ngữ cảnh; nghiệp vụ bảng, cột, thẻ; đọc và cập nhật metadata; truy cập dữ liệu có kiểm soát. Những trách nhiệm này có thể được hiện thực trong các mô-đun của cùng backend. Mô hình ba tầng không đòi hỏi chia chúng thành nhiều microservice để chứng minh Cấp độ 3.')
p('Chức năng quản trị nền tảng quản lý tenant và trạng thái sử dụng dịch vụ; chức năng nghiệp vụ xử lý dữ liệu của tenant hiện hành. Sự phân biệt trách nhiệm giúp tránh cấp quyền quản trị toàn nền tảng cho quản trị viên workspace. Trong demo, cả hai có thể cùng nằm trong một ứng dụng nhưng phải có phạm vi quyền rõ ràng.')
h('2.3.3 Tầng instance và hạ tầng',3)
p('Cấu hình mục tiêu gồm một backend instance phục vụ nghiệp vụ, một Database Server và một database nghiệp vụ dùng chung. Cả tenant A lẫn B kết nối vào cùng backend, không khởi tạo backend theo tenant. Thêm tenant chủ yếu là thêm dữ liệu danh mục tenant, thành viên, metadata và dữ liệu khởi tạo cần thiết.')
p('Ứng dụng và Database Server là hai vai trò kỹ thuật khác nhau. Việc chúng nằm trên cùng máy hoặc các máy khác nhau không thay đổi quan hệ nhiều tenant dùng chung backend và database. Hồ sơ triển khai cần ghi rõ thành phần, phiên bản và cấu hình thực tế để người đọc đối chiếu thiết kế với môi trường demo.')
h('2.4 Xác định và cô lập ngữ cảnh tenant')
h('2.4.1 Phân giải tenant và kiểm tra quyền',3)
p('Mỗi yêu cầu cần xác định user đang đăng nhập và tenant đang thao tác. Tenant có thể được chọn qua đường dẫn, tên miền, thông tin phiên hoặc claim đã ký; giá trị do client gửi vẫn phải đối chiếu với quyền thành viên của user. Header hoặc tham số tenant_id chỉ biểu diễn tenant được yêu cầu, không tự chứng minh user có quyền truy cập.')
p('Luồng xử lý gồm xác thực danh tính, phân giải tenant, kiểm tra trạng thái tenant và quan hệ thành viên, sau đó thiết lập TenantContext cho phạm vi yêu cầu. Yêu cầu thiếu tenant, tenant không tồn tại hoặc user không có quyền phải bị từ chối trước khi thực hiện nghiệp vụ. Không tự chuyển sang tenant mặc định để tiếp tục xử lý.')
p('TenantContext chỉ chứa những thông tin cần dùng đã được xác minh, chẳng hạn tenant_id và quyền trong workspace. Các lớp nghiệp vụ, truy cập dữ liệu và đọc metadata dùng cùng ngữ cảnh này. Nếu mỗi lớp tự đọc một header hoặc tham số khác nhau, hệ thống có thể áp dụng cấu hình của A trong khi truy vấn dữ liệu của B.')
h('2.4.2 Vòng đời ngữ cảnh trong backend',3)
p('TenantContext phải được thiết lập trước khi xử lý và giải phóng khi yêu cầu kết thúc, kể cả khi có ngoại lệ. Nếu dùng ThreadLocal trong backend, luồng có thể được tái sử dụng cho yêu cầu khác; ngữ cảnh cũ phải được dọn trong finally. Trong môi trường xử lý bất đồng bộ, cần cơ chế truyền ngữ cảnh phù hợp với mô hình thực thi, không mặc nhiên cho rằng trạng thái của luồng ban đầu tự xuất hiện ở tác vụ mới.')
p('Tác vụ nền hoặc thông điệp, nếu có trong demo, phải mang định danh tenant từ nguồn tin cậy và được xác minh trước khi dùng. Worker thiết lập ngữ cảnh cho từng tác vụ và dọn khi kết thúc. Phần kiểm chứng cần có chuỗi yêu cầu A rồi B trên tài nguyên xử lý tái sử dụng để phát hiện việc sót ngữ cảnh, thay vì chỉ thử từng tenant riêng lẻ.')
p('Nhật ký phục vụ đối chiếu cần gắn request_id, tenant_id đã xác minh và định danh instance backend. Các trường này giúp nối bằng chứng từ yêu cầu đến thao tác dữ liệu. Log không thay thế kiểm soát quyền và không nên ghi mật khẩu, token đăng nhập hoặc toàn bộ dữ liệu nghiệp vụ nhạy cảm.')
h('2.4.3 Luồng xử lý yêu cầu điển hình',3)
p('Khi user A tạo thẻ, backend xác thực user, xác nhận user là thành viên của tenant A, thiết lập ngữ cảnh A và đọc metadata của A. Nghiệp vụ kiểm tra quyền tạo thẻ và các quy tắc cấu hình, sau đó ghi thẻ với tenant_id lấy từ ngữ cảnh tin cậy. Sau khi giao dịch kết thúc, backend trả kết quả và giải phóng ngữ cảnh.')
p('Nếu cùng lúc user B tạo thẻ, cùng mã xử lý phải thực hiện các bước tương tự trong ngữ cảnh B. Dữ liệu đi vào cùng bảng nhưng mang tenant_id khác nhau. Giá trị tenant_id do client chèn vào nội dung yêu cầu không được phép ghi đè ngữ cảnh đã xác thực; việc đổi tenant phải đi qua bước kiểm tra quyền tương ứng.')
h('2.5 Thiết kế database dùng chung')
h('2.5.1 Nhóm dữ liệu và khóa tenant',3)
p('Danh mục tenant lưu định danh và trạng thái tổ chức. Quan hệ thành viên lưu user_id, tenant_id và vai trò trong workspace. Metadata lưu các cấu hình theo tenant. Các thực thể nghiệp vụ như board, column và card thuộc một tenant xác định; chúng cần mang tenant_id trực tiếp hoặc được bảo vệ qua quan hệ sở hữu đã kiểm soát nhất quán. Trong demo, lưu trực tiếp tenant_id trên các bảng nghiệp vụ giúp việc kiểm chứng rõ ràng hơn.')
table('Bảng 2.3 Lược đồ logic tối thiểu được đề xuất',['Bảng','Trường chính','Ràng buộc cần thể hiện'],[
    ['tenant','tenant_id, name, status','Định danh duy nhất của tổ chức.'],
    ['membership','tenant_id, user_id, role','Không trùng cặp tenant và user; kiểm tra quyền theo tổ chức.'],
    ['tenant_config','tenant_id, config_key, config_value, version','Metadata được chọn và cập nhật theo đúng tenant.'],
    ['board','tenant_id, board_id, name','Board thuộc một tenant; định danh phục vụ liên kết trong tenant.'],
    ['kanban_column','tenant_id, column_id, board_id','Board được tham chiếu phải cùng tenant.'],
    ['card','tenant_id, card_id, column_id, title','Column được tham chiếu phải cùng tenant.'],
],[3,5.1,6.8])
p('Lược đồ trên là mô hình logic mục tiêu, không mặc nhiên là tên bảng đã tồn tại trong mã nguồn. Khi hiện thực, cần thống nhất khóa, kiểu dữ liệu và tên đối tượng giữa migration, mã truy cập và tài liệu. Chứng cứ database phải cho thấy bản ghi của ít nhất hai tenant trong cùng bảng nghiệp vụ.')
h('2.5.2 Toàn vẹn liên kết và truy vấn theo tenant',3)
p('Mọi thao tác đọc, cập nhật hoặc xóa đối tượng phải bị giới hạn theo tenant hiện hành và quyền nghiệp vụ. Với liên kết cha–con, cần ngăn trường hợp card của A trỏ tới column của B. Có thể dùng khóa duy nhất theo cặp (tenant_id, object_id) và khóa ngoại mang cùng tenant_id, kết hợp kiểm tra nghiệp vụ. Chỉ kiểm tra object_id tồn tại chưa bảo đảm đối tượng thuộc đúng tổ chức.')
p('Các ràng buộc duy nhất theo nghiệp vụ cần xét phạm vi tenant, ví dụ cùng một tên board có thể hợp lệ ở hai tổ chức khác nhau. Chỉ mục bắt đầu bằng tenant_id có thể phù hợp với truy vấn thường xuyên theo tenant và khóa đối tượng; lựa chọn cuối cùng cần dựa vào truy vấn thực tế và kế hoạch thực thi. Có tenant_id trong chỉ mục giúp truy cập hiệu quả nhưng không phải cơ chế cấp quyền.')
p('Cần kiểm tra cả danh sách, tìm kiếm, chi tiết, thống kê và các thao tác ghi. Một API danh sách đúng không chứng minh API xem chi tiết bằng ID hoặc cập nhật hàng loạt cũng đúng. Các đường truy cập dữ liệu gián tiếp như tải tệp, xuất dữ liệu và cache, nếu được triển khai, cũng phải dùng cùng phạm vi tenant.')
h('2.5.3 Cơ chế kiểm soát tại database',3)
p('Với PostgreSQL, Row-Level Security (RLS) có thể bổ sung lớp kiểm soát hàng theo ngữ cảnh tenant. Thiết kế cần xét cả hàng được nhìn thấy hoặc sửa và hàng mới được ghi. RLS không tự xác thực tenant; ứng dụng vẫn chịu trách nhiệm thiết lập ngữ cảnh đúng. Tài khoản chạy ứng dụng và chính sách truy cập phải được kiểm tra trong môi trường demo, thay vì chỉ kiểm thử bằng tài khoản quản trị.')
p('Chủ bảng, superuser hoặc vai trò có BYPASSRLS có thể không chịu chính sách như tài khoản thông thường. Do đó, cần xác nhận quyền thực tế và cấu hình áp dụng RLS, bao gồm FORCE ROW LEVEL SECURITY khi phù hợp. Tài liệu PostgreSQL là căn cứ đối chiếu cơ chế này; việc sử dụng RLS trong ứng dụng chỉ được ghi nhận là đã hiện thực khi có migration và kiểm thử bằng vai trò thực tế [4].')
p('Nếu ngữ cảnh được truyền vào database bằng SET LOCAL, việc thiết lập và truy vấn nghiệp vụ phải nằm trong cùng transaction. Giá trị cục bộ kết thúc cùng transaction; trạng thái session trước đó có thể có hiệu lực trở lại. Vì vậy, việc quản lý connection pool vẫn cần bảo đảm không tồn tại ngữ cảnh session sai, đồng thời chính sách phải xử lý rõ tình huống thiếu hoặc rỗng tenant [5].')
p('RLS là một lựa chọn triển khai cơ chế cô lập của phương án bảng chung; nó không phải tên một cấp độ trưởng thành. Bộ tiêu chí Cấp độ 3 cần kiểm chứng dữ liệu được phân tách đúng, bất kể cơ chế cụ thể được dùng là gì. Khi chọn RLS, phải kiểm tra hiệu lực của cả ứng dụng, vai trò database và chính sách, không chỉ sự tồn tại của câu lệnh khai báo.')
h('2.6 Tùy biến runtime qua metadata')
h('2.6.1 Những điểm tùy biến được hỗ trợ',3)
p('Metadata là dữ liệu mô tả cách ứng dụng hoạt động hoặc hiển thị cho tenant. Các trường như tên workspace, màu nhận diện, tính năng được bật và giới hạn nghiệp vụ được lưu cùng tenant_id. Mã nguồn định nghĩa trước cách hiểu những trường này; metadata chỉ chọn biến thể đã hỗ trợ, không thay thế bằng một bộ mã tùy biến riêng cho mỗi tổ chức.')
p('Ví dụ, metadata giao diện xác định tên và màu workspace; metadata nghiệp vụ xác định có áp dụng giới hạn thẻ đang thực hiện hay không và giới hạn là bao nhiêu. A và B có giá trị khác nhau trong cùng cấu trúc dữ liệu. Khi yêu cầu đi vào backend, tenant hiện hành quyết định bộ metadata được chọn và quy tắc được áp dụng.')
p('Cần phân biệt metadata với dữ liệu nghiệp vụ thông thường. Việc tạo một board hoặc sửa tiêu đề card thể hiện thay đổi dữ liệu công việc; riêng thao tác đó chưa chứng minh tùy biến hành vi ứng dụng. Phép thử runtime phải làm rõ một cấu hình đã thay đổi giao diện hoặc cách xử lý nghiệp vụ được nền tảng hỗ trợ.')
h('2.6.2 Cập nhật cấu hình khi ứng dụng đang chạy',3)
p('Luồng cập nhật gồm kiểm tra quyền quản trị trong tenant, kiểm tra tính hợp lệ của giá trị, lưu metadata và làm cho lần xử lý tiếp theo đọc được phiên bản phù hợp. Không cần sửa mã nguồn, build lại hoặc tạo instance riêng cho tenant. Nếu cấu hình được cache, cần quy tắc hết hạn hoặc invalidation có thể quan sát trong thử nghiệm.')
p('Cấu hình phải có phạm vi và ràng buộc rõ ràng. Ví dụ, giới hạn thẻ không nhận số âm, giá trị màu phải hợp lệ và khóa cấu hình không được tùy tiện biến thành lệnh thực thi. Khi cập nhật sai, hệ thống trả lỗi có kiểm soát và giữ cấu hình hợp lệ trước đó; không áp dụng một phần làm tenant rơi vào trạng thái khó xác định.')
p('Quy tắc nghiệp vụ được áp dụng ở backend, còn giao diện phản ánh trạng thái đó cho user. Nếu một tính năng bị tắt, gọi trực tiếp API cũng phải tuân theo quyền và cấu hình. Giấu nút hoặc menu chỉ thay đổi cách hiển thị, không tạo ra ranh giới chức năng giữa các tenant.')
h('2.6.3 Phân biệt với cấu hình của Cấp độ 2',3)
p('Ở Cấp độ 2 theo phương án đối chiếu, App A nạp cấu hình A trước khi chạy và App B nạp cấu hình B. Ở Cấp độ 3, cùng App đang chạy xử lý liên tiếp hoặc đồng thời yêu cầu A và B, mỗi lần chọn metadata theo tenant. Do đó, vị trí lưu cấu hình chưa đủ phân biệt: cần quan sát cùng instance có thay đổi hành vi theo ngữ cảnh trong lúc phục vụ hay không.')
p('Phép demo rõ nhất là giữ nguyên định danh instance và phiên bản backend, mở A và B trong hai phiên độc lập, thay cấu hình A rồi thực hiện lại cùng loại thao tác. Nếu A nhận hành vi mới, B giữ nguyên, không có lần build hoặc restart xen giữa, bằng chứng đó liên kết được metadata, runtime và sự độc lập giữa các tenant.')
h('2.7 Tài nguyên dùng chung và giới hạn của kiến trúc')
p('Một instance và database dùng chung làm các tenant cạnh tranh CPU, bộ nhớ, kết nối và I/O. Tenant có tải lớn có thể làm tăng thời gian chờ của tenant khác, thường gọi là hiệu ứng hàng xóm ồn ào. Vì vậy, cô lập dữ liệu đúng không đồng nghĩa đã cô lập hiệu năng hoặc bảo đảm tính sẵn sàng cao.')
p('Trong phạm vi demo, có thể áp dụng giới hạn lưu lượng hoặc mức đồng thời theo tenant và theo dõi độ trễ, tỷ lệ lỗi riêng cho A và B. Những cơ chế này phục vụ vận hành Cấp độ 3; không cần đưa toàn bộ các thuật toán cache hoặc hệ thống điều phối phân tán vào phần lý thuyết khi chưa có thành phần tương ứng trong ứng dụng.')
p('Nếu có cache, khóa dữ liệu hoặc cấu hình phải chứa tenant_id cùng định danh đối tượng phù hợp. Không dùng chung cache entry chỉ theo card_id khi có khả năng nhầm phạm vi tổ chức. Xóa hoặc làm mới metadata của A phải giữ cấu hình B đúng; việc thử tùy biến runtime cần bao gồm trường hợp đọc sau cập nhật.')
p('Sao lưu database chung không tự cung cấp khả năng khôi phục riêng một tenant. Cập nhật lược đồ cũng có thể ảnh hưởng tất cả tenant. Báo cáo cần nêu đây là hạn chế vận hành của phương án dùng chung và xác định chiến lược tương thích, sao lưu, phục hồi ở mức phù hợp; không dùng các tên gọi như zero downtime như một kết quả khi chưa được đánh giá.')
h('2.8 Kế hoạch kiểm chứng demo theo tiêu chí Cấp độ 3')
h('2.8.1 Thiết lập và bằng chứng cần thu thập',3)
p('Môi trường kiểm chứng cần ghi phiên bản hoặc commit của mã nguồn, cách khởi chạy backend, định danh instance, cấu hình database và tài khoản ứng dụng. Tạo tenant A, B, mỗi tenant có quản trị viên và thành viên; chuẩn bị dữ liệu có thể phân biệt và cấu hình khác nhau. Tài khoản dùng cho thử chéo tenant chỉ có quyền tại tenant của mình.')
p('Mỗi ca kiểm chứng lưu đầu vào, điều kiện trước khi chạy, thời điểm, kết quả kỳ vọng và kết quả quan sát. Bằng chứng phù hợp gồm yêu cầu và phản hồi API, log có tenant_id và instance_id, ảnh giao diện, truy vấn đối chiếu dữ liệu và phần mã hoặc migration thực thi cơ chế. Ảnh giao diện chỉ là một phần bằng chứng, không đủ xác nhận backend hoặc database được dùng chung.')
table('Bảng 2.4 Ma trận tiêu chí và bằng chứng cần có',['Tiêu chí','Cách kiểm chứng','Bằng chứng'],[
    ['Mã nguồn chung và metadata runtime','Đổi cấu hình A trên hệ thống đang chạy; lặp thao tác của A và B.','Phiên bản code; metadata trước/sau; hành vi A thay đổi, B giữ nguyên; định danh instance không đổi.'],
    ['Một instance phục vụ đồng thời nhiều tenant','Gửi yêu cầu A, B chồng lấn thời gian vào cùng backend.','Cấu hình triển khai; log request có tenant_id, timestamp và cùng instance_id.'],
    ['Database và bảng chung có Tenant ID','Tạo dữ liệu A, B rồi đối chiếu cùng bảng.','Lược đồ; migration; bản ghi có tenant_id khác nhau trong cùng database.'],
    ['Cô lập dữ liệu và ngữ cảnh','Thử đọc/ghi chéo tenant, thiếu hoặc giả tenant; xen kẽ A, B.','Yêu cầu/phản hồi; log; kiểm tra dữ liệu trước/sau; chính sách và vai trò database nếu dùng RLS.'],
],[3.6,5.1,6.2])
h('2.8.2 Các ca kiểm chứng chức năng cốt lõi',3)
table('Bảng 2.5 Các ca kiểm chứng tối thiểu',['Mã','Thao tác','Kết quả kỳ vọng'],[
    ['T01','A và B tạo, đọc thẻ trong workspace của mình.','Mỗi bên thao tác đúng quyền và chỉ thấy dữ liệu thuộc phạm vi của mình.'],
    ['T02','Cập nhật metadata giao diện của A khi backend đang chạy.','A hiển thị cấu hình mới theo cơ chế refresh; B giữ nguyên; không build hoặc restart.'],
    ['T03','Đổi quy tắc nghiệp vụ của A rồi gọi API ở A và B.','Backend áp dụng quy tắc mới cho A, không áp dụng nhầm cho B.'],
    ['T04','Gửi request A, B chồng lấn thời gian.','Cùng instance xử lý hai tenant; dữ liệu và cấu hình không lẫn.'],
    ['T05','User A dùng ID đối tượng của B để đọc, sửa hoặc xóa.','Từ chối hoặc không trả đối tượng theo quy ước API; dữ liệu B không đổi.'],
    ['T06','Thiếu tenant hoặc sửa tenant_id ở header, URL hay body.','Không vượt quyền; không tự dùng tenant mặc định; không ghi vào tenant giả.'],
    ['T07','Xử lý A rồi B trên worker hoặc connection tái sử dụng.','Không còn ngữ cảnh A khi phục vụ B; kiểm tra cả nhánh lỗi và rollback.'],
    ['T08','Tạo liên kết cha–con chéo tenant.','Không tạo được card A tham chiếu column B; dữ liệu giữ toàn vẹn.'],
    ['T09','Gọi API cập nhật cấu hình bằng user không có quyền quản trị.','Bị từ chối; cấu hình của cả hai tenant giữ nguyên.'],
],[1.2,6.7,7])
p('Các kết quả trong Bảng 2.5 là điều kiện kỳ vọng trước khi chạy thử. Khi ghi kết quả thực tế, cần đối chiếu đầy đủ cả phản hồi API lẫn trạng thái dữ liệu; một lỗi HTTP không tự chứng minh thao tác chưa gây tác động. Nếu có cơ chế cache hoặc tác vụ nền, bổ sung ca kiểm chứng tương ứng với thành phần thực sự tồn tại.')
h('2.8.3 Trình tự demo và đánh giá kết quả',3)
p('Trình tự trình bày bắt đầu bằng cấu hình triển khai một backend và một database. Sau đó đăng nhập A và B ở hai phiên độc lập, thể hiện cùng chức năng Kanban với dữ liệu và cấu hình riêng. Tiếp theo thay đổi metadata A khi backend vẫn chạy, quan sát thay đổi ở A và kiểm tra B giữ nguyên. Cuối cùng thực hiện yêu cầu đồng thời và các thao tác đọc, ghi chéo tenant để đối chiếu cơ chế cô lập.')
p('Việc đánh giá cần trả lời từng yêu cầu R1–R5 bằng bằng chứng cụ thể. R1 và R3 chứng minh mã nguồn chung cùng tùy biến runtime; R2 chứng minh chia sẻ instance; R4 và R5 chứng minh database chung có phân tách logic và ngữ cảnh được quản lý đúng. Các ca chưa chạy hoặc không đủ bằng chứng được ghi là chưa xác nhận, không được thay bằng kết quả suy ra từ sơ đồ thiết kế.')
p('Khi đo hiệu năng hỗ trợ, ghi rõ số tenant, số user đồng thời, tải mỗi tenant, kích thước dữ liệu, thời gian chạy và cấu hình tài nguyên. Báo cáo độ trễ và tỷ lệ lỗi theo tenant bên cạnh số tổng. Phép đo này giúp nhận diện giới hạn của ứng dụng chung; tự nó không chứng minh mở rộng ngang hoặc hiệu quả TCO ở quy mô thương mại.')
p('Phần thực nghiệm hoàn chỉnh cần trình bày thiết lập đã dùng, kết quả quan sát của từng ca, bằng chứng và nhận xét. Kết luận đạt Cấp độ 3 chỉ được đưa ra sau khi ba nhóm thuộc tính đều có chứng cứ tương ứng. Bộ tiêu chí ở đây tạo căn cứ trực tiếp cho việc hiện thực và đánh giá ứng dụng, không thay cho kết quả chạy thử.',comment='Bản nguồn chỉ có nội dung Chương 1–2, chưa có kết quả demo. Vì vậy phần bổ sung là tiêu chí và kế hoạch kiểm chứng, không ghi nhận các ca kỳ vọng là đã đạt hoặc tự tạo số liệu thực nghiệm.')
h('2.9 Hướng phát triển lên Cấp độ 4')
p('Sau khi kiểm chứng Cấp độ 3, bước phát triển tiếp theo là nhân bản backend sau bộ cân bằng tải. Các instance dùng cùng phiên bản ứng dụng và cơ chế xác lập tenant; trạng thái phiên và cấu hình không phụ thuộc sai vào bộ nhớ cục bộ của một instance. Nếu triển khai bằng container/pod, phải bảo đảm thêm pod mới vẫn áp dụng đúng tenant và metadata.')
p('Tầng dữ liệu cần được đánh giá riêng theo tải. Có thể mở rộng tài nguyên, tối ưu truy vấn, thêm bản sao đọc hoặc phân vùng dữ liệu; database phân tán là một phương án khi có yêu cầu và mô hình nhất quán phù hợp. Không tự giả định rằng tăng số backend sẽ giải quyết giới hạn của một database chung.')
p('Để kết luận về Cấp độ 4, cần kiểm chứng lưu lượng được phân phối qua nhiều instance, khả năng tăng năng lực khi bổ sung tài nguyên, hành vi khi instance gặp lỗi và tính đúng đắn của ngữ cảnh trên toàn bộ luồng. Khả năng tự động co giãn, nếu xây dựng, phải được đánh giá thêm qua chính sách kích hoạt và kết quả quan sát. Những nội dung này thuộc hướng mở rộng sau mục tiêu demo Cấp độ 3.')
h('2.10 Tổng kết chương')
p('Kiến trúc mục tiêu sử dụng một backend và database chung cho nhiều tenant, đồng thời duy trì phạm vi dữ liệu và cấu hình theo tổ chức. TenantContext kết nối xác thực với nghiệp vụ, metadata quyết định các biến thể lúc chạy, và Tenant ID hỗ trợ phân tách dữ liệu trên bảng chung. Ma trận kiểm chứng liên kết trực tiếp những cơ chế này với bằng chứng cần có để đánh giá Cấp độ 3. Cân bằng tải, mở rộng ngang và phân bố dữ liệu được xác định là hướng phát triển Cấp độ 4.')

h('Tài liệu tham khảo',1)
refs=[
'[1] Mell, P. và Grance, T. (2011). The NIST Definition of Cloud Computing. NIST SP 800-145. https://doi.org/10.6028/NIST.SP.800-145',
'[2] Chong, F. và Carraro, G. (2006). Architecture Strategies for Catching the Long Tail. Microsoft, April 2006. Mô hình trưởng thành SaaS bốn cấp độ. https://msdn.microsoft.com/en-us/library/aa479069.aspx',
'[3] Kabbedijk, J., Bezemer, C.-P., Jansen, S. và Zaidman, A. (2015). Defining Multi-Tenancy: A Systematic Mapping Study on the Academic and the Industrial Perspective. Journal of Systems and Software, 100, 93–103. https://doi.org/10.1016/j.jss.2014.10.034',
'[4] PostgreSQL Global Development Group. PostgreSQL 17 Documentation, Row Security Policies. https://www.postgresql.org/docs/17/ddl-rowsecurity.html. Truy cập ngày 07/11/2026.',
'[5] PostgreSQL Global Development Group. PostgreSQL 17 Documentation, SET. https://www.postgresql.org/docs/17/sql-set.html. Truy cập ngày 07/11/2026.',
]
for text in refs:
    pp=p(text); pp.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.LEFT
    pp.paragraph_format.keep_together=True

# Explicit page numbers; clean heading numbering is authored in the heading text.
foot=sec.footer.paragraphs[0]; foot.alignment=WD_ALIGN_PARAGRAPH.CENTER
rr=foot.add_run(); fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); rr._r.addnext(fld)
settings=doc.settings.element
upd=OxmlElement('w:updateFields'); upd.set(qn('w:val'),'true'); settings.append(upd)
doc.save(ROOT/'Research Report.docx')
summary={'original_words':sum(len(x.text.split()) for x in src.paragraphs),'revised_words':sum(len(x.text.split()) for x in doc.paragraphs),'paragraphs':len(doc.paragraphs),'tables':len(doc.tables),'comments':len(doc.comments),'backup':str(BACKUP)}
(QA/'revision-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False))

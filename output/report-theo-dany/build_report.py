from pathlib import Path
import re,json,hashlib,zipfile,shutil
from docx import Document
from docx.shared import Cm,Pt,RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT,WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image
from report_content import P,INTRO,REFERENCES

BASE=Path(__file__).resolve().parent; ROOT=BASE.parents[1]
OUT=ROOT/'Bao cao NCKH bo sung ngan xep 9 tang.docx'
OUT_DANY=ROOT/'Bao cao NCKH theo dan y.docx'
OUT_RESEARCH=ROOT/'Research Report.docx'
MAN=json.loads((BASE/'figures/manifest.json').read_text(encoding='utf-8'))
doc=Document(); sec=doc.sections[0]
sec.page_width=Cm(21);sec.page_height=Cm(29.7)
sec.top_margin=Cm(2.5);sec.bottom_margin=Cm(2.5)
sec.left_margin=Cm(3.5);sec.right_margin=Cm(2.5)
sec.footer_distance=Cm(1.2);sec.header_distance=Cm(1.2)
for name in ['Normal','Title','Subtitle','Heading 1','Heading 2','Heading 3','Caption','TOC Heading']:
    sty=doc.styles[name];sty.font.name='Times New Roman';sty.font.size=Pt(13);sty.font.color.rgb=RGBColor(0,0,0)
    fonts=sty._element.get_or_add_rPr().get_or_add_rFonts()
    for key in list(fonts.attrib):
        if 'theme' in key.lower():del fonts.attrib[key]
    for key in ['ascii','hAnsi','eastAsia','cs']:fonts.set(qn('w:'+key),'Times New Roman')
    for e in sty._element.xpath('.//w:pBdr'):e.getparent().remove(e)
norm=doc.styles['Normal'].paragraph_format
norm.line_spacing=1.25;norm.space_after=Pt(6);norm.widow_control=True;norm.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
for name,sz in [('Heading 1',15),('Heading 2',13),('Heading 3',13)]:
    sty=doc.styles[name];sty.font.size=Pt(sz);sty.font.bold=True
    pf=sty.paragraph_format;pf.space_before=Pt(11);pf.space_after=Pt(6);pf.line_spacing=1.1
    pf.keep_with_next=True;pf.alignment=WD_ALIGN_PARAGRAPH.LEFT
doc.styles['Heading 1'].paragraph_format.page_break_before=True
doc.styles['Title'].font.size=Pt(19);doc.styles['Title'].font.bold=True
doc.styles['Title'].paragraph_format.alignment=WD_ALIGN_PARAGRAPH.CENTER
doc.styles['Title'].paragraph_format.space_after=Pt(18)
doc.styles['Caption'].font.size=Pt(11);doc.styles['Caption'].font.italic=True
doc.styles['Caption'].paragraph_format.line_spacing=1.1
doc.styles['Caption'].paragraph_format.space_after=Pt(8)
doc.styles['Caption'].paragraph_format.alignment=WD_ALIGN_PARAGRAPH.CENTER
for name in ['TOC 1','TOC 2','TOC 3']:
    if name not in doc.styles:
        from docx.enum.style import WD_STYLE_TYPE
        doc.styles.add_style(name,WD_STYLE_TYPE.PARAGRAPH)
    sty=doc.styles[name];sty.font.name='Times New Roman';sty.font.size=Pt(11)
    sty.paragraph_format.line_spacing=1.05;sty.paragraph_format.space_after=Pt(3)
    sty.paragraph_format.keep_with_next=False
doc.core_properties.title='Xây dựng ứng dụng quản lý công việc theo kiến trúc đa thuê bao'
doc.core_properties.author='Ngô Hưng Thịnh và nhóm nghiên cứu'
doc.core_properties.subject='Cơ sở lý thuyết so sánh kiến trúc và thiết kế ứng dụng Kanban đa thuê bao Cấp độ 3'

def p(text,style=None):return doc.add_paragraph(text,style)
def center(text,size=13,bold=False,before=0,after=6):
    pp=p(text);pp.alignment=WD_ALIGN_PARAGRAPH.CENTER;pp.paragraph_format.space_before=Pt(before);pp.paragraph_format.space_after=Pt(after)
    for r in pp.runs:r.font.size=Pt(size);r.bold=bold
    return pp
def head(text,level=1):return p(text,'Heading '+str(level))
def prehead(text):
    pp=p(text,'TOC Heading');pp.paragraph_format.page_break_before=True;pp.paragraph_format.keep_with_next=True
    pp.paragraph_format.space_after=Pt(14);pp.runs[0].bold=True;pp.runs[0].font.size=Pt(15)
    return pp
def field(pp,instr,placeholder=''):
    e=OxmlElement('w:fldSimple');e.set(qn('w:instr'),instr)
    if placeholder:
        r=OxmlElement('w:r');t=OxmlElement('w:t');t.text=placeholder;r.append(t);e.append(r)
    pp._p.append(e)
def table(caption,headers,rows,widths):
    cp=p(caption,'Caption');cp.paragraph_format.keep_with_next=True
    t=doc.add_table(rows=1,cols=len(headers));t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
    for col,w in zip(t.columns,widths):col.width=Cm(w)
    for c,txt,w in zip(t.rows[0].cells,headers,widths):c.text=txt;c.width=Cm(w)
    for row in rows:
        for c,txt,w in zip(t.add_row().cells,row,widths):c.text=txt;c.width=Cm(w)
    borders=OxmlElement('w:tblBorders')
    for side in ['top','left','bottom','right','insideH','insideV']:
        x=OxmlElement('w:'+side);x.set(qn('w:val'),'single');x.set(qn('w:sz'),'5');x.set(qn('w:color'),'D9D9D9');borders.append(x)
    t._tbl.tblPr.append(borders)
    for ri,row in enumerate(t.rows):
        trpr=row._tr.get_or_add_trPr();trpr.append(OxmlElement('w:cantSplit'))
        if ri==0:trpr.append(OxmlElement('w:tblHeader'))
        for ci,c in enumerate(row.cells):
            c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            tcpr=c._tc.get_or_add_tcPr();sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'E8EDF1' if ri==0 else 'FFFFFF');tcpr.append(sh)
            margins=OxmlElement('w:tcMar')
            for side in ['top','bottom','left','right']:
                e=OxmlElement('w:'+side);e.set(qn('w:w'),'85');e.set(qn('w:type'),'dxa');margins.append(e)
            tcpr.append(margins)
            for pp in c.paragraphs:
                pf=pp.paragraph_format;pf.line_spacing=1.1;pf.space_before=Pt(2);pf.space_after=Pt(3)
                pf.keep_with_next=(ri==0)
                pf.alignment=WD_ALIGN_PARAGRAPH.CENTER if ci==0 else WD_ALIGN_PARAGRAPH.LEFT
                for r in pp.runs:r.font.size=Pt(11);r.bold=(ri==0)
    pp=p('');pp.paragraph_format.space_after=Pt(0);pp.paragraph_format.line_spacing=1;pp.paragraph_format.space_before=Pt(0)
    return t

FIG_EXPLAINS={
'hinh_1_1_tien_trinh':'Các khối nêu đơn vị chia sẻ nổi bật ở mỗi hướng phát triển. Mũi tên biểu diễn quan hệ kế thừa ý tưởng; trọng tâm của SaaS đa thuê bao là quản trị dữ liệu và cấu hình ở cấp tổ chức.',
'hinh_1_2_tco':'Trục hoành là quy mô / số lượng tổ chức thuê dịch vụ (tenant); trục tung là tổng chi phí sở hữu (TCO) mà nhà cung cấp dịch vụ bỏ ra. Trước điểm giao n*, Single-tenant rẻ hơn; sau điểm giao n*, Multi-tenant tiết kiệm chi phí hơn nhờ chia sẻ tài nguyên.',
'hinh_1_3_st':'Mỗi tổ chức (Tenant A, Tenant B) có các thành viên thuộc Membership riêng và được cấp phát App Server Instance cùng Database riêng biệt ở tầng đang xét.',
'hinh_1_4_mi':'Sơ đồ đặt cạnh nhau hai trường hợp điển hình của Multi-Instance (MI): mỗi instance phục vụ riêng một tenant hoặc nhiều instance cùng chia sẻ tải trên một nguồn dữ liệu.',
'hinh_1_5_mu':'Nhiều cá nhân (User 1, 2, 3) dùng chung một Web/App Server Instance và Database, nhưng chỉ định danh 1 lớp theo user_id; không có không gian quản trị và cấu hình riêng cấp tổ chức.',
'hinh_1_6_mt':'Nhiều tổ chức (Tenant A, B) cùng chia sẻ một Web/App Server Instance và một Database; từng request được xác lập TenantContext, nạp Metadata runtime và phân vùng dữ liệu bằng khóa tenant_id.',
'hinh_1_7_st_mi_mu_mt':'Sơ đồ tổng quát đồng bộ hóa bốn mô hình ST, MI, MU và MT trên cùng hệ khái niệm Tenant, User, App Server Instance, Database và Metadata.',
'hinh_1_8_cap_do_1':'Ở Cấp độ 1, mỗi khách hàng sử dụng một nhánh mã nguồn tùy biến riêng (Custom Code A, B), biên dịch và chạy trên App Server Instance cùng Database hoàn toàn tách biệt.',
'hinh_1_9_cap_do_2':'Ở Cấp độ 2, tất cả khách hàng dùng chung một bộ mã nguồn chuẩn (Single Codebase) nhưng tùy biến qua file cấu hình trước khi chạy (config before run) trên các App Server Instance và Database riêng.',
'hinh_1_10_cap_do_3':'Ở Cấp độ 3 (kiến trúc mục tiêu của đề tài), một Codebase chung, một App Server Instance và một Database dùng chung phục vụ đồng thời nhiều tenant; tùy biến diễn ra ngay lúc chạy (runtime) qua Metadata và dữ liệu được cô lập logic bằng Tenant ID.',
'hinh_1_11_cap_do_4':'Ở Cấp độ 4 (hướng phát triển), hệ thống kế thừa Cấp độ 3 và bổ sung bộ cân bằng tải (Load Balancer), cụm nhiều App Server Instances / Container Pods mở rộng ngang cùng tầng Database phân tán.',
'hinh_1_12_truong_thanh':'Sơ đồ tổng hợp đối chiếu trực quan 4 cấp độ trưởng thành theo ba phương diện: cấp độ, mã nguồn – cơ chế tùy biến và cách tổ chức App Server Instance – Database.',
'hinh_1_13_ba_tang':'Mũi tên nối ba tầng: Tầng người thuê (Tenant & User) → Tầng nhà cung cấp dịch vụ (Ứng dụng, nghiệp vụ, Metadata) → Tầng các instance và hạ tầng (Web Server, Application Server, Database Server).',
'hinh_1_14_tich_hop':'Đường nét liền chỉ quan hệ phục vụ giữa 3 tầng; đường nét đứt chỉ phạm vi áp dụng 4 cơ chế kiểm soát (ngữ cảnh, dữ liệu, tài nguyên, cấu hình Metadata) trong kiến trúc Cấp độ 3.',
'hinh_1_15_ngan_xep_goc':'Bản vẽ lại giữ quy ước của Kabbedijk và cộng sự (2015): năm khối nét liền và bốn khối nét đứt biểu diễn phạm vi phân tích của bài báo gốc.',
'hinh_1_16_ngan_xep_cap_nhat':'Bản cập nhật đưa Middleware vào khung nét liền để nhấn mạnh việc kiểm soát ngữ cảnh tenant tại API Gateway, bộ nhớ đệm, hàng đợi và lưu trữ đối tượng.',
'hinh_2_1_silo':'Mỗi tenant đi vào đúng App Instance và Database riêng của mình ở hai tầng được xét.',
'hinh_2_2_pool':'Tenant A, B, C cùng đi vào một App Server Instance và bảng dữ liệu chung; TenantContext chọn Metadata runtime, còn tenant_id và RLS phân vùng dữ liệu.',
'hinh_2_3_bridge':'Một App Server Instance dùng chung định tuyến kết nối tới Schema hoặc Database riêng của từng tenant đã xác minh.',
'hinh_2_4_hybrid':'Tenant A và B dùng chung cụm Pool để tối ưu chi phí; Tenant C được bố trí App Instance và Database riêng theo yêu cầu đặc thù.',
'hinh_3_1_use_case':'Sơ đồ phân định rõ nhóm chức năng của Quản trị hệ thống, Quản trị tenant và Thành viên trong phạm vi ứng dụng Demo Cấp độ 3.',
'hinh_3_2_kien_truc':'Các mô-đun xác thực, ngữ cảnh, Metadata và nghiệp vụ Kanban cùng vận hành trong một Application Server Instance duy nhất kết nối tới PostgreSQL dùng chung.',
'hinh_3_3_luong_yeu_cau':'Luồng xử lý xác minh Membership, thiết lập TenantContext, đặt biến phiên SET LOCAL trong transaction, áp dụng Metadata và luôn dọn ngữ cảnh trong khối finally.',
'hinh_3_4_erd':'Lược đồ thực thể cốt lõi trên một Database dùng chung; mọi bảng nghiệp vụ đều gắn khóa tenant_id và khóa ngoại kép cùng tenant.',
'hinh_3_5_metadata':'Quản trị viên Tenant A cập nhật cấu hình khi App Server Instance đang chạy; yêu cầu tiếp theo của A áp dụng ngay quy tắc WIP mới, trong khi Tenant B giữ nguyên cấu hình riêng.',
'hinh_3_6_giao_dien':'Wireframe giao diện bảng Kanban hiển thị rõ Workspace hiện hành, màu sắc, tên tổ chức và giới hạn WIP được nạp động từ Metadata của tenant.',
'hinh_3_7_trien_khai':'Mô hình triển khai thử nghiệm cụ thể hóa 3 loại instance: Web Server Instance, Application Server Instance duy nhất và Database Server Instance dùng chung.'
}

def figure(info):
    image=BASE/'figures/png'/(info['stem']+'.png')
    pp=p('');pp.alignment=WD_ALIGN_PARAGRAPH.CENTER
    pp.paragraph_format.keep_with_next=True;pp.paragraph_format.space_before=Pt(5);pp.paragraph_format.space_after=Pt(4)
    shape=pp.add_run().add_picture(str(image),width=Cm(15))
    props=shape._inline.docPr;props.set('descr',info['caption']+'. '+info['meaning']);props.set('title',info['caption'])
    p(info['caption'],'Caption')
    pp=p(FIG_EXPLAINS[info['stem']]);pp.paragraph_format.space_after=Pt(8)

TABLES={
'1.3.5':('Bảng 1.1 Đối chiếu bốn cách tổ chức hệ thống (ST, MI, MU, MT)',['Mô hình','Đơn vị định danh','Tổ chức Instance & Database','Khả năng tùy biến theo tổ chức'],[
['ST','Một tổ chức (Tenant)','App Server Instance và DB riêng cho một tổ chức.','Tùy biến riêng theo môi trường của tổ chức đó.'],
['MI','Một hoặc nhiều tổ chức','Nhiều App Server Instance chạy song song; DB riêng hoặc chung.','Phụ thuộc cách cấu hình từng bản chạy.'],
['MU','Cá nhân (user_id)','Một App Server Instance và DB chung cho nhiều cá nhân.','Giao diện và quy tắc chung; không có cấu hình cấp tổ chức.'],
['MT','Hai lớp (tenant_id + user_id)','Nhiều tổ chức dùng chung App Server Instance và DB (gắn tenant_id).','Tùy biến động lúc chạy (runtime) theo từng tổ chức qua Metadata.']],[1.8,3.2,5.0,5.0]),

'1.4.5':('Bảng 1.2 So sánh bốn cấp độ trưởng thành kiến trúc SaaS (Chong & Carraro)',['Cấp độ','Mã nguồn & Tùy biến','App Server Instance & Database','Định vị trong đề tài'],[
['Cấp độ 1: Ad Hoc / Custom','Mã nguồn tùy biến riêng theo khách hàng','App Server Instance riêng; Database riêng','Mốc đối chiếu lịch sử'],
['Cấp độ 2: Configurable','Một Codebase chung; tùy biến qua file cấu hình trước khi chạy (config before run)','App Server Instance riêng; Database riêng theo từng khách hàng','Đối chiếu với Cấp độ 3'],
['Cấp độ 3: Configurable, Multi-Tenant-Efficient','Một Codebase chung; tùy biến ngay lúc chạy (runtime) qua siêu dữ liệu (Metadata)','Một App Server Instance chung; Database chung phân vùng logic bằng Tenant ID','Mục tiêu thiết kế & Demo của đề tài'],
['Cấp độ 4: Scalable, Configurable, Multi-Tenant-Efficient','Kế thừa Codebase chung, TenantContext và Metadata runtime của Cấp độ 3','Load Balancer + Cụm nhiều App Server Instances (Pods) mở rộng ngang + DB phân tán','Hướng phát triển mở rộng trong tương lai']],[3.1,4.3,4.6,3.0]),

'1.5.4':('Bảng 1.3 Liên hệ năm đặc trưng cốt lõi với tiêu chí kiểm chứng Cấp độ 3',['Đặc trưng cốt lõi','Biểu hiện trong thiết kế Cấp độ 3','Bằng chứng thực nghiệm cần kiểm chứng'],[
['1. Chia sẻ trong suốt','Nhiều workspace cùng chạy trên 1 App Server Instance và 1 Database chung','Cùng instance_id và cùng cơ sở dữ liệu phục vụ đồng thời Tenant A, B.'],
['2. Tùy biến runtime','Lưu và nạp Metadata (ui_config, rules) theo tenant_id ngay lúc chạy','Đổi cấu hình WIP/giao diện của Tenant A khi server đang chạy; A đổi ngay, B giữ nguyên.'],
['3. Cô lập đa chiều','TenantContext theo request + Khóa ngoại kép (tenant_id) + Chính sách RLS','Thử đọc/sửa/xóa chéo ID của B từ tài khoản A đều bị từ chối; dọn sạch context sau lỗi.'],
['4. Vòng đời bằng dữ liệu','Khởi tạo tenant mới bằng giao dịch dữ liệu (tenant, membership, tenant_config)','Tạo thêm workspace mới không cần tạo DB mới hay khởi chạy container/instance mới.'],
['5. Quan sát theo tenant','Ghi nhận nhật ký truy cập và thao tác gắn kèm định danh thuê bao','Log truy xuất rõ cặp (request_id, tenant_id, instance_id) trên từng thao tác.']],[3.0,5.6,6.4]),

'2.1.3':('Bảng 2.1 So sánh bốn mô hình triển khai kiến trúc đa thuê bao',['Mô hình','Cách bố trí tài nguyên','Ưu điểm chính','Đánh đổi kỹ thuật & chi phí'],[
['Silo','App Instance và DB riêng theo tenant','Cô lập mạnh; dễ sao lưu và khôi phục riêng','TCO tăng nhanh theo số tenant; tốn công bảo trì nhiều môi trường.'],
['Pool','App Server Instance và bảng dữ liệu dùng chung','Tối ưu TCO nhờ chia sẻ tài nguyên; khởi tạo tenant tức thì bằng dữ liệu','Đòi hỏi kiểm soát chặt TenantContext, Tenant ID và RLS để ngăn rò rỉ chéo.'],
['Bridge','App Server Instance chung; Schema hoặc DB tách riêng','Chia sẻ tầng tính toán nhưng vẫn tách đơn vị lưu trữ dữ liệu','Phải định tuyến kết nối động và quản lý migration trên nhiều Schema/DB.'],
['Hybrid','Kết hợp Pool (nhóm phổ thông) và Silo (nhóm đặc thù)','Đáp ứng đồng thời nhiều phân khúc khách hàng','Tăng độ phức tạp điều phối, định tuyến và vận hành song song.']],[2.0,3.8,4.2,5.0]),

'2.2.1':('Bảng 2.2 Đối chiếu ba phương án tổ chức lưu trữ dữ liệu đa thuê bao',['Phương án lưu trữ','Đơn vị phân tách','Đặc điểm vận hành và lý do lựa chọn'],[
['Database-per-Tenant','Database vật lý/logic riêng','Cô lập cao nhưng tốn kết nối và chi phí quản trị nhiều DB.'],
['Schema-per-Tenant','Schema riêng trong cùng DB','Tách bảng theo tên không gian nhưng phức tạp khi số lượng schema lớn.'],
['Shared-Database / Shared-Schema','Bảng chung gắn cột khóa tenant_id','Tối ưu chia sẻ tài nguyên; được đề tài lựa chọn kết hợp khóa ngoại kép và RLS để chứng minh Cấp độ 3.']],[4.3,3.7,7.0]),

'2.3.1':('Bảng 2.3 So sánh các kịch bản kiến trúc và căn cứ lựa chọn cho đề tài',['Kịch bản ưu tiên','Mô hình phù hợp','Điều kiện áp dụng và định vị đối với đề tài'],[
['Tối ưu TCO & khởi tạo nhanh','Pool (Cấp độ 3)','Nghiệp vụ cốt lõi thống nhất, tùy biến qua Metadata; phù hợp trực tiếp với bài toán các nhóm nghiên cứu/lớp học của đề tài.'],
['Vận hành & sao lưu độc lập','Silo hoặc Bridge','Khách hàng yêu cầu tách biệt cơ sở dữ liệu vật lý; chi phí vận hành cao.'],
['Đa phân khúc khách hàng','Hybrid (Hướng Cấp độ 4)','Kết hợp thuê bao dùng chung và thuê bao VIP dùng môi trường riêng; phù hợp khi thương mại hóa quy mô lớn.']],[3.6,3.4,8.0]),

'2.4.1':('Bảng 2.4 Ba nhóm tiêu chí cốt lõi chứng minh ứng dụng đạt chuẩn Cấp độ 3',['Nhóm tiêu chí Cấp độ 3','Yêu cầu kỹ thuật cần chứng minh trên ứng dụng Demo'],[
['1. Mã nguồn chung & tùy biến runtime qua Metadata','Chỉ duy trì một Codebase duy nhất; khi quản trị viên Tenant A thay đổi cấu hình giao diện hoặc quy tắc WIP lúc ứng dụng đang chạy, hành vi của A thay đổi ngay lập tức mà không cần build lại hay khởi động lại server, còn Tenant B không bị ảnh hưởng.'],
['2. Một instance phục vụ đồng thời nhiều thuê bao','Một Application Server Instance duy nhất tiếp nhận và xử lý đồng thời các yêu cầu từ nhiều tổ chức (Tenant A, Tenant B); log hệ thống chứng minh cùng một instance_id xử lý đúng ngữ cảnh từng tenant.'],
['3. Cơ sở dữ liệu dùng chung có phân vùng logic','Một Database PostgreSQL dùng chung lưu dữ liệu của tất cả tenant trong cùng các bảng vật lý có gắn cột tenant_id; khóa ngoại kép, TenantContext và RLS chặn hoàn toàn mọi truy cập hoặc liên kết chéo tenant.']],[4.6,10.4]),

'3.1.2':('Bảng 3.1 Các nhóm yêu cầu chức năng của ứng dụng Demo Kanban Cấp độ 3',['Mã','Nhóm chức năng','Mô tả phạm vi trong ranh giới thuê bao (Workspace)'],[
['F1','Quản lý thuê bao (Tenant)','Khởi tạo workspace mới bằng dữ liệu, cấu hình mặc định và quản lý trạng thái hoạt động.'],
['F2','Quản lý thành viên (Membership)','Mời người dùng vào workspace, gán vai trò (Tenant Admin / Member) và thu hồi quyền.'],
['F3','Quản lý dự án và bảng Kanban','Tạo, xem, cập nhật dự án, bảng (board) và các cột trạng thái công việc trong phạm vi tenant.'],
['F4','Quản lý thẻ công việc (Card)','Tạo thẻ, giao người phụ trách cùng workspace, kéo thả chuyển cột, kiểm soát version và hạn hoàn thành.'],
['F5','Tùy biến workspace (Metadata)','Thay đổi tên hiển thị, màu sắc nhận diện workspace và bật/tắt quy tắc giới hạn WIP ngay lúc chạy (runtime).'],
['F6','Tệp đính kèm và thông báo','Đính kèm tệp và gửi thông báo nhắc việc gắn chặt với tenant_id của công việc.']],[1.2,4.6,9.2]),

'3.2.2':('Bảng 3.2 Vai trò và ràng buộc cô lập của các bảng trong cơ sở dữ liệu dùng chung',['Bảng dữ liệu','Vai trò lưu trữ','Ràng buộc cô lập theo Tenant ID'],[
['tenant','Thông tin tổ chức / workspace','Khóa chính tenant_id duy nhất; quản lý trạng thái hoạt động.'],
['app_user, membership','Tài khoản cá nhân và tư cách thành viên','Khóa duy nhất (tenant_id, user_id); xác định vai trò trong từng tenant.'],
['tenant_config','Lưu trữ siêu dữ liệu (Metadata runtime)','Khóa (tenant_id) gắn với version, ui_config và rules của từng tổ chức.'],
['project, board, kanban_column','Cấu trúc dự án, bảng và cột Kanban','Tất cả đều mang cột tenant_id; khóa ngoại cha–con bắt buộc khớp cùng tenant_id.'],
['card','Thẻ công việc, người thực hiện, version','Tham chiếu cột và thành viên trong cùng tenant_id; hỗ trợ kiểm soát đồng thời.'],
['attachment, notification, activity_log','Tệp đính kèm, thông báo và nhật ký','Gắn tenant_id; chỉ thành viên có quyền trong cùng workspace mới được truy cập.']],[4.2,4.4,6.4]),

'3.3.1':('Bảng 3.3 Ma trận phân quyền chức năng theo tác nhân',['Thao tác nghiệp vụ','Quản trị hệ thống','Quản trị tenant (Admin)','Thành viên (Member)'],[
['Khởi tạo hoặc tạm ngưng tenant','Được phép','Không','Không'],
['Quản lý thành viên & cập nhật Metadata','Không qua API nghiệp vụ','Chỉ trong tenant của mình','Không'],
['Tạo, cấu hình hoặc xóa dự án / board','Không qua API nghiệp vụ','Chỉ trong tenant của mình','Không'],
['Xem dự án, board và thẻ công việc','Không mặc định','Chỉ trong tenant của mình','Chỉ trong tenant đã tham gia'],
['Tạo, di chuyển thẻ và tải tệp đính kèm','Không mặc định','Theo quy tắc Metadata của tenant','Theo quyền và quy tắc Metadata của tenant']],[4.3,3.5,3.6,3.6]),

'3.5.2':('Bảng 3.4 Ma trận kịch bản thực nghiệm chứng minh ba tiêu chí Cấp độ 3',['Mã','Tiêu chí Cấp độ 3','Kịch bản thao tác thực nghiệm','Kết quả kỳ vọng cần chứng minh'],[
['K1','Một Instance & DB chung','Khởi tạo Tenant A và Tenant B trên hệ thống đang chạy','Chỉ phát sinh bản ghi dữ liệu mới; không tạo thêm tiến trình backend hay database mới.'],
['K2','Một Instance phục vụ nhiều Tenant','Gửi đồng thời các yêu cầu thao tác Kanban từ Tenant A và Tenant B','Log ghi nhận cùng một instance_id xử lý cả hai luồng; dữ liệu trả về đúng từng workspace.'],
['K3','Tùy biến runtime qua Metadata','Tenant Admin A đổi màu giao diện và bật giới hạn WIP = 2 khi server đang chạy','Yêu cầu tiếp theo của A áp dụng ngay màu mới và chặn thẻ thứ 3; Tenant B giữ nguyên cấu hình cũ.'],
['K4','Cô lập dữ liệu (Chống đọc/ghi chéo)','Dùng token của User A gửi API đọc, sửa hoặc xóa card_id thuộc Tenant B','Hệ thống từ chối (403/404); bản ghi của Tenant B trong bảng chung hoàn toàn không thay đổi.'],
['K5','Cô lập ngữ cảnh (Chống giả mạo)','Gửi request thiếu tenant, giả mạo header tenant B (khi chỉ thuộc A) hoặc chèn tenant_id=B vào body','Bộ lọc xác thực Membership chặn ngay hoặc backend ghi đè theo TenantContext đã xác minh.'],
['K6','Quản lý vòng đời TenantContext','Gây lỗi/rollback ở request của Tenant A rồi gửi tiếp request của Tenant B trên cùng thread pool','Khối finally và SET LOCAL đảm bảo hoàn toàn không rò rỉ ngữ cảnh của A sang request của B.'],
['K7','Toàn vẹn quan hệ cùng Tenant','Thử gán card của Tenant A vào column_id của Tenant B hoặc giao cho user không thuộc A','Ràng buộc khóa ngoại kép (tenant_id, id) và tầng nghiệp vụ từ chối giao dịch.'],
['K8','Thực thi nhất quán Metadata dưới tải','Hai thành viên của Tenant A cùng lúc kéo thẻ vào cột đang còn 1 chỗ trống theo WIP limit','Cơ chế khóa giao dịch chỉ cho phép đúng 1 thẻ vào cột, đảm bảo không vượt ngưỡng WIP trong Metadata.']],[1.0,3.2,5.3,5.5]),
}

# Cover metadata retained from Report.docx
center('BỘ GIÁO DỤC VÀ ĐÀO TẠO',13,True)
center('TRƯỜNG ĐẠI HỌC CẦN THƠ',14,True)
center('TRƯỜNG CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG',12,True)
center('BÁO CÁO NGHIÊN CỨU KHOA HỌC SINH VIÊN',15,True,before=65,after=30)
p('XÂY DỰNG ỨNG DỤNG\nQUẢN LÝ CÔNG VIỆC\nTHEO KIẾN TRÚC ĐA THUÊ BAO','Title')
center('Mã số đề tài THS2026-67',13,before=12,after=35)
center('Chủ nhiệm đề tài  Ngô Hưng Thịnh',13)
center('Giảng viên hướng dẫn  TS. Ngô Bá Hùng',13,after=20)
center('Sinh viên thực hiện',13,True)
for name in ['Ngô Hưng Thịnh','Nguyễn Thanh Trọng','Trang Minh Chánh','Huỳnh Hồng Ân','Cao Tường Hưng']:center(name,13,after=3)
center('Cần Thơ tháng 11 năm 2026',13,before=45)

prehead('Tóm tắt')
p('Đề tài nghiên cứu kiến trúc đa thuê bao (Multi-Tenancy) thông qua bài toán xây dựng ứng dụng quản lý công việc Kanban cho các nhóm học tập và nghiên cứu trong trường đại học. Bám sát mô hình bốn cấp độ trưởng thành kiến trúc SaaS của Chong & Carraro làm kim chỉ nam, báo cáo chuẩn hóa các khái niệm nền tảng (Tenant, User, Membership, Web/Application/Database Server Instance, Tenant ID, Metadata), phân tích chi phí sở hữu (TCO) từ góc nhìn nhà cung cấp dịch vụ, đồng thời mô hình hóa trực quan từng cách tổ chức hệ thống (ST, MI, MU, MT) và từng cấp độ trưởng thành (Cấp độ 1 đến Cấp độ 4). Trên cơ sở đó, đề tài xác định mục tiêu trọng tâm là thiết kế, xây dựng và kiểm chứng ứng dụng Demo đạt chuẩn Cấp độ 3 (Configurable, Multi-Tenant-Efficient), đáp ứng đầy đủ ba tiêu chí cốt lõi: (1) dùng chung một bộ mã nguồn chuẩn và tùy biến động ngay tại thời điểm chạy (runtime) thông qua siêu dữ liệu (Metadata); (2) một Application Server Instance duy nhất phục vụ đồng thời nhiều tổ chức thuê bao; và (3) một cơ sở dữ liệu PostgreSQL dùng chung được phân vùng logic bằng khóa định danh Tenant ID kết hợp quản lý cô lập ngữ cảnh (TenantContext) và chính sách Row-Level Security (RLS). Cấp độ 4 với cân bằng tải, mở rộng ngang qua cụm container/pods và cơ sở dữ liệu phân tán được định hình rõ làm hướng phát triển trong tương lai.')
p('Từ khóa: kiến trúc đa thuê bao (Multi-Tenancy); SaaS Maturity Model (Cấp độ 3); Kanban; Tenant ID; TenantContext; Metadata runtime.')
pp=p('Mở đầu');pp.runs[0].bold=True;pp.paragraph_format.space_before=Pt(14)
p('Trong môi trường đại học, các nhóm nghiên cứu khoa học, nhóm đồ án và lớp học phần đều có nhu cầu sử dụng công cụ quản lý công việc trực quan theo phương pháp Kanban. Nếu triển khai theo mô hình đơn thuê bao truyền thống (mỗi nhóm một bản cài đặt và cơ sở dữ liệu riêng), chi phí vận hành và bảo trì của đơn vị cung cấp dịch vụ sẽ tăng nhanh khi số lượng nhóm tăng lên. Ngược lại, nếu chỉ xây dựng một ứng dụng đa người dùng (Multi-User) thông thường, các nhóm sẽ không có không gian quản trị thành viên độc lập cũng như không thể tự cấu hình giao diện và quy tắc làm việc riêng (như giới hạn số công việc đang thực hiện – WIP limit).')
p('Từ thực tế đó, mục tiêu của đề tài là nghiên cứu cơ sở lý thuyết kiến trúc đa thuê bao và thiết kế, xây dựng thành công một ứng dụng quản lý công việc Kanban đạt chuẩn Cấp độ 3 (Configurable, Multi-Tenant-Efficient) theo mô hình trưởng thành của Chong & Carraro, đồng thời đề xuất định hướng mở rộng lên Cấp độ 4. Báo cáo được cấu trúc cô đọng gồm 3 chương: Chương 1 trình bày cơ sở lý thuyết, đồ thị TCO, hệ thống khái niệm và các sơ đồ phân tích chi tiết cho ST, MI, MU, MT cùng 4 cấp độ trưởng thành; Chương 2 phân tích các mô hình triển khai (Silo, Pool, Bridge, Hybrid), cơ chế cô lập dữ liệu – ngữ cảnh và chốt cấu hình Cấp độ 3 cho đề tài; Chương 3 trình bày thiết kế kiến trúc, cơ sở dữ liệu, cơ chế tùy biến Metadata runtime và ma trận kịch bản kiểm chứng thực nghiệm chứng minh ứng dụng đạt chuẩn Cấp độ 3.')

prehead('Mục lục')
field(p(''),'TOC \\o "1-3" \\h \\z \\u','Mục lục được cập nhật trong Microsoft Word.')
prehead('Danh mục hình')
for info in MAN:
    pp=p(info['caption']);pp.paragraph_format.line_spacing=1.05;pp.paragraph_format.space_after=Pt(5)
    for r in pp.runs:r.font.size=Pt(11)

outline=[]
for raw in (ROOT/'dany.md').read_text(encoding='utf-8').splitlines():
    line=raw.strip().strip('*').strip()
    if not line:continue
    if line.startswith('CHƯƠNG'):
        ch=re.match(r'CHƯƠNG\s+(\d+)',line).group(1)
        head(line,1);p(INTRO[ch]);outline.append(line)
        continue
    match=re.match(r'^(\d+\.\d+(?:\.\d+)?)\.\s+(.+)$',line)
    if not match:raise ValueError('Unrecognized outline: '+line)
    key=match.group(1);level=3 if key.count('.')==2 else 2
    head(line,level);outline.append(line)
    if key in P:
        parts=P[key]
        sec_figs=[info for info in MAN if info['section']==key]
        for idx,text in enumerate(parts):
            p(text)
            for info in sec_figs:
                target_idx=min(info.get('after',0),len(parts)-1)
                if target_idx==idx:
                    figure(info)
    if key in TABLES:table(*TABLES[key])

head('TÀI LIỆU THAM KHẢO',1)
for ref in REFERENCES:
    pp=p(ref);pp.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.LEFT;pp.paragraph_format.keep_together=True
    for r in pp.runs:r.font.size=Pt(12)
p('Các tài liệu kỹ thuật trực tuyến [5]–[10] được đối chiếu ngày 09/11/2026. Hệ thống 27 sơ đồ kỹ thuật trong báo cáo được chuẩn hóa đồng bộ theo bộ khái niệm nền tảng và 4 cấp độ trưởng thành SaaS.')
footer=sec.footer.paragraphs[0];footer.alignment=WD_ALIGN_PARAGRAPH.CENTER
field(footer,'PAGE','1')
settings=doc.settings.element
uf=OxmlElement('w:updateFields');uf.set(qn('w:val'),'true');settings.append(uf)
for element in [doc.styles.element,doc.element]:
    for b in element.xpath('.//w:pBdr'):b.getparent().remove(b)

doc.save(OUT)
shutil.copy2(OUT, OUT_DANY)
shutil.copy2(OUT, OUT_RESEARCH)

# Clean stale figure files not in current manifest and update zip archive
valid_stems = {info['stem'] for info in MAN}
for sub, suffix in [('drawio', '.drawio'), ('png', '.png'), ('svg', '.svg'), ('editable-png', '.drawio.png')]:
    folder = BASE / 'figures' / sub
    if folder.exists():
        for fp in list(folder.iterdir()):
            if fp.is_file() and fp.name.endswith(suffix):
                stem = fp.name[:-len(suffix)]
                if stem not in valid_stems:
                    fp.unlink()

zip_path = ROOT / 'Bo hinh bao cao NCKH.zip'
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(BASE / 'figures' / 'manifest.json', 'manifest.json')
    for info in MAN:
        stem = info['stem']
        for sub, ext in [('png', '.png'), ('svg', '.svg'), ('drawio', '.drawio'), ('editable-png', '.drawio.png')]:
            fp = BASE / 'figures' / sub / (stem + ext)
            if fp.exists():
                zf.write(fp, f'{sub}/{fp.name}')

# Update diagrams/danh-muc-hinh.md
lines = ['# Danh mục 27 hình trong Báo cáo NCKH (Đã bổ sung chi tiết ST/MI/MU/MT và 4 Cấp độ trưởng thành)\n']
for idx, info in enumerate(MAN, 1):
    lines.append(f"{idx}. **{info['caption']}** (Mục `{info['section']}` — file `{info['stem']}.png`)")
    lines.append(f"   - *Ý nghĩa:* {info['meaning']}")
(ROOT / 'diagrams' / 'danh-muc-hinh.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')

facts={'output':str(OUT),'source_report_sha256':hashlib.sha256((ROOT/'Report.docx').read_bytes()).hexdigest(),'outline_headings':outline,'outline_heading_count':len(outline),'prose_words':sum(len(x.split()) for ps in P.values() for x in ps),'figures':len(doc.inline_shapes),'tables':len(doc.tables),'design_status':'Streamlined outline (Option 1) + 27 synchronized technical diagrams (Option 3)'}
(BASE/'build-summary.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2),encoding='utf-8')
(BASE/'artifact.md').write_text('Design authority: Report.docx typography and institutional metadata; dany.md streamlined chapter and subsection order (Option 1). A4, Times New Roman 13 pt, 1.25 line spacing, left margin 3.5 cm. Includes 27 editable technical diagrams covering individual ST, MI, MU, MT diagrams + overall comparison and individual Maturity Levels 1-4 + overall comparison.\n',encoding='utf-8')
print(json.dumps({k:v for k,v in facts.items() if k!='outline_headings'},ensure_ascii=False),flush=True)

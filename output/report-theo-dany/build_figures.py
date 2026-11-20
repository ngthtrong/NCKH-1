from pathlib import Path
import xml.etree.ElementTree as ET
import json, subprocess, sys, importlib.util, math

BASE=Path(__file__).resolve().parent
FIG=BASE/'figures'
SRC=FIG/'drawio'; PNG=FIG/'png'; SVG=FIG/'svg'
for d in (SRC,PNG,SVG): d.mkdir(parents=True,exist_ok=True)
EXE=Path(r'D:\NCKH\.diagram-tools\drawio\draw.io.exe')
PALETTE={'blue':('#EDF3F8','#57748C'),'green':('#EAF4EC','#5C8168'),'orange':('#FFF3E6','#AF7D46'),'purple':('#F1EDF7','#837294'),'grey':('#F5F5F5','#7D858B'),'red':('#FAEEEC','#AE756C')}
MAN=[]

class G:
    def __init__(self,stem,title,w=1100,h=600):
        self.stem=stem; self.w=w; self.h=h; self.n=2
        self.xml=ET.Element('mxfile',host='drawio',version='32.6.10')
        dia=ET.SubElement(self.xml,'diagram',id=stem,name=title)
        model=ET.SubElement(dia,'mxGraphModel',grid='1',gridSize='10',page='0',background='#ffffff',math='0',shadow='0')
        self.root=ET.SubElement(model,'root')
        ET.SubElement(self.root,'mxCell',id='0'); ET.SubElement(self.root,'mxCell',id='1',parent='0')
        # Fixed frame guarantees stable aspect ratios across exports.
        self.cell('',0,0,w,h,'fillColor=none;strokeColor=none;pointerEvents=0;',kind='frame')
    def cell(self,label,x,y,w,h,style='',parent='1',kind='node'):
        i=str(self.n);self.n+=1
        base='html=1;whiteSpace=wrap;fontFamily=Arial;fontColor=#16232D;fontSize=24;spacing=10;align=center;verticalAlign=middle;'
        c=ET.SubElement(self.root,'mxCell',id=i,value=label,style=base+style,vertex='1',parent=parent)
        ET.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),**{'as':'geometry'})
        return i
    def text(self,label,x,y,w,h,size=24,bold=False,align='center'):
        return self.cell(label,x,y,w,h,f'text;strokeColor=none;fillColor=none;fontSize={size};fontStyle={1 if bold else 0};align={align};spacing=0;')
    def box(self,label,x,y,w,h,color='blue',db=False,ellipse=False,size=23):
        fill,stroke=PALETTE[color]
        shape='shape=cylinder3;size=15;boundedLbl=1;' if db else ('ellipse;' if ellipse else 'rounded=1;arcSize=8;')
        return self.cell(label,x,y,w,h,shape+f'fontSize={size};fillColor={fill};strokeColor={stroke};strokeWidth=1.8;')
    def group(self,label,x,y,w,h,color='blue',dash=False,size=21):
        fill,stroke=PALETTE[color]
        return self.cell(label,x,y,w,h,f'swimlane;startSize=42;container=1;pointerEvents=0;collapsible=0;horizontal=1;fontSize={size};fontStyle=1;fillColor={fill};swimlaneFillColor=#FFFFFF;strokeColor={stroke};strokeWidth=2;'+('dashed=1;' if dash else ''))
    def edge(self,a,b,label='',exit=(.5,1),entry=(.5,0),pts=None,dashed=False,arrow='block',color='#425C70'):
        i=str(self.n);self.n+=1
        sty=f'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;fontFamily=Arial;fontSize=20;fontColor=#16232D;labelBackgroundColor=#FFFFFF;strokeColor={color};strokeWidth=2;endArrow={arrow};endFill=1;exitX={exit[0]};exitY={exit[1]};entryX={entry[0]};entryY={entry[1]};'+('dashed=1;' if dashed else '')
        c=ET.SubElement(self.root,'mxCell',id=i,value=label,style=sty,edge='1',parent='1',source=a,target=b)
        geo=ET.SubElement(c,'mxGeometry',relative='1',**{'as':'geometry'})
        if pts:
            arr=ET.SubElement(geo,'Array',**{'as':'points'})
            for x,y in pts: ET.SubElement(arr,'mxPoint',x=str(x),y=str(y))
        return i
    def line(self,x1,y1,x2,y2,color='#425C70',dashed=False,arrow='none',width=2,label=''):
        i=str(self.n);self.n+=1
        c=ET.SubElement(self.root,'mxCell',id=i,value=label,style=f'html=1;rounded=0;endArrow={arrow};endFill=1;strokeColor={color};strokeWidth={width};'+('dashed=1;' if dashed else ''),edge='1',parent='1')
        geo=ET.SubElement(c,'mxGeometry',relative='1',**{'as':'geometry'})
        ET.SubElement(geo,'mxPoint',x=str(x1),y=str(y1),**{'as':'sourcePoint'})
        ET.SubElement(geo,'mxPoint',x=str(x2),y=str(y2),**{'as':'targetPoint'})
        return i
    def save(self,caption,section,meaning,after=0):
        path=SRC/(self.stem+'.drawio'); ET.indent(self.xml,space='  ');ET.ElementTree(self.xml).write(path,encoding='utf-8',xml_declaration=True)
        MAN.append({'stem':self.stem,'caption':caption,'section':section,'meaning':meaning,'width':self.w,'height':self.h,'after':after})

# 1.1: history is an explanatory lineage, not a mandatory replacement sequence.
g=G('hinh_1_1_tien_trinh','Tiến trình chia sẻ tài nguyên',1100,430)
items=[('Time-sharing','Chia sẻ thời gian CPU'),('ASP','Vận hành ứng dụng từ xa'),('Web multi-user','Nhiều tài khoản người dùng'),('SaaS multi-tenant','Ngữ cảnh và cấu hình tổ chức')]
ids=[]
for i,(a,b) in enumerate(items):
    ids.append(g.box(a+'\n'+b,20+i*275,100,235,180,'blue'))
for i in range(3):g.edge(ids[i],ids[i+1],exit=(1,.5),entry=(0,.5))
g.text('Trọng tâm chia sẻ chuyển từ năng lực tính toán sang ứng dụng có quản trị theo tổ chức.',30,325,1040,70,23)
g.save('Hình 1.1 Các hướng phát triển của mô hình chia sẻ tài nguyên','1.1.1','Các mô hình có thể cùng tồn tại; mũi tên biểu diễn sự kế thừa ý tưởng.',after=1)

# 1.2: conceptual cost chart. Coordinates carry no measured numeric values.
g=G('hinh_1_2_tco','Chi phí sở hữu của nhà cung cấp',1100,720)
g.text('Chi phí sở hữu của nhà cung cấp dịch vụ (chủ đầu tư) trong cùng kỳ đánh giá',40,15,1020,50,26,True)
g.line(110,580,1040,580,arrow='block',width=2)
g.line(110,580,110,100,arrow='block',width=2)
g.text('Tổng chi phí sở hữu – TCO (Nhà cung cấp)',125,82,560,50,25,True,align='left')
g.line(110,540,980,170,color='#2B658E',width=4)
g.line(110,400,980,310,color='#A25F34',width=4)
cx=110+870*(140/280);cy=540-370*(140/280)
g.line(cx,cy,cx,580,dashed=True,color='#7D858B')
g.cell('',cx-5,cy-5,10,10,'ellipse;fillColor=#16232D;strokeColor=#16232D;')
g.text('n* (Điểm giao)',cx-85,585,175,35,23,True)
g.text('Single-tenant',760,130,260,50,26,True)
g.text('Multi-tenant',750,245,260,50,26,True)
g.text('Trước điểm giao (Quy mô nhỏ)\nSingle-tenant rẻ hơn do chưa tốn\nchi phí đầu tư nền tảng đa thuê bao',135,180,390,105,22)
g.text('Sau điểm giao (Quy mô thuê bao lớn)\nMulti-tenant tiết kiệm hơn nhờ\ncơ chế chia sẻ tài nguyên chung',620,420,400,105,22)
g.text('Quy mô / Số lượng khách hàng thuê dịch vụ (Tenant)',130,625,900,45,25,True)
g.text('Đồ thị khái niệm xét từ góc nhìn nhà cung cấp dịch vụ; vị trí n* phụ thuộc giả định chi phí và tải thực tế.',40,680,1020,35,21)
g.save('Hình 1.2 Chi phí sở hữu (TCO) của nhà cung cấp dịch vụ theo quy mô thuê bao','1.1.2','Trục hoành là số tổ chức thuê dịch vụ; trục tung là tổng chi phí của nhà cung cấp; n* là điểm giao cân bằng chi phí.',after=1)

# 1.3: Detailed Single-Tenant (ST) diagram based on foundational concepts.
g=G('hinh_1_3_st','Mô hình Đơn thuê bao (Single-Tenant – ST)',1100,630)
g.group('Môi trường dành riêng của Tenant A',30,20,490,535,'blue',dash=True)
ta=g.box('Tenant A (Tổ chức A)\nMembership: Admin A, User A1',65,80,420,95,'blue')
appa=g.box('App Server Instance A\nChạy với cấu hình riêng của A',65,240,420,100,'purple')
dba=g.box('Database Server / Database A\nDữ liệu độc lập của Tenant A',85,405,380,120,'green',True)
g.edge(ta,appa,'Request của A');g.edge(appa,dba,'Kết nối DB riêng')

g.group('Môi trường dành riêng của Tenant B',580,20,490,535,'orange',dash=True)
tb=g.box('Tenant B (Tổ chức B)\nMembership: Admin B, User B1',615,80,420,95,'orange')
appb=g.box('App Server Instance B\nChạy với cấu hình riêng của B',615,240,420,100,'purple')
dbb=g.box('Database Server / Database B\nDữ liệu độc lập của Tenant B',635,405,380,120,'green',True)
g.edge(tb,appb,'Request của B');g.edge(appb,dbb,'Kết nối DB riêng')
g.text('Mỗi Tenant sở hữu đơn vị App Server Instance và Database riêng tại tầng đang xét; không chia sẻ tiến trình hoặc bảng dữ liệu.',20,570,1060,45,21)
g.save('Hình 1.3 Sơ đồ chi tiết mô hình Đơn thuê bao (Single-Tenant – ST)','1.3.1','Mỗi tổ chức thuê bao sử dụng App Server Instance và Database riêng biệt ở tầng đang xét.')

# 1.4: Detailed Multi-Instance (MI) diagram showing both deployment meanings.
g=G('hinh_1_4_mi','Mô hình Đa instance (Multi-Instance – MI)',1100,640)
g.group('TH1: Mỗi App Instance phục vụ riêng 1 Tenant',25,20,510,545,'grey',dash=True,size=20)
ta=g.box('Tenant A\nUser A1, A2',45,80,215,85,'blue',size=22)
tb=g.box('Tenant B\nUser B1, B2',295,80,215,85,'orange',size=22)
i1=g.box('App Server\nInstance 1',45,235,215,95,'purple',size=22)
i2=g.box('App Server\nInstance 2',295,235,215,95,'purple',size=22)
dba=g.box('Database A',45,405,215,115,'green',True,size=22)
dbb=g.box('Database B',295,405,215,115,'green',True,size=22)
g.edge(ta,i1);g.edge(i1,dba);g.edge(tb,i2);g.edge(i2,dbb)

g.group('TH2: Nhiều App Instance cùng chia sẻ tải',565,20,510,545,'blue',size=20)
u=g.box('Các yêu cầu truy cập dịch vụ\n(Từ một hoặc nhiều Tenant / User)',600,80,440,85,'blue',size=22)
i3=g.box('App Server\nInstance 1',590,235,215,95,'purple',size=22)
i4=g.box('App Server\nInstance 2',835,235,215,95,'purple',size=22)
dbc=g.box('Database Server / Nguồn dữ liệu dùng chung',615,405,410,115,'green',True,size=22)
g.edge(u,i3,exit=(.25,1),entry=(.5,0));g.edge(u,i4,exit=(.75,1),entry=(.5,0))
g.edge(i3,dbc,exit=(.5,1),entry=(.25,0));g.edge(i4,dbc,exit=(.5,1),entry=(.75,0))
g.text('Multi-Instance (MI) chỉ mô tả việc có nhiều App Server Instance đang chạy; cần nêu rõ quan hệ với Tenant và Database.',20,580,1060,45,21)
g.save('Hình 1.4 Sơ đồ chi tiết mô hình Đa instance (Multi-Instance – MI)','1.3.2','MI phản ánh số lượng bản ứng dụng đang chạy, có thể gắn riêng theo tenant hoặc cùng chia sẻ một nguồn dữ liệu.')

# 1.5: Detailed Multi-User (MU) diagram contrasting individual accounts vs organizational tenants.
g=G('hinh_1_5_mu','Mô hình Đa người dùng (Multi-User – MU)',1100,630)
g.group('Tập người dùng cá nhân (Định danh 1 lớp theo user_id — Không chia theo Tenant)',70,20,960,155,'grey',size=20)
u1=g.box('User 1\n(user_id = 1)',105,78,260,75,'blue',size=22)
u2=g.box('User 2\n(user_id = 2)',420,78,260,75,'blue',size=22)
u3=g.box('User 3\n(user_id = 3)',735,78,260,75,'blue',size=22)
app=g.box('Một Web / App Server Instance dùng chung\nXác thực tài khoản cá nhân · Giao diện và quy tắc nghiệp vụ chung cho toàn hệ thống',130,240,840,120,'purple',size=22)
db=g.box('Database Server / Một Database dùng chung\nBảng dữ liệu gắn user_id · Không có phân vùng tổ chức (tenant_id) hay Metadata theo thuê bao',160,425,780,125,'green',True,size=22)
g.edge(u1,app,exit=(.5,1),entry=(.2,0));g.edge(u2,app,exit=(.5,1),entry=(.5,0));g.edge(u3,app,exit=(.5,1),entry=(.8,0))
g.edge(app,db,'Truy vấn theo user_id')
g.text('Nhiều cá nhân cùng dùng chung ứng dụng và database, nhưng không có quyền quản trị cấu hình và ranh giới dữ liệu cấp tổ chức (Tenant).',15,570,1070,45,21)
g.save('Hình 1.5 Sơ đồ chi tiết mô hình Đa người dùng (Multi-User – MU)','1.3.3','Nhiều cá nhân truy cập trên cùng một ứng dụng nhưng không hình thành các không gian tổ chức thuê bao độc lập.')

# 1.6: Detailed Multi-Tenant (MT) diagram showing Tenant, Membership, App Instance, TenantContext, Metadata, and Tenant ID.
g=G('hinh_1_6_mt','Mô hình Đa thuê bao (Multi-Tenant – MT)',1100,690)
g.group('Tenant A (Tổ chức / Workspace A)',40,15,470,145,'blue')
ta=g.box('Admin A, User A1, User A2\nMembership gắn tenant_id = A',65,68,420,75,'blue',size=21)
g.group('Tenant B (Tổ chức / Workspace B)',590,15,470,145,'orange')
tb=g.box('Admin B, User B1, User B2\nMembership gắn tenant_id = B',615,68,420,75,'orange',size=21)

sw_mt=g.group('Một Web / App Server Instance dùng chung (Nhận biết thuê bao – Tenant-Aware)',50,225,1000,175,'purple')
ctx=g.box('Xác lập TenantContext\n(tenant_id, user_id, role)',80,285,290,95,'purple',size=21)
meta=g.box('Áp dụng Metadata lúc chạy\n(Config A riêng | Config B riêng)',405,285,295,95,'orange',size=21)
biz=g.box('Thực thi nghiệp vụ chung\nKiểm soát quyền & phạm vi dữ liệu',735,285,285,95,'blue',size=21)
g.edge(ctx,meta,exit=(1,.5),entry=(0,.5));g.edge(meta,biz,exit=(1,.5),entry=(0,.5))

db=g.box('Database Server / Một Database dùng chung\nBảng Metadata (tenant_config) + Bảng nghiệp vụ chung phân vùng logic bằng tenant_id (A | B)',110,475,880,135,'green',True,size=22)
g.edge(ta,sw_mt,'Request + tenant A',exit=(.5,1),entry=(.23,0))
g.edge(tb,sw_mt,'Request + tenant B',exit=(.5,1),entry=(.77,0))
g.edge(meta,db,'Đọc Metadata',exit=(.5,1),entry=(.35,0),dashed=True)
g.edge(biz,db,'Truy vấn gắn tenant_id',exit=(.5,1),entry=(.78,0))
g.text('Nhiều tổ chức (Tenant) chia sẻ trong suốt App Server Instance và Database, nhưng cô lập dữ liệu bằng Tenant ID và tùy biến qua Metadata.',15,630,1070,45,21)
g.save('Hình 1.6 Sơ đồ chi tiết mô hình Đa thuê bao (Multi-Tenant – MT)','1.3.4','Nhiều tổ chức thuê bao dùng chung App Server Instance và Database với ngữ cảnh, Metadata và phân vùng dữ liệu riêng theo Tenant ID.')

# 1.7: Updated overall comparison diagram of ST, MI, MU, MT synchronized with 1.3-1.6.
g=G('hinh_1_7_st_mi_mu_mt','So sánh tổng quát ST MI MU MT',1100,880)
for i,title in enumerate(['Single-Tenant (ST) — Tách riêng theo tổ chức','Multi-Instance (MI) — Nhiều bản ứng dụng chạy','Multi-User (MU) — Nhiều cá nhân dùng chung','Multi-Tenant (MT) — Nhiều tổ chức dùng chung']):
    x=10+(i%2)*550;y=10+(i//2)*435
    g.group(title,x,y,530,415,'green' if i==3 else 'grey',size=20)
    if i==0:
        a1=g.box('Tenant A\n(User A1, A2)',x+25,y+60,215,75,'blue',size=20)
        a2=g.box('Tenant B\n(User B1, B2)',x+290,y+60,215,75,'orange',size=20)
        b1=g.box('App Instance A\n(Config A)',x+25,y+175,215,75,'purple',size=20)
        b2=g.box('App Instance B\n(Config B)',x+290,y+175,215,75,'purple',size=20)
        c1=g.box('DB A',x+25,y+290,215,80,'green',True,size=20)
        c2=g.box('DB B',x+290,y+290,215,80,'green',True,size=20)
        g.edge(a1,b1);g.edge(b1,c1);g.edge(a2,b2);g.edge(b2,c2)
        g.text('Mỗi Tenant có App Instance và DB riêng.',x+20,y+375,490,32,19)
    elif i==1:
        u=g.box('Yêu cầu từ một hoặc nhiều Tenant',x+40,y+60,450,70,'blue',size=20)
        a=g.box('App Server\nInstance 1',x+30,y+175,210,80,'purple',size=20)
        b=g.box('App Server\nInstance 2',x+290,y+175,210,80,'purple',size=20)
        c=g.box('Database riêng hoặc Database chung',x+75,y+290,380,80,'green',True,size=20)
        g.edge(u,a,exit=(.25,1),entry=(.5,0));g.edge(u,b,exit=(.75,1),entry=(.5,0))
        g.edge(a,c,exit=(.5,1),entry=(.25,0));g.edge(b,c,exit=(.5,1),entry=(.75,0))
        g.text('Chỉ đếm số bản chạy; không tự xác định số tenant.',x+20,y+375,490,32,19)
    elif i==2:
        a=g.box('User 1, User 2, User 3 (chỉ có user_id)',x+35,y+60,460,70,'blue',size=20)
        b=g.box('Một App Server Instance chung\n(Giao diện & cấu hình cố định chung)',x+35,y+170,460,80,'purple',size=20)
        c=g.box('Một Database chung (Gắn user_id, không có tenant_id)',x+35,y+285,460,85,'green',True,size=20)
        g.edge(a,b);g.edge(b,c)
        g.text('Phục vụ nhiều cá nhân trong cùng một phạm vi tổ chức.',x+15,y+375,500,32,19)
    else:
        a=g.box('Tenant A\n(User A1, A2)',x+25,y+60,215,75,'blue',size=20)
        b=g.box('Tenant B\n(User B1, B2)',x+290,y+60,215,75,'orange',size=20)
        c=g.box('Một App Server Instance chung\n(TenantContext + Metadata runtime)',x+35,y+170,460,80,'purple',size=20)
        d=g.box('Một Database chung (Phân vùng logic bằng tenant_id)',x+35,y+285,460,85,'green',True,size=20)
        g.edge(a,c,entry=(.25,0));g.edge(b,c,entry=(.75,0));g.edge(c,d)
        g.text('Chia sẻ Instance & DB; tách Metadata và dữ liệu theo Tenant.',x+10,y+375,510,32,18)
g.save('Hình 1.7 Sơ đồ so sánh tổng quát bốn mô hình ST, MI, MU và MT','1.3.5','Tổng hợp sự khác biệt về đơn vị định danh, mức chia sẻ App Server Instance, Database và khả năng tùy biến theo tổ chức.')

# 1.8: Detailed Level 1 (Ad Hoc / Custom) diagram.
g=G('hinh_1_8_cap_do_1','Cấp độ 1 – Ad Hoc / Custom',1100,640)
g.group('Nhánh triển khai tùy biến riêng cho Tenant A',25,20,510,545,'grey',dash=True,size=20)
ta=g.box('Tenant A\n(User A1, A2)',45,78,215,85,'blue',size=21)
ca=g.box('Mã nguồn riêng A\n(Custom Code A)',295,78,215,85,'orange',size=21)
ia=g.box('App Server Instance A\n(Biên dịch và chạy riêng cho A)',65,240,430,95,'purple',size=21)
da=g.box('Database Server / Database A\n(Dữ liệu dành riêng cho A)',85,405,390,120,'green',True,size=21)
g.edge(ta,ia,'Request A',exit=(.5,1),entry=(.25,0));g.edge(ca,ia,'Build riêng',exit=(.5,1),entry=(.75,0),dashed=True);g.edge(ia,da)

g.group('Nhánh triển khai tùy biến riêng cho Tenant B',565,20,510,545,'grey',dash=True,size=20)
tb=g.box('Tenant B\n(User B1, B2)',585,78,215,85,'orange',size=21)
cb=g.box('Mã nguồn riêng B\n(Custom Code B)',835,78,215,85,'orange',size=21)
ib=g.box('App Server Instance B\n(Biên dịch và chạy riêng cho B)',605,240,430,95,'purple',size=21)
db=g.box('Database Server / Database B\n(Dữ liệu dành riêng cho B)',625,405,390,120,'green',True,size=21)
g.edge(tb,ib,'Request B',exit=(.5,1),entry=(.25,0));g.edge(cb,ib,'Build riêng',exit=(.5,1),entry=(.75,0),dashed=True);g.edge(ib,db)
g.text('Cấp độ 1 (Ad Hoc / Custom): Mỗi khách hàng có một bản mã nguồn tùy biến riêng, chạy trên App Server Instance và Database riêng biệt.',15,580,1070,45,21)
g.save('Hình 1.8 Sơ đồ kiến trúc Cấp độ 1 – Ad Hoc / Custom','1.4.1','Mỗi khách hàng sử dụng một biến thể mã nguồn riêng cùng App Server Instance và Database độc lập.')

# 1.9: Detailed Level 2 (Configurable) diagram.
g=G('hinh_1_9_cap_do_2','Cấp độ 2 – Configurable',1100,690)
code=g.box('Một bộ mã nguồn chuẩn dùng chung (Single Codebase)',290,15,520,75,'blue',size=23)
swa=g.group('Bản chạy riêng của Tenant A',25,140,510,475,'grey',dash=True,size=20)
ta=g.box('Tenant A\n(User A1, A2)',45,198,215,85,'blue',size=21)
cfga=g.box('File cấu hình A\n(Config trước khi chạy)',295,198,215,85,'orange',size=20)
ia=g.box('App Server Instance A\n(Codebase chung + Config A)',65,345,430,90,'purple',size=21)
da=g.box('Database Server / Database A\n(Dành riêng cho A)',85,480,390,110,'green',True,size=21)
g.edge(ta,ia,'Request A',exit=(.5,1),entry=(.25,0));g.edge(cfga,ia,'Nạp lúc khởi động',exit=(.5,1),entry=(.75,0),dashed=True);g.edge(ia,da)

swb=g.group('Bản chạy riêng của Tenant B',565,140,510,475,'grey',dash=True,size=20)
tb=g.box('Tenant B\n(User B1, B2)',585,198,215,85,'orange',size=21)
cfgb=g.box('File cấu hình B\n(Config trước khi chạy)',835,198,215,85,'orange',size=20)
ib=g.box('App Server Instance B\n(Codebase chung + Config B)',605,345,430,90,'purple',size=21)
db=g.box('Database Server / Database B\n(Dành riêng cho B)',625,480,390,110,'green',True,size=21)
g.edge(tb,ib,'Request B',exit=(.5,1),entry=(.25,0));g.edge(cfgb,ib,'Nạp lúc khởi động',exit=(.5,1),entry=(.75,0),dashed=True);g.edge(ib,db)

g.edge(code,swa,'Cùng bản mã',exit=(.25,1),entry=(.5,0),dashed=True)
g.edge(code,swb,'Cùng bản mã',exit=(.75,1),entry=(.5,0),dashed=True)
g.text('Cấp độ 2 (Configurable): Dùng chung một Codebase và tùy biến qua file cấu hình trước khi chạy, nhưng mỗi Tenant vẫn có Instance và DB riêng.',15,630,1070,45,21)
g.save('Hình 1.9 Sơ đồ kiến trúc Cấp độ 2 – Configurable','1.4.2','Tất cả khách hàng dùng chung một Codebase chuẩn nhưng tùy biến bằng file cấu hình trước khi chạy trên các Instance và Database riêng.')

# 1.10: Detailed Level 3 (Configurable, Multi-Tenant-Efficient) diagram (Target Architecture).
g=G('hinh_1_10_cap_do_3','Cấp độ 3 – Configurable, Multi-Tenant-Efficient',1100,710)
ta=g.box('Tenant A (Tổ chức A)\nAdmin A, User A1, A2',40,15,320,88,'blue',size=21)
code=g.box('Một Codebase chuẩn duy nhất\n(Single Codebase)',390,15,320,88,'grey',size=21)
tb=g.box('Tenant B (Tổ chức B)\nAdmin B, User B1, B2',740,15,320,88,'orange',size=21)

sw3=g.group('Một Web / App Server Instance dùng chung (Phục vụ đồng thời nhiều Tenant)',40,175,1020,215,'green',size=21)
ctx=g.box('1. Xác minh ngữ cảnh\nTenantContext\n(tenant_id, user_id, role)',70,235,290,125,'purple',size=21)
meta=g.box('2. Tùy biến lúc chạy (Runtime)\nNạp Metadata theo tenant_id\n(Giao diện, quy tắc WIP...)',405,235,290,125,'orange',size=21)
biz=g.box('3. Thực thi nghiệp vụ chung\nXử lý request & truy vấn\ngắn khóa tenant_id',740,235,290,125,'blue',size=21)
g.edge(ctx,meta,exit=(1,.5),entry=(0,.5));g.edge(meta,biz,exit=(1,.5),entry=(0,.5))

mdb=g.box('Bảng Metadata dùng chung\n(tenant_config: Config A | Config B)',70,465,430,135,'orange',True,size=21)
ddb=g.box('Database Server / Bảng nghiệp vụ dùng chung\nPhân vùng logic bằng Tenant ID + RLS (Dữ liệu A | Dữ liệu B)',540,465,520,135,'green',True,size=21)

g.edge(ta,sw3,'Request A',exit=(.5,1),entry=(.15,0))
g.edge(code,sw3,'Triển khai',exit=(.5,1),entry=(.5,0),dashed=True)
g.edge(tb,sw3,'Request B',exit=(.5,1),entry=(.85,0))
g.edge(meta,mdb,'Đọc / cập nhật Metadata runtime',exit=(.5,1),entry=(.5,0),dashed=True)
g.edge(biz,ddb,'Truy vấn gắn tenant_id',exit=(.5,1),entry=(.65,0))
g.text('Cấp độ 3 (Mục tiêu đề tài): Dùng chung Codebase, một App Server Instance và một Database;\ntùy biến ngay tại thời điểm chạy (runtime) qua Metadata và cô lập dữ liệu logic bằng Tenant ID.',20,620,1060,65,21,True)
g.save('Hình 1.10 Sơ đồ kiến trúc Cấp độ 3 – Configurable, Multi-Tenant-Efficient (Mục tiêu đề tài)','1.4.3','Một App Server Instance và một Database dùng chung phục vụ đồng thời nhiều thuê bao; tùy biến lúc chạy qua Metadata và cô lập logic bằng Tenant ID.')

# 1.11: Detailed Level 4 (Scalable, Configurable, Multi-Tenant-Efficient) diagram (Future Direction).
g=G('hinh_1_11_cap_do_4','Cấp độ 4 – Scalable, Configurable, Multi-Tenant-Efficient',1100,720)
ta=g.box('Tenant A\n(User A1..An)',45,20,285,80,'blue',size=22)
tb=g.box('Tenant B\n(User B1..Bn)',405,20,290,80,'orange',size=22)
tn=g.box('Tenant C ... N\n(Quy mô thuê bao lớn)',770,20,285,80,'blue',size=22)
lb=g.box('Bộ cân bằng tải (Load Balancer / Điều phối yêu cầu nhận biết Tenant)',200,145,700,80,'orange',size=22)

sw4a=g.group('Cụm nhiều App Server Instances / Container Pods (Scale-out — Chung Codebase & Metadata)',45,270,1010,175,'purple',size=20)
p1=g.box('App Server Instance 1\n(Pod 1: TenantContext + Metadata)',75,325,295,95,'purple',size=20)
p2=g.box('App Server Instance 2\n(Pod 2: TenantContext + Metadata)',402,325,295,95,'purple',size=20)
p3=g.box('App Server Instance K\n(Pod K: TenantContext + Metadata)',730,325,295,95,'purple',size=20)

sw4b=g.group('Tầng Cơ sở dữ liệu mở rộng / Phân tán (Distributed / Sharded Database Server)',45,490,1010,155,'green',size=20)
db1=g.box('DB Server / Phân vùng 1\nMetadata & Dữ liệu gắn Tenant ID',95,538,415,90,'green',True,size=20)
db2=g.box('DB Server / Phân vùng 2 (Replica / Shard)\nMetadata & Dữ liệu gắn Tenant ID',590,538,415,90,'green',True,size=20)

g.edge(ta,lb,exit=(.5,1),entry=(.2,0));g.edge(tb,lb,exit=(.5,1),entry=(.5,0));g.edge(tn,lb,exit=(.5,1),entry=(.8,0))
g.edge(lb,sw4a,exit=(.2,1),entry=(.22,0));g.edge(lb,sw4a,exit=(.5,1),entry=(.5,0));g.edge(lb,sw4a,exit=(.8,1),entry=(.78,0))
g.edge(sw4a,sw4b,exit=(.25,1),entry=(.25,0));g.edge(sw4a,sw4b,exit=(.5,1),entry=(.5,0));g.edge(sw4a,sw4b,exit=(.75,1),entry=(.75,0))
g.text('Cấp độ 4 (Hướng phát triển): Kế thừa Cấp độ 3, bổ sung Load Balancer, mở rộng ngang cụm App Server Instance (Pods) và tầng DB phân tán.',15,660,1070,45,21)
g.save('Hình 1.11 Sơ đồ kiến trúc Cấp độ 4 – Scalable, Configurable, Multi-Tenant-Efficient (Hướng phát triển)','1.4.4','Mở rộng kiến trúc Cấp độ 3 bằng bộ cân bằng tải, cụm nhiều App Server Instances/Pods co giãn ngang và cơ sở dữ liệu phân tán.')

# 1.12: Updated overall comparison of the 4 maturity levels synchronized with 1.8-1.11.
g=G('hinh_1_12_truong_thanh','So sánh tổng quát bốn cấp độ trưởng thành SaaS',1100,1050)
g.text('Cấp độ',15,10,185,40,22,True)
g.text('Mã nguồn & Cơ chế tùy biến',230,10,410,40,22,True)
g.text('App Server Instance & Database',675,10,410,40,22,True)
stages=[
    ('CẤP ĐỘ 1\n(Đối chiếu)','Ad Hoc / Custom\n\nMã nguồn tùy biến riêng theo khách hàng\n(Custom Codebase A ≠ Custom Codebase B)','Tenant A → App Instance A → DB A\nTenant B → App Instance B → DB B\n(Tách toàn bộ mã, Instance và DB)'),
    ('CẤP ĐỘ 2\n(Chuẩn hóa mã)','Configurable\n\nMột Codebase chuẩn dùng chung;\ntùy biến qua file cấu hình trước khi chạy\n(Config before run)','Tenant A → App Instance A (Config A) → DB A\nTenant B → App Instance B (Config B) → DB B\n(Chung mã; tách Instance và DB)'),
    ('CẤP ĐỘ 3\n(Mục tiêu đề tài)','Configurable, Multi-Tenant-Efficient\n\nMột Codebase chuẩn dùng chung;\ntùy biến ngay lúc chạy (runtime)\nqua siêu dữ liệu (Metadata)','Tenant A, B → Một App Server Instance chung\n(TenantContext + Metadata runtime)\n→ Một DB chung phân vùng bằng Tenant ID'),
    ('CẤP ĐỘ 4\n(Hướng phát triển)','Scalable, Configurable,\nMulti-Tenant-Efficient\n\nKế thừa Codebase chung, TenantContext\nvà Metadata runtime của Cấp độ 3','Tenant A..N → Load Balancer\n→ Cụm nhiều App Server Instances (Pods)\n→ Tầng Database mở rộng / phân tán')
]
for i,(lvl,code,runtime) in enumerate(stages):
    y=60+i*240
    b1=g.box(lvl,15,y,185,205,'green' if i==2 else ('orange' if i==3 else 'grey'),size=22)
    b2=g.box(code,230,y,410,205,'green' if i==2 else 'blue',size=21)
    b3=g.box(runtime,675,y,410,205,'green' if i==2 else 'grey',size=21)
    g.edge(b1,b2,exit=(1,.5),entry=(0,.5))
    g.edge(b2,b3,exit=(1,.5),entry=(0,.5))
g.save('Hình 1.12 Sơ đồ so sánh tổng quát bốn cấp độ trưởng thành kiến trúc SaaS','1.4.5','Tổng hợp tiến trình từ Cấp độ 1 đến Cấp độ 4; đề tài định vị mục tiêu thực nghiệm ở Cấp độ 3 và đặt Cấp độ 4 làm hướng phát triển.')

# 1.13: three roles/layers, not a nine-level isolation taxonomy.
g=G('hinh_1_13_ba_tang','Mô hình ba tầng',1100,660)
a=g.box('TẦNG NGƯỜI THUÊ (TENANT LAYER)\nTenant A (Tổ chức A: Admin A, User A1..) | Tenant B (Tổ chức B: Admin B, User B1..)',30,20,1040,150)
b=g.box('TẦNG NHÀ CUNG CẤP DỊCH VỤ (SERVICE PROVIDER LAYER)\nQuản lý tenant · Dịch vụ nghiệp vụ Kanban · Metadata runtime và phân quyền',30,250,1040,150,'purple')
c=g.box('TẦNG INSTANCE VÀ HẠ TẦNG (RUNTIME INSTANCES & INFRASTRUCTURE)\nWeb Server Instance · Application Server Instance · Database Server Instance · Lưu trữ',30,480,1040,150,'green')
g.edge(a,b,'Yêu cầu gắn định danh người dùng (user_id) và tổ chức thuê bao (tenant_id)');g.edge(b,c,'Thực thi trên các Web / App / Database Server Instance')
g.save('Hình 1.13 Quan hệ ba tầng trong cung ứng dịch vụ đa thuê bao','1.5.1','Ba tầng biểu diễn vai trò từ tổ chức thuê dịch vụ, phần mềm của nhà cung cấp đến các Web/App/DB Server Instance thực thi.')

# 1.14: integrated model with cross-cutting controls without implying network hops.
g=G('hinh_1_14_tich_hop','Mô hình tổng thể và kiểm soát xuyên tầng',1100,750)
g.text('MÔ HÌNH BA TẦNG',30,15,560,45,25,True)
g.text('CÁC CƠ CHẾ KIỂM SOÁT',650,15,420,45,25,True)
a=g.box('Tầng người thuê\nTenant A, B và các User thành viên',30,90,550,120)
b=g.box('Tầng nhà cung cấp dịch vụ\nNghiệp vụ + Metadata runtime + Phân quyền',30,300,550,130,'purple')
c=g.box('Tầng Instance và hạ tầng\nWeb / App Server + Database Server',30,520,550,120,'green')
g.edge(a,b);g.edge(b,c)
for i,(title,col) in enumerate([('Định danh và ngữ cảnh (TenantContext)','blue'),('Dữ liệu và lưu trữ (Tenant ID & RLS)','green'),('Hiệu năng và tài nguyên dùng chung','grey'),('Logic và cấu hình (Metadata runtime)','orange')]):
    k=g.box(title,670,85+i*145,400,100,col,size=22)
    g.edge(k,b,exit=(0,.5),entry=(1,(i+1)/5),dashed=True,arrow='none',pts=[(625,135+i*145),(625,300+130*(i+1)/5)])
g.text('Bảo vệ phạm vi dữ liệu · Quyền thay đổi trạng thái · Kiểm soát tiêu thụ tài nguyên',25,680,1050,55,23,True)
g.save('Hình 1.14 Mô hình tổng thể ba tầng và các cơ chế kiểm soát xuyên tầng','1.5.2','Đường liền là quan hệ phục vụ, nét đứt là phạm vi kiểm soát xuyên tầng áp dụng trong kiến trúc Cấp độ 3.')

# 2.1-2.4: one coherent visual vocabulary across deployment variants.
for mode,cap,sec,after in [
    ('silo','Hình 2.1 Tài nguyên ứng dụng và dữ liệu dành riêng theo tenant (Mô hình Silo)','2.1.2',0),
    ('pool','Hình 2.2 Ứng dụng và bảng dữ liệu dùng chung có nhận biết tenant (Mô hình Pool)','2.1.2',1),
    ('bridge','Hình 2.3 Chia sẻ ứng dụng và phân tách nguồn dữ liệu (Mô hình Bridge)','2.1.3',0),
    ('hybrid','Hình 2.4 Phối hợp tài nguyên dùng chung và dành riêng (Mô hình Hybrid)','2.1.3',1)
]:
    g=G('hinh_'+cap.split()[1].replace('.','_')+'_'+mode,mode,1100,600)
    ta=g.box('Tenant A',50,20,280,80);tb=g.box('Tenant B',420,20,280,80);tc=g.box('Tenant C',790,20,260,80)
    if mode=='silo':
        for tenant,x,name in [(ta,50,'A'),(tb,420,'B'),(tc,790,'C')]:
            app=g.box('App Instance '+name, x,220,260,100)
            db=g.box('DB '+name,x,430,260,120,'green',True)
            g.edge(tenant,app);g.edge(app,db)
        g.text('Dành riêng ở tầng App Instance và Database; hạ tầng vật lý bên dưới có thể vẫn dùng chung.',20,555,1060,40,21)
    elif mode=='pool':
        app=g.box('Một App Server Instance chung\nTenantContext + nghiệp vụ + Metadata runtime',230,210,640,125)
        db=g.box('Một Database chung, các bảng chung\nHàng A: tenant_id=A | Hàng B: tenant_id=B | Hàng C: tenant_id=C',170,430,760,130,'green',True)
        for i,t in enumerate([ta,tb,tc]):g.edge(t,app,entry=((i+1)/4,0))
        g.edge(app,db)
    elif mode=='bridge':
        app=g.box('Một App Server Instance chung\nĐịnh tuyến nguồn dữ liệu theo TenantContext',220,210,660,110)
        for i,t in enumerate([ta,tb,tc]):g.edge(t,app,entry=((i+1)/4,0))
        for i,name in enumerate('ABC'):
            db=g.box('Schema hoặc DB '+name,40+i*370,430,280,120,'green',True)
            g.edge(app,db,exit=((i+1)/4,1))
    else:
        app=g.box('App Server Instance chung cho A và B',50,220,620,100)
        dedicated=g.box('App Instance riêng cho C',780,220,270,100,'orange')
        db=g.box('DB chung: dữ liệu A và B',100,430,520,120,'green',True)
        dbc=g.box('DB C',790,430,250,120,'green',True)
        g.edge(ta,app,entry=(.25,0));g.edge(tb,app,entry=(.75,0));g.edge(tc,dedicated)
        g.edge(app,db);g.edge(dedicated,dbc)
    g.save(cap,sec,'Quan hệ mũi tên xác định App Server Instance và nguồn dữ liệu phục vụ từng tenant.',after=after)

# 3.1: use cases: role-specific capabilities, no accidental platform access.
g=G('hinh_3_1_use_case','Ca sử dụng theo vai trò',1100,740)
actors=[g.cell('',30,y,100,105,'shape=umlActor;') for y in (70,305,540)]
for label,y in [('Quản trị hệ thống',180),('Quản trị tenant',415),('Thành viên',650)]:g.text(label,0,y,190,55,22,True)
g.group('Ứng dụng quản lý công việc đa thuê bao (Cấp độ 3)',240,20,840,695,'grey')
cases=[('Khởi tạo và quản lý\ntrạng thái tenant',300,80),('Quản lý thành viên\nvà Metadata workspace',300,300),('Quản lý dự án\nvà bảng Kanban',730,300),('Xem và cập nhật\ncông việc được cấp quyền',300,540),('Chia sẻ tệp và nhận\nthông báo công việc',730,540)]
cs=[g.box(label,x,y,290,120,'blue',ellipse=True) for label,x,y in cases]
g.edge(actors[0],cs[0],exit=(1,.5),entry=(0,.5),arrow='none')
g.edge(actors[1],cs[1],exit=(1,.5),entry=(0,.5),arrow='none')
g.edge(actors[1],cs[2],exit=(1,.7),entry=(0,.5),pts=[(210,480),(680,480),(680,360)],arrow='none')
g.edge(actors[2],cs[3],exit=(1,.5),entry=(0,.5),arrow='none')
g.edge(actors[2],cs[4],exit=(1,.8),entry=(0,.5),pts=[(210,690),(680,690),(680,600)],arrow='none')
g.save('Hình 3.1 Nhóm ca sử dụng theo vai trò của ứng dụng','3.1.2','Đường nối là quan hệ tham gia chức năng; quyền chi tiết được xác định trong ma trận phân quyền.',after=0)

# 3.2: a single application process contains modules; no microservice inference.
g=G('hinh_3_2_kien_truc','Kiến trúc thành phần đề xuất',1100,800)
a=g.box('Trình duyệt A\nWorkspace A',20,20,340,95);b=g.box('Trình duyệt B\nWorkspace B',740,20,340,95)
g.group('MỘT APPLICATION SERVER INSTANCE DÙNG CHUNG',80,200,940,350,'blue')
auth=g.box('Xác thực + Membership\nXác lập TenantContext',120,280,350,115,'purple')
biz=g.box('Nghiệp vụ Kanban\nÁp dụng Metadata runtime',620,280,350,115)
data=g.box('Truy cập dữ liệu theo tenant\nTransaction + SET LOCAL + RLS',330,440,440,85,'green')
g.edge(a,auth,entry=(.3,0));g.edge(b,auth,entry=(.7,0),pts=[(910,155),(365,155)])
g.edge(auth,biz,'Context\nđã xác minh',exit=(1,.5),entry=(0,.5))
g.edge(biz,data,exit=(.5,1),entry=(.8,0))
db=g.box('Database Server (PostgreSQL dùng chung)\nBảng tenant, membership, tenant_config (Metadata) và dữ liệu Kanban gắn tenant_id',140,650,820,120,'green',True)
g.edge(data,db)
g.text('A và B dùng cùng một App Server Instance;\nngữ cảnh được cô lập theo từng request.',35,575,430,65,21)
g.save('Hình 3.2 Kiến trúc thành phần của ứng dụng Cấp độ 3 được đề xuất','3.2.1','Các khối trong backend là mô-đun cùng một App Server Instance; phục vụ đồng thời nhiều tenant trên một Database chung.',after=0)

# 3.3: deterministic request sequence, generated by the skill's layout engine.
seq={'title':'Luồng tạo thẻ theo tenant','participants':[{'id':'browser','label':'Trình duyệt'},{'id':'filter','label':'Xác thực và context'},{'id':'service','label':'Nghiệp vụ Kanban'},{'id':'db','label':'Database chung'}], 'messages':[
 {'from':'browser','to':'filter','label':'1. Token + tenant được chọn'},
 {'from':'filter','to':'db','label':'2. Xác minh membership'},
 {'from':'db','to':'filter','label':'3. Quyền trong workspace','return':True},
 {'from':'filter','to':'service','label':'4. TenantContext đã xác minh'},
 {'from':'service','to':'db','label':'5. BEGIN; đặt context transaction'},
 {'from':'service','to':'db','label':'6. Đọc metadata và dữ liệu'},
 {'from':'db','to':'service','label':'7. Dữ liệu đúng tenant','return':True},
 {'from':'service','to':'service','label':'8. Kiểm tra quyền và quy tắc'},
 {'from':'service','to':'db','label':'9. Ghi thẻ; COMMIT / ROLLBACK'},
 {'from':'db','to':'service','label':'10. Kết quả transaction','return':True},
 {'from':'service','to':'filter','label':'11. Kết quả nghiệp vụ','return':True},
 {'from':'filter','to':'filter','label':'12. Dọn context trong finally'},
 {'from':'filter','to':'browser','label':'13. Phản hồi','return':True}]}
(BASE/'sequence.json').write_text(json.dumps(seq,ensure_ascii=False),encoding='utf-8')
spec=importlib.util.spec_from_file_location('seqlayout',r'D:\NCKH\AIDraw\drawio-skill\scripts\seqlayout.py')
seqmod=importlib.util.module_from_spec(spec);spec.loader.exec_module(seqmod)
seqmod.LIFELINE_W=180;seqmod.HEADER_H=70;seqmod.MIN_SPACING=310;seqmod.ROW=65
seqmod.LIFELINE=seqmod.LIFELINE.replace('size=40;','size=70;')
sx=ET.fromstring(seqmod.layout(seq))
for cell in sx.iter('mxCell'):
    if 'style' in cell.attrib:cell.set('style',cell.get('style')+'fontFamily=Arial;fontSize=20;fontColor=#16232D;')
ET.ElementTree(sx).write(SRC/'hinh_3_3_luong_yeu_cau.drawio',encoding='utf-8',xml_declaration=True)
MAN.append({'stem':'hinh_3_3_luong_yeu_cau','caption':'Hình 3.3 Luồng tạo thẻ có xác lập và giải phóng ngữ cảnh tenant','section':'3.2.1','meaning':'Luồng hợp lệ; lỗi xác thực bị từ chối trước nghiệp vụ; mọi nhánh đều dọn ngữ cảnh.','width':1100,'height':850,'after':1})

# 3.4: core logical schema. All inter-business links carry tenant_id.
g=G('hinh_3_4_erd','Lược đồ dữ liệu cốt lõi',1100,1060)
tables=[('tenant','PK tenant_id\nname, status',30,30),('app_user','PK user_id\nemail',770,30),('membership','PK/FK tenant_id\nPK/FK user_id\nrole',400,30),('tenant_config','PK/FK tenant_id\nversion\nui_config, rules',30,340),('project','PK project_id\nFK tenant_id\nname',400,340),('board','PK board_id\nFK tenant_id, project_id\nname',770,340),('card','PK card_id\nFK tenant_id, column_id\nFK assignee_user_id\nversion, position, due_date',400,740),('kanban_column','PK column_id\nFK tenant_id, board_id\nname, wip_limit',770,740)]
ids={}
for name,fields,x,y in tables:ids[name]=g.box(name+'\n────────────\n'+fields,x,y,300,220 if name!='card' else 270,'green' if name not in ['app_user','membership'] else 'blue')
g.edge(ids['tenant'],ids['membership'],'1 : N',exit=(1,.5),entry=(0,.5),arrow='none')
g.edge(ids['app_user'],ids['membership'],'N : 1',exit=(0,.5),entry=(1,.5),arrow='none')
g.edge(ids['tenant'],ids['tenant_config'],'1 : 1',arrow='none')
g.edge(ids['tenant'],ids['project'],'1 : N',exit=(1,.8),entry=(.2,0),pts=[(360,206),(360,280),(460,280)],arrow='none')
g.edge(ids['project'],ids['board'],'1 : N',exit=(1,.5),entry=(0,.5),arrow='none')
g.edge(ids['board'],ids['kanban_column'],'1 : N',arrow='none')
g.edge(ids['kanban_column'],ids['card'],'N : 1',exit=(0,.5),entry=(1,.5),arrow='none')
g.text('Khóa ngoại nghiệp vụ ghép tenant_id với khóa đối tượng.\nBảng tệp, thông báo và nhật ký được mô tả riêng.',30,585,650,120,22)
g.save('Hình 3.4 Lược đồ logic các thực thể dữ liệu cốt lõi','3.2.2','Một workspace tương ứng một tenant; FK nghiệp vụ có cùng tenant_id; ký hiệu 1:N biểu diễn lực lượng quan hệ.',after=0)

# 3.5: configuration change is observable on same running instance.
g=G('hinh_3_5_metadata','Áp dụng metadata lúc chạy',1100,680)
a=g.box('Quản trị tenant A\nĐổi quy tắc WIP',30,20,390,100,'orange')
b=g.box('Kiểm tra quyền và giá trị\nLưu config A, tăng version',650,20,420,100)
g.edge(a,b,exit=(1,.5),entry=(0,.5))
c=g.box('Một App Server Instance đang chạy\nĐọc Metadata theo TenantContext tại runtime',200,250,700,120,'purple')
g.edge(b,c,exit=(.5,1),entry=(.8,0))
d=g.box('Yêu cầu của Tenant A\nÁp dụng quy tắc WIP mới',30,490,460,110,'green')
e=g.box('Yêu cầu của Tenant B\nGiữ nguyên cấu hình của B',610,490,460,110)
g.edge(c,d,exit=(.25,1));g.edge(c,e,exit=(.75,1))
g.text('Không thay mã nguồn, không build lại, không tạo App Server Instance riêng cho A.',35,620,1030,45,23,True)
g.save('Hình 3.5 Cập nhật và áp dụng metadata theo tenant khi ứng dụng đang chạy','3.3.2','Thay đổi cấu hình có hiệu lực tại runtime trên cùng instance; backend vẫn kiểm tra quy tắc khi gọi API trực tiếp.',after=0)

# 3.6: native wireframe. It is explicitly a design, not an application screenshot.
g=G('hinh_3_6_giao_dien','Thiết kế giao diện Kanban',1100,690)
g.box('WORKSPACE A   |   Dự án nghiên cứu   |   Thành viên   |   Cấu hình',15,15,1070,75)
g.box('Không gian A\n\nDự án\nBảng Kanban\nTài nguyên\nThông báo',15,120,220,500,'grey')
g.text('BẢNG CÔNG VIỆC',270,110,780,50,27,True,align='left')
for i,(title,cards) in enumerate([('Cần làm',['Đặc tả yêu cầu','Thiết kế dữ liệu']),('Đang làm · WIP 2',['Vẽ kiến trúc']),('Hoàn thành',['Thống nhất phạm vi'])]):
    x=270+i*275
    g.group(title,x,190,250,430,'blue' if i!=1 else 'orange')
    for j,t in enumerate(cards):g.box(t,x+15,260+j*120,220,85,'grey')
g.text('Bản thiết kế giao diện: tên, màu workspace và quy tắc WIP được chọn từ metadata của tenant.',20,640,1060,40,21)
g.save('Hình 3.6 Thiết kế giao diện quản lý công việc theo workspace','3.4.2','Wireframe đề xuất; không được dùng như bằng chứng ứng dụng đã chạy hoặc đã vượt kiểm thử.',after=1)

# 3.7: deployed instance count and private data path must be unambiguous.
g=G('hinh_3_7_trien_khai','Mô hình triển khai thử nghiệm',1100,760)
a=g.box('Trình duyệt Tenant A',40,20,420,85);b=g.box('Trình duyệt Tenant B',640,20,420,85)
g.group('MÁY CHỦ ẢO THỬ NGHIỆM',70,210,960,535,'grey')
rp=g.box('Web Server / Reverse Proxy Instance\nHTTPS và phục vụ giao diện web',250,290,600,100)
app=g.box('Application Server Instance duy nhất\nCác mô-đun nghiệp vụ Kanban, TenantContext và Metadata',250,470,600,100,'purple')
db=g.box('Database Server Instance\nMột PostgreSQL database chung (Phân vùng bằng Tenant ID)',270,625,560,110,'green',True)
g.edge(a,rp,'HTTPS',entry=(.25,0));g.edge(b,rp,'HTTPS',entry=(.75,0))
g.edge(rp,app,'API nội bộ');g.edge(app,db,'Kết nối DB nội bộ')
g.save('Hình 3.7 Mô hình triển khai ứng dụng phục vụ nhiều tenant trên máy chủ thử nghiệm','3.5.1','Phân biệt rõ Web Server Instance, Application Server Instance và Database Server Instance dùng chung.',after=0)

(FIG/'manifest.json').write_text(json.dumps(MAN,ensure_ascii=False,indent=2),encoding='utf-8')
print('Created',len(MAN),'editable figures',flush=True)

if '--export' in sys.argv:
    EDPNG=FIG/'editable-png'; EDPNG.mkdir(parents=True,exist_ok=True)
    for fmt,target,extra in [('png',PNG,['--width','2000']),('svg',SVG,['-e']),('png',EDPNG,['--width','2400','-e'])]:
        args=[str(EXE),'-x','-f',fmt,'-b','15','--theme','light','--timeout','40','-o',str(target),str(SRC),'--disable-gpu']+extra
        result=subprocess.run(args,capture_output=True,timeout=240)
        print(result.stdout.decode('utf-8',errors='replace'),flush=True)
        if result.returncode:raise RuntimeError(result.stderr.decode('utf-8',errors='replace'))
    for p in list(EDPNG.glob('*.png')):
        if not p.name.endswith('.drawio.png'):
            dst=EDPNG/(p.stem+'.drawio.png')
            if dst.exists():dst.unlink()
            p.rename(dst)
    print('Export complete',flush=True)

"""Rebuild the reviewed Chapter 2 figures as editable draw.io XML.

Geometry is generated from row/column templates. Sequence geometry comes
from the workspace's drawio-skill generator. Run from any directory.
"""
from pathlib import Path
import importlib.util
import json
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / '_build'
OUT.mkdir(exist_ok=True)
COLORS = {'blue': ('#EAF2FF', '#527CB8'), 'green': ('#EAF6EE', '#39845A'),
          'orange': ('#FFF2E2', '#BF7A28'), 'purple': ('#F0ECFA', '#8263B1'),
          'red': ('#FCEDEA', '#BA5B53'), 'grey': ('#F3F5F8', '#8592A4'),
          'yellow': ('#FFF8DE', '#C39C35')}
FONT = 'fontFamily=Arial;fontColor=#213047;fontSize=16;'
MANIFEST = []


class Diagram:
    def __init__(self, stem, title, subtitle, width=1200):
        self.stem, self.title, self.width = stem, title, width
        self.file = ET.Element('mxfile', host='drawio', version='32.6.10')
        page = ET.SubElement(self.file, 'diagram', id=stem, name=title)
        self.model = ET.SubElement(page, 'mxGraphModel', grid='1', gridSize='10',
                                   page='0', background='#ffffff', math='0', shadow='0')
        self.root = ET.SubElement(self.model, 'root')
        ET.SubElement(self.root, 'mxCell', id='0')
        ET.SubElement(self.root, 'mxCell', id='1', parent='0')
        self.n = 2
        self.text(title, 30, 20, width-60, 40, 25, True)
        self.text(subtitle, 30, 65, width-60, 45, 15)

    def cell(self, text, x, y, w, h, style, parent='1'):
        cid = str(self.n); self.n += 1
        c = ET.SubElement(self.root, 'mxCell', id=cid, value=text, style=style,
                          vertex='1', parent=parent)
        ET.SubElement(c, 'mxGeometry', x=str(x), y=str(y), width=str(w), height=str(h), **{'as':'geometry'})
        return cid

    def text(self, text, x, y, w, h, size=15, bold=False, parent='1'):
        return self.cell(text, x,y,w,h,
                         f'text;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;{FONT}fontSize={size};fontStyle={1 if bold else 0};',parent)

    def box(self, text,x,y,w,h,color='blue',dedicated=False,parent='1',shape='box'):
        fill, stroke = COLORS[color]
        kind = {'box':'rounded=1;arcSize=12;', 'db':'shape=cylinder3;size=15;boundedLbl=1;',
                'decision':'rhombus;','plain':'rounded=0;'}[shape]
        return self.cell(text,x,y,w,h,
            f'{kind}html=1;whiteSpace=wrap;align=center;verticalAlign=middle;spacing=10;{FONT}'
            f'fillColor={fill};strokeColor={stroke};strokeWidth=1.6;'
            + ('dashed=1;dashPattern=6 4;' if dedicated else ''),parent)

    def group(self,text,x,y,w,h,color='blue',dedicated=False):
        fill,stroke=COLORS[color]
        return self.cell(text,x,y,w,h,
            f'swimlane;html=1;whiteSpace=wrap;startSize=48;horizontal=1;container=1;pointerEvents=0;collapsible=0;'
            f'{FONT}fontStyle=1;fillColor={fill};swimlaneFillColor=#ffffff;strokeColor={stroke};strokeWidth=2;'
            + ('dashed=1;dashPattern=6 4;' if dedicated else ''))

    def edge(self,s,t,label='',exit=(.5,1),entry=(.5,0),points=None,dashed=False):
        cid=str(self.n);self.n+=1
        c=ET.SubElement(self.root,'mxCell',id=cid,value=label,edge='1',parent='1',source=s,target=t,
            style=f'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;{FONT}'
            f'fontSize=14;labelBackgroundColor=#ffffff;strokeColor=#53647C;strokeWidth=1.6;endArrow=block;endFill=1;'
            f'exitX={exit[0]};exitY={exit[1]};entryX={entry[0]};entryY={entry[1]};'
            + ('dashed=1;' if dashed else ''))
        g=ET.SubElement(c,'mxGeometry',relative='1',**{'as':'geometry'})
        if points:
            a=ET.SubElement(g,'Array',**{'as':'points'})
            for x,y in points: ET.SubElement(a,'mxPoint',x=str(x),y=str(y))
        return cid

    def legend(self,y):
        self.box('Khung liền: dùng chung',30,y,260,38,'grey')
        self.box('Khung đứt: dành riêng',310,y,260,38,'grey',True)
        self.text('Kiểu nét áp dụng cho khung vùng tài nguyên; mũi tên biểu diễn luồng hoặc phụ thuộc.',590,y,self.width-620,42,13)

    def save(self,footer,y,legend=True):
        if legend: self.legend(y); y+=55
        self.text(footer,30,y,self.width-60,62,14)
        self.model.set('pageWidth',str(self.width));self.model.set('pageHeight',str(y+90))
        p=OUT/(self.stem+'.drawio');p.parent.mkdir(parents=True,exist_ok=True)
        ET.indent(self.file)
        ET.ElementTree(self.file).write(p,encoding='utf-8',xml_declaration=True)
        MANIFEST.append({'stem':self.stem,'title':self.title})


LAYERS = [(9,'App Instance'),(8,'App Server / runtime'),(7,'Middleware'),(6,'DB Schema'),
          (5,'Database'),(4,'DB Server / DBMS'),(3,'Operating System'),(2,'VM / Container'),(1,'Hardware')]


def matrix(d, left, right=None, split=None, y=230, height=56):
    """Compute an aligned nine-layer matrix rather than a runtime call chain."""
    split=set(split or [])
    d.text('TẦNG',30,y-38,160,30,14,True)
    for i,(num,name) in enumerate(LAYERS):
        yy=y+i*height
        d.text(f'{num}. {name}',30,yy,210,height-8,15,True)
        if right is None:
            d.box(left[i],250,yy,900,height-8,'blue' if num>=7 else 'green' if num>=4 else 'grey',num in split)
        elif num in split:
            d.box(left[i],250,yy,430,height-8,'blue',True)
            d.box(right[i],720,yy,430,height-8,'purple',True)
        else:
            d.box(left[i],250,yy,900,height-8,'green' if num<=6 else 'blue')
    return y+9*height


def blueprint():
    d=Diagram('hinh_2_1_master_blueprint','Hình 2.1 · Hệ quy chiếu 9 tầng',
        'Các hàng là điểm phân tích Tách/Gộp; thứ tự này không phải chuỗi gọi request bắt buộc.')
    examples=['Tiến trình / bản thể ứng dụng phục vụ tenant','JVM, Node.js, .NET runtime',
              'Gateway, Redis, message broker, object storage','Schema, bảng và policy gắn với bảng',
              'Database logic nằm trong DBMS','PostgreSQL engine: thực thi truy vấn và RLS',
              'Guest OS (VM) hoặc host kernel dùng chung (container)',
              'VM: hypervisor + guest OS; Container: chia sẻ host kernel',
              'CPU, RAM, storage, network']
    matrix(d,examples,y=150,height=62)
    d.save('Level 1–5 là hệ phân loại của báo cáo, khác với số tầng 1–9. VM và container là hai cơ chế triển khai khác nhau;\nkhông suy ra mức chia sẻ chỉ từ tên tầng. Khung tài nguyên ở các hình sau mới mang nghĩa Shared/Dedicated.',740)


def silo_pool_compute():
    d=Diagram('hinh_2_2_silo_model','Hình 2.2 · Silo: ngăn xếp dành riêng cho từng tenant',
              'Minh họa Silo vật lý Level 1. Với Silo VM Level 2, hardware có thể dùng chung nhưng VM/guest OS riêng.')
    g=d.box('DNS / Gateway định tuyến theo tenant đã xác thực',330,120,540,60,'orange')
    d.text('TENANT A',360,195,250,30,17,True);d.text('TENANT B',830,195,250,30,17,True)
    a=['App Instance A','App runtime A','Redis + Queue A','Schema A','Database A','DBMS A','OS A','VM riêng A (nếu dùng VM)','Máy chủ vật lý A']
    b=[x.replace(' A',' B') for x in a]
    end=matrix(d,a,b,range(1,10))
    d.save('Tài nguyên của A/B độc lập trong cấu hình minh họa. Gateway, DNS và mặt phẳng điều khiển vẫn có thể là phụ thuộc chung;\nphạm vi sự cố cần được đánh giá theo từng loại lỗi.',end+20)
    d=Diagram('hinh_2_3_pool_model','Hình 2.3 · Pool: tài nguyên dùng chung, dữ liệu tách logic',
              'Nhiều tenant dùng chung ngăn xếp; ranh giới dữ liệu Level 5 được thực thi bằng tenant_id và RLS.')
    d.box('Tenant A + Tenant B → Gateway xác thực → ứng dụng dùng chung',220,120,760,60,'orange')
    end=matrix(d,['App Instances Pool (tenant-aware)','Runtime dùng chung; TenantContext riêng mỗi request',
        'Redis: tenant:{id}:key · Queue: tenant_id + fair-share','Shared schema / shared tables + tenant_id',
        'Shared database','Shared PostgreSQL · ENABLE/FORCE RLS',
        'OS / kernel dùng chung theo kiểu triển khai','VM/Container dùng chung nhiều tenant','CPU / RAM / I/O dùng chung'])
    d.save('Dữ liệu đọc/ghi được kiểm soát bằng RLS fail-closed; tài nguyên cần quota/rate limit riêng.\nChia sẻ làm tăng hiệu suất sử dụng tài nguyên nhưng vẫn tồn tại rủi ro tranh chấp và sự cố chung.',end+20)
    d=Diagram('hinh_2_6_compute_isolated_shared_data','Hình 2.6 · Compute-Isolated / Shared-Data',
              'Compute riêng theo tenant (Level 3); PostgreSQL dùng chung với RLS (Level 5).')
    d.box('Gateway → tra tenant registry → Pod đúng tenant',330,120,540,60,'orange')
    d.text('TENANT A',360,195,250,30,17,True);d.text('TENANT B',830,195,250,30,17,True)
    a=['App / script sandbox A','App runtime A','Middleware dùng chung; quota theo tenant',
       'Shared tables + tenant_id + RLS','Shared database','Shared PostgreSQL engine',
       'Linux host kernel dùng chung giữa các container','Container A · cgroups CPU/RAM limits','Node / CPU / RAM / storage dùng chung']
    b=[x.replace(' A',' B') for x in a]
    end=matrix(d,a,b,[9,8,2])
    d.save('Các hàng biểu diễn phạm vi chia sẻ, không biểu diễn quan hệ “chạy bên trong” tuyến tính. Pod riêng không tạo DB riêng.\nCustom code cần sandbox, quyền tối thiểu và ngữ cảnh tenant được thiết lập bởi thành phần tin cậy.',end+20)


def bridge():
    d=Diagram('hinh_2_4_bridge_model','Hình 2.4 · Bridge: app chung, schema riêng',
              'Biến thể Schema-per-Tenant: ranh giới namespace Level 4; DBMS và tài nguyên bên dưới vẫn dùng chung.')
    d.box('Gateway xác thực → Shared App → chọn schema từ tenant registry',220,120,760,60,'orange')
    end=matrix(d,['App Instances dùng chung','Runtime dùng chung','Redis / Queue dùng chung, có tenant scope',
        'Schema tenant_a · bảng riêng','Database dùng chung','PostgreSQL engine dùng chung','OS dùng chung',
        'VM/Container hạ tầng dùng chung','CPU / RAM / I/O dùng chung'],
        ['','','','Schema tenant_b · bảng riêng','','','','',''],[6])
    d.save('Trong transaction: SET LOCAL search_path = tenant_schema, pg_catalog; schema phải lấy từ registry tin cậy.\nsearch_path chỉ định cách phân giải tên; quyền schema/table thực thi kiểm soát truy cập. Không đồng nghĩa cô lập vật lý.',end+20)


def dual_stacks(stem,title,subtitle,tiered=False):
    d=Diagram(stem,title,subtitle)
    g=d.box('Dynamic API Gateway · xác thực JWT + tenant/tier → registry đích',260,120,680,60,'orange')
    groups=[]
    for x,name,color,ded in [(30,'FREE / PRO · POOL'+(' CELL P' if tiered else ''),'blue',False),
                             (630,'ENTERPRISE · SILO'+(' CELL E' if tiered else ''),'purple',True)]:
        grp=d.group(name,x,245,540,510,color,True if tiered else ded);groups.append(grp)
        texts=(['9 · Shared app instances','8 · Shared runtime + feature flags','7 · Redis/Queue + tenant quota',
                '6 · Shared schema / tables + RLS','5 · Shared database','4 · PostgreSQL engine',
                '3 · OS/kernel của vùng Pool','2 · VM/Container của vùng Pool','1 · Hardware / node của vùng Pool'] if not ded else
               ['9 · App / custom script riêng','8 · Runtime / sandbox riêng','7 · Dedicated Redis + Queue',
                '6 · Schema riêng','5 · Dedicated DB + BYOK','4 · Dedicated PostgreSQL instance',
                '3 · Guest OS riêng','2 · VM riêng + Pod limits','1 · Host vật lý có thể dùng chung'])
        for i,txt in enumerate(texts[:8]):
            d.box(txt,20,65+i*52,500,44,color,ded,parent=grp)
        d.edge(g,grp,'tenant → '+('Cell P' if tiered and not ded else 'Cell E' if tiered else 'Pool' if not ded else 'Silo'),
               exit=(.25 if not ded else .75,1),entry=(.5,0))
    d.box('1 · Hardware nhà cung cấp có thể dùng chung; mức cô lập trong hình được tạo bằng VM/Container.',30,775,1140,48,'grey')
    d.save(('Mỗi Cell có compute, middleware và DB riêng so với Cell khác. Bên trong Cell P: tenant tách logic Level 5; Cell E: Level 2/3.\nTenant registry quyết định cả tier và cell đích; Free/Pro có thể được phân phối qua nhiều Pool Cell theo sức chứa.' if tiered else
            'Pool dùng chung giữa các tenant tiêu chuẩn (Level 5); vùng Enterprise cấp riêng theo tenant (Level 2/3).\nMô hình minh họa Silo VM: hardware vẫn có thể được chia sẻ; không đồng nhất “dedicated instance” với bare metal.'),835)


def cells():
    d=Diagram('hinh_2_7_cell_based','Hình 2.7 · Cell-Based / Deployment Stamps',
              'Tenant registry lưu ánh xạ ổn định tenant → cell. Mỗi cell có giới hạn sức chứa và một ngăn xếp độc lập.')
    router=d.box('Global Router → Tenant Registry (tenant_id → cell_id)',300,120,600,60,'orange')
    for i,x in enumerate([30,430,830],1):
        grp=d.group(f'CELL {i:02} · biên Level 2/3',x,270,340,390,['blue','green','purple'][i-1],True)
        for j,(txt,col) in enumerate([
            ('8–9 · App Cluster\nNhiều tenant / cell','blue'),
            ('7 · Cache + Queue\nQuota / tenant scope','orange'),
            ('4–6 · DB riêng của cell\nShared tables + RLS Level 5','green'),
            ('2–3 · VM/Container runtime\nOS/kernel tùy mức cô lập','grey')]):
            d.box(txt,20,65+j*78,300,65,col,parent=grp)
        d.edge(router,grp,f'registry → cell_{i:02}',exit=(i/4,1),entry=(.5,0),
               points=[(300+150*i,220),(x+170,220)] if i!=2 else None)
        d.text('Ví dụ: ≤ 1.000 tenant / cell',x,685,340,40,15,True)
    d.box('1 · Hardware có thể dùng chung; tách Cell không đồng nghĩa tách máy chủ vật lý.',30,740,1140,48,'grey')
    d.save('Không tính lại tenant_id % số_cell khi thêm cell: di chuyển tenant cần kế hoạch chuyển dữ liệu và cập nhật registry.\nCell giới hạn nhiều lỗi của data plane; Router/Registry/control plane chung vẫn cần HA và đánh giá sự cố riêng.',810)


def profiles():
    d=Diagram('hinh_2_8_smb_profile','Hình 2.8 · SMB / Startup Profile',
              'Full Pool Level 5 · Tối ưu chi phí, tùy biến bằng metadata/flags, onboarding chủ yếu bằng cấu hình.')
    d.box('JWT hợp lệ → resolve tenant → Token Bucket (tenant + user) → Shared App',180,120,840,60,'orange')
    end=matrix(d,['App chung · immutable TenantContext / request',
        'Shared runtime · OpenFeature + local provider',
        'Shared Redis + Queue · tenant key, quota, fair-share',
        'Shared tables · tenant_id · RLS USING / WITH CHECK','Shared database',
        'PostgreSQL · ENABLE/FORCE RLS · app role không BYPASSRLS',
        'OS / kernel dùng chung','VM/Container của Shared Pool','CPU / RAM / I/O dùng chung'])
    d.save('Mỗi transaction: BEGIN → SET LOCAL tenant UUID → truy vấn → COMMIT/ROLLBACK. Clear context trong finally.\nChi phí, thời gian onboarding và hiệu năng cần đo kiểm; feature flag là cấu hình/entitlement, không thay mọi kiểm tra quyền.',end+20)
    d=Diagram('hinh_2_9_enterprise_profile','Hình 2.9 · Enterprise / Regulated Profile',
              'Minh họa VM riêng Level 2 + Pod/sandbox Level 3; DB, cache và queue dành riêng cho tenant.')
    d.box('Enterprise request → xác thực → Ingress → tenant registry → VM / Pod riêng',180,120,840,60,'orange')
    end=matrix(d,['App riêng + Custom Script Runner (sandbox)',
        'Runtime riêng · Pod CPU/RAM requests + limits',
        'Dedicated Redis Cluster + Dedicated Queue',
        'Schema / bảng riêng','Dedicated database · mã hóa bằng khóa khách hàng quản lý',
        'Dedicated PostgreSQL instance · pool kết nối riêng',
        'Guest OS riêng trong VM','VM riêng · Pod runtime / gVisor theo yêu cầu',
        'Host vật lý nhà cung cấp có thể dùng chung'],split=[9,8,7,6,5,4,3,2])
    d.save('Kubernetes namespace là phạm vi quản lý API; RBAC + NetworkPolicy + ResourceQuota là các cấu hình bổ sung.\nCgroups giới hạn tài nguyên container; VM riêng và thiết kế phụ thuộc quyết định mức cô lập. Tuân thủ cần đánh giá riêng.',end+20)


def cache():
    d=Diagram('hinh_2_13_two_tier_caching','Hình 2.13 · Two-Tier Cache: đọc dữ liệu và admission',
              'L1 Caffeine (W-TinyLFU) → L2 Redis → DB. Cache miss hoặc từ chối admission vẫn phải phục vụ dữ liệu.')
    req=d.box('Request đã xác thực\nKey = tenant:{id}:{resource}',100,130,350,65,'blue')
    l1=d.box('L1 Caffeine\nCó dữ liệu?',110,245,330,130,'yellow',shape='decision')
    l2=d.box('L2 Redis\nCó dữ liệu?',110,455,330,130,'yellow',shape='decision')
    db=d.box('Đọc PostgreSQL\nTransaction + SET LOCAL + RLS',100,700,350,90,'green',shape='db')
    result=d.box('Trả dữ liệu cho client',820,440,310,80,'green')
    warm1=d.box('Cân nhắc cập nhật L1\nW-TinyLFU quản lý window/main',600,570,480,75,'purple')
    fill=d.box('Dữ liệu đọc từ DB\nCập nhật L2 theo TTL / quota / chính sách',600,705,480,80,'orange')
    d.edge(req,l1);d.edge(l1,l2,'Miss');d.edge(l2,db,'Miss')
    d.edge(l1,result,'Hit: trả ngay',exit=(1,.5),entry=(.5,0),points=[(975,310)])
    d.edge(l2,warm1,'Hit',exit=(1,.5),entry=(0,.5),points=[(520,520),(520,607)])
    d.edge(db,fill,'Dữ liệu',exit=(1,.5),entry=(0,.5))
    d.edge(fill,warm1,exit=(.5,0),entry=(.5,1))
    d.edge(warm1,result,'Luôn trả dữ liệu',exit=(.8,0),entry=(.5,1))
    d.box('Không nhận vào cache ≠ bỏ request.\nW-TinyLFU của Caffeine không tự quyết định admission vào Redis L2.',70,845,1060,80,'grey')
    d.save('Khóa của cả L1/L2 phải chứa tenant_id. Key prefix tránh trùng khóa nhưng không tự tạo quota RAM theo tenant.\nNếu cần chống một tenant lấn cache: thêm phân vùng/quota có thực thi; kiểm tra bằng tải quét và đo hit rate/p99.',955,legend=False)


def decision():
    d=Diagram('hinh_2_14_decision_tree','Hình 2.14 · Cây quyết định kiến trúc',
              'Bốn Decision Drivers theo mục 2.6.2. Nếu nhiều yêu cầu cùng đúng, cần phối hợp cơ chế và đánh giá đánh đổi.')
    labels=[('1 · Bắt buộc triển khai\ntài nguyên dành riêng?', 'SILO PROFILE · Level 2\nDedicated Compute + Dedicated DB'),
            ('2 · Tenant cần chạy\nscript / plugin riêng?', 'COMPUTE-ISOLATED / SHARED-DATA\nCompute Level 3 + Data Level 5 (RLS)'),
            ('3 · Phân hóa mạnh\nFree / Pro / Enterprise?', 'TIERED PLATFORM\nHybrid + Cell-Based · Level 2/3 và Level 5'),
            ('4 · SMB / ARPU thấp,\nưu tiên tối ưu TCO?', 'SMB / STARTUP PROFILE\nPool + RLS · Level 5')]
    prev=None
    for i,(q,a) in enumerate(labels):
        y=150+i*200
        node=d.box(q,80,y,360,140,'yellow',shape='decision')
        ans=d.box(a,660,y+25,470,90,['purple','blue','orange','green'][i])
        d.edge(node,ans,'Có',exit=(1,.5),entry=(0,.5))
        if prev:d.edge(prev,node,'Không')
        prev=node
    last=d.box('Đánh giá thêm tải, quy mô, vùng triển khai và vận hành.\nCell-Based là lựa chọn khi cần phân vùng sức chứa / phạm vi sự cố; không phải mặc định chỉ vì ngân sách cao.',80,1000,1050,90,'grey')
    d.edge(prev,last,'Không',entry=(.17,0))
    d.save('Câu 1 phải dựa trên yêu cầu triển khai cụ thể: tên tiêu chuẩn tuân thủ hoặc BYOK không tự quyết định topology.\nSchema-per-Tenant là đòn bẩy dữ liệu bổ sung (Hình 2.4); không thay thế nhánh chạy mã tùy biến.',1120,legend=False)


def supplements():
    d=Diagram('bo-sung/bs_01_dedicated_database','Bổ sung 01 · Tách DBMS theo tenant',
              'Minh họa đòn bẩy dữ liệu tại mục 2.3.3; không phải Compute-Isolated / Shared-Data.')
    app=d.box('Shared App + Dynamic DataSource Router\nTra tenant registry → Connection Pool đúng đích',290,130,620,80,'blue')
    for x,tenant in [(40,'A'),(650,'B')]:
        g=d.group(f'TENANT {tenant} · VM / DB instance riêng (Level 2)',x,330,510,340,'green',True)
        p=d.box(f'PostgreSQL instance {tenant}\nConnection Pool {tenant}',30,75,450,80,'green',parent=g)
        v=d.box(f'Database / Volume dành riêng {tenant}',30,200,450,70,'grey',parent=g)
        d.edge(app,p,f'Pool {tenant}',exit=(.25 if tenant=='A' else .75,1));d.edge(p,v)
    d.save('Khung VM riêng chứng minh mức cô lập được giả định trong hình. Chỉ khác port/process/thư mục chưa chứng minh cô lập vật lý.\nShared App và Router vẫn là phụ thuộc dùng chung; cần kiểm soát quyền và tránh định tuyến sai tenant.',730)
    d=Diagram('bo-sung/bs_02_rls_engine','Bổ sung 02 · PostgreSQL RLS và fail-closed',
              'Policy gắn với bảng trong schema (tầng 6); PostgreSQL engine (tầng 4) thực thi kiểm soát hàng.')
    q=d.box('SELECT * FROM boards;\nỨng dụng quên WHERE tenant_id',60,130,480,80,'blue')
    ctx=d.box('TenantContext đã xác thực\nBEGIN + SET LOCAL tenant UUID',660,130,480,80,'purple')
    engine=d.box('PostgreSQL RLS Engine\nENABLE + FORCE ROW LEVEL SECURITY\nUSING (đọc) + WITH CHECK (ghi)',280,330,640,120,'green')
    yes=d.box('Context hợp lệ\nChỉ hàng thuộc tenant được phép',40,580,510,100,'green')
    no=d.box('Context thiếu / rỗng\nSELECT: 0 hàng · INSERT sai tenant: từ chối',650,580,510,100,'red')
    d.edge(q,engine,exit=(.5,1),entry=(.25,0));d.edge(ctx,engine,exit=(.5,1),entry=(.75,0))
    d.edge(engine,yes,exit=(.25,1));d.edge(engine,no,exit=(.75,1))
    d.box("tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid",70,750,1060,65,'grey')
    d.save('App role không là superuser/BYPASSRLS; hạn chế quyền owner/DDL. Context phải được thành phần tin cậy thiết lập.\nRLS không thay thế phân quyền ứng dụng, chống SQL injection hoặc hạn ngạch tài nguyên.',850,legend=False)
    d=Diagram('bo-sung/bs_03_schema_namespace','Bổ sung 03 · Schema namespace và tùy biến dữ liệu',
              'Schema-per-Tenant cho phép cấu trúc bảng khác nhau; cần quản lý migration và quyền truy cập.')
    w=d.box('Backend: tenant_beta đã xác thực',310,130,580,65,'blue')
    route=d.box('Tra schema từ registry tin cậy\nBEGIN; SET LOCAL search_path = tenant_beta, pg_catalog;',240,290,720,80,'orange')
    a=d.group('Schema tenant_alpha · dành riêng',40,520,510,220,'blue',True)
    b=d.group('Schema tenant_beta · dành riêng',650,520,510,220,'purple',True)
    d.box('cards: 3 cột tiêu chuẩn',30,85,450,80,'blue',parent=a)
    btab=d.box('cards: 3 cột tiêu chuẩn\n+ 2 cột tùy biến',30,85,450,80,'purple',parent=b)
    d.edge(w,route);d.edge(route,btab,'SELECT * FROM cards;',exit=(.75,1),entry=(.5,0))
    d.save('search_path chọn cách phân giải tên; quyền USAGE/schema và quyền table phải được cấu hình phù hợp.\nCOMMIT/ROLLBACK kết thúc SET LOCAL; schema riêng vẫn chia sẻ DBMS/CPU/I/O và không tạo ranh giới vật lý.',810)
    d=Diagram('bo-sung/bs_04_customer_segmentation','Bổ sung 04 · Resolve tenant, tier và đích triển khai',
              'Không chỉ giải mã JWT: kiểm tra token, quyền tenant và ánh xạ triển khai ở phía máy chủ.')
    req=d.box('HTTP Request + Bearer JWT',350,130,500,65,'blue')
    auth=d.box('Gateway xác thực chữ ký / issuer / audience / thời hạn\nKiểm tra quyền truy cập tenant',240,280,720,80,'purple')
    reg=d.box('Tenant Registry\ntenant_id → tier + cell_id + deployment đích',240,460,720,80,'orange')
    p=d.box('FREE / PRO\nShared Pool Cell được chỉ định',40,710,510,90,'blue')
    e=d.box('ENTERPRISE\nDedicated Silo Cell đúng tenant',650,710,510,90,'purple',True)
    d.edge(req,auth);d.edge(auth,reg);d.edge(reg,p,exit=(.25,1));d.edge(reg,e,exit=(.75,1))
    d.save('Token / tenant không hợp lệ → từ chối; chưa có ánh xạ triển khai → không định tuyến sang tenant khác.\nKhông tin X-Tenant-ID hoặc claim tier chưa được xác minh; không dùng tier một mình để chọn DB của tenant.',850)


def sequences():
    p=BASE.parent/'AIDraw/drawio-skill/scripts/seqlayout.py'
    spec=importlib.util.spec_from_file_location('seq',p);seq=importlib.util.module_from_spec(spec);spec.loader.exec_module(seq)
    seq.LIFELINE_W=190;seq.HEADER_H=65;seq.TOP=140;seq.ROW=70;seq.SELF_ROW=85;seq.BOTTOM_PAD=50;seq.MIN_SPACING=360
    seq.LIFELINE=seq.LIFELINE.replace('size=40','size=65')+FONT+'fillColor=#EAF2FF;strokeColor=#527CB8;'
    seq.ACTOR=seq.LIFELINE
    seq.SYNC+=FONT+'fontSize=15;labelBackgroundColor=#ffffff;'
    seq.RETURN+=FONT+'fontSize=15;labelBackgroundColor=#ffffff;'
    seq.ASYNC+=FONT+'fontSize=15;labelBackgroundColor=#ffffff;'
    specs=[('hinh_2_11_context_feature_flags','Hình 2.11 · TenantContext xuyên luồng và feature flags',
      'JVM minh họa: Gateway và Backend là hai process; ThreadLocal chỉ có hiệu lực trong process/thread tương ứng.',
      [('gw','Gateway'),('be','Backend Filter / Service'),('wk','Async Worker'),('ff','Local Flag Provider')],[
       ('gw','be','HTTP + thông tin định danh tin cậy'),
       ('be','be','Xác thực tenant; tạo immutable context'),
       ('be','wk','TaskDecorator: capture + restore context'),
       ('wk','ff','Evaluate(flag, tenant, tier)'),
       ('ff','wk','Giá trị flag từ bộ nhớ',True),
       ('wk','wk','Xử lý nghiệp vụ theo quyền / flag'),
       ('wk','wk','finally: clear / restore worker context'),
       ('wk','be','Kết quả hoặc lỗi',True),
       ('be','be','finally: clear request context'),
       ('be','gw','HTTP response',True)],
      'TaskDecorator dọn context ở worker cả khi lỗi; Filter dọn context request trong finally. Local provider là lựa chọn triển khai,\nOpenFeature không bảo đảm không có network call hoặc độ trễ <1ms. Truy cập DB tuân thủ Hình 2.12.'),
      ('hinh_2_12_set_local_sequence','Hình 2.12 · SET LOCAL và tái sử dụng connection',
       'Hai request dùng lại cùng Conn #1; TenantContext chỉ được đặt trong transaction đã mở.',
       [('app','Backend'),('pool','HikariCP Pool'),('db','PostgreSQL / Conn #1')],[
       ('app','pool','Tenant A: borrow()'),('pool','app','Conn #1',True),
       ('app','db',"BEGIN;\nSET LOCAL app.current_tenant_id = '00000000-0000-0000-0000-000000000001';"),
       ('app','db','SELECT * FROM boards; (RLS chỉ cho A)'),
       ('app','db','COMMIT (hoặc ROLLBACK khi lỗi)'),
       ('app','pool','finally: close() → trả Conn #1'),
       ('app','pool','Tenant B: borrow()'),('pool','app','Cùng Conn #1',True),
       ('app','db',"BEGIN;\nSET LOCAL app.current_tenant_id = '00000000-0000-0000-0000-000000000002';"),
       ('app','db','SELECT * FROM boards; (RLS chỉ cho B)'),
       ('app','db','COMMIT (hoặc ROLLBACK khi lỗi)'),
       ('app','pool','finally: close() → trả Conn #1')],
       "UUID đuôi 0001 đại diện Tenant A; UUID đuôi 0002 đại diện Tenant B.\nSET LOCAL hết hiệu lực ở cuối transaction, khôi phục session trước đó; session không được mang tenant context tồn dư.\nRLS: NULLIF(current_setting('app.current_tenant_id', true), '')::uuid; thiếu/rỗng → không đọc được hàng.")]
    for stem,title,subtitle,parts,msgs,footer in specs:
        js={'title':title,'participants':[{'id':i,'label':v} for i,v in parts],
            'messages':[{'from':m[0],'to':m[1],'label':m[2], 'return':len(m)>3,'activate':False} for m in msgs]}
        root=ET.fromstring(seq.layout(js));model=root.find('.//mxGraphModel');model.set('page','0');model.set('background','#ffffff')
        rr=root.find('.//root')
        maxx=max(float(g.get('x','0'))+float(g.get('width','0')) for g in root.iter('mxGeometry') if g.get('width'))
        maxy=max(float(g.get('y','0'))+float(g.get('height','0')) for g in root.iter('mxGeometry') if g.get('height'))
        def text(cid,txt,y,h,size):
            c=ET.SubElement(rr,'mxCell',id=cid,value=txt,vertex='1',parent='1',style=f'text;html=1;whiteSpace=wrap;align=left;{FONT}fontSize={size};')
            ET.SubElement(c,'mxGeometry',x='30',y=str(y),width=str(maxx-30),height=str(h),**{'as':'geometry'})
        text('title',title,20,45,25);text('subtitle',subtitle,70,50,15)
        text('footer',footer,maxy+25,115,15)
        path=OUT/(stem+'.drawio');ET.indent(root);ET.ElementTree(root).write(path,encoding='utf-8',xml_declaration=True)
        MANIFEST.append({'stem':stem,'title':title})


if __name__=='__main__':
    blueprint();silo_pool_compute();bridge()
    dual_stacks('hinh_2_5_hybrid_model','Hình 2.5 · Hybrid: Pool và Silo cùng tồn tại',
                'Định tuyến động theo tenant và tier; phối hợp ranh giới Level 5 và Level 2/3.')
    cells();profiles()
    dual_stacks('hinh_2_10_tiered_platform','Hình 2.10 · Tiered Platform: Hybrid + Cell-Based',
                'Free/Pro dùng Pool Cells; Enterprise có Silo Cell dành riêng. Các cell là đơn vị sức chứa và triển khai độc lập.',True)
    sequences();cache();decision();supplements()
    MANIFEST.sort(key=lambda m: (1, m['stem']) if m['stem'].startswith('bo-sung') else (0,int(m['stem'].split('_')[2])))
    (OUT/'manifest.json').write_text(json.dumps(MANIFEST,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Generated {len(MANIFEST)} editable diagrams in {OUT}')

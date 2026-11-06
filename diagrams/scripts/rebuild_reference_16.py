"""Use the user's 16-figure Mermaid reference, preserving graph relationships.

Architecture figures use generic component names. Technical figures retain
only the names needed to explain the actual mechanism. Original XML sources
are the editable conversion of the same 16 Mermaid diagrams.
"""
from pathlib import Path
import importlib.util
import json
import re
import sys
import xml.etree.ElementTree as E

BASE=Path(__file__).resolve().parents[1]
ARCH=BASE/'_archive/2026-11-06-ban-cu'
OUT=BASE/'_build'
REF=Path('C:/Users/caotu/.codex/attachments/edd556f6-ee76-42b8-a732-c45cef065e23/Pasted text.txt')
spec=importlib.util.spec_from_file_location('builder',BASE/'scripts/build_diagrams.py')
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
OUT.mkdir(exist_ok=True)

titles=[
 'Sơ đồ gốc 9 tầng ngăn xếp hệ thống','Mô hình Silo','Mô hình Pool','Mô hình Bridge',
 'Mô hình Hybrid','Trọng tâm cô lập dữ liệu','Trọng tâm TCO và RLS Engine',
 'Trọng tâm tùy biến cấu trúc','Trọng tâm phân khúc khách hàng','SMB / Startup Profile',
 'Enterprise / Regulated Profile','Global Hyper-Scale Cell-Based Profile',
 'Lan truyền ngữ cảnh và cờ tính năng','SET LOCAL và tái sử dụng Connection Pool',
 'Two-Tier Caching và W-TinyLFU','Cây quyết định kiến trúc']
notes={
1:'Các đường nối giữa 9 tầng biểu diễn hệ quy chiếu phân tích, không phải một chuỗi gọi request bắt buộc.\nMiddleware là nhóm thành phần trung gian; API Gateway, Cache, Message Queue và Object Storage là các vai trò minh họa.',
2:'API Gateway / bộ định tuyến gửi request tới đúng App Instance của tenant; ứng dụng gọi Middleware và Database riêng.\nKhung dành riêng mô tả phạm vi triển khai; mức cô lập vật lý hay VM phải được xác định trong cấu hình thực tế.',
3:'Mọi tenant dùng chung App Instances Pool, Middleware và Database; dữ liệu được phân biệt bằng tenant_id.\nAPI Gateway là một thành phần Middleware ở cửa vào; khối Middleware bên dưới thể hiện các dịch vụ ứng dụng sử dụng.',
4:'App Instance dùng chung truy cập schema riêng theo tenant. Chọn schema từ registry tin cậy; search_path không thay thế quyền truy cập.\nSET LOCAL áp dụng trong transaction; COMMIT/ROLLBACK kết thúc hiệu lực cục bộ.',
5:'Mũi tên nối trực tiếp Router → App Instance → Database. Pool dùng chung giữa các tenant tiêu chuẩn; Silo dành riêng cho tenant Enterprise.\nKhung liền = dùng chung; khung đứt = dành riêng. Chia sẻ/tách biệt hạ tầng bên dưới phụ thuộc cách triển khai.',
6:'Hai DBMS process và volume riêng biểu diễn tách dịch vụ dữ liệu; khác port hoặc đường dẫn chưa chứng minh tách phần cứng.\nMuốn tuyên bố cô lập vật lý/VM, phải có ranh giới host/VM tương ứng trong triển khai.',
7:'RLS thực thi trong DBMS; policy gắn với bảng thuộc schema. App role không là superuser/BYPASSRLS; dùng ENABLE/FORCE RLS.\nThiếu/rỗng tenant context → không đọc được hàng; WITH CHECK bảo vệ thao tác ghi. Không hiểu “kernel” là nhân hệ điều hành.',
8:'Hai schema đều dành riêng; schema beta có cấu trúc tùy biến. Chọn schema từ registry tin cậy và kiểm soát quyền schema/table.\nTransaction kết thúc bằng COMMIT/ROLLBACK; SET LOCAL không để search_path của request tồn tại ngoài transaction.',
9:'Xác thực token trước khi dùng claim. Tra tenant → tier + deployment đích; tier một mình không xác định DB của tenant.\nFREE/PRO vào vùng dùng chung; ENTERPRISE vào vùng dành riêng. Token hoặc tenant không hợp lệ → từ chối.',
10:'Giữ mô hình tích hợp của bản tham chiếu: Gateway → context → feature flags → xử lý nghiệp vụ → Cache / Database.\nMiddleware có nhiều vai trò: hình này chọn Gateway và Cache; Message Queue / Object Storage chỉ thêm khi có luồng sử dụng tương ứng.',
11:'Namespace quản lý tài nguyên; runtime và hạn ngạch CPU/RAM thực thi cô lập tiến trình. Cache/Database riêng không bảo đảm miễn nhiễm mọi sự cố.\nCustom code cần sandbox và quyền tối thiểu; loại hạ tầng và chính sách cô lập phải được nêu trong triển khai.',
12:'Định tuyến theo bảng ánh xạ tenant → cell, phù hợp các dải tenant ghi trong khung. Không dùng tenant_id % 3 cho các dải liên tiếp này.\nMỗi cell có ứng dụng và dữ liệu riêng; Router/Registry vẫn là phụ thuộc chung. Dải 1.000 tenant chỉ là ví dụ sức chứa.',
}
maps={
1:{'4':'8. Application Server (Môi trường thực thi ứng dụng)',
   '5':'7. Middleware (API Gateway, Cache, Message Queue, Object Storage)',
   '8':'4. Database Server (Tiến trình hệ quản trị CSDL)',
   '10':'3. Operating System (Hệ điều hành / nhân dùng chung tùy cách triển khai)',
   '11':'2. Virtual Machine / Container Runtime (Cơ chế ảo hóa / cô lập tiến trình)',
   '12':'1. Hardware (CPU, RAM, Storage, Network)'},
2:{'4':'Tầng 7: Middleware A\nCache · Message Queue · Object Storage',
   '8':'Tầng 7: Middleware B\nCache · Message Queue · Object Storage',
   '11':'API Gateway / Bộ định tuyến chung','15':'Tenant A → Instance A','16':'Tenant B → Instance B'},
3:{'4':'Tầng 7: Middleware dùng chung\nCache · Message Queue · Object Storage'},
4:{'5':'DBMS / DATABASE DÙNG CHUNG (TẦNG 4–5)',
   '14':"BEGIN; SET LOCAL search_path = tenant_a;",'15':"BEGIN; SET LOCAL search_path = tenant_b;"},
6:{'4':'TẦNG ĐÒN BẨY: TÁCH DBMS VÀ LƯU TRỮ (TẦNG 4–6)',
   '5':'DATABASE SERVER A (DÀNH RIÊNG)','8':'DATABASE SERVER B (DÀNH RIÊNG)',
   '6':'DBMS Process A','9':'DBMS Process B','7':'Storage Volume A','10':'Storage Volume B'},
7:{'4':'TẦNG ĐÒN BẨY: RLS TRÊN BẢNG DÙNG CHUNG',
   '5':"Tenant context: current_setting('app.current_tenant_id', true) = 'T-01'",
   '6':'DBMS RLS Policy Engine\nKiểm soát đọc / ghi bằng policy',
   '7':'BẢNG BOARDS DÙNG CHUNG\ntenant_id | board_id | title\nT-01 | B-101 | Kế hoạch A\nT-02 | B-201 | Dự án Bí mật B',
   '8':'Dữ liệu trả về: B-101 | Kế hoạch A'},
8:{'9':'Trong transaction:\nSET LOCAL search_path = tenant_beta, pg_catalog;'},
9:{'3':"Xác thực JWT + quyền tenant\nTrích xuất tenant_id, tier; đối chiếu Tenant Registry",
   '7':'Shared App Instances\nVùng thực thi dùng chung',
   '8':'Dedicated App Instances\nVùng thực thi dành riêng',
   '11':"tier = FREE / PRO",'4':'Tenant Routing Table\nTenant → phân hạng + deployment đích'},
10:{'3':'Tenant Context Filter\nNgữ cảnh request bất biến',
    '4':'Đánh giá Feature Flags trong bộ nhớ\nChọn tính năng theo gói dịch vụ',
    '7':"Shared Cache\nKey: tenant:{id}:boards",'8':'Shared Database\nRLS + SET LOCAL',
    '10':'API Gateway\nToken Bucket Rate Limiting'},
11:{'2':'VÙNG THỰC THI RIÊNG (RUNTIME + RESOURCE LIMITS)',
    '3':'Dedicated App Instance\nHạn ngạch CPU / RAM riêng',
    '4':'Custom Script Runner\nSandbox cô lập mã tùy biến',
    '6':'Dedicated Cache A','7':'Dedicated Database A\nMã hóa bằng khóa khách hàng quản lý',
    '9':'Dedicated API Gateway / Ingress\nTên miền khách hàng'},
12:{'12':'Global API Gateway / Cell Router\nTra bảng ánh xạ tenant → cell',
    '14':'Tenant 1–1.000 → Cell 01','15':'Tenant 1.001–2.000 → Cell 02','16':'Tenant 2.001–3.000 → Cell 03'},
}

def label(root,cid,value):
    o=next((e for e in root.iter() if e.get('id')==cid),None)
    if o is None:raise ValueError(cid)
    key='label' if o.tag=='UserObject' else 'value';o.set(key,value)
    if 'mermaidBaseValue' in o.attrib:o.set('mermaidBaseValue',value)

def style(root,cid,dashed):
    o=next(e for e in root.iter() if e.get('id')==cid)
    c=o.find('mxCell') if o.tag=='UserObject' else o
    s=re.sub(r'(dashed|dashPattern|fixDash)=[^;]*;','',c.get('style',''))
    c.set('style',s+('dashed=1;dashPattern=5 5;' if dashed else ''))

def finish(root,n,stem):
    title=f'Hình 2.{n} · {titles[n-1]}'
    root.find('diagram').set('name',title)
    model=root.find('.//mxGraphModel');model.set('page','0');model.set('background','#ffffff')
    # Convert theme-dependent font colours and preserve original node geometry.
    for c in root.iter('mxCell'):
        s=c.get('style','')
        s=re.sub(r'fontColor=light-dark\([^;]*\);','fontColor=#213047;',s)
        c.set('style',s.replace('Trebuchet MS,Verdana,Arial,sans-serif','Arial'))
    # Place a title / explanatory footer outside all graph content.
    nodes={}
    rr=root.find('.//root')
    for e in rr:
        c=e.find('mxCell') if e.tag=='UserObject' else e
        if c is not None:nodes[e.get('id',c.get('id'))]=(e,c)
    def xy(cid):
        if cid not in nodes:return (0,0)
        _,c=nodes[cid];g=c.find('mxGeometry')
        if g is None or g.get('relative')=='1':return (0,0)
        px,py=xy(c.get('parent'))
        return px+float(g.get('x',0)),py+float(g.get('y',0))
    boxes=[]
    for cid,(_,c) in nodes.items():
        g=c.find('mxGeometry')
        if c.get('vertex')=='1' and g is not None and g.get('width'):
            x,y=xy(cid);boxes.append((x,y,float(g.get('width')),float(g.get('height'))))
    minx=min(x for x,y,w,h in boxes);miny=min(y for x,y,w,h in boxes)
    dx=30-minx;dy=110-miny
    maxx=max(x+w for x,y,w,h in boxes)+dx
    maxy=max(y+h for x,y,w,h in boxes)+dy
    for cid,(_,c) in nodes.items():
        g=c.find('mxGeometry')
        if g is None or c.get('parent')!='1':continue
        if c.get('vertex')=='1' and g.get('relative')!='1':
            g.set('x',str(float(g.get('x',0))+dx));g.set('y',str(float(g.get('y',0))+dy))
        if c.get('edge')=='1':
            for pt in g.findall('.//mxPoint'):
                if pt.get('as')=='offset':continue
                if pt.get('x'):pt.set('x',str(float(pt.get('x'))+dx))
                if pt.get('y'):pt.set('y',str(float(pt.get('y'))+dy))
    width=max(1100,maxx)
    def text(cid,txt,x,y,w,h,size,bold=False):
        c=E.SubElement(rr,'mxCell',id=cid,value=txt,vertex='1',parent='1',
           style=f'text;html=1;whiteSpace=wrap;align=left;fontFamily=Arial;fontColor=#213047;fontSize={size};fontStyle={1 if bold else 0};')
        E.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),**{'as':'geometry'})
    text('reference-title',title,30,20,width-30,65,24,True)
    text('reference-footer',notes.get(n,''),30,maxy+30,width-30,100,14)
    E.indent(root);E.ElementTree(root).write(OUT/(stem+'.drawio'),encoding='utf-8',xml_declaration=True)
    return {'stem':stem,'title':title}


def main():
    reference_dir=BASE/'tham-chieu-16-hinh';reference_dir.mkdir(exist_ok=True)
    raw=REF.read_text(encoding='utf-8')
    chunks=re.findall(r'```mermaid\s*\n(.*?)```',raw,re.S)
    assert len(chunks)==16
    (reference_dir/'ban-tham-chieu-goc.txt').write_text(raw,encoding='utf-8')
    for i,s in enumerate(chunks,1):(reference_dir/f'hinh_2_{i}.mmd').write_text(s.strip()+'\n',encoding='utf-8')
    # Preserve prior build sources outside the export input to avoid stale figures.
    stale=OUT/'nguon-truoc-doi-chieu';stale.mkdir(exist_ok=True)
    for p in list(OUT.glob('*.drawio')):
        dest=stale/p.name
        if dest.exists():dest=stale/(p.stem+'-previous.drawio')
        p.replace(dest)
    result=[]
    for n in range(1,13):
        p=next(ARCH.glob(f'hinh_2_{n}_*.drawio'));root=E.parse(p).getroot()
        if n==11:
            d=b.Diagram(p.stem,'Hình 2.11 · '+titles[10],
                'App Instance, Cache và Database dành riêng; mã tùy biến chạy trong sandbox.',width=1440)
            client=d.box('Enterprise Client Request',440,130,560,60)
            gw=d.box('Dedicated API Gateway / Ingress',440,260,560,65,'orange')
            run=d.group('VÙNG THỰC THI DÀNH RIÊNG',350,425,740,275,'purple',True)
            app=d.box('Dedicated App Instance\nHạn ngạch CPU / RAM riêng',30,70,680,70,parent=run)
            custom=d.box('Custom Script Runner · Sandbox',120,185,500,60,parent=run)
            services=d.group('DỊCH VỤ VÀ LƯU TRỮ DÀNH RIÊNG',30,820,1380,200,'green',True)
            cache=d.box('Dedicated Cache A',20,70,420,85,'orange',parent=services,shape='db')
            db=d.box('Dedicated Database A\nMã hóa bằng khóa khách hàng quản lý',500,70,850,85,'green',parent=services,shape='db')
            d.edge(client,gw)
            d.edge(gw,app,'Định tuyến tới Instance',exit=(.5,1),entry=(0,.25),points=[(720,375),(320,375),(320,512.5)])
            d.edge(app,custom)
            d.edge(app,cache,'Truy cập Cache',exit=(0,.5),entry=(.5,0),points=[(310,530),(310,760),(260,760)])
            d.edge(app,db,'Truy cập dữ liệu',exit=(1,.5),entry=(.7,0),points=[(1140,530),(1140,760),(1125,760)])
            d.save(notes[11],1050)
            result.append({'stem':p.stem,'title':'Hình 2.11 · '+titles[10]})
            continue
        for cid,value in maps.get(n,{}).items():label(root,cid,value)
        if n==5:style(root,'2',False);style(root,'5',True)
        if n==8:style(root,'5',True);style(root,'7',True)
        if n==10:
            o=next(e for e in root.iter('UserObject') if e.get('id')=='4');c=o.find('mxCell')
            c.set('style',c.get('style','').replace('rhombus;','rounded=1;'))
        if n==12:
            for cid in ['2','5','8']:style(root,cid,True)
            # Route to the application node, not just the cell container.
            for c in root.iter('mxCell'):
                if c.get('source')=='12' and c.get('edge')=='1':
                    c.set('target',{'2':'3','5':'6','8':'9'}[c.get('target')])
                    # Enter App Cluster horizontally from the cell's outside corridor,
                    # avoiding arrows drawn through the cell title.
                    nodes={o.get('id'):o.find('mxCell') for o in root.iter('UserObject')}
                    def pos(cid):
                        node=nodes[cid];g=node.find('mxGeometry');par=node.get('parent')
                        x,y=(pos(par)[:2] if par in nodes else (0,0))
                        return x+float(g.get('x',0)),y+float(g.get('y',0)),float(g.get('width')),float(g.get('height'))
                    tid=c.get('target');tx,ty,tw,th=pos(tid)
                    targetgroup=nodes[tid].get('parent');gx,gy,_,_=pos(targetgroup)
                    sx,sy,sw,sh=pos('12');port={'3':.15,'6':.5,'9':.85}[tid]
                    c.set('style',f'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;fontFamily=Arial;fontSize=15;labelBackgroundColor=#ffffff;endArrow=block;exitX={port};exitY=1;entryX=0;entryY=0.5;')
                    g=c.find('mxGeometry')
                    for child in list(g):g.remove(child)
                    arr=E.SubElement(g,'Array',**{'as':'points'})
                    for x,y in [(sx+sw*port,gy-45),(gx-20,gy-45),(gx-20,ty+th/2)]:
                        E.SubElement(arr,'mxPoint',x=str(x),y=str(y))
        result.append(finish(root,n,p.stem))
    # Retain the repaired transaction and cache flows, using reference numbering.
    b.sequences();b.cache();b.decision()
    transfers=[(14,'hinh_2_12_set_local_sequence','hinh_2_14_set_local_sequence'),
               (15,'hinh_2_13_two_tier_caching','hinh_2_15_two_tier_caching'),
               (16,'hinh_2_14_decision_tree','hinh_2_16_decision_tree')]
    for n,old,new in transfers:
        root=E.parse(OUT/(old+'.drawio')).getroot()
        # These generated diagrams already contain title/footer boxes.
        for c in root.iter('mxCell'):
            v=c.get('value','')
            if v.startswith(f'Hình 2.{12 if n==14 else 13 if n==15 else 14} ·'):
                c.set('value',f'Hình 2.{n} · {titles[n-1]}')
            c.set('value',c.get('value','').replace('HikariCP Pool','Connection Pool')
                  .replace('L1 Caffeine','L1 Cache').replace('L2 Redis','L2 Cache dùng chung')
                  .replace('Caffeine (W-TinyLFU)','Cache (W-TinyLFU)')
                  .replace('Caffeine','L1 Cache').replace('Redis L2','Cache L2'))
        if n==16:
            for c in root.iter('mxCell'):
                v=c.get('value','')
                if v.startswith('2 · Tenant cần chạy'):c.set('value','2 · Cần tùy biến sâu\ncấu trúc bảng / trigger?')
                elif v.startswith('COMPUTE-ISOLATED / SHARED-DATA'):c.set('value','SCHEMA-PER-TENANT · BRIDGE\nSchema riêng cho từng tenant')
                elif v.startswith('3 · Phân hóa mạnh'):c.set('value','3 · Tải / doanh thu / SLA\nphân hóa mạnh giữa các tenant?')
                elif v.startswith('TIERED PLATFORM'):c.set('value','TIERED HYBRID\nStandard: Pool · Enterprise: Silo')
                elif v.startswith('Bốn Decision Drivers'):c.set('value','Bốn nhóm tiêu chí theo bản tham chiếu 16 hình. Các nhánh là hướng lựa chọn cần kiểm chứng theo yêu cầu thực tế.')
                elif v.startswith('Câu 1 phải'):c.set('value','Yêu cầu tuân thủ/BYOK phải chuyển thành yêu cầu triển khai cụ thể; không tự động đồng nghĩa Silo.\nGiữ nhánh tùy biến bảng → Bridge theo bản tham chiếu. Cell-Based cần tiêu chí quy mô / vùng triển khai / phạm vi sự cố.')
        root.find('diagram').set('name',f'Hình 2.{n} · {titles[n-1]}')
        E.indent(root);E.ElementTree(root).write(OUT/(new+'.drawio'),encoding='utf-8',xml_declaration=True)
        result.append({'stem':new,'title':f'Hình 2.{n} · {titles[n-1]}'})
    # Reference 13: explicit Client → Gateway → Backend, rather than reading DB at a network gateway.
    seqspec=importlib.util.spec_from_file_location('seq',BASE.parent/'AIDraw/drawio-skill/scripts/seqlayout.py')
    seq=importlib.util.module_from_spec(seqspec);seqspec.loader.exec_module(seq)
    seq.LIFELINE_W=180;seq.TOP=130;seq.ROW=75;seq.SELF_ROW=90;seq.MIN_SPACING=330
    seq.LIFELINE+=b.FONT+'fillColor=#EAF2FF;strokeColor=#527CB8;'
    seq.SYNC+=b.FONT+'fontSize=15;labelBackgroundColor=#ffffff;'
    seq.RETURN+=b.FONT+'fontSize=15;labelBackgroundColor=#ffffff;'
    msgs=[('c','g','HTTP request + JWT'),('g','a','Request đã xác thực'),
          ('a','a','Tạo immutable TenantContext'),('a','f','EvaluateFlag(flag, tenant, tier)'),
          ('f','a','Giá trị flag từ bộ nhớ',True),('a','d','Transaction + SET LOCAL; truy vấn RLS'),
          ('d','a','Dữ liệu đúng tenant',True),('a','a','finally: clear TenantContext'),
          ('a','g','Kết quả hoặc lỗi',True),('g','c','HTTP response',True)]
    js={'title':'Context + Feature Flags','participants':[{'id':i,'label':v} for i,v in [
        ('c','Client'),('g','API Gateway'),('a','Backend / Context Filter'),('f','In-Memory Feature Engine'),('d','Database')]],
        'messages':[{'from':m[0],'to':m[1],'label':m[2],'return':len(m)>3,'activate':False} for m in msgs]}
    notes[13]='TenantContext được lưu và dọn tại Backend trong finally, không truyền qua HTTP bằng ThreadLocal.\nĐánh giá tại bộ nhớ là lựa chọn provider, không phải bảo đảm <1ms. Truy cập Database theo Hình 2.14.'
    result.append(finish(E.fromstring(seq.layout(js)),13,'hinh_2_13_feature_flags_sequence'))
    # Clean only superseded generated source files; keep export inputs at exactly 16.
    wanted={m['stem']+'.drawio' for m in result}
    for p in list(OUT.glob('*.drawio')):
        if p.name not in wanted:p.replace(stale/p.name)
    result.sort(key=lambda m:int(m['stem'].split('_')[2]))
    (OUT/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Rebuilt 16 diagrams against the new reference. Original Mermaid preserved.')

if __name__=='__main__':main()

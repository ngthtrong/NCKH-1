from pathlib import Path
import json,subprocess,importlib.util,sys
base=Path(__file__).resolve().parent
source=(base/'build_figures.py').read_text(encoding='utf-8').split('# 1.1: history')[0]
ns={'__file__':str(base/'build_figures.py')};exec(source,ns)
G=ns['G'];fig=base/'figures'
layers=[
('Application Instance','Bản ứng dụng đang chạy: Web API, worker, microservice','blue'),
('Application Server','Môi trường thực thi: JVM, Node.js, Web runtime','blue'),
('Middleware','API Gateway, cache, message queue, object storage','orange'),
('Database Schema','Lược đồ bảng; schema riêng hoặc bảng chung có Tenant ID','green'),
('Database','Đơn vị cơ sở dữ liệu logic trong DBMS','green'),
('Database Server','Dịch vụ DBMS: PostgreSQL, MySQL','green'),
('Operating System','Hệ điều hành; container dùng namespaces và cgroups','grey'),
('Virtual Machine','Máy ảo và cơ chế ảo hóa; có thể không sử dụng','grey'),
('Hardware','CPU, RAM, mạng và thiết bị lưu trữ vật lý','grey')]
for updated in ([True] if '--new-only' in sys.argv else [False,True]):
    stem='hinh_1_16_ngan_xep_cap_nhat' if updated else 'hinh_1_15_ngan_xep_goc'
    g=G(stem,'Ngăn xếp chín tầng cập nhật' if updated else 'Ngăn xếp chín tầng nguyên bản',1000,720)
    for i,(name,example,color) in enumerate(layers):
        solid=i<6 if updated else i in [0,1,3,4,5]
        label=f'[{9-i}] {name}\n{example}' if updated else name
        node=g.box(label,30,15+i*66,940,59,color if updated else 'grey')
        cell=g.root.find(f"mxCell[@id='{node}']")
        st=cell.get('style')+('fontSize=22;spacing=2;' if updated else 'fontSize=24;')+'rounded=0;'
        if not updated:st+='fillColor=#FFFFFF;strokeColor=#777777;'
        if not solid:st+='dashed=1;dashPattern=6 4;'
        cell.set('style',st)
    g.text('Nét liền: phạm vi phân tích phần mềm của bản cập nhật\nNét đứt: hạ tầng và môi trường thực thi; có thể chia sẻ hoặc tách riêng' if updated else 'Vẽ lại theo Figure 2 của Kabbedijk và cộng sự (2015) [3]\nNét liền và nét đứt giữ theo phạm vi phân tích trong mô hình gốc',30,625,940,80,22)
    caption='Hình 1.16 Ngăn xếp chín tầng cập nhật cho kiến trúc Cloud-Native do nhóm đề xuất' if updated else 'Hình 1.15 Ngăn xếp chín tầng nguyên bản của Kabbedijk và cộng sự (vẽ lại theo [3])'
    g.save(caption,'1.5.3','So sánh phạm vi phân tích của ngăn xếp nguyên bản và bản cập nhật; không phải thang trưởng thành SaaS.',after=1 if updated else 0)
    src=fig/'drawio'/(stem+'.drawio')
    for fmt,folder,suffix,width,embed in [('png','png','.png',2000,False),('svg','svg','.svg',None,True),('png','editable-png','.drawio.png',2400,True)]:
        dst=fig/folder/(stem+suffix)
        args=[str(ns['EXE']),'-x','-f',fmt,'-b','15','--theme','light','--timeout','40','-o',str(dst),str(src),'--disable-gpu']
        if width:args+=['--width',str(width)]
        if embed:args+=['-e']
        result=subprocess.run(args,capture_output=True,timeout=90)
        if result.returncode:raise RuntimeError(result.stderr.decode(errors='replace'))
        if fmt=='png' and embed:
            spec=importlib.util.spec_from_file_location('repair',base.parents[1]/'AIDraw/drawio-skill/scripts/repair_png.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);mod.repair(str(dst))
    print('Exported',stem,flush=True)
manifest=json.loads((fig/'manifest.json').read_text(encoding='utf-8'))
manifest=[x for x in manifest if x['stem'] not in [y['stem'] for y in ns['MAN']]]
pos=next(i for i,x in enumerate(manifest) if x['section'].startswith('2.'))
manifest[pos:pos]=ns['MAN']
(fig/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')

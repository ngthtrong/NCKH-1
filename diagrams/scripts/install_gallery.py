"""Verify exports, preserve originals, install sources and a local gallery."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import hashlib
import html
import json
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from urllib.parse import unquote

BASE=Path(__file__).resolve().parents[1]
BUILD=BASE/'_build'
GALLERY_ONLY='--gallery-only' in sys.argv
manifest=json.loads(((BASE if GALLERY_ONLY else BUILD)/'manifest.json').read_text(encoding='utf-8'))
for m in manifest:
    m.update(drawio=f"drawio/{m['stem']}.drawio", png=f"png/{m['stem']}.drawio.png", svg=f"svg/{m['stem']}.svg")
for folder in ['drawio','png','svg']:(BASE/folder).mkdir(exist_ok=True)

# Validate all deliverables before changing the original directory.
for m in ([] if GALLERY_ONLY else manifest):
    p=BUILD/(m['stem']+'.drawio')
    r=subprocess.run([sys.executable,str(BASE.parent/'AIDraw/drawio-skill/scripts/validate.py'),str(p)],capture_output=True)
    if r.returncode: raise RuntimeError(r.stdout.decode('utf-8',errors='replace'))
    for fmt in ['png','svg']:
        out=BUILD/'final'/(m['stem']+'.'+fmt)
        if not out.exists(): raise FileNotFoundError(out)
        if fmt=='svg': ET.parse(out)
        else:
            with Image.open(out) as im:
                im.verify()
            with Image.open(out) as im:
                im.load()
                embedded=im.info.get('mxGraphModel',im.info.get('mxfile',''))
                if not embedded: raise ValueError(f'Missing embedded XML: {out}')
                embedded_root=ET.fromstring(unquote(embedded))
                if embedded_root.find('.//diagram').get('name')!=ET.parse(p).find('.//diagram').get('name'):
                    raise ValueError(f'Embedded XML does not match source: {out}')

archive=(BASE/'_archive/2026-11-06-ban-cu').resolve()
if not archive.is_relative_to(BASE.resolve()): raise ValueError('Archive escaped workspace')
if not GALLERY_ONLY and not (BASE/'manifest.json').exists():
    archive.mkdir(parents=True,exist_ok=False)
    originals=[p for p in BASE.iterdir() if p.is_file() and (p.suffix in ['.drawio','.svg'] or p.name.endswith('.drawio.png'))]
    oldmanifest={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in originals}
    (archive/'sha256.json').write_text(json.dumps(oldmanifest,indent=2),encoding='utf-8')
    for p in originals:
        target=archive/p.name
        if target.exists():raise FileExistsError(target)
        shutil.move(str(p),str(target))

# The 16-figure reference supersedes the prior 14+4 edition. Preserve that
# edition before replacing names, so the root never mixes two numbering sets.
if not GALLERY_ONLY and (BASE/'manifest.json').exists():
    previous=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
    if {m['stem'] for m in previous}!={m['stem'] for m in manifest}:
        snap=(BASE/'_archive/2026-11-06-ban-14-cong-4').resolve()
        if not snap.is_relative_to(BASE.resolve()):raise ValueError('Archive escaped workspace')
        snap.mkdir(parents=True,exist_ok=False)
        for m in previous:
            for ext in ['.drawio','.drawio.png','.svg']:
                src=(BASE/(m['stem']+ext)).resolve();dst=(snap/(m['stem']+ext)).resolve()
                if not src.is_relative_to(BASE.resolve()) or not dst.is_relative_to(snap):raise ValueError('Invalid archive path')
                if src.exists():dst.parent.mkdir(parents=True,exist_ok=True);shutil.move(str(src),str(dst))
        for name in ['manifest.json','danh-muc-hinh.md','kiem-tra-doi-chieu-bao-cao.md','tong-quan-bo-sung.png']:
            p=BASE/name
            if p.exists():shutil.copy2(p,snap/name)
        supplemental=BASE/'bo-sung'
        if supplemental.exists() and not any(supplemental.iterdir()):supplemental.rmdir()

for m in ([] if GALLERY_ONLY else manifest):
    shutil.copy2(BUILD/(m['stem']+'.drawio'),BASE/m['drawio'])
    shutil.copy2(BUILD/'final'/(m['stem']+'.png'),BASE/m['png'])
    shutil.copy2(BUILD/'final'/(m['stem']+'.svg'),BASE/m['svg'])

(BASE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')

# Offline HTML: local PNG/SVG/source links, zoom dialog and arrow-key navigation.
cards=[]
for i,m in enumerate(manifest):
    title=html.escape(m['title'])
    png,svg,drawio=(html.escape(m[k]) for k in ['png','svg','drawio'])
    cards.append(f'''<article id="fig-{i}" data-title="{title.lower()}">
    <button class="image" data-index="{i}" aria-label="Phóng to {title}"><img loading="lazy" src="{png}" alt="{title}"></button>
    <h2>{title}</h2><div class="links"><button data-index="{i}">Phóng to</button>
    <a href="{png}" target="_blank">PNG</a><a href="{svg}" target="_blank">SVG</a>
    <a href="{drawio}" download>Nguồn Draw.io</a></div></article>''')
data=json.dumps(manifest,ensure_ascii=False).replace('</','<\/')
doc='''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Diagram Chương 2 — bản đã sửa</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f5f8;color:#213047;font:16px/1.5 system-ui,Arial,sans-serif}
header{max-width:1440px;margin:auto;padding:40px 28px 22px}header p{max-width:900px;color:#53647c}
h1{font-size:32px;line-height:1.2;margin:0 0 12px}h2{font-size:17px;margin:18px 18px 12px}
.bar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}input{padding:12px 16px;border:1px solid #bbc6d5;border-radius:9px;font:inherit;min-width:300px}
.badge{background:#e3eee7;color:#286546;border-radius:50px;padding:7px 14px;font-size:14px}
main{max-width:1440px;margin:auto;padding:0 28px 50px;display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:22px}
article{background:white;border:1px solid #dce2ea;border-radius:14px;overflow:hidden}.image{display:block;width:100%;height:370px;background:white;border:0;padding:16px;cursor:zoom-in}
.image img{width:100%;height:100%;object-fit:contain}.links{display:flex;gap:10px;align-items:center;padding:0 18px 20px;flex-wrap:wrap}
button,a{font:inherit}a{color:#315c94;text-underline-offset:3px}button:not(.image){border:1px solid #b4c3d7;background:white;color:#315c94;border-radius:7px;padding:7px 12px;cursor:pointer}
dialog{width:calc(100vw - 32px);height:calc(100vh - 32px);max-width:none;max-height:none;border:0;border-radius:12px;padding:0;background:#e9eef4}
dialog::backdrop{background:#162133cc}.toolbar{position:sticky;top:0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:white;padding:12px 18px;border-bottom:1px solid #ccd5e0;z-index:2}
.toolbar strong{flex:1}.viewer{height:calc(100% - 76px);overflow:auto;padding:22px;text-align:center}.viewer img{max-width:100%;max-height:100%;object-fit:contain;background:white}.viewer.full img{max-width:none;max-height:none}
@media(max-width:700px){main{grid-template-columns:1fr}.image{height:300px}header{padding-top:24px}h1{font-size:26px}}
@media print{header,.bar,.links{display:none}main{display:block;padding:0}article{break-after:page;border:0}.image{height:85vh}h2{margin:0}}
</style><header><h1>Diagram Chương 2 · Bản đã sửa</h1>
<p>16 hình theo bản tham chiếu Mermaid người dùng cung cấp. Nhấn hình để phóng to; dùng phím ← / → để chuyển hình, Esc để đóng. PNG rộng 2.400 px, SVG và nguồn Draw.io đều có sẵn trên máy.</p>
<div class="bar"><input id="search" type="search" placeholder="Tìm hình: RLS, Cell, Enterprise…" aria-label="Tìm hình"><span class="badge">16 sơ đồ · Bản tham chiếu mới</span>
<a href="danh-muc-hinh.md">Danh mục + ghi chú sửa báo cáo</a></div></header><main>'''+''.join(cards)+'''</main>
<dialog id="zoom"><div class="toolbar"><button id="prev" aria-label="Hình trước">←</button><button id="next" aria-label="Hình sau">→</button>
<strong id="caption"></strong><button id="size">Kích thước gốc</button><a id="png" target="_blank">Mở PNG</a><a id="svg" target="_blank">Mở SVG</a><button id="close">Đóng ✕</button></div>
<div id="viewer" class="viewer"><img id="large" alt=""></div></dialog><script>
const figures='''+data+''';let current=0;const dlg=document.getElementById('zoom'),viewer=document.getElementById('viewer');
function show(i){current=(i+figures.length)%figures.length;const f=figures[current];document.getElementById('large').src=f.png;document.getElementById('large').alt=f.title;document.getElementById('caption').textContent=f.title;document.getElementById('png').href=f.png;document.getElementById('svg').href=f.svg;if(!dlg.open)dlg.showModal();viewer.scrollTo(0,0)}
document.querySelectorAll('[data-index]').forEach(b=>b.onclick=()=>show(Number(b.dataset.index)));
document.getElementById('prev').onclick=()=>show(current-1);document.getElementById('next').onclick=()=>show(current+1);document.getElementById('close').onclick=()=>dlg.close();
document.getElementById('size').onclick=()=>{viewer.classList.toggle('full');document.getElementById('size').textContent=viewer.classList.contains('full')?'Vừa màn hình':'Kích thước gốc'};
document.addEventListener('keydown',e=>{if(dlg.open&&e.key==='ArrowRight')show(current+1);if(dlg.open&&e.key==='ArrowLeft')show(current-1)});
document.getElementById('search').oninput=e=>{const q=e.target.value.toLocaleLowerCase('vi');document.querySelectorAll('article').forEach(a=>a.hidden=!a.dataset.title.includes(q))};
</script></html>'''
(BASE/'xem-tat-ca.html').write_text(doc,encoding='utf-8')

# Replace the superseded review text with the current reference-based audit.
notes='''# Danh mục 16 hình — đối chiếu bản tham chiếu mới

[Mở bộ xem ảnh](xem-tat-ca.html). PNG 2.400 px; SVG và nguồn Draw.io có thể chỉnh sửa.

File được phân loại trong `png/`, `svg/` và `drawio/`; PNG xem nhanh cũng nằm trong `png/`.

Chuẩn áp dụng: bản lưu trữ gồm 16 sơ đồ Mermaid người dùng gửi. Bản 14 hình chính + 4 hình phụ trước đó dùng một dàn ý khác và đã được thay thế. Các file nguồn Mermaid nguyên bản nằm tại `tham-chieu-16-hinh/`.

Đã khôi phục đúng số/chủ đề 2.1–2.16 và các quan hệ Client → Gateway → App Instance, App → Middleware / Database. Các hình mô hình dùng tên chức năng chung. Middleware không đồng nghĩa Cache/Message Queue: API Gateway ở cửa vào cũng thuộc nhóm Middleware; khối hỗ trợ ứng dụng liệt kê Cache, Message Queue, Object Storage. Các profile chỉ vẽ thành phần có luồng sử dụng tương ứng.

Các hiệu chỉnh có chủ đích so với mã mẫu:

- Hybrid: Pool khung liền, Silo khung đứt; hai schema riêng cùng dùng nét đứt.
- Cell: dùng bảng ánh xạ/dải tenant như nhãn; mũi tên Router nối trực tiếp App Cluster. Bỏ modulo không khớp dải.
- Cache: đủ Hit/Miss ở L1/L2, đọc DB, trả dữ liệu và cập nhật cache. Từ chối admission không làm mất request; W-TinyLFU không tự điều khiển L2.
- SET LOCAL: UUID hợp lệ, COMMIT/ROLLBACK, finally trả connection; không khẳng định session luôn reset thành NULL.
- Context/flags: thêm Backend để xác định nơi giữ context và truy cập DB; cleanup trong finally. Không khẳng định độ trễ <1ms nếu chưa đo.
- Decision tree: giữ nhánh tùy biến cấu trúc bảng → Schema-per-Tenant / Bridge theo đúng bản mới; không thay bằng Compute-Isolated. Giảm các khẳng định tuyệt đối và ngưỡng tải không có căn cứ.
- DBMS/RLS: phân biệt điểm thực thi engine với bảng/schema; tách process/volume không tự chứng minh tách phần cứng.

Tên công nghệ chỉ giữ ở hình giải thích cơ chế cần thiết (ví dụ SQL, RLS, SET LOCAL); không gắn tên sản phẩm cụ thể lên các khối Cache/Message Queue trong mô hình tổng quát.

## Ảnh và nguồn

'''
for m in manifest:
    notes+=f"### {m['title']}\n\n[PNG]({m['png']}) · [SVG]({m['svg']}) · [Draw.io]({m['drawio']})\n\n![{m['title']}]({m['png']})\n\n"
(BASE/'danh-muc-hinh.md').write_text(notes,encoding='utf-8')

# Raster contact sheets for quick inspection outside a browser.
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',25)
for group,items in [('tong-quan-01',manifest[:8]),('tong-quan-02',manifest[8:]),
                    ('xem-nhanh',[manifest[i] for i in [1,2,4,11]])]:
    cols=2;tilew,tileh=1000,940
    sheet=Image.new('RGB',(cols*tilew,((len(items)+cols-1)//cols)*tileh),'#e9eef4')
    dr=ImageDraw.Draw(sheet)
    for i,m in enumerate(items):
        x=(i%cols)*tilew;y=(i//cols)*tileh
        im=Image.open(BASE/m['png']).convert('RGB')
        im=ImageOps.contain(im,(tilew-36,tileh-90),Image.Resampling.LANCZOS)
        sheet.paste(im,(x+(tilew-im.width)//2,y+64+(tileh-90-im.height)//2))
        title=m['title']
        dr.text((x+20,y+18),title,font=font,fill='#213047')
    sheet.save(BASE/'png'/(group+'.png'))
print(f'Installed {len(manifest)} diagrams, {len(manifest)*2} exports, gallery and contact sheets.')

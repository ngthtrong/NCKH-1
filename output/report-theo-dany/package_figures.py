from pathlib import Path
import subprocess, sys, importlib.util, json, zipfile, hashlib
from PIL import Image

base=Path(__file__).resolve().parent
root=base.parents[1]
fig=base/'figures'
final=fig/'editable-png'
final.mkdir(exist_ok=True)
if '--skip-export' not in sys.argv:
    result=subprocess.run([str(root/'.diagram-tools/drawio/draw.io.exe'),'-x','-f','png','-e','--width','2400','-b','15','--theme','light','--timeout','40','-o',str(final),str(fig/'drawio'),'--disable-gpu'],capture_output=True,timeout=240)
    if result.returncode:raise RuntimeError(result.stderr.decode(errors='replace'))
spec=importlib.util.spec_from_file_location('repair',root/'AIDraw/drawio-skill/scripts/repair_png.py')
repair=importlib.util.module_from_spec(spec);spec.loader.exec_module(repair)
for file in final.glob('*.png'):
    repair.repair(str(file))
    if not file.name.endswith('.drawio.png'):
        file.rename(file.with_name(file.stem+'.drawio.png'))
for file in final.glob('*.png'):
    with Image.open(file) as im:im.verify()
manifest=json.loads((fig/'manifest.json').read_text(encoding='utf-8'))
assert len(list(final.glob('*.png')))==19
note='''BỘ HÌNH BÁO CÁO THEO DANY.MD

19 hình được vẽ lại bằng draw.io, tương ứng đúng hình trong bản Word.
- drawio/: bản nguồn chỉnh sửa trực tiếp.
- png/: ảnh 2400 px, có nhúng nguồn, mở lại được bằng draw.io.
- svg/: ảnh vector có nhúng nguồn.

Hình lý thuyết minh họa khái niệm; hình Chương 3 là thiết kế đề xuất.
Đồ thị TCO dùng góc nhìn nhà cung cấp trong cùng kỳ đánh giá, không phải số đo thực nghiệm.
Trong sơ đồ luồng, đường liền chỉ quan hệ phục vụ/xử lý; nét đứt trong mô hình tổng thể chỉ phạm vi áp dụng kiểm soát.
Riêng ngăn xếp chín tầng, viền liền và viền đứt phân biệt phạm vi phân tích theo chú thích ngay dưới hình; không biểu thị đường đi của request.
Lược đồ dữ liệu đọc lực lượng quan hệ từ trái sang phải hoặc từ trên xuống dưới.
Configurable, Multi-Tenant-Efficient: mã và backend chung, dữ liệu có Tenant ID, metadata áp dụng lúc chạy.

DANH MỤC HÌNH
'''
for entry in manifest:note+=entry['caption']+' — '+entry['stem']+'\n'
out=root/'Bo hinh bao cao NCKH.zip'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
    z.writestr('HUONG_DAN.txt',note.encode('utf-8-sig'))
    for directory,arc in [(fig/'drawio','drawio'),(final,'png'),(fig/'svg','svg')]:
        for f in sorted(directory.iterdir()):
            if f.is_file():z.write(f,arc+'/'+f.name)
print(json.dumps({'archive':str(out),'figures':len(manifest),'files':len(zipfile.ZipFile(out).namelist()),'bytes':out.stat().st_size},ensure_ascii=False))

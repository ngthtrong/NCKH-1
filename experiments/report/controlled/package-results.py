import hashlib,json,platform,shutil,statistics,sys,tarfile
from pathlib import Path
from docx import Document
from docx.shared import Inches,Pt
out=Path(sys.argv[1]).resolve();root=Path(__file__).resolve().parents[3];extras=[]
cache=json.loads((out/'cache-probe.json').read_text());browser=json.loads((out/'browser/browser-measurements.json').read_text())
def desc(values):return {'mean':statistics.mean(values),'sd':statistics.stdev(values)if len(values)>1 else 0,'min':min(values),'max':max(values)}
cacheSummary={k:desc([x for s in cache['samples']for x in(s['l1Ms']if k=='l1Ms'else[s[k]])])for k in ['dbMs','l1Ms','l2Ms']}
browserSummary={role:desc([s['boardReadyMs']for s in browser['samples']if s['role']==role])for role in ['small','large']}
extras+=['','## Phụ lục đo cache và trình duyệt','','| Đường đọc cấu hình | Số mẫu | API round-trip mean ± SD (ms) |','|---|---:|---:|']
for k,label,n in [('dbMs','Cold: DB (L1/L2 miss)',5),('l1Ms','L1 hit',50),('l2Ms','L2 hit sau Pub/Sub xóa L1',5)]:
 d=cacheSummary[k];extras.append(f"| {label} | {n} | {d['mean']:.2f} ± {d['sd']:.2f} |")
extras+=['','Các đường cache được xác nhận bằng hiệu counter hit/miss. Thời gian trên gồm xác thực, resolve tenant, đọc version từ DB và HTTP; không gọi đây là thời gian nội tại của Caffeine/Redis. Năm lần Pub/Sub được handler ứng dụng tiếp nhận; bound quan sát trong cache-probe.json gồm Docker CLI và polling, không phải độ trễ liên API.','','| Trình duyệt fresh context | Lượt | Board-ready mean ± SD (ms) |','|---|---:|---:|']
for role,d in browserSummary.items():extras.append(f"| {role} | 5 | {d['mean']:.2f} ± {d['sd']:.2f} |")
extras+=['','Board-ready đo từ điều hướng đến khi DOM có đủ 200/1.000 thẻ. LCP và long tasks là số đo phòng thí nghiệm trong browser-measurements.json; không xem là Web Vitals người dùng thực. Ảnh desktop/mobile và kiểm tra cấu hình, mật độ thẻ được lưu trong browser/.','','## Kiểm tra dữ liệu bổ sung','','Năm lượt SQL bổ sung kiểm tra SELECT không WHERE, thiếu context, UPDATE/DELETE ngoại tenant bằng 0 dòng, INSERT ngoại tenant bị PostgreSQL từ chối SQLSTATE 42501 và ngữ cảnh SET LOCAL được xóa sau rollback. Xem database-isolation-repeated.json. Redis keys được kiểm tra prefix tenant và payload board thuộc project của tenant đó.','','## Đối chiếu mức độ hoàn tất với báo cáo','','- Có đủ năm lượt chức năng, năm cặp RLS, năm cặp tải, năm probe cache và năm lượt trình duyệt mỗi tenant. Có mean/SD, p50/p95/p99, RPS, status, hit/miss, CPU/RAM, plans và artifact thô.','- Truy vấn nhóm nhỏ dùng Index Scan; nhóm vừa/lớn có thể dùng Bitmap Index Scan + Bitmap Heap Scan + Sort. Phải ghi đúng plan, không gọi tất cả là Index Scan thuần.','- Schema trường động hiện hỗ trợ STRING/NUMBER/BOOLEAN + required; không phải bộ validator đầy đủ JSON Schema Draft 2020-12 hoặc numeric min/max tùy ý.','- Một API không kiểm chứng lan truyền giữa nhiều instance. Pub/Sub handler và hành vi yêu cầu kế tiếp được kiểm tra trong phạm vi một API.','- Các thông số còn trống trong Word được protocol chọn trước bộ tải cuối, không giả là thông số Word đã quy định. Ngưỡng và mọi lượt lỗi đều giữ nguyên.','- Lượt pilot v1 và lỗi mount ban đầu giữ riêng, không trộn vào năm cặp cuối. V2 tăng năng lực generator để tránh thiếu luồng chờ; không thay ngân sách ứng dụng hay mức tải.','- Không sửa Word gốc. Những đoạn Word khẳng định sẵn cải thiện hiệu năng phải thay bằng kết luận theo bảng thực đo này.']
resource=json.loads((out/'resource-analysis.json').read_text())
extras+=['','## Tài nguyên trong cửa sổ đo chính','','| Nhánh | Thành phần | CPU %, mean ± SD giữa các lượt | RAM MiB, mean ± SD giữa các lượt |','|---|---|---:|---:|']
for variant in ['before','after']:
 for name in ['api','postgres','redis']:
  selected=[r['resource'][f'nckh-experiment-{name}-1']for r in resource['runs']if r['variant']==variant]
  cpu=[r['cpu_percent']['mean']for r in selected if r['cpu_percent']['mean']is not None];ram=[r['memory_mib']['mean']for r in selected if r['memory_mib']['mean']is not None]
  if cpu and ram:
   c=desc(cpu);m=desc(ram);extras.append(f"| {variant} | {name} | {c['mean']:.2f} ± {c['sd']:.2f} | {m['mean']:.2f} ± {m['sd']:.2f} |")
extras+=['','Docker CPU 100% tương ứng một lõi; giá trị lấy từ mẫu Docker stats trong cửa sổ đo. Giới hạn/số mẫu/min/max và cache theo khoảng lấy mẫu có trong resource-analysis.json. Scrape Prometheus có deadline: khi API cơ sở quá tải, mẫu có thể thiếu; không suy ra CPU/RAM từ mẫu thiếu đó.','','## Kế hoạch truy vấn ứng dụng thực tế','','| Nhóm | SQL executor mean ± SD (ms), 5 mẫu |','|---|---:|']
plans=json.loads((out/'application-query-plans.json').read_text())
for role,items in plans['roles'].items():
 values=[r['plan'][0]['Execution Time']for r in items];d=desc(values);extras.append(f"| {role} | {d['mean']:.3f} ± {d['sd']:.3f} |")
extras+=['','SELECT ứng dụng gồm các truy vấn con đếm công việc con và bình luận; EXPLAIN trên DB ấm sau tải. Đây là executor time, không phải toàn bộ HTTP latency. Kế hoạch và buffers từng mẫu có trong application-query-plans.json.']
revision=out/'IMPLEMENTATION-REVISION.md'
if revision.exists():extras+=['',revision.read_text().replace('# Ghi nhận phiên bản triển khai và kết luận','## Ghi nhận phiên bản triển khai và kết luận',1)]
text=(out/'RESULTS.md').read_text()+'\n'.join(extras)+'\n';(out/'RESULTS.md').write_text(text)
(root/'output/report-experiment-results.md').write_text(text)
# Keep actual executed controller from source archive; helpers are separately hashed.
executed=out/'execution-sources';executed.mkdir(exist_ok=True)
with tarfile.open(out/'source.tar.gz')as tar:
 member=tar.getmember('experiments/report/controlled/run.py');(executed/'run.py').write_bytes(tar.extractfile(member).read())
for name in ['api.mjs','load.js','sql.py','sample.py','analyze.py','analyze-resources.py','cache-probe.mjs','security-sql.py','browser-prepare.mjs','application-plans.py','package-results.py']:
 shutil.copy2(root/'experiments/report/controlled'/name,executed/name)
shutil.copy2(root/'apps/web/e2e/controlled-report.e2e.ts',executed/'controlled-report.e2e.ts')
sourceIndex={p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in executed.iterdir()if p.is_file()}
(out/'execution-source-index.json').write_text(json.dumps(sourceIndex,indent=2))
(out/'supplement-summary.json').write_text(json.dumps({'cache':cacheSummary,'browser':browserSummary,'system':platform.platform(),'source_index':'execution-source-index.json'},indent=2))
# A separate Word result appendix; the source Report (1).docx stays untouched.
doc=Document();style=doc.styles['Normal'];style.font.name='Calibri';style.font.size=Pt(11)
lines=text.splitlines();i=0
while i<len(lines):
 line=lines[i]
 if line.startswith('|'):
  block=[]
  while i<len(lines)and lines[i].startswith('|'):
   row=[x.strip().replace('`','')for x in lines[i].strip('|').split('|')]
   if not all(set(x)<=set('-: ')for x in row):block.append(row)
   i+=1
  table=doc.add_table(rows=0,cols=max(map(len,block)));table.style='Light Shading Accent 1'
  for row in block:
   cells=table.add_row().cells
   for j,value in enumerate(row):cells[j].text=value
  continue
 if line.startswith('#'):level=len(line)-len(line.lstrip('#'));doc.add_heading(line.lstrip('# ').replace('`',''),level=min(level,3))
 elif line.strip():doc.add_paragraph(line.replace('`',''))
 i+=1
for name in ['figure-5-2-latency.png','figure-5-2-cache.png']:
 if(out/name).exists():doc.add_picture(str(out/name),width=Inches(6.1))
for table in doc.tables:
 for row in table.rows:
  for cell in row.cells:
   for paragraph in cell.paragraphs:
    for run in paragraph.runs:run.font.size=Pt(9)
doc.save(root/'output/Ket_qua_thuc_nghiem_Pool3.docx')
manifest_path=out/'manifest.json';manifest=json.loads(manifest_path.read_text())
private=Path(manifest['private_state']);durable=root/'.data/experiment-snapshots'/out.name
if private!=durable:
 durable.parent.mkdir(parents=True,exist_ok=True)
 if not durable.exists():shutil.copytree(private,durable)
 durable.chmod(0o700)
 for f in durable.iterdir():
  if f.is_file():f.chmod(0o600)
 manifest['original_private_state']=str(private);manifest['private_state']=str(durable)
 manifest['private_snapshot_note']='Ignored private snapshots, contains password hashes; never include in public artifacts.'
manifest['supplements']={'cache_probe':'completed','sql_security_repeated':'completed','browser':'completed','application_plans':'completed','resource_analysis':'completed','report_appendix':'completed'}
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
index={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest()for p in out.rglob('*')if p.is_file()and p.name!='artifact-sha256.json'}
(out/'artifact-sha256.json').write_text(json.dumps(index,indent=2))
print('Packaged Markdown, Word appendix and SHA-256 artifact index')

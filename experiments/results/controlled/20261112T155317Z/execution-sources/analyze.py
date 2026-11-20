#!/usr/bin/env python3
import csv,json,math,re,statistics,sys
from collections import defaultdict,Counter
from pathlib import Path
out=Path(sys.argv[1]);manifest=json.loads((out/'manifest.json').read_text());protocol=json.loads((out/'protocol.json').read_text())
def percentile(v,p):
 if not v:return None
 v=sorted(v);x=(len(v)-1)*p;lo=int(x);hi=math.ceil(x);return v[lo]+(v[hi]-v[lo])*(x-lo)
def describe(v):
 return {'n':len(v),'mean':statistics.mean(v) if v else None,'sd':statistics.stdev(v) if len(v)>1 else 0,'median':statistics.median(v) if v else None,'min':min(v) if v else None,'max':max(v) if v else None}
def counter(path):
 values={}
 for line in path.read_text().splitlines():
  m=re.match(r'(tenant_cache_requests_total)\{([^}]+)\}\s+(\S+)',line)
  if m:
   labels=dict(re.findall(r'(\w+)="([^"]*)"',m[2]));values[tuple(sorted(labels.items()))]=float(m[3])
 return values
rows=[];cache=[];functional=[];diagnostics=[]
for run in manifest['runs']:
 folder=out/run['directory']
 if run['kind']=='functional':
  evidence=json.loads((folder/'evidence.json').read_text());audit=json.loads((folder/'audit-check.json').read_text())
  for case in evidence['cases']:
   values=[s['ms'] for s in case['samples']];functional.append({'repeat':run['repeat'],'case':case['id'],'status':case['status'],'requests':len(values),'latency_ms':describe(values),'p95_ms':percentile(values,.95),'p99_ms':percentile(values,.99),'detail':case.get('detail'),'error':case.get('error')})
  diagnostics.append({'directory':folder.name,'exit_code':run['exit_code'],'audit':audit});continue
 groups=defaultdict(list);status=defaultdict(Counter)
 for line in (folder/'raw-metrics.json').open():
  d=json.loads(line)
  if d.get('type')!='Point':continue
  tags=d['data'].get('tags',{});role=tags.get('role');phase=tags.get('phase')
  if phase!='measure' or role not in ['small','large','aggressor']:continue
  if d['metric']=='http_req_duration':
   groups[role].append(d['data']['value']);status[role][tags.get('status','unknown')]+=1
 for role in ['small','large','aggressor']:
  v=groups[role];s=status[role];n=sum(s.values());rows.append({'pair':run['pair'],'variant':run['variant'],'role':role,'count':n,'rps':n/protocol['measurement_seconds'],'success_rate':s['200']/n if n else 0,'http_429':s['429'],'p50_ms':percentile(v,.5),'p95_ms':percentile(v,.95),'p99_ms':percentile(v,.99),'mean_ms':statistics.mean(v) if v else None,'sd_ms':statistics.stdev(v) if len(v)>1 else 0,'statuses':dict(s),'exit_code':run['exit_code']})
 before=counter(folder/'metrics-before.prom');after=counter(folder/'metrics-after.prom')
 for labels,value in after.items():
  cache.append({'pair':run['pair'],'variant':run['variant'],**dict(labels),'count':value-before.get(labels,0)})
 summary=json.loads((folder/'summary.json').read_text())['metrics'];diagnostics.append({'directory':folder.name,'exit_code':run['exit_code'],'dropped_iterations':summary.get('dropped_iterations',{}).get('count',0),'checks':summary.get('checks'),'thresholds':{k:v.get('thresholds') for k,v in summary.items() if v.get('thresholds')}})
with (out/'load-results.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
aggregate=[]
for role in ['small','large','aggressor']:
 for variant in ['before','after']:
  selected=[r for r in rows if r['role']==role and r['variant']==variant]
  aggregate.append({'role':role,'variant':variant,'runs':len(selected),'metrics':{k:describe([r[k] for r in selected if r[k] is not None]) for k in ['rps','success_rate','http_429','p50_ms','p95_ms','p99_ms']}})
paired=[]
for role in ['small','large','aggressor']:
 for metric in ['p95_ms','p99_ms']:
  differences=[]
  for pair in range(1,6):
   a=next(r for r in rows if r['pair']==pair and r['role']==role and r['variant']=='after');b=next(r for r in rows if r['pair']==pair and r['role']==role and r['variant']=='before')
   if a[metric] is not None and b[metric] is not None:differences.append(a[metric]-b[metric])
  paired.append({'role':role,'metric':metric,'after_minus_before':describe(differences)})
rls=json.loads((out/'rls-overhead.json').read_text());sqlresults=[]
for variant in ['off','on']:
 perrun=[statistics.mean(s['elapsed_ms'] for s in r['samples']) for r in rls['runs'] if r['variant']==variant];sqlresults.append({'variant':variant,'mean_per_run_ms':describe(perrun)})
result={'protocol_id':protocol['protocol_id'],'load':rows,'aggregates':aggregate,'paired_differences':paired,'cache_counters_warmup_and_measurement':cache,'functional':functional,'sql_overhead':sqlresults,'diagnostics':diagnostics}
(out/'analysis.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
lines=['# Kết quả thực nghiệm Pool mức 3','',f"Protocol `{protocol['protocol_id']}`; dữ liệu thực đo trên WSL, năm cặp đối chứng; warmup 30 giây và đo chính 60 giây mỗi lượt. Snapshot CSDL giống nhau trước mỗi nhánh; thứ tự AB/BA xen kẽ. Các giá trị protocol do kỹ sư chọn trước bộ đo vì báo cáo còn để trống, không phải thông số được báo cáo xác lập sẵn.",'','## Bảng 5.2 — Định danh và cô lập dữ liệu','', '| Bài | Lượt đạt / tổng | Yêu cầu HTTP | Trung bình độ trễ mỗi lượt (ms), mean ± SD |','|---|---:|---:|---:|']
for case in ['KB-1.1','KB-1.2','KB-2.2','KB-4']:
 selected=[x for x in functional if x['case']==case];v=[x['latency_ms']['mean'] for x in selected];d=describe(v);lines.append(f"| {case} | {sum(x['status']=='PASS' for x in selected)}/{len(selected)} | {sum(x['requests'] for x in selected)} | {d['mean']:.2f} ± {d['sd']:.2f} |")
lines+=['','Đối chiếu MDC và X-Tenant-ID xem `functional-*/audit-check.json`. SQL thiếu context, truy vấn thiếu WHERE và tái sử dụng kết nối xem `database-isolation.json`. `rls-overhead.json` chứa 5 cặp, mỗi nhánh 20 warmup + 50 mẫu trên bảng tasks thực nghiệm với role runtime. Không vô hiệu hóa RLS trên CSDL demo.','','## Bảng 5.3 — Kết quả theo nhóm tenant','', '| Nhóm | Cấu hình | RPS mean ± SD | Thành công trung bình | p50 trung vị (ms) | p95 mean ± SD (ms) | p99 mean ± SD (ms) | Tổng 429 |','|---|---|---:|---:|---:|---:|---:|---:|']
for a in aggregate:
 m=a['metrics'];lines.append(f"| {a['role']} | {a['variant']} | {m['rps']['mean']:.2f} ± {m['rps']['sd']:.2f} | {m['success_rate']['mean']*100:.2f}% | {m['p50_ms']['median']:.2f} | {m['p95_ms']['mean']:.2f} ± {m['p95_ms']['sd']:.2f} | {m['p99_ms']['mean']:.2f} ± {m['p99_ms']['sd']:.2f} | {sum(r['http_429'] for r in rows if r['role']==a['role'] and r['variant']==a['variant'])} |")
lines+=['','RPS và phân vị bảng trên tính từ toàn bộ HTTP request có nhãn measure theo role, gồm đọc bảng, đọc trước kéo và kéo thẻ. Phân vị là mean/SD giữa năm phân vị từng lượt; không trộn thành khoảng tin cậy. HTTP 429 của aggressor là kết quả chủ đích, không gộp thành lỗi victim. Mọi lượt threshold lỗi vẫn có trong bảng và raw; xem exit_code trong CSV/diagnostics.','','Timeout client là 10 giây. Phân vị chứa request timeout là số đo bị cắt ở deadline, không phải thời gian server hoàn thành. Status 0 và tỷ lệ thành công phải đọc cùng latency. Writer là một VU/tenant theo vòng kín: khi request chậm hơn 5 giây, số thao tác kéo thực hiện được giảm; đọc và aggressor dùng arrival rate cố định.', '', '## Cache, kế hoạch truy vấn và tài nguyên','','Cache counters trong `analysis.json` lấy hiệu giữa trước/sau toàn lượt (gồm warmup), tách tenant, resource, L1/L2 hit/miss. L2 hit rate là hit/(hit+miss) có điều kiện sau L1 miss; không cộng hai tỷ lệ. Cấu hình before tắt cache nên không truy cập cache (N/A, không suy diễn tỷ lệ hit 0 từ 0/0). Kế hoạch PostgreSQL thực tế nằm trong `query-plans.json`, không ép planner dùng index. CPU/RAM của API/PostgreSQL/Redis được lấy mỗi khoảng 5 giây trong docker-stats.jsonl; JVM CPU/heap và pool/cache metrics có trong hai tệp .prom.','','## Bảng 5.4 — Tùy biến và đồng bộ','','Năm lượt KB-4 kiểm tra bộ cột tạo mới, JSONB hợp lệ, thiếu trường story_points bắt buộc, sai kiểu, trường ngoại tenant, kéo thẻ STRICT trả 422, WARN trả 200 và wipWarning=true, đổi STRICT→WARN rồi yêu cầu kế tiếp áp dụng. Thời gian từng HTTP request và đổi cấu hình có trong functional-*/evidence.json. Đây là độ trễ quan sát ở client, không phải độ trễ nội tại Pub/Sub. Một API đang chạy: chưa suy ra độ trễ lan truyền giữa nhiều API.','','## Giới hạn và kết luận được phép','','Bộ đo này là thực nghiệm local có kiểm soát, source archive và image digest được ghi trong manifest. Không có phê duyệt bên ngoài được ngầm giả định; file Word gốc không sửa. N=5 cho mô tả mean/SD/range, không khẳng định ý nghĩa thống kê hay khả năng tổng quát. Generator và demo dùng chung máy WSL nên còn nhiễu hệ điều hành. Cơ sở và đề xuất thay đồng thời cache/limiter nên chưa tách được tác động từng cơ chế. SLO p95<500ms là lựa chọn protocol, không được gọi là ngưỡng đã quy định trong báo cáo. Cần đọc các lượt lỗi/dropped iterations trước khi kết luận. Mọi nhận định latency tốt hơn phải dựa theo số đo từng nhóm, kể cả khi baseline tốt hơn.','','Các giá trị mean, SD, median, min/max và chênh lệch sau-trước đều có trong analysis.json; các biểu đồ PDF/PNG đặt cạnh báo cáo này.']
lines+=['','## Trạng thái mọi lượt tải','','| Lượt | Exit code k6 | Dropped iterations |','|---|---:|---:|']
for d in diagnostics:
 if 'dropped_iterations' in d:lines.append(f"| {d['directory']} | {d['exit_code']} | {d['dropped_iterations']} |")
lines+=['','## Tỷ lệ trúng cache toàn lượt (gồm warmup)','','| Nhánh | Tenant | L1 hit / lookup | L2 hit / lookup sau L1 miss |','|---|---|---:|---:|']
fixtures=json.loads((out/'fixtures.json').read_text())
for variant in ['before','after']:
 for role,f in fixtures.items():
  counts={}
  for layer in ['l1','l2']:
   hit=sum(c['count'] for c in cache if c['variant']==variant and c['tenant_id']==f['tenantId'] and c['layer']==layer and c['result']=='hit')
   miss=sum(c['count'] for c in cache if c['variant']==variant and c['tenant_id']==f['tenantId'] and c['layer']==layer and c['result']=='miss')
   counts[layer]=f'{int(hit)}/{int(hit+miss)} ({hit/(hit+miss)*100:.2f}%)' if hit+miss else 'N/A (0 lookups)'
  lines.append(f"| {variant} | {role} | {counts['l1']} | {counts['l2']} |")
lines+=['','## Đối chiếu khách quan với nhận định trong Word','']
for role in ['small','large']:
 before=next(a for a in aggregate if a['role']==role and a['variant']=='before')['metrics']['p95_ms']['mean']
 after=next(a for a in aggregate if a['role']==role and a['variant']=='after')['metrics']['p95_ms']['mean']
 lines.append(f"- {role}: mean p95 trước {before:.2f} ms, sau {after:.2f} ms; sau-trước {after-before:+.2f} ms. Đây là mô tả năm lượt, chưa là kết luận significance.")
(out/'RESULTS.md').write_text('\n'.join(lines)+'\n')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig,axes=plt.subplots(1,2,figsize=(10,4),layout='constrained')
for ax,metric in zip(axes,['p95_ms','p99_ms']):
 for idx,role in enumerate(['small','large']):
  for variant,offset,color in [('before',-.18,'#64748b'),('after',.18,'#2563eb')]:
   v=[r[metric] for r in rows if r['role']==role and r['variant']==variant];mean=statistics.mean(v);sd=statistics.stdev(v)
   ax.bar(idx+offset,mean,.32,yerr=sd,capsize=3,color=color,label=variant if idx==0 else None)
   ax.scatter([idx+offset]*len(v),v,color='black',s=13,zorder=3)
 ax.set_xticks([0,1],['Small','Large']);ax.set_ylabel('Latency (ms)');ax.set_title(metric.replace('_ms','')+' — 5 runs, mean ± sample SD');ax.legend();ax.grid(axis='y',alpha=.2)
fig.savefig(out/'figure-5-2-latency.png',dpi=200);fig.savefig(out/'figure-5-2-latency.pdf');plt.close(fig)
print('Wrote RESULTS.md, CSV, analysis.json and latency PNG/PDF')

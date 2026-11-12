import json,math,re,statistics,sys
from datetime import datetime
from pathlib import Path
out=Path(sys.argv[1]);manifest=json.loads((out/'manifest.json').read_text());fixtures=json.loads((out/'fixtures.json').read_text())
def stamp(s):return datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
def counters(lines):
 values={}
 for line in lines:
  m=re.match(r'tenant_cache_requests_total\{([^}]+)\}\s+(\S+)',line)
  if m:values[tuple(sorted(re.findall(r'(\w+)="([^"]*)"',m[1])))]=float(m[2])
 return values
def desc(v):return {'n':len(v),'mean':statistics.mean(v) if v else None,'sd':statistics.stdev(v) if len(v)>1 else 0,'min':min(v) if v else None,'max':max(v) if v else None}
def mem(s):
 m=re.match(r'([\d.]+)\s*([A-Za-z]+)',s);return float(m[1])*{'B':1,'kB':1e3,'KB':1e3,'KiB':1024,'MB':1e6,'MiB':1024**2,'GB':1e9,'GiB':1024**3}[m[2]]/1024**2
results=[]
for run in manifest['runs']:
 if run['kind']!='load':continue
 folder=out/run['directory'];times=[]
 for line in (folder/'raw-metrics.json').open():
  d=json.loads(line)
  if d.get('type')=='Point'and d.get('metric')=='http_req_duration'and d['data'].get('tags',{}).get('phase')=='measure':times.append(stamp(d['data']['time'])-d['data']['value']/1000)
 if not times:continue
 start=min(times);end=start+json.loads((out/'protocol.json').read_text())['measurement_seconds']
 observations=[json.loads(s)for s in (folder/'docker-stats.jsonl').read_text().splitlines()]
 selected=[o for o in observations if start<=stamp(o['at'])<=end]
 resource={}
 for name in ['nckh-experiment-api-1','nckh-experiment-postgres-1','nckh-experiment-redis-1']:
  data=[d for o in selected for d in o['data'] if d['Name']==name]
  resource[name]={'cpu_percent':desc([float(d['CPUPerc'].rstrip('%'))for d in data]),'memory_mib':desc([mem(d['MemUsage'])for d in data])}
 cache=[]
 if len(selected)>1:
  before=counters(selected[0].get('prometheus',[]));after=counters(selected[-1].get('prometheus',[]));delta={k:v-before.get(k,0) for k,v in after.items()}
  for role,f in fixtures.items():
   for layer in ['l1','l2']:
    hit=sum(v for k,v in delta.items()if dict(k).get('tenant_id')==f['tenantId']and dict(k).get('layer')==layer and dict(k).get('result')=='hit')
    miss=sum(v for k,v in delta.items()if dict(k).get('tenant_id')==f['tenantId']and dict(k).get('layer')==layer and dict(k).get('result')=='miss')
    cache.append({'role':role,'layer':layer,'hits':hit,'misses':miss,'hit_rate':hit/(hit+miss)if hit+miss else None})
 results.append({'pair':run['pair'],'variant':run['variant'],'measurement_points_start':start,'measurement_points_end':end,'sampling_window_start':selected[0]['at']if selected else None,'sampling_window_end':selected[-1]['at']if selected else None,'resource':resource,'cache':cache})
(out/'resource-analysis.json').write_text(json.dumps({'description':'Docker CPU percent is 100% per CPU core; memory in MiB. Samples confined to measured HTTP interval. Cache rate uses first/last counter samples inside that interval; boundaries quantized by approx. 5-second scrape interval. None means no lookup, not 0% hit rate.', 'runs':results},indent=2))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig,axes=plt.subplots(1,2,figsize=(10,4),layout='constrained')
for ax,layer in zip(axes,['l1','l2']):
 for idx,role in enumerate(['small','large','medium']):
  values=[c['hit_rate']*100 for r in results if r['variant']=='after'for c in r['cache']if c['role']==role and c['layer']==layer and c['hit_rate']is not None]
  if values:ax.bar(idx,statistics.mean(values),color='#2563eb');ax.scatter([idx]*len(values),values,color='black',s=15)
 ax.set_xticks([0,1,2],['Small','Large','Aggressor']);ax.set_ylim(0,105);ax.set_ylabel('Hit rate (%)');ax.set_title(f'{layer.upper()} conditional lookup hit rate — protected');ax.grid(axis='y',alpha=.2)
fig.savefig(out/'figure-5-2-cache.png',dpi=200);fig.savefig(out/'figure-5-2-cache.pdf');plt.close(fig)
print('Saved resource analysis and measured-window cache plots')

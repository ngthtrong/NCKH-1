import json,subprocess,sys,time
from datetime import datetime,timezone
from pathlib import Path
stop,out=map(Path,sys.argv[1:])
with out.open('w') as f:
 while not stop.exists():
  r=subprocess.run(['docker','stats','--no-stream','--format','{{json .}}','nckh-experiment-api-1','nckh-experiment-postgres-1','nckh-experiment-redis-1'],capture_output=True,text=True)
  scrape=subprocess.run(['docker','exec','nckh-experiment-api-1','curl','--max-time','2','-fsS','http://localhost:8080/actuator/prometheus'],capture_output=True,text=True)
  counters=[line for line in scrape.stdout.splitlines() if line.startswith(('tenant_cache_requests_total{','tenant_cache_invalidations_total{','hikaricp_connections_active{','process_cpu_usage ','jvm_memory_used_bytes{'))]
  f.write(json.dumps({'prometheus':counters,'at':datetime.now(timezone.utc).isoformat(),'data':[json.loads(s) for s in r.stdout.splitlines() if s.startswith('{')],'error':r.stderr.strip()})+'\n');f.flush();time.sleep(3)

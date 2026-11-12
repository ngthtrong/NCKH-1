import http from 'k6/http';
import {check,fail,sleep} from 'k6';
import exec from 'k6/execution';
import {Counter,Rate,Trend} from 'k6/metrics';
const fixture=JSON.parse(open('/private/fixtures.json'));
const warm=Number(__ENV.WARMUP_SECONDS||30), measured=Number(__ENV.MEASURE_SECONDS||60);
const success=new Rate('victim_success'),latency=new Trend('victim_latency',true),blocked=new Counter('aggressor_429');
const thresholds={'victim_success':['rate==1'],'dropped_iterations':['count==0']};
for(const role of ['small','large'])thresholds[`victim_latency{role:${role}}`]=[`p(95)<${__ENV.SLO_P95_MS||500}`];
if(__ENV.VARIANT==='after')thresholds.aggressor_429=['count>0'];
export const options={summaryTrendStats:['avg','min','med','max','p(95)','p(99)'],setupTimeout:'120s',scenarios:{
 small:{executor:'constant-arrival-rate',exec:'small',rate:1,timeUnit:'1s',duration:`${warm+measured}s`,preAllocatedVUs:16,maxVUs:16},
 large:{executor:'constant-arrival-rate',exec:'large',rate:1,timeUnit:'1s',duration:`${warm+measured}s`,preAllocatedVUs:16,maxVUs:16},
 aggressor:{executor:'constant-arrival-rate',exec:'aggressor',rate:30,timeUnit:'1s',duration:`${warm+measured}s`,preAllocatedVUs:320,maxVUs:400},
 small_writer:{executor:'constant-vus',exec:'smallWriter',vus:1,duration:`${warm+measured}s`},
 large_writer:{executor:'constant-vus',exec:'largeWriter',vus:1,duration:`${warm+measured}s`}
},thresholds};
function req(path,s,method='GET',body,tags={}){
 return http.request(method,`http://api:8080/api/v1${path}`,body?JSON.stringify(body):null,{headers:{Host:s.host,'Content-Type':'application/json',...(s.token?{Authorization:`Bearer ${s.token}`}:{})},tags,redirects:0,timeout:'10s'});
}
function json(path,s,method='GET',body){const r=req(path,s,method,body,{phase:'setup'});if(r.status!==200)fail(`Setup ${path}: ${r.status}`);return r.json();}
export function setup(){
 const architecture=json('/architecture',{host:'accounts.localhost:18081'});const enabled=__ENV.VARIANT==='after';
 if(architecture.rateLimitEnabled!==enabled||architecture.cacheEnabled!==enabled)fail('Wrong protection flags');
 const token=json('/auth/login',{host:'accounts.localhost:18081'},'POST',{email:__ENV.DEMO_OWNER_EMAIL,password:__ENV.DEMO_OWNER_PASSWORD}).accessToken;
 const data={};for(const [role,key]of [['small','small'],['large','large'],['aggressor','medium']]){
  const f=fixture[key],redirect=json('/auth/tenant-transfer',{host:'accounts.localhost:18081',token},'POST',{tenantSlug:f.slug}).redirectUrl;
  const code=decodeURIComponent(/[?&]code=([^&]+)/.exec(redirect)[1]);
  const s=json('/auth/exchange',{host:`${f.slug}.localhost:18081`},'POST',{code});
  data[role]={...f,host:`${f.slug}.localhost:18081`,token:s.accessToken};
 }return data;
}
function phase(){return Date.now()-exec.scenario.startTime>=warm*1000?'measure':'warmup';}
function read(s,role){
 const p=phase(),tags={phase:p,role,operation:'read',variant:__ENV.VARIANT};
 const r=req(`/boards/${s.boardId}`,s,'GET',null,tags);
 const okay=r.status===200&&r.json().id===s.boardId&&r.headers['X-Tenant-Id']===s.tenantId;
 if(p==='measure'){
  if(role==='aggressor'){blocked.add(r.status===429?1:0);check(r,{'aggressor 200 or 429':r=>r.status===200||r.status===429},tags);}
  else{success.add(okay,{role});latency.add(r.timings.duration,{role,operation:'read'});check(r,{'victim own board and header':()=>okay},tags);}
 }
}
function writer(s,role){
 const started=Date.now(),p=phase(),tags={phase:p,role,operation:'drag',variant:__ENV.VARIANT};
 const current=req(`/tasks/${s.taskId}`,s,'GET',null,{...tags,operation:'read-before-drag'});
 let okay=false;
 if(current.status===200){const t=current.json(),target=t.columnId===s.columns[0]?s.columns[1]:s.columns[0];
  const moved=req(`/boards/${s.boardId}/tasks/${t.id}/position`,s,'PATCH',{targetColumnId:target,targetPosition:1000000,version:t.version},tags);
  okay=moved.status===200;if(p==='measure')latency.add(moved.timings.duration,{role,operation:'drag'});
 }
 if(p==='measure'){success.add(okay,{role});check(null,{'single writer succeeds':()=>okay},tags);}
 sleep(Math.max(0,5-(Date.now()-started)/1000));
}
export function small(d){read(d.small,'small');}export function large(d){read(d.large,'large');}export function aggressor(d){read(d.aggressor,'aggressor');}
export function smallWriter(d){writer(d.small,'small');}export function largeWriter(d){writer(d.large,'large');}

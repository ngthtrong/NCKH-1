import {api,login,transfer} from './api.mjs';
import {execFileSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
const out=process.argv[2];const samples=[];const fixtures=JSON.parse(readFileSync(process.env.FIXTURE_FILE,'utf8'));
const redis=(...args)=>execFileSync('docker',['exec','nckh-experiment-redis-1','redis-cli','--raw',...args],{encoding:'utf8'}).trim();
const metrics=()=>execFileSync('docker',['exec','nckh-experiment-api-1','curl','-fsS','http://localhost:8080/actuator/prometheus'],{encoding:'utf8'});
const token=await login();const s=await transfer(token,'t-acme');
const count=(raw,name,filter)=>raw.split('\n').filter(l=>l.startsWith(name+'{')&&Object.entries(filter).every(([k,v])=>l.includes(`${k}="${v}"`))).reduce((n,l)=>n+Number(l.split(' ').at(-1)),0);
async function invalidate(){
 const before=count(metrics(),'tenant_cache_invalidations_total',{tenant_id:s.tenantId});const start=performance.now();
 const subscribers=Number(redis('PUBLISH','tenant:config:invalidate',s.tenantId));
 let observed=false;
 for(let i=0;i<30;i++){
  if(count(metrics(),'tenant_cache_invalidations_total',{tenant_id:s.tenantId})>before){observed=true;break;}
  await new Promise(r=>setTimeout(r,10));
 }
 if(!observed)throw Error('Pub/Sub listener invalidation was not observed');
 return {subscribers,handlerObserved:true,clientObservedUpperBoundMs:performance.now()-start};
}
for(let repeat=1;repeat<=5;repeat++){
 const settings=(await api('/tenant-settings/kanban',{session:s})).value;
 const key=`tenant:${s.tenantId}:config:${settings.version}`;
 redis('DEL',key);const coldInvalidation=await invalidate();const before=metrics();
 let start=performance.now();await api('/tenant-settings/kanban',{session:s});const dbMs=performance.now()-start;const afterDb=metrics();
 const l1=[];for(let i=0;i<10;i++){start=performance.now();await api('/tenant-settings/kanban',{session:s});l1.push(performance.now()-start);}
 const pubsub=await invalidate();const beforeL2=metrics();start=performance.now();await api('/tenant-settings/kanban',{session:s});const l2Ms=performance.now()-start;const afterL2=metrics();
 const filter={tenant_id:s.tenantId,resource:'config'};
 const delta=(a,b,layer,result)=>count(b,'tenant_cache_requests_total',{...filter,layer,result})-count(a,'tenant_cache_requests_total',{...filter,layer,result});
 const paths={coldL1Miss:delta(before,afterDb,'l1','miss'),coldL2Miss:delta(before,afterDb,'l2','miss'),l2Hit:delta(beforeL2,afterL2,'l2','hit')};
 if(paths.coldL1Miss!==1||paths.coldL2Miss!==1||paths.l2Hit!==1)throw Error(`Unexpected cache paths: ${JSON.stringify(paths)}`);
 samples.push({repeat,dbMs,l1Ms:l1,l2Ms,pubsub,coldInvalidation,paths});
}
// Verify Redis key partition and cached board ownership without exporting payloads.
const keys=redis('KEYS','tenant:*').split('\n').filter(Boolean),keyChecks=[];
for(const key of keys){
 const match=/^tenant:([a-f0-9-]{36}):/.exec(key);if(!match)throw Error(`Unpartitioned key ${key}`);
 if(key.includes(':board:')){
  const data=JSON.parse(redis('GET',key));const boardId=key.split(':board:')[1].split(':')[0];
  const owner=Object.values(fixtures).find(f=>f.tenantId===match[1]);
  if(data.id!==boardId||!owner||data.projectId!==owner.projectId)throw Error('Cached board ownership mismatch');keyChecks.push({key,boardId:data.id,projectId:data.projectId});
 }
}
writeFileSync(out,JSON.stringify({description:'API round-trip timings include authentication, tenant resolution and database version lookup. Cache paths verified by metric deltas. Pub/Sub bound includes Docker CLI, metrics polling and HTTP; it is not intrinsic Redis propagation latency or a multi-API measurement.',samples,redisKeyCount:keys.length,allKeysTenantPrefixed:true,cachedBoards:keyChecks},null,2));
console.log('Five cache-path probes and Pub/Sub handler checks passed');

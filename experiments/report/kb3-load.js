import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const base = __ENV.BASE_URL || 'http://caddy';
const duration = __ENV.NOISY_DURATION || '30s';
const victimSuccess = new Rate('victim_success');
const victimLatency = new Trend('victim_latency', true);
const blocked = new Counter('aggressor_429');
const thresholds = { victim_success: ['rate==1'], checks: ['rate==1'] };
if(__ENV.RUN_CLASS==='experiment') thresholds.dropped_iterations=['count==0'];
if (__ENV.SLO_P95_MS) thresholds.victim_latency = [`p(95)<${Number(__ENV.SLO_P95_MS)}`];
if (__ENV.RATE_LIMIT_VARIANT === 'after') thresholds.aggressor_429 = ['count>0'];
export const options = {
  summaryTrendStats: ['avg','min','med','max','p(90)','p(95)','p(99)'],
  setupTimeout: '180s',
  teardownTimeout: '90s',
  scenarios: {
    small: { executor:'constant-arrival-rate', exec:'small', rate:1, timeUnit:'1s', duration, preAllocatedVUs:2, maxVUs:10 },
    large: { executor:'constant-arrival-rate', exec:'large', rate:1, timeUnit:'1s', duration, preAllocatedVUs:2, maxVUs:10 },
    small_writer: { executor:'constant-vus', exec:'smallWriter', vus:1, duration },
    large_writer: { executor:'constant-vus', exec:'largeWriter', vus:1, duration },
    aggressor: { executor:'constant-arrival-rate', exec:'aggressor', rate:Number(__ENV.AGGRESSOR_RATE || 30), timeUnit:'1s', duration, preAllocatedVUs:10, maxVUs:80 },
  }, thresholds,
};

function json(path, {host, token, method='GET', body, status=200}) {
  const request=()=>http.request(method,`${base}/api/v1${path}`,body ? JSON.stringify(body) : null,
    { headers:{Host:host, 'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})},
      tags:{phase:'setup'}, redirects:0 });
  let result=request();
  if(result.status===429) { sleep(Math.min(61,Number(result.headers['Retry-After'] || 60)+1)); result=request(); }
  if(result.status!==status) fail(`Fixture request ${method} ${path} returned ${result.status}`);
  return result.body ? result.json() : null;
}
function transfer(global, slug) {
  const redirect = json('/auth/tenant-transfer',{host:'accounts.localhost:8080',token:global,method:'POST',body:{tenantSlug:slug}}).redirectUrl;
  const code = /[?&]code=([^&]+)/.exec(redirect)?.[1];
  if(!code) fail('Transfer did not return a code');
  const host=`${slug}.localhost:8080`;
  const session=json('/auth/exchange',{host,method:'POST',body:{code:decodeURIComponent(code)}});
  return {host,token:session.accessToken};
}
function fixture(session,label,size) {
  const project=json('/projects',{...session,method:'POST',body:{name:`KB3 ${label} ${Date.now()}`},status:201});
  const board=json(`/boards/${project.boardId}`,session);
  for(let i=0;i<size;i++) json(`/boards/${board.id}/tasks`,{...session,method:'POST',status:201,
    body:{columnId:board.columns[0].id,title:`Measured fixture ${i}`,priority:'MEDIUM'}});
  return {...session,projectId:project.id,boardId:board.id,columns:board.columns.map(c=>c.id),
    taskId:json(`/boards/${board.id}`,session).tasks[0]?.id};
}
export function setup() {
  const architecture=json('/architecture',{host:'accounts.localhost:8080'});
  const protectedVariant=__ENV.RATE_LIMIT_VARIANT==='after';
  if(architecture.mode!=='POOL' || architecture.rateLimitEnabled!==protectedVariant || architecture.cacheEnabled!==protectedVariant) {
    fail('Deployment protection flags do not match the requested before/after variant');
  }
  const login=json('/auth/login',{host:'accounts.localhost:8080',method:'POST',body:{email:__ENV.DEMO_OWNER_EMAIL,password:__ENV.DEMO_OWNER_PASSWORD}});
  return {
    small:fixture(transfer(login.accessToken,'t-acme'),'small',Number(__ENV.SMALL_TASKS || 5)),
    large:fixture(transfer(login.accessToken,'t-lotus'),'large',Number(__ENV.LARGE_TASKS || 30)),
    aggressor:fixture(transfer(login.accessToken,'pool-demo'),'aggressor',5),
  };
}
function read(session, role) {
  const response=http.get(`${base}/api/v1/boards/${session.boardId}`,{
    headers:{Host:session.host,Authorization:`Bearer ${session.token}`},
    tags:{role,tenant:session.host,variant:__ENV.RATE_LIMIT_VARIANT || 'unknown'}, redirects:0 });
  if(role==='aggressor') {
    blocked.add(response.status===429?1:0);
    check(response,{'aggressor succeeds or is throttled':r=>r.status===200 || r.status===429});
  } else {
    victimSuccess.add(response.status===200,{role}); victimLatency.add(response.timings.duration,{role});
    check(response,{'victim reads its own board':r=>r.status===200 && r.json().id===session.boardId});
  }
}
export function small(data){read(data.small,'small');}
export function large(data){read(data.large,'large');}
export function aggressor(data){read(data.aggressor,'aggressor');}
function drag(session,role) {
  // One writer per tenant: read VUs never edit the writer's card concurrently.
  const headers={Host:session.host,Authorization:`Bearer ${session.token}`,'Content-Type':'application/json'};
  const current=http.get(`${base}/api/v1/tasks/${session.taskId}`,{headers,tags:{role,operation:'read-before-drag'}});
  if(current.status!==200) {
    victimSuccess.add(false,{role,operation:'drag'}); check(current,{'writer can read its card':r=>r.status===200});
    sleep(5); return;
  }
  const task=current.json();
  const target=task.columnId===session.columns[0]?session.columns[1]:session.columns[0];
  const moved=http.patch(`${base}/api/v1/boards/${session.boardId}/tasks/${task.id}/position`,
    JSON.stringify({targetColumnId:target,targetPosition:1000,version:task.version}),
    {headers,tags:{role,operation:'drag'}});
  victimSuccess.add(moved.status===200,{role,operation:'drag'});
  check(moved,{'single writer can drag its card':r=>r.status===200});
  sleep(5);
}
export function smallWriter(data){drag(data.small,'small');}
export function largeWriter(data){drag(data.large,'large');}
export function teardown(data) {
  for(const key of ['small','large','aggressor']) {
    const session=data[key];
    let r=http.del(`${base}/api/v1/projects/${session.projectId}`,null,
      {headers:{Host:session.host,Authorization:`Bearer ${session.token}`},tags:{phase:'cleanup'}});
    if(r.status===429) {
      sleep(Math.min(61,Number(r.headers['Retry-After'] || 60)+1));
      r=http.del(`${base}/api/v1/projects/${session.projectId}`,null,
        {headers:{Host:session.host,Authorization:`Bearer ${session.token}`},tags:{phase:'cleanup'}});
    }
    if(r.status!==204) console.error(`Cleanup needs retry for ${key}, HTTP ${r.status}; fixture project ${session.projectId}`);
  }
}

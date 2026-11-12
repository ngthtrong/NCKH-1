#!/usr/bin/env node
// Functional KB-1..KB-4 verification. This is a development run, not a load study.
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';

if (existsSync('infra/.env')) process.loadEnvFile('infra/.env');
const base = process.env.E2E_GATEWAY_URL || `http://127.0.0.1:${process.env.HTTP_PORT || 8080}`;
const accounts = `accounts.localhost:${process.env.HTTP_PORT || 8080}`;
const runId = new Date().toISOString().replaceAll(':', '-');
const output = resolve(process.env.REPORT_RESULT_DIR || `experiments/results/development/report-${runId}`);
await mkdir(output, { recursive: true });
const evidence = { runId, runClass: 'development', dataKind: 'measured', startedAt: new Date().toISOString(),
  commit: execFileSync('git', ['rev-parse','HEAD'], { encoding:'utf8' }).trim(),
  reportSha256: existsSync('Report (1).docx') ? createHash('sha256').update(readFileSync('Report (1).docx')).digest('hex') : null,
  cases: [], requests: [], cleanupErrors: [] };
const projects = [];
const restores = [];
let failed = false;

function assert(condition, message) { if (!condition) throw new Error(message); }
async function api(path, { session, host = session?.host || accounts, token = session?.token,
  method = 'GET', body, expect = 200 } = {}) {
  const started = performance.now();
  const origin = new URL(base); origin.host = host;
  const response = await fetch(new URL(`/api/v1${path}`, origin), { method, redirect: 'manual',
    headers: { Host: host, Accept: 'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type':'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  evidence.requests.push({ path, host, method, status: response.status, durationMs: performance.now() - started });
  const expected = Array.isArray(expect) ? expect : [expect];
  assert(expected.includes(response.status), `${method} ${path}: expected ${expected}, got ${response.status}: ${text.slice(0,240)}`);
  return text ? JSON.parse(text) : null;
}
async function session(globalToken, slug) {
  const transfer = await api('/auth/tenant-transfer', { token: globalToken, method:'POST', body:{tenantSlug:slug} });
  const redirect = new URL(transfer.redirectUrl);
  const exchanged = await api('/auth/exchange', { host: redirect.host, method:'POST', body:{code:redirect.searchParams.get('code')} });
  return { host:redirect.host, token:exchanged.accessToken, tenantId:exchanged.activeTenant.id, slug };
}
async function project(s, name) {
  const p = await api('/projects', { session:s, method:'POST', body:{name:`${name} ${runId}`}, expect:201 });
  projects.push({ session:s, id:p.id });
  return { ...p, board:await api(`/boards/${p.boardId}`, { session:s }) };
}
async function task(s, p, columnId, title, customData = {}, expect = 201) {
  return api(`/boards/${p.boardId}/tasks`, { session:s, method:'POST',
    body:{columnId,title,priority:'MEDIUM',customData}, expect });
}
async function test(id, name, work) {
  const started = performance.now();
  try { const details = await work(); evidence.cases.push({ id,name,status:'PASS',durationMs:performance.now()-started,details }); console.log(`PASS ${id}: ${name}`); }
  catch (error) { failed = true; evidence.cases.push({ id,name,status:'FAIL',message:error.message }); console.error(`FAIL ${id}: ${error.message}`); }
}

try {
  const architecture = await api('/architecture');
  assert(architecture.mode === 'POOL', 'Start the report Pool deployment with bash scripts/dev-up.sh');
  let login;
  for (let i=0;i<60;i++) {
    try { login = await api('/auth/login', { method:'POST', body:{email:process.env.DEMO_OWNER_EMAIL,password:process.env.DEMO_OWNER_PASSWORD} }); break; }
    catch { if(i===59) throw new Error('Demo owner did not become ready'); await new Promise(r=>setTimeout(r,1000)); }
  }
  const a = await session(login.accessToken,'t-acme');
  const b = await session(login.accessToken,'t-lotus');
  const n = await session(login.accessToken,'pool-demo');
  const pa = await project(a,'KB Acme');
  const pb = await project(b,'KB Lotus');
  await test('KB-1','Identity, host/token mismatch, expiry and concurrent tenant context',async()=>{
    await api('/projects',{host:a.host,expect:401});
    await api('/projects',{host:b.host,token:a.token,expect:401});
    const pieces=a.token.split('.');
    const claims={...JSON.parse(Buffer.from(pieces[1],'base64url').toString()),exp:1};
    const expired=`${pieces[0]}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`;
    const signature=createHmac('sha256',process.env.JWT_SECRET).update(expired).digest('base64url');
    await api('/projects',{host:a.host,token:`${expired}.${signature}`,expect:401});
    const leaked = await Promise.all(Array.from({length:24},async(_,i)=>{
      const s=i%2?a:b; const own=i%2?pa:pb; const foreign=i%2?pb:pa;
      const rows=await api('/projects',{session:s});
      assert(rows.some(p=>p.id===own.id),'Own project is missing');
      return rows.some(p=>p.id===foreign.id);
    }));
    assert(!leaked.some(Boolean),'Concurrent tenant context leaked');
    return {concurrentReads:24,foreignProjectsReturned:0};
  });
  await test('KB-2','Cross-tenant IDs and shared JSONB schema validation',async()=>{
    await api(`/boards/${pa.boardId}`,{session:b,expect:[403,404]});
    const created=await task(a,pa,pa.board.columns[0].id,'Acme fields',{story_points:5,sprint:'S1'});
    await api(`/tasks/${created.id}`,{session:b,expect:[403,404]});
    await task(a,pa,pa.board.columns[0].id,'Wrong type',{story_points:'five'},422);
    await task(b,pb,pb.board.columns[0].id,'Foreign schema',{story_points:5},422);
    const read=await api(`/tasks/${created.id}`,{session:a});
    assert(read.customData.story_points===5,'JSONB round trip failed');
    return {crossTenantBoard:'denied',crossTenantTask:'denied',invalidMetadata:'rejected',
      databaseChecks:'Run kb2-database.sql for direct RLS and query-plan evidence'};
  });
  await test('KB-4','Acme STRICT and Lotus WARN on the same API and shared tables',async()=>{
    const originalA=await api('/tenant-settings/kanban',{session:a});
    const originalB=await api('/tenant-settings/kanban',{session:b});
    restores.push({session:a,settings:originalA.settings},{session:b,settings:originalB.settings});
    await api('/tenant-settings/kanban',{session:a,method:'PUT',body:{...originalA,settings:{...originalA.settings,wipMode:'STRICT',wipLimit:2}}});
    await api('/tenant-settings/kanban',{session:b,method:'PUT',body:{...originalB,settings:{...originalB.settings,wipMode:'WARN',wipLimit:2}}});
    const inDev=pa.board.columns[1].id; const production=pb.board.columns[1].id;
    await task(a,pa,inDev,'Acme 1'); await task(a,pa,inDev,'Acme 2');
    await task(a,pa,inDev,'Acme rejected',{},422);
    for(let i=0;i<3;i++) await task(b,pb,production,`Lotus ${i}`,{channel:'web',budget_usd:100});
    const acme=await api(`/boards/${pa.boardId}`,{session:a});
    const lotus=await api(`/boards/${pb.boardId}`,{session:b});
    assert(acme.tasks.filter(t=>t.columnId===inDev).length===2,'STRICT was bypassed');
    assert(lotus.tasks.filter(t=>t.columnId===production).length===3,'WARN prevented a valid save');
    const settings=await api('/tenant-settings/kanban',{session:a});
    assert(settings.settings.wipMode==='STRICT','Configuration read was stale');
    return {strictRejectedWith:422,warnSaved:true,acmeTasksInProgress:2,lotusTasksInProgress:3,
      cacheTiming:'Request durations are recorded; distributed propagation needs a separate multi-process run'};
  });
  await test('KB-3-smoke','Per-tenant 429 isolation (functional; use k6 for latency conclusions)',async()=>{
    // Allow enough requests to exceed the quota even across a minute boundary.
    let throttled=0;
    for(let batch=0;batch<48 && !throttled;batch++) {
      const results=await Promise.all(Array.from({length:8},()=>api('/projects',{session:n,expect:[200,429]})));
      // api() preserves measured HTTP status in evidence, not response bodies.
      throttled=evidence.requests.filter(r=>r.host===n.host && r.status===429).length;
      void results;
    }
    assert(throttled>0,'No 429 observed; verify RATE_LIMIT_ENABLED=true');
    await api('/projects',{session:a}); await api('/projects',{session:b});
    return {aggressor429:throttled,victimReadsSucceeded:2,studyType:'functional smoke, not a noisy-neighbor performance claim'};
  });
} catch(error) { failed=true; evidence.fatal=error.message; console.error(error.message); }
finally {
  for(const p of projects.reverse()) {
    try { await api(`/projects/${p.id}`,{session:p.session,method:'DELETE',expect:204}); }
    catch(error) { failed=true; evidence.cleanupErrors.push(error.message); }
  }
  for(const item of restores) {
    try {
      const current=await api('/tenant-settings/kanban',{session:item.session});
      await api('/tenant-settings/kanban',{session:item.session,method:'PUT',body:{settings:item.settings,version:current.version}});
    } catch(error) { failed=true; evidence.cleanupErrors.push(error.message); }
  }
  evidence.finishedAt=new Date().toISOString(); evidence.status=failed?'FAILED':'PASSED';
  await writeFile(`${output}/evidence.json`,JSON.stringify(evidence,null,2));
  console.log(`Evidence (no credentials/tokens): ${output}/evidence.json`);
  if(failed) process.exitCode=1;
}

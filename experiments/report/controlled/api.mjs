import {readFileSync,writeFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
process.loadEnvFile(process.env.CONTROLLED_ENV || 'infra/.env');
const port=process.env.EXPERIMENT_PORT || '18081';
const samples=[];
export async function api(path,{session,host=session?.host||`accounts.localhost:${port}`,token=session?.token,method='GET',body,expect=200,id}={}) {
 const start=performance.now();
 const r=await fetch(`http://${host}/api/v1${path}`,{method,redirect:'manual',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} :{}),...(id?{'X-Request-ID':id}:{})},body:body?JSON.stringify(body):undefined});
 const text=await r.text(); let value;try{value=text?JSON.parse(text):null;}catch{value=null;}
 samples.push({path,method,status:r.status,ms:performance.now()-start,id,tenant:r.headers.get('x-tenant-id')});
 if(!(Array.isArray(expect)?expect:[expect]).includes(r.status))throw Error(`${method} ${path}: expected ${expect}, got ${r.status}: ${text.slice(0,120)}`);
 return {value,status:r.status,tenant:r.headers.get('x-tenant-id')};
}
export async function login(){return (await api('/auth/login',{method:'POST',body:{email:process.env.DEMO_OWNER_EMAIL,password:process.env.DEMO_OWNER_PASSWORD}})).value.accessToken;}
export async function transfer(token,slug){
 const {redirectUrl}= (await api('/auth/tenant-transfer',{token,method:'POST',body:{tenantSlug:slug}})).value;
 const u=new URL(redirectUrl); const d=(await api('/auth/exchange',{host:u.host,method:'POST',body:{code:u.searchParams.get('code')}})).value;
 return {token:d.accessToken,host:u.host,tenantId:d.activeTenant.id,slug};
}
const action=process.argv[2];const output=process.argv[3];
if(action==='prepare'){
 const token=await login();const fixtures={};
 for(const [role,slug] of [['small','t-acme'],['medium','pool-demo'],['large','t-lotus']]){
  const s=await transfer(token,slug);
  const p=(await api('/projects',{session:s,method:'POST',body:{name:`Controlled ${role}`},expect:201})).value;
  const b=(await api(`/boards/${p.boardId}`,{session:s})).value;
  fixtures[role]={slug,tenantId:s.tenantId,projectId:p.id,boardId:b.id,columns:b.columns.map(c=>c.id),userId:JSON.parse(Buffer.from(s.token.split('.')[1],'base64url')).sub};
 }
 writeFileSync(output,JSON.stringify(fixtures,null,2));
}
if(action==='verify'){
 const token=await login();const a=await transfer(token,'t-acme'),b=await transfer(token,'t-lotus');
 const cases=[];let failed=false;
 async function test(id,fn){const n=samples.length;try{const detail=await fn();cases.push({id,status:'PASS',detail,samples:samples.slice(n)});}catch(e){failed=true;cases.push({id,status:'FAIL',error:e.message,samples:samples.slice(n)});}}
 const claims=JSON.parse(Buffer.from(a.token.split('.')[1],'base64url'));
 const sign=c=>{const raw=`${a.token.split('.')[0]}.${Buffer.from(JSON.stringify(c)).toString('base64url')}`;return `${raw}.${createHmac('sha256',process.env.JWT_SECRET).update(raw).digest('base64url')}`;};
 await test('KB-1.1',async()=>{
  const missing={...claims};delete missing.tid;
  const invalid=[undefined,sign({...claims,exp:1}),sign(missing),a.token.slice(0,-8)+'AAAAAAAA'];
  for(let i=0;i<80;i++)await api('/projects',{host:a.host,token:invalid[i%4],expect:401});
  return {invalidRequests:80,accepted:0};
 });
 const fixtures=JSON.parse(readFileSync(process.env.FIXTURE_FILE,'utf8'));
 await test('KB-1.2',async()=>{
  let done=0,mismatches=0;
  await Promise.all(Array.from({length:8},async(_,worker)=>{for(let i=worker;i<240;i+=8){const s=i%2?a:b;const own=i%2?fixtures.small:fixtures.large;const foreign=i%2?fixtures.large:fixtures.small;
   const r=await api('/projects',{session:s,id:`controlled-${process.env.REPEAT_ID}-${i}`});
   if(r.tenant!==s.tenantId||!r.value.some(p=>p.id===own.projectId)||r.value.some(p=>p.id===foreign.projectId))mismatches++;done++;
  }}));
  if(mismatches)throw Error(`${mismatches} mismatches`);return {requests:done,mismatches,workers:8};
 });
 await test('KB-2.2',async()=>{
  const task=(await api(`/boards/${fixtures.large.boardId}`,{session:b})).value.tasks[0];
  for(let i=0;i<10;i++){
   await api(`/tasks/${task.id}`,{session:a,expect:[403,404]});
   await api(`/boards/${fixtures.large.boardId}/tasks/${task.id}/position`,{session:a,method:'PATCH',body:{targetColumnId:task.columnId,targetPosition:1,version:task.version},expect:[403,404]});
   await api(`/tasks/${task.id}`,{session:a,method:'DELETE',expect:[403,404]});
  }return {foreignOperations:30,accepted:0};
 });
 await test('KB-4',async()=>{
  const projects=[];const saved=[];const details=[];
  try{
   for(const [s,strict] of [[a,true],[b,false]]){
    const original=(await api('/tenant-settings/kanban',{session:s})).value;saved.push({s,settings:original.settings});
    const settings={...original.settings,wipMode:strict?'STRICT':'WARN',wipLimit:2,fields:original.settings.fields.map(f=>({...f,required:strict&&f.key==='story_points'}))};
    await api('/tenant-settings/kanban',{session:s,method:'PUT',body:{settings,version:original.version}});
    const p=(await api('/projects',{session:s,method:'POST',body:{name:'KB4 controlled'},expect:201})).value;projects.push({s,p});
    const board=(await api(`/boards/${p.boardId}`,{session:s})).value;
    if(JSON.stringify(board.columns.map(c=>c.name))!==JSON.stringify(settings.defaultColumns))throw Error('Default columns mismatch');
    const customData=strict?{story_points:8,sprint:'Sprint 1'}:{channel:'Web',budget_usd:800};
    const tasks=[];
    for(let i=0;i<3;i++)tasks.push((await api(`/boards/${p.boardId}/tasks`,{session:s,method:'POST',body:{columnId:board.columns[0].id,title:`move ${i}`,priority:'MEDIUM',customData},expect:201})).value);
    for(let i=0;i<3;i++){
     const r=await api(`/boards/${p.boardId}/tasks/${tasks[i].id}/position`,{session:s,method:'PATCH',body:{targetColumnId:board.columns[1].id,targetPosition:1000+i,version:tasks[i].version},expect:strict&&i===2?422:200});
     if(!strict&&i===2&&r.value.wipWarning!==true)throw Error('WARN missing wipWarning');
    }
    const final=(await api(`/boards/${p.boardId}`,{session:s})).value;
    if(final.tasks.filter(t=>t.columnId===board.columns[1].id).length!==(strict?2:3))throw Error('WIP count wrong');
    if(strict){
     for(const customData of [{},{story_points:'eight'},{story_points:8,channel:'Web'}])await api(`/boards/${p.boardId}/tasks`,{session:s,method:'POST',body:{columnId:board.columns[0].id,title:'invalid',priority:'MEDIUM',customData},expect:422});
     const next={...settings,wipMode:'WARN'};const current=(await api('/tenant-settings/kanban',{session:s})).value;
     const changed=await api('/tenant-settings/kanban',{session:s,method:'PUT',body:{settings:next,version:current.version}});
     const r=await api(`/boards/${p.boardId}/tasks/${tasks[2].id}/position`,{session:s,method:'PATCH',body:{targetColumnId:board.columns[1].id,targetPosition:1003,version:tasks[2].version}});
     if(!r.value.wipWarning)throw Error('Next request did not apply WARN');
     details.push({slug:s.slug,nextRequestAppliesChange:true,configUpdateMs:samples.at(-2).ms,moveAfterUpdateMs:samples.at(-1).ms});
    }else details.push({slug:s.slug,wipWarning:true});
   }
   return {details,columnsAndTypedMetadata:true};
  }finally{
   for(const {s,p} of projects)await api(`/projects/${p.id}`,{session:s,method:'DELETE',expect:204});
   for(const {s,settings} of saved){const current=(await api('/tenant-settings/kanban',{session:s})).value;await api('/tenant-settings/kanban',{session:s,method:'PUT',body:{settings,version:current.version}});}
  }
 });
 writeFileSync(output,JSON.stringify({repeat:process.env.REPEAT_ID,cases,status:failed?'FAILED':'PASSED'},null,2));
 console.log(cases.map(c=>`${c.id}: ${c.status}`).join('\n'));if(failed)process.exitCode=1;
}

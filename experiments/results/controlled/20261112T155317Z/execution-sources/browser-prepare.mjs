import {api,login,transfer} from './api.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const fixtures=JSON.parse(readFileSync(process.env.FIXTURE_FILE,'utf8'));const token=await login();const evidence=[];
for(const [role,color]of [['small','#1D4ED8'],['large','#B45309']]){
 const f=fixtures[role],s=await transfer(token,f.slug);
 const settings=(await api('/tenant-settings',{session:s})).value;
 await api('/tenant-settings/branding',{session:s,method:'PATCH',body:{primaryColor:color,accentColor:settings.branding.accentColor,version:settings.branding.version}});
 const board=(await api(`/boards/${f.boardId}`,{session:s})).value;
 const target=board.columns[1].id;let occupied=board.tasks.filter(t=>t.columnId===target).length;
 const candidates=board.tasks.filter(t=>t.columnId===board.columns[0].id);
 while(occupied<(role==='small'?2:3)){
  const task=candidates.shift();const r=await api(`/boards/${f.boardId}/tasks/${task.id}/position`,{session:s,method:'PATCH',body:{targetColumnId:target,targetPosition:occupied+1,version:task.version}});
  occupied++;evidence.push({role,status:r.status,wipWarning:r.value.wipWarning});
 }
 if(role==='small'){
  const task=candidates.shift();await api(`/boards/${f.boardId}/tasks/${task.id}/position`,{session:s,method:'PATCH',body:{targetColumnId:target,targetPosition:3,version:task.version},expect:422});
 }
 evidence.push({role,primaryColor:color,occupied,taskCount:board.tasks.length});
}
writeFileSync(process.argv[2],JSON.stringify({description:'Configured only after all measured load runs. Task totals preserved; moves provide visible STRICT/WARN browser states. Branding matches the report palette.',evidence},null,2));

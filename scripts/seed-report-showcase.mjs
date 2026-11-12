#!/usr/bin/env node
import {writeFileSync}from'node:fs';
process.loadEnvFile('infra/.env');process.env.EXPERIMENT_PORT=process.env.HTTP_PORT||'8080';
const{api,login,transfer}=await import('../experiments/report/controlled/api.mjs');
const token=await login();const evidence=[];
for(const [slug,name,color,strict]of [['t-acme','Acme — Quy trình phát triển','#1D4ED8',true],['t-lotus','Lotus — Chiến dịch truyền thông','#B45309',false]]){
 const s=await transfer(token,slug);const settings=(await api('/tenant-settings',{session:s})).value;
 if(settings.branding.primaryColor.toUpperCase()!==color)await api('/tenant-settings/branding',{session:s,method:'PATCH',body:{primaryColor:color,accentColor:settings.branding.accentColor,version:settings.branding.version}});
 const config=(await api('/tenant-settings/kanban',{session:s})).value;
 if(config.settings.wipMode!==(strict?'STRICT':'WARN')||config.settings.wipLimit!==2)throw Error(`${slug}: review existing tenant config before seeding showcase`);
 let p=(await api('/projects',{session:s})).value.find(p=>p.name===name);
 if(!p){
  p=(await api('/projects',{session:s,method:'POST',body:{name,description:strict?'Theo dõi phát triển tính năng theo sprint.':'Lên ý tưởng, sản xuất và phát hành nội dung.'},expect:201})).value;
  const b=(await api(`/boards/${p.boardId}`,{session:s})).value;
  const titles=strict?['Lên kế hoạch sprint','Thiết kế trang quản lý dự án','Xây dựng luồng đăng nhập','Rà soát yêu cầu mới']:['Lên ý tưởng chiến dịch','Viết nội dung giới thiệu','Thiết kế bộ ảnh truyền thông','Chuẩn bị video phát hành'];
  for(let i=0;i<4;i++)await api(`/boards/${b.id}/tasks`,{session:s,method:'POST',body:{columnId:b.columns[i>0&&(!strict||i<3)?1:0].id,title:titles[i],priority:i===1?'HIGH':'MEDIUM',description:strict?'Làm việc trong Sprint 1.':'Nội dung cho kênh Web.',customData:strict?{story_points:i+3,sprint:'Sprint 1'}:{channel:'Web',budget_usd:(i+1)*200}},expect:201});
 }
 evidence.push({slug,projectId:p.id,name,boardId:p.boardId,url:`http://${s.host}/kanban/${p.boardId}`});
}
writeFileSync('output/report-showcase.json',JSON.stringify({description:'Non-destructive showcase projects; existing user projects retained. Colors configured through the tenant settings API.',projects:evidence},null,2));
console.log('Acme and Lotus showcase projects ready. Links: output/report-showcase.json');

import {expect,test} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

test('controlled report: five browser trials per tenant with board render measurements',async({browser})=>{
 test.setTimeout(300_000);
 const output=process.env.CONTROLLED_BROWSER_OUTPUT;
 const fixturePath=process.env.FIXTURE_FILE;
 if(!output||!fixturePath)throw Error('Set CONTROLLED_BROWSER_OUTPUT and FIXTURE_FILE');
 await mkdir(output,{recursive:true});const fixture=JSON.parse(await readFile(fixturePath,'utf8'));const samples=[];
 for(let repeat=1;repeat<=5;repeat++)for(const [role,name,slug,count]of [['small','Acme Software','t-acme',200],['large','Lotus Media','t-lotus',1000]]as const){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
  await page.addInitScript(()=>{
   const values={lcp:0,longTasks:0,longTaskDuration:0};(window as any).__experimentPerformance=values;
   try{new PerformanceObserver(list=>{for(const e of list.getEntries())values.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});}catch{}
   try{new PerformanceObserver(list=>{for(const e of list.getEntries()){values.longTasks++;values.longTaskDuration+=e.duration;}}).observe({type:'longtask',buffered:true});}catch{}
  });
  await page.goto('http://accounts.localhost:18081/login');
  await page.getByLabel('Email',{exact:true}).fill(process.env.DEMO_OWNER_EMAIL!);
  await page.getByLabel('Mật khẩu',{exact:true}).fill(process.env.DEMO_OWNER_PASSWORD!);
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.locator('.tenant-card').filter({hasText:name}).getByRole('button',{name:'Mở không gian'}).click();
  await page.waitForURL(`http://${slug}.localhost:18081/dashboard`);
  const started=Date.now();await page.goto(`http://${slug}.localhost:18081/kanban/${fixture[role].boardId}`);
  await expect(page.locator('.task-card')).toHaveCount(count,{timeout:30_000});
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const readyMs=Date.now()-started;
  if(role==='large')await expect(page.locator('.kanban-view--compact')).toBeVisible();
  else await expect(page.locator('.kanban-view--compact')).toHaveCount(0);
  await expect(page.locator('.brand--drawer .brand__symbol:visible')).toHaveCSS('background-color',role==='small'?'rgb(29, 78, 216)':'rgb(180, 83, 9)');
  if(role==='large')await expect(page.getByRole('alert').filter({hasText:'vượt giới hạn WIP'})).toBeVisible();
  const perf=await page.evaluate(()=>({...(window as any).__experimentPerformance,navigation:(performance.getEntriesByType('navigation')[0]as PerformanceNavigationTiming)?.toJSON(),cards:document.querySelectorAll('.task-card').length}));
  samples.push({repeat,role,boardReadyMs:readyMs,...perf});
  if(repeat===1){
   await page.locator('.task-card').first().click();
   await expect(page.getByRole('dialog')).toBeVisible();
   await expect(page.getByRole('dialog').getByLabel(role==='small'?'Story points':'Ngân sách (USD)',{exact:true})).toHaveValue(role==='small'?'8':'800');
   await page.screenshot({path:resolve(output,`${role}-task-fields.png`),fullPage:false});
   await page.keyboard.press('Escape');
   await page.screenshot({path:resolve(output,`${role}-board-desktop.png`),fullPage:false});
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(output,`${role}-board-mobile.png`),fullPage:false});
   await page.goto(`http://${slug}.localhost:18081/settings`);
   await expect(page.getByRole('heading',{name:'Quy trình làm việc',exact:true})).toBeVisible();
   await expect(page.locator(`input[value="${role==='small'?'story_points':'budget_usd'}"]`)).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
   await page.screenshot({path:resolve(output,`${role}-settings-mobile.png`),fullPage:true});
  }
  await context.close();
  await writeFile(resolve(output,'browser-measurements.json'),JSON.stringify({description:'Fresh browser contexts; login/transfer excluded from board-ready timer; LCP/long tasks are local lab observations, not field Web Vitals.',samples},null,2));
 }
});

// Smoke-check local gallery links, image loading and zoom/navigation.
const { chromium } = require('C:/Users/caotu/AppData/Local/Temp/teachai-ui-check/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
(async () => {
  const base = path.resolve(__dirname, '..');
  const browser = await chromium.launch({headless:true,executablePath:'C:/Users/caotu/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(base,'xem-tat-ca.html')).href);
  const result = await page.evaluate(async()=>{
    const imgs=[...document.querySelectorAll('article img')];
    await Promise.all(imgs.map(i=>{i.loading='eager';return i.decode()}));
    return {count:imgs.length,loaded:imgs.filter(i=>i.naturalWidth===2400).length,overflow:document.body.scrollWidth>innerWidth};
  });
  if(result.count!==16||result.loaded!==16||result.overflow)throw new Error(JSON.stringify(result));
  const links=await page.locator('article a').evaluateAll(els=>els.map(e=>e.getAttribute('href')));
  for(const href of links)if(!fs.existsSync(path.join(base,href)))throw new Error('Broken link '+href);
  await page.locator('article button.image').first().click();
  await page.locator('#large').evaluate(i=>i.decode());
  if(!await page.locator('#zoom').evaluate(d=>d.open))throw new Error('Zoom did not open');
  await page.locator('#next').click();
  if(!(await page.locator('#caption').textContent()).includes('2.2'))throw new Error('Navigation failed');
  await page.keyboard.press('Escape');
  await page.locator('#search').fill('RLS');
  if(await page.locator('article:visible').count()<1)throw new Error('Search failed');
  await page.locator('#search').fill('');
  await page.screenshot({path:path.join(base,'_build/gallery-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  if(await page.evaluate(()=>document.body.scrollWidth>innerWidth))throw new Error('Mobile overflow');
  await browser.close();
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(JSON.stringify({...result,links:links.length,zoom:true,navigation:true,search:true,mobile:true,errors}));
})().catch(e=>{console.error(e);process.exit(1)});

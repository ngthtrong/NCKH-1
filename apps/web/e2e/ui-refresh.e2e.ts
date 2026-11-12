import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
test('workspace UI at desktop and mobile', async({page})=>{
 test.setTimeout(120000);const out='/mnt/d/NCKH/.impeccable/review';await mkdir(out,{recursive:true});
 await page.setViewportSize({width:1842,height:1000});await page.goto('http://accounts.localhost:18080/login');
 await page.getByLabel('Email',{exact:true}).fill(process.env.DEMO_OWNER_EMAIL!);await page.getByLabel('Mật khẩu',{exact:true}).fill(process.env.DEMO_OWNER_PASSWORD!);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 await expect(page.locator('.tenant-card')).toHaveCount(3);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:out+'/selection-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/selection-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.locator('.tenant-card').filter({hasText:'Acme Software'}).getByRole('button',{name:'Mở không gian'}).click();await page.waitForURL('**/dashboard');
 await page.goto('http://t-acme.localhost:18080/projects');await expect(page.locator('.project-name-link').first()).toBeVisible();await page.screenshot({path:out+'/projects-mobile.png'});
 await page.setViewportSize({width:1842,height:1000});await page.screenshot({path:out+'/projects-desktop.png'});
 await page.locator('.project-name-link').first().click();await expect(page.getByRole('heading',{name:'Bảng trong dự án'})).toBeVisible();await expect(page.locator('.project-board-link').first()).toBeVisible();await page.screenshot({path:out+'/desktop.png'});await page.screenshot({path:out+'/user-1842.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

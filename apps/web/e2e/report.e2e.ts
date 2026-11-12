import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

test('report Pool: login, Acme configuration, mobile layout and Lotus configuration', async ({ page }) => {
  test.setTimeout(120_000);
  const email=process.env.DEMO_OWNER_EMAIL;
  const password=process.env.DEMO_OWNER_PASSWORD;
  if(!email || !password) throw new Error('Set E2E_ENV_FILE=../../infra/.env');
  const artifacts=resolve('../../output/report-ui');
  await mkdir(artifacts,{recursive:true});
  await page.goto('/login');
  await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
  await page.screenshot({path:resolve(artifacts,'login-desktop.png'),fullPage:true});
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByLabel('Mật khẩu',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Chọn tổ chức để tiếp tục'})).toBeVisible();
  await page.locator('.tenant-card').filter({hasText:'Acme Software'}).getByRole('button',{name:'Mở không gian'}).click();
  await page.waitForURL(/t-acme\.localhost:8080\/dashboard/);
  await page.goto('http://t-acme.localhost:8080/settings');
  await expect(page.getByRole('heading',{name:'Quy trình làm việc',exact:true})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Khi vượt giới hạn công việc'})).toContainText('STRICT');
  await expect(page.locator('input[value="story_points"]')).toBeVisible();
  await expect(page.locator('input[value="sprint"]')).toBeVisible();
  await page.screenshot({path:resolve(artifacts,'acme-settings-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('heading',{name:'Quy trình làm việc',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await page.screenshot({path:resolve(artifacts,'acme-settings-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  // A fresh global login exercises the real host-bound transfer to the other workspace.
  await page.goto('http://accounts.localhost:8080/select-tenant');
  await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})
    .or(page.getByRole('heading',{name:'Chọn tổ chức để tiếp tục'}))).toBeVisible();
  if(await page.getByRole('button',{name:'Đăng nhập',exact:true}).isVisible()) {
    await page.getByLabel('Email',{exact:true}).fill(email);
    await page.getByLabel('Mật khẩu',{exact:true}).fill(password);
    await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  }
  await page.locator('.tenant-card').filter({hasText:'Lotus Media'}).getByRole('button',{name:'Mở không gian'}).click();
  await page.waitForURL(/t-lotus\.localhost:8080\/dashboard/);
  await page.goto('http://t-lotus.localhost:8080/settings');
  await expect(page.getByRole('combobox',{name:'Khi vượt giới hạn công việc'})).toContainText('WARN');
  await expect(page.locator('input[value="channel"]')).toBeVisible();
  await expect(page.locator('input[value="budget_usd"]')).toBeVisible();
  await page.screenshot({path:resolve(artifacts,'lotus-settings-desktop.png'),fullPage:true});
});

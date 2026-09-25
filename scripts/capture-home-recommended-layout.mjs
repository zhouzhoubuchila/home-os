import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const outputDir = path.resolve(process.argv[2] ?? 'home-recommended-qa');
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:6006/iframe.html?id=pages-home-dashboard-recommended-layout-qa--full-home&viewMode=story');
  await page.getByRole('heading', { name: 'Daily' }).waitFor();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outputDir, 'desktop-full.png'), fullPage: true });
  for (const [name, title] of [
    ['daily', 'Daily'],
    ['home', 'Home'],
    ['infrastructure', 'Infrastructure'],
    ['utilities', 'Energy & Utilities'],
  ]) {
    const section = page.getByRole('heading', { name: title, exact: true }).locator('xpath=../..');
    await section.screenshot({ path: path.join(outputDir, `${name}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(outputDir, 'mobile-full.png'), fullPage: true });
  console.log(outputDir);
} finally {
  await browser.close();
}

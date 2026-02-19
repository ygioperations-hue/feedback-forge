import puppeteer from 'puppeteer-core';

const BASE_URL = 'http://localhost:5000';
const CHROMIUM_PATH = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
const OUTPUT_DIR = '/home/runner/workspace/screenshots';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/projects/4327c991-30e3-4049-b8d2-040df5f0d0c4`, {
    waitUntil: 'networkidle0',
    timeout: 15000,
  });
  await new Promise(r => setTimeout(r, 2000));

  const tabs = await page.$$('button[role="tab"]');
  for (const tab of tabs) {
    const text = await tab.evaluate(el => el.textContent || '');
    if (text.includes('Widget') || text.includes('Embed') || text.includes('Install')) {
      await tab.click();
      await new Promise(r => setTimeout(r, 1500));
      break;
    }
  }

  await page.screenshot({ path: `${OUTPUT_DIR}/10-widget-embed-code.png`, fullPage: false });
  console.log('Saved: 10-widget-embed-code.png');

  // Also retake project-detail with correct URL
  await page.goto(`${BASE_URL}/projects/4327c991-30e3-4049-b8d2-040df5f0d0c4`, {
    waitUntil: 'networkidle0',
    timeout: 15000,
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: `${OUTPUT_DIR}/03-project-detail.png`, fullPage: false });
  console.log('Saved: 03-project-detail.png');

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);

import puppeteer from 'puppeteer-core';

const BASE_URL = 'http://localhost:5000';
const CHROMIUM_PATH = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
const OUTPUT_DIR = '/home/runner/workspace/screenshots';

const screenshots = [
  {
    name: '01-dashboard-overview',
    url: '/',
    width: 1440,
    height: 900,
    wait: 3000,
  },
  {
    name: '02-projects-list',
    url: '/projects',
    width: 1440,
    height: 900,
    wait: 2000,
  },
  {
    name: '03-project-detail',
    url: '/project/4327c991-30e3-4049-b8d2-040df5f0d0c4',
    width: 1440,
    height: 900,
    wait: 2000,
  },
  {
    name: '04-responses-list',
    url: '/responses',
    width: 1440,
    height: 900,
    wait: 2000,
  },
  {
    name: '05-pricing-page',
    url: '/pricing',
    width: 1440,
    height: 1100,
    wait: 2000,
  },
  {
    name: '06-public-feedback-form',
    url: '/form/website-redesign-feedback',
    width: 1440,
    height: 900,
    wait: 2000,
  },
  {
    name: '07-public-roadmap',
    url: '/roadmap/website-redesign-feedback',
    width: 1440,
    height: 900,
    wait: 2000,
  },
  {
    name: '08-public-changelog',
    url: '/changelog/website-redesign-feedback',
    width: 1440,
    height: 900,
    wait: 2000,
  },
  {
    name: '09-ltd-admin',
    url: '/ltd-admin',
    width: 1440,
    height: 900,
    wait: 2000,
  },
  {
    name: '10-widget-embed-code',
    url: '/project/4327c991-30e3-4049-b8d2-040df5f0d0c4',
    width: 1440,
    height: 900,
    wait: 2000,
    action: async (page) => {
      const widgetTab = await page.$('[data-testid="tab-widget"], [value="widget"], button:has-text("Widget"), button:has-text("Install Widget")');
      if (widgetTab) {
        await widgetTab.click();
        await new Promise(r => setTimeout(r, 1000));
      } else {
        const tabs = await page.$$('button[role="tab"]');
        for (const tab of tabs) {
          const text = await tab.evaluate(el => el.textContent);
          if (text && (text.includes('Widget') || text.includes('Embed'))) {
            await tab.click();
            await new Promise(r => setTimeout(r, 1000));
            break;
          }
        }
      }
    },
  },
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  console.log('Browser launched. Taking screenshots...\n');

  for (const shot of screenshots) {
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: shot.width, height: shot.height, deviceScaleFactor: 2 });
      await page.goto(`${BASE_URL}${shot.url}`, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, shot.wait));

      if (shot.action) {
        await shot.action(page);
      }

      const path = `${OUTPUT_DIR}/${shot.name}.png`;
      await page.screenshot({ path, fullPage: false });
      console.log(`  Saved: ${shot.name}.png`);
      await page.close();
    } catch (err) {
      console.error(`  FAILED: ${shot.name} - ${err.message}`);
    }
  }

  await browser.close();
  console.log(`\nDone! All screenshots saved to: ${OUTPUT_DIR}/`);
}

main().catch(console.error);

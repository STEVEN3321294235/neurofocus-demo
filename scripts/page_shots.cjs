// Full-page screenshots of Setup and the results page (with one made-up demo
// result), dark and light, 1440 px and 390 px.
//   python3 serve_local.py, then:  node scripts/page_shots.cjs <output-folder>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const seed = fs.readFileSync(path.join(__dirname, 'seed_demo_result.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('current_user', 'tester01'); sessionStorage.setItem('nf_intro_seen', '1'); });
  await page.goto('http://localhost:8000/#home');
  await page.waitForSelector('[data-lab-start]');
  await page.evaluate(`(${seed.trim()})()`);
  const walk = async () => {
    await page.evaluate(async () => {
      for (let y = 0; y <= document.documentElement.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110)); }
      window.scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => setTimeout(r, 300)); window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
  };
  for (const [theme, w, h] of [['dark', 1440, 900], ['light', 1440, 900], ['dark', 390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate((th) => localStorage.setItem('theme', th), theme);
    await page.goto('http://localhost:8000/#lab-results'); await page.reload();
    await page.waitForSelector('.nb-verdict'); await walk();
    await page.screenshot({ path: `${out}/page-results-${theme}-${w}.png`, fullPage: true });
    await page.goto('http://localhost:8000/#home'); await page.reload(); await page.waitForSelector('[data-lab-start]');
    await page.click('[data-lab-start]'); await page.waitForSelector('[data-lab-demo]:not([disabled])'); await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/page-setup-${theme}-${w}.png`, fullPage: true });
    console.log(theme, w, 'overflow', await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
  }
  console.log('errors', JSON.stringify(errors));
  await browser.close();
})();

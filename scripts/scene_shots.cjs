// Screenshots of the Home triangle scene at each scroll stop (wide and phone).
//   python3 serve_local.py   (port 8000), then:  node scripts/scene_shots.cjs <output-folder>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.';
  const theme = process.argv[3] || 'dark';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [w, h, tag] of [[1440, 900, 'w'], [390, 844, 'n']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
    await page.addInitScript((th) => { sessionStorage.setItem('nf_intro_seen', '1'); localStorage.setItem('current_user', 'tester01'); localStorage.setItem('theme', th); }, theme);
    await page.goto('http://localhost:8000/#home');
    await page.waitForSelector('.nb-scene.is-ready', { timeout: 30000 });
    for (let i = 0; i < 6; i += 1) {
      await page.evaluate((k) => {
        const el = document.querySelector(`[data-shape="${k}"]`);
        const r = el.getBoundingClientRect();
        window.scrollTo(0, Math.max(0, window.scrollY + r.top + r.height / 2 - window.innerHeight / 2));
      }, i);
      await page.waitForTimeout(2600);
      await page.screenshot({ path: `${out}/scene-${theme}-${tag}-${i}.png` });
    }
    console.log(tag, 'errors', JSON.stringify(errors));
    await page.close();
  }
  await browser.close();
})();

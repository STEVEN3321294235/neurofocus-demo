// Log-in, Setup and loading screen at common device sizes; reports whether
// each page needs vertical scrolling.
//   python3 serve_local.py, then:  node scripts/fit_shots.cjs <output-folder>
const { chromium } = require('playwright');
const SIZES = [['laptop', 1440, 900], ['small-laptop', 1280, 720], ['tablet', 1024, 768], ['phone', 390, 844], ['phone-land', 844, 390]];
(async () => {
  const out = process.argv[2] || '.';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const report = [];
  for (const [name, w, h] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { sessionStorage.setItem('nf_intro_seen', '1'); });
    const fit = async (tag) => {
      await page.waitForTimeout(1600);
      const over = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      await page.screenshot({ path: `${out}/fit-${tag}-${name}.png` });
      report.push(`${tag.padEnd(14)} ${name.padEnd(12)} ${w}x${h}  scroll needed: ${over > 2 ? over + 'px' : 'no'}`);
    };
    await page.goto('http://localhost:8000/#auth');
    await page.waitForSelector('[data-submit-auth]');
    await fit('login');
    await page.click('.auth-tab[data-switch-auth]');
    await page.waitForSelector('#auth-username');
    await fit('register');
    await page.evaluate(() => localStorage.setItem('current_user', 'tester01'));
    await page.goto('http://localhost:8000/#home'); await page.reload(); await page.waitForSelector('[data-lab-start]');
    await page.click('[data-lab-start]');
    await page.waitForSelector('[data-lab-demo]:not([disabled])');
    await fit('setup-source');
    await page.click('[data-mode="simulation"]');
    await page.waitForSelector('[data-camera-deny]:not([disabled])');
    await fit('setup-camera');
    await page.goto('http://localhost:8000/#home'); await page.waitForSelector('[data-enter-app]');
    await page.click('[data-enter-app]'); await page.waitForSelector('[data-continue-setup]');
    await page.click('[data-continue-setup]'); await page.waitForSelector('[data-test-mode="training"]:not([disabled])');
    await fit('setup-modes');
    await page.evaluate(() => { const l = document.getElementById('transition-loader'); l.querySelector('.loading-text').textContent = '準備緊場景…'; l.style.display = 'flex'; l.style.opacity = '1'; });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/fit-loader-${name}.png` });
    if (errors.length) report.push(`  errors: ${errors.join(' | ')}`);
    await page.close();
  }
  console.log(report.join('\n'));
  await browser.close();
})();

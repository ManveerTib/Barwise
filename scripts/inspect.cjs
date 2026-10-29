// Manual stand-in for the taste skill's inspector: measures headline line
// counts, horizontal overflow, fonts, motion, and takes full-page screenshots.
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2];
const url = 'file://' + path.resolve('dist/index.html');
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const report = [];
  for (const [w, h, scheme] of [[1440, 900, 'light'], [768, 1024, 'light'], [390, 844, 'light'], [1440, 900, 'dark'], [390, 844, 'dark']]) {
    for (const route of ['home', 'about', 'builder-rem', 'teacher']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => errors.push(`${route}@${w}: ${e.message}`));
      p.on('console', (m) => { if (m.type() === 'error') errors.push(`${route}@${w}: ${m.text()}`); });
      await p.goto(url + '#' + route);
      await p.waitForTimeout(500);
      // scroll through to trigger entrances
      const H = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < H; y += Math.floor(h * 0.6)) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(180); }
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(900);
      const m = await p.evaluate(() => {
        const out = { heads: [], overflow: document.documentElement.scrollWidth - window.innerWidth, fonts: [document.fonts.check('16px "Schibsted Grotesk"'), document.fonts.check('16px "Shantell Sans"')] };
        for (const el of document.querySelectorAll('h1,h2,h3,h4')) {
          const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.1;
          const lines = Math.round(el.getBoundingClientRect().height / lh);
          if (el.offsetParent !== null) out.heads.push([el.tagName, lines, Math.round(parseFloat(cs.fontSize)), el.textContent.slice(0, 40)]);
        }
        const hidden = [...document.querySelectorAll('.rise')].filter((e) => !e.classList.contains('in')).length;
        out.hidden = hidden;
        return out;
      });
      const bad = m.heads.filter((x) => x[1] > 2);
      report.push(`${route} ${w} ${scheme}: overflow=${m.overflow} fonts=${m.fonts} notRevealed=${m.hidden} >2-line heads=${JSON.stringify(bad)}`);
      if (scheme === 'light' || route === 'home') await p.screenshot({ path: `${OUT}/${route}-${w}-${scheme}.png`, fullPage: true });
      await ctx.close();
    }
  }
  console.log(report.join('\n'));
  console.log('errors:', errors.length ? [...new Set(errors)].slice(0, 12).join('\n') : 'none');
  await browser.close();
})();

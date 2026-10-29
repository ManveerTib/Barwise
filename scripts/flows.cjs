const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const TSV = fs.readFileSync(process.argv[3], 'utf8');
const url = 'file://' + path.resolve('dist/index.html');
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const mk = async (opts) => { const c = await b.newContext(opts); const p = await c.newPage(); p.on('pageerror', (e) => errors.push(e.message)); return p; };
  // Hero: right choice, then a wrong one
  let p = await mk({ viewport: { width: 1440, height: 900 } });
  await p.goto(url + '#home'); await p.waitForTimeout(1800);
  const sheet = p.locator('.hero-sheet');
  await p.screenshot({ path: OUT + '/hero-correct.png' });
  await sheet.getByRole('button', { name: /Next step/ }).click(); await p.waitForTimeout(200);
  await sheet.getByRole('radio', { name: /extra part/ }).click(); await sheet.getByRole('button', { name: 'Check' }).click(); await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/hero-wrong.png' });
  await sheet.getByRole('radio', { name: /both bars/ }).click(); await sheet.getByRole('button', { name: 'Check' }).click(); await p.waitForTimeout(300);
  await sheet.getByRole('button', { name: /Next step/ }).click();
  await p.fill('#hero-answer', '970'); await sheet.getByRole('button', { name: 'Check' }).click(); await p.waitForTimeout(300);
  await sheet.getByRole('button', { name: /Next step/ }).click();
  await p.fill('#hero-answer', '485'); await sheet.getByRole('button', { name: 'Check' }).click(); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/hero-solved.png' });
  // Practice: wrong typed answer with a known pattern
  await p.goto(url + '#practice-frac'); await p.waitForTimeout(500);
  for (let i = 0; i < 2; i++) { const o = p.locator('.option').first(); await o.click(); await p.getByRole('button', { name: 'Check' }).click(); await p.waitForTimeout(150);
    if (await p.getByRole('button', { name: 'Show me' }).count()) { await p.getByRole('button', { name: 'Show me' }).click(); }
    await p.waitForTimeout(150); await p.getByRole('button', { name: /Next step/ }).click(); await p.waitForTimeout(150); }
  await p.fill('#p-answer', '7'); await p.getByRole('button', { name: 'Check' }).click(); await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/practice-wrong.png' });
  // Teacher setup, dashboard, lock, sign in
  p = await mk({ viewport: { width: 1440, height: 900 } });
  await p.goto(url + '#teacher'); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/teacher-setup.png' });
  await p.fill('#pc1', 'samacademy-2026'); await p.fill('#pc2', 'samacademy-2026'); await p.fill('#paste', TSV);
  await p.getByRole('button', { name: /Lock and open/ }).click(); await p.waitForTimeout(2500);
  await p.getByRole('button', { name: /Show sample class/ }).click(); await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/teacher-dash.png', fullPage: true });
  const stored = await p.evaluate(() => localStorage.getItem('barwise:v2'));
  console.log('vault stored encrypted:', /"ct":/.test(stored), 'plain title visible in storage:', stored.includes('SWP'));
  await p.getByRole('button', { name: /^Lock$/ }).click(); await p.waitForTimeout(300);
  await p.fill('#pc', 'wrong-passcode'); await p.getByRole('button', { name: /^Open$/ }).click(); await p.waitForTimeout(2500);
  console.log('wrong passcode message:', await p.locator('#pc-err').textContent());
  await p.screenshot({ path: OUT + '/teacher-signin.png' });
  await p.fill('#pc', 'samacademy-2026'); await p.getByRole('button', { name: /^Open$/ }).click(); await p.waitForTimeout(2500);
  console.log('unlocked:', await p.getByRole('heading', { name: 'Teacher', exact: true }).count());
  // phone practice
  const m = await mk({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await m.goto(url + '#practice-cmp'); await m.waitForTimeout(400);
  await m.locator('.option').nth(0).click(); await m.getByRole('button', { name: 'Check' }).click(); await m.waitForTimeout(900);
  await m.screenshot({ path: OUT + '/phone-practice.png', fullPage: true });
  console.log('errors:', errors.length ? [...new Set(errors)].join('\n') : 'none');
  await b.close();
})();

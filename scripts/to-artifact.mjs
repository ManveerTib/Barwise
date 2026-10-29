// Turns dist/index.html (a full document) into the body-only page format the
// claude.ai Artifact publisher expects: title, metas, font link, style, then content.
import fs from 'node:fs';
const html = fs.readFileSync('dist/index.html', 'utf8');
const pick = (re) => (html.match(re) || [])[0] || '';
const title = pick(/<title>[\s\S]*?<\/title>/);
const meta = pick(/<meta name="claude:viewport-fit-sides"[^>]*>/);
const fonts = [...html.matchAll(/<link rel="(?:stylesheet|preconnect)"[^>]*>/g)].map((m) => m[0]).join('\n');
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join('\n');
const scripts = [...html.matchAll(/<script type="module"[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0].replace(' crossorigin', '')).join('\n');
const out = [title, meta, fonts, styles, '<div id="root"></div>', scripts].join('\n');
fs.mkdirSync('artifact', { recursive: true });
fs.writeFileSync('artifact/barwise.html', out);
console.log('artifact/barwise.html', (out.length / 1024).toFixed(1), 'KB');

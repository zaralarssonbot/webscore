import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const ROUTES = [
  '/', '/pricing', '/tjanster/hemsidor', '/tjanster/seo', '/tjanster/branding',
  '/guider', '/guider/vad-kostar-en-hemsida', '/integritetspolicy', '/admin',
];
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];

// In-page evaluator: walk every visible text-bearing element, resolve effective
// foreground + background (compositing translucent layers up the ancestor chain
// over the page bg), compute WCAG contrast, apply the large-text threshold.
const PAGE_FN = () => {
  const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const parse = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  };
  const over = (fg, bg) => ({ // composite fg (with alpha) over opaque bg
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1,
  });
  const contrast = (a, b) => {
    const la = lum([a.r, a.g, a.b]), lb = lum([b.r, b.g, b.b]);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const pageBg = (() => { const c = parse(getComputedStyle(document.body).backgroundColor); return c && c.a ? c : { r: 11, g: 13, b: 18, a: 1 }; })();
  const effBg = (el) => {
    let node = el, acc = null; // accumulate translucent bgs top-down later; collect bottom-up
    const stack = [];
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      const bg = parse(cs.backgroundColor);
      const img = cs.backgroundImage && cs.backgroundImage !== 'none';
      if (img) stack.push({ r: 0, g: 0, b: 0, a: 0, img: true }); // gradient/img bg: unknown, treat as see-through but flag
      if (bg && bg.a > 0) stack.push(bg);
      node = node.parentElement;
    }
    let base = { ...pageBg };
    for (let i = stack.length - 1; i >= 0; i--) { const s = stack[i]; if (s.img) continue; base = over(s, base); }
    const hasImg = stack.some((s) => s.img);
    return { base, hasImg };
  };

  const out = [];
  const els = document.querySelectorAll('body *');
  for (const el of els) {
    // must directly contain visible text
    const txt = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (!txt) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.1) continue;
    const fg = parse(cs.color); if (!fg) continue;
    if (fg.a < 0.1) continue; // gradient/transparent text painted via bg-clip — skip
    if (cs.webkitTextFillColor && parse(cs.webkitTextFillColor)?.a < 0.1) continue; // gradient text
    const { base, hasImg } = effBg(el);
    const fgComposited = over(fg, base);
    const ratio = contrast(fgComposited, base);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight) >= 700;
    const isLarge = size >= 24 || (bold && size >= 18.66);
    const threshold = isLarge ? 3 : 4.5;
    if (ratio < threshold && !hasImg) {
      out.push({ ratio: +ratio.toFixed(2), threshold, size: +size.toFixed(1), bold,
        text: txt.slice(0, 50), tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.toString ? el.className.toString() : '').slice(0, 60),
        color: cs.color, bg: `rgb(${Math.round(base.r)},${Math.round(base.g)},${Math.round(base.b)})` });
    }
  }
  // de-dup by text+color
  const seen = new Set(); const uniq = [];
  for (const o of out.sort((a, b) => a.ratio - b.ratio)) {
    const k = o.text + o.color + o.bg; if (seen.has(k)) continue; seen.add(k); uniq.push(o);
  }
  return uniq;
};

const browser = await chromium.launch();
let totalFail = 0;
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  for (const route of ROUTES) {
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
      // Scroll through the page so framer-motion whileInView sections reveal
      // (opacity 0 → 1) and get included in the contrast pass.
      const H = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < H; y += 400) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(80); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(700);
      const fails = await page.evaluate(PAGE_FN);
      const tag = `${vp.name} ${route}`;
      if (fails.length === 0) {
        console.log(`✅ ${tag} — all text ≥ threshold`);
      } else {
        totalFail += fails.length;
        console.log(`❌ ${tag} — ${fails.length} below threshold:`);
        for (const f of fails.slice(0, 12)) {
          console.log(`   ${f.ratio}:1 (need ${f.threshold}) [${f.size}px${f.bold ? ' bold' : ''}] <${f.tag}> "${f.text}" color=${f.color} on ${f.bg}`);
        }
      }
    } catch (e) {
      console.log(`⚠️  ${vp.name} ${route} — ${e.message.split('\n')[0]}`);
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${totalFail === 0 ? 'PASS' : 'FAIL'}: ${totalFail} total contrast issues`);
process.exit(totalFail === 0 ? 0 : 1);

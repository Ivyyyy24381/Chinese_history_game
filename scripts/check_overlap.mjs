// 「继续」被别的东西盖住了吗——在按钮正中心 elementFromPoint，问最上面的是谁。
//   npm run dev  然后  node scripts/check_overlap.mjs
// 立绘的 z 是 10 + position.y，站在画面下半部分的角色能到 z=110；
// 推进按钮那一族固定在 Z_PROCEED=150，这个脚本就是守住这条线的回归测试。
import { chromium } from "playwright";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
const DATA = "src/data";
const RE = /→|继续|Continue|就这些|定了|摆好了|走完了|提交|Submit|Done|order/i;
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem("lishiyou_music", "off"); } catch { /* */ } });
const p = await ctx.newPage();
let checked = 0, blocked = 0;
for (const line of readdirSync(DATA).filter((d) => existsSync(join(DATA, d, "events")))) {
  for (const id of readdirSync(join(DATA, line, "events")).sort()) {
    const f = join(DATA, line, "events", id, "event.json");
    if (!existsSync(f)) continue;
    const phases = JSON.parse(readFileSync(f, "utf8")).phases || [];
    for (let i = 0; i < phases.length; i++) {
      await p.goto(`http://localhost:5173/?shot=${line}/${id}/${i}`, { waitUntil: "networkidle" });
      await p.waitForTimeout(1500);
      const r = await p.evaluate((reSrc) => {
        const re = new RegExp(reSrc, "i");
        return [...document.querySelectorAll("button")].filter((x) => re.test(x.textContent.trim()))
          .map((x) => {
            const q = x.getBoundingClientRect();
            if (!q.width || !q.height) return null;
            const top = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2);
            const ok = top === x || x.contains(top);
            return { label: x.textContent.trim().slice(0, 18), ok,
              coveredBy: ok ? null : `${top?.tagName}.${top?.className || ""} z=${top ? getComputedStyle(top).zIndex : "?"}`.slice(0, 64) };
          }).filter(Boolean);
      }, RE.source);
      for (const x of r) {
        checked++;
        if (!x.ok) { blocked++; console.log(`  x ${line}/${id} p${i} "${x.label}" covered by ${x.coveredBy}`); }
      }
    }
  }
}
console.log(`\n查了 ${checked} 个推进按钮，被盖住 ${blocked} 个`);
await b.close();
process.exit(blocked ? 1 : 0);

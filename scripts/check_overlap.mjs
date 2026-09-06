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
        const out = [];

        // (1) 此刻真的在屏幕上的推进按钮
        for (const x of document.querySelectorAll("button")) {
          if (!re.test(x.textContent.trim())) continue;
          const q = x.getBoundingClientRect();
          if (!q.width || !q.height) continue;
          const top = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2);
          const ok = top === x || x.contains(top);
          out.push({ kind: "real", label: x.textContent.trim().slice(0, 18), ok,
            coveredBy: ok ? null : `${top?.tagName}.${top?.className || ""} z=${top ? getComputedStyle(top).zIndex : "?"}`.slice(0, 64) });
        }

        // (2) 大多数幕的「继续」要先完成交互才出现（explore 得先跟够人数说话），
        //     光落地截一张图是测不到的 —— 而 Ivy 撞到的正是那些。
        //     所以往按钮**将会出现的位置**塞一个同样样式的探针，直接问层级。
        const stage = document.querySelector("[data-shot-ready] div div") || document.body;
        const probe = document.createElement("button");
        probe.textContent = "PROBE";
        Object.assign(probe.style, {
          position: "absolute", bottom: "20px", right: "20px",
          padding: "12px 26px", borderRadius: "24px", zIndex: "150",
        });
        stage.appendChild(probe);
        const q = probe.getBoundingClientRect();
        if (q.width && q.height) {
          const top = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2);
          const ok = top === probe || probe.contains(top);
          out.push({ kind: "probe", label: "（按钮位）", ok,
            coveredBy: ok ? null : `${top?.tagName}.${top?.className || ""} z=${top ? getComputedStyle(top).zIndex : "?"}`.slice(0, 64) });
        }
        probe.remove();
        return out;
      }, RE.source);
      for (const x of r) {
        checked++;
        if (!x.ok) { blocked++; console.log(`  x ${line}/${id} p${i} [${x.kind}] "${x.label}" covered by ${x.coveredBy}`); }
      }
    }
  }
}
console.log(`\n查了 ${checked} 处（真按钮 + 按钮位探针），被盖住 ${blocked} 处`);
await b.close();
process.exit(blocked ? 1 : 0);

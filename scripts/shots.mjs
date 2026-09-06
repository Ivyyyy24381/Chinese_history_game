// 逐幕截图 + UI 硬指标采集。
//
//   npm run dev            # 另开一个终端，本脚本要连它
//   npm run shots          # 全线
//   npm run shots -- --line dante --event 1302_esilio
//   npm run shots -- --lang en
//
// 产出（默认 /tmp/lishiyou-shots，不进版本库）：
//   <line>/<eventId>/<NN>-<type>.png      每一幕一张
//   metrics.json                          每一幕的可用性硬指标原始数据
//
// 采的指标（判定标准见 docs/AUDIT.md）：
//   tiny     正文字号 < 12px 的元素（10–14 岁在笔记本上要能读）
//   smallHit 可点元素渲染尺寸 < 44×44
//   noFocus  可点元素没有可见 focus 态
//   text     每段可见文字的颜色 + 位置 —— 对比度交给 contrast.py 从截图里量
//            （文字压在底图上时，CSS 里查不到真正的背景色，只能量像素）
//
// 走的是 App.jsx 的 ?shot=<line>/<eventId>/<phaseIndex> 直达入口（仅 DEV）。

import { chromium } from "playwright";
import { readdirSync, existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "src", "data");

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const BASE = arg("base", "http://localhost:5173");
const OUT = arg("out", "/tmp/lishiyou-shots");
const LANG = arg("lang", "zh");
const ONLY_LINE = arg("line", null);
const ONLY_EVENT = arg("event", null);
// 笔记本常见分辨率。字号下限、点击目标都按这个尺寸判。
const VIEWPORT = { width: 1440, height: 900 };

function eventsOf(line) {
  const dir = join(DATA, line, "events");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((d) => !d.startsWith(".") && existsSync(join(dir, d, "event.json")))
    .sort()
    .map((id) => ({ id, json: JSON.parse(readFileSync(join(dir, id, "event.json"), "utf8")) }));
}

const lines = (ONLY_LINE ? [ONLY_LINE] : readdirSync(DATA, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(DATA, d.name, "events")))
  .map((d) => d.name)).sort();

// 页面里跑的采集器。只读不写，不点任何东西。
const PROBE = () => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" &&
           parseFloat(cs.opacity || "1") > 0.05;
  };
  const ownText = (el) => Array.from(el.childNodes)
    .filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("").trim();

  const all = Array.from(document.querySelectorAll("body *"));
  const tiny = [], text = [], smallHit = [], noFocus = [], cjk = [];
  const CJK_RE = /[\u3400-\u9FFF\u3000-\u303F\uFF00-\uFFEF]/;

  for (const el of all) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const own = ownText(el);
    if (own) {
      const fs = parseFloat(cs.fontSize);
      const rec = {
        tag: el.tagName.toLowerCase(), fontSize: +fs.toFixed(2), color: cs.color,
        text: own.slice(0, 40),
        box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      };
      text.push(rec);
      if (fs < 12) tiny.push(rec);
      // 英文模式下还在渲染中文 = 有一处没接上 i18n。硬指标，不靠肉眼看。
      if (CJK_RE.test(own)) cjk.push(rec);
    }
    const clickable = el.tagName === "BUTTON" || el.getAttribute("role") === "button" ||
      el.draggable === true || cs.cursor === "pointer" || el.tabIndex >= 0;
    if (clickable) {
      const label = (el.getAttribute("aria-label") || el.getAttribute("title") || own ||
        el.textContent.trim()).slice(0, 40);
      if (r.width < 44 || r.height < 44) {
        smallHit.push({ tag: el.tagName.toLowerCase(), label,
          box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] });
      }
      // 可见 focus 态：只认真的画了东西的（outline / box-shadow / border 变化）
      const hasOutline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
      if (!hasOutline) noFocus.push({ tag: el.tagName.toLowerCase(), label });
    }
  }
  return { tiny, text, smallHit, noFocus, cjk,
    reducedMotionHonored: !!document.querySelector("[data-reduced-motion]") };
};

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
await ctx.addInitScript((lang) => {
  try { localStorage.setItem("lishiyou_lang", lang); localStorage.setItem("lishiyou_music", "off"); } catch { /* */ }
}, LANG);
const page = await ctx.newPage();

const metrics = [];
let shots = 0;
rmSync(OUT, { recursive: true, force: true });

for (const line of lines) {
  for (const { id, json } of eventsOf(line)) {
    if (ONLY_EVENT && id !== ONLY_EVENT) continue;
    const phases = json.phases || [];
    const dir = join(OUT, line, id);
    mkdirSync(dir, { recursive: true });
    for (let i = 0; i < phases.length; i++) {
      const type = phases[i].type || "unknown";
      const url = `${BASE}/?shot=${line}/${id}/${i}`;
      await page.goto(url, { waitUntil: "networkidle" });
      // 逐句显影的过场要等它放完；动画统一给 2.2s
      await page.waitForTimeout(2200);
      const file = join(dir, `${String(i).padStart(2, "0")}-${type}.png`);
      await page.screenshot({ path: file });
      const probe = await page.evaluate(PROBE);
      const errs = await page.evaluate(() => !!document.querySelector("[data-shot-error]"));
      metrics.push({ line, event: id, phase: i, type, file, error: errs, ...probe });
      shots++;
      process.stdout.write(`\r${shots} shots · ${line}/${id} p${i} (${type})            `);
    }
  }
}

writeFileSync(join(OUT, "metrics.json"), JSON.stringify(metrics, null, 1));
await browser.close();
console.log(`\n${shots} 张，写在 ${OUT}`);
console.log(`指标：${join(OUT, "metrics.json")}`);

const sum = (k) => metrics.reduce((n, m) => n + (m[k]?.length || 0), 0);
console.log(`  正文 < 12px：${sum("tiny")} 处`);
console.log(`  点击目标 < 44px：${sum("smallHit")} 处`);
if (LANG !== "zh") {
  const leaks = metrics.filter((m) => m.cjk.length);
  const uniq = new Set(metrics.flatMap((m) => m.cjk.map((c) => c.text)));
  console.log(`  ${LANG} 模式下仍是中文：${sum("cjk")} 处 / ${uniq.size} 句 / ${leaks.length} 幕`);
  for (const s of [...uniq].slice(0, 40)) console.log(`    ${s}`);
  if (uniq.size > 40) console.log(`    …还有 ${uniq.size - 40} 句`);
}

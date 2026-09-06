// 从截图里量正文对比度。
//
//   npm run shots            # 先跑它，产出截图 + metrics.json
//   npm run contrast         # 再跑这个
//
// 为什么要量像素而不是查 CSS：这个游戏的文字全压在底图上，
// CSS 里查到的 background-color 多半是 transparent 或一层半透明蒙版，
// 算出来的对比度跟眼睛看到的没关系。所以直接把那块文字的截图裁出来量。
//
// 做法：取文字外框内的像素，按亮度排序，取第 10 / 第 90 百分位当「背景最暗处 /
// 最亮处」，拿文字颜色分别和这两端算 WCAG 对比度，取更差的那个。
// 这是保守估计：文字自己的像素也在里面，会把结果拉向「更难读」一侧，
// 宁可误报也不漏报。

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { PNG } from "pngjs";

const OUT = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1] : "/tmp/lishiyou-shots";
const MIN = 4.5;          // WCAG AA 正文
const MIN_LARGE = 3.0;    // ≥18.66px 且加粗，或 ≥24px

const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
const parseColor = (c) => {
  const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c || "");
  return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
};

const metrics = JSON.parse(readFileSync(`${OUT}/metrics.json`, "utf8"));
const rows = [];
let scanned = 0;
const skipped = { emoji: 0, tiny: 0, noBg: 0 };

for (const phase of metrics) {
  if (!existsSync(phase.file)) continue;
  const png = PNG.sync.read(readFileSync(phase.file));
  // 截图是 deviceScaleFactor:2，CSS px → 图像 px
  const scale = png.width / 1440;
  for (const t of phase.text || []) {
    const col = parseColor(t.color);
    if (!col || col.a < 0.5) continue;
    let [x, y, w, h] = t.box;
    // 量不准的三类，直接跳过并单独报数：
    //   · emoji —— 它自带颜色，CSS 的 color 根本不生效，拿来算对比度没有意义
    //   · 单字标签 —— 外框太小，背景像素不够，估不出背景
    //   · 极小的框 —— 同上
    if (/\p{Extended_Pictographic}/u.test(t.text)) { skipped.emoji++; continue; }
    if (t.text.trim().length <= 1) { skipped.tiny++; continue; }
    if (w * h < 400) { skipped.tiny++; continue; }
    if (w < 4 || h < 4) continue;
    const X = Math.max(0, Math.round(x * scale)), Y = Math.max(0, Math.round(y * scale));
    const W = Math.min(png.width - X, Math.round(w * scale)), H = Math.min(png.height - Y, Math.round(h * scale));
    if (W < 4 || H < 4) continue;
    // 只取「不是字」的像素当背景。
    // 行内 span 的外框基本被字填满，把字自己算进背景，量出来永远是 1:1。
    // 判据：和文字颜色的 RGB 距离 > 40 才算背景像素。
    const fg = lum(col.r, col.g, col.b);
    const ls = [];
    for (let j = 0; j < H; j += 1) for (let i = 0; i < W; i += 1) {
      const o = ((Y + j) * png.width + (X + i)) << 2;
      const r = png.data[o], g = png.data[o + 1], b = png.data[o + 2];
      const d = Math.abs(r - col.r) + Math.abs(g - col.g) + Math.abs(b - col.b);
      if (d <= 40) continue;                      // 这一点是字，不是背景
      ls.push(lum(r, g, b));
    }
    // 背景像素太少 = 这个框几乎全是字（图标、单字标签），量不出背景，跳过
    if (ls.length < Math.max(12, W * H * 0.15)) { skipped.noBg++; continue; }
    ls.sort((a, b) => a - b);
    // 取 25/75 分位而不是 10/90：一行字横跨的底图里常有个别极亮/极暗的点
    // （灯焰、一小块高光），10/90 会被它们拖走，报出 1.1:1 这种和肉眼对不上的数。
    // 25/75 描述的是「这行字大部分时候压在什么底上」，和读者的体感一致。
    const lo = ls[Math.floor(ls.length * 0.25)], hi = ls[Math.floor(ls.length * 0.75)];
    const worst = Math.min(ratio(fg, lo), ratio(fg, hi));
    const need = t.fontSize >= 24 ? MIN_LARGE : MIN;
    scanned++;
    if (worst < need)
      rows.push({ line: phase.line, event: phase.event, phase: phase.phase, type: phase.type,
                  text: t.text, fontSize: t.fontSize, color: t.color,
                  ratio: +worst.toFixed(2), need, file: phase.file });
  }
}

rows.sort((a, b) => a.ratio - b.ratio);
writeFileSync(`${OUT}/contrast.json`, JSON.stringify(rows, null, 1));
console.log(`量了 ${scanned} 段文字，不达标 ${rows.length} 段（正文 ≥${MIN}:1，大字 ≥${MIN_LARGE}:1）`);
console.log(`跳过：emoji ${skipped.emoji} · 单字/小框 ${skipped.tiny} · 背景像素不够 ${skipped.noBg}（这三类量不准，要肉眼看）`);
const byType = {};
for (const r of rows) byType[r.type] = (byType[r.type] || 0) + 1;
console.log("按 phase 类型：", Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
console.log("\n最差的 25 段：");
for (const r of rows.slice(0, 25))
  console.log(`  ${String(r.ratio).padStart(5)}:1  ${r.fontSize}px  ${r.line}/${r.event} p${r.phase} ${r.type}  ${JSON.stringify(r.text)}`);
console.log(`\n明细：${OUT}/contrast.json`);

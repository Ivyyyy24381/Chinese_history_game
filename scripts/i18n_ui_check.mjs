// 校验组件里的 t(...) 调用都能在 ui.zh.json 里查到。
//   npm run i18n:ui
// t() 支持两种参数：key，或中文原文。两边都查不到 = 这句会永远显示中文。

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ZH = JSON.parse(readFileSync(join(ROOT, "src/i18n/ui.zh.json"), "utf8"));
const EN = JSON.parse(readFileSync(join(ROOT, "src/i18n/ui.en.json"), "utf8"));
const byZh = new Set(Object.values(ZH));
const keys = new Set(Object.keys(ZH));
const CJK = /[㐀-鿿]/;

const SKIP = new Set(["SceneEditor.jsx", "TimelineEditor.jsx", "EditorShell.jsx"]);
const files = [join(ROOT, "src/App.jsx"),
  ...readdirSync(join(ROOT, "src/components")).filter((f) => f.endsWith(".jsx") && !SKIP.has(f))
    .map((f) => join(ROOT, "src/components", f))];

const missing = new Map();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/\bt\("((?:[^"\\]|\\.)*)"\)/g)) {
    const arg = m.group ? m.group(1) : m[1];
    if (keys.has(arg) || byZh.has(arg)) continue;
    const line = src.slice(0, m.index).split("\n").length;
    if (!missing.has(arg)) missing.set(arg, []);
    missing.get(arg).push(`${f.replace(ROOT + "/", "")}:${line}`);
  }
}

// 反过来：ui.zh.json 里登记了但没人用的（不是错，只是提醒）
const used = new Set();
for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/\bt\("((?:[^"\\]|\\.)*)"\)/g)) used.add(m[1]);
const unused = Object.entries(ZH).filter(([k, v]) => !used.has(k) && !used.has(v)).map(([k]) => k);

const untranslated = Object.keys(ZH).filter((k) => !EN[k] || (CJK.test(EN[k]) && EN[k] === ZH[k]));

console.log(`ui.zh.json ${Object.keys(ZH).length} 条 · ui.en.json ${Object.keys(EN).length} 条`);
console.log(`没登记（会一直显示中文）：${missing.size}`);
for (const [s, where] of missing) console.log(`  ${JSON.stringify(s)}  ← ${where.slice(0, 2).join(", ")}`);
console.log(`没译成英文：${untranslated.length}${untranslated.length ? "  " + untranslated.slice(0, 10).join(", ") : ""}`);
console.log(`登记了但没用到：${unused.length}${unused.length ? "  " + unused.slice(0, 10).join(", ") : ""}`);
if (missing.size) process.exitCode = 1;

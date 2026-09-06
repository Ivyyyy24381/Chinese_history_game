// i18n 抽取 —— 遍历 src/data/<line>/ 的内容 JSON，生成扁平的 key→字符串模板。
//
//   npm run i18n:extract              # 全部线，全部语言（目前只有 en）
//   npm run i18n:extract -- --lang en --line dante
//
// 产出（每条线一套）：
//   src/data/<line>/i18n/<lang>.template.json   交给翻译的文件。值先填中文。
//   src/data/<line>/i18n/<lang>.skipped.json    有意不抽的键 + 原因（见下）
//
// 翻译流程：把 template 改好，另存为 src/data/<line>/i18n/<lang>.json。
// 运行时缺 key 自动回落中文，所以**只译一部分也能跑**——没译的照旧显示中文。
// 再次运行本脚本时，已经存在的 <lang>.json 里的译文会带进新模板，不会白翻。
//
// key = JSON 路径，文件用前缀区分（跟 src/i18n/localize.js 里的前缀必须一致）：
//   events/<eventId>/…   event.json
//   quiz/<eventId>/…     quiz.json
//   cast/…               cast.json
//   timeline/…           timeline.json
// 例：events/1302_esilio/phases/0/line
//
// 抽哪些：**含中日韩字符的字符串值**。这一条就自动排除了资源路径、id、
// "left"/"right" 这类枚举、颜色值、CSS——它们都不含中文，不会被抽出来。

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "src", "data");

// CJK 统一表意文字 + 中文标点。含其一即视为待译文本。
const CJK = /[㐀-鿿　-〿＀-￯]/;

// —— 不抽的键 ——
// 只剩作者注释。填空题的答案/词库**要一起译**：答案和词库是同一组字符串，
// 整组一起换语言就还是对得上；只译一半才会坏。extract 末尾有一道校验专门盯这个
// （checkFillIntegrity），runtime 那边 localize.js 还有一道兜底。
const DENY = {
  _note: "写给作者看的注释，玩家看不见",
};

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// 深度遍历，收集 path→中文。key 落在 DENY 里的整棵子树都跳过。
function collect(node, path, out, skipped, key) {
  if (typeof node === "string") {
    if (CJK.test(node)) out.set(path, node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => collect(v, `${path}/${i}`, out, skipped, key));
    return;
  }
  if (!isPlainObject(node)) return;
  for (const [k, v] of Object.entries(node)) {
    const p = `${path}/${k}`;
    if (DENY[k]) {
      const hits = new Map();
      collect(v, p, hits, null, k);
      for (const [hp, hv] of hits) skipped.push({ key: hp, reason: DENY[k], value: hv });
      continue;
    }
    collect(v, p, out, skipped, k);
  }
}

// 填空题完整性：answer 必须能在同一道题的 blanks/distractors 里逐字找到。
// 中文原文本来就满足；译文如果只译了一半，这里会当场报出来。
function checkFillIntegrity(node, path, dict, problems) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => checkFillIntegrity(v, `${path}/${i}`, dict, problems));
    return;
  }
  if (!isPlainObject(node)) return;
  const tr = (p, v) => (typeof dict[p] === "string" && dict[p] ? dict[p] : v);
  if (typeof node.answer === "string") {
    // 两种词库形状：poem_compose 用 blanks（答案就在 blanks 里）；
    // exam 的 poem_fill 用 [answer, ...distractors]（答案不在 distractors 里）。
    const hasBlanks = Array.isArray(node.blanks) && node.blanks.length > 0;
    if (hasBlanks) {
      const answer = tr(`${path}/answer`, node.answer);
      const poolTr = node.blanks.map((v, i) => tr(`${path}/blanks/${i}`, v));
      if (!poolTr.includes(answer)) {
        problems.push(`${path}: answer ${JSON.stringify(answer)} 不在词库里 ${JSON.stringify(poolTr)}`);
      }
    }
  }
  for (const [k, v] of Object.entries(node)) checkFillIntegrity(v, `${path}/${k}`, dict, problems);
}

function readJSON(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function sourcesFor(line) {
  const base = join(DATA, line);
  const out = [];
  for (const [file, prefix] of [["cast.json", "cast"], ["timeline.json", "timeline"]]) {
    const p = join(base, file);
    if (existsSync(p)) out.push({ path: p, prefix });
  }
  const evDir = join(base, "events");
  if (existsSync(evDir)) {
    for (const id of readdirSync(evDir).sort()) {
      if (id.startsWith(".")) continue;
      const ev = join(evDir, id, "event.json");
      if (existsSync(ev)) out.push({ path: ev, prefix: `events/${id}` });
      const qz = join(evDir, id, "quiz.json");
      if (existsSync(qz)) out.push({ path: qz, prefix: `quiz/${id}` });
    }
  }
  return out;
}

function extractLine(line, lang) {
  const zh = new Map();
  const skipped = [];
  for (const src of sourcesFor(line)) {
    collect(readJSON(src.path), src.prefix, zh, skipped);
  }

  // 已有译文带进新模板，避免重翻
  const outDir = join(DATA, line, "i18n");
  const existingPath = join(outDir, `${lang}.json`);
  const existing = existsSync(existingPath) ? readJSON(existingPath) : {};

  const template = {};
  let translated = 0;
  for (const [k, v] of zh) {
    const prev = existing[k];
    // 已译 = 存在且和中文原文不同。原文变了也照样保留旧译，由翻译自己核对。
    if (typeof prev === "string" && prev && prev !== v) { template[k] = prev; translated++; }
    else template[k] = v;
  }
  const stale = Object.keys(existing).filter((k) => !zh.has(k));

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${lang}.template.json`), JSON.stringify(template, null, 2) + "\n");
  writeFileSync(
    join(outDir, `${lang}.skipped.json`),
    JSON.stringify({ _why: "这些键有意不抽——值同时充当身份，译了会把游戏玩坏", items: skipped }, null, 2) + "\n"
  );

  // 已有译文的完整性校验（没有译文时跑的是中文原文，恒过）
  const problems = [];
  for (const src of sourcesFor(line)) {
    checkFillIntegrity(readJSON(src.path), src.prefix, existing, problems);
  }
  if (problems.length) {
    console.error(`\n${line}/${lang} 填空题对不上（译了答案没译词库，或反过来）：`);
    for (const p of problems) console.error(`  ${p}`);
    process.exitCode = 1;
  }

  const chars = [...zh.values()].reduce((n, s) => n + s.length, 0);
  console.log(
    `${line}/${lang}: ${zh.size} keys (${chars} 字) · 已译 ${translated} · 待译 ${zh.size - translated}` +
    ` · 跳过 ${skipped.length}` + (stale.length ? ` · 失效 ${stale.length}` : "")
  );
  if (stale.length) {
    console.log(`  失效（${lang}.json 里有、数据里已经没有的 key）：`);
    for (const k of stale.slice(0, 20)) console.log(`    ${k}`);
    if (stale.length > 20) console.log(`    …还有 ${stale.length - 20} 个`);
  }
}

const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const lang = argOf("lang", "en");
const lines = argOf("line", null)
  ? [argOf("line")]
  : readdirSync(DATA, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(DATA, d.name, "events")))
      .map((d) => d.name)
      .sort();

for (const line of lines) extractLine(line, lang);
console.log(`\n模板写在 src/data/<line>/i18n/${lang}.template.json —— 译好后另存为 ${lang}.json`);

// 把一份内容 JSON 翻成当前语言。
//
// 关键决定：**一个数据文件都不动。** 翻译只发生在读取的那一刻——
// 深拷贝一份，逐个字符串按 JSON 路径去字典里查；查不到就留中文。
// 所以 ScenePlayer 那 5900 行渲染代码一行都不用改，
// 也不会有「译文只译了一半、渲染路径漏了一处」这种事。
//
// key = JSON 路径，前缀跟 scripts/i18n_extract.mjs 里的必须一致：
//   events/<eventId>/…  quiz/<eventId>/…  cast/…  timeline/…

import { getLang } from "./lang";

// 字典很小（一条线一门语言一个文件），eager 打包省掉一层异步；
// castFor() 是同步函数，拿不到 Promise。将来字典大了再改懒加载。
const DICTS = import.meta.glob("../data/*/i18n/*.json", { eager: true });

// 有意不译的键：值同时充当「身份」，译了对不上（理由见 i18n_extract.mjs）。
// 运行时也挡一道——手改字典手滑加进来，不至于把填空题玩坏。
const DENY = new Set(["answer", "blanks", "distractors", "solution", "_note"]);

function dictFor(line, lang) {
  if (!line || lang === "zh") return null;
  // en.template.json / en.skipped.json 是给翻译用的中间产物，不能当字典
  const mod = DICTS[`../data/${line}/i18n/${lang}.json`];
  return (mod && (mod.default || mod)) || null;
}

function walk(node, path, dict, key) {
  if (typeof node === "string") {
    if (DENY.has(key)) return node;
    const hit = dict[path];
    return typeof hit === "string" && hit ? hit : node;
  }
  if (Array.isArray(node)) return node.map((v, i) => walk(v, `${path}/${i}`, dict, key));
  if (node && typeof node === "object") {
    const out = {};
    for (const k of Object.keys(node)) out[k] = walk(node[k], `${path}/${k}`, dict, k);
    return out;
  }
  return node;
}

/**
 * @param {any}    data    原始 JSON（不会被改动）
 * @param {string} line    "dante" / "dufu"
 * @param {string} prefix  key 前缀，如 "events/1302_esilio"
 * @returns 翻好的副本；无字典时原样返回同一个对象（不拷贝）
 */
export function localize(data, line, prefix, lang = getLang()) {
  const dict = dictFor(line, lang);
  if (!dict || !data) return data;
  return walk(data, prefix, dict);
}

/** 事件 id 的年份 <1000 → 杜甫线，否则但丁线。全站已有的判定，收在这里一处。 */
export const lineOf = (eventId) => (parseInt(eventId, 10) < 1000 ? "dufu" : "dante");

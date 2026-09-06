// 组件里硬编码的 UI 文案。
//
// 数据文件里的文案走 localize.js（按 JSON 路径查字典）；这里管的是
// 写死在 JSX 里的那些——按钮、提示、判词、错误信息。
//
// 中英分两个 JSON 放（ui.zh.json / ui.en.json），跟 src/data/<line>/i18n/ 一个路数：
// 加一门语言 = 丢一个 ui.<lang>.json 进来，再在这里加一行 import。
// 组装出来的 UI 是 { key: { zh, en } } 形式。
//
// 用法（两种都行）：
//   t("scene.continue")   按 key
//   t("继续 →")            按中文原文——旧代码改造时直接把字面量包起来，不用先想 key 名
// 查不到就原样返回，所以**漏配一条也只是显示中文**，不会显示 key、不会崩。

import ZH from "./ui.zh.json";
import EN from "./ui.en.json";
import { getLang, useLang } from "./lang";

const TABLES = { zh: ZH, en: EN };

export const UI = Object.fromEntries(
  Object.keys(ZH).map((k) => [k, { zh: ZH[k], en: EN[k] || ZH[k] }])
);

// 中文原文 → key。同一句中文在多处出现时自动合并成一条。
const BY_ZH = new Map(Object.entries(ZH).map(([k, v]) => [v, k]));

export function t(keyOrZh, lang = getLang()) {
  if (typeof keyOrZh !== "string") return keyOrZh;
  const key = keyOrZh in ZH ? keyOrZh : BY_ZH.get(keyOrZh);
  if (!key) return keyOrZh;             // 没登记：原样显示（多半是中文）
  const table = TABLES[lang] || ZH;
  return table[key] || ZH[key] || keyOrZh;
}

/** 组件里用这个：语言一变，用了它的组件跟着重渲染。 */
export function useT() {
  const lang = useLang();
  return (keyOrZh) => t(keyOrZh, lang);
}

export default t;

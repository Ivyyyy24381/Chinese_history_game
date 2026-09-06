// 当前语言 —— 全站单一事实来源。
//
// 不用 React context，用一个模块级 store：
// castFor() 这类**不是组件**的地方也要读语言（ScenePlayer 里就有几处），
// context 在那里取不到。useSyncExternalStore 让组件照样能订阅、能重渲染。
//
// 存 localStorage 的 lishiyou_lang，跟 lishiyou_music 一个路数。默认 zh。

import { useSyncExternalStore } from "react";

const KEY = "lishiyou_lang";

// 加语言：在这里加一行，再跑 npm run i18n:extract -- --lang <code>。
export const LANGS = [
  { code: "zh", label: "中文", short: "中" },
  { code: "en", label: "English", short: "EN" },
];
const CODES = LANGS.map((l) => l.code);
export const DEFAULT_LANG = "zh";

function read() {
  try {
    const v = localStorage.getItem(KEY);
    return CODES.includes(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

let current = read();
const subs = new Set();

export function getLang() {
  return current;
}

export function setLang(code) {
  if (!CODES.includes(code) || code === current) return;
  current = code;
  try { localStorage.setItem(KEY, code); } catch { /* 隐私模式写不进去也不影响玩 */ }
  // 拉丁字形要换字体栈（楷体没有拉丁字形），交给 CSS 的 html[lang] 选择器
  try { document.documentElement.setAttribute("lang", code === "zh" ? "zh-CN" : code); } catch { /* SSR/测试环境 */ }
  subs.forEach((f) => f());
}

function subscribe(f) {
  subs.add(f);
  return () => subs.delete(f);
}

/** 组件里读语言。语言一变，用了这个 hook 的组件重渲染。 */
export function useLang() {
  return useSyncExternalStore(subscribe, getLang, () => DEFAULT_LANG);
}

// 开局把 <html lang> 摆正，让字体栈从第一帧就对
try { document.documentElement.setAttribute("lang", current === "zh" ? "zh-CN" : current); } catch { /* 同上 */ }

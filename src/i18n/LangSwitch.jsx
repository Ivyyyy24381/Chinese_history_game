// 语言开关。放主页标题下面——进游戏之前就能定，不用在场景里找设置。
//
// 切换即时生效：lang.js 是个模块级 store，改完通知所有订阅者重渲染，
// 不刷新页面（刷新会丢掉「继续上局」的进度）。

import { LANGS, useLang, setLang } from "./lang";
import { COLOR, gold, paperBtn } from "../styles/theme";

export default function LangSwitch({ style }) {
  const lang = useLang();
  return (
    <div style={{ ...styles.wrap, ...style }} role="group" aria-label="Language / 语言">
      {LANGS.map((l) => {
        const on = l.code === lang;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            aria-pressed={on}
            lang={l.code === "zh" ? "zh-CN" : l.code}
            style={{
              ...styles.btn,
              backgroundColor: on ? gold(0.9) : paperBtn(0.82),
              color: on ? "#2B2118" : COLOR.secondary,
              borderColor: on ? gold(1) : gold(0.4),
              fontWeight: on ? 600 : 400,
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  wrap: { display: "inline-flex", gap: 6, alignItems: "center" },
  btn: {
    // 44×44 的最小点击目标：字号小，但用内边距把命中区撑到够手指点
    minHeight: 44, minWidth: 56, padding: "0 14px",
    borderRadius: 22, border: "1px solid", cursor: "pointer",
    fontFamily: "inherit", fontSize: "clamp(12.5px, 0.95vw, 15px)", letterSpacing: 1,
    transition: "background-color 180ms ease, color 180ms ease",
  },
};

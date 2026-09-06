// 画作墙签（museum label）。
//
// 为什么有这个东西：
//   · 波提切利、多雷是公有领域，法律上不要求署名——但这是教育游戏，
//     署名本身就是内容：让小孩看见「有人画这首诗画了六百年」。
//   · game-icons.net 的图标是 CC BY 3.0，**法律上必须署名**（见「关于/致谢」页）。
//
// 按资产路径查 src/data/artworks.json，一处登记处处生效：
// 任何 phase 用到这张图，签自动出现；以后换图只改那张表。
//
// UI 规矩：
//   · 默认只有一个极小的 ⓘ，展开才出一行字，绝不抢戏
//   · 不用 hover 单独实现——触屏没有 hover，必须点得开
//   · 固定右下角，和「继续」按钮错开（继续在更右更下，这个在它左上方）
//   · artworks.json 里没登记的图，整个组件不渲染

import { useState } from "react";
import ARTWORKS from "../data/artworks.json";
import { t } from "../i18n/ui";
import { useLang } from "../i18n/lang";

/** 资产路径 → 画作条目。没登记返回 null。 */
export function artworkFor(path) {
  if (!path) return null;
  // 数据里写的是根绝对路径（"/assets/..."），统一去掉查询串再查
  const key = String(path).split("?")[0];
  const hit = ARTWORKS[key];
  return hit && hit.artist ? hit : null;
}

export default function ArtworkLabel({ src, style }) {
  useLang();                    // 语言一变跟着重渲染
  const [open, setOpen] = useState(false);
  const art = artworkFor(src);
  if (!art) return null;

  const line = [t(art.title), t(art.artist), t(art.year), t(art.license)]
    .filter(Boolean).join(" · ");

  return (
    <div style={{ ...styles.wrap, ...style }}>
      {open && (
        <div style={styles.card}>
          <div style={styles.line}>{line}</div>
          {art.holder && <div style={styles.sub}>{t(art.holder)}</div>}
          {art.source && <div style={styles.sub}>{t(art.source)}</div>}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t("art.aria")}
        title={t("art.aria")}
        style={{ ...styles.dot, opacity: open ? 1 : 0.55 }}
      >
        {"ⓘ"}
      </button>
    </div>
  );
}

const styles = {
  wrap: {
    // 抬到「继续」按钮上方 —— 两个都固定在右下角，挤在一起会打架
    position: "absolute", right: 10, bottom: 76, zIndex: 45,
    display: "flex", alignItems: "flex-end", gap: 6,
  },
  card: {
    maxWidth: "46vw", padding: "7px 11px", borderRadius: 6,
    backgroundColor: "rgba(12,9,5,0.86)", border: "1px solid rgba(201,168,106,0.35)",
    textAlign: "right",
  },
  // 12px 是全站正文下限；墙签是次要信息，压到下限但不越过
  line: { color: "#E8D9BE", fontSize: 12, lineHeight: 1.55, letterSpacing: 0.5 },
  sub: { color: "#A89968", fontSize: 12, lineHeight: 1.5 },
  dot: {
    // 视觉上只有一个小圆点，但命中区是 44×44 —— 手指点得住
    width: 44, height: 44, padding: 0, borderRadius: 22,
    border: "none", background: "transparent", cursor: "pointer",
    color: "#C9A86A", fontSize: 17, lineHeight: 1, fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "opacity 180ms ease",
  },
};

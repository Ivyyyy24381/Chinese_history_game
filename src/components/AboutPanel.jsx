// 关于 / 致谢。
//
// 这一页里有一条是**法定义务**，不是客气话：
// game-icons.net 的图标是 CC BY 3.0，CC BY 要求署名必须对使用者可见。
// 只写在仓库的 CREDITS.md 里不算——玩家看不到。所以有了这一页。
//
// 公版画作（波提切利、多雷）法律上不要求署名，署名是因为这是教育游戏：
// 让小孩看见「有人画这首诗画了六百年」。逐张的墙签见 ArtworkLabel。

import ARTWORKS from "../data/artworks.json";
import { t } from "../i18n/ui";
import { useLang } from "../i18n/lang";
import { COLOR, paper, paperBtn, gold } from "../styles/theme";

export default function AboutPanel({ onClose }) {
  useLang();
  // 同一位作者的多张画合并成一行，别把同一个名字重复四遍
  const byArtist = new Map();
  for (const [k, a] of Object.entries(ARTWORKS)) {
    if (k.startsWith("_") || !a.artist) continue;
    const k = a.artist || "";
    if (!byArtist.has(k)) byArtist.set(k, { artist: k, years: new Set(), titles: [] });
    byArtist.get(k).titles.push(a.title);
    if (a.year) byArtist.get(k).years.add(a.year);
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t("about.title")}>
        <h2 style={styles.h}>{t("about.title")}</h2>

        <h3 style={styles.h3}>{t("about.artworks")}</h3>
        {[...byArtist.values()].map((g) => (
          <p key={g.artist} style={styles.p}>
            <strong>{t(g.artist)}</strong>
            {g.years.size ? " · " + [...g.years].map((y) => t(y)).join(" / ") : ""}
            <br />
            <span style={styles.dim}>{g.titles.map((x) => t(x)).join("；")}</span>
          </p>
        ))}
        <p style={styles.p}>{t("about.artworksSource")}</p>

        <h3 style={styles.h3}>{t("about.icons")}</h3>
        {/* 措辞照抄 CREDITS.md —— 这是 CC BY 的署名，不要随手改写 */}
        <p style={styles.p}>{t("about.iconsCredit")}</p>

        <h3 style={styles.h3}>{t("about.rest")}</h3>
        <p style={styles.p}>{t("about.restBody")}</p>

        <button style={styles.close} onClick={onClose}>{t("about.close")}</button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(20,14,8,0.72)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "4vh 5vw",
  },
  panel: {
    backgroundColor: paper(0.99), borderRadius: 10, padding: "22px 26px",
    maxWidth: 640, width: "100%", maxHeight: "92%", overflowY: "auto",
    boxShadow: "0 18px 44px rgba(0,0,0,0.45)", border: `1px solid ${gold(0.3)}`,
  },
  h: { color: COLOR.inkStrong, fontSize: "clamp(17px, 1.4vw, 22px)", letterSpacing: 3, marginBottom: 14 },
  h3: { color: COLOR.goldBrown, fontSize: "clamp(13px, 1.05vw, 16px)", letterSpacing: 2, margin: "16px 0 6px" },
  p: { color: COLOR.body, fontSize: "clamp(13px, 1vw, 15px)", lineHeight: 1.85, margin: "0 0 8px" },
  dim: { color: COLOR.secondary, fontSize: "clamp(12.5px, 0.95vw, 14px)" },
  close: {
    marginTop: 18, minHeight: 44, padding: "0 22px", borderRadius: 22,
    border: `1px solid ${gold(0.5)}`, backgroundColor: paperBtn(0.9), color: COLOR.btnTextSub,
    cursor: "pointer", fontFamily: "inherit", fontSize: "clamp(13px, 1vw, 15px)", letterSpacing: 2,
  },
};

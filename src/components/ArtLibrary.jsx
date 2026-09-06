// 画作库 —— 游戏里用到的公版画作，一张一张摆出来，像一面墙。
//
// 这一页替掉了原来纯文字的「关于/致谢」。理由：署名本身就是内容——
// 与其列一串名字，不如让小孩看见「有人画这首诗画了六百年」。
//
// 数据来自 src/data/artworks.json（同一张表也驱动场景右下角的 ⓘ 墙签），
// 所以这里不用单独维护：往那张表里加一条，这面墙上就多一张。
//
// 底部那行图标署名是**法定义务**，不是客气话：game-icons.net 是 CC BY 3.0，
// 要求署名对使用者可见——只写在仓库的 CREDITS.md 里不算数。措辞照抄 CREDITS.md。

import { useState } from "react";
import ARTWORKS from "../data/artworks.json";
import { asset } from "../utils/asset";
import { t } from "../i18n/ui";
import { useLang } from "../i18n/lang";
import { COLOR, paper, paperBtn, gold } from "../styles/theme";

export default function ArtLibrary({ onClose }) {
  useLang();
  const [zoom, setZoom] = useState(null);
  const items = Object.entries(ARTWORKS).filter(([k, a]) => !k.startsWith("_") && a && a.artist);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t("art.libTitle")}>
        <div style={styles.head}>
          <h2 style={styles.h}>{t("art.libTitle")}</h2>
          <p style={styles.lede}>{t("art.libLede")}</p>
        </div>

        <div style={styles.grid}>
          {items.map(([path, a]) => (
            <button key={path} style={styles.card} onClick={() => setZoom({ path, a })}>
              <span style={{ ...styles.thumb, backgroundImage: `url(${asset(path)})` }} />
              <span style={styles.cardTitle}>{t(a.title)}</span>
              <span style={styles.cardMeta}>
                {t(a.artist)}{a.year ? " · " + t(a.year) : ""}
              </span>
              {a.holder && <span style={styles.cardHolder}>{t(a.holder)}</span>}
              <span style={styles.cardLicense}>{t(a.license)}</span>
            </button>
          ))}
        </div>

        {/* CC BY 3.0 的法定署名 */}
        <p style={styles.iconsCredit}>{t("about.iconsCredit")}</p>
        <p style={styles.restCredit}>{t("about.restBody")}</p>

        <button style={styles.close} onClick={onClose}>{t("about.close")}</button>
      </div>

      {/* 点开看大图 */}
      {zoom && (
        <div style={styles.zoomWrap} onClick={(e) => { e.stopPropagation(); setZoom(null); }}>
          <img src={asset(zoom.path)} alt={t(zoom.a.title)} style={styles.zoomImg} />
          <div style={styles.zoomLabel}>
            {t(zoom.a.title)}{" · "}{t(zoom.a.artist)}{zoom.a.year ? " · " + t(zoom.a.year) : ""}
            {zoom.a.holder ? " · " + t(zoom.a.holder) : ""}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(20,14,8,0.78)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "4vh 4vw",
  },
  panel: {
    backgroundColor: paper(0.99), borderRadius: 10, padding: "22px 26px 20px",
    maxWidth: 900, width: "100%", maxHeight: "92%", overflowY: "auto",
    boxShadow: "0 18px 44px rgba(0,0,0,0.45)", border: `1px solid ${gold(0.3)}`,
  },
  head: { textAlign: "center", marginBottom: 16 },
  h: { color: COLOR.inkStrong, fontSize: "clamp(17px, 1.4vw, 22px)", letterSpacing: 4 },
  lede: { color: COLOR.secondary, fontSize: "clamp(12.5px, 1vw, 15px)", lineHeight: 1.8, marginTop: 6 },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14,
  },
  card: {
    display: "flex", flexDirection: "column", gap: 4, padding: 10, textAlign: "left",
    backgroundColor: paperBtn(0.75), border: `1px solid ${gold(0.28)}`, borderRadius: 8,
    cursor: "zoom-in", fontFamily: "inherit", minHeight: 44,
  },
  thumb: {
    display: "block", width: "100%", aspectRatio: "16 / 10", borderRadius: 5, marginBottom: 6,
    backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#DCD3C0",
    border: `1px solid ${gold(0.22)}`,
  },
  cardTitle: { color: COLOR.inkStrong, fontSize: "clamp(12.5px, 1vw, 15px)", lineHeight: 1.5 },
  cardMeta: { color: COLOR.body, fontSize: "clamp(12px, 0.88vw, 13.5px)", lineHeight: 1.5 },
  cardHolder: { color: COLOR.secondary, fontSize: "clamp(12px, 0.83vw, 13px)", lineHeight: 1.5 },
  cardLicense: { color: COLOR.goldBrown, fontSize: "clamp(12px, 0.83vw, 13px)", letterSpacing: 1, marginTop: 2 },
  iconsCredit: {
    color: COLOR.secondary, fontSize: "clamp(12px, 0.88vw, 13.5px)", lineHeight: 1.8,
    marginTop: 18, paddingTop: 12, borderTop: `1px dashed ${gold(0.3)}`,
  },
  restCredit: { color: COLOR.faint, fontSize: "clamp(12px, 0.83vw, 13px)", lineHeight: 1.8 },
  close: {
    marginTop: 16, minHeight: 44, padding: "0 22px", borderRadius: 22,
    border: `1px solid ${gold(0.5)}`, backgroundColor: paperBtn(0.9), color: COLOR.btnTextSub,
    cursor: "pointer", fontFamily: "inherit", fontSize: "clamp(13px, 1vw, 15px)", letterSpacing: 2,
  },
  zoomWrap: {
    position: "fixed", inset: 0, zIndex: 260, backgroundColor: "rgba(8,6,4,0.94)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 14, padding: "4vh 4vw", cursor: "zoom-out",
  },
  zoomImg: { maxWidth: "100%", maxHeight: "82%", objectFit: "contain", borderRadius: 4 },
  zoomLabel: {
    color: "#E8D9BE", fontSize: "clamp(12.5px, 1vw, 15px)", letterSpacing: 1, textAlign: "center",
  },
};

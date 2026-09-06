import { useState, useEffect } from "react";
import { fetchLeaderboard, fetchMyBest, isCloud } from "../services/backend";
import { t } from "../i18n/ui";

/**
 * Leaderboard — 总分排行榜弹窗。
 * highlightScore：本局刚拿到的分数（结算时传入，用于高亮显示）。
 */
export default function Leaderboard({ highlightScore = null, onClose }) {
  const [rows, setRows] = useState(null); // null = loading
  const [loadError, setLoadError] = useState("");
  const [myBest, setMyBest] = useState(null); // {best, rank} 登录后显示

  useEffect(() => {
    let alive = true;
    fetchMyBest().then((r) => { if (alive && r) setMyBest(r); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchLeaderboard(20)
      .then((r) => { if (alive) setRows(r); })
      .catch((e) => {
        if (!alive) return;
        setRows([]);
        const msg = String(e?.message || e);
        if (/permission|denied/i.test(msg)) {
          setLoadError(t("无法连接云端：请检查控制台「安全域名」是否已加入本站域名"));
        } else if (/collection|not exist|不存在/i.test(msg)) {
          setLoadError(t("云端缺少 scores 集合：请在控制台「数据库」创建"));
        } else {
          setLoadError(t("排行榜加载失败：") + msg);
        }
      });
    return () => { alive = false; };
  }, []);

  const medal = (i) => ["🥇", "🥈", "🥉"][i] || `${i + 1}`;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>{t("🏆 排行榜")}</h2>
        <p style={styles.scope}>{isCloud() ? t("全网玩家总分榜") : t("本机记录（未配置云端服务）")}</p>

        {highlightScore != null && (
          <div style={styles.myScore}>
            {t("本局得分：")}<strong style={{ fontSize: "clamp(17.6px, 1.528vw, 25.3px)" }}>{highlightScore}</strong>
          </div>
        )}
        {myBest && (
          <div style={styles.myScore}>
            {t("我的最好成绩：")}<strong>{myBest.best}</strong>{t(" 分 · 当前第 ")}
            <strong>{myBest.rank}</strong>{t(" 名")}
          </div>
        )}

        {rows === null ? (
          <p style={styles.empty}>{t("加载中…")}</p>
        ) : loadError ? (
          <p style={{ ...styles.empty, color: "#C0392B" }}>{loadError}</p>
        ) : rows.length === 0 ? (
          <p style={styles.empty}>{t("暂无记录，快来拿下第一名！")}</p>
        ) : (
          <div style={styles.list}>
            {rows.map((r, i) => (
              <div key={i} style={{
                ...styles.row,
                backgroundColor: highlightScore != null && r.score === highlightScore
                  ? "rgba(244,208,63,0.25)" : (i % 2 ? "rgba(139,115,85,0.06)" : "transparent"),
              }}>
                <span style={styles.rank}>{medal(i)}</span>
                <span style={styles.nick}>{r.nickname}</span>
                <span style={styles.pts}>{r.score}{t(" 分")}</span>
              </div>
            ))}
          </div>
        )}

        <button style={styles.closeBtn2} onClick={onClose}>{t("关闭")}</button>
        <button style={styles.closeBtn} onClick={onClose}>{"×"}</button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 400,
    backgroundColor: "rgba(12,10,8,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-body)",
  },
  panel: {
    position: "relative",
    backgroundColor: "#F5EFE3", borderRadius: 14,
    padding: "30px 34px", width: "min(400px, calc(100vw - 24px))", maxHeight: "min(80vh, calc(var(--vh100) - 24px))",
    border: "2px solid #C9A86A",
    boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
    display: "flex", flexDirection: "column", gap: 10,
  },
  title: { margin: 0, fontSize: "clamp(17.6px, 1.528vw, 25.3px)", color: "#3B2510", letterSpacing: 4, textAlign: "center" },
  scope: { margin: 0, fontSize: "clamp(9.6px, 0.833vw, 13.8px)", color: "#8B7355", textAlign: "center" },
  myScore: {
    textAlign: "center", padding: "8px 0", borderRadius: 8,
    backgroundColor: "rgba(244,208,63,0.2)", color: "#3B2510", fontSize: "clamp(11.2px, 0.972vw, 16.1px)",
  },
  list: { overflowY: "auto", flex: 1 },
  row: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 10px", borderRadius: 6, fontSize: "clamp(11.2px, 0.972vw, 16.1px)", color: "#3B2510",
  },
  rank: { width: 32, textAlign: "center", fontSize: "clamp(12.0px, 1.042vw, 17.2px)" },
  nick: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pts: { fontWeight: "bold", color: "#B8860B" },
  empty: { textAlign: "center", color: "#8B7355", fontSize: "clamp(11.2px, 0.972vw, 16.1px)", padding: "20px 0" },
  closeBtn2: {
    padding: "9px 18px", border: "1px solid #C9B08A", borderRadius: 8,
    backgroundColor: "#FFF", cursor: "pointer", fontSize: "clamp(11.2px, 0.972vw, 16.1px)", fontFamily: "inherit",
  },
  closeBtn: {
    position: "absolute", top: 8, right: 12,
    border: "none", background: "none", fontSize: "clamp(17.6px, 1.528vw, 25.3px)",
    color: "#8B7355", cursor: "pointer",
  },
};

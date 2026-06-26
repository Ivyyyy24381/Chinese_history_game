/**
 * CharacterRecap — 人物回顾（完成人物传后解锁）
 * 纵向时间轴：分期 → 事件（年份/状态/概述/地点），首尾有人物总评。
 */
import { asset } from "../utils/asset";

export default function CharacterRecap({ character, stages, onClose }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.page}>
        <button style={styles.closeBtn} onClick={onClose}>{"✕ 关闭"}</button>

        <div style={styles.header}>
          {character.portrait && (
            <img src={asset(character.portrait)} alt={character.name} style={styles.portrait} />
          )}
          <div>
            <h1 style={styles.name}>{character.name}{"·一生回顾"}</h1>
            <div style={styles.meta}>
              {character.title}{" · "}{character.dynasty}{" · "}{character.years}
            </div>
            <p style={styles.desc}>{character.description}</p>
          </div>
        </div>

        <div style={styles.badgeRow}>
          <span style={styles.badge}>{"🏆 历史成就 · 诗圣之路"}</span>
        </div>

        {stages.map((stage) => (
          <div key={stage.id} style={styles.stageBlock}>
            <div style={{ ...styles.stageHeader, borderLeftColor: stage.color }}>
              <span style={{ ...styles.stagePeriod, color: stage.color }}>{stage.period}</span>
              <span style={styles.stageYears}>{stage.yearStart}{"—"}{stage.yearEnd}</span>
            </div>
            {stage.summary && <p style={styles.stageSummary}>{stage.summary}</p>}
            {(stage.events || []).map((ev) => (
              <div key={ev.id} style={styles.eventRow}>
                <div style={{ ...styles.eventYear, backgroundColor: stage.color }}>{ev.year}</div>
                <div style={styles.eventBody}>
                  <div style={styles.eventName}>
                    {ev.name}
                    {ev.state && <span style={styles.eventState}>{ev.state}</span>}
                  </div>
                  {ev.location?.name && <div style={styles.eventLoc}>{"📍 " + ev.location.name}</div>}
                  {ev.summary && <p style={styles.eventSummary}>{ev.summary}</p>}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div style={styles.epilogue}>
          {"「李杜文章在，光焰万丈长。」——韩愈"}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 400,
    backgroundColor: "rgba(12,10,8,0.92)",
    overflowY: "auto",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    padding: "32px 16px",
  },
  page: {
    maxWidth: 760, margin: "0 auto",
    backgroundColor: "#F5EFE3",
    borderRadius: 12, padding: "32px 40px 40px",
    position: "relative",
    boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
  },
  closeBtn: {
    position: "absolute", top: 16, right: 16,
    padding: "6px 14px", border: "1px solid #BBA", borderRadius: 6,
    backgroundColor: "#FFF", cursor: "pointer", fontFamily: "inherit", fontSize: 13,
  },
  header: {
    display: "flex", gap: 24, alignItems: "center", marginBottom: 12,
  },
  portrait: {
    width: 96, height: 128, objectFit: "cover", objectPosition: "center top",
    borderRadius: 8, border: "2px solid #C9A86A", backgroundColor: "#FFF",
  },
  name: { margin: 0, fontSize: 26, color: "#3B2510", letterSpacing: 2 },
  meta: { color: "#8B7355", fontSize: 14, margin: "6px 0" },
  desc: { color: "#555", fontSize: 13, margin: 0, lineHeight: 1.7 },
  badgeRow: { margin: "12px 0 24px" },
  badge: {
    display: "inline-block", padding: "6px 16px",
    backgroundColor: "#3B2510", color: "#F4D03F",
    borderRadius: 20, fontSize: 13, letterSpacing: 2,
  },
  stageBlock: { marginBottom: 26 },
  stageHeader: {
    display: "flex", alignItems: "baseline", gap: 12,
    borderLeft: "5px solid", paddingLeft: 12, marginBottom: 6,
  },
  stagePeriod: { fontSize: 19, fontWeight: "bold", letterSpacing: 2 },
  stageYears: { fontSize: 13, color: "#999" },
  stageSummary: { color: "#6B5340", fontSize: 13, margin: "4px 0 12px 17px", lineHeight: 1.7 },
  eventRow: { display: "flex", gap: 14, marginBottom: 14, paddingLeft: 17 },
  eventYear: {
    flexShrink: 0, width: 52, height: 28, borderRadius: 6,
    color: "#FFF", fontWeight: "bold", fontSize: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  eventBody: { flex: 1 },
  eventName: { fontSize: 16, fontWeight: "bold", color: "#3B2510" },
  eventState: {
    marginLeft: 10, fontSize: 12, fontWeight: "normal", color: "#8B7355",
    border: "1px solid #C9B08A", borderRadius: 4, padding: "1px 8px",
  },
  eventLoc: { fontSize: 12, color: "#999", margin: "3px 0" },
  eventSummary: { fontSize: 13, color: "#555", margin: "4px 0 0", lineHeight: 1.7 },
  epilogue: {
    marginTop: 32, textAlign: "center",
    fontSize: 17, color: "#3B2510", letterSpacing: 3,
  },
};

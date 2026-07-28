import { useState } from "react";
import { asset } from "../utils/asset";

export default function CharacterSelect({ characters, onSelect, onRestart, savedRun = null, achievements = {}, achievementTitles = {}, onRecap }) {
  const [selectedId, setSelectedId] = useState(null);

  const handleSelect = (char) => {
    if (char.locked) return;
    setSelectedId(char.id);
    onSelect(char);
  };

  const earnedCount = characters.filter((c) => achievements[c.id]).length;

  return (
    <div style={styles.selectScreen}>
      <h1 style={styles.mainTitle}>
        <img
          src={asset("/assets/中国历史游.png")}
          alt="中国历史游"
          style={styles.titleImg}
        />
      </h1>
      <p style={styles.subtitle}>{"选择你的主人公"}</p>

      <div style={styles.characterGrid}>
        {characters.map((char) => (
          <div
            key={char.id}
            style={{
              ...styles.characterCard,
              borderColor: achievements[char.id] ? "#C9A86A" : "rgba(201,168,106,0.55)",
              opacity: char.locked ? 0.6 : 1,
              cursor: char.locked ? "not-allowed" : "pointer",
              transform: selectedId === char.id ? "scale(1.05)" : "scale(1)",
              transition: "all 0.3s",
            }}
            onClick={() => handleSelect(char)}
          >
            {char.portrait ? (
              <img src={asset(char.portrait)} alt={char.name} style={styles.charPortrait} />
            ) : (
              <div style={{ ...styles.charAvatar, backgroundColor: char.color }}>
                {char.avatar}
              </div>
            )}
            <h2 style={styles.charName}>
              <img
                src={asset(`/assets/${char.name}.png`)}
                alt={char.name}
                style={styles.charNameImg}
                onError={(e) => {
                  // 没有对应书法图时退回文字
                  e.currentTarget.replaceWith(document.createTextNode(char.name));
                }}
              />
            </h2>
            <p style={styles.charTitle}>{char.title}</p>
            <p style={styles.charYears}>{char.years}</p>
            <p style={styles.charDesc}>{char.description}</p>
            {char.locked && (
              <div style={styles.lockOverlay}>
                <span style={styles.lockPill}>{"🔒 等待开放"}</span>
              </div>
            )}
            {savedRun && savedRun.characterId === char.id && !char.locked && (
              <div style={styles.resumeRow}>
                <span style={styles.resumeInfo}>
                  {"▶ 上局进行中 · "}{savedRun.runScore || 0}{" 分"}
                </span>
                <button
                  style={styles.restartBtn}
                  title="清除上局进度，从头开始"
                  onClick={(e) => { e.stopPropagation(); onRestart && onRestart(char); }}
                >
                  {"重新开始"}
                </button>
              </div>
            )}
            {achievements[char.id] && (
              <>
                <div
                  style={styles.achBadge}
                  title={"历史成就 · " + (achievementTitles[char.id] || "人物传完成")}
                >
                  {"🏆"}
                </div>
                <button
                  style={styles.recapBtn}
                  onClick={(e) => { e.stopPropagation(); onRecap && onRecap(char.id); }}
                >
                  {"📜 人物回顾"}
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 成就栏 */}
      <div style={styles.achievementBar}>
        <span style={styles.achievementHeading}>
          {"🏆 历史成就 "}{earnedCount}{" / "}{characters.length}
        </span>
        {characters.map((c) => (
          <span
            key={c.id}
            style={{
              ...styles.achievementChip,
              ...(achievements[c.id] ? {} : styles.achievementChipLocked),
            }}
          >
            {(achievements[c.id] ? "✓ " : "… ") + (achievementTitles[c.id] || c.name + "传")}
          </span>
        ))}
      </div>
    </div>
  );
}

const styles = {
  selectScreen: {
    minHeight: "100vh",
    backgroundImage: `url('${asset("/assets/home_background.png")}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    // 亭楼在左，内容整体右移让出背景主体
    paddingLeft: "clamp(40px, 24vw, 460px)",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    position: "relative",
    overflow: "hidden",
  },
  mainTitle: {
    margin: "0 0 10px",
    lineHeight: 0,
  },
  titleImg: {
    height: 84,
    filter: "drop-shadow(0 1px 2px rgba(255,255,255,0.5))",
  },
  subtitle: {
    color: "#6B5A44",
    fontSize: 16,
    marginBottom: 40,
    letterSpacing: 8,
  },
  characterGrid: {
    display: "flex",
    gap: 24,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  characterCard: {
    width: 230,
    backgroundColor: "rgba(252,248,238,0.55)",
    borderRadius: 14,
    border: "1.5px solid",
    padding: 24,
    textAlign: "center",
    position: "relative",
    backdropFilter: "blur(6px)",
    boxShadow: "0 4px 18px rgba(90,70,40,0.12)",
  },
  charPortrait: {
    width: 120,
    height: 120,
    objectFit: "contain",
    margin: "0 auto 12px",
    display: "block",
  },
  charAvatar: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 12px",
    fontSize: 40,
    opacity: 0.85,
  },
  charName: {
    color: "#2B2118",
    fontSize: 24,
    margin: "0 0 4px",
    letterSpacing: 6,
    fontWeight: 600,
    lineHeight: 0,
  },
  charNameImg: {
    height: 40,
    verticalAlign: "middle",
  },
  charTitle: {
    color: "#7A6A50",
    fontSize: 13,
    margin: "0 0 4px",
    letterSpacing: 2,
  },
  charYears: {
    color: "#9A8B72",
    fontSize: 12,
    margin: "0 0 8px",
  },
  charDesc: {
    color: "#5A4A38",
    fontSize: 13,
    lineHeight: 1.6,
    margin: 0,
  },
  lockOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(246,241,230,0.42)",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8A7A5E",
    fontSize: 16,
    letterSpacing: 3,
  },
  lockPill: {
    backgroundColor: "rgba(252,248,238,0.92)",
    padding: "8px 20px",
    borderRadius: 20,
    border: "1px solid #D8CDB8",
    boxShadow: "0 2px 8px rgba(90,70,40,0.12)",
  },
  achBadge: {
    position: "absolute",
    top: 10,
    right: 12,
    fontSize: 24,
    filter: "drop-shadow(0 0 4px rgba(201,168,106,0.9))",
  },
  resumeRow: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  resumeInfo: {
    color: "#2E7D52",
    fontSize: 12.5,
    letterSpacing: 1,
    fontWeight: 600,
  },
  restartBtn: {
    padding: "4px 10px",
    border: "1px solid #C9B08A",
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.7)",
    color: "#8A7A5E",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "inherit",
  },
  recapBtn: {
    marginTop: 12,
    padding: "7px 16px",
    border: "1px solid #C9A86A",
    borderRadius: 8,
    backgroundColor: "rgba(201,168,106,0.15)",
    color: "#8A6D3B",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    letterSpacing: 1,
  },
  achievementBar: {
    marginTop: 36,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  achievementHeading: {
    color: "#8A6D3B",
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: 600,
  },
  achievementChip: {
    padding: "4px 14px",
    borderRadius: 14,
    fontSize: 12,
    letterSpacing: 1,
    backgroundColor: "rgba(201,168,106,0.2)",
    color: "#8A6D3B",
    border: "1px solid #C9A86A",
  },
  achievementChipLocked: {
    backgroundColor: "rgba(255,255,255,0.45)",
    color: "#A99",
    border: "1px solid #D8CDB8",
  },
};

import { useState } from "react";

export default function CharacterSelect({ characters, onSelect, achievements = {}, achievementTitles = {}, onRecap }) {
  const [selectedId, setSelectedId] = useState(null);

  const handleSelect = (char) => {
    if (char.locked) return;
    setSelectedId(char.id);
    onSelect(char);
  };

  const earnedCount = characters.filter((c) => achievements[c.id]).length;

  return (
    <div style={styles.selectScreen}>
      <h1 style={styles.mainTitle}>{"中国历史游"}</h1>
      <p style={styles.subtitle}>{"选择你的主人公"}</p>

      <div style={styles.characterGrid}>
        {characters.map((char) => (
          <div
            key={char.id}
            style={{
              ...styles.characterCard,
              borderColor: achievements[char.id] ? "#F4D03F" : char.color,
              opacity: char.locked ? 0.6 : 1,
              cursor: char.locked ? "not-allowed" : "pointer",
              transform: selectedId === char.id ? "scale(1.05)" : "scale(1)",
              transition: "all 0.3s",
            }}
            onClick={() => handleSelect(char)}
          >
            {char.portrait ? (
              <img src={char.portrait} alt={char.name} style={styles.charPortrait} />
            ) : (
              <div style={{ ...styles.charAvatar, backgroundColor: char.color }}>
                {char.avatar}
              </div>
            )}
            <h2 style={styles.charName}>{char.name}</h2>
            <p style={styles.charTitle}>{char.title}</p>
            <p style={styles.charYears}>{char.years}</p>
            <p style={styles.charDesc}>{char.description}</p>
            {char.locked && (
              <div style={styles.lockOverlay}>
                {"🔐 等待开放"}
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
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
  },
  mainTitle: {
    fontSize: 48,
    color: "#F4D03F",
    letterSpacing: 16,
    marginBottom: 8,
    textShadow: "0 0 20px rgba(244,208,63,0.3)",
    margin: "0 0 8px",
  },
  subtitle: {
    color: "#AAB7C4",
    fontSize: 16,
    marginBottom: 40,
    letterSpacing: 4,
  },
  characterGrid: {
    display: "flex",
    gap: 24,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  characterCard: {
    width: 220,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    border: "2px solid",
    padding: 24,
    textAlign: "center",
    position: "relative",
    backdropFilter: "blur(10px)",
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
  },
  charName: {
    color: "#FFF",
    fontSize: 22,
    margin: "0 0 4px",
    letterSpacing: 4,
  },
  charTitle: {
    color: "#AAB7C4",
    fontSize: 13,
    margin: "0 0 4px",
  },
  charYears: {
    color: "#888",
    fontSize: 12,
    margin: "0 0 8px",
  },
  charDesc: {
    color: "#CCC",
    fontSize: 13,
    lineHeight: 1.5,
    margin: 0,
  },
  lockOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFF",
    fontSize: 18,
    letterSpacing: 2,
  },
  achBadge: {
    position: "absolute",
    top: 10,
    right: 12,
    fontSize: 24,
    filter: "drop-shadow(0 0 6px rgba(244,208,63,0.8))",
  },
  recapBtn: {
    marginTop: 12,
    padding: "7px 16px",
    border: "1px solid #F4D03F",
    borderRadius: 6,
    backgroundColor: "rgba(244,208,63,0.12)",
    color: "#F4D03F",
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
    color: "#F4D03F",
    fontSize: 14,
    letterSpacing: 2,
  },
  achievementChip: {
    padding: "4px 14px",
    borderRadius: 14,
    fontSize: 12,
    letterSpacing: 1,
    backgroundColor: "rgba(244,208,63,0.15)",
    color: "#F4D03F",
    border: "1px solid rgba(244,208,63,0.5)",
  },
  achievementChipLocked: {
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#667",
    border: "1px solid rgba(255,255,255,0.15)",
  },
};

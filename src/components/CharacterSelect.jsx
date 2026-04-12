import { useState } from "react";

export default function CharacterSelect({ characters, onSelect }) {
  const [selectedId, setSelectedId] = useState(null);

  const handleSelect = (char) => {
    if (char.locked) return;
    setSelectedId(char.id);
    onSelect(char);
  };

  return (
    <div style={styles.selectScreen}>
      <h1 style={styles.mainTitle}>{"\u4e2d\u56fd\u5386\u53f2\u6e38"}</h1>
      <p style={styles.subtitle}>{"\u9009\u62e9\u4f60\u7684\u4e3b\u4eba\u516c"}</p>

      <div style={styles.characterGrid}>
        {characters.map((char) => (
          <div
            key={char.id}
            style={{
              ...styles.characterCard,
              borderColor: char.color,
              opacity: char.locked ? 0.6 : 1,
              cursor: char.locked ? "not-allowed" : "pointer",
              transform: selectedId === char.id ? "scale(1.05)" : "scale(1)",
              transition: "all 0.3s",
            }}
            onClick={() => handleSelect(char)}
          >
            <div style={{ ...styles.charAvatar, backgroundColor: char.color }}>
              {char.avatar}
            </div>
            <h2 style={styles.charName}>{char.name}</h2>
            <p style={styles.charTitle}>{char.title}</p>
            <p style={styles.charYears}>{char.years}</p>
            <p style={styles.charDesc}>{char.description}</p>
            {char.locked && (
              <div style={styles.lockOverlay}>
                {"\ud83d\udd10 \u5f85\u6b8b\u5f00\u653e"}
              </div>
            )}
          </div>
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
};

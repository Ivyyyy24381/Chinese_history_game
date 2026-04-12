export default function ScoreBar({ character, progress, totalStages }) {
  const progressPercent = (progress / totalStages) * 100;

  return (
    <div style={styles.scoreBar}>
      <div style={styles.scoreBarLeft}>
        <div style={{ fontSize: 18, fontWeight: "bold" }}>
          {character.avatar}
        </div>
        <div>
          <div style={styles.scoreCharName}>{character.name}</div>
          <div style={styles.scoreCharTitle}>{character.title}</div>
        </div>
      </div>
      <div style={styles.scoreBarRight}>
        <div style={styles.statItem}>
          <div style={styles.statLabel}>{"\u8fdb\u5ea6"}</div>
          <div style={styles.statValue}>
            {progress} / {totalStages}
          </div>
        </div>
        <div style={styles.progressBarOuter}>
          <div
            style={{
              ...styles.progressBarInner,
              width: `${progressPercent}%`,
              backgroundColor: character.color,
            }}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  scoreBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 20px",
    backgroundColor: "#FFF",
    borderBottom: "1px solid #E8E0D0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  scoreBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  scoreCharName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  scoreCharTitle: {
    fontSize: 13,
    color: "#999",
    backgroundColor: "#F0EBE0",
    padding: "2px 8px",
    borderRadius: 4,
    display: "inline-block",
  },
  scoreBarRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#999",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  progressBarOuter: {
    width: 120,
    height: 8,
    backgroundColor: "#E8E0D0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarInner: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.5s ease",
  },
};

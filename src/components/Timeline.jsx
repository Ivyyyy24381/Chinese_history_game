export default function Timeline({ stages, currentIndex, onSelect, progress }) {
  return (
    <div style={styles.timelineContainer}>
      <div style={styles.timelineTrack}>
        {stages.map((stage, idx) => {
          const isCompleted = idx < progress;
          const isCurrent = idx === currentIndex;

          return (
            <div key={stage.id} style={styles.timelineItemWrapper}>
              <button
                style={{
                  ...styles.timelineItem,
                  backgroundColor: isCurrent
                    ? stage.color
                    : isCompleted
                      ? stage.color
                      : "#DDD",
                  boxShadow: isCurrent
                    ? `0 0 16px ${stage.color}`
                    : "0 2px 4px rgba(0,0,0,0.1)",
                }}
                onClick={() => onSelect(idx)}
              >
                {isCompleted && <span style={styles.checkmark}>✓</span>}
              </button>
              <div style={styles.timelineLabel}>
                <div style={styles.yearLabel}>{stage.year}</div>
                <div style={styles.periodLabel}>{stage.period}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  timelineContainer: {
    backgroundColor: "#FFF",
    borderTop: "1px solid #E8E0D0",
    padding: "16px 20px",
    overflowX: "auto",
  },
  timelineTrack: {
    display: "flex",
    gap: 16,
    minWidth: "100%",
    alignItems: "flex-start",
  },
  timelineItemWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: "0 0 auto",
    minWidth: 80,
  },
  timelineItem: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "2px solid white",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  checkmark: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  timelineLabel: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 11,
  },
  yearLabel: {
    color: "#999",
    fontSize: 10,
  },
  periodLabel: {
    color: "#333",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },
};

import { useRef, useState, useEffect } from "react";

/**
 * Continuous draggable timeline slider, spanning the character's lifespan.
 * Stages are tick marks; dragging the thumb selects the period whose
 * year range contains the current year value.
 */
export default function Timeline({ stages, currentIndex, onSelect, progress }) {
  const yearStart = stages[0].yearStart;
  const yearEnd = stages[stages.length - 1].yearEnd;
  const totalSpan = yearEnd - yearStart;

  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hoverYear, setHoverYear] = useState(null);

  const current = stages[currentIndex];
  const currentMidYear = (current.yearStart + current.yearEnd) / 2;
  const thumbPct = ((currentMidYear - yearStart) / totalSpan) * 100;

  const stageAtYear = (year) => {
    for (let i = 0; i < stages.length; i++) {
      if (year <= stages[i].yearEnd) return i;
    }
    return stages.length - 1;
  };

  const yearAtClientX = (clientX) => {
    if (!trackRef.current) return yearStart;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    return yearStart + pct * totalSpan;
  };

  const handlePointerAt = (clientX) => {
    const year = yearAtClientX(clientX);
    setHoverYear(year);
    const idx = stageAtYear(year);
    if (idx !== currentIndex) onSelect(idx);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      handlePointerAt(cx);
    };
    const onUp = () => {
      setDragging(false);
      setHoverYear(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, currentIndex]);

  const onTrackDown = (e) => {
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    setDragging(true);
    handlePointerAt(cx);
  };

  return (
    <div style={styles.timelineContainer}>
      <div style={styles.headerRow}>
        <span style={{ ...styles.yearDisplay, color: current.color }}>
          {`${Math.round(currentMidYear)} 年`}
        </span>
        <span style={styles.currentBadge}>
          <span style={{ ...styles.currentDot, backgroundColor: current.color }} />
          {current.period}
          <span style={styles.lifespan}>{`（${yearStart}–${yearEnd}）`}</span>
        </span>
      </div>

      <div style={styles.trackArea}>
        {hoverYear !== null && (
          <div
            style={{
              ...styles.hoverBubble,
              left: `${((hoverYear - yearStart) / totalSpan) * 100}%`,
            }}
          >
            {Math.round(hoverYear)}
          </div>
        )}

        <div
          ref={trackRef}
          style={styles.track}
          onMouseDown={onTrackDown}
          onTouchStart={onTrackDown}
        >
          <div style={styles.trackLine} />
          <div
            style={{
              ...styles.trackFill,
              width: `${thumbPct}%`,
              backgroundColor: current.color,
            }}
          />

          {stages.map((stage, idx) => {
            const isUnlocked = idx <= progress;
            const isCurrent = idx === currentIndex;
            const pct = ((stage.yearStart - yearStart) / totalSpan) * 100;
            return (
              <div
                key={stage.id}
                style={{ ...styles.markerWrap, left: `${pct}%` }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(idx);
                }}
              >
                <div
                  style={{
                    ...styles.markerDot,
                    backgroundColor: isUnlocked ? stage.color : "#BFB7A5",
                    transform: isCurrent
                      ? "translate(-50%, -50%) scale(1.5)"
                      : "translate(-50%, -50%) scale(1)",
                    boxShadow: isCurrent
                      ? `0 0 12px ${stage.color}, 0 0 4px ${stage.color}`
                      : "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
                <div
                  style={{
                    ...styles.markerLabel,
                    color: isCurrent ? stage.color : "#555",
                    fontWeight: isCurrent ? "bold" : "normal",
                  }}
                >
                  <div style={styles.markerYear}>{stage.yearStart}</div>
                  <div style={styles.markerPeriod}>{stage.period}</div>
                </div>
              </div>
            );
          })}

          <div
            style={{
              ...styles.thumb,
              left: `${thumbPct}%`,
              backgroundColor: current.color,
              borderColor: current.color,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDragging(true);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setDragging(true);
            }}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  timelineContainer: {
    backgroundColor: "#FFF",
    borderTop: "1px solid #E8E0D0",
    padding: "10px 28px 18px",
    userSelect: "none",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
    fontSize: 12,
    color: "#888",
  },
  yearDisplay: {
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 2,
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    transition: "color 0.25s ease",
  },
  lifespan: {
    color: "#999",
    fontSize: 11,
    marginLeft: 6,
    fontWeight: "normal",
    letterSpacing: 0,
  },
  currentBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "#333",
    fontSize: 13,
    fontWeight: 600,
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },
  trackArea: {
    position: "relative",
    padding: "26px 12px 36px",
  },
  hoverBubble: {
    position: "absolute",
    top: 0,
    transform: "translateX(-50%)",
    backgroundColor: "#333",
    color: "#FFF",
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 4,
    pointerEvents: "none",
    zIndex: 10,
  },
  track: {
    position: "relative",
    height: 4,
    cursor: "pointer",
  },
  trackLine: {
    position: "absolute",
    inset: 0,
    backgroundColor: "#E0D6C2",
    borderRadius: 2,
  },
  trackFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    borderRadius: 2,
    transition: "width 0.25s ease, background-color 0.25s ease",
  },
  markerWrap: {
    position: "absolute",
    top: "50%",
    cursor: "pointer",
    zIndex: 3,
  },
  markerDot: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: "2px solid #FFF",
    transition: "transform 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease",
  },
  markerLabel: {
    position: "absolute",
    top: 14,
    left: 0,
    transform: "translateX(-50%)",
    textAlign: "center",
    whiteSpace: "nowrap",
    fontSize: 11,
    lineHeight: 1.3,
    transition: "color 0.25s ease",
  },
  markerYear: {
    fontSize: 10,
    color: "inherit",
    opacity: 0.7,
  },
  markerPeriod: {
    fontSize: 11,
    color: "inherit",
    marginTop: 1,
  },
  thumb: {
    position: "absolute",
    top: "50%",
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "3px solid",
    backgroundColor: "#FFF",
    transform: "translate(-50%, -50%)",
    cursor: "grab",
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
    zIndex: 4,
    transition: "left 0.2s ease, background-color 0.25s ease, border-color 0.25s ease",
  },
};

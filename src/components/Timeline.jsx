import { useRef, useState, useEffect } from "react";

/**
 * Continuous draggable timeline slider spanning the character's lifespan.
 * The slider value is a YEAR. Event ticks are drawn at each event's year;
 * stages are drawn as colored background segments behind the track.
 */
export default function Timeline({
  stages,
  events,
  currentYear,
  currentEventId,
  progressYear,
  onYearChange,
  onEventSelect,
}) {
  const yearStart = stages[0].yearStart;
  const yearEnd = stages[stages.length - 1].yearEnd;
  const totalSpan = yearEnd - yearStart;

  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hoverYear, setHoverYear] = useState(null);

  // Stage containing the current year (for accent color / label).
  const currentStage =
    stages.find((s) => currentYear >= s.yearStart && currentYear <= s.yearEnd) ||
    stages[stages.length - 1];

  const thumbPct = ((currentYear - yearStart) / totalSpan) * 100;

  const yearAtClientX = (clientX) => {
    if (!trackRef.current) return yearStart;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    return Math.round(yearStart + pct * totalSpan);
  };

  const handlePointerAt = (clientX) => {
    const year = yearAtClientX(clientX);
    setHoverYear(year);
    if (year !== currentYear) onYearChange(year);
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
  }, [dragging, currentYear]);

  const onTrackDown = (e) => {
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    setDragging(true);
    handlePointerAt(cx);
  };

  // Find current event for label
  const currentEvent = (events || []).find((e) => e.id === currentEventId);

  return (
    <div style={styles.timelineContainer}>
      <div style={styles.headerRow}>
        <span style={{ ...styles.yearDisplay, color: currentStage.color }}>
          {`${currentYear} 年`}
        </span>
        <span style={styles.currentBadge}>
          <span style={{ ...styles.currentDot, backgroundColor: currentStage.color }} />
          {currentEvent ? `${currentEvent.name} · ${currentStage.period}` : currentStage.period}
          <span style={styles.lifespan}>{`（${yearStart}–${yearEnd}）`}</span>
        </span>
      </div>

      <div style={styles.trackArea}>
        {hoverYear !== null && hoverYear !== currentYear && (
          <div
            style={{
              ...styles.hoverBubble,
              left: `${((hoverYear - yearStart) / totalSpan) * 100}%`,
            }}
          >
            {hoverYear}
          </div>
        )}

        <div
          ref={trackRef}
          style={styles.track}
          onMouseDown={onTrackDown}
          onTouchStart={onTrackDown}
        >
          {/* Stage segments (colored background bands) */}
          {stages.map((stage) => {
            const left = ((stage.yearStart - yearStart) / totalSpan) * 100;
            const width = ((stage.yearEnd - stage.yearStart) / totalSpan) * 100;
            return (
              <div
                key={stage.id}
                style={{
                  ...styles.stageSegment,
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: stage.color,
                  opacity: stage.id === currentStage.id ? 0.7 : 0.3,
                }}
              />
            );
          })}

          {/* Event ticks */}
          {(events || []).map((event) => {
            const isCurrent = event.id === currentEventId;
            const isReached = progressYear != null && event.year <= progressYear;
            const pct = ((event.year - yearStart) / totalSpan) * 100;
            return (
              <div
                key={event.id}
                style={{ ...styles.eventTickWrap, left: `${pct}%` }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventSelect && onEventSelect(event);
                }}
                title={`${event.year} 年 · ${event.name}`}
              >
                <div
                  style={{
                    ...styles.eventDot,
                    backgroundColor: event.stageColor,
                    transform: isCurrent
                      ? "translate(-50%, -50%) scale(1.6)"
                      : "translate(-50%, -50%) scale(1)",
                    boxShadow: isCurrent
                      ? `0 0 12px ${event.stageColor}, 0 0 4px ${event.stageColor}`
                      : isReached
                        ? `0 0 4px ${event.stageColor}`
                        : "0 1px 3px rgba(0,0,0,0.2)",
                    opacity: isReached || isCurrent ? 1 : 0.6,
                  }}
                />
                <div
                  style={{
                    ...styles.eventLabel,
                    color: isCurrent ? event.stageColor : "#555",
                    fontWeight: isCurrent ? "bold" : "normal",
                  }}
                >
                  <div style={styles.eventYear}>{event.year}</div>
                  <div style={styles.eventName}>{event.name}</div>
                </div>
              </div>
            );
          })}

          <div
            style={{
              ...styles.thumb,
              left: `${thumbPct}%`,
              backgroundColor: currentStage.color,
              borderColor: currentStage.color,
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
    padding: "26px 12px 40px",
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
    height: 6,
    cursor: "pointer",
    borderRadius: 3,
    backgroundColor: "#F0E8D6",
  },
  stageSegment: {
    position: "absolute",
    top: 0,
    height: "100%",
    transition: "opacity 0.25s ease",
  },
  eventTickWrap: {
    position: "absolute",
    top: "50%",
    cursor: "pointer",
    zIndex: 3,
  },
  eventDot: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: "2px solid #FFF",
    transition: "transform 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease",
  },
  eventLabel: {
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
  eventYear: {
    fontSize: 10,
    color: "inherit",
    opacity: 0.7,
  },
  eventName: {
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

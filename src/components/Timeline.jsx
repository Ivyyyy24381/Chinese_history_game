import { useRef, useState, useEffect } from "react";
import { COLOR, TRACKING, EASE, paper, paperBtn, scrim } from "../styles/theme";
import usePrefersReducedMotion from "../utils/usePrefersReducedMotion";

/**
 * Continuous draggable timeline slider spanning the character's lifespan.
 * The slider value is a YEAR. Event ticks are drawn at each event's year;
 * stages are drawn as faint colored bands behind the hairline track.
 *
 * 瘦身版：默认收成一条细带（挂在地图底部，底用 scrim() 的底带而非实色），
 * hover / focus 时展开显示事件标签。刻度是墨点，时期是极淡色带，
 * 文字用主页那套色阶和字距。
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
  // 时间轴从第一个事件年份开始（留 2 年边距防标签被裁），
  // 而不是从出生年开始——前段没有事件，纯浪费宽度。
  const firstEventYear = events?.length
    ? Math.min(...events.map((e) => e.year))
    : stages[0].yearStart;
  const yearStart = firstEventYear - 2;
  const yearEnd = stages[stages.length - 1].yearEnd;
  const totalSpan = yearEnd - yearStart;
  const lifeStart = stages[0].yearStart; // 展示用的生年

  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hoverYear, setHoverYear] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Stage containing the current year (for accent color / label).
  const currentStage =
    stages.find((s) => currentYear >= s.yearStart && currentYear <= s.yearEnd) ||
    stages[stages.length - 1];

  const thumbPct = Math.max(0, Math.min(100, ((currentYear - yearStart) / totalSpan) * 100));

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

  const trans = (props) =>
    prefersReducedMotion ? "none" : props.map((p) => `${p} 320ms ${EASE}`).join(", ");

  return (
    <div
      style={styles.timelineContainer}
      tabIndex={0}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => { if (!dragging) setExpanded(false); }}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
    >
      <div style={styles.headerRow}>
        <span style={styles.yearDisplay}>{`${currentYear} 年`}</span>
        <span style={styles.currentBadge}>
          <span style={{ ...styles.currentDot, backgroundColor: currentStage.color }} />
          {currentEvent ? `${currentEvent.name} · ${currentStage.period}` : currentStage.period}
          <span style={styles.lifespan}>{`（${lifeStart}–${yearEnd}）`}</span>
        </span>
      </div>

      <div
        style={{
          ...styles.trackArea,
          padding: expanded ? "44px 14px 46px" : "10px 14px 16px",
          transition: trans(["padding"]),
        }}
      >
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
          {/* 时期 = 极淡色带 */}
          {stages.map((stage) => {
            // 裁掉时间轴起点之前的部分（如 712–736 的空白期）
            const segStart = Math.max(stage.yearStart, yearStart);
            if (stage.yearEnd <= yearStart) return null;
            const left = ((segStart - yearStart) / totalSpan) * 100;
            const width = ((stage.yearEnd - segStart) / totalSpan) * 100;
            return (
              <div
                key={stage.id}
                style={{
                  ...styles.stageSegment,
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: stage.color,
                  opacity: stage.id === currentStage.id ? 0.34 : 0.16,
                }}
              />
            );
          })}
          {/* 墨色发丝线 */}
          <div style={styles.hairline} />

          {/* 事件刻度 = 墨点；标签只在展开时显示，上下交替防重叠 */}
          {(events || []).map((event, idx) => {
            const isCurrent = event.id === currentEventId;
            const isReached = progressYear != null && event.year <= progressYear;
            const pct = ((event.year - yearStart) / totalSpan) * 100;
            const above = idx % 2 === 0; // 0,2,4... above; 1,3,5... below
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
                    backgroundColor: isCurrent
                      ? COLOR.inkStrong
                      : isReached
                        ? COLOR.ink
                        : paper(0.85),
                    border: isCurrent
                      ? `2px solid ${COLOR.goldLine}`
                      : isReached
                        ? `1.5px solid ${paper(0.9)}`
                        : `1.5px solid ${COLOR.faint}`,
                    transform: isCurrent
                      ? "translate(-50%, -50%) scale(1.5)"
                      : "translate(-50%, -50%) scale(1)",
                    boxShadow: isCurrent ? `0 0 8px ${paper(1)}, 0 1px 3px rgba(60,45,25,0.35)` : "none",
                  }}
                />
                {/* Connector line between dot and label（展开时可见） */}
                <div
                  style={{
                    ...styles.eventConnector,
                    top: above ? -14 : 6,
                    height: 12,
                    opacity: expanded ? (isCurrent ? 0.7 : 0.35) : 0,
                    transition: trans(["opacity"]),
                  }}
                />
                <div
                  style={{
                    ...styles.eventLabel,
                    ...(above ? styles.eventLabelAbove : styles.eventLabelBelow),
                    color: isCurrent ? COLOR.inkStrong : COLOR.secondary,
                    fontWeight: isCurrent ? 600 : "normal",
                    opacity: expanded ? 1 : 0,
                    visibility: expanded ? "visible" : "hidden",
                    transition: trans(["opacity"]),
                  }}
                >
                  <div style={styles.eventYear}>{event.year}</div>
                  <div style={styles.eventName}>{event.name}</div>
                </div>
              </div>
            );
          })}

          {/* 拖动手柄：纸底金线小圆钮 */}
          <div
            style={{
              ...styles.thumb,
              left: `${thumbPct}%`,
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
    // 底带用 scrim() 的纸色渐变而不是实色，地图从雾里透上来
    background: scrim({
      top: 0, topFade: 0, topStop: 0, topEnd: 0,
      bottomStart: 0, bottomFade: 0.62, bottomStop: 46, bottom: 0.92,
      veil: 0, center: 0,
    }),
    padding: "8px 26px 6px",
    userSelect: "none",
    outline: "none",
    // 首尾事件标签居中定位可能超出两端 2-3px，裁掉以免整页出现横向滚动
    overflowX: "clip",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 2,
    fontSize: "clamp(9.6px, 0.833vw, 13.8px)",
    color: COLOR.secondary,
  },
  yearDisplay: {
    fontSize: "clamp(15px, 1.35vw, 22px)",
    fontWeight: 600,
    letterSpacing: TRACKING.normal,
    color: COLOR.inkStrong,
    textShadow: "0 1px 2px rgba(255,255,255,0.6)",
  },
  lifespan: {
    color: COLOR.faint,
    fontSize: "clamp(8.8px, 0.764vw, 12.6px)",
    marginLeft: 6,
    fontWeight: "normal",
    letterSpacing: 0,
  },
  currentBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: COLOR.ink,
    fontSize: "clamp(10.4px, 0.903vw, 14.9px)",
    fontWeight: 600,
    letterSpacing: TRACKING.tight,
    textShadow: "0 1px 2px rgba(255,255,255,0.55)",
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },
  trackArea: {
    position: "relative",
  },
  hoverBubble: {
    position: "absolute",
    top: -6,
    transform: "translateX(-50%)",
    backgroundColor: paperBtn(0.95),
    color: COLOR.ink,
    border: `1px solid ${COLOR.goldLineSoft}`,
    fontSize: "clamp(8.8px, 0.764vw, 12.6px)",
    padding: "2px 9px",
    borderRadius: 10,
    pointerEvents: "none",
    zIndex: 10,
    letterSpacing: TRACKING.tight,
  },
  track: {
    position: "relative",
    height: 8,
    cursor: "pointer",
  },
  stageSegment: {
    position: "absolute",
    top: 0,
    height: "100%",
    borderRadius: 4,
    transition: "opacity 0.25s ease",
  },
  hairline: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 1.5,
    transform: "translateY(-50%)",
    backgroundColor: COLOR.ink,
    opacity: 0.3,
    pointerEvents: "none",
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
    width: 10,
    height: 10,
    borderRadius: "50%",
    boxSizing: "border-box",
    transition: "transform 0.25s ease, background-color 0.25s ease, border 0.25s ease",
  },
  eventLabel: {
    position: "absolute",
    left: 0,
    transform: "translateX(-50%)",
    textAlign: "center",
    whiteSpace: "nowrap",
    fontSize: "clamp(8.8px, 0.764vw, 12.6px)",
    lineHeight: 1.3,
    letterSpacing: TRACKING.tight,
    textShadow: "0 1px 2px rgba(255,255,255,0.6)",
  },
  eventLabelAbove: {
    bottom: 20,
  },
  eventLabelBelow: {
    top: 20,
  },
  eventConnector: {
    position: "absolute",
    left: 0,
    transform: "translateX(-50%)",
    width: 1.2,
    backgroundColor: COLOR.faint,
  },
  eventYear: {
    fontSize: "clamp(8.8px, 0.764vw, 12.6px)",
    color: "inherit",
    opacity: 0.7,
  },
  eventName: {
    fontSize: "clamp(10.4px, 0.903vw, 14.9px)",
    color: "inherit",
    marginTop: 1,
  },
  thumb: {
    position: "absolute",
    top: "50%",
    width: 17,
    height: 17,
    borderRadius: "50%",
    border: `1.5px solid ${COLOR.goldLine}`,
    backgroundColor: paperBtn(0.96),
    transform: "translate(-50%, -50%)",
    cursor: "grab",
    boxShadow: "0 2px 6px rgba(60,45,25,0.3)",
    zIndex: 4,
    transition: "left 0.2s ease",
  },
};

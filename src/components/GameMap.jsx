/**
 * Map with event-level pin markers.
 *
 * - All events are visible from the start (dimmed if before `progressYear`,
 *   bright once unlocked, fully bright + glow when current).
 * - An SVG trajectory line connects events in chronological order. Solid for
 *   unlocked segments, dashed for future segments.
 *
 * Pin states:
 *   - Current event:   full color, glow, pulsing ring, larger pin
 *   - Past events:     full color, smaller pin, ✓ inside the pin
 *   - Future events:   muted color, smaller pin, no badge
 */
export default function GameMap({
  allEvents,
  currentYear,
  currentEventId,
  progressYear,
  onEventClick,
}) {
  const events = (allEvents || []).slice().sort((a, b) => a.year - b.year);

  // Build SVG polyline points in % space. We use 0..100 viewBox so coords
  // can stay in mapX/mapY percentages directly.
  const points = events
    .filter((e) => e.location && typeof e.location.mapX === "number")
    .map((e) => ({
      x: e.location.mapX,
      y: e.location.mapY,
      year: e.year,
      unlocked: progressYear != null && e.year <= progressYear,
    }));

  return (
    <div style={styles.mapContainer}>
      <div
        style={{
          ...styles.mapBackground,
          backgroundImage: `url('/assets/maps/tang_dynasty.png')`,
        }}
      >
        {/* Trajectory overlay (SVG, 0..100 viewBox in %) */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={styles.trajectorySvg}
        >
          {points.length >= 2 &&
            points.slice(0, -1).map((p, i) => {
              const q = points[i + 1];
              const bothUnlocked = p.unlocked && q.unlocked;
              return (
                <line
                  key={i}
                  x1={p.x}
                  y1={p.y}
                  x2={q.x}
                  y2={q.y}
                  stroke={bothUnlocked ? "#C0392B" : "#888"}
                  strokeWidth={bothUnlocked ? 0.4 : 0.25}
                  strokeDasharray={bothUnlocked ? "none" : "0.8 0.8"}
                  opacity={bothUnlocked ? 0.85 : 0.45}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
        </svg>

        {events.map((event) => {
          const isCurrent = event.id === currentEventId;
          const isPast =
            !isCurrent && progressYear != null && event.year <= progressYear;
          const isFuture =
            progressYear != null && event.year > progressYear && !isCurrent;
          const pinColor = event.stageColor || "#4A90A4";
          const pinSize = isCurrent ? 44 : 26;

          return (
            <button
              key={event.id}
              style={{
                ...styles.pinWrap,
                left: `${event.location.mapX}%`,
                top: `${event.location.mapY}%`,
                zIndex: isCurrent ? 5 : isPast ? 3 : 2,
                opacity: isFuture ? 0.55 : 1,
                filter: isFuture ? "saturate(0.5)" : "none",
              }}
              onClick={() => onEventClick(event)}
              title={`${event.year} 年 · ${event.name}`}
            >
              {isCurrent && (
                <span
                  style={{
                    ...styles.pulseRing,
                    backgroundColor: pinColor,
                  }}
                />
              )}
              <Pin
                color={pinColor}
                size={pinSize}
                glow={isCurrent}
                badge={isPast ? "✓" : null}
              />
              <span
                style={{
                  ...styles.pinLabel,
                  color: isCurrent ? pinColor : "#333",
                  fontWeight: isCurrent ? "bold" : 500,
                  backgroundColor: isCurrent
                    ? "rgba(255,255,255,0.95)"
                    : isFuture
                    ? "rgba(255,255,255,0.55)"
                    : "rgba(255,255,255,0.85)",
                  fontStyle: isFuture ? "italic" : "normal",
                }}
              >
                <span style={styles.pinYear}>{event.year}</span>
                <span style={styles.pinName}>{event.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Pin({ color, size, glow, badge }) {
  const w = size;
  const h = (size * 4) / 3;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 24 32"
      style={{
        display: "block",
        filter: glow
          ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 2px 3px rgba(0,0,0,0.4))`
          : "drop-shadow(0 2px 3px rgba(0,0,0,0.35))",
        transition: "all 0.3s ease",
      }}
    >
      <path
        d="M12 0.8 C5.8 0.8 0.8 5.8 0.8 12 c0 8.3 9.5 18.4 10.7 19.6 c0.3 0.3 0.7 0.3 1 0 C13.7 30.4 23.2 20.3 23.2 12 c0-6.2-5-11.2-11.2-11.2 z"
        fill={color}
        stroke="white"
        strokeWidth="1.4"
      />
      <circle cx="12" cy="12" r="4.5" fill="white" />
      {badge && (
        <text
          x="12"
          y="15"
          textAnchor="middle"
          fontSize="7"
          fontWeight="bold"
          fill={color}
        >
          {badge}
        </text>
      )}
    </svg>
  );
}

const styles = {
  mapContainer: {
    flex: 1,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 20px",
    minHeight: 400,
  },
  mapBackground: {
    aspectRatio: "1752 / 1245",
    maxWidth: "min(720px, 90%)",
    maxHeight: "calc(100vh - 280px)",
    width: "100%",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    position: "relative",
    borderRadius: 8,
  },
  trajectorySvg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 1,
  },
  pinWrap: {
    position: "absolute",
    transform: "translate(-50%, -100%)",
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "transform 0.25s ease",
  },
  pulseRing: {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translate(-50%, 0)",
    width: 30,
    height: 30,
    borderRadius: "50%",
    opacity: 0.35,
    animation: "mapPinPulse 1.6s ease-out infinite",
    pointerEvents: "none",
  },
  pinLabel: {
    marginTop: 2,
    fontSize: 11,
    padding: "1px 8px",
    borderRadius: 10,
    whiteSpace: "nowrap",
    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    transition: "all 0.25s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  pinYear: {
    fontSize: 10,
    opacity: 0.75,
  },
  pinName: {
    fontSize: 12,
  },
};

// Inject keyframes for pin pulse (once)
if (typeof document !== "undefined" && !document.getElementById("map-pin-pulse-keyframes")) {
  const style = document.createElement("style");
  style.id = "map-pin-pulse-keyframes";
  style.textContent = `
    @keyframes mapPinPulse {
      0% { transform: translate(-50%, 0) scale(0.6); opacity: 0.5; }
      100% { transform: translate(-50%, 0) scale(2.2); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

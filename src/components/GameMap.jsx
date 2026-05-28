/**
 * Map with event-level pin markers.
 * Only events with year <= currentYear are shown — future events stay hidden
 * until the player drags the timeline forward.
 *
 * - Current event:  full color, glow, pulsing ring, larger pin
 * - Past events:    full color, smaller pin, ✓ inside the pin
 */
export default function GameMap({
  allEvents,
  currentYear,
  currentEventId,
  progressYear,
  onEventClick,
}) {
  const visibleEvents = (allEvents || []).filter((e) => e.year <= currentYear);

  return (
    <div style={styles.mapContainer}>
      <div
        style={{
          ...styles.mapBackground,
          backgroundImage: `url('/assets/maps/tang_dynasty.png')`,
        }}
      >
        {visibleEvents.map((event) => {
          const isCurrent = event.id === currentEventId;
          const isPast = !isCurrent && progressYear != null && event.year <= progressYear;
          const pinColor = event.stageColor || "#4A90A4";
          const pinSize = isCurrent ? 44 : 30;

          return (
            <button
              key={event.id}
              style={{
                ...styles.pinWrap,
                left: `${event.location.mapX}%`,
                top: `${event.location.mapY}%`,
                zIndex: isCurrent ? 5 : 2,
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
                    : "rgba(255,255,255,0.8)",
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
    // Match the actual image ratio (1752 × 1245) so percentage-based pin
    // coordinates land on the right map features instead of empty letterbox.
    aspectRatio: "1752 / 1245",
    // Constrain by available viewport so the map doesn't dominate the screen.
    // Whichever of width/height hits its limit first wins; the other follows
    // via aspectRatio.
    maxWidth: "min(720px, 90%)",
    maxHeight: "calc(100vh - 280px)",
    width: "100%",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    position: "relative",
    borderRadius: 8,
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

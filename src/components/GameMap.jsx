/**
 * Map with event-level pin markers + pan/zoom.
 *
 * 交互：
 * - 滚轮缩放（以鼠标位置为中心），拖拽平移，双击复位
 * - 右下角 ＋/－/⟲ 按钮
 * - 切换事件（时间轴或点图钉）时自动放大并居中该事件地点
 *
 * Pin states:
 *   - Current event:   full color, glow, pulsing ring, larger pin
 *   - Past events:     full color, smaller pin, ✓ inside the pin
 *   - Future events:   muted color, smaller pin, no badge
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { asset } from "../utils/asset";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const FOCUS_SCALE = 2.1; // 自动聚焦时的放大倍数

export default function GameMap({
  allEvents,
  currentYear,
  currentEventId,
  progressYear,
  onEventClick,
}) {
  const events = (allEvents || []).slice().sort((a, b) => a.year - b.year);

  const viewportRef = useRef(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [animated, setAnimated] = useState(true);
  const dragRef = useRef(null);        // 当前拖拽状态
  const justDraggedRef = useRef(false); // 拖拽结束后抑制 click

  const clampView = useCallback((v) => {
    const el = viewportRef.current;
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale));
    if (!el) return { scale: s, tx: 0, ty: 0 };
    const { width: W, height: H } = el.getBoundingClientRect();
    const tx = Math.min(0, Math.max(W - W * s, v.tx));
    const ty = Math.min(0, Math.max(H - H * s, v.ty));
    return { scale: s, tx, ty };
  }, []);

  // 把地图上 (xPct, yPct) 的点平滑移动到视口中心
  const focusOn = useCallback((xPct, yPct, scale = FOCUS_SCALE) => {
    const el = viewportRef.current;
    if (!el) return;
    const { width: W, height: H } = el.getBoundingClientRect();
    setAnimated(true);
    setView(clampView({
      scale,
      tx: W / 2 - (xPct / 100) * W * scale,
      ty: H / 2 - (yPct / 100) * H * scale,
    }));
  }, [clampView]);

  // 切换事件 → 自动聚焦该地点
  const currentEvent = events.find((e) => e.id === currentEventId);
  const curX = currentEvent?.location?.mapX;
  const curY = currentEvent?.location?.mapY;
  useEffect(() => {
    if (typeof curX === "number" && typeof curY === "number") {
      focusOn(curX, curY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEventId]);

  // 滚轮缩放（手动加非 passive 监听，React 的 onWheel 是 passive 的没法 preventDefault）
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setAnimated(false);
      setView((v) => {
        const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
        const k = ns / v.scale;
        return clampView({ scale: ns, tx: mx - k * (mx - v.tx), ty: my - k * (my - v.ty) });
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clampView]);

  // 拖拽平移（鼠标 + 触屏）
  const startDrag = (clientX, clientY) => {
    dragRef.current = { x: clientX, y: clientY, tx0: view.tx, ty0: view.ty, moved: false };
    setAnimated(false);
  };
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      if (Math.abs(cx - d.x) + Math.abs(cy - d.y) > 4) d.moved = true;
      if (d.moved) {
        setView((v) => clampView({ scale: v.scale, tx: d.tx0 + (cx - d.x), ty: d.ty0 + (cy - d.y) }));
      }
    };
    const onUp = () => {
      if (dragRef.current?.moved) {
        justDraggedRef.current = true;
        setTimeout(() => { justDraggedRef.current = false; }, 80);
      }
      dragRef.current = null;
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
  }, [clampView]);

  const zoomBy = (factor) => {
    const el = viewportRef.current;
    if (!el) return;
    const { width: W, height: H } = el.getBoundingClientRect();
    setAnimated(true);
    setView((v) => {
      const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const k = ns / v.scale;
      // 以视口中心为缩放中心
      return clampView({ scale: ns, tx: W / 2 - k * (W / 2 - v.tx), ty: H / 2 - k * (H / 2 - v.ty) });
    });
  };
  const resetView = () => { setAnimated(true); setView({ scale: 1, tx: 0, ty: 0 }); };

  // Build SVG polyline points in % space.
  const points = events
    .filter((e) => e.location && typeof e.location.mapX === "number")
    .map((e) => ({
      x: e.location.mapX,
      y: e.location.mapY,
      year: e.year,
      unlocked: progressYear != null && e.year <= progressYear,
    }));

  const { scale, tx, ty } = view;

  return (
    <div style={styles.mapContainer}>
      <div
        ref={viewportRef}
        style={{ ...styles.viewport, cursor: dragRef.current?.moved ? "grabbing" : "grab" }}
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onDoubleClick={resetView}
      >
        <div
          style={{
            ...styles.mapBackground,
            backgroundImage: `url('${asset("/assets/maps/dufu_general_map.png")}')`,
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transition: animated ? "transform 0.7s cubic-bezier(0.25, 0.8, 0.35, 1)" : "none",
          }}
        >
          {/* Trajectory overlay (SVG, 0..100 viewBox in %) */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.trajectorySvg}>
            {points.length >= 2 &&
              points.slice(0, -1).map((p, i) => {
                const q = points[i + 1];
                const bothUnlocked = p.unlocked && q.unlocked;
                return (
                  <line
                    key={i}
                    x1={p.x} y1={p.y} x2={q.x} y2={q.y}
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
            const isPast = !isCurrent && progressYear != null && event.year <= progressYear;
            const isFuture = progressYear != null && event.year > progressYear && !isCurrent;
            const pinColor = event.stageColor || "#4A90A4";
            const pinSize = isCurrent ? 44 : 26;
            // 放大时图钉/文字按比例缩小一些，避免遮住地图（保留一点增大感）
            const counter = 1 / Math.sqrt(scale);

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
                  transform: `translate(-50%, -100%) scale(${counter})`,
                  transformOrigin: "50% 100%",
                }}
                onClick={() => {
                  if (justDraggedRef.current) return; // 拖拽结束不算点击
                  onEventClick(event);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title={`${event.year} 年 · ${event.name}`}
              >
                {isCurrent && (
                  <span style={{ ...styles.pulseRing, backgroundColor: pinColor }} />
                )}
                <Pin color={pinColor} size={pinSize} glow={isCurrent} badge={isPast ? "✓" : null} />
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

      {/* 缩放控制 */}
      <div style={styles.zoomControls}>
        <button style={styles.zoomBtn} title="放大" onClick={() => zoomBy(1.4)}>{"＋"}</button>
        <button style={styles.zoomBtn} title="缩小" onClick={() => zoomBy(1 / 1.4)}>{"－"}</button>
        <button style={styles.zoomBtn} title="复位（双击地图也可复位）" onClick={resetView}>{"⟲"}</button>
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
        <text x="12" y="15" textAnchor="middle" fontSize="7" fontWeight="bold" fill={color}>
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
    padding: "6px 12px",
    minHeight: 400,
  },
  // 视口：固定框，内部地图可平移缩放
  viewport: {
    aspectRatio: "1752 / 1245",
    // 宽度同时受屏宽和屏高约束，保证始终按地图比例完整显示
    width: "min(1150px, 97%, calc((100vh - 250px) * 1752 / 1245))",
    position: "relative",
    overflow: "hidden",
    borderRadius: 10,
    boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
    touchAction: "none",
  },
  mapBackground: {
    width: "100%",
    height: "100%",
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
    position: "relative",
    transformOrigin: "0 0",
    willChange: "transform",
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
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "opacity 0.25s ease",
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
    fontSize: 12,
    padding: "2px 9px",
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
  zoomControls: {
    position: "absolute",
    right: 26,
    bottom: 18,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    zIndex: 20,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: "1px solid #D8CDB8",
    backgroundColor: "rgba(255,255,255,0.92)",
    fontSize: 17,
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    color: "#5A4A32",
    lineHeight: 1,
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

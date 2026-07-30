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
import { dufuPortraitPath } from "../data/dufuPoses";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const FOCUS_SCALE = 2.1; // 自动聚焦时的放大倍数
const IMG_RATIO = 1752 / 1245; // 地图原图宽高比

// 视口任意比例下，底图以 cover 方式铺满（宽或高撑满，可平移看其余部分）
function coverDims(W, H) {
  if (W / H >= IMG_RATIO) return { cw: W, ch: W / IMG_RATIO };
  return { cw: H * IMG_RATIO, ch: H };
}

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

  // 视口尺寸（驱动底图 cover 尺寸）
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => {
      const r = es[0].contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clampView = useCallback((v) => {
    const el = viewportRef.current;
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale));
    if (!el) return { scale: s, tx: 0, ty: 0 };
    const { width: W, height: H } = el.getBoundingClientRect();
    const { cw, ch } = coverDims(W, H);
    const tx = Math.min(0, Math.max(W - cw * s, v.tx));
    const ty = Math.min(0, Math.max(H - ch * s, v.ty));
    return { scale: s, tx, ty };
  }, []);

  // 把地图上 (xPct, yPct) 的点平滑移动到视口中心
  const focusOn = useCallback((xPct, yPct, scale = FOCUS_SCALE) => {
    const el = viewportRef.current;
    if (!el) return;
    const { width: W, height: H } = el.getBoundingClientRect();
    const { cw, ch } = coverDims(W, H);
    setAnimated(true);
    setView(clampView({
      scale,
      tx: W / 2 - (xPct / 100) * cw * scale,
      ty: H / 2 - (yPct / 100) * ch * scale,
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
            ...(box.w ? (() => { const d = coverDims(box.w, box.h); return { width: d.cw, height: d.ch }; })() : { width: "100%", height: "100%" }),
            backgroundImage: `url('${asset("/assets/maps/dufu_general_map.png")}')`,
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transition: animated ? "transform 0.7s cubic-bezier(0.25, 0.8, 0.35, 1)" : "none",
          }}
        >
          {/* 事件连线已移除——地图底图上已绘有行迹路线，叠加线反而杂乱 */}
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
                {/* 文字标签已去掉——底图自带地名/事件字，叠加会重影；悬停有 title 提示。
                    当前事件不画图钉，由小杜甫立绘代替。 */}
                {!isCurrent && (
                  <Pin color={pinColor} size={pinSize} glow={false} badge={isPast ? "✓" : null} />
                )}
              </button>
            );
          })}

          {/* 小杜甫：站在当前事件位置，切换事件时走过去 */}
          {currentEvent?.location && (
            <img
              src={asset(dufuPortraitPath(null, currentEvent.year))}
              alt=""
              style={{
                ...styles.walker,
                left: `${currentEvent.location.mapX}%`,
                top: `${currentEvent.location.mapY}%`,
                transform: `translate(-50%, -96%) scale(${1 / Math.sqrt(scale)})`,
              }}
            />
          )}
        </div>
      </div>

      {/* 缩放控制 */}
      <div style={styles.zoomControls}>
        <button style={styles.zoomBtn} title="放大" onClick={() => zoomBy(1.4)}>{"＋"}</button>
        <button style={styles.zoomBtn} title="缩小" onClick={() => zoomBy(1 / 1.4)}>{"－"}</button>
        <button style={styles.zoomBtn} title="复位（双击地图也可复位）" onClick={resetView}>{"⟲"}</button>
      </div>

      {/* 事件前进/后退 */}
      {(() => {
        const idx = events.findIndex((e) => e.id === currentEventId);
        const prev = idx > 0 ? events[idx - 1] : null;
        const next = idx >= 0 && idx < events.length - 1 ? events[idx + 1] : null;
        return (
          <div style={styles.stepControls}>
            <button
              style={{ ...styles.stepBtn, opacity: prev ? 1 : 0.4, cursor: prev ? "pointer" : "default" }}
              disabled={!prev}
              onClick={() => prev && onEventClick(prev)}
            >
              {"◀ " + (prev ? `${prev.year} ${prev.name}` : "已是起点")}
            </button>
            <button
              style={{ ...styles.stepBtn, opacity: next ? 1 : 0.4, cursor: next ? "pointer" : "default" }}
              disabled={!next}
              onClick={() => next && onEventClick(next)}
            >
              {(next ? `${next.year} ${next.name}` : "已是终点") + " ▶"}
            </button>
          </div>
        );
      })()}
    </div>
  );
}

export function Pin({ color, size, glow, badge }) {
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
    alignItems: "stretch",
    justifyContent: "center",
    padding: 0,
    minHeight: 400,
  },
  // 视口：全宽通栏，底图 cover 铺满，可平移缩放
  viewport: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    touchAction: "none",
  },
  mapBackground: {
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
    position: "relative",
    transformOrigin: "0 0",
    willChange: "transform",
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
    fontSize: "clamp(9.6px, 0.833vw, 13.8px)",
    padding: "2px 9px",
    borderRadius: 10,
    whiteSpace: "nowrap",
    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    transition: "all 0.25s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  pinYear: {
    fontSize: "clamp(8.0px, 0.694vw, 11.5px)",
    opacity: 0.75,
  },
  pinName: {
    fontSize: "clamp(9.6px, 0.833vw, 13.8px)",
  },
  walker: {
    position: "absolute",
    height: 64,
    zIndex: 8,
    pointerEvents: "none",
    transformOrigin: "50% 100%",
    transition: "left 0.9s ease-in-out, top 0.9s ease-in-out",
    filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))",
  },
  stepControls: {
    position: "absolute",
    left: "50%",
    bottom: 16,
    transform: "translateX(-50%)",
    display: "flex",
    gap: 10,
    zIndex: 20,
  },
  stepBtn: {
    padding: "8px 16px",
    borderRadius: 18,
    border: "1px solid #C9B08A",
    backgroundColor: "rgba(252,248,238,0.92)",
    color: "#5A4A32",
    fontSize: "clamp(10.4px, 0.903vw, 14.9px)",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    letterSpacing: 1,
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
    fontSize: "clamp(13.6px, 1.181vw, 19.5px)",
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

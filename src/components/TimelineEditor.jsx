import { useState, useRef, useEffect, useMemo } from "react";

/**
 * TimelineEditor — edit timeline.json directly:
 *   - Drag event pins on the map to update mapX / mapY
 *   - Drag event ticks on the timeline to update year
 *   - Edit event metadata (name, summary, state, location.name, hasScene, hasQuiz)
 *   - Edit stage metadata (period, yearStart, yearEnd, color)
 *   - "Save" → POSTs to /api/save-timeline
 *   - "Edit scene" → drills into <SceneEditor initialEventId=...>
 */
export default function TimelineEditor({ onEditEvent }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [draggingTick, setDraggingTick] = useState(null);
  const mapRef = useRef(null);
  const trackRef = useRef(null);

  // Load timeline.json on mount
  useEffect(() => {
    import("../data/dufu/timeline.json?import")
      .then((m) => {
        // Vite caches imports; force fresh fetch with cache-bust query.
        return fetch("/src/data/dufu/timeline.json?t=" + Date.now())
          .then((r) => r.json())
          .then(setData)
          .catch(() => setData(m.default));
      })
      .catch(() => {
        fetch("/src/data/dufu/timeline.json?t=" + Date.now())
          .then((r) => r.json())
          .then(setData);
      })
      .finally(() => setLoading(false));
  }, []);

  // Flatten events with stage refs
  const allEvents = useMemo(() => {
    if (!data) return [];
    return data.stages.flatMap((stage, sIdx) =>
      (stage.events || []).map((ev, eIdx) => ({
        ...ev,
        _stageIndex: sIdx,
        _eventIndex: eIdx,
        _stageColor: stage.color,
        _stagePeriod: stage.period,
      }))
    );
  }, [data]);

  const selectedEvent = allEvents.find((e) => e.id === selectedEventId);
  const selectedStage = data && selectedStageId
    ? data.stages.find((s) => s.id === selectedStageId)
    : null;

  // Update a single event field (writes back into stages[sIdx].events[eIdx])
  const updateEventField = (sIdx, eIdx, field, value) => {
    setData((prev) => {
      const next = { ...prev, stages: prev.stages.map((s) => ({ ...s, events: [...(s.events || [])] })) };
      const ev = { ...next.stages[sIdx].events[eIdx] };
      if (field.startsWith("location.")) {
        const key = field.split(".")[1];
        ev.location = { ...ev.location, [key]: value };
      } else {
        ev[field] = value;
      }
      next.stages[sIdx].events[eIdx] = ev;
      return next;
    });
  };

  const updateStageField = (sIdx, field, value) => {
    setData((prev) => {
      const next = { ...prev, stages: [...prev.stages] };
      next.stages[sIdx] = { ...next.stages[sIdx], [field]: value };
      return next;
    });
  };

  // === Map pin drag ===
  const onPinMouseDown = (e, eventId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(eventId);
    setSelectedEventId(eventId);
  };

  useEffect(() => {
    if (!dragging || !mapRef.current) return;
    const onMove = (e) => {
      const rect = mapRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      const ev = allEvents.find((a) => a.id === dragging);
      if (ev) {
        updateEventField(ev._stageIndex, ev._eventIndex, "location.mapX", Number(x.toFixed(1)));
        updateEventField(ev._stageIndex, ev._eventIndex, "location.mapY", Number(y.toFixed(1)));
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, allEvents]);

  // === Timeline tick drag ===
  const onTickMouseDown = (e, eventId) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTick(eventId);
    setSelectedEventId(eventId);
  };

  useEffect(() => {
    if (!draggingTick || !trackRef.current || !data) return;
    const yearStart = data.stages[0].yearStart;
    const yearEnd = data.stages[data.stages.length - 1].yearEnd;
    const span = yearEnd - yearStart;
    const onMove = (e) => {
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const year = Math.round(yearStart + pct * span);
      const ev = allEvents.find((a) => a.id === draggingTick);
      if (ev) {
        updateEventField(ev._stageIndex, ev._eventIndex, "year", year);
      }
    };
    const onUp = () => setDraggingTick(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingTick, allEvents, data]);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/save-timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify(data, null, 2) }),
      });
      const result = await res.json();
      if (result.ok) {
        setSaveStatus("✅ 已保存");
        setTimeout(() => setSaveStatus(""), 2500);
      } else {
        setSaveStatus("❌ " + result.error);
      }
    } catch (err) {
      setSaveStatus("❌ " + err.message);
    }
  };

  if (loading || !data) {
    return (
      <div style={styles.loading}>{"加载时间线..."}</div>
    );
  }

  const yearStart = data.stages[0].yearStart;
  const yearEnd = data.stages[data.stages.length - 1].yearEnd;
  const span = yearEnd - yearStart;

  return (
    <div style={styles.root}>
      <div style={styles.topBar}>
        <h2 style={styles.title}>{"🗺 时间线编辑器"}</h2>
        <span style={styles.hint}>
          {"在地图上拖动 pin → 调整 mapX/mapY；在时间线上拖动 tick → 调整年份。"}
        </span>
        <button style={styles.saveBtn} onClick={handleSave}>{"💾 保存 timeline.json"}</button>
        {saveStatus && <span style={styles.saveStatus}>{saveStatus}</span>}
        <button
          style={styles.gameBtn}
          onClick={() => { window.location.search = ""; }}
        >
          {"← 返回游戏"}
        </button>
      </div>

      <div style={styles.main}>
        {/* Left: map */}
        <div style={styles.mapWrap}>
          <div
            ref={mapRef}
            style={{
              ...styles.map,
              backgroundImage: "url('/assets/maps/dufu_general_map.png')",
              cursor: dragging ? "grabbing" : "default",
            }}
          >
            {allEvents.map((ev) => {
              const isSel = ev.id === selectedEventId;
              return (
                <button
                  key={ev.id}
                  style={{
                    ...styles.pin,
                    left: `${ev.location.mapX}%`,
                    top: `${ev.location.mapY}%`,
                    cursor: dragging === ev.id ? "grabbing" : "grab",
                    zIndex: isSel ? 10 : 1,
                  }}
                  onMouseDown={(e) => onPinMouseDown(e, ev.id)}
                  onClick={() => setSelectedEventId(ev.id)}
                  title={`${ev.year} · ${ev.name}`}
                >
                  <svg width={isSel ? 38 : 28} height={isSel ? 50 : 38} viewBox="0 0 24 32" style={{
                    filter: isSel
                      ? `drop-shadow(0 0 6px ${ev._stageColor}) drop-shadow(0 2px 3px rgba(0,0,0,0.5))`
                      : "drop-shadow(0 2px 3px rgba(0,0,0,0.4))",
                  }}>
                    <path
                      d="M12 0.8 C5.8 0.8 0.8 5.8 0.8 12 c0 8.3 9.5 18.4 10.7 19.6 c0.3 0.3 0.7 0.3 1 0 C13.7 30.4 23.2 20.3 23.2 12 c0-6.2-5-11.2-11.2-11.2 z"
                      fill={ev._stageColor}
                      stroke="white"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="12" r="4.5" fill="white" />
                  </svg>
                  <span style={{
                    ...styles.pinLabel,
                    backgroundColor: isSel ? ev._stageColor : "rgba(255,255,255,0.9)",
                    color: isSel ? "#FFF" : "#333",
                    fontWeight: isSel ? "bold" : 500,
                  }}>
                    {ev.year}·{ev.name}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={styles.coordsHint}>
            {selectedEvent
              ? `当前选中：${selectedEvent.name}  mapX=${selectedEvent.location.mapX}  mapY=${selectedEvent.location.mapY}  year=${selectedEvent.year}`
              : "点击或拖动任一 pin 选中事件"}
          </div>
        </div>

        {/* Right: event detail editor */}
        <div style={styles.detail}>
          {selectedEvent ? (
            <EventDetailEditor
              event={selectedEvent}
              stages={data.stages}
              onChange={(field, value) =>
                updateEventField(
                  selectedEvent._stageIndex,
                  selectedEvent._eventIndex,
                  field,
                  value
                )
              }
              onEditScene={() => onEditEvent && onEditEvent(selectedEvent.id)}
            />
          ) : selectedStage ? (
            <StageDetailEditor
              stage={selectedStage}
              onChange={(field, value) =>
                updateStageField(
                  data.stages.findIndex((s) => s.id === selectedStage.id),
                  field,
                  value
                )
              }
            />
          ) : (
            <div style={styles.placeholder}>
              {"选中一个事件或时期来编辑详细信息。"}
              <div style={{ marginTop: 16, fontSize: 12, color: "#888", lineHeight: 1.8 }}>
                {"• 地图上的 pin = 一个事件，可拖动；点击选中。"}
                <br />
                {"• 下方时间线上的 tick = 同一个事件，拖动可改变年份。"}
                <br />
                {"• 时间线上方的颜色块 = stage 区段，点击编辑该时期。"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: timeline track with draggable event ticks + stage segments */}
      <div style={styles.timelineWrap}>
        <div style={styles.timelineHeader}>
          <span style={styles.lifespan}>{`${yearStart} — ${yearEnd}（${span + 1}年）`}</span>
        </div>
        <div ref={trackRef} style={styles.track}>
          {data.stages.map((stage, sIdx) => {
            const left = ((stage.yearStart - yearStart) / span) * 100;
            const width = ((stage.yearEnd - stage.yearStart) / span) * 100;
            const isSel = selectedStageId === stage.id;
            return (
              <div
                key={stage.id}
                style={{
                  ...styles.stageBand,
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: stage.color,
                  opacity: isSel ? 0.8 : 0.35,
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStageId(stage.id);
                  setSelectedEventId(null);
                }}
                title={`${stage.period} (${stage.yearStart}-${stage.yearEnd})`}
              >
                <span style={styles.stageLabel}>{stage.period}</span>
              </div>
            );
          })}
          {allEvents.map((ev) => {
            const pct = ((ev.year - yearStart) / span) * 100;
            const isSel = ev.id === selectedEventId;
            return (
              <div
                key={ev.id}
                style={{
                  ...styles.tickWrap,
                  left: `${pct}%`,
                  cursor: draggingTick === ev.id ? "grabbing" : "grab",
                }}
                onMouseDown={(e) => onTickMouseDown(e, ev.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEventId(ev.id);
                  setSelectedStageId(null);
                }}
              >
                <div
                  style={{
                    ...styles.tick,
                    backgroundColor: ev._stageColor,
                    transform: isSel
                      ? "translate(-50%, -50%) scale(1.6)"
                      : "translate(-50%, -50%) scale(1)",
                    boxShadow: isSel ? `0 0 8px ${ev._stageColor}` : "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
                <div style={{
                  ...styles.tickLabel,
                  color: isSel ? ev._stageColor : "#555",
                  fontWeight: isSel ? "bold" : "normal",
                }}>
                  <div style={{ fontSize: 10, opacity: 0.75 }}>{ev.year}</div>
                  <div style={{ fontSize: 11 }}>{ev.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EventDetailEditor({ event, stages, onChange, onEditScene }) {
  return (
    <div>
      <div style={styles.detailHeader}>
        <span style={{ ...styles.idChip, backgroundColor: event._stageColor }}>{event.id}</span>
      </div>
      <Field label="名称" value={event.name} onChange={(v) => onChange("name", v)} />
      <Field
        label="年份"
        type="number"
        value={event.year}
        onChange={(v) => onChange("year", Number(v))}
      />
      <Field
        label="所属时期"
        value={event._stagePeriod}
        readOnly
        hint="（由年份自动归属到 stage）"
      />
      <Field label="杜甫状态" value={event.state || ""} onChange={(v) => onChange("state", v)} />
      <Field
        label="一句话简介"
        value={event.summary || ""}
        onChange={(v) => onChange("summary", v)}
        multiline
      />
      <div style={styles.row}>
        <Field
          label="地点名称"
          value={event.location?.name || ""}
          onChange={(v) => onChange("location.name", v)}
          flex
        />
        <Field
          label="mapX"
          type="number"
          step="0.1"
          value={event.location?.mapX ?? 50}
          onChange={(v) => onChange("location.mapX", Number(v))}
        />
        <Field
          label="mapY"
          type="number"
          step="0.1"
          value={event.location?.mapY ?? 50}
          onChange={(v) => onChange("location.mapY", Number(v))}
        />
      </div>
      <div style={styles.checkRow}>
        <label style={styles.checkLabel}>
          <input
            type="checkbox"
            checked={!!event.hasScene}
            onChange={(e) => onChange("hasScene", e.target.checked)}
          />
          {" hasScene（已实现场景）"}
        </label>
        <label style={styles.checkLabel}>
          <input
            type="checkbox"
            checked={!!event.hasQuiz}
            onChange={(e) => onChange("hasQuiz", e.target.checked)}
          />
          {" hasQuiz"}
        </label>
      </div>
      <button style={styles.editSceneBtn} onClick={onEditScene}>
        {event.hasScene ? "📝 编辑此事件的场景" : "📝 创建此事件的场景"}
      </button>
    </div>
  );
}

function StageDetailEditor({ stage, onChange }) {
  return (
    <div>
      <div style={styles.detailHeader}>
        <span style={{ ...styles.idChip, backgroundColor: stage.color }}>{stage.id}</span>
        <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{"（时期段）"}</span>
      </div>
      <Field label="时期名称" value={stage.period} onChange={(v) => onChange("period", v)} />
      <div style={styles.row}>
        <Field
          label="起始年"
          type="number"
          value={stage.yearStart}
          onChange={(v) => onChange("yearStart", Number(v))}
        />
        <Field
          label="结束年"
          type="number"
          value={stage.yearEnd}
          onChange={(v) => onChange("yearEnd", Number(v))}
        />
        <Field
          label="颜色"
          type="color"
          value={stage.color}
          onChange={(v) => onChange("color", v)}
        />
      </div>
      <Field
        label="时期简介"
        value={stage.summary || ""}
        onChange={(v) => onChange("summary", v)}
        multiline
      />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", step, multiline, readOnly, flex, hint }) {
  return (
    <div style={{ marginBottom: 10, ...(flex ? { flex: 1 } : {}) }}>
      <div style={styles.fieldLabel}>{label}{hint && <span style={styles.hintInline}>{hint}</span>}</div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          style={{ ...styles.input, minHeight: 60, resize: "vertical" }}
        />
      ) : (
        <input
          type={type}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          style={{ ...styles.input, ...(readOnly ? { backgroundColor: "#F8F8F8", color: "#666" } : {}) }}
        />
      )}
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    backgroundColor: "#1a1a2e",
    color: "#FFF",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    display: "flex",
    flexDirection: "column",
  },
  topBar: {
    backgroundColor: "#16213E",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    borderBottom: "1px solid #2C3E50",
  },
  title: { margin: 0, fontSize: 18 },
  hint: { fontSize: 12, color: "#AAB7C4", flex: 1 },
  saveBtn: {
    padding: "8px 16px",
    backgroundColor: "#27AE60",
    color: "#FFF",
    border: "none",
    borderRadius: 6,
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 13,
  },
  saveStatus: { fontSize: 13, color: "#7FE2A8" },
  gameBtn: {
    padding: "8px 14px",
    backgroundColor: "transparent",
    color: "#AAB7C4",
    border: "1px solid #2C3E50",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  },
  main: {
    flex: 1,
    display: "flex",
    minHeight: 0,
  },
  mapWrap: {
    flex: "1 1 0",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  map: {
    flex: 1,
    backgroundColor: "#0F1626",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    position: "relative",
    borderRadius: 8,
    minHeight: 400,
    overflow: "hidden",
  },
  pin: {
    position: "absolute",
    transform: "translate(-50%, -100%)",
    background: "none",
    border: "none",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  pinLabel: {
    marginTop: 2,
    fontSize: 10,
    padding: "1px 6px",
    borderRadius: 8,
    whiteSpace: "nowrap",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    fontFamily: "inherit",
  },
  coordsHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#7FE2A8",
    fontFamily: "monospace",
  },
  detail: {
    width: 360,
    backgroundColor: "#0F1626",
    padding: 20,
    overflowY: "auto",
    borderLeft: "1px solid #2C3E50",
  },
  detailHeader: {
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
  },
  idChip: {
    padding: "3px 10px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFF",
    fontFamily: "monospace",
  },
  fieldLabel: {
    fontSize: 11,
    color: "#AAB7C4",
    marginBottom: 3,
    letterSpacing: 1,
  },
  hintInline: { fontSize: 10, marginLeft: 6, color: "#7F8C8D" },
  input: {
    width: "100%",
    padding: "6px 10px",
    backgroundColor: "#1F2A40",
    color: "#FFF",
    border: "1px solid #2C3E50",
    borderRadius: 4,
    fontSize: 13,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  row: { display: "flex", gap: 8 },
  checkRow: { display: "flex", gap: 16, margin: "10px 0", flexWrap: "wrap" },
  checkLabel: { fontSize: 12, color: "#CCC", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" },
  editSceneBtn: {
    width: "100%",
    marginTop: 16,
    padding: "10px",
    backgroundColor: "#F4D03F",
    color: "#1a1a2e",
    border: "none",
    borderRadius: 6,
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 14,
  },
  placeholder: { color: "#888", fontSize: 14, marginTop: 12, lineHeight: 1.6 },
  timelineWrap: {
    backgroundColor: "#0F1626",
    padding: "18px 28px 56px",
    borderTop: "1px solid #2C3E50",
  },
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 14,
    fontSize: 12,
    color: "#AAB7C4",
  },
  lifespan: { letterSpacing: 1 },
  track: {
    position: "relative",
    height: 24,
    backgroundColor: "#1F2A40",
    borderRadius: 4,
  },
  stageBand: {
    position: "absolute",
    top: 0,
    height: "100%",
    transition: "opacity 0.25s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stageLabel: {
    color: "#FFF",
    fontSize: 11,
    textShadow: "0 1px 2px rgba(0,0,0,0.6)",
    pointerEvents: "none",
    whiteSpace: "nowrap",
  },
  tickWrap: {
    position: "absolute",
    top: "50%",
  },
  tick: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: "2px solid #FFF",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  tickLabel: {
    position: "absolute",
    top: 14,
    left: 0,
    transform: "translateX(-50%)",
    textAlign: "center",
    whiteSpace: "nowrap",
    lineHeight: 1.2,
    transition: "color 0.2s ease",
    pointerEvents: "none",
  },
  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFF",
    fontSize: 18,
    backgroundColor: "#1a1a2e",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
  },
};

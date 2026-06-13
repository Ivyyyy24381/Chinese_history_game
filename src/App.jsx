import { useState, useEffect, useMemo, useRef } from "react";
import CharacterSelect from "./components/CharacterSelect";
import GameMap from "./components/GameMap";
import Timeline from "./components/Timeline";
import ScoreBar from "./components/ScoreBar";
import EventPanel from "./components/EventPanel";
import QuizPanel from "./components/QuizPanel";
import ScenePlayer from "./components/ScenePlayer";
import SceneEditor from "./components/SceneEditor";
import TimelineEditor from "./components/TimelineEditor";
import CharacterRecap from "./components/CharacterRecap";

// Achievements persist across sessions.
const ACH_KEY = "lishiyou_achievements";
const loadAchievements = () => {
  try { return JSON.parse(localStorage.getItem(ACH_KEY)) || {}; } catch { return {}; }
};
// Achievement title per character biography.
const ACHIEVEMENT_TITLES = { dufu: "诗圣之路", libai: "诗仙之路", sushi: "东坡之路" };

// Static character data
const CHARACTERS = [
  {
    id: "dufu",
    name: "杜甫",
    title: "诗圣",
    years: "712—770",
    dynasty: "唐",
    description: "唐代最伟大的现实主义诗人，与李白并称「李杜」",
    avatar: "🖊",
    portrait: "/assets/characters/dufu/portrait.png",
    color: "#4A90A4",
  },
  {
    id: "libai",
    name: "李白",
    title: "诗仙",
    years: "701—762",
    dynasty: "唐",
    description: "即将推出...",
    avatar: "🍷",
    portrait: null,
    color: "#C0392B",
    locked: true,
  },
  {
    id: "sushi",
    name: "苏轼",
    title: "东坡居士",
    years: "1037—1101",
    dynasty: "宋",
    description: "即将推出...",
    avatar: "📜",
    portrait: null,
    color: "#8E44AD",
    locked: true,
  },
];

export default function App() {
  const [screen, setScreen] = useState("select");
  const [character, setCharacter] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  // Current year is the source of truth for slider position.
  const [currentYear, setCurrentYear] = useState(null);
  // Highest year the player has unlocked (set when an event scene is completed).
  const [progressYear, setProgressYear] = useState(null);
  const [showEvent, setShowEvent] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [globalScore, setGlobalScore] = useState(0);
  const [showScene, setShowScene] = useState(false);
  const [sceneData, setSceneData] = useState(null);
  const [pendingEvent, setPendingEvent] = useState(null);
  // Achievements + completion flow
  const [achievements, setAchievements] = useState(loadAchievements);
  const [showCongrats, setShowCongrats] = useState(false);
  const [recapData, setRecapData] = useState(null); // {character, stages}
  // Background music — one looping track per stage (period). Missing files
  // fail silently. User toggle persists.
  const [musicOn, setMusicOn] = useState(() => {
    try { return localStorage.getItem("lishiyou_music") !== "off"; } catch { return true; }
  });
  const audioRef = useRef(null);

  // Load timeline data when character is selected
  useEffect(() => {
    if (character && !timelineData) {
      import("./data/dufu/timeline.json")
        .then((module) => {
          const data = module.default;
          setTimelineData(data);
          const firstEvent = data.stages[0]?.events?.[0];
          const firstYear = firstEvent?.year ?? data.stages[0].yearStart;
          setCurrentYear(firstYear);
          setProgressYear(firstYear);
        })
        .catch(() => {
          console.error("Failed to load timeline data");
        });
    }
  }, [character, timelineData]);

  // BGM: play /assets/audio/bgm/<stageId>.mp3 for the current stage.
  // onerror → silently stop (file not provided yet).
  useEffect(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.loop = true;
      a.volume = 0.35;
      a.onerror = () => { /* track missing — skip silently */ };
      audioRef.current = a;
    }
    const a = audioRef.current;
    const stageId = screen === "game" && currentYear != null && timelineData
      ? (timelineData.stages.find((s) => currentYear >= s.yearStart && currentYear <= s.yearEnd)
         || timelineData.stages[timelineData.stages.length - 1])?.id
      : null;
    if (!musicOn || !stageId) { a.pause(); return; }
    const src = `/assets/audio/bgm/${stageId}.mp3`;
    if (!a.src.endsWith(src)) a.src = src;
    a.play().catch(() => { /* autoplay blocked or missing file — ignore */ });
  }, [screen, currentYear, timelineData, musicOn]);

  // Pause on unmount
  useEffect(() => () => { audioRef.current && audioRef.current.pause(); }, []);

  const toggleMusic = () => {
    setMusicOn((on) => {
      const next = !on;
      try { localStorage.setItem("lishiyou_music", next ? "on" : "off"); } catch { /* ignore */ }
      return next;
    });
  };

  // Flatten events from all stages with stage references attached.
  const allEvents = useMemo(() => {
    if (!timelineData) return [];
    return timelineData.stages.flatMap((stage) =>
      (stage.events || []).map((ev) => ({ ...ev, stageId: stage.id, stageColor: stage.color, stagePeriod: stage.period }))
    );
  }, [timelineData]);

  // Derive current stage and current event from currentYear.
  const currentStage = useMemo(() => {
    if (!timelineData || currentYear == null) return null;
    return (
      timelineData.stages.find((s) => currentYear >= s.yearStart && currentYear <= s.yearEnd) ||
      timelineData.stages[timelineData.stages.length - 1]
    );
  }, [timelineData, currentYear]);

  const currentEvent = useMemo(() => {
    if (!allEvents.length || currentYear == null) return null;
    // Pick the event with the closest year to currentYear (prefer the most recent <= currentYear).
    const ats = allEvents.filter((e) => e.year <= currentYear);
    if (ats.length) return ats[ats.length - 1];
    return allEvents[0];
  }, [allEvents, currentYear]);

  const handleCharacterSelect = (char) => {
    setCharacter(char);
    setScreen("game");
  };

  const handleEventClick = (event) => {
    setCurrentYear(event.year);
  };

  const handleQuizComplete = (passed) => {
    if (passed && currentEvent && (progressYear == null || currentEvent.year > progressYear)) {
      setProgressYear(currentEvent.year);
    }
  };

  const handleExplore = async () => {
    if (!currentEvent || !currentEvent.hasScene) return;
    try {
      const sceneModule = await import(`./data/dufu/events/${currentEvent.id}/event.json`);
      const data = sceneModule.default;
      if (data.type === "interactive" && data.phases) {
        setSceneData(data);
        setShowScene(true);
      } else {
        setPendingEvent(currentEvent);
        setShowEvent(true);
      }
    } catch {
      setPendingEvent(currentEvent);
      setShowEvent(true);
    }
  };

  const unlockAchievement = (charId) => {
    setAchievements((prev) => {
      if (prev[charId]) return prev; // already earned
      const next = { ...prev, [charId]: { date: new Date().toISOString() } };
      try { localStorage.setItem(ACH_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleSceneComplete = () => {
    setShowScene(false);
    setSceneData(null);
    if (currentEvent && (progressYear == null || currentEvent.year > progressYear)) {
      setProgressYear(currentEvent.year);
    }
    // Completing the final event of the timeline = biography complete.
    const lastEvent = allEvents[allEvents.length - 1];
    if (character && lastEvent && currentEvent && currentEvent.id === lastEvent.id) {
      unlockAchievement(character.id);
      setShowCongrats(true);
    }
  };

  // Open the recap (from congrats dialog or from home page badge).
  const openRecap = async () => {
    if (timelineData) {
      setRecapData({ character: timelineData.character, stages: timelineData.stages });
      return;
    }
    try {
      const mod = await import("./data/dufu/timeline.json");
      setRecapData({ character: mod.default.character, stages: mod.default.stages });
    } catch { /* ignore */ }
  };

  // Editor mode via ?editor=true (entry: timeline editor; drill into scene editor per event)
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("editor") === "true") {
    return <EditorShell />;
  }

  if (screen === "select") {
    return (
      <>
        <CharacterSelect
          characters={CHARACTERS}
          achievements={achievements}
          achievementTitles={ACHIEVEMENT_TITLES}
          onSelect={handleCharacterSelect}
          onRecap={openRecap}
        />
        {recapData && (
          <CharacterRecap
            character={recapData.character}
            stages={recapData.stages}
            onClose={() => setRecapData(null)}
          />
        )}
      </>
    );
  }

  if (!timelineData || currentYear == null || !currentStage || !currentEvent) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Noto Serif SC', 'Songti SC', serif",
          fontSize: 18,
        }}
      >
        {"加载中..."}
      </div>
    );
  }

  const stages = timelineData.stages;
  const totalEvents = allEvents.length;
  const reachedEvents = allEvents.filter((e) => e.year <= (progressYear ?? -Infinity)).length;

  return (
    <div style={styles.gameContainer}>
      <ScoreBar
        character={timelineData.character}
        progress={reachedEvents}
        totalStages={totalEvents}
      />
      <div style={styles.mapContainer}>
        <GameMap
          allEvents={allEvents}
          currentYear={currentYear}
          currentEventId={currentEvent.id}
          progressYear={progressYear}
          onEventClick={handleEventClick}
        />
        <div style={{ ...styles.floatingInfo, borderLeftColor: currentStage.color }}>
          <h3 style={{ margin: "0 0 4px", color: currentStage.color }}>
            {currentEvent.name}
          </h3>
          <div style={styles.eventMeta}>
            {`${currentEvent.year} 年 · ${currentStage.period}`}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#666" }}>
            {currentEvent.summary || currentStage.summary}
          </p>
          <button
            style={{
              ...styles.exploreBtn,
              backgroundColor: currentStage.color,
              opacity: currentEvent.hasScene ? 1 : 0.6,
              cursor: currentEvent.hasScene ? "pointer" : "not-allowed",
            }}
            onClick={handleExplore}
            disabled={!currentEvent.hasScene}
          >
            {currentEvent.hasScene ? "📖 探索此事件" : "📖 暂无场景"}
          </button>
        </div>
      </div>
      <Timeline
        stages={stages}
        events={allEvents}
        currentYear={currentYear}
        currentEventId={currentEvent.id}
        progressYear={progressYear}
        onYearChange={setCurrentYear}
        onEventSelect={(ev) => setCurrentYear(ev.year)}
      />
      <button
        style={styles.musicBtn}
        title={musicOn ? "关闭背景音乐" : "开启背景音乐"}
        onClick={toggleMusic}
      >
        {musicOn ? "🎵" : "🔇"}
      </button>
      <button
        style={styles.backBtn}
        onClick={() => {
          setScreen("select");
          setCharacter(null);
          setTimelineData(null);
          setCurrentYear(null);
          setProgressYear(null);
        }}
      >
        {"← 返回选择"}
      </button>
      {showEvent && !showQuiz && (
        <EventPanel
          stage={{ ...currentStage, ...currentEvent, location: currentEvent.location }}
          onStartQuiz={() => {
            setShowEvent(false);
            setShowQuiz(true);
          }}
          onClose={() => {
            setShowEvent(false);
            setPendingEvent(null);
          }}
        />
      )}
      {showQuiz && (
        <QuizPanel
          stage={{ ...currentStage, ...currentEvent, quizFile: currentEvent.quizFile }}
          onComplete={handleQuizComplete}
          onClose={() => setShowQuiz(false)}
        />
      )}
      {showScene && sceneData && (
        <ScenePlayer
          sceneData={sceneData}
          globalScore={globalScore}
          onScoreChange={setGlobalScore}
          onComplete={handleSceneComplete}
        />
      )}
      {showCongrats && (
        <div style={styles.congratsOverlay}>
          <div style={styles.congratsCard}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>{"🏆"}</div>
            <h2 style={styles.congratsTitle}>{"历史成就达成"}</h2>
            <div style={styles.congratsBadge}>
              {ACHIEVEMENT_TITLES[character?.id] || "人物传完成"}
            </div>
            <p style={styles.congratsText}>
              {`你走完了${character?.name || ""}的一生——从裘马轻狂的少年，到湘江舟中的诗圣。`}
            </p>
            <p style={styles.congratsUnlock}>{"✨ 已解锁：人物回顾"}</p>
            <p style={styles.congratsNext}>{"下一位人物：李白（即将推出，敬请期待）"}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
              <button
                style={{ ...styles.congratsBtn, backgroundColor: "#8B7355", color: "#FFF" }}
                onClick={() => { setShowCongrats(false); openRecap(); }}>
                {"📜 查看人物回顾"}
              </button>
              <button
                style={styles.congratsBtn}
                onClick={() => {
                  setShowCongrats(false);
                  setScreen("select");
                  setCharacter(null);
                  setTimelineData(null);
                  setCurrentYear(null);
                  setProgressYear(null);
                }}>
                {"返回主页"}
              </button>
              <button style={styles.congratsBtn} onClick={() => setShowCongrats(false)}>
                {"继续游览"}
              </button>
            </div>
          </div>
        </div>
      )}
      {recapData && (
        <CharacterRecap
          character={recapData.character}
          stages={recapData.stages}
          onClose={() => setRecapData(null)}
        />
      )}
    </div>
  );
}

/**
 * EditorShell — entry point for ?editor=true.
 * Starts on the timeline editor; lets the user drill into per-event scene editor.
 */
function EditorShell() {
  const [editingEventId, setEditingEventId] = useState(null);
  if (editingEventId) {
    return (
      <SceneEditor
        initialEventId={editingEventId}
        onExit={() => setEditingEventId(null)}
      />
    );
  }
  return <TimelineEditor onEditEvent={setEditingEventId} />;
}

const styles = {
  gameContainer: {
    minHeight: "100vh",
    backgroundColor: "#F5F0E8",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 20px",
    minHeight: 400,
  },
  floatingInfo: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 16,
    width: 240,
    borderLeft: "4px solid",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  eventMeta: {
    fontSize: 11,
    color: "#999",
    letterSpacing: 1,
  },
  exploreBtn: {
    marginTop: 12,
    width: "100%",
    padding: "8px 12px",
    border: "none",
    borderRadius: 4,
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  musicBtn: {
    position: "fixed",
    bottom: 20,
    right: 20,
    width: 44, height: 44,
    backgroundColor: "#FFF",
    border: "1px solid #DDD",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 18,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    zIndex: 60,
  },
  congratsOverlay: {
    position: "fixed", inset: 0, zIndex: 350,
    backgroundColor: "rgba(12,10,8,0.82)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  congratsCard: {
    backgroundColor: "#F5EFE3", borderRadius: 14,
    padding: "36px 48px", maxWidth: 560, textAlign: "center",
    border: "2px solid #C9A86A",
    boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
  },
  congratsTitle: { margin: 0, fontSize: 24, color: "#3B2510", letterSpacing: 4 },
  congratsBadge: {
    display: "inline-block", margin: "12px 0",
    padding: "6px 22px", backgroundColor: "#3B2510", color: "#F4D03F",
    borderRadius: 20, fontSize: 16, letterSpacing: 3,
  },
  congratsText: { color: "#555", fontSize: 14, lineHeight: 1.8, margin: "8px 0" },
  congratsUnlock: { color: "#1B5E20", fontSize: 14, fontWeight: "bold", margin: "10px 0 2px" },
  congratsNext: { color: "#8B7355", fontSize: 13, margin: "4px 0 0" },
  congratsBtn: {
    padding: "10px 18px", border: "1px solid #C9B08A", borderRadius: 8,
    backgroundColor: "#FFF", cursor: "pointer", fontSize: 14, fontFamily: "inherit",
  },
  backBtn: {
    position: "fixed",
    bottom: 20,
    left: 20,
    padding: "10px 16px",
    backgroundColor: "#FFF",
    border: "1px solid #DDD",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "inherit",
    transition: "all 0.2s",
  },
};

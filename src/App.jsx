import { useState, useEffect, useMemo } from "react";
import CharacterSelect from "./components/CharacterSelect";
import GameMap from "./components/GameMap";
import Timeline from "./components/Timeline";
import ScoreBar from "./components/ScoreBar";
import EventPanel from "./components/EventPanel";
import QuizPanel from "./components/QuizPanel";
import ScenePlayer from "./components/ScenePlayer";
import SceneEditor from "./components/SceneEditor";
import TimelineEditor from "./components/TimelineEditor";

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

  const handleSceneComplete = () => {
    setShowScene(false);
    setSceneData(null);
    if (currentEvent && (progressYear == null || currentEvent.year > progressYear)) {
      setProgressYear(currentEvent.year);
    }
  };

  // Editor mode via ?editor=true (entry: timeline editor; drill into scene editor per event)
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("editor") === "true") {
    return <EditorShell />;
  }

  if (screen === "select") {
    return <CharacterSelect characters={CHARACTERS} onSelect={handleCharacterSelect} />;
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

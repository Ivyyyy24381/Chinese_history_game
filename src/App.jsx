import { useState, useEffect } from "react";
import CharacterSelect from "./components/CharacterSelect";
import GameMap from "./components/GameMap";
import Timeline from "./components/Timeline";
import ScoreBar from "./components/ScoreBar";
import EventPanel from "./components/EventPanel";
import QuizPanel from "./components/QuizPanel";
import ScenePlayer from "./components/ScenePlayer";

// Static character data
const CHARACTERS = [
  {
    id: "dufu",
    name: "\u675c\u752b",
    title: "\u8bd7\u5723",
    years: "712\u2014770",
    dynasty: "\u5510",
    description:
      "\u5510\u4ee3\u6700\u4f1f\u5927\u7684\u73b0\u5b9e\u4e3b\u4e49\u8bd7\u4eba\uff0c\u4e0e\u674e\u767d\u5e76\u79f0\u300c\u674e\u675c\u300d",
    avatar: "\u{1F58A}",
    color: "#4A90A4",
  },
  {
    id: "libai",
    name: "\u674e\u767d",
    title: "\u8bd7\u4ed9",
    years: "701\u2014762",
    dynasty: "\u5510",
    description: "\u5373\u5c06\u63a8\u51fa...",
    avatar: "\u{1F377}",
    color: "#C0392B",
    locked: true,
  },
  {
    id: "sushi",
    name: "\u82cf\u8f7c",
    title: "\u4e1c\u5761\u5c45\u58eb",
    years: "1037\u20141101",
    dynasty: "\u5b8b",
    description: "\u5373\u5c06\u63a8\u51fa...",
    avatar: "\u{1F4DC}",
    color: "#8E44AD",
    locked: true,
  },
];

export default function App() {
  const [screen, setScreen] = useState("select");
  const [character, setCharacter] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showEvent, setShowEvent] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [globalScore, setGlobalScore] = useState(0);
  const [showScene, setShowScene] = useState(false);
  const [sceneData, setSceneData] = useState(null);

  // Load timeline data when character is selected
  useEffect(() => {
    if (character && !timelineData) {
      import("./data/dufu/timeline.json")
        .then((module) => {
          setTimelineData(module.default);
        })
        .catch(() => {
          console.error("Failed to load timeline data");
        });
    }
  }, [character, timelineData]);

  const handleCharacterSelect = (char) => {
    setCharacter(char);
    setScreen("game");
  };

  const handleLocationClick = (stageId) => {
    const idx = timelineData.stages.findIndex((s) => s.id === stageId);
    if (idx !== -1) {
      setCurrentIndex(idx);
    }
  };

  const handleQuizComplete = (passed) => {
    if (passed && progress === currentIndex) {
      setProgress(currentIndex + 1);
    }
  };

  const handleExplore = async (stage) => {
    try {
      const sceneModule = await import(`./data/dufu/scenes/${stage.sceneFile}`);
      const data = sceneModule.default;
      if (data.type === "interactive" && data.phases) {
        setSceneData(data);
        setShowScene(true);
      } else {
        setShowEvent(true);
      }
    } catch {
      setShowEvent(true);
    }
  };

  const handleSceneComplete = () => {
    setShowScene(false);
    setSceneData(null);
    if (progress === currentIndex) {
      setProgress(currentIndex + 1);
    }
  };

  if (screen === "select") {
    return <CharacterSelect characters={CHARACTERS} onSelect={handleCharacterSelect} />;
  }

  if (!timelineData) {
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
        {"\u52a0\u8f7d\u4e2d..."}
      </div>
    );
  }

  const stages = timelineData.stages;
  const currentStage = stages[currentIndex];

  return (
    <div style={styles.gameContainer}>
      <ScoreBar
        character={timelineData.character}
        progress={progress}
        totalStages={stages.length}
      />
      <div style={styles.mapContainer}>
        <GameMap
          currentStage={currentStage}
          stages={stages}
          onLocationClick={handleLocationClick}
        />
        <div style={{ ...styles.floatingInfo, borderLeftColor: currentStage.color }}>
          <h3 style={{ margin: "0 0 4px", color: currentStage.color }}>
            {currentStage.period}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
            {currentStage.summary}
          </p>
          <button
            style={{
              ...styles.exploreBtn,
              backgroundColor: currentStage.color,
            }}
            onClick={() => handleExplore(currentStage)}
          >
            {"\u{1F4D6} \u63a2\u7d22\u6b64\u65f6\u671f"}
          </button>
        </div>
      </div>
      <Timeline
        stages={stages}
        currentIndex={currentIndex}
        onSelect={setCurrentIndex}
        progress={progress}
      />
      <button
        style={styles.backBtn}
        onClick={() => {
          setScreen("select");
          setCharacter(null);
          setTimelineData(null);
        }}
      >
        {"\u2190 \u8fd4\u56de\u9009\u62e9"}
      </button>
      {showEvent && !showQuiz && (
        <EventPanel
          stage={currentStage}
          onStartQuiz={() => {
            setShowEvent(false);
            setShowQuiz(true);
          }}
          onClose={() => setShowEvent(false)}
        />
      )}
      {showQuiz && (
        <QuizPanel
          stage={currentStage}
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
    width: 220,
    borderLeft: "4px solid",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
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

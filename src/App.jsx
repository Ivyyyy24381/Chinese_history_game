import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import AuthPanel from "./components/AuthPanel";
import Leaderboard from "./components/Leaderboard";
import { getCurrentUser, restoreSession, logout, submitScore, logVisit } from "./services/backend";
import { asset } from "./utils/asset";
import { CHARACTERS, ACHIEVEMENT_TITLES } from "./data/characters";

// Achievements persist across sessions.
const ACH_KEY = "lishiyou_achievements";
const loadAchievements = () => {
  try { return JSON.parse(localStorage.getItem(ACH_KEY)) || {}; } catch { return {}; }
};
// 本局进度（积分+位置）持久化：刷新/返回主页都不丢，走完一生结算后清除。
const RUN_KEY = "lishiyou_run";
const loadRun = () => {
  try { return JSON.parse(localStorage.getItem(RUN_KEY)); } catch { return null; }
};
const clearRunStorage = () => { try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ } };
// 主人公花名册与成就名的单一事实来源在 src/data/characters.js —— 新增人物只改那个文件。
//
// 剧本数据按人物目录懒加载。这里用 import.meta.glob 而不是写死 "./data/dufu/…"：
// 某个人物的 src/data/<dataDir>/ 还没建好时构建不会报错，主页照常显示，
// 真进游戏时再兜底成「建设中」提示。但丁线正在另一台机器上写，就靠这个解耦。
const TIMELINE_MODULES = import.meta.glob("./data/*/timeline.json");
const EVENT_MODULES = import.meta.glob("./data/*/events/*/event.json");
const dataDirOf = (char) => (char && (char.dataDir || char.id)) || "dufu";
const timelineLoader = (dir) => TIMELINE_MODULES[`./data/${dir}/timeline.json`] || null;
const eventLoader = (dir, eventId) =>
  EVENT_MODULES[`./data/${dir}/events/${eventId}/event.json`] || null;

export default function App() {
  const [screen, setScreen] = useState("select");
  const [character, setCharacter] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  // 选中的人物还没有剧本数据（目录未建 / 加载失败）
  const [dataMissing, setDataMissing] = useState(false);
  // Current year is the source of truth for slider position.
  const [currentYear, setCurrentYear] = useState(null);
  // Highest year the player has unlocked (set when an event scene is completed).
  const [progressYear, setProgressYear] = useState(null);
  const [showEvent, setShowEvent] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  // 单局积分：runScore 为本局总分；scoredKeys 保证每一关/每道题单局只计一次分。
  const [runScore, setRunScore] = useState(0);
  const scoredKeysRef = useRef(new Set());
  // ref 与 state 同步累加：提交排行榜时读 ref，避免最后一题的加分
  // 还没渲染完就结算导致排行榜分数偏少。
  const runScoreRef = useRef(0);
  const awardScore = useCallback((key, points) => {
    if (scoredKeysRef.current.has(key)) return; // 单次游玩每关不重复计分
    scoredKeysRef.current.add(key);
    runScoreRef.current += points;
    setRunScore((s) => s + points);
  }, []);
  const resetRun = useCallback(() => {
    scoredKeysRef.current = new Set();
    runScoreRef.current = 0;
    setRunScore(0);
    scoreSubmittedRef.current = false;
    clearRunStorage();
    setSavedRun(null);
  }, []);
  // 断点续玩：选人页展示"继续上局"，进游戏时恢复
  const [savedRun, setSavedRun] = useState(loadRun);
  const pendingResumeRef = useRef(null);
  // 账号 + 排行榜
  const [user, setUser] = useState(getCurrentUser);
  const [showAuth, setShowAuth] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [boardHighlight, setBoardHighlight] = useState(null); // 结算时高亮本局得分
  const scoreSubmittedRef = useRef(false);
  useEffect(() => {
    restoreSession().then(setUser).catch(() => {});
    logVisit(); // 访问统计：无论注册与否都记一条
  }, []);
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
    if (!character || timelineData) return;
    const load = timelineLoader(dataDirOf(character));
    if (!load) {
      // 这个人物的剧本目录还没建（例如但丁线还在另一台机器上写）→ 走「建设中」页
      setDataMissing(true);
      return;
    }
    setDataMissing(false);
    load()
      .then((module) => {
        const data = module.default;
        setTimelineData(data);
        const resume = pendingResumeRef.current;
        pendingResumeRef.current = null;
        if (resume) {
          // 继续上局：恢复到上次的年份和进度
          setCurrentYear(resume.currentYear);
          setProgressYear(resume.progressYear);
        } else {
          const firstEvent = data.stages[0]?.events?.[0];
          const firstYear = firstEvent?.year ?? data.stages[0].yearStart;
          setCurrentYear(firstYear);
          setProgressYear(firstYear);
        }
      })
      .catch(() => {
        console.error("Failed to load timeline data");
        setDataMissing(true);
      });
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
    const src = asset(`/assets/${character?.id || "dufu"}/bgm/${stageId}.mp3`);
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
    setDataMissing(false);
    setScreen("game");
    const saved = loadRun();
    if (saved && saved.characterId === char.id) {
      // 继续上局：恢复积分和去重记录
      setRunScore(saved.runScore || 0);
      runScoreRef.current = saved.runScore || 0;
      scoredKeysRef.current = new Set(saved.scoredKeys || []);
      scoreSubmittedRef.current = false;
      pendingResumeRef.current = saved;
    } else {
      resetRun(); // 新的一局，从 0 分开始
    }
  };

  // 返回选人页：进度已自动保存，可随时「继续上局」
  const backToHome = useCallback(() => {
    setScreen("select");
    setCharacter(null);
    setTimelineData(null);
    setDataMissing(false);
    setCurrentYear(null);
    setProgressYear(null);
    setSavedRun(loadRun());
  }, []);

  // 重新开始（清掉存档，从头玩）
  const handleRestart = (char) => {
    resetRun();
    setCharacter(char);
    setScreen("game");
  };

  // 自动保存本局进度（积分、去重、年份）
  useEffect(() => {
    if (screen !== "game" || !character || currentYear == null || progressYear == null) return;
    try {
      localStorage.setItem(RUN_KEY, JSON.stringify({
        characterId: character.id,
        runScore,
        scoredKeys: [...scoredKeysRef.current],
        currentYear,
        progressYear,
        updated: Date.now(),
      }));
    } catch { /* ignore */ }
  }, [screen, character, runScore, currentYear, progressYear]);

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
    const load = eventLoader(dataDirOf(character), currentEvent.id);
    if (!load) {
      // 该事件没有独立场景文件 → 旧版图文+答题面板
      setPendingEvent(currentEvent);
      setShowEvent(true);
      return;
    }
    try {
      let sceneModule;
      try {
        sceneModule = await load();
      } catch {
        sceneModule = await load(); // 弱网自动重试一次
      }
      const data = sceneModule.default;
      if (data.type === "interactive" && data.phases) {
        setSceneData(data);
        setShowScene(true);
      } else {
        // 该事件确实没有互动场景 → 旧版图文+答题面板
        setPendingEvent(currentEvent);
        setShowEvent(true);
      }
    } catch {
      // 网络加载失败：明确提示，而不是错误地掉进旧版面板
      window.alert("场景加载失败，可能是网络不稳定，请再点一次「探索此事件」。");
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
    // 完成一个事件后，地图自动前进并聚焦到下一个事件
    const idx = allEvents.findIndex((e) => e.id === currentEvent?.id);
    const nextEvent = idx >= 0 ? allEvents[idx + 1] : null;
    if (nextEvent) {
      setTimeout(() => setCurrentYear(nextEvent.year), 800);
    }
    // Completing the final event of the timeline = biography complete.
    const lastEvent = allEvents[allEvents.length - 1];
    if (character && lastEvent && currentEvent && currentEvent.id === lastEvent.id) {
      unlockAchievement(character.id);
      setShowCongrats(true);
      // 一局结束：提交总分进排行榜（每局只提交一次），存档清除
      if (!scoreSubmittedRef.current) {
        scoreSubmittedRef.current = true;
        submitScore({ score: runScoreRef.current, characterId: character.id }).catch(() => {});
      }
      clearRunStorage();
      setSavedRun(null);
    }
  };

  // Open the recap (from congrats dialog, or from the home page where only an id is known).
  const openRecap = async (charId) => {
    const target = charId ? CHARACTERS.find((c) => c.id === charId) : character;
    if (timelineData && (!charId || charId === character?.id)) {
      setRecapData({ character: timelineData.character, stages: timelineData.stages });
      return;
    }
    try {
      const load = timelineLoader(dataDirOf(target));
      if (!load) return;
      const mod = await load();
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
        <OrientationHint />
        <CharacterSelect
          characters={CHARACTERS}
          achievements={achievements}
          achievementTitles={ACHIEVEMENT_TITLES}
          savedRun={savedRun}
          onSelect={handleCharacterSelect}
          onRestart={handleRestart}
          onRecap={openRecap}
        />
        {/* 账号 + 排行榜（右上角） */}
        <div style={styles.userCorner}>
          {user ? (
            <>
              <span style={styles.userChip}>{"👤 " + user.nickname}</span>
              <button
                style={styles.cornerBtn}
                onClick={() => { logout().then(() => setUser(null)); }}
              >
                {"退出"}
              </button>
            </>
          ) : (
            <button style={styles.cornerBtn} onClick={() => setShowAuth(true)}>
              {"登录 / 注册"}
            </button>
          )}
          <button
            style={styles.cornerBtn}
            onClick={() => { setBoardHighlight(null); setShowBoard(true); }}
          >
            {"🏆 排行榜"}
          </button>
        </div>
        {showAuth && (
          <AuthPanel
            onAuthed={(u) => { setUser(u); setShowAuth(false); }}
            onClose={() => setShowAuth(false)}
          />
        )}
        {showBoard && (
          <Leaderboard highlightScore={boardHighlight} onClose={() => setShowBoard(false)} />
        )}
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

  // 剧本还没就位：给个体面的占位页而不是永远转圈
  if (dataMissing) {
    return (
      <div style={styles.placeholderScreen}>
        <p style={styles.placeholderTitle}>
          {`${character?.name || "这条故事线"}的旅程正在建设中`}
        </p>
        <p style={styles.placeholderHint}>{"剧本与地图还在绘制，敬请期待。"}</p>
        <button style={styles.placeholderBtn} onClick={backToHome}>
          {"← 返回主页"}
        </button>
      </div>
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
          fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
          fontSize: "clamp(14.4px, 1.25vw, 20.7px)",
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
      <OrientationHint />
      <ScoreBar
        character={timelineData.character}
        progress={reachedEvents}
        totalStages={totalEvents}
        score={runScore}
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
          <p style={{ margin: "8px 0 0", fontSize: "clamp(10.4px, 0.903vw, 14.9px)", color: "#666" }}>
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
        onClick={backToHome}
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
          awardScore={awardScore}
          onComplete={handleQuizComplete}
          onClose={() => setShowQuiz(false)}
        />
      )}
      {showScene && sceneData && (
        <>
          <ScenePlayer
            sceneData={sceneData}
            eventId={currentEvent.id}
            awardScore={awardScore}
            onComplete={handleSceneComplete}
          />
          {/* 场景内随时退出回地图（已得积分保留，本场景阶段进度不保存）。
              返回选择在地图页左下角，场景里不重复放。 */}
          <button
            style={styles.sceneExitBtn}
            title="退出场景，返回地图"
            onClick={() => {
              if (window.confirm("退出本场景返回地图？已获得的积分会保留，但本场景要从头再玩。")) {
                setShowScene(false);
                setSceneData(null);
              }
            }}
          >
            {"✕"}
          </button>
        </>
      )}
      {showCongrats && (
        <div style={styles.congratsOverlay}>
          <div style={styles.congratsCard}>
            <div style={{ fontSize: "clamp(44.8px, 3.889vw, 64.4px)", marginBottom: 8 }}>{"🏆"}</div>
            <h2 style={styles.congratsTitle}>{"历史成就达成"}</h2>
            <div style={styles.congratsBadge}>
              {ACHIEVEMENT_TITLES[character?.id] || "人物传完成"}
            </div>
            <p style={styles.congratsText}>
              {`你走完了${character?.name || ""}的一生——从裘马轻狂的少年，到湘江舟中的诗圣。`}
            </p>
            <div style={styles.congratsScore}>
              {"本局总分 "}<strong style={{ fontSize: "clamp(20.8px, 1.806vw, 29.9px)" }}>{runScore}</strong>{" 分"}
              {user ? `（${user.nickname}）` : "（未登录，仅本次显示）"}
            </div>
            <p style={styles.congratsUnlock}>{"✨ 已解锁：人物回顾"}</p>
            <p style={styles.congratsNext}>{"下一位人物：李白（即将推出，敬请期待）"}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
              <button
                style={{ ...styles.congratsBtn, backgroundColor: "#B8860B", color: "#FFF" }}
                onClick={() => { setBoardHighlight(runScoreRef.current); setShowBoard(true); }}>
                {"🏆 查看排行榜"}
              </button>
              <button
                style={{ ...styles.congratsBtn, backgroundColor: "#8B7355", color: "#FFF" }}
                onClick={() => { setShowCongrats(false); openRecap(); }}>
                {"📜 查看人物回顾"}
              </button>
              <button
                style={styles.congratsBtn}
                onClick={() => { setShowCongrats(false); backToHome(); }}>
                {"返回主页"}
              </button>
              <button style={styles.congratsBtn} onClick={() => setShowCongrats(false)}>
                {"继续游览"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showBoard && (
        <Leaderboard highlightScore={boardHighlight} onClose={() => setShowBoard(false)} />
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
 * OrientationHint — 触屏设备竖屏时提示横屏游玩（旋转后自动消失，可手动关闭）。
 */
function OrientationHint() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait) and (pointer: coarse)");
    const update = () => setShow(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);
  if (!show || dismissed) return null;
  return (
    <div style={orientStyles.overlay}>
      <div style={{ fontSize: "clamp(51.2px, 4.444vw, 73.6px)", animation: "rotateHint 1.6s ease-in-out infinite" }}>{"📱"}</div>
      <div style={orientStyles.text}>{"请将手机横过来游玩"}</div>
      <div style={orientStyles.sub}>{"地图与场景为横屏设计，横屏体验最佳"}</div>
      <button style={orientStyles.dismissBtn} onClick={() => setDismissed(true)}>
        {"仍要竖屏继续"}
      </button>
    </div>
  );
}

const orientStyles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 900,
    backgroundColor: "rgba(20,14,8,0.92)",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 14,
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
  },
  text: { color: "#F5E6D3", fontSize: "clamp(17.6px, 1.528vw, 25.3px)", letterSpacing: 4 },
  sub: { color: "#B8A88C", fontSize: "clamp(11.2px, 0.972vw, 16.1px)" },
  dismissBtn: {
    marginTop: 10, padding: "9px 22px", borderRadius: 18,
    border: "1px solid #8B7355", backgroundColor: "transparent",
    color: "#C9B08A", fontSize: "clamp(11.2px, 0.972vw, 16.1px)", fontFamily: "inherit", cursor: "pointer",
  },
};

if (typeof document !== "undefined" && !document.getElementById("rotate-hint-keyframes")) {
  const style = document.createElement("style");
  style.id = "rotate-hint-keyframes";
  style.textContent = `
    @keyframes rotateHint {
      0%, 20% { transform: rotate(0deg); }
      60%, 100% { transform: rotate(90deg); }
    }
  `;
  document.head.appendChild(style);
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
  placeholderScreen: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "#F5F0E8",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
  },
  placeholderTitle: {
    color: "#5A4A38",
    fontSize: "clamp(18px, 2.4vw, 28px)",
    letterSpacing: 4,
    margin: 0,
  },
  placeholderHint: {
    color: "#9A8B72",
    fontSize: "clamp(12px, 1.2vw, 16px)",
    letterSpacing: 2,
    margin: 0,
  },
  placeholderBtn: {
    marginTop: 12,
    padding: "9px 24px",
    border: "1px solid #C9A86A",
    borderRadius: 22,
    backgroundColor: "rgba(252,248,238,0.92)",
    color: "#7A5C2E",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "clamp(12px, 1.2vw, 15px)",
    letterSpacing: 2,
  },
  gameContainer: {
    minHeight: "100vh",
    backgroundColor: "#F5F0E8",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "center",
    padding: 0,
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
    fontSize: "clamp(8.8px, 0.764vw, 12.6px)",
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
    fontSize: "clamp(10.4px, 0.903vw, 14.9px)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  sceneExitBtn: {
    position: "fixed",
    // 左下角，小圆钮不显眼
    left: 14,
    bottom: 14,
    zIndex: 380,
    width: 34,
    height: 34,
    padding: 0,
    backgroundColor: "rgba(20,12,6,0.5)",
    color: "rgba(245,230,211,0.85)",
    border: "1px solid rgba(245,230,211,0.3)",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "clamp(12.0px, 1.042vw, 17.2px)",
    lineHeight: 1,
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
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
    fontSize: "clamp(14.4px, 1.25vw, 20.7px)",
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
  congratsTitle: { margin: 0, fontSize: "clamp(19.2px, 1.667vw, 27.6px)", color: "#3B2510", letterSpacing: 4 },
  congratsScore: {
    margin: "10px auto 4px", padding: "8px 24px", display: "inline-block",
    backgroundColor: "rgba(184,134,11,0.12)", borderRadius: 10,
    color: "#3B2510", fontSize: "clamp(12.0px, 1.042vw, 17.2px)",
  },
  userCorner: {
    position: "fixed", top: 16, right: 20, zIndex: 90,
    display: "flex", alignItems: "center", gap: 8,
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
  },
  userChip: {
    color: "#8A6D3B", fontSize: "clamp(11.2px, 0.972vw, 16.1px)", letterSpacing: 1,
    padding: "6px 14px", borderRadius: 18,
    backgroundColor: "rgba(252,248,238,0.9)",
    border: "1px solid #C9A86A",
    boxShadow: "0 2px 6px rgba(90,70,40,0.12)",
  },
  cornerBtn: {
    padding: "6px 16px", borderRadius: 18, fontSize: "clamp(10.4px, 0.903vw, 14.9px)", fontFamily: "inherit",
    backgroundColor: "rgba(252,248,238,0.9)", color: "#5A4A32",
    border: "1px solid #C9B08A", cursor: "pointer", letterSpacing: 1,
    boxShadow: "0 2px 6px rgba(90,70,40,0.12)",
  },
  congratsBadge: {
    display: "inline-block", margin: "12px 0",
    padding: "6px 22px", backgroundColor: "#3B2510", color: "#F4D03F",
    borderRadius: 20, fontSize: "clamp(12.8px, 1.111vw, 18.4px)", letterSpacing: 3,
  },
  congratsText: { color: "#555", fontSize: "clamp(11.2px, 0.972vw, 16.1px)", lineHeight: 1.8, margin: "8px 0" },
  congratsUnlock: { color: "#1B5E20", fontSize: "clamp(11.2px, 0.972vw, 16.1px)", fontWeight: "bold", margin: "10px 0 2px" },
  congratsNext: { color: "#8B7355", fontSize: "clamp(10.4px, 0.903vw, 14.9px)", margin: "4px 0 0" },
  congratsBtn: {
    padding: "10px 18px", border: "1px solid #C9B08A", borderRadius: 8,
    backgroundColor: "#FFF", cursor: "pointer", fontSize: "clamp(11.2px, 0.972vw, 16.1px)", fontFamily: "inherit",
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
    fontSize: "clamp(11.2px, 0.972vw, 16.1px)",
    fontFamily: "inherit",
    transition: "all 0.2s",
  },
};

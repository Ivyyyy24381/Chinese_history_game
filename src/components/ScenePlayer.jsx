import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { dufuPortraitPath, DUFU_LEGACY_PORTRAIT } from "../data/dufuPoses";
import { dantePortraitPath, DANTE_LEGACY_PORTRAIT } from "../data/dantePoses";
import { Pin } from "./GameMap";
import { nb } from "../utils/cjkText";
import usePrefersReducedMotion from "../utils/usePrefersReducedMotion";
import { asset } from "../utils/asset";
import { POINTS, timedScore } from "../utils/scoring";

// ---- Portrait resolution -----------------------------------------------------
// Convention: shared NPC PNGs live at /assets/<line>/npcs/<speaker_id>.webp.
// No hardcoded map needed — just derive the path from the speaker id.
function npcPortraitPath(speakerId, eventId) {
  const line = parseInt(eventId, 10) < 1000 ? "dufu" : "dante";
  return `/assets/${line}/npcs/${speakerId}.webp`;
}

// Hero portrait resolution lives in src/data/<charId>Poses.js (shared with the
// editor). Priority: line dufu_pose > phase dufu_pose > event dufu_pose >
// stage default derived from the event year. (键名 dufu_pose/dufu_reaction 为
// 引擎历史键名，各故事线沿用。) The legacy hero portrait.webp is remapped to the
// stage default.
const HERO_SPEAKERS = new Set(["dufu", "dante", "self"]);
function heroPortraitPath(pose, year, eventId) {
  const line = parseInt(eventId, 10) < 1000 ? "dufu" : "dante";
  if (line === "dante") return dantePortraitPath(pose === DANTE_LEGACY_PORTRAIT ? null : pose, year);
  return dufuPortraitPath(pose, year);
}
function isLegacyHeroPortrait(p) {
  return p === DUFU_LEGACY_PORTRAIT || p === DANTE_LEGACY_PORTRAIT;
}

// ---- 过场文字的动态进入 ------------------------------------------------------
// 把一段过场文字切成逐句显影的单元：先按 \n 分行；超长的行再按句读切
// （句号/叹号/问号/分号 + 可跟的引号或破折号），保留标点。
function splitRevealUnits(text) {
  if (!text) return [];
  const units = [];
  for (const line of String(text).split(/\n+/)) {
    const t = line.trim();
    if (!t) continue;
    if (t.length <= 26) { units.push(t); continue; }
    const parts = t.match(/[^。！？；]+[。！？；]?[」》]?(?:——)?/g) || [t];
    units.push(...parts.map((p) => p.trim()).filter(Boolean));
  }
  return units;
}

/**
 * RevealLines — 过场文字逐句「墨迹显影」进入（淡入 + 上浮 + 晕开变清晰）。
 * skip=true 或系统减少动效时直接全部显示。onDone 在最后一句显完后触发一次。
 */
function RevealLines({ text, style, skip = false, unitDelay = 620, duration = 900, onDone }) {
  const units = useMemo(() => splitRevealUnits(text), [text]);
  const reduced = usePrefersReducedMotion();
  const instant = skip || reduced;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (instant) { onDoneRef.current && onDoneRef.current(); return; }
    const total = duration + unitDelay * Math.max(0, units.length - 1) + 80;
    const t = setTimeout(() => onDoneRef.current && onDoneRef.current(), total);
    return () => clearTimeout(t);
  }, [text, instant, units.length, unitDelay, duration]);
  return (
    <div style={style}>
      {units.map((u, i) => (
        <div
          key={i}
          style={
            instant
              ? undefined
              : {
                  animation: `inkReveal ${duration}ms cubic-bezier(.2,.7,.3,1) both`,
                  animationDelay: `${i * unitDelay}ms`,
                }
          }
        >
          {nb(u)}
        </div>
      ))}
    </div>
  );
}

/**
 * ScenePlayer - Interactive scene engine
 * Supports phase types: explore, exam, transition, forced_choice, poem_compose,
 * map_travel, dialogue_branch, narration, sliding_puzzle, click_points,
 * comic_reveal, escape_game, minigame, 以及第 5 层的 echo_portal /
 * inferno_placement / comedy_encounter（见 docs/DESIGN_DANTE_V2.md）
 */
export default function ScenePlayer({ sceneData, eventId, awardScore, onComplete }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [talkedNpcs, setTalkedNpcs] = useState(new Set());
  const [activeNpc, setActiveNpc] = useState(null);
  const [hoveredNpc, setHoveredNpc] = useState(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [cluesFound, setCluesFound] = useState(0);
  // Exam state
  const [examIndex, setExamIndex] = useState(0);
  const [examScore, setExamScore] = useState(0);
  const [examSelected, setExamSelected] = useState(null);
  const [examShowResult, setExamShowResult] = useState(false);
  const [examFillInput, setExamFillInput] = useState("");
  const [examFinished, setExamFinished] = useState(false);
  const [fillDropped, setFillDropped] = useState(null);
  // Transition state
  const [transitionDone, setTransitionDone] = useState(false);
  // 过场文字逐句显影是否已放完（没放完时点击 = 先补完，再点才前进）
  const [revealDone, setRevealDone] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  // Choice state
  const [choiceResponse, setChoiceResponse] = useState(null);
  const [choiceCorrect, setChoiceCorrect] = useState(false);
  const [choiceAttempted, setChoiceAttempted] = useState(false);
  const [showConclusion, setShowConclusion] = useState(false);
  // Poem compose state (multi-blank drag-fill)
  const [composedBlanks, setComposedBlanks] = useState([]);
  const [composedSubmitted, setComposedSubmitted] = useState(false);
  // Map travel state
  const [visitedWaypoints, setVisitedWaypoints] = useState(new Set());
  const [activeWaypoint, setActiveWaypoint] = useState(null);
  const [waypointDialogueIdx, setWaypointDialogueIdx] = useState(0);
  // 行旅顺序推进：旅人当前所在站 index、正在走向的站 index（走路动画中）
  const [reachedIdx, setReachedIdx] = useState(0);
  const [walkingTo, setWalkingTo] = useState(null);
  const walkTimerRef = useRef(null);

  const phases = sceneData.phases;
  const currentPhase = phases[phaseIndex];

  // 积分：key 全局唯一（事件:阶段:题目），App 层用它保证单局每关只计一次分。
  const award = useCallback((suffix, pts) => {
    if (awardScore && pts > 0) awardScore(`${eventId}:p${phaseIndex}:${suffix}`, pts);
  }, [awardScore, eventId, phaseIndex]);

  const goToNextPhase = useCallback(() => {
    if (phaseIndex < phases.length - 1) {
      setPhaseIndex(phaseIndex + 1);
      setTalkedNpcs(new Set());
      setActiveNpc(null);
      setDialogueIndex(0);
      setCluesFound(0);
      setExamIndex(0);
      setExamScore(0);
      setExamSelected(null);
      setExamShowResult(false);
      setExamFillInput("");
      setExamFinished(false);
      setTransitionDone(false);
      setRevealDone(false);
      setChoiceResponse(null);
      setChoiceCorrect(false);
      setChoiceAttempted(false);
      setShowConclusion(false);
      setComposedBlanks([]);
      setComposedSubmitted(false);
      setVisitedWaypoints(new Set());
      setActiveWaypoint(null);
      setWaypointDialogueIdx(0);
      clearTimeout(walkTimerRef.current);
      setReachedIdx(0);
      setWalkingTo(null);
    } else {
      onComplete();
    }
  }, [phaseIndex, phases.length, onComplete]);

  // === EXPLORE PHASE ===
  const handleNpcClick = (npc) => {
    setActiveNpc(npc);
    setDialogueIndex(0);
  };

  const handleDialogueNext = () => {
    if (dialogueIndex < activeNpc.dialogues.length - 1) {
      setDialogueIndex(dialogueIndex + 1);
    } else {
      const newTalked = new Set(talkedNpcs);
      newTalked.add(activeNpc.id);
      setTalkedNpcs(newTalked);
      if (activeNpc.isClue && !talkedNpcs.has(activeNpc.id)) {
        setCluesFound((c) => c + 1);
      }
      setActiveNpc(null);
    }
  };

  const canProceedExplore = currentPhase.type === "explore" && talkedNpcs.size >= (currentPhase.requiredTalks || 0);

  // === EXAM PHASE ===
  const handleExamChoice = (idx) => {
    if (examShowResult) return;
    setExamSelected(idx);
    setExamShowResult(true);
    if (idx === currentPhase.questions[examIndex].answer) {
      setExamScore((s) => s + 1);
      award(`q${examIndex}`, POINTS.choice);
    }
  };

  const handleExamFill = () => {
    if (examShowResult) return;
    setExamShowResult(true);
    if (examFillInput.trim() === currentPhase.questions[examIndex].answer) {
      setExamScore((s) => s + 1);
      award(`q${examIndex}`, POINTS.poemFill);
    }
  };

  const handleExamNext = () => {
    if (examIndex + 1 >= currentPhase.questions.length) {
      setExamFinished(true);
    } else {
      setExamIndex(examIndex + 1);
      setExamSelected(null);
      setExamShowResult(false);
      setExamFillInput("");
      setFillDropped(null);
    }
  };

  // Fill drag-and-drop handler
  const handleFillDrop = (word, answer) => {
    if (examShowResult) return;
    setFillDropped(word);
    setExamFillInput(word);
    setExamShowResult(true);
    if (word === answer) {
      setExamScore((s) => s + 1);
      award(`q${examIndex}`, POINTS.poemFill);
    }
  };

  // === CHOICE PHASE ===
  const handleChoice = (option) => {
    setChoiceResponse(option.response);
    if (option.correct) {
      setChoiceCorrect(true);
      // 只有第一次就选对才得分
      if (!choiceAttempted) award("choice", POINTS.choice);
    }
    setChoiceAttempted(true);
  };

  // === RENDER ===
  const bgStyle = {
    ...styles.sceneContainer,
    backgroundImage: currentPhase.background ? `url(${asset(currentPhase.background)})` : "none",
  };

  // --- TRANSITION PHASE ---
  if (currentPhase.type === "transition") {
    const hasAnnouncement = !!currentPhase.announcement;
    const hasReaction = !!currentPhase.dufu_reaction;
    const handleTransitionClick = () => {
      // \u6587\u5B57\u8FD8\u5728\u9010\u53E5\u663E\u5F71\uFF1A\u7B2C\u4E00\u4E0B\u70B9\u51FB\u5148\u8865\u5B8C\u6574\u6BB5\uFF0C\u518D\u70B9\u624D\u524D\u8FDB
      if (!revealDone) {
        setRevealDone(true);
        return;
      }
      if (!hasAnnouncement && !hasReaction) {
        goToNextPhase();
      } else {
        setTransitionDone(true);
      }
    };
    return (
      <div style={bgStyle}>
        <div style={styles.transitionOverlay}>
          {!transitionDone ? (
            <div style={styles.transitionCard} onClick={handleTransitionClick}>
              <RevealLines
                text={currentPhase.transitionText}
                style={styles.transitionText}
                skip={revealDone}
                onDone={() => setRevealDone(true)}
              />
              <p
                style={{
                  ...styles.clickHint,
                  opacity: revealDone ? 1 : 0,
                  transition: "opacity 500ms ease",
                }}
              >
                {"\u70B9\u51FB\u7EE7\u7EED"}
              </p>
            </div>
          ) : !showConclusion && hasAnnouncement ? (
            <div style={styles.scrollContainer} onClick={() => hasReaction ? setShowConclusion(true) : goToNextPhase()}>
              {/* Self-contained parchment card \u2014 no image dependency (the old
                  scroll.webp path was a 404, which collapsed the layout). */}
              <div
                style={{
                  ...styles.scrollWrap,
                  animation: prefersReducedMotion
                    ? "none"
                    : "announceIn 650ms cubic-bezier(.2,.7,.3,1) both",
                }}
              >
                {currentPhase.announcement.title && (
                  <h2 style={styles.scrollTitle}>{currentPhase.announcement.title}</h2>
                )}
                <p style={styles.scrollResult}>{nb(currentPhase.announcement.text)}</p>
              </div>
              <p style={styles.clickHint}>{"\u70B9\u51FB\u7EE7\u7EED"}</p>
            </div>
          ) : hasReaction ? (
            <div style={styles.announcementPanel}>
              <div
                style={{
                  ...styles.reactionBox,
                  animation: prefersReducedMotion
                    ? "none"
                    : "inkReveal 700ms cubic-bezier(.2,.7,.3,1) both",
                }}
              >
                <img
                  src={asset(
                    currentPhase.dufu_reaction.portrait && !isLegacyHeroPortrait(currentPhase.dufu_reaction.portrait)
                      ? currentPhase.dufu_reaction.portrait
                      : heroPortraitPath(currentPhase.dufu_reaction.dufu_pose || currentPhase.dufu_pose || sceneData.dufu_pose, sceneData.year, eventId)
                  )}
                  alt="" style={styles.reactionPortrait} />
                <p style={styles.reactionText}>{nb(currentPhase.dufu_reaction.text)}</p>
              </div>
              <button style={styles.proceedBtn} onClick={goToNextPhase}>
                {"\u7EE7\u7EED \u2192"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // --- EXPLORE PHASE ---
  if (currentPhase.type === "explore") {
    return (
      <div style={styles.sceneOuter}>
        {/* 16:9 locked area for background + NPCs */}
        <div style={styles.sceneStage}>
          <div style={{
            ...styles.sceneStageInner,
            backgroundImage: currentPhase.background ? `url(${asset(currentPhase.background)})` : "none",
          }}>
            {/* Phase title & instruction — 换屏时标题/叙述显影进入，避免静态一屏拍上 */}
            <div
              key={currentPhase.id}
              style={{
                ...styles.phaseHeader,
                animation: prefersReducedMotion
                  ? "none"
                  : "inkReveal 700ms cubic-bezier(.2,.7,.3,1) both",
              }}
            >
              <h2 style={styles.phaseTitle}>{nb(currentPhase.title)}</h2>
              {currentPhase.narrative && <p style={styles.phaseNarrative}>{nb(currentPhase.narrative)}</p>}
            </div>

            {currentPhase.instruction && (
              <div style={styles.instructionBar}>
                <span style={styles.instructionIcon}>{"\u{1F4AC}"}</span>
                <span>{nb(currentPhase.instruction)}</span>
                <span style={styles.talkCount}>
                  {"\u5DF2\u4EA4\u8C08: "}{talkedNpcs.size}/{currentPhase.npcs.length}
                </span>
              </div>
            )}

            {/* NPC markers with portraits \u2014 sized in viewport units that follow
                the 16:9 stage (width = min(100vw, 100vh*16/9)). Using
                min(Xvw, X*16/9 vh) keeps NPCs at a constant fraction of
                the stage regardless of window size. */}
            {currentPhase.npcs.map((npc) => {
              const talked = talkedNpcs.has(npc.id);
              // Decorative props: clickable=false → no dialogue, no cursor, no hint.
              // hideHint=true → clickable but without the ? bubble.
              const clickable = npc.clickable !== false;
              const showHint = clickable && npc.hideHint !== true;
              const basePct = 12 * (npc.scale || 1);
              const npcSize = `min(${basePct}vw, ${(basePct * 16) / 9}vh)`;
              return (
                <div
                  key={npc.id}
                  style={{
                    ...styles.npcMarker,
                    left: npc.position.x + "%",
                    top: npc.position.y + "%",
                    opacity: clickable && talked ? 0.6 : 1,
                    cursor: clickable ? "pointer" : "default",
                    // 画面下方（更近）的人物盖在上层，点击不会被后排大立绘拦截
                    zIndex: 10 + Math.round(npc.position.y),
                    // 有立绘的 NPC：点击区收窄到人物身体（内层 hitbox），
                    // 立绘 PNG 的透明边不再挡住旁边角色的点击。
                    pointerEvents: npc.portrait ? "none" : "auto",
                  }}
                  onClick={clickable && !npc.portrait ? () => handleNpcClick(npc) : undefined}
                  onMouseEnter={clickable && !npc.portrait ? () => setHoveredNpc(npc.id) : undefined}
                  onMouseLeave={clickable && !npc.portrait ? () => setHoveredNpc(null) : undefined}
                >
                  {/* Portrait-less items render as a single ? marker — no name label.
                      Items with a portrait still show ? bubble + name. */}
                  {!npc.portrait ? (
                    clickable && (
                      <div
                        style={{
                          ...styles.npcQuestionMark,
                          backgroundColor: talked
                            ? "rgba(149,165,166,0.85)"
                            : npc.isClue ? "rgba(231,76,60,0.9)" : "rgba(212,165,116,0.95)",
                        }}
                      >
                        {talked ? "\u2713" : "?"}
                      </div>
                    )
                  ) : (
                    <>
                      {showHint && !talked && <div style={styles.npcBubble}>{"?"}</div>}
                      {clickable && talked && <div style={styles.npcCheckMark}>{"\u2713"}</div>}
                      <div style={{
                        ...styles.npcPortraitWrap,
                        width: npcSize,
                        height: npcSize,
                        borderColor: talked ? "#95A5A6" : npc.isClue ? "#E74C3C" : "#3498DB",
                        // Compose: optional 3D perspective tilt, rotation, flip.
                        perspective: npc.perspective ? (npc.perspective + "px") : undefined,
                        transform: [
                          npc.tiltX ? `rotateX(${npc.tiltX}deg)` : "",
                          npc.tiltY ? `rotateY(${npc.tiltY}deg)` : "",
                          npc.rotate ? `rotate(${npc.rotate}deg)` : "",
                          npc.flip ? "scaleX(-1)" : "",
                        ].filter(Boolean).join(" ") || "none",
                      }}>
                        <img
                          src={asset(npc.portrait)}
                          alt={npc.name}
                          style={styles.npcPortraitImg}
                          onError={(e) => { e.currentTarget.style.opacity = "0.2"; }}
                        />
                        {/* 实际点击区：立绘中间 50% 宽 × 80% 高（人物身体位置） */}
                        {clickable && (
                          <div
                            style={{
                              position: "absolute",
                              left: "25%", top: "10%", width: "50%", height: "80%",
                              pointerEvents: "auto",
                              cursor: "pointer",
                              zIndex: 2,
                            }}
                            onClick={() => handleNpcClick(npc)}
                            onMouseEnter={() => setHoveredNpc(npc.id)}
                            onMouseLeave={() => setHoveredNpc(null)}
                          />
                        )}
                      </div>
                      {/* Name only on hover — keeps the scene immersive */}
                      {hoveredNpc === npc.id && <span style={styles.npcName}>{npc.name}</span>}
                    </>
                  )}
                </div>
              );
            })}

            {/* Enter trigger zone */}
            {canProceedExplore && currentPhase.nextTrigger && (
              <div
                style={{
                  ...styles.triggerZone,
                  left: currentPhase.nextTrigger.area.x + "%",
                  top: currentPhase.nextTrigger.area.y + "%",
                }}
                onClick={goToNextPhase}
              >
                <div style={styles.triggerPulse} />
                <span style={styles.triggerLabel}>{currentPhase.nextTrigger.label}</span>
              </div>
            )}

            {/* If no trigger, show button when enough talks done */}
            {canProceedExplore && !currentPhase.nextTrigger && (
              <button style={styles.floatingProceed} onClick={goToNextPhase}>
                {"\u7EE7\u7EED \u2192"}
              </button>
            )}

            {/* Bubble dialogue layer \u2014 sits inside the stage so coordinates
                match the NPC positioning system. Only used when activeNpc has
                bubbleMode (NPC is painted directly into the background). */}
            {activeNpc && (activeNpc.bubbleMode === true || activeNpc.dialogues[dialogueIndex]?.bubble === true) && (() => {
              const line = activeNpc.dialogues[dialogueIndex];
              const isLast = dialogueIndex >= activeNpc.dialogues.length - 1;
              return (
                <div
                  style={{
                    ...styles.speechBubbleWrap,
                    left: activeNpc.position.x + "%",
                    top: activeNpc.position.y + "%",
                  }}
                  onClick={(e) => { e.stopPropagation(); handleDialogueNext(); }}
                >
                  <div style={styles.speechBubble}>
                    {(line.speakerName || activeNpc.name) && (
                      <div style={styles.bubbleSpeaker}>{line.speakerName || activeNpc.name}</div>
                    )}
                    <div style={styles.bubbleText}>{line.text}</div>
                    <div style={styles.bubbleContinue}>{isLast ? "\u2713" : "\u25BC"}</div>
                  </div>
                  <div style={styles.bubbleTail} />
                </div>
              );
            })()}
          </div>
        </div>

        {/* Active NPC dialogue — large portrait left, text right (skipped in bubble mode) */}
        {activeNpc && !(activeNpc.bubbleMode === true || activeNpc.dialogues[dialogueIndex]?.bubble === true) && (
          <div style={styles.dialogueOverlay} onClick={handleDialogueNext}>
            {(() => {
              const line = activeNpc.dialogues[dialogueIndex];
              const isSelf = HERO_SPEAKERS.has(line.speaker);
              // Hero pose: per-line override > per-phase > per-event > stage default by year.
              const dufuPose = line.dufu_pose || currentPhase.dufu_pose || sceneData.dufu_pose;
              let portrait;
              if (isSelf) portrait = heroPortraitPath(dufuPose, sceneData.year, eventId);
              else if (line.speaker === "narrator" || line.speaker === "portrait") portrait = "";
              // 说话者就是当前 NPC 且写了显式立绘 → 直接用，避免事件级 NPC 走
              // 共用目录约定路径造成 404（onError 兜底仍在，但不再触发）。
              else if (line.speaker === activeNpc.id && activeNpc.portrait) portrait = activeNpc.portrait;
              else portrait = npcPortraitPath(line.speaker, eventId) || activeNpc.portrait;
              const isLast = dialogueIndex >= activeNpc.dialogues.length - 1;
              // Bubble mode: NPC drawn into the background image, render speech
              // bubble pinned to NPC.position (the head area) instead of bottom bar.
              if (activeNpc.bubbleMode === true || line.bubble === true) {
                return (
                  <div
                    style={{
                      ...styles.speechBubbleWrap,
                      left: activeNpc.position.x + "%",
                      top: activeNpc.position.y + "%",
                    }}
                    onClick={(e) => { e.stopPropagation(); handleDialogueNext(); }}
                  >
                    <div style={styles.speechBubble}>
                      {(line.speakerName || activeNpc.name) && (
                        <div style={styles.bubbleSpeaker}>{line.speakerName || activeNpc.name}</div>
                      )}
                      <div style={styles.bubbleText}>{line.text}</div>
                      <div style={styles.bubbleContinue}>{isLast ? "✓" : "▼"}</div>
                    </div>
                    <div style={styles.bubbleTail} />
                  </div>
                );
              }
              return (
                <>
                  {/* Full-width dialogue background bar at bottom */}
                  <div style={styles.dialogueBar}>
                    {/* Portrait overlapping the bar from the left */}
                    {portrait && (
                      <div style={styles.dialoguePortraitArea}>
                        <img
                          src={asset(portrait)}
                          alt=""
                          style={styles.dialoguePortraitLarge}
                          onError={(e) => {
                            // If the speaker-specific portrait is missing,
                            // fall back to the activeNpc's portrait, then
                            // to a neutral silhouette so dialogue never
                            // loses its avatar.
                            if (activeNpc.portrait && !e.currentTarget.dataset.fallback) {
                              e.currentTarget.dataset.fallback = "1";
                              e.currentTarget.src = asset(activeNpc.portrait);
                            } else {
                              e.currentTarget.style.display = "none";
                            }
                          }}
                        />
                      </div>
                    )}
                    {/* Text content */}
                    <div style={styles.dialogueTextPanel}>
                      <div style={styles.dialogueSpeaker}>
                        {line.speakerName || activeNpc.name}
                      </div>
                      <div style={styles.dialogueText}>
                        {nb(line.text)}
                      </div>
                      <div style={styles.dialogueContinue}>
                        {isLast ? "\u2713 \u70B9\u51FB\u4EFB\u610F\u4F4D\u7F6E\u5173\u95ED" : "\u25BC \u70B9\u51FB\u4EFB\u610F\u4F4D\u7F6E\u7EE7\u7EED"}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  // --- EXAM PHASE ---
  if (currentPhase.type === "exam") {
    const q = currentPhase.questions[examIndex];

    if (examFinished) {
      return (
        <div style={bgStyle}>
          <div style={styles.examOverlay}>
            <div style={styles.examResultCard}>
              <h2 style={styles.examResultTitle}>{"\u8003\u8BD5\u7ED3\u675F"}</h2>
              <div style={styles.examScoreDisplay}>
                <span style={styles.examScoreBig}>{examScore}</span>
                <span style={styles.examScoreTotal}>/ {currentPhase.questions.length}</span>
              </div>
              <p style={styles.examResultNote}>
                {"\u65E0\u8BBA\u5F97\u5206\u591A\u5C11\uff0c\u7ED3\u679C\u90FD\u5DF2\u6CE8\u5B9A\u2026\u2026"}
              </p>
              <button style={styles.proceedBtn} onClick={goToNextPhase}>
                {"\u67E5\u770B\u7ED3\u679C \u2192"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const examinerPortrait = currentPhase.examiner?.portrait;
    return (
      <div style={bgStyle}>
        <div style={styles.examWithPortrait}>
          {/* Examiner portrait on the left — always visible */}
          <div style={styles.examPortraitArea}>
            {examinerPortrait ? (
              <img src={asset(examinerPortrait)} alt={currentPhase.examiner?.name || ""} style={styles.examPortraitImg} />
            ) : (
              <div style={{ width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: "clamp(12.5px, 0.972vw, 16.1px)" }}>
                {"（无考官立绘）"}
              </div>
            )}
          </div>
          {/* Exam panel on the right */}
          <div style={styles.examPanelRight}>
            <div style={styles.examProgress}>
              {"\u7B2C "}{examIndex + 1}{" \u9898 / \u5171 "}{currentPhase.questions.length}{" \u9898"}
            </div>

            <h3 style={styles.examQuestion}>{q.question}</h3>

            {q.type === "choice" && (
              <div style={styles.examOptions}>
                {q.options.map((opt, i) => {
                  let bg = "#F8F9FA";
                  let border = "#DEE2E6";
                  if (examShowResult) {
                    if (i === q.answer) { bg = "#D4EDDA"; border = "#28A745"; }
                    else if (i === examSelected && i !== q.answer) { bg = "#F8D7DA"; border = "#DC3545"; }
                  }
                  return (
                    <div key={i} style={{ ...styles.examOption, backgroundColor: bg, borderColor: border }} onClick={() => handleExamChoice(i)}>
                      <span style={styles.examOptionLetter}>{["A", "B", "C", "D"][i]}</span>
                      <span>{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === "poem_fill" && (() => {
              const parts = q.question.split("___");
              const allWords = [q.answer, ...(q.distractors || [])];
              const shuffled = [...allWords].sort((a, b) => {
                const ha = a.split("").reduce((s, c) => s + c.charCodeAt(0), examIndex * 7);
                const hb = b.split("").reduce((s, c) => s + c.charCodeAt(0), examIndex * 7);
                return ha - hb;
              });
              const isCorrect = fillDropped === q.answer;
              return (
                <div>
                  <div style={styles.fillPassage}>
                    {parts[0]}
                    <span
                      style={{
                        ...styles.fillDropZone,
                        borderColor: examShowResult ? (isCorrect ? "#28A745" : "#DC3545") : "#8B7355",
                        backgroundColor: examShowResult ? (isCorrect ? "#D4EDDA" : "#F8D7DA") : "rgba(139,115,85,0.15)",
                        color: examShowResult ? (isCorrect ? "#155724" : "#721C24") : "#8B7355",
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const word = e.dataTransfer.getData("text/plain");
                        handleFillDrop(word, q.answer);
                      }}
                    >
                      {fillDropped || "\u2003\u2003\u2003"}
                    </span>
                    {parts[1] || ""}
                  </div>
                  {!examShowResult && (
                    <>
                      <div style={styles.fillChips}>
                        {shuffled.map((word, i) => (
                          <div
                            key={i}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", word)}
                            onClick={() => handleFillDrop(word, q.answer)}
                            style={styles.fillChip}
                          >
                            {word}
                          </div>
                        ))}
                      </div>
                      <div style={styles.tapHint}>{"点击词块即可填入（电脑上也可拖拽）"}</div>
                    </>
                  )}
                  {examShowResult && !isCorrect && (
                    <div style={{ fontSize: "clamp(12.5px, 0.972vw, 16.1px)", color: "#28A745", marginTop: 8 }}>
                      {"\u6B63\u786E\u7B54\u6848: " + q.answer}
                    </div>
                  )}
                </div>
              );
            })()}

            {examShowResult && q.explanation && (
              <div style={styles.explanationBox}>
                <p>{nb(q.explanation)}</p>
              </div>
            )}

            {examShowResult && (
              <button style={styles.proceedBtn} onClick={handleExamNext}>
                {examIndex + 1 >= currentPhase.questions.length ? "\u67E5\u770B\u6210\u7EE9 \u2192" : "\u4E0B\u4E00\u9898 \u2192"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- FORCED CHOICE PHASE ---
  if (currentPhase.type === "forced_choice") {
    const isLastPhase = phaseIndex >= phases.length - 1;
    if (showConclusion) {
      return (
        <div style={bgStyle}>
          <div style={styles.conclusionOverlay}>
            <div style={styles.conclusionPanel}>
              <p style={styles.conclusionNarrative}>{currentPhase.conclusion.narrative}</p>
              {currentPhase.conclusion.poem && (
                <div style={styles.conclusionPoem}>
                  <h4 style={styles.poemTitle}>{"\u{1F4DC} " + currentPhase.conclusion.poem.title}</h4>
                  <pre style={styles.poemContent}>{currentPhase.conclusion.poem.content}</pre>
                </div>
              )}
              <button style={styles.proceedBtn} onClick={goToNextPhase}>
                {isLastPhase ? "\u5B8C\u6210\u672C\u573A\u666F \u2192" : "\u7EE7\u7EED \u2192"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={bgStyle}>
        <div style={styles.choiceOverlay}>
          <div style={styles.choicePanel}>
            {currentPhase.narrative && (
              <p style={styles.choiceNarrative}>{currentPhase.narrative}</p>
            )}
            <h3 style={styles.choiceQuestion}>{currentPhase.question}</h3>

            {!choiceCorrect && (
              <div style={styles.choiceOptions}>
                {currentPhase.options.map((opt) => (
                  <button
                    key={opt.id}
                    style={styles.choiceBtn}
                    onClick={() => handleChoice(opt)}
                  >
                    {nb(opt.text)}
                  </button>
                ))}
              </div>
            )}

            {choiceResponse && (
              <div style={{
                ...styles.choiceResponseBox,
                backgroundColor: choiceCorrect ? "#D4EDDA" : "#FFF3CD",
                borderColor: choiceCorrect ? "#28A745" : "#FFC107",
              }}>
                {choiceResponse.speakerName && (
                  <div style={styles.choiceResponseSpeaker}>{choiceResponse.speakerName}</div>
                )}
                <p style={styles.choiceResponseText}>{choiceResponse.text}</p>
              </div>
            )}

            {choiceCorrect && (
              <button style={styles.proceedBtn} onClick={() => setShowConclusion(true)}>
                {"\u7EE7\u7EED \u2192"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- POEM COMPOSE PHASE ---
  if (currentPhase.type === "poem_compose") {
    const blanks = currentPhase.blanks || [];
    const distractors = currentPhase.distractors || [];
    const puzzle = currentPhase.puzzle || (currentPhase.lines ? currentPhase.lines.join("\n") : "");
    const allTokens = [...blanks, ...distractors];
    // Deterministic shuffle so token order doesn't jitter every render.
    const shuffledTokens = [...allTokens].sort((a, b) => {
      const ha = a.split("").reduce((s, c) => s + c.charCodeAt(0), 17);
      const hb = b.split("").reduce((s, c) => s + c.charCodeAt(0), 17);
      return ha - hb;
    });
    // Find unfilled token (one each), tokens already placed in blanks shouldn't appear in chip pool.
    const placedSet = new Set(composedBlanks.filter(Boolean));
    const remainingTokens = shuffledTokens.filter((t) => !placedSet.has(t));

    const setBlank = (idx, word) => {
      if (composedSubmitted) return;
      const next = [...composedBlanks];
      // Remove the word from any other blank (so we don't duplicate)
      for (let i = 0; i < next.length; i++) if (next[i] === word) next[i] = null;
      next[idx] = word;
      setComposedBlanks(next);
    };
    const clearBlank = (idx) => {
      if (composedSubmitted) return;
      const next = [...composedBlanks];
      next[idx] = null;
      setComposedBlanks(next);
    };
    const allFilled = blanks.length > 0 && blanks.every((_, i) => composedBlanks[i]);
    const correctCount = blanks.reduce((n, ans, i) => n + (composedBlanks[i] === ans ? 1 : 0), 0);

    // Build puzzle display: split by ___ and intersperse drop zones.
    const parts = puzzle.split("___");

    return (
      <div style={bgStyle}>
        <div style={styles.choiceOverlay}>
          <div style={{ ...styles.choicePanel, maxWidth: 700 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "clamp(16.0px, 1.389vw, 23.0px)" }}>{"\u{1F4DC} " + (currentPhase.title || "\u8BD7\u6B4C\u521B\u4F5C")}</h2>
            {currentPhase.poemContext && <p style={styles.choiceNarrative}>{currentPhase.poemContext}</p>}

            <div style={styles.fillPassage}>
              {parts.map((seg, i) => (
                <span key={i}>
                  {seg.split("\n").map((ln, j, arr) => (
                    <span key={j}>{ln}{j < arr.length - 1 && <br />}</span>
                  ))}
                  {i < parts.length - 1 && (
                    <span
                      style={{
                        ...styles.fillDropZone,
                        borderColor: composedSubmitted
                          ? (composedBlanks[i] === blanks[i] ? "#28A745" : "#DC3545")
                          : "#8B7355",
                        backgroundColor: composedSubmitted
                          ? (composedBlanks[i] === blanks[i] ? "#D4EDDA" : "#F8D7DA")
                          : "rgba(139,115,85,0.15)",
                        cursor: composedSubmitted ? "default" : "pointer",
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const word = e.dataTransfer.getData("text/plain");
                        if (word) setBlank(i, word);
                      }}
                      onClick={() => composedBlanks[i] && clearBlank(i)}
                    >
                      {composedBlanks[i] || "\u2003\u2003\u2003"}
                    </span>
                  )}
                </span>
              ))}
            </div>

            {!composedSubmitted && (
              <>
                <div style={styles.fillChips}>
                  {remainingTokens.map((word) => (
                    <div
                      key={word}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", word)}
                      onClick={() => {
                        // 按空格总数找第一个未填的（不能在 composedBlanks 上找——
                        // 它是稀疏数组，会永远命中第 0 格）
                        let idx = 0;
                        for (let i = 0; i < blanks.length; i++) {
                          if (!composedBlanks[i]) { idx = i; break; }
                        }
                        setBlank(idx, word);
                      }}
                      style={styles.fillChip}
                    >
                      {word}
                    </div>
                  ))}
                </div>
                <div style={styles.tapHint}>{"点击词块依次填入空格，点已填的字可取出（电脑上也可拖拽）"}</div>
                <button
                  style={{ ...styles.proceedBtn, opacity: allFilled ? 1 : 0.5, cursor: allFilled ? "pointer" : "not-allowed" }}
                  disabled={!allFilled}
                  onClick={() => {
                    setComposedSubmitted(true);
                    // 填诗每空答对 +10
                    award("compose", correctCount * POINTS.poemFill);
                  }}
                >
                  {"\u63D0\u4EA4 \u2192"}
                </button>
              </>
            )}

            {composedSubmitted && (
              <>
                <div style={{ ...styles.explanationBox, backgroundColor: "#F0F8FF" }}>
                  {"\u7B54\u5BF9 "}<strong>{correctCount}</strong>{" / "}{blanks.length}{" \u9898"}
                  {blanks.map((ans, i) => composedBlanks[i] !== ans && (
                    <div key={i} style={{ fontSize: "clamp(12px, 0.903vw, 14.9px)", color: "#28A745", marginTop: 4 }}>
                      {"\u7B2C " + (i + 1) + " \u7A7A\u6B63\u786E\u7B54\u6848\uFF1A" + ans}
                    </div>
                  ))}
                </div>
                {currentPhase.poemTitle && (
                  <div style={styles.conclusionPoem}>
                    <h4 style={styles.poemTitle}>{"\u{1F4DC} " + currentPhase.poemTitle}</h4>
                    <pre style={styles.poemContent}>{
                      parts.map((seg, i) => seg + (i < parts.length - 1 ? blanks[i] : "")).join("")
                    }</pre>
                  </div>
                )}
                <button style={styles.proceedBtn} onClick={goToNextPhase}>{"\u7EE7\u7EED \u2192"}</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- MAP TRAVEL PHASE ---
  if (currentPhase.type === "map_travel") {
    const waypoints = currentPhase.waypoints || currentPhase.destinations || [];
    const requireAll = currentPhase.requireAll !== false; // default true
    const wpId = (w) => w.id || w.name;
    // 顺序行旅：只有「下一站」可以互动，未至的站是淡铅笔稿
    const currentTargetIdx = waypoints.findIndex((w) => !visitedWaypoints.has(wpId(w)));
    const allVisited = currentTargetIdx === -1;
    const WALK_MS = 1400;

    // 到站（或减少动效时直接跳到站）后开对话；没有对话的站直接完成并继续走
    const openWaypoint = (wp, idx) => {
      if (wp.dialogues && wp.dialogues.length > 0) {
        setActiveWaypoint(wp);
        setWaypointDialogueIdx(0);
      } else {
        completeWaypoint(wp, idx);
      }
    };
    const beginWalkTo = (idx) => {
      if (prefersReducedMotion) {
        setReachedIdx(idx);
        openWaypoint(waypoints[idx], idx);
        return;
      }
      setWalkingTo(idx);
      walkTimerRef.current = setTimeout(() => {
        setWalkingTo(null);
        setReachedIdx(idx);
        // 到站落定，停一拍再开口
        walkTimerRef.current = setTimeout(() => openWaypoint(waypoints[idx], idx), 350);
      }, WALK_MS);
    };
    const completeWaypoint = (wp, idx) => {
      setVisitedWaypoints((prev) => {
        const next = new Set(prev);
        next.add(wpId(wp));
        return next;
      });
      if (idx + 1 < waypoints.length) beginWalkTo(idx + 1);
    };
    const handleWaypointClick = (wp, idx) => {
      // 只响应「旅人正站着的下一站」——出发第一站靠这一下点击启动整趟行程
      if (idx !== currentTargetIdx || walkingTo !== null || reachedIdx !== idx || activeWaypoint) return;
      openWaypoint(wp, idx);
    };
    const advanceWaypointDialogue = () => {
      if (!activeWaypoint) return;
      const dlgs = activeWaypoint.dialogues || [];
      if (waypointDialogueIdx < dlgs.length - 1) {
        setWaypointDialogueIdx(waypointDialogueIdx + 1);
      } else {
        const idx = waypoints.findIndex((w) => wpId(w) === wpId(activeWaypoint));
        setActiveWaypoint(null);
        setWaypointDialogueIdx(0);
        completeWaypoint(activeWaypoint, idx);
      }
    };

    // 站点坐标 → 16:9 画面坐标系（viewBox 160×90，和舞台等比，单位均匀）
    const px = (w) => (w.x ?? 50) * 1.6;
    const py = (w) => (w.y ?? 50) * 0.9;
    // 相邻站之间的手绘感墨线：二次贝塞尔，垂线方向交替拱起
    const segPath = (a, b, i) => {
      const x1 = px(a), y1 = py(a), x2 = px(b), y2 = py(b);
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const bow = Math.min(6, len * 0.16) * (i % 2 === 0 ? 1 : -1);
      const mx = (x1 + x2) / 2 - (dy / len) * bow;
      const my = (y1 + y2) / 2 + (dx / len) * bow;
      return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
    };
    const INK = "#3A2E20";
    const SEAL = "#A63A2B";
    const PENCIL = "#8A7A62";

    return (
      <div style={styles.sceneOuter}>
        <div style={styles.sceneStage}>
          <div style={{
            ...styles.sceneStageInner,
            backgroundImage: currentPhase.background ? `url(${asset(currentPhase.background)})` : "none",
          }}>
            <div style={styles.phaseHeader}>
              <h2 style={styles.phaseTitle}>{currentPhase.title || "\u5730\u56FE\u884C\u65C5"}</h2>
              {currentPhase.travelNarrative && <p style={styles.phaseNarrative}>{nb(currentPhase.travelNarrative)}</p>}
            </div>

            {currentPhase.instruction && (
              <div style={styles.instructionBar}>
                <span style={styles.instructionIcon}>{"\u{1F5FA}"}</span>
                <span>
                  {allVisited
                    ? currentPhase.instruction
                    : walkingTo !== null
                      ? `\u8D76\u8DEF\u4E2D\u2026\u2026`
                      : `\u4E0B\u4E00\u7AD9\uFF1A${waypoints[currentTargetIdx]?.name || ""}`}
                </span>
                <span style={styles.talkCount}>{"\u884C\u7A0B " + visitedWaypoints.size + "/" + waypoints.length}</span>
              </div>
            )}

            {/* \u884C\u65C5\u58A8\u7EBF\uFF1A\u5DF2\u8D70\u8FC7\u7684\u5B9E\u58A8\u3001\u6B63\u5728\u8D70\u7684\u9010\u6BB5\u663E\u5F71\u3001\u672A\u81F3\u7684\u6DE1\u94C5\u7B14\u7A3F */}
            <svg
              viewBox="0 0 160 90"
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 10 }}
            >
              {waypoints.slice(0, -1).map((wp, i) => {
                const d = segPath(wp, waypoints[i + 1], i);
                if (i + 1 <= reachedIdx) {
                  // \u5DF2\u8D70\u8FC7\uFF1A\u5B9E\u58A8\u7EBF
                  return <path key={i} d={d} fill="none" stroke={INK} strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />;
                }
                if (walkingTo === i + 1) {
                  // \u6B63\u5728\u8D70\uFF1A\u58A8\u7EBF\u968F\u811A\u6B65\u753B\u51FA\u6765
                  return (
                    <path
                      key={i} d={d} fill="none" stroke={INK} strokeWidth="0.7" strokeLinecap="round" opacity="0.6"
                      pathLength="1" strokeDasharray="1" strokeDashoffset="1"
                      style={{ animation: `pathDraw ${WALK_MS}ms linear forwards` }}
                    />
                  );
                }
                // \u672A\u81F3\uFF1A\u6781\u6DE1\u7684\u94C5\u7B14\u7A3F
                return <path key={i} d={d} fill="none" stroke={PENCIL} strokeWidth="0.45" strokeLinecap="round" strokeDasharray="1.1 1.7" opacity="0.3" />;
              })}
            </svg>

            {/* \u7AD9\u70B9\u4E09\u6001\uFF1A\u5DF2\u81F3=\u5B9E\u58A8+\u2713\uFF1B\u5F53\u524D=\u5370\u7AE0\u7EA2\u547C\u5438\uFF0C\u5E26\u540D\u724C\uFF1B\u672A\u81F3=\u533F\u540D\u94C5\u7B14\u5C0F\u70B9 */}
            {waypoints.map((wp, idx) => {
              const wid = wpId(wp);
              const visited = visitedWaypoints.has(wid);
              const isCurrent = idx === currentTargetIdx;
              const awaitingTap = isCurrent && walkingTo === null && reachedIdx === idx && !activeWaypoint;
              if (!visited && !isCurrent) {
                // \u672A\u81F3\u4E4B\u7AD9\uFF1A\u53EA\u7ED9\u4E00\u4E2A\u6DE1\u94C5\u7B14\u5C0F\u5708\uFF0C\u540D\u5B57\u5148\u4E0D\u63ED\u6653
                return (
                  <div
                    key={wid}
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: (wp.x || 50) + "%",
                      top: (wp.y || 50) + "%",
                      transform: "translate(-50%, -50%)",
                      width: 9, height: 9, borderRadius: "50%",
                      border: `1.5px dashed ${PENCIL}`,
                      opacity: 0.45,
                      zIndex: 20,
                      pointerEvents: "none",
                    }}
                  />
                );
              }
              return (
                <div
                  key={wid}
                  title={(visited ? "\u2713 " : "") + (wp.name || "\u76EE\u7684\u5730")}
                  style={{
                    position: "absolute",
                    left: (wp.x || 50) + "%",
                    top: (wp.y || 50) + "%",
                    transform: "translate(-50%, -100%)",
                    cursor: awaitingTap ? "pointer" : "default",
                    zIndex: 30,
                    opacity: visited ? 0.85 : 1,
                  }}
                  onClick={() => handleWaypointClick(wp, idx)}
                >
                  {awaitingTap && (
                    <span style={{
                      position: "absolute", top: 0, left: "50%",
                      width: 20, height: 20, borderRadius: "50%",
                      backgroundColor: SEAL, opacity: 0.35,
                      transform: "translate(-50%, 0)",
                      animation: "mapPinPulse 1.6s ease-out infinite",
                      pointerEvents: "none",
                    }} />
                  )}
                  <Pin
                    color={visited ? INK : SEAL}
                    size={wp.isKey ? 25 : 22}
                    glow={awaitingTap}
                    badge={visited ? "\u2713" : null}
                  />
                  {/* \u5F53\u524D\u7AD9\u540D\u724C\uFF1A\u7EB8\u5E95\u5C0F\u80F6\u56CA\uFF0C\u7B2C\u4E00\u7AD9\u63D0\u793A\u51FA\u53D1 */}
                  {awaitingTap && (
                    <div style={{
                      position: "absolute",
                      top: "100%", left: "50%",
                      transform: "translateX(-50%)",
                      marginTop: 4,
                      padding: "3px 10px",
                      borderRadius: 12,
                      backgroundColor: "rgba(250,246,238,0.88)",
                      border: "1px solid #C9B08A",
                      color: INK,
                      fontSize: "clamp(11px, 0.9vw, 14px)",
                      letterSpacing: 1,
                      whiteSpace: "nowrap",
                      boxShadow: "0 2px 8px rgba(70,55,35,0.25)",
                      pointerEvents: "none",
                    }}>
                      {(wp.name || "") + (visitedWaypoints.size === 0 && idx === 0 ? " \u00B7 \u70B9\u51FB\u51FA\u53D1" : "")}
                    </div>
                  )}
                </div>
              );
            })}

            {/* \u65C5\u4EBA\uFF1A\u6CBF\u58A8\u7EBF\u8D70\u5411\u4E0B\u4E00\u7AD9\uFF0C\u8D70\u8DEF\u65F6\u8F7B\u5FAE\u8D77\u4F0F */}
            {(() => {
              const at = waypoints[walkingTo ?? Math.min(reachedIdx, waypoints.length - 1)];
              if (!at) return null;
              return (
                <div
                  style={{
                    position: "absolute",
                    left: (at.x || 50) + "%",
                    top: (at.y || 50) + "%",
                    transform: "translate(-50%, -96%)",
                    transition: prefersReducedMotion
                      ? "none"
                      : `left ${WALK_MS}ms cubic-bezier(0.45, 0.1, 0.45, 0.9), top ${WALK_MS}ms cubic-bezier(0.45, 0.1, 0.45, 0.9)`,
                    pointerEvents: "none",
                    zIndex: 25,
                  }}
                >
                  <img
                    src={asset(heroPortraitPath(currentPhase.dufu_pose || sceneData.dufu_pose, sceneData.year, eventId))}
                    alt=""
                    style={{
                      display: "block",
                      height: "min(9vw, 15vh)",
                      filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.4))",
                      animation: walkingTo !== null && !prefersReducedMotion
                        ? "travelBob 380ms ease-in-out infinite alternate"
                        : "none",
                    }}
                  />
                </div>
              );
            })()}

            {(!requireAll || allVisited) && (
              <button style={styles.floatingProceed} onClick={goToNextPhase}>
                {"\u7EE7\u7EED \u2192"}
              </button>
            )}
          </div>
        </div>

        {/* Waypoint dialogue (uses bubble at waypoint position) */}
        {activeWaypoint && (() => {
          const line = (activeWaypoint.dialogues || [])[waypointDialogueIdx] || { text: "" };
          const isLast = waypointDialogueIdx >= (activeWaypoint.dialogues || []).length - 1;
          return (
            <div style={styles.dialogueOverlay} onClick={advanceWaypointDialogue}>
              <div style={styles.dialogueBar}>
                <div style={styles.dialogueTextPanel}>
                  <div style={styles.dialogueSpeaker}>
                    {line.speakerName || activeWaypoint.name}
                  </div>
                  <div style={styles.dialogueText}>{line.text}</div>
                  <div style={styles.dialogueContinue}>
                    {isLast ? "\u2713 \u70B9\u51FB\u4EFB\u610F\u4F4D\u7F6E\u5173\u95ED" : "\u25BC \u70B9\u51FB\u4EFB\u610F\u4F4D\u7F6E\u7EE7\u7EED"}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // --- DIALOGUE BRANCH PHASE ---
  if (currentPhase.type === "dialogue_branch") {
    return (
      <div style={bgStyle}>
        <div style={styles.choiceOverlay}>
          <div style={styles.choicePanel}>
            <h2 style={{ margin: "0 0 12px", fontSize: "clamp(16.0px, 1.389vw, 23.0px)" }}>{"\u{1F4AC} \u5BF9\u8BDD: " + (currentPhase.branchCharacter || "")}</h2>
            {currentPhase.narrative && <p style={styles.choiceNarrative}>{currentPhase.narrative}</p>}
            <p style={{ color: "#999", fontSize: "clamp(12px, 0.903vw, 14.9px)", marginBottom: 16 }}>{"\uFF08\u5BF9\u8BDD\u5206\u652F\u529F\u80FD\u5F00\u53D1\u4E2D\u2026\u2026\u591A\u8F6E\u5BF9\u8BDD\u6811\u5C06\u5728\u6B64\u5C55\u793A\uFF09"}</p>
            {(currentPhase.dialogueTree || []).map((node, i) => (
              <div key={i} style={{ ...styles.explanationBox, marginBottom: 8 }}>
                <strong>{node.speaker || "\u65C1\u767D"}: </strong>{node.text}
                {node.choices && node.choices.length > 0 && (
                  <div style={{ marginTop: 4, paddingLeft: 12 }}>
                    {node.choices.map((c, ci) => (
                      <div key={ci} style={{ color: "#2980B9", fontSize: "clamp(12px, 0.903vw, 14.9px)" }}>{"\u2192 " + c.text}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button style={styles.proceedBtn} onClick={goToNextPhase}>{"\u7EE7\u7EED \u2192"}</button>
          </div>
        </div>
      </div>
    );
  }

  // --- NARRATION PHASE ---
  if (currentPhase.type === "narration") {
    const slides = currentPhase.narrationSlides || [];
    return (
      <div style={bgStyle}>
        <div style={styles.transitionOverlay}>
          <div style={{ maxWidth: 600, width: "90%", maxHeight: "calc(var(--vh100) - 32px)", overflowY: "auto" }}>
            {slides.length === 0 ? (
              <p style={{ color: "#AAA", textAlign: "center" }}>{"\uFF08\u6682\u65E0\u53D9\u4E8B\u5185\u5BB9\uFF09"}</p>
            ) : slides.map((slide, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 24,
                  textAlign: "center",
                  animation: prefersReducedMotion
                    ? "none"
                    : "inkReveal 800ms cubic-bezier(.2,.7,.3,1) both",
                  animationDelay: prefersReducedMotion ? undefined : `${Math.min(i, 8) * 380}ms`,
                }}
              >
                {slide.image && <img src={asset(slide.image)} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8 }} />}
                {slide.speaker && <div style={{ color: "#D4A574", fontSize: "clamp(12.5px, 0.972vw, 16.1px)", fontWeight: "bold", marginBottom: 4 }}>{slide.speaker}</div>}
                <p style={{ color: "#F5E6D3", fontSize: "clamp(12.8px, 1.111vw, 18.4px)", lineHeight: 1.8, margin: 0 }}>{nb(slide.text)}</p>
              </div>
            ))}
            <button style={{ ...styles.proceedBtn, marginTop: 20 }} onClick={goToNextPhase}>{"\u7EE7\u7EED \u2192"}</button>
          </div>
        </div>
      </div>
    );
  }

  // --- SLIDING PUZZLE PHASE (数字华容道) ---
  if (currentPhase.type === "sliding_puzzle") {
    return (
      <div style={bgStyle}>
        <SlidingPuzzlePhase phase={currentPhase} onScore={award} onComplete={goToNextPhase} />
      </div>
    );
  }

  // --- CLICK POINTS PHASE (点击触发独白 + 渐进式诗句) ---
  // Renders as a popup modal containing the scene image with click-to-circle
  // 找茬-style markers, instruction at the top, and progressive poem reveal.
  if (currentPhase.type === "click_points") {
    return <ClickPointsPhase phase={currentPhase} onScore={award} onComplete={goToNextPhase} />;
  }

  // --- COMIC REVEAL PHASE (连环画：遮盖分格，点击按顺序揭开) ---
  if (currentPhase.type === "comic_reveal") {
    return <ComicRevealPhase phase={currentPhase} onComplete={goToNextPhase} />;
  }

  // --- PREDICT REVEAL (先猜，再对照。没有对错) ---
  if (currentPhase.type === "predict_reveal") {
    return <PredictRevealPhase phase={currentPhase} onScore={award} onComplete={goToNextPhase} />;
  }

  // --- EVIDENCE SELECT (给一个判断，挑出支持它的材料) ---
  if (currentPhase.type === "evidence_select") {
    return <EvidenceSelectPhase phase={currentPhase} onScore={award} onComplete={goToNextPhase} />;
  }

  // --- ECHO PORTAL (第 5 层：把 token 拖进手稿，现实 → 《神曲》) ---
  if (currentPhase.type === "echo_portal") {
    return <EchoPortalPhase phase={currentPhase} onComplete={goToNextPhase} />;
  }

  // --- INFERNO PLACEMENT (刚见过的人，但丁把他们放进了地狱哪一层) ---
  if (currentPhase.type === "inferno_placement") {
    return <InfernoPlacementPhase phase={currentPhase} onScore={award} onComplete={goToNextPhase} />;
  }

  // --- COMEDY ENCOUNTER (同一个人，在《神曲》里重新遇见) ---
  if (currentPhase.type === "comedy_encounter") {
    return <ComedyEncounterPhase phase={currentPhase} onComplete={goToNextPhase} />;
  }

  // --- ESCAPE GAME PHASE (红蓝点逃离) ---
  if (currentPhase.type === "escape_game") {
    return (
      <div style={bgStyle}>
        <EscapeGamePhase
          phase={currentPhase}
          defaultPlayerPortrait={heroPortraitPath(currentPhase.dufu_pose || sceneData.dufu_pose, sceneData.year, eventId)}
          onScore={award}
          onComplete={goToNextPhase} />
      </div>
    );
  }

  // --- MINIGAME PHASE ---
  if (currentPhase.type === "minigame") {
    const items = currentPhase.minigameItems || [];
    const typeLabel = { memory: "\u8BB0\u5FC6\u7FFB\u724C", matching: "\u8FDE\u7EBF\u9898", sorting: "\u6392\u5E8F", puzzle: "\u62FC\u56FE" };
    return (
      <div style={bgStyle}>
        <div style={styles.choiceOverlay}>
          <div style={styles.choicePanel}>
            <h2 style={{ margin: "0 0 12px", fontSize: "clamp(16.0px, 1.389vw, 23.0px)" }}>{"\u{1F3AE} " + (typeLabel[currentPhase.minigameType] || "\u5C0F\u6E38\u620F")}</h2>
            {currentPhase.minigameInstruction && <p style={styles.choiceNarrative}>{currentPhase.minigameInstruction}</p>}
            <p style={{ color: "#999", fontSize: "clamp(12px, 0.903vw, 14.9px)", marginBottom: 16 }}>{"\uFF08\u5C0F\u6E38\u620F\u529F\u80FD\u5F00\u53D1\u4E2D\u2026\u2026\uFF09"}</p>
            {items.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {items.map((item, i) => (
                  <div key={i} style={{ ...styles.explanationBox, margin: 0, textAlign: "center" }}>
                    <div style={{ fontWeight: "bold" }}>{item.left}</div>
                    <div style={{ color: "#888", fontSize: "clamp(11.5px, 0.833vw, 13.8px)" }}>{"\u2194 " + item.right}</div>
                  </div>
                ))}
              </div>
            )}
            <button style={styles.proceedBtn} onClick={goToNextPhase}>{"\u7EE7\u7EED \u2192"}</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================
// SLIDING PUZZLE — 数字华容道 (4x4)
// ============================================================
// phase.puzzles: [{ label, solution: string (15 chars), timeoutSec? }]
// Solution string is the 15 chars in their CORRECT order (row-major,
// with one empty slot at position 15 / bottom-right).
function SlidingPuzzlePhase({ phase, onScore, onComplete }) {
  const puzzles = phase.puzzles || [];
  const [pIdx, setPIdx] = useState(0);
  const [tiles, setTiles] = useState([]); // length 16: chars + 1 null
  const [solved, setSolved] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Build solved order then shuffle by performing N random valid swaps
  // (guarantees a solvable state).
  const buildShuffled = useCallback((solution) => {
    const chars = solution.split("").slice(0, 15);
    const board = [...chars, null];
    let empty = 15;
    for (let i = 0; i < 200; i++) {
      const r = Math.floor(empty / 4);
      const c = empty % 4;
      const neighbors = [];
      if (r > 0) neighbors.push(empty - 4);
      if (r < 3) neighbors.push(empty + 4);
      if (c > 0) neighbors.push(empty - 1);
      if (c < 3) neighbors.push(empty + 1);
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      board[empty] = board[pick];
      board[pick] = null;
      empty = pick;
    }
    return board;
  }, []);

  const startPuzzle = useCallback((idx) => {
    const p = puzzles[idx];
    if (!p) return;
    setTiles(buildShuffled(p.solution));
    setSolved(false);
    setTimeLeft(p.timeoutSec || 300);
  }, [puzzles, buildShuffled]);

  useEffect(() => {
    if (puzzles.length === 0) return;
    startPuzzle(pIdx);
  }, [pIdx, puzzles.length, startPuzzle]);

  // Timer
  useEffect(() => {
    if (solved || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [solved, timeLeft]);

  // Auto-skip on timeout
  const skipPuzzle = useCallback(() => {
    if (pIdx + 1 < puzzles.length) setPIdx(pIdx + 1);
    else onComplete();
  }, [pIdx, puzzles.length, onComplete]);

  useEffect(() => {
    if (!solved && timeLeft === 0 && tiles.length > 0) {
      // Timed out — auto move on (small delay so player sees "时间到")
      const t = setTimeout(skipPuzzle, 1200);
      return () => clearTimeout(t);
    }
  }, [timeLeft, solved, tiles.length, skipPuzzle]);

  const handleTileClick = (i) => {
    if (solved || timeLeft <= 0) return;
    const empty = tiles.indexOf(null);
    const r = Math.floor(i / 4), c = i % 4;
    const er = Math.floor(empty / 4), ec = empty % 4;
    if ((r === er && Math.abs(c - ec) === 1) || (c === ec && Math.abs(r - er) === 1)) {
      const next = [...tiles];
      next[empty] = next[i];
      next[i] = null;
      setTiles(next);
      const currentP = puzzles[pIdx];
      const target = currentP.solution.split("").slice(0, 15);
      const isSolved = target.every((ch, k) => next[k] === ch) && next[15] === null;
      if (isSolved) {
        setSolved(true);
        // 满分 100，每过 1 秒扣 1 分（超时不得分）
        const elapsed = (currentP.timeoutSec || 300) - timeLeft;
        if (onScore) onScore(`puzzle${pIdx}`, timedScore(POINTS.slidingPuzzleMax, elapsed));
      }
    }
  };

  if (puzzles.length === 0) {
    return (
      <div style={styles.choiceOverlay}>
        <div style={styles.choicePanel}>
          <p>{"暂无题目"}</p>
          <button style={styles.proceedBtn} onClick={onComplete}>{"继续 →"}</button>
        </div>
      </div>
    );
  }
  const currentP = puzzles[pIdx];

  return (
    <div style={styles.choiceOverlay}>
      <div style={{ ...styles.choicePanel, maxWidth: 560 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "clamp(16.0px, 1.389vw, 23.0px)" }}>
          {"\u{1F4DC} 数字华容道  "}<span style={{ color: "#888", fontSize: "clamp(12.5px, 0.972vw, 16.1px)" }}>{`(${pIdx + 1}/${puzzles.length})`}</span>
        </h2>
        {currentP.label && <p style={{ color: "#666", fontSize: "clamp(12.5px, 0.972vw, 16.1px)", margin: "4px 0 12px" }}>{currentP.label}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: "clamp(12px, 0.903vw, 14.9px)", color: timeLeft <= 30 ? "#DC3545" : "#666" }}>
            {"⏱ 剩余 "}{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </span>
          <button style={{ ...styles.choiceBtn, fontSize: "clamp(11.5px, 0.833vw, 13.8px)", padding: "4px 12px", margin: 0, width: "auto" }} onClick={skipPuzzle}>
            {"跳过"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, aspectRatio: "1", marginBottom: 16 }}>
          {tiles.map((ch, i) => (
            <button
              key={i}
              onClick={() => handleTileClick(i)}
              style={{
                aspectRatio: "1",
                fontSize: "clamp(19.2px, 1.667vw, 27.6px)",
                fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
                fontWeight: "bold",
                backgroundColor: ch === null ? "transparent" : (solved ? "#D4EDDA" : "#F5E6D3"),
                border: ch === null ? "2px dashed #CCC" : "2px solid #8B7355",
                borderRadius: 4,
                cursor: ch === null || solved ? "default" : "pointer",
                color: "#3E2723",
              }}
            >
              {ch}
            </button>
          ))}
        </div>
        {solved && (
          <div style={{ ...styles.explanationBox, backgroundColor: "#D4EDDA", textAlign: "center" }}>
            <strong>{"✓ 拼出原句："}</strong>
            <div style={{ marginTop: 6, fontSize: "clamp(12.8px, 1.111vw, 18.4px)" }}>{currentP.solution}</div>
          </div>
        )}
        {timeLeft === 0 && !solved && (
          <div style={{ ...styles.explanationBox, backgroundColor: "#FFF3CD", textAlign: "center" }}>
            <strong>{"⏱ 时间到"}</strong>
            <div style={{ marginTop: 6, fontSize: "clamp(12.5px, 0.972vw, 16.1px)", color: "#666" }}>{"原句：" + currentP.solution}</div>
          </div>
        )}
        {(solved || timeLeft === 0) && (
          <button style={styles.proceedBtn} onClick={skipPuzzle}>
            {pIdx + 1 < puzzles.length ? "下一题 →" : "继续 →"}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CLICK POINTS — 画面点击触发独白 + 渐进式诗句
// ============================================================
// phase.points: [{ id, position:{x,y}, label?, text }]
// phase.progressivePoem: [string]  — lines that appear one-by-one once
//   `unlockThreshold` distinct points have been clicked.
// phase.unlockThreshold: number (default 3)
function ClickPointsPhase({ phase, onScore, onComplete }) {
  const startRef = useRef(Date.now());
  const points = phase.points || [];
  const poemLines = phase.progressivePoem || [];
  const threshold = phase.unlockThreshold || 3;
  const imageSrc = phase.image || phase.background;
  const hintIntervalSec = phase.hintIntervalSec || 30;
  const hintDurationSec = phase.hintDurationSec || 3;
  const [clicked, setClicked] = useState(new Set());
  const [activePoint, setActivePoint] = useState(null);
  const [showHint, setShowHint] = useState(false);
  // Fit-to-space scaling: the image shrinks when the poem appears so nothing
  // is ever covered. We measure the available area + image ratio, then size
  // the marker container exactly to the displayed image (keeps % coords true).
  const areaRef = useRef(null);
  const [areaBox, setAreaBox] = useState({ w: 0, h: 0 });
  const [imgRatio, setImgRatio] = useState(16 / 9);
  useEffect(() => {
    if (!areaRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setAreaBox({ w: r.width, h: r.height });
    });
    ro.observe(areaRef.current);
    return () => ro.disconnect();
  }, []);
  const imgW = areaBox.w ? Math.min(areaBox.w, Math.max(120, areaBox.h) * imgRatio) : 0;
  const imgH = imgW / imgRatio;

  // Hint timer: briefly flash unclicked markers every `hintIntervalSec`.
  useEffect(() => {
    const tick = setInterval(() => {
      setShowHint(true);
      setTimeout(() => setShowHint(false), hintDurationSec * 1000);
    }, hintIntervalSec * 1000);
    return () => clearInterval(tick);
  }, [hintIntervalSec, hintDurationSec]);

  const handleClick = (pt) => {
    setActivePoint(pt);
    const next = new Set(clicked);
    next.add(pt.id);
    setClicked(next);
  };

  // Progressive poem: 1st line appears once `threshold` points are clicked,
  // then +1 line per additional click.
  const visibleLines = Math.max(0, clicked.size - threshold + 1);
  const allClicked = clicked.size >= points.length;

  return (
    <div style={cpStyles.overlay}>
      <div style={cpStyles.popup}>
        {/* Header: title + instruction */}
        <div style={cpStyles.header}>
          <h2 style={cpStyles.title}>{phase.title || "\u8BE5\u6BB5\u8BD7\u753B"}</h2>
          {phase.narrative && <p style={cpStyles.narrative}>{phase.narrative}</p>}
          <div style={cpStyles.instructionRow}>
            <span>{"\u{1F441} " + (phase.instruction || "\u70B9\u51FB\u753B\u4E2D\u4E0D\u540C\u4F4D\u7F6E\uFF0C\u542C\u7956\u7236\u5199\u4E0B\u5FC3\u4E2D\u53E5\u5B50")}</span>
            <span style={cpStyles.progress}>
              {"\u5DF2\u53D1\u73B0 "}<strong>{clicked.size}</strong>{" / "}{points.length}
            </span>
          </div>
        </div>

        {/* Image with click-to-circle markers — scales to whatever space the
            poem leaves free; marker container == displayed image exactly. */}
        <div ref={areaRef} style={cpStyles.imageArea}>
          <div style={{ ...cpStyles.imageWrap, width: imgW || "100%", height: imgW ? imgH : "auto" }}>
          <img
            src={asset(imageSrc)}
            alt=""
            style={cpStyles.image}
            onLoad={(e) => {
              const im = e.currentTarget;
              if (im.naturalWidth && im.naturalHeight) setImgRatio(im.naturalWidth / im.naturalHeight);
            }}
          />
          {points.map((pt) => {
            const isClicked = clicked.has(pt.id);
            return (
              <button
                key={pt.id}
                onClick={() => handleClick(pt)}
                style={{
                  position: "absolute",
                  left: pt.position.x + "%",
                  top: pt.position.y + "%",
                  transform: "translate(-50%, -50%)",
                  width: pt.size ?? 64, height: pt.size ?? 64, borderRadius: "50%",
                  border: isClicked ? "4px solid #E74C3C" : "none",
                  backgroundColor: "transparent",
                  cursor: isClicked ? "pointer" : "crosshair",
                  zIndex: 5,
                  boxShadow: isClicked ? "0 0 12px rgba(231,76,60,0.5)" : "none",
                  // Unclicked markers are fully invisible; pulse animation only
                  // runs during the brief hint window every `hintIntervalSec`.
                  animation: isClicked ? "none" : (showHint ? "spotPulse 1.5s ease-out 2" : "none"),
                }}
                title={pt.label || ""}
              />
            );
          })}
          </div>
        </div>

        {/* Progressive 春望 reveal */}
        {visibleLines > 0 && (
          <div style={cpStyles.poemBox}>
            <div style={cpStyles.poemTitle}>{phase.poemTitle || "\u300A\u6625\u671B\u300B"}</div>
            {poemLines.slice(0, visibleLines).map((ln, i) => (
              <div key={i} style={cpStyles.poemLine}>{ln}</div>
            ))}
          </div>
        )}

        {/* Footer: continue */}
        {allClicked ? (
          <button
            onClick={() => {
              // 图片找点：满分 50，每过 1 秒扣 1 分
              const elapsed = Math.round((Date.now() - startRef.current) / 1000);
              if (onScore) onScore("clickpoints", timedScore(POINTS.clickPointsMax, elapsed));
              onComplete();
            }}
            style={cpStyles.continueBtn}>
            {"\u7EE7\u7EED \u2192"}
          </button>
        ) : (
          <div style={cpStyles.hint}>
            {clicked.size < threshold
              ? `\u518D\u70B9 ${threshold - clicked.size} \u5904\uFF0C${phase.poemTitle || "\u300A\u6625\u671B\u300B"}\u5C06\u7F13\u7F13\u6D6E\u73B0\u2026`
              : "\u7EE7\u7EED\u70B9\u51FB\u672A\u53D1\u73B0\u7684\u4F4D\u7F6E\u2026"}
          </div>
        )}
      </div>

      {/* Active text bubble — pops up after each click */}
      {activePoint && (
        <div
          onClick={() => setActivePoint(null)}
          style={cpStyles.bubbleOverlay}
        >
          <div style={cpStyles.bubble} onClick={(e) => e.stopPropagation()}>
            {activePoint.label && <div style={cpStyles.bubbleLabel}>{activePoint.label}</div>}
            <div style={cpStyles.bubbleText}>{nb(activePoint.text)}</div>
            <button onClick={() => setActivePoint(null)} style={cpStyles.bubbleClose}>{"\u77E5\u9053\u4E86"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMIC REVEAL — 连环画分格：全图遮盖，按顺序揭开（点击 like PPT，
// 或 autoAdvanceSec 秒后自动揭下一格；有台词的格子先点完台词）
// ============================================================
// phase.panels: [{ id, x, y, w, h (percent), dialogues?: [{speaker, speakerName, text}] }]
// phase.autoAdvanceSec: number (optional) — auto-reveal delay; clicking always works.
function ComicRevealPhase({ phase, onComplete }) {
  const panels = phase.panels || [];
  const imageSrc = phase.image || phase.background;
  const autoSec = phase.autoAdvanceSec || 0;
  const [revealed, setRevealed] = useState(0); // how many panels are visible
  const [lineIdx, setLineIdx] = useState(0);   // dialogue line within current panel

  const currentPanel = revealed > 0 ? panels[revealed - 1] : null;
  const lines = (currentPanel && currentPanel.dialogues) || [];
  const pendingLines = revealed > 0 && lineIdx < lines.length;
  const allDone = revealed >= panels.length && !pendingLines;

  const advance = useCallback(() => {
    if (pendingLines) { setLineIdx((i) => i + 1); return; }
    if (revealed < panels.length) { setRevealed((r) => r + 1); setLineIdx(0); }
  }, [pendingLines, revealed, panels.length]);

  // Auto-advance: only when no dialogue lines are waiting to be read.
  useEffect(() => {
    if (!autoSec || allDone || pendingLines) return;
    const t = setTimeout(advance, autoSec * 1000);
    return () => clearTimeout(t);
  }, [autoSec, allDone, pendingLines, advance, revealed, lineIdx]);

  const activeLine = pendingLines ? lines[lineIdx] : null;

  // Fullscreen, immersive — same 16:9 locked stage as explore scenes.
  // The comic IS the background; covers fade out in place. No card, no chrome.
  return (
    <div style={styles.sceneOuter} onClick={allDone ? undefined : advance}>
      <div style={{
        ...styles.sceneStageInner,
        backgroundImage: `url(${asset(imageSrc)})`,
        cursor: allDone ? "default" : "pointer",
      }}>
        {/* Covers — fade away one by one */}
        {panels.map((p, i) => (
          <div key={p.id || i} style={{
            position: "absolute",
            left: p.x + "%", top: p.y + "%",
            width: p.w + "%", height: p.h + "%",
            backgroundColor: "#15100B",
            opacity: i < revealed ? 0 : 1,
            transition: "opacity 0.9s ease",
            pointerEvents: "none",
          }} />
        ))}

        {/* Subtle progress in the corner */}
        <div style={{
          position: "absolute", top: 12, right: 16, zIndex: 30,
          color: "rgba(245,230,211,0.75)", fontSize: "clamp(12px, 0.903vw, 14.9px)", letterSpacing: 2,
          textShadow: "0 1px 4px #000",
        }}>
          {revealed}{" / "}{panels.length}
        </div>

        {/* Dialogue line for the just-revealed panel — bottom bar */}
        {activeLine && (
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 30,
            backgroundColor: "rgba(20,12,6,0.88)",
            borderTop: "1px solid rgba(212,165,116,0.45)",
            padding: "16px 32px 18px",
            textAlign: "left",
          }}>
            {activeLine.speakerName && (
              <div style={{ color: "#D4A574", fontSize: "clamp(12px, 0.903vw, 14.9px)", fontWeight: "bold", letterSpacing: 2, marginBottom: 6 }}>
                {activeLine.speakerName}
              </div>
            )}
            <div style={{ color: "#F5E6D3", fontSize: "clamp(12.8px, 1.111vw, 18.4px)", lineHeight: 1.8, fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif" }}>
              {nb(activeLine.text)}
            </div>
            <div style={{ color: "#A89968", fontSize: "clamp(11px, 0.764vw, 12.6px)", marginTop: 6, textAlign: "right" }}>{"▼ 点击继续"}</div>
          </div>
        )}

        {/* Finished → continue */}
        {allDone && (
          <button
            style={styles.floatingProceed}
            onClick={(e) => { e.stopPropagation(); onComplete(); }}>
            {"继续 →"}
          </button>
        )}
      </div>
    </div>
  );
}

const cpStyles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 250,
    backgroundColor: "rgba(0,0,0,0.75)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    padding: 20,
  },
  popup: {
    backgroundColor: "#F5E6D3",
    borderRadius: 12,
    maxWidth: "min(900px, 95vw)",
    width: "100%",
    height: "calc(var(--vh100) - 24px)",
    overflow: "hidden", // never scroll — the image scales down instead
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    display: "flex", flexDirection: "column",
  },
  header: {
    padding: "16px 24px 12px",
    borderBottom: "1px solid #D4A574",
    flexShrink: 0,
  },
  title: {
    margin: "0 0 4px", fontSize: "clamp(17.6px, 1.528vw, 25.3px)", color: "#3E2723",
    letterSpacing: 2,
  },
  narrative: {
    margin: "0 0 8px", fontSize: "clamp(12px, 0.903vw, 14.9px)", color: "#6B5340", lineHeight: 1.6,
  },
  instructionRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: "clamp(12px, 0.903vw, 14.9px)", color: "#8B7355",
  },
  progress: { color: "#3E2723" },
  imageArea: {
    flex: "1 1 auto", minHeight: 120,
    margin: "12px 16px",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  imageWrap: {
    position: "relative",
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
    lineHeight: 0,
    flexShrink: 0,
  },
  image: { width: "100%", height: "100%", display: "block" },
  poemBox: {
    margin: "8px 24px 12px",
    padding: "12px 16px",
    backgroundColor: "rgba(212,165,116,0.18)",
    borderLeft: "4px solid #D4A574",
    borderRadius: 4,
    textAlign: "center",
    flexShrink: 0,
  },
  poemTitle: {
    fontSize: "clamp(12.5px, 0.972vw, 16.1px)", color: "#8B7355", marginBottom: 6, letterSpacing: 2,
  },
  poemLine: {
    fontSize: "clamp(14.4px, 1.25vw, 20.7px)", color: "#3E2723", lineHeight: 1.8, letterSpacing: 2,
  },
  continueBtn: {
    flexShrink: 0,
    margin: "8px 24px 20px",
    padding: "12px 0", fontSize: "clamp(12.8px, 1.111vw, 18.4px)", fontWeight: "bold",
    backgroundColor: "#8B7355", color: "#FFF", border: "none", borderRadius: 6,
    cursor: "pointer", fontFamily: "inherit",
  },
  hint: {
    margin: "8px 24px 20px",
    fontSize: "clamp(12px, 0.903vw, 14.9px)", color: "#8B7355", textAlign: "center", fontStyle: "italic",
    flexShrink: 0,
  },
  bubbleOverlay: {
    position: "fixed", inset: 0, zIndex: 260,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  bubble: {
    backgroundColor: "#FFF8EE", padding: "20px 28px", borderRadius: 8,
    maxWidth: 480, width: "85%",
    boxShadow: "0 6px 32px rgba(0,0,0,0.6)",
    border: "2px solid #D4A574",
    cursor: "default",
  },
  bubbleLabel: { fontSize: "clamp(11.5px, 0.833vw, 13.8px)", color: "#999", marginBottom: 8, letterSpacing: 1 },
  bubbleText: {
    fontSize: "clamp(14.4px, 1.25vw, 20.7px)", color: "#3E2723", lineHeight: 1.8, letterSpacing: 1,
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
  },
  bubbleClose: {
    marginTop: 16, padding: "11px 26px", minHeight: 42, fontSize: "clamp(12.5px, 0.972vw, 16.1px)",
    backgroundColor: "#8B7355", color: "#FFF", border: "none", borderRadius: 4,
    cursor: "pointer", float: "right", fontFamily: "inherit",
  },
}

// ============================================================
// ESCAPE GAME — Pac-Man style 长安出城
// ============================================================
// phase: {
//   gridW, gridH,
//   start: {x,y}, end: {x,y},
//   cells: [{ x, y, w?, h?, label?, blocking?, fill? }]   // merged labeled buildings
//   arrows: [{ x, y, dir: "up"|"down"|"left"|"right" }]    // forces guard direction
//   gates:  [{ x, y, label }]                              // text label on a street cell
//   guards: [{ x, y, dir, portrait? }]                     // patrol with direction
//   soldierPortraits: [string]                             // pool used if guard has no portrait
//   chaseRadius?, tickMs?, playerPortrait?, mapBackground?
// }
function EscapeGamePhase({ phase, defaultPlayerPortrait, onScore, onComplete }) {
  const startRef = useRef(Date.now());
  // The legacy hero portrait.webp is remapped to the stage default.
  const playerPortrait =
    phase.playerPortrait && !isLegacyHeroPortrait(phase.playerPortrait)
      ? phase.playerPortrait
      : defaultPlayerPortrait;
  const gridW = phase.gridW || 13;
  const gridH = phase.gridH || 14;
  const tickMs = phase.tickMs || 300;
  const cells = phase.cells || [];
  const arrows = phase.arrows || [];
  const gates = phase.gates || [];
  const portraitPool = phase.soldierPortraits || [];

  // ---- Lookup tables --------------------------------------------------------
  // Map each (x,y) to its parent blocking cell (if any). Multi-tile labels
  // mark every covered cell as blocking, but only the top-left renders the
  // label/background.
  const blockMap = new Map();
  const ownerMap = new Map(); // (x,y) -> the cell object that covers it
  cells.forEach((c) => {
    const w = c.w || 1, h = c.h || 1;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const key = (c.x + dx) + "," + (c.y + dy);
        if (c.blocking !== false) blockMap.set(key, true);
        ownerMap.set(key, c);
      }
    }
  });
  const arrowMap = new Map();
  arrows.forEach((a) => arrowMap.set(a.x + "," + a.y, a.dir));
  const gateMap = new Map();
  gates.forEach((g) => gateMap.set(g.x + "," + g.y, g.label));

  const isBlocked = (x, y) => {
    if (x < 0 || y < 0 || x >= gridW || y >= gridH) return true;
    // Start & exit tiles are always enterable, even if a building cell was
    // accidentally painted over them in the editor — guarantees the game can
    // always start correctly and finish at the exit.
    if (phase.end && x === phase.end.x && y === phase.end.y) return false;
    if (phase.start && x === phase.start.x && y === phase.start.y) return false;
    return blockMap.has(x + "," + y);
  };
  const stepDir = (dir) => {
    if (dir === "up")    return { dx:  0, dy: -1 };
    if (dir === "down")  return { dx:  0, dy:  1 };
    if (dir === "left")  return { dx: -1, dy:  0 };
    if (dir === "right") return { dx:  1, dy:  0 };
    return { dx: 0, dy: 0 };
  };
  const reverseDir = (d) => ({ up: "down", down: "up", left: "right", right: "left" }[d] || d);

  // ---- Guard factory --------------------------------------------------------
  // Each guard is given a deterministic portrait index so it doesn't flicker
  // every tick. If the guard has its own `portrait` field, that wins.
  const buildGuards = useCallback(() => (phase.guards || []).map((g, i) => ({
    pos: { x: g.x, y: g.y },
    dir: g.dir || "right",
    portrait: g.portrait || (portraitPool.length ? portraitPool[i % portraitPool.length] : null),
  })), [phase.guards, portraitPool]);

  const [player, setPlayer] = useState({ ...phase.start });
  const [guards, setGuards] = useState(buildGuards);
  const [won, setWon] = useState(false);
  const [deaths, setDeaths] = useState(0);
  // 守卫追踪用 ref 读玩家位置——守卫的移动节拍完全独立，
  // 不再因玩家按键而重置（原来玩家一直动守卫就几乎不动）。
  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; }, [player]);

  // 统一的移动入口：键盘 / 屏幕方向键 / 滑动 都走这里
  const movePlayer = (dir) => {
    if (won) return;
    const { dx, dy } = stepDir(dir);
    setPlayer((p) => {
      const nx = p.x + dx, ny = p.y + dy;
      if (isBlocked(nx, ny)) return p;
      return { x: nx, y: ny };
    });
  };

  // 屏幕方向键长按连走
  const holdRef = useRef(null);
  const stopHold = () => { if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; } };
  const startHold = (dir) => {
    stopHold();
    movePlayer(dir);
    holdRef.current = setInterval(() => movePlayer(dir), 160);
  };
  useEffect(() => () => stopHold(), []);

  // 触屏滑动
  const swipeRef = useRef(null);

  const resetGame = useCallback(() => {
    setPlayer({ ...phase.start });
    setGuards(buildGuards());
    setWon(false);
  }, [phase.start, buildGuards]);

  // Always (re)spawn at the configured start whenever the board data changes
  // (covers hot data reloads / phase reuse — player can never begin off-start).
  useEffect(() => {
    setPlayer({ ...phase.start });
    setGuards(buildGuards());
    setWon(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.start.x, phase.start.y, gridW, gridH]);

  // ---- Player input (arrows / WASD) ----------------------------------------
  useEffect(() => {
    const onKey = (e) => {
      if (won) return;
      let dir = null;
      if (e.key === "ArrowUp"    || e.key === "w") dir = "up";
      else if (e.key === "ArrowDown"  || e.key === "s") dir = "down";
      else if (e.key === "ArrowLeft"  || e.key === "a") dir = "left";
      else if (e.key === "ArrowRight" || e.key === "d") dir = "right";
      if (!dir) return;
      e.preventDefault();
      movePlayer(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, gridW, gridH, cells]);

  // ---- Guard tick: Pac-Man tracks + close-range pursuit --------------------
  useEffect(() => {
    if (won) return;
    const chaseRadius = phase.chaseRadius || 0;
    const t = setInterval(() => {
      setGuards((gs) => gs.map((g) => {
        let dir = g.dir;
        // Close-range pursuit: if player is within chaseRadius (in
        // Chebyshev distance), head toward them on the longer axis first,
        // overriding the patrol track. This lets guards "see" and chase.
        const pp = playerRef.current;
        if (chaseRadius > 0) {
          const adx = Math.abs(pp.x - g.pos.x);
          const ady = Math.abs(pp.y - g.pos.y);
          if (Math.max(adx, ady) <= chaseRadius) {
            if (adx >= ady) {
              dir = pp.x > g.pos.x ? "right" : (pp.x < g.pos.x ? "left" : dir);
            } else {
              dir = pp.y > g.pos.y ? "down" : (pp.y < g.pos.y ? "up" : dir);
            }
          }
        }
        // If current cell has an arrow AND we're not chasing, take the arrow.
        if (chaseRadius === 0 || Math.max(Math.abs(pp.x - g.pos.x), Math.abs(pp.y - g.pos.y)) > chaseRadius) {
          const overrideAtCurrent = arrowMap.get(g.pos.x + "," + g.pos.y);
          if (overrideAtCurrent) dir = overrideAtCurrent;
        }
        // Step. If blocked, reverse direction.
        const { dx, dy } = stepDir(dir);
        let nx = g.pos.x + dx, ny = g.pos.y + dy;
        if (isBlocked(nx, ny)) {
          dir = reverseDir(dir);
          const r = stepDir(dir);
          nx = g.pos.x + r.dx; ny = g.pos.y + r.dy;
          if (isBlocked(nx, ny)) return { ...g, dir };
        }
        return { ...g, pos: { x: nx, y: ny }, dir };
      }));
    }, tickMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, tickMs]);

  // ---- Collision + win ------------------------------------------------------
  useEffect(() => {
    if (won) return;
    if (player.x === phase.end.x && player.y === phase.end.y) {
      setWon(true);
      // 出逃：满分 50，每过 1 秒扣 1 分，被抓一次额外扣 10 分
      const elapsed = Math.round((Date.now() - startRef.current) / 1000);
      if (onScore) onScore("escape", timedScore(POINTS.escapeMax, elapsed, deaths * POINTS.escapeCaughtPenalty));
      return;
    }
    if (guards.some((g) => g.pos.x === player.x && g.pos.y === player.y)) {
      setDeaths((d) => d + 1);
      setPlayer({ ...phase.start });
      setGuards(buildGuards());
    }
  }, [player, guards, won, phase.end, phase.start, buildGuards]);

  // ---- Render ---------------------------------------------------------------
  // Board always fits the popup: measure the available area and derive an
  // exact pixel cell size (immune to window/display scaling \u2014 the whole
  // board, including the exit, is always visible).
  const boardRef = useRef(null);
  const [boardBox, setBoardBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!boardRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBoardBox({ w: r.width, h: r.height });
    });
    ro.observe(boardRef.current);
    return () => ro.disconnect();
  }, []);
  const cell = boardBox.w
    ? Math.max(12, Math.floor(Math.min((boardBox.w - 8) / gridW, (boardBox.h - 8) / gridH)))
    : 24;
  const cellPx = cell + "px";
  const arrowGlyph = { up: "\u2191", down: "\u2193", left: "\u2190", right: "\u2192" };

  return (
    <div style={egStyles.overlay}>
      <div style={egStyles.popup}>
        <h2 style={egStyles.title}>{"\u{1F6AA} \u51FA\u57CE\uFF1A\u907F\u5F00\u5B88\u536B"}</h2>
        {phase.narrative && <p style={egStyles.narrative}>{phase.narrative}</p>}
        <div style={egStyles.statusRow}>
          <span>{"\u65B9\u5411\u952E / WASD / \u5C4F\u5E55\u6309\u952E / \u6ED1\u52A8\u68CB\u76D8 \u79FB\u52A8 \u00B7 \u6D45\u8272\uFF1D\u8857\u9053\u53EF\u8D70 \u00B7 \u6DF1\u8272\uFF1D\u574A\u5899\u4E0D\u53EF\u8D70 \u00B7 \u9047\u5B88\u536B\u56DE\u8D77\u70B9 \u00B7 \u62B5\u8FBE\u91D1\u5149\u95E8\u80DC\u5229"}</span>
          <span style={{ color: "#DC3545" }}>{"\u88AB\u6293\uFF1A" + deaths}</span>
          <button onClick={resetGame} style={egStyles.restartBtn}>{"\u91CD\u65B0\u5F00\u59CB"}</button>
        </div>

        <div
          ref={boardRef}
          style={{
            flex: "1 1 auto", minHeight: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            touchAction: "none", // 阻止页面滚动，让滑动只控制角色
          }}
          onTouchStart={(e) => {
            swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }}
          onTouchEnd={(e) => {
            const s = swipeRef.current;
            swipeRef.current = null;
            if (!s) return;
            const dx = e.changedTouches[0].clientX - s.x;
            const dy = e.changedTouches[0].clientY - s.y;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; // 太短不算滑动
            movePlayer(Math.abs(dx) > Math.abs(dy)
              ? (dx > 0 ? "right" : "left")
              : (dy > 0 ? "down" : "up"));
          }}
        >
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridW}, ${cellPx})`,
          gridTemplateRows: `repeat(${gridH}, ${cellPx})`,
          gap: 0, // continuous streets — corridors read as wide Pac-Man lanes
          justifyContent: "center",
          backgroundColor: "#5D4037",
          padding: 4, borderRadius: 4,
          margin: "0 auto",
          position: "relative",
          flexShrink: 0,
        }}>
          {/* Render street cells first */}
          {Array.from({ length: gridW * gridH }).map((_, i) => {
            const x = i % gridW, y = Math.floor(i / gridW);
            const isStart = x === phase.start.x && y === phase.start.y;
            const isEnd = x === phase.end.x && y === phase.end.y;
            const blocked = blockMap.has(x + "," + y);
            const arrow = arrowMap.get(x + "," + y);
            const gate = gateMap.get(x + "," + y);

            if (blocked) {
              // Only render the top-left tile of a merged building. Covered
              // tiles render nothing — every cell below is explicitly placed
              // via gridColumn/gridRow, so auto-flow can never shift the board.
              const owner = ownerMap.get(x + "," + y);
              if (owner && (owner.x !== x || owner.y !== y)) {
                return null;
              }
              return (
                <div key={i} style={{
                  gridColumn: `${x + 1} / span ${(owner?.w) || 1}`,
                  gridRow: `${y + 1} / span ${(owner?.h) || 1}`,
                  // Flush tiles — no margins/seams, so the ONLY light areas are
                  // real walkable streets. Dark = wall, light = road, period.
                  backgroundColor: owner?.fill || "#A98F6C",
                  border: "1px solid #8B7355",
                  borderRadius: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  textAlign: "center",
                  fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
                  color: "#3E2723",
                  fontSize: "min(1.2vw, 14px)", fontWeight: "bold",
                  letterSpacing: 1, lineHeight: 1.2,
                  whiteSpace: "pre-wrap",
                }}>
                  {owner?.label || ""}
                </div>
              );
            }

            // Street cell (walkable) — kept clearly lighter than buildings/walls
            let bg = "#FBF5E6";
            if (isEnd) bg = "#90EE90";
            if (isStart) bg = "#FFD580";
            return (
              <div key={i} style={{
                gridColumn: `${x + 1} / span 1`,
                gridRow: `${y + 1} / span 1`,
                backgroundColor: bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
                fontSize: "clamp(8.0px, 0.694vw, 11.5px)", color: "#888",
              }}>
                {arrow && (
                  <span style={{ color: "#3498DB", fontSize: "min(2vw, 22px)", fontWeight: "bold", opacity: 0.7 }}>
                    {arrowGlyph[arrow] || ""}
                  </span>
                )}
                {gate && (
                  <span style={{ position: "absolute", top: 1, left: 2, fontSize: "clamp(7.2px, 0.625vw, 10.3px)", color: "#666", whiteSpace: "nowrap" }}>
                    {gate}
                  </span>
                )}
                {isEnd && !arrow && <span style={{ fontSize: "clamp(7.2px, 0.625vw, 10.3px)", color: "#1B5E20", fontWeight: "bold" }}>{"\u51FA\u95E8"}</span>}
                {isStart && !arrow && <span style={{ fontSize: "clamp(7.2px, 0.625vw, 10.3px)", color: "#E65100", fontWeight: "bold" }}>{"\u8D77\u70B9"}</span>}
              </div>
            );
          })}

          {/* Player overlay (absolute over the grid) */}
          <div style={{
            position: "absolute",
            left: `calc(4px + (${player.x} + 0.5) * ${cellPx})`,
            top:  `calc(4px + (${player.y} + 0.5) * ${cellPx})`,
            transform: "translate(-50%, -50%)",
            width: `calc(${cellPx} * 0.72)`,
            height: `calc(${cellPx} * 0.72)`,
            borderRadius: "50%",
            backgroundColor: playerPortrait ? "transparent" : "#E74C3C",
            backgroundImage: playerPortrait ? `url(${asset(playerPortrait)})` : "none",
            backgroundSize: "cover", backgroundPosition: "center top",
            border: "2px solid #FFF",
            boxShadow: "0 0 8px rgba(231,76,60,0.7)",
            zIndex: 20, transition: "left 0.12s linear, top 0.12s linear",
            pointerEvents: "none",
          }} />

          {/* Guards overlay */}
          {guards.map((g, i) => (
            <div key={i} style={{
              position: "absolute",
              left: `calc(4px + (${g.pos.x} + 0.5) * ${cellPx})`,
              top:  `calc(4px + (${g.pos.y} + 0.5) * ${cellPx})`,
              transform: "translate(-50%, -50%)",
              width: `calc(${cellPx} * 0.75)`,
              height: `calc(${cellPx} * 0.75)`,
              borderRadius: "50%",
              backgroundColor: g.portrait ? "transparent" : "#3498DB",
              backgroundImage: g.portrait ? `url(${asset(g.portrait)})` : "none",
              backgroundSize: "cover", backgroundPosition: "center top",
              border: "2px solid #1F4E79",
              boxShadow: "0 0 6px rgba(52,152,219,0.65)",
              zIndex: 15,
              transition: `left ${tickMs}ms linear, top ${tickMs}ms linear`,
              pointerEvents: "none",
            }} />
          ))}
        </div>
        </div>

        {/* 屏幕方向键（触屏/无键盘设备用；支持长按连走） */}
        {!won && (
          <div style={egStyles.dpad}>
            {[
              { dir: "up", glyph: "▲", area: "up" },
              { dir: "left", glyph: "◀", area: "left" },
              { dir: "right", glyph: "▶", area: "right" },
              { dir: "down", glyph: "▼", area: "down" },
            ].map((b) => (
              <button
                key={b.dir}
                style={{ ...egStyles.dpadBtn, gridArea: b.area }}
                onPointerDown={(e) => { e.preventDefault(); startHold(b.dir); }}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onContextMenu={(e) => e.preventDefault()}
              >
                {b.glyph}
              </button>
            ))}
          </div>
        )}

        {won && (
          <>
            <div style={{ ...egStyles.win }}>
              <strong>{"\u2713 \u51FA\u57CE\u6210\u529F\uFF01"}</strong>
              {phase.conclusion && <div style={{ marginTop: 6 }}>{phase.conclusion}</div>}
            </div>
            <button style={egStyles.continueBtn} onClick={onComplete}>{"\u7EE7\u7EED \u2192"}</button>
          </>
        )}
      </div>
    </div>
  );
}

const egStyles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 240,
    backgroundColor: "rgba(0,0,0,0.78)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    padding: 16, overflow: "auto",
  },
  popup: {
    backgroundColor: "#F5E6D3", borderRadius: 12, padding: "16px 20px",
    width: "min(95vw, 980px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    textAlign: "center",
    // Fixed height + flex column: the board area is measured and the cell
    // size derived from it, so the full maze (incl. exit) always fits —
    // no clipping at any window size / display scaling.
    height: "calc(var(--vh100) - 24px)", overflow: "hidden",
    display: "flex", flexDirection: "column",
    position: "relative", // 方向键锚点
  },
  dpad: {
    position: "absolute",
    right: 18,
    bottom: 18,
    display: "grid",
    gridTemplateAreas: `". up ." "left . right" ". down ."`,
    gridTemplateColumns: "48px 48px 48px",
    gridTemplateRows: "48px 48px 48px",
    gap: 4,
    zIndex: 30,
    opacity: 0.88,
  },
  dpadBtn: {
    width: 48, height: 48,
    borderRadius: 10,
    border: "1px solid #8B7355",
    backgroundColor: "rgba(255,252,244,0.92)",
    color: "#5A4A32",
    fontSize: "clamp(12.8px, 1.111vw, 18.4px)",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
  },
  title: { margin: "0 0 4px", fontSize: "clamp(17.6px, 1.528vw, 25.3px)", color: "#3E2723", letterSpacing: 2 },
  narrative: { margin: "0 0 8px", fontSize: "clamp(12px, 0.903vw, 14.9px)", color: "#6B5340" },
  statusRow: {
    fontSize: "clamp(11.5px, 0.833vw, 13.8px)", color: "#666", marginBottom: 10,
    display: "flex", gap: 16, justifyContent: "center", alignItems: "center",
    flexWrap: "wrap",
  },
  restartBtn: {
    fontSize: "clamp(12px, 0.833vw, 13.8px)", padding: "9px 16px", border: "1px solid #999",
    borderRadius: 4, backgroundColor: "#FFF", cursor: "pointer",
    fontFamily: "inherit",
  },
  win: {
    marginTop: 16, padding: 12, backgroundColor: "#D4EDDA",
    color: "#155724", borderRadius: 6,
  },
  continueBtn: {
    marginTop: 12, padding: "12px 32px", fontSize: "clamp(12.8px, 1.111vw, 18.4px)", fontWeight: "bold",
    backgroundColor: "#8B7355", color: "#FFF", border: "none", borderRadius: 6,
    cursor: "pointer", fontFamily: "inherit",
  },
};


// Inject pulse keyframes for ClickPointsPhase markers
if (typeof document !== "undefined" && !document.getElementById("click-point-keyframes")) {
  const style = document.createElement("style");
  style.id = "click-point-keyframes";
  style.textContent = `
    @keyframes clickPointPulse {
      0% { box-shadow: 0 0 0 0 rgba(231,76,60,0.6); }
      100% { box-shadow: 0 0 0 18px rgba(231,76,60,0); }
    }
    @keyframes spotPulse {
      0%   { box-shadow: 0 0 0 0   rgba(231,76,60,0.55); }
      70%  { box-shadow: 0 0 0 12px rgba(231,76,60,0);   }
      100% { box-shadow: 0 0 0 0   rgba(231,76,60,0);    }
    }
  `;
  document.head.appendChild(style);
}

// ============================================================
// 认知动词 · COGNITIVE VERBS
// ============================================================
// 原则：每一个 interaction 都把一个认知动作外化——
// 预测 / 观察 / 归类 / 连接 / 解释 / 修正 / 重建。
// 不是「点一下、读一段」，而是「先做出一个判断，再拿它去撞史实」。
// 见 docs/DESIGN_VERBS.md；编排由 scripts/lint_phases.mjs 把关。

// ============================================================
// PREDICT REVEAL — 先猜，再对照。没有对错。
// ============================================================
// phase.situation / question / options[{id,text}] / actual(optionId)
//       reveal(他的原话) / consequence(后来怎样) / sameNote / diffNote
// 关键：玩家的预测不是答题，是给后面的解释造一个锚点。
// 所以界面上没有 ✓ ✗，只有「你猜」和「他做的」并排放着。
function PredictRevealPhase({ phase, onScore, onComplete }) {
  const options = phase.options || [];
  const [mine, setMine] = useState(null);
  const [step, setStep] = useState(0); // 0 选 · 1 并列 · 2 后果
  const reduced = usePrefersReducedMotion();

  const actual = options.find((o) => o.id === phase.actual) || options[0];
  const chosen = options.find((o) => o.id === mine);
  const same = mine && mine === phase.actual;

  const commit = (id) => {
    setMine(id);
    setStep(1);
    // 分数奖励「敢下判断」这个动作本身，猜对猜错一样多——
    // 一旦按对错给分，玩家就会退回到揣摩标准答案。
    if (onScore) onScore("predict", POINTS.predict);
  };

  return (
    <div style={styles.sceneOuter}>
      <div style={{ ...styles.sceneStageInner, backgroundImage: `url(${asset(phase.background)})` }}>
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(12,8,5,0.58)" }} />

        <div style={prStyles.wrap}>
          {phase.situation && <div style={prStyles.situation}>{nb(phase.situation)}</div>}
          <div style={prStyles.question}>{nb(phase.question || "他会怎么做？")}</div>

          {step === 0 && (
            <>
              <div style={prStyles.opts}>
                {options.map((o) => (
                  <button key={o.id} style={prStyles.opt} onClick={() => commit(o.id)}>
                    {nb(o.text)}
                  </button>
                ))}
              </div>
              <div style={prStyles.hint}>{"先猜一个。猜错没有惩罚——猜过之后再看，才记得住。"}</div>
            </>
          )}

          {step >= 1 && (
            <>
              <div style={prStyles.duo}>
                <div style={{ ...prStyles.card, borderColor: "rgba(201,168,106,0.4)" }}>
                  <div style={prStyles.cardLabel}>{"你猜"}</div>
                  <div style={prStyles.cardText}>{nb(chosen ? chosen.text : "")}</div>
                </div>
                <div style={{ ...prStyles.card, borderColor: "#C9A86A", backgroundColor: "rgba(246,236,214,0.96)" }}>
                  <div style={{ ...prStyles.cardLabel, color: "#C9A86A" }}>{phase.himLabel || "他做的"}</div>
                  <div style={prStyles.cardText}>{nb(actual.text)}</div>
                </div>
              </div>

              <div style={prStyles.note}>
                {nb(same
                  ? (phase.sameNote || "你猜对了。但要紧的不是猜对——是他为什么这么选。")
                  : (phase.diffNote || "你和他选了不一样的。看看他的理由——"))}
              </div>

              {step === 1 && (
                <>
                  {phase.reveal && (
                    <RevealLines text={phase.reveal} style={prStyles.reveal} unitDelay={700}
                      skip={reduced} onDone={() => {}} />
                  )}
                  <button style={prStyles.go} onClick={() => setStep(2)}>{"后来呢 →"}</button>
                </>
              )}

              {step === 2 && (
                <>
                  {phase.reveal && <div style={prStyles.reveal}>{nb(phase.reveal)}</div>}
                  {phase.consequence && (
                    <div style={prStyles.consequence}>{nb(phase.consequence)}</div>
                  )}
                  <button style={prStyles.go} onClick={onComplete}>{"继续 →"}</button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const prStyles = {
  wrap: {
    position: "absolute", inset: 0, zIndex: 20,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "4% 9%", textAlign: "center", gap: 14, overflowY: "auto",
    // 内容不直接浮在底图上：一层从中心向外收干净的纸色暗底，托住文字又看不出方块
    background: "radial-gradient(ellipse 70% 78% at 50% 50%, rgba(10,7,4,0.82) 0%, rgba(10,7,4,0.62) 55%, rgba(10,7,4,0) 100%)",
  },
  situation: {
    color: "#E2D3B4", fontSize: "clamp(12.5px, 1.0vw, 16.5px)", lineHeight: 1.9, letterSpacing: 1,
    maxWidth: 760, textShadow: "0 2px 10px rgba(0,0,0,0.95)",
  },
  question: {
    color: "#F5E6D3", fontSize: "clamp(16px, 1.46vw, 24px)", letterSpacing: 4,
    textShadow: "0 2px 12px rgba(0,0,0,0.9)",
  },
  opts: { display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 560 },
  opt: {
    padding: "13px 20px", borderRadius: 10,
    backgroundColor: "rgba(252,248,238,0.94)", color: "#3A2E20",
    border: "1px solid #C9A86A", cursor: "pointer",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    fontSize: "clamp(13px, 1.11vw, 18.4px)", lineHeight: 1.7, letterSpacing: 1,
  },
  hint: { color: "rgba(245,230,211,0.62)", fontSize: "clamp(11px, 0.79vw, 13px)", letterSpacing: 2 },
  duo: { display: "flex", gap: 14, width: "100%", maxWidth: 720, justifyContent: "center", flexWrap: "wrap" },
  card: {
    flex: "1 1 260px", minWidth: 220, padding: "12px 16px",
    backgroundColor: "rgba(252,248,238,0.9)", border: "2px solid", borderRadius: 10, textAlign: "left",
  },
  cardLabel: { fontSize: "clamp(10px, 0.72vw, 12px)", color: "#8A7A5E", letterSpacing: 4, marginBottom: 5 },
  cardText: { fontSize: "clamp(12.5px, 1.04vw, 17.2px)", color: "#2B2118", lineHeight: 1.7 },
  note: { color: "#C9A86A", fontSize: "clamp(12px, 0.94vw, 15.5px)", letterSpacing: 2, textShadow: "0 1px 8px rgba(0,0,0,0.9)" },
  reveal: {
    color: "#F5E6D3", fontSize: "clamp(13.5px, 1.25vw, 20.7px)", lineHeight: 2.0, letterSpacing: 2,
    maxWidth: 700, textShadow: "0 2px 12px rgba(0,0,0,0.9)",
  },
  consequence: {
    color: "#D8C8A8", fontSize: "clamp(12px, 0.97vw, 16px)", lineHeight: 1.9, maxWidth: 700,
    borderTop: "1px solid rgba(201,168,106,0.3)", paddingTop: 12,
    textShadow: "0 2px 10px rgba(0,0,0,0.9)",
  },
  go: { ...{}, padding: "10px 26px", borderRadius: 22, border: "1px solid #C9A86A",
    backgroundColor: "rgba(252,248,238,0.92)", color: "#3A2E20", cursor: "pointer",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    fontSize: "clamp(12px, 1.04vw, 17.2px)", letterSpacing: 2, marginTop: 4 },
};

// ============================================================
// EVIDENCE SELECT — 给一个判断，挑出支持它的材料
// ============================================================
// phase.claim / instruction / pick(要选几条) / items[{id,text,supports,why}]
// 干扰项的设计要点：不要放「假的」，要放「真的但不相干」——
// 要练的是「真实 ≠ 支持结论」这个区分，不是辨真假。
function EvidenceSelectPhase({ phase, onScore, onComplete }) {
  const items = phase.items || [];
  const need = phase.pick || items.filter((i) => i.supports).length || 2;
  const [picked, setPicked] = useState([]);
  const [done, setDone] = useState(false);

  const toggle = (id) => {
    if (done) return;
    setPicked((p) => p.includes(id) ? p.filter((x) => x !== id)
      : (p.length >= need ? p : [...p, id]));
  };
  const right = picked.filter((id) => items.find((i) => i.id === id)?.supports).length;

  const submit = () => {
    setDone(true);
    if (onScore) onScore("evidence", right * POINTS.evidence);
  };

  return (
    <div style={styles.sceneOuter}>
      <div style={{ ...styles.sceneStageInner, backgroundImage: `url(${asset(phase.background)})` }}>
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(12,8,5,0.66)" }} />

        <div style={esStyles.wrap}>
          <div style={esStyles.claimBox}>
            <div style={esStyles.claimLabel}>{"这个判断"}</div>
            <div style={esStyles.claim}>{nb(phase.claim || "")}</div>
          </div>

          <div style={esStyles.instruction}>
            {nb(phase.instruction || `挑出 ${need} 条能支持它的材料。`)}
            {!done && <span style={esStyles.counter}>{` ${picked.length} / ${need}`}</span>}
          </div>

          <div style={esStyles.list}>
            {items.map((it) => {
              const on = picked.includes(it.id);
              return (
                <div
                  key={it.id}
                  onClick={() => toggle(it.id)}
                  style={{
                    ...esStyles.item,
                    cursor: done ? "default" : "pointer",
                    borderColor: done
                      ? (it.supports ? "#C9A86A" : "rgba(255,255,255,0.14)")
                      : (on ? "#C9A86A" : "rgba(201,168,106,0.3)"),
                    backgroundColor: on ? "rgba(201,168,106,0.18)" : "rgba(28,20,13,0.55)",
                    opacity: done && !it.supports && !on ? 0.7 : 1,
                  }}
                >
                  <div style={esStyles.itemHead}>
                    <span style={{
                      ...esStyles.tick,
                      borderColor: on ? "#C9A86A" : "rgba(201,168,106,0.4)",
                      backgroundColor: on ? "#C9A86A" : "transparent",
                    }} />
                    <span style={esStyles.itemText}>{nb(it.text)}</span>
                    {done && (
                      <span style={{ ...esStyles.verdictTag, color: it.supports ? "#C9A86A" : "#8A7A5E" }}>
                        {it.supports ? "支持" : "不支持"}
                      </span>
                    )}
                  </div>
                  {done && it.why && <div style={esStyles.why}>{nb(it.why)}</div>}
                </div>
              );
            })}
          </div>

          {!done ? (
            <button
              style={{ ...prStyles.go, opacity: picked.length === need ? 1 : 0.45,
                       cursor: picked.length === need ? "pointer" : "not-allowed" }}
              disabled={picked.length !== need}
              onClick={submit}
            >
              {"就这些 →"}
            </button>
          ) : (
            <>
              {phase.closing && <div style={esStyles.closing}>{nb(phase.closing)}</div>}
              <button style={prStyles.go} onClick={onComplete}>{"继续 →"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const esStyles = {
  wrap: {
    position: "absolute", inset: 0, zIndex: 20, overflowY: "auto",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "3% 8% 4%", gap: 12,
    background: "linear-gradient(180deg, rgba(10,7,4,0.86) 0%, rgba(10,7,4,0.78) 70%, rgba(10,7,4,0.86) 100%)",
  },
  claimBox: {
    borderLeft: "3px solid #C9A86A", paddingLeft: 14, maxWidth: 760, width: "100%",
  },
  claimLabel: { color: "#8A7A5E", fontSize: "clamp(10px, 0.72vw, 12px)", letterSpacing: 5, marginBottom: 4 },
  claim: {
    color: "#F5E6D3", fontSize: "clamp(14px, 1.25vw, 20.7px)", lineHeight: 1.75, letterSpacing: 2,
    textShadow: "0 2px 10px rgba(0,0,0,0.9)",
  },
  instruction: {
    color: "#D8C8A8", fontSize: "clamp(11.5px, 0.9vw, 14.9px)", letterSpacing: 1, maxWidth: 760, width: "100%",
  },
  counter: { color: "#C9A86A", marginLeft: 8 },
  list: { display: "flex", flexDirection: "column", gap: 8, maxWidth: 760, width: "100%" },
  item: {
    border: "1px solid", borderRadius: 8, padding: "11px 14px",
    transition: "border-color 180ms ease, background-color 180ms ease, opacity 180ms ease",
  },
  itemHead: { display: "flex", alignItems: "flex-start", gap: 10 },
  tick: {
    width: 15, height: 15, borderRadius: 3, border: "1.5px solid", flexShrink: 0, marginTop: 3,
    transition: "background-color 180ms ease",
  },
  itemText: { color: "#EFE3CC", fontSize: "clamp(12.5px, 1.0vw, 16.5px)", lineHeight: 1.7, flex: 1 },
  verdictTag: { fontSize: "clamp(10px, 0.72vw, 12px)", letterSpacing: 2, flexShrink: 0, marginTop: 3 },
  why: {
    color: "#CBBC9E", fontSize: "clamp(11.5px, 0.87vw, 14.4px)", lineHeight: 1.85,
    marginTop: 8, paddingLeft: 25, borderTop: "1px dashed rgba(201,168,106,0.22)", paddingTop: 8,
  },
  closing: {
    color: "#C9A86A", fontSize: "clamp(12px, 0.97vw, 16px)", lineHeight: 1.9, letterSpacing: 1,
    maxWidth: 760, textAlign: "center", textShadow: "0 1px 8px rgba(0,0,0,0.9)",
  },
};

// ============================================================
// 第 5 层 · REALITY → DIVINE COMEDY
// ============================================================
// 三个 phase 类型合力回答同一个问题：「这段经历后来去了哪？」
//   echo_portal        —— 把 token 拖进手稿，现实淡出、《神曲》淡入
//   inferno_placement  —— 刚才见过的人，但丁把他们放进了地狱哪一层
//   comedy_encounter   —— 同一个人重新遇见，玩家追问但丁「他为什么在这里」
// 设计文档：docs/DESIGN_DANTE_V2.md

// token 的四种类型：印章字 + 色。不用 emoji，跟全站楷体纸面风格一致。
const TOKEN_KIND = {
  person:   { seal: "人", color: "#8A6D3B", label: "人物" },
  memory:   { seal: "忆", color: "#6B7A8F", label: "记忆" },
  idea:     { seal: "念", color: "#6E7F55", label: "思想" },
  conflict: { seal: "结", color: "#A34A38", label: "矛盾" },
};

// ============================================================
// ECHO PORTAL — 现实 → 《神曲》的转场仪式
// ============================================================
// phase.token       { id, kind, name, detail }
// phase.background  现实底图（淡出）
// phase.comedyBackground 《神曲》底图（淡入）
// phase.manuscript  手稿图（可缺，缺则退化为 CSS 羊皮纸方块）
// phase.prompt / afterTitle / afterText
function EchoPortalPhase({ phase, onComplete }) {
  const token = phase.token || {};
  const kind = TOKEN_KIND[token.kind] || TOKEN_KIND.idea;
  const reduced = usePrefersReducedMotion();
  const [stage, setStage] = useState("reality"); // reality → crossing → comedy
  const [armed, setArmed] = useState(false);     // 触屏：token 已「拿起」
  const [over, setOver] = useState(false);

  const drop = useCallback(() => {
    setStage((s) => (s === "reality" ? "crossing" : s));
  }, []);

  useEffect(() => {
    if (stage !== "crossing") return;
    const t = setTimeout(() => setStage("comedy"), reduced ? 150 : 2100);
    return () => clearTimeout(t);
  }, [stage, reduced]);

  const inComedy = stage === "comedy";
  const crossing = stage !== "reality";

  return (
    <div style={styles.sceneOuter}>
      <div style={{ ...styles.sceneStageInner, backgroundImage: `url(${asset(phase.background)})` }}>
        {/* 现实层：去色 + 淡出 */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundColor: "#0B0805",
          // 过场时压到最暗，抵达后回到 0.34——既压得住文字，又让底图透出来
          opacity: stage === "crossing" ? 0.72 : (inComedy ? 0.34 : 0),
          transition: reduced ? "none" : "opacity 1.6s ease",
          pointerEvents: "none",
        }} />
        {/* 《神曲》层：淡入 */}
        {phase.comedyBackground && (
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${asset(phase.comedyBackground)})`,
            backgroundSize: "cover", backgroundPosition: "center",
            opacity: inComedy ? 1 : 0,
            transition: reduced ? "none" : "opacity 1.4s ease",
          }} />
        )}
        {/* 墨迹晕开：从手稿位置放射 */}
        <div style={{
          position: "absolute", left: "50%", top: "52%",
          width: 40, height: 40, marginLeft: -20, marginTop: -20,
          borderRadius: "50%", backgroundColor: "rgba(20,12,6,0.9)",
          transform: crossing ? "scale(60)" : "scale(0)",
          opacity: inComedy ? 0 : 1,
          transition: reduced ? "none" : "transform 1.5s cubic-bezier(.5,0,.4,1), opacity 1.1s ease 1.3s",
          pointerEvents: "none",
        }} />

        {/* —— 现实：拖 token 进手稿 —— */}
        {stage === "reality" && (
          <>
            <div style={epStyles.prompt}>{nb(phase.prompt || "把它放进但丁的手稿")}</div>

            {/* 手稿 = 投放区 */}
            <div
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); drop(); }}
              onClick={() => armed && drop()}
              style={{
                ...epStyles.manuscript,
                backgroundImage: phase.manuscript ? `url(${asset(phase.manuscript)})` : undefined,
                borderColor: over || armed ? "#C9A86A" : "rgba(201,168,106,0.35)",
                boxShadow: over || armed
                  ? "0 0 0 6px rgba(201,168,106,0.22), 0 14px 30px rgba(0,0,0,0.45)"
                  : "0 10px 24px rgba(0,0,0,0.4)",
                cursor: armed ? "pointer" : "default",
              }}
            >
              {!phase.manuscript && <div style={epStyles.manuscriptRules} />}
              <div style={epStyles.manuscriptHint}>
                {armed ? "点这里放下" : "手稿"}
              </div>
            </div>

            {/* token 印章 */}
            <div
              draggable
              onDragStart={(e) => { e.dataTransfer.setData("text/plain", token.id || "token"); setArmed(true); }}
              onClick={() => setArmed((a) => !a)}
              style={{
                ...epStyles.token,
                borderColor: kind.color,
                transform: armed ? "translateY(-6px) scale(1.04)" : "none",
                boxShadow: armed
                  ? `0 0 0 5px ${kind.color}33, 0 12px 26px rgba(0,0,0,0.4)`
                  : "0 6px 18px rgba(0,0,0,0.35)",
              }}
            >
              <div style={{ ...epStyles.tokenSeal, backgroundColor: kind.color }}>{kind.seal}</div>
              <div style={epStyles.tokenBody}>
                <div style={epStyles.tokenKind}>{kind.label}</div>
                <div style={epStyles.tokenName}>{nb(token.name || "")}</div>
                {token.detail && <div style={epStyles.tokenDetail}>{nb(token.detail)}</div>}
              </div>
            </div>

            <div style={epStyles.tapHint}>
              {"拖到手稿上，或先点印章再点手稿"}
            </div>
          </>
        )}

        {/* —— 抵达《神曲》 —— */}
        {inComedy && (
          <div style={epStyles.afterWrap}>
            {phase.afterTitle && <div style={epStyles.afterTitle}>{nb(phase.afterTitle)}</div>}
            {phase.afterText && (
              <RevealLines text={phase.afterText} style={epStyles.afterText} unitDelay={700} />
            )}
            <button style={{ ...styles.floatingProceed, position: "static", marginTop: 26 }} onClick={onComplete}>
              {"继续 →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const epStyles = {
  prompt: {
    position: "absolute", top: "9%", left: 0, right: 0, textAlign: "center",
    color: "#F5E6D3", fontSize: "clamp(14px, 1.25vw, 20.7px)", letterSpacing: 3,
    textShadow: "0 2px 10px rgba(0,0,0,0.85)", zIndex: 20,
  },
  manuscript: {
    position: "absolute", left: "50%", top: "52%", transform: "translate(-50%, -50%)",
    width: "34%", aspectRatio: "4 / 3",
    backgroundSize: "cover", backgroundPosition: "center",
    backgroundColor: "#E8DCC0",
    border: "2px dashed", borderRadius: 6,
    transition: "box-shadow 260ms ease, border-color 260ms ease",
    zIndex: 15,
  },
  manuscriptRules: {
    position: "absolute", inset: "14% 12%",
    background: "repeating-linear-gradient(180deg, rgba(90,70,45,0.22) 0 1px, transparent 1px 13px)",
  },
  manuscriptHint: {
    position: "absolute", left: 0, right: 0, bottom: 8, textAlign: "center",
    color: "#6B5340", fontSize: "clamp(11px, 0.833vw, 13.8px)", letterSpacing: 4,
  },
  token: {
    position: "absolute", left: "6%", bottom: "12%",
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 18px 12px 12px",
    backgroundColor: "rgba(252,248,238,0.96)",
    border: "2px solid", borderRadius: 10,
    cursor: "grab", zIndex: 20, maxWidth: "34%",
    transition: "transform 220ms cubic-bezier(.2,.7,.3,1), box-shadow 220ms ease",
    userSelect: "none", WebkitUserSelect: "none",
  },
  tokenSeal: {
    width: 44, height: 44, flexShrink: 0, borderRadius: 4,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#FCF8EE", fontSize: "clamp(17.6px, 1.528vw, 25.3px)", letterSpacing: 0,
  },
  tokenBody: { minWidth: 0 },
  tokenKind: { fontSize: "clamp(10px, 0.72vw, 12px)", color: "#9A8B72", letterSpacing: 3 },
  tokenName: { fontSize: "clamp(15px, 1.32vw, 22px)", color: "#2B2118", letterSpacing: 2 },
  tokenDetail: { fontSize: "clamp(11px, 0.833vw, 13.8px)", color: "#7A6A50", marginTop: 3, lineHeight: 1.5 },
  tapHint: {
    position: "absolute", left: 0, right: 0, bottom: "4%", textAlign: "center",
    color: "rgba(245,230,211,0.72)", fontSize: "clamp(11px, 0.764vw, 12.6px)", letterSpacing: 2,
    textShadow: "0 1px 4px #000", zIndex: 20,
  },
  afterWrap: {
    position: "absolute", inset: 0, zIndex: 25,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "0 8%", textAlign: "center",
  },
  afterTitle: {
    color: "#C9A86A", fontSize: "clamp(12.8px, 1.111vw, 18.4px)", letterSpacing: 6, marginBottom: 18,
    textShadow: "0 2px 10px rgba(0,0,0,0.9)",
  },
  afterText: {
    color: "#F5E6D3", fontSize: "clamp(15px, 1.39vw, 23px)", lineHeight: 2.0, letterSpacing: 2,
    textShadow: "0 2px 12px rgba(0,0,0,0.9)",
  },
};

// ============================================================
// INFERNO PLACEMENT — 「但丁把他们放在哪儿了？」
// ============================================================
// phase.circles [{ id, name, label, y? }]  由浅到深
// phase.souls   [{ id, name, portrait, metIn, metLabel, answer, verdict, hint }]
// 关键约束：souls 必须是玩家在前面现实场景里真的对过话的人（metLabel 会显示出来）。
//
// commit → contrast：提交之后不打 ✓✗。玩家自己的答案留在原地变成 ghost，
// 但丁的答案在旁边亮起来；两个不一样的时候，那个差额本身就是这一关的教材——
// 问的不是「你错了」，是「但丁为什么放这儿」。
function InfernoPlacementPhase({ phase, onScore, onComplete }) {
  const circles = phase.circles || [];
  const souls = phase.souls || [];
  const [placed, setPlaced] = useState({});     // soulId → circleId
  const [picked, setPicked] = useState(null);   // 触屏：拿起的 soul
  const [overCircle, setOverCircle] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const place = useCallback((soulId, circleId) => {
    if (submitted || !soulId) return;
    setPlaced((p) => ({ ...p, [soulId]: circleId }));
    setPicked(null);
  }, [submitted]);

  const allPlaced = souls.length > 0 && souls.every((s) => placed[s.id]);
  const correctCount = souls.reduce((n, s) => n + (placed[s.id] === s.answer ? 1 : 0), 0);

  const submit = () => {
    setSubmitted(true);
    if (onScore) onScore("inferno_place", correctCount * POINTS.infernoPlace);
  };

  const soulsIn = (cid) => souls.filter((s) => placed[s.id] === cid);
  const tray = souls.filter((s) => !placed[s.id]);

  return (
    <div style={styles.sceneOuter}>
      <div style={{ ...styles.sceneStageInner, backgroundImage: `url(${asset(phase.background)})` }}>
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(12,8,5,0.45)" }} />

        <div style={ipStyles.question}>{nb(phase.question || "他们被放在了哪一层？")}</div>

        {/* 左：待安放的亡魂（都是刚刚见过的人） */}
        <div style={ipStyles.tray}>
          {tray.map((s) => (
            <div
              key={s.id}
              draggable={!submitted}
              onDragStart={(e) => { e.dataTransfer.setData("text/plain", s.id); setPicked(s.id); }}
              onClick={() => setPicked((p) => (p === s.id ? null : s.id))}
              style={{
                ...ipStyles.soulCard,
                borderColor: picked === s.id ? "#C9A86A" : "rgba(201,168,106,0.3)",
                boxShadow: picked === s.id ? "0 0 0 4px rgba(201,168,106,0.25)" : "none",
              }}
            >
              {s.portrait && <div style={{ ...ipStyles.soulFace, backgroundImage: `url(${asset(s.portrait)})` }} />}
              <div style={{ minWidth: 0 }}>
                <div style={ipStyles.soulName}>{nb(s.name)}</div>
                {s.metLabel && <div style={ipStyles.soulMet}>{"见过 · " + s.metLabel}</div>}
              </div>
            </div>
          ))}
          {tray.length === 0 && <div style={ipStyles.trayEmpty}>{"都安排完了。"}</div>}
        </div>

        {/* 右：地狱漏斗 */}
        <div style={ipStyles.funnel}>
          {circles.map((c, i) => {
            const w = 96 - (circles.length > 1 ? (i * 46) / (circles.length - 1) : 0);
            const here = soulsIn(c.id);
            return (
              <div
                key={c.id}
                onDragOver={(e) => { e.preventDefault(); setOverCircle(c.id); }}
                onDragLeave={() => setOverCircle(null)}
                onDrop={(e) => { e.preventDefault(); setOverCircle(null); place(e.dataTransfer.getData("text/plain"), c.id); }}
                onClick={() => picked && place(picked, c.id)}
                style={{
                  ...ipStyles.band,
                  width: w + "%",
                  backgroundColor: overCircle === c.id
                    ? "rgba(201,168,106,0.22)"
                    : (picked && !submitted ? "rgba(201,168,106,0.10)" : "rgba(20,12,6,0.34)"),
                  borderColor: overCircle === c.id ? "#C9A86A" : "rgba(201,168,106,0.28)",
                  cursor: picked && !submitted ? "pointer" : "default",
                }}
              >
                <div style={ipStyles.bandLabel}>
                  <span style={ipStyles.bandName}>{nb(c.name)}</span>
                  {c.label && <span style={ipStyles.bandSin}>{nb(c.label)}</span>}
                </div>
                <div style={ipStyles.bandSouls}>
                  {/* 未提交：玩家放的人。已提交：玩家放的留成 ghost（虚线），
                      但丁放的另起一枚金色实心——两枚并存才看得见差在哪。 */}
                  {here.map((s) => (
                    <span
                      key={"mine-" + s.id}
                      onClick={(e) => { e.stopPropagation(); if (!submitted) setPlaced((p) => { const n = { ...p }; delete n[s.id]; return n; }); }}
                      style={{
                        ...ipStyles.chip,
                        ...(submitted ? ipStyles.chipGhost : null),
                        cursor: submitted ? "default" : "pointer",
                      }}
                    >
                      {submitted && <span style={ipStyles.chipWho}>{"你"}</span>}
                      {nb(s.name)}
                    </span>
                  ))}
                  {submitted && souls.filter((s) => s.answer === c.id).map((s) => (
                    <span key={"dante-" + s.id} style={{ ...ipStyles.chip, ...ipStyles.chipDante }}>
                      <span style={{ ...ipStyles.chipWho, color: "#3A2E20", opacity: 0.65 }}>{"但丁"}</span>
                      {nb(s.name)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 提交 / 判词 */}
        {!submitted && (
          <button
            style={{ ...styles.floatingProceed, opacity: allPlaced ? 1 : 0.45, cursor: allPlaced ? "pointer" : "not-allowed" }}
            disabled={!allPlaced}
            onClick={submit}
          >
            {"定了，看但丁怎么排的 →"}
          </button>
        )}

        {submitted && (
          <div style={ipStyles.verdictOverlay}>
            <div style={ipStyles.verdictPanel}>
              <div style={ipStyles.verdictScore}>
                {"你和但丁，"}<strong>{correctCount}</strong>{" / " + souls.length + " 处放到了一起"}
                <div style={ipStyles.verdictSub}>
                  {correctCount === souls.length
                    ? "全都一样。那就往下问一句：他凭什么这么排？"
                    : "不一样的那几个，才是这一关真正要读的地方。"}
                </div>
              </div>
              {souls.map((s) => (
                <div key={s.id} style={ipStyles.verdictRow}>
                  <div style={ipStyles.verdictName}>
                    {nb(s.name)}
                    {(() => {
                      const mineC = circles.find((c) => c.id === placed[s.id]);
                      const hisC = circles.find((c) => c.id === s.answer);
                      const agree = placed[s.id] === s.answer;
                      return (
                        <span style={ipStyles.verdictWhere}>
                          {agree
                            ? "　你和但丁都放在「" + (hisC?.name || "") + "」"
                            : "　你放「" + (mineC?.name || "—") + "」　但丁放「" + (hisC?.name || "") + "」"}
                        </span>
                      );
                    })()}
                  </div>
                  <div style={ipStyles.verdictText}>{nb(s.verdict || "")}</div>
                </div>
              ))}
              <button style={styles.proceedBtn} onClick={onComplete}>{"继续 →"}</button>
            </div>
          </div>
        )}

        {!submitted && (
          <div style={epStyles.tapHint}>
            {"拖到对应的一层，或先点人再点层（点已放的名字可取回）"}
          </div>
        )}
      </div>
    </div>
  );
}

const ipStyles = {
  question: {
    position: "absolute", top: "5%", left: 0, right: 0, textAlign: "center",
    color: "#F5E6D3", fontSize: "clamp(14px, 1.25vw, 20.7px)", letterSpacing: 3,
    textShadow: "0 2px 10px rgba(0,0,0,0.9)", zIndex: 20,
  },
  tray: {
    position: "absolute", left: "3%", top: "16%", width: "27%", maxHeight: "74%",
    overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, zIndex: 20,
  },
  soulCard: {
    display: "flex", alignItems: "center", gap: 10, padding: 8,
    backgroundColor: "rgba(252,248,238,0.94)", border: "2px solid", borderRadius: 8,
    cursor: "grab", userSelect: "none", WebkitUserSelect: "none",
    transition: "box-shadow 200ms ease, border-color 200ms ease",
  },
  soulFace: {
    width: 40, height: 40, flexShrink: 0, borderRadius: 4,
    backgroundSize: "cover", backgroundPosition: "top center", backgroundColor: "#D8CDB8",
  },
  soulName: { fontSize: "clamp(12.5px, 1.042vw, 17.2px)", color: "#2B2118", letterSpacing: 1 },
  soulMet: { fontSize: "clamp(10px, 0.72vw, 12px)", color: "#8A7A5E", marginTop: 2, lineHeight: 1.4 },
  trayEmpty: { color: "rgba(245,230,211,0.6)", fontSize: "clamp(11.5px, 0.833vw, 13.8px)", letterSpacing: 2 },
  funnel: {
    position: "absolute", right: "3%", top: "15%", width: "62%", height: "72%",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
    zIndex: 20,
  },
  band: {
    minHeight: 0, flex: 1, margin: "3px 0",
    border: "1px solid", borderRadius: 4,
    display: "flex", alignItems: "center", gap: 10, padding: "4px 12px",
    transition: "background-color 200ms ease, border-color 200ms ease",
  },
  bandLabel: { flexShrink: 0, display: "flex", flexDirection: "column", minWidth: "30%" },
  bandName: { color: "#E8D9BE", fontSize: "clamp(11.5px, 0.94vw, 15.5px)", letterSpacing: 2 },
  bandSin: { color: "#A89968", fontSize: "clamp(10px, 0.72vw, 12px)", letterSpacing: 1 },
  bandSouls: { display: "flex", flexWrap: "wrap", gap: 6, flex: 1 },
  chip: {
    padding: "3px 10px", borderRadius: 12,
    fontSize: "clamp(11px, 0.833vw, 13.8px)", letterSpacing: 1,
    backgroundColor: "rgba(252,248,238,0.92)", color: "#2B2118",
    display: "inline-flex", alignItems: "baseline", gap: 5,
  },
  chipGhost: {
    backgroundColor: "transparent", color: "rgba(232,217,190,0.7)",
    border: "1px dashed rgba(232,217,190,0.45)",
  },
  chipDante: { backgroundColor: "#C9A86A", color: "#241A10" },
  chipWho: { fontSize: "clamp(9px, 0.62vw, 10.5px)", letterSpacing: 2, opacity: 0.7 },
  verdictOverlay: {
    position: "absolute", inset: 0, zIndex: 40,
    backgroundColor: "rgba(10,7,4,0.82)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "3% 6%",
  },
  verdictPanel: {
    backgroundColor: "#FAF6EE", borderRadius: 10, padding: "20px 24px",
    maxWidth: 720, width: "100%", maxHeight: "94%", overflowY: "auto",
    boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
  },
  verdictScore: {
    fontSize: "clamp(14px, 1.25vw, 20.7px)", color: "#3A2E20", letterSpacing: 2,
    borderBottom: "1px solid #D8CDB8", paddingBottom: 10, marginBottom: 12,
  },
  verdictSub: { fontSize: "clamp(11.5px, 0.833vw, 13.8px)", color: "#7A6A50", marginTop: 5, letterSpacing: 1 },
  verdictRow: { marginBottom: 14 },
  verdictName: { fontSize: "clamp(12.8px, 1.042vw, 17.2px)", color: "#2B2118", letterSpacing: 1 },
  verdictWhere: { color: "#8A6D3B", fontSize: "clamp(11.5px, 0.833vw, 13.8px)" },
  verdictText: { fontSize: "clamp(12px, 0.903vw, 14.9px)", color: "#5A4A38", lineHeight: 1.85, marginTop: 4 },
};

// ============================================================
// COMEDY ENCOUNTER — 同一个人，重新遇见
// ============================================================
// phase.soul { id, name, realityPortrait, comedyPortrait, metIn, metLabel }
// phase.recognition  认出他的那一句
// phase.asks [{ q, a }]  —— 问的对象是但丁，不是玩家。没有对错。
// phase.requiredAsks / phase.closing
function ComedyEncounterPhase({ phase, onComplete }) {
  const soul = phase.soul || {};
  const asks = phase.asks || [];
  const reduced = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(false);   // 现实立绘 → 地狱立绘
  const [asked, setAsked] = useState([]);            // 已问过的 index
  const [active, setActive] = useState(null);        // 正在看的回答
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), reduced ? 100 : 1400);
    return () => clearTimeout(t);
  }, [reduced]);

  const need = phase.requiredAsks == null ? Math.min(2, asks.length) : phase.requiredAsks;
  const canClose = asked.length >= need;

  return (
    <div style={styles.sceneOuter}>
      <div style={{ ...styles.sceneStageInner, backgroundImage: `url(${asset(phase.background)})` }}>
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(14,9,5,0.5)" }} />

        {/* 同一张脸，两个世界 —— 交叉淡化 */}
        <div style={ceStyles.figure}>
          {soul.realityPortrait && (
            <img src={asset(soul.realityPortrait)} alt="" style={{
              ...ceStyles.portrait,
              opacity: revealed ? 0 : 1,
              filter: revealed ? "saturate(0.2)" : "none",
              transition: reduced ? "none" : "opacity 1.5s ease, filter 1.5s ease",
            }} />
          )}
          {soul.comedyPortrait && (
            <img src={asset(soul.comedyPortrait)} alt="" style={{
              ...ceStyles.portrait,
              opacity: revealed ? 1 : 0,
              transition: reduced ? "none" : "opacity 1.5s ease",
            }} />
          )}
        </div>

        {/* 他是谁 · 你在哪见过他 */}
        <div style={ceStyles.nameplate}>
          <div style={ceStyles.name}>{nb(soul.name || "")}</div>
          {soul.metLabel && (
            <div style={{ ...ceStyles.met, opacity: revealed ? 1 : 0, transition: "opacity 900ms ease 600ms" }}>
              {"你在这里见过 · " + soul.metLabel}
            </div>
          )}
        </div>

        {/* 认出他的那一句 */}
        {revealed && !closing && phase.recognition && asked.length === 0 && active === null && (
          <div style={ceStyles.recognition}>{nb(phase.recognition)}</div>
        )}

        {/* 追问 */}
        {revealed && !closing && active === null && (
          <div style={ceStyles.askList}>
            {asks.map((a, i) => (
              <button
                key={i}
                onClick={() => { setActive(i); setAsked((s) => (s.includes(i) ? s : [...s, i])); }}
                style={{
                  ...ceStyles.askBtn,
                  opacity: asked.includes(i) ? 0.5 : 1,
                }}
              >
                {nb(a.q)}
              </button>
            ))}
            {canClose && (
              <button style={{ ...ceStyles.askBtn, ...ceStyles.closeBtn }} onClick={() => setClosing(true)}>
                {"—— 走开 →"}
              </button>
            )}
          </div>
        )}

        {/* 但丁的回答 */}
        {active != null && (
          <div style={ceStyles.answerBar} onClick={() => setActive(null)}>
            <div style={ceStyles.answerWho}>{"但丁"}</div>
            <div style={ceStyles.answerText}>{nb(asks[active].a)}</div>
            <div style={ceStyles.answerHint}>
              {canClose ? "▼ 点击返回" : "▼ 点击返回（至少再问 " + (need - asked.length) + " 个）"}
            </div>
          </div>
        )}

        {/* 收束 */}
        {closing && (
          <div style={ceStyles.closingWrap}>
            <RevealLines text={phase.closing || ""} style={ceStyles.closingText} unitDelay={760} />
            <button style={{ ...styles.floatingProceed, position: "static", marginTop: 24 }} onClick={onComplete}>
              {"继续 →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const ceStyles = {
  figure: {
    position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
    width: "34%", height: "78%", zIndex: 10,
  },
  portrait: {
    position: "absolute", inset: 0, width: "100%", height: "100%",
    objectFit: "contain", objectPosition: "center bottom",
    filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.5))",
  },
  nameplate: {
    position: "absolute", top: "7%", left: 0, right: 0, textAlign: "center", zIndex: 20,
  },
  name: {
    color: "#F5E6D3", fontSize: "clamp(15px, 1.39vw, 23px)", letterSpacing: 5,
    textShadow: "0 2px 10px rgba(0,0,0,0.9)",
  },
  met: {
    color: "#C9A86A", fontSize: "clamp(11px, 0.833vw, 13.8px)", letterSpacing: 2, marginTop: 6,
    textShadow: "0 1px 6px rgba(0,0,0,0.9)",
  },
  recognition: {
    position: "absolute", left: "6%", top: "24%", maxWidth: "26%", zIndex: 20,
    color: "#F5E6D3", fontSize: "clamp(13px, 1.15vw, 19px)", lineHeight: 1.9, letterSpacing: 2,
    textShadow: "0 2px 10px rgba(0,0,0,0.9)",
  },
  askList: {
    position: "absolute", right: "4%", bottom: "8%", width: "34%", zIndex: 25,
    display: "flex", flexDirection: "column", gap: 8,
  },
  askBtn: {
    textAlign: "left", padding: "10px 14px",
    backgroundColor: "rgba(252,248,238,0.93)", color: "#3A2E20",
    border: "1px solid #C9A86A", borderRadius: 8, cursor: "pointer",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    fontSize: "clamp(12px, 0.97vw, 16px)", lineHeight: 1.6, letterSpacing: 1,
    transition: "opacity 200ms ease",
  },
  closeBtn: { backgroundColor: "rgba(30,20,12,0.85)", color: "#E8D9BE", borderColor: "rgba(201,168,106,0.5)" },
  answerBar: {
    position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 30,
    backgroundColor: "rgba(20,12,6,0.9)", borderTop: "1px solid rgba(201,168,106,0.45)",
    padding: "16px 32px 14px", cursor: "pointer",
  },
  answerWho: { color: "#C9A86A", fontSize: "clamp(12px, 0.903vw, 14.9px)", letterSpacing: 3, marginBottom: 6 },
  answerText: {
    color: "#F5E6D3", fontSize: "clamp(12.8px, 1.111vw, 18.4px)", lineHeight: 1.95, letterSpacing: 1,
    whiteSpace: "pre-wrap",
  },
  answerHint: { color: "#A89968", fontSize: "clamp(11px, 0.764vw, 12.6px)", marginTop: 8, textAlign: "right" },
  closingWrap: {
    position: "absolute", inset: 0, zIndex: 40,
    backgroundColor: "rgba(10,7,4,0.8)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "0 10%", textAlign: "center",
  },
  closingText: {
    color: "#F5E6D3", fontSize: "clamp(14px, 1.32vw, 22px)", lineHeight: 2.05, letterSpacing: 2,
    textShadow: "0 2px 12px rgba(0,0,0,0.9)",
  },
};

// ============================================================
// STYLES
// ============================================================
const styles = {
  sceneContainer: {
    position: "fixed", inset: 0, zIndex: 200,
    backgroundSize: "cover", backgroundPosition: "center",
    backgroundColor: "#2C3E50",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    display: "flex", flexDirection: "column",
  },
  // Locked aspect-ratio wrapper for explore phase
  sceneOuter: {
    position: "fixed", inset: 0, zIndex: 200,
    backgroundColor: "#000",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
  },
  sceneStage: {
    width: "100%", height: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  sceneStageInner: {
    position: "relative",
    width: "min(100vw, calc(var(--vh100) * 16 / 9))",
    height: "min(var(--vh100), calc(100vw * 9 / 16))",
    aspectRatio: "16 / 9",
    backgroundSize: "cover", backgroundPosition: "center",
    backgroundColor: "#2C3E50",
    overflow: "hidden",
  },
  // Phase header
  phaseHeader: {
    padding: "16px 24px",
    paddingRight: "38%", // keep title/narrative clear of the top-right instruction box
    background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
    color: "#FFF",
    position: "relative",
    zIndex: 20,
  },
  phaseTitle: { margin: "0 0 4px", fontSize: "clamp(17.6px, 1.528vw, 25.3px)", letterSpacing: 4 },
  phaseNarrative: { margin: 0, fontSize: "clamp(12px, 0.903vw, 14.9px)", opacity: 0.85, lineHeight: 1.6 },
  // Instruction
  instructionBar: {
    // Top-right corner so it never overlaps character art in the scene.
    position: "absolute", top: 14, right: 14,
    maxWidth: "36%",
    backgroundColor: "rgba(0,0,0,0.8)", color: "#F5E6D3",
    padding: "10px 16px", borderRadius: 8, fontSize: "clamp(12px, 0.903vw, 14.9px)", lineHeight: 1.5,
    display: "flex", alignItems: "center", gap: 8,
    zIndex: 25,
  },
  instructionIcon: { fontSize: "clamp(14.4px, 1.25vw, 20.7px)" },
  talkCount: { marginLeft: 16, color: "#F4D03F", fontWeight: "bold", whiteSpace: "nowrap" },
  // NPC markers
  npcMarker: {
    position: "absolute", transform: "translate(-50%, -50%)",
    display: "flex", flexDirection: "column", alignItems: "center",
    cursor: "pointer", transition: "all 0.2s", zIndex: 10,
  },
  npcDot: {
    width: 40, height: 40, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#FFF", fontSize: "clamp(12.8px, 1.111vw, 18.4px)", fontWeight: "bold",
    border: "3px solid rgba(255,255,255,0.8)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    transition: "all 0.3s",
  },
  npcTextLabel: {
    padding: "8px 16px", borderRadius: 8,
    border: "2px solid",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    backdropFilter: "blur(4px)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
    transition: "all 0.3s",
  },
  npcTextLabelName: {
    fontSize: "clamp(12.0px, 1.042vw, 17.2px)", fontWeight: "bold", color: "#FFF",
    textShadow: "1px 1px 3px rgba(0,0,0,0.8)",
  },
  npcTextLabelHint: {
    fontSize: "clamp(8.0px, 0.694vw, 11.5px)", color: "rgba(255,255,255,0.7)",
  },
  npcName: {
    // Absolutely positioned so the hover tooltip doesn't shift the portrait.
    position: "absolute", top: "100%", left: "50%",
    transform: "translateX(-50%)", marginTop: 4,
    fontSize: "clamp(11.5px, 0.833vw, 13.8px)", color: "#FFF",
    backgroundColor: "rgba(0,0,0,0.6)", padding: "2px 8px",
    borderRadius: 4, whiteSpace: "nowrap", pointerEvents: "none",
  },
  npcPortraitWrap: {
    width: 140, height: 140, overflow: "hidden",
    position: "relative",
    transition: "all 0.3s",
  },
  npcPortraitImg: {
    width: "100%", height: "100%", objectFit: "contain",
  },
  npcBubble: {
    width: 28, height: 28, borderRadius: "50%",
    backgroundColor: "rgba(231,76,60,0.85)", color: "#FFF",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "clamp(12.5px, 0.972vw, 16.1px)", fontWeight: "bold",
    pointerEvents: "none",
    marginBottom: 4,
  },
  // Standalone ? marker for portrait-less items (props, paintings, scrolls).
  // No name label; the ? itself is the clickable element.
  npcQuestionMark: {
    width: 44, height: 44, borderRadius: "50%",
    color: "#FFF",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "clamp(14.4px, 1.25vw, 20.7px)", fontWeight: "bold",
    border: "2px solid rgba(255,255,255,0.9)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
    cursor: "pointer",
    transition: "transform 0.15s ease",
  },
  npcCheckMark: {
    width: 28, height: 28, borderRadius: "50%",
    backgroundColor: "rgba(46,204,113,0.85)", color: "#FFF",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "clamp(12.5px, 0.972vw, 16.1px)", fontWeight: "bold",
    pointerEvents: "none",
    marginBottom: 4,
  },
  // Trigger zone
  triggerZone: {
    position: "absolute", transform: "translate(-50%, -50%)",
    display: "flex", flexDirection: "column", alignItems: "center",
    cursor: "pointer", zIndex: 30, // always above character art (npcMarker z=10)
  },
  triggerPulse: {
    width: 50, height: 50, borderRadius: "50%",
    backgroundColor: "rgba(46,204,113,0.4)",
    border: "3px solid #2ECC71",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  triggerLabel: {
    marginTop: 6, fontSize: "clamp(12px, 0.903vw, 14.9px)", color: "#FFF", fontWeight: "bold",
    backgroundColor: "rgba(46,204,113,0.85)", padding: "4px 12px",
    borderRadius: 4, whiteSpace: "nowrap",
  },
  floatingProceed: {
    // 主页同款纸底金线胶囊（视觉基准：CharacterSelect 的开始按钮）
    position: "absolute", bottom: 20, right: 20,
    padding: "12px 26px", backgroundColor: "rgba(252,248,238,0.92)",
    color: "#3A2E20", border: "1px solid #C9A86A", borderRadius: 24,
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    letterSpacing: 2,
    fontSize: "clamp(12.0px, 1.042vw, 17.2px)", fontWeight: "bold", cursor: "pointer",
    boxShadow: "0 6px 16px rgba(70,55,35,0.28)",
    zIndex: 30, // always above character art (npcMarker z=10)
  },
  // Dialogue overlay
  dialogueOverlay: {
    position: "fixed", inset: 0, zIndex: 300,
    display: "flex", alignItems: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)", cursor: "pointer",
  },
  dialogueBar: {
    position: "relative",
    width: "100%",
    backgroundColor: "rgba(30,20,10,0.95)",
    borderTop: "2px solid #8B7355",
    display: "flex", alignItems: "flex-end",
    minHeight: 160,
  },
  dialoguePortraitArea: {
    width: "25vw", minWidth: "min(180px, 30vw)", maxWidth: 360,
    flexShrink: 0,
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    marginTop: "-45vh",
    paddingLeft: 8,
  },
  dialoguePortraitLarge: {
    width: "100%", height: "auto", maxHeight: "65vh",
    objectFit: "contain",
    filter: "drop-shadow(4px 4px 12px rgba(0,0,0,0.6))",
  },
  dialogueTextPanel: {
    flex: 1,
    padding: "24px 32px",
    minHeight: 120,
  },
  dialogueSpeaker: {
    color: "#D4A574", fontSize: "clamp(12.8px, 1.111vw, 18.4px)", fontWeight: "bold",
    letterSpacing: 3, marginBottom: 12,
  },
  dialogueText: {
    color: "#F5E6D3", fontSize: "clamp(13.6px, 1.181vw, 19.5px)", lineHeight: 2,
  },
  dialogueContinue: {
    textAlign: "right", color: "#A89968", fontSize: "clamp(12px, 0.903vw, 14.9px)",
    marginTop: 16, cursor: "pointer",
  },
  // Speech bubble (bubble mode — NPC drawn into background)
  speechBubbleWrap: {
    position: "absolute",
    transform: "translate(-50%, calc(-100% - 24px))",
    zIndex: 50,
    cursor: "pointer",
    pointerEvents: "auto",
    animation: "bubblePop 0.25s ease-out",
  },
  speechBubble: {
    backgroundColor: "rgba(255,253,247,0.96)",
    border: "2px solid #5D4E37",
    borderRadius: 18,
    padding: "12px 18px",
    minWidth: 180,
    maxWidth: 320,
    boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
  },
  bubbleSpeaker: {
    fontSize: "clamp(11.5px, 0.833vw, 13.8px)",
    fontWeight: "bold",
    color: "#8B6914",
    letterSpacing: 2,
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: "clamp(12.0px, 1.042vw, 17.2px)",
    lineHeight: 1.6,
    color: "#3B2510",
    whiteSpace: "pre-wrap",
  },
  bubbleContinue: {
    textAlign: "right",
    fontSize: "clamp(11.5px, 0.833vw, 13.8px)",
    color: "#A89968",
    marginTop: 6,
  },
  bubbleTail: {
    position: "absolute",
    bottom: -10,
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "10px solid transparent",
    borderRight: "10px solid transparent",
    borderTop: "12px solid #5D4E37",
  },
  // Transition
  transitionOverlay: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    // Lighter mask so the scene background stays visible during transitions.
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  transitionCard: {
    textAlign: "center", cursor: "pointer", padding: 40,
    maxWidth: 760,
  },
  transitionText: {
    color: "#F4D03F", fontSize: "clamp(16.0px, 1.389vw, 23.0px)", letterSpacing: 3, lineHeight: 2,
    marginBottom: 16,
    textShadow: "0 1px 6px rgba(0,0,0,0.9)", // keep readable over the lighter mask
  },
  clickHint: { color: "#AAA", fontSize: "clamp(12.5px, 0.972vw, 16.1px)", marginTop: 12 },
  // Examiner intro
  examIntroCard: {
    display: "flex", flexDirection: "column", alignItems: "center",
    backgroundColor: "rgba(30,20,10,0.95)", borderRadius: 12,
    padding: "32px 40px", maxWidth: 500, width: "90%",
    cursor: "pointer", border: "2px solid #8B7355",
  },
  examIntroPortrait: {
    width: 200, height: 200, objectFit: "contain",
    marginBottom: 20,
    filter: "drop-shadow(2px 2px 8px rgba(0,0,0,0.5))",
  },
  examIntroContent: { textAlign: "center" },
  examIntroName: {
    color: "#D4A574", fontSize: "clamp(17.6px, 1.528vw, 25.3px)", fontWeight: "bold",
    letterSpacing: 4, marginBottom: 12,
  },
  examIntroText: {
    color: "#F5E6D3", fontSize: "clamp(12.8px, 1.111vw, 18.4px)", lineHeight: 2,
    margin: "0 0 8px",
  },
  // Scroll bulletin board
  scrollContainer: {
    display: "flex", flexDirection: "column", alignItems: "center",
    cursor: "pointer",
  },
  scrollWrap: {
    // Parchment decree card
    width: "min(680px, 88vw)",
    backgroundColor: "rgba(242,230,204,0.96)",
    border: "3px double #8B5A2B",
    borderRadius: 6,
    padding: "32px 40px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
    textAlign: "center",
  },
  scrollTitle: {
    fontSize: "clamp(16.0px, 1.389vw, 23.0px)", color: "#3B2510", letterSpacing: 6,
    fontWeight: "bold", margin: "0 0 16px",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
  },
  scrollResult: {
    fontSize: "clamp(16.8px, 1.458vw, 24.1px)", color: "#8B0000", fontWeight: "bold",
    letterSpacing: 2, lineHeight: 2.1, margin: 0,
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    whiteSpace: "pre-wrap",
  },
  // Announcement
  announcementPanel: {
    maxWidth: 500, width: "90%", textAlign: "center",
  },
  decree: {
    backgroundColor: "rgba(139,115,85,0.2)", border: "2px solid #8B7355",
    borderRadius: 12, padding: 28, marginBottom: 20, position: "relative",
  },
  decreeSeal: {
    position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)",
    width: 36, height: 36, borderRadius: "50%",
    backgroundColor: "#C0392B", color: "#FFF",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "clamp(12.8px, 1.111vw, 18.4px)", fontWeight: "bold", border: "2px solid #922B21",
  },
  decreeText: {
    color: "#F5E6D3", fontSize: "clamp(12.8px, 1.111vw, 18.4px)", lineHeight: 1.8, marginTop: 8,
  },
  reactionBox: {
    display: "flex", alignItems: "center", gap: 16,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8,
    padding: 16, marginBottom: 20,
  },
  reactionPortrait: {
    width: 60, height: 60, borderRadius: "50%", objectFit: "cover",
    objectPosition: "center top", // full-body art: crop to the head, not the torso
    border: "2px solid #D4A574",
  },
  reactionText: { color: "#F5E6D3", fontSize: "clamp(12.5px, 0.972vw, 16.1px)", lineHeight: 1.6, margin: 0, flex: 1 },
  // Exam
  examOverlay: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)", padding: 20,
  },
  examWithPortrait: {
    flex: 1, display: "flex", flexDirection: "row",
    alignItems: "center", justifyContent: "center",
    width: "100%",
    position: "relative",
  },
  examPortraitArea: {
    position: "absolute", left: 0, bottom: 0,
    width: "22vw", minWidth: 160, maxWidth: 340,
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    paddingLeft: 12,
    zIndex: 2,
    // 纯装饰立绘，不挡答题面板的点击
    pointerEvents: "none",
  },
  examPortraitImg: {
    width: "100%", height: "auto", maxHeight: "min(80vh, calc(var(--vh100) - 120px))",
    objectFit: "contain",
    filter: "drop-shadow(4px 4px 16px rgba(0,0,0,0.7))",
  },
  examPanelRight: {
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 12,
    padding: "clamp(12px, 2vh, 24px) clamp(14px, 2.2vw, 32px)",
    maxHeight: "calc(var(--vh100) - 32px)", overflowY: "auto",
    width: "55vw", maxWidth: 680, minWidth: "min(360px, 92vw)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
    zIndex: 1,
  },
  examPanel: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 28,
    maxWidth: 600, width: "90%", maxHeight: "calc(var(--vh100) - 32px)", overflowY: "auto",
  },
  examinerBar: {
    backgroundColor: "#8B7355", color: "#FFF", padding: "6px 16px",
    borderRadius: 6, marginBottom: 16, display: "inline-block", fontSize: "clamp(12px, 0.903vw, 14.9px)",
  },
  examinerName: { fontWeight: "bold" },
  examProgress: { fontSize: "clamp(12px, 0.903vw, 14.9px)", color: "#999", marginBottom: 16 },
  examQuestion: { fontSize: "clamp(13.6px, 1.181vw, 19.5px)", lineHeight: 1.6, marginBottom: 20, whiteSpace: "pre-wrap" },
  examOptions: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 },
  examOption: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px", border: "2px solid", borderRadius: 8,
    cursor: "pointer", transition: "all 0.2s",
  },
  examOptionLetter: { fontWeight: "bold", fontSize: "clamp(12.8px, 1.111vw, 18.4px)", minWidth: 24 },
  fillRow: { display: "flex", gap: 8, marginBottom: 20 },
  fillInput: {
    flex: 1, padding: "10px 14px", border: "2px solid", borderRadius: 6,
    fontSize: "clamp(16px, 1.111vw, 18.4px)", fontFamily: "inherit", textAlign: "center",
  },
  fillSubmit: {
    padding: "10px 18px", backgroundColor: "#8B7355", color: "#FFF",
    border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold",
  },
  fillPassage: {
    fontSize: "clamp(12.8px, 1.111vw, 18.4px)", lineHeight: 2.2, color: "#333",
    marginBottom: 16, whiteSpace: "pre-wrap",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
  },
  fillDropZone: {
    display: "inline-block", minWidth: 60, padding: "4px 12px",
    border: "2px dashed", borderRadius: 6,
    textAlign: "center", fontSize: "clamp(12.8px, 1.111vw, 18.4px)", fontWeight: "bold",
    transition: "all 0.2s", verticalAlign: "middle",
  },
  fillChips: {
    display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16,
    justifyContent: "center",
  },
  fillChip: {
    padding: "10px 20px", minHeight: 42, backgroundColor: "#FDF8F0",
    border: "2px solid #D4A574", borderRadius: 8,
    fontSize: "clamp(12.8px, 1.111vw, 18.4px)", fontWeight: "bold", color: "#5D4E37",
    cursor: "grab", userSelect: "none",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    transition: "all 0.2s",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  explanationBox: {
    backgroundColor: "#F0F8FF", border: "1px solid #B0D4FF",
    borderRadius: 6, padding: 12, marginBottom: 16, fontSize: "clamp(12.5px, 0.972vw, 16.1px)", lineHeight: 1.6,
  },
  examResultCard: {
    backgroundColor: "#FFF", borderRadius: 12, padding: "clamp(16px, 3vh, 32px)",
    maxWidth: 400, width: "90%", textAlign: "center",
    maxHeight: "calc(var(--vh100) - 32px)", overflowY: "auto",
  },
  examResultTitle: { marginBottom: 16 },
  examScoreDisplay: { marginBottom: 16 },
  examScoreBig: { fontSize: "clamp(38.4px, 3.333vw, 55.2px)", fontWeight: "bold", color: "#333" },
  examScoreTotal: { fontSize: "clamp(19.2px, 1.667vw, 27.6px)", color: "#999" },
  examResultNote: { color: "#999", fontSize: "clamp(12.5px, 0.972vw, 16.1px)", marginBottom: 20 },
  // Forced choice
  choiceOverlay: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)", padding: 20,
  },
  tapHint: {
    fontSize: "clamp(11.5px, 0.833vw, 13.8px)",
    color: "#999",
    marginTop: 6,
    textAlign: "center",
  },
  choicePanel: {
    backgroundColor: "#FFF", borderRadius: 12,
    padding: "clamp(14px, 2vh, 28px) clamp(16px, 2vw, 28px)",
    maxWidth: 500, width: "90%",
    maxHeight: "calc(var(--vh100) - 32px)", overflowY: "auto",
  },
  choiceNarrative: { fontSize: "clamp(12.5px, 0.972vw, 16.1px)", lineHeight: 1.8, color: "#555", marginBottom: 16 },
  choiceQuestion: { fontSize: "clamp(14.4px, 1.25vw, 20.7px)", marginBottom: 20 },
  choiceOptions: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 },
  choiceBtn: {
    padding: "12px 16px", backgroundColor: "#F8F9FA",
    border: "2px solid #DEE2E6", borderRadius: 8,
    cursor: "pointer", fontSize: "clamp(12.5px, 0.972vw, 16.1px)", textAlign: "left",
    transition: "all 0.2s", fontFamily: "inherit", minHeight: 44, touchAction: "manipulation",
  },
  choiceResponseBox: {
    padding: 16, borderRadius: 8, border: "2px solid",
    marginBottom: 16,
  },
  choiceResponseSpeaker: { fontWeight: "bold", marginBottom: 4, fontSize: "clamp(12px, 0.903vw, 14.9px)", color: "#555" },
  choiceResponseText: { margin: 0, fontSize: "clamp(12.5px, 0.972vw, 16.1px)", lineHeight: 1.6 },
  // Conclusion
  conclusionOverlay: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.8)", padding: 20,
  },
  conclusionPanel: {
    backgroundColor: "#FFF", borderRadius: 12, padding: "clamp(14px, 2vh, 28px)",
    maxWidth: 560, width: "90%", maxHeight: "calc(var(--vh100) - 32px)", overflowY: "auto",
  },
  conclusionNarrative: { fontSize: "clamp(12.0px, 1.042vw, 17.2px)", lineHeight: 1.8, color: "#444", textIndent: "2em", marginBottom: 20 },
  conclusionPoem: {
    backgroundColor: "#FDF8F0", borderRadius: 12, padding: 20,
    marginBottom: 20, border: "1px solid #E8DCC8",
  },
  poemTitle: { margin: "0 0 12px", color: "#8B6914", fontSize: "clamp(12.0px, 1.042vw, 17.2px)" },
  poemContent: {
    margin: 0, fontSize: "clamp(12.8px, 1.111vw, 18.4px)", lineHeight: 2, color: "#5D4E37",
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    whiteSpace: "pre-wrap", textAlign: "center",
  },
  // Shared
  proceedBtn: {
    display: "block", width: "100%", padding: "12px",
    backgroundColor: "#8B7355", color: "#FFF", border: "none",
    borderRadius: 8, fontSize: "clamp(12.0px, 1.042vw, 17.2px)", fontWeight: "bold",
    cursor: "pointer", marginTop: 12,
  },
};

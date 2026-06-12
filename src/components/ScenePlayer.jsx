import { useState, useEffect, useCallback } from "react";
import { dufuPortraitPath, DUFU_LEGACY_PORTRAIT } from "../data/dufuPoses";

// ---- Portrait resolution -----------------------------------------------------
// Convention: every NPC PNG lives at /assets/characters/npcs/<speaker_id>.png.
// No hardcoded map needed — just derive the path from the speaker id.
function npcPortraitPath(speakerId) {
  return `/assets/characters/npcs/${speakerId}.png`;
}

// Du Fu portrait resolution lives in src/data/dufuPoses.js (shared with the
// editor). Priority: line dufu_pose > phase dufu_pose > event dufu_pose >
// stage default derived from the event year. The legacy
// /assets/characters/dufu/portrait.png is a blank image and is remapped.

/**
 * ScenePlayer - Interactive scene engine
 * Supports phase types: explore, exam, transition, forced_choice
 */
export default function ScenePlayer({ sceneData, globalScore, onScoreChange, onComplete }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [talkedNpcs, setTalkedNpcs] = useState(new Set());
  const [activeNpc, setActiveNpc] = useState(null);
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
  // Choice state
  const [choiceResponse, setChoiceResponse] = useState(null);
  const [choiceCorrect, setChoiceCorrect] = useState(false);
  const [showConclusion, setShowConclusion] = useState(false);
  // Poem compose state (multi-blank drag-fill)
  const [composedBlanks, setComposedBlanks] = useState([]);
  const [composedSubmitted, setComposedSubmitted] = useState(false);
  // Map travel state
  const [visitedWaypoints, setVisitedWaypoints] = useState(new Set());
  const [activeWaypoint, setActiveWaypoint] = useState(null);
  const [waypointDialogueIdx, setWaypointDialogueIdx] = useState(0);

  const phases = sceneData.phases;
  const currentPhase = phases[phaseIndex];

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
      setChoiceResponse(null);
      setChoiceCorrect(false);
      setShowConclusion(false);
      setComposedBlanks([]);
      setComposedSubmitted(false);
      setVisitedWaypoints(new Set());
      setActiveWaypoint(null);
      setWaypointDialogueIdx(0);
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
      onScoreChange(globalScore + 1);
    }
  };

  const handleExamFill = () => {
    if (examShowResult) return;
    setExamShowResult(true);
    if (examFillInput.trim() === currentPhase.questions[examIndex].answer) {
      setExamScore((s) => s + 1);
      onScoreChange(globalScore + 1);
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
      onScoreChange(globalScore + 1);
    }
  };

  // === CHOICE PHASE ===
  const handleChoice = (option) => {
    setChoiceResponse(option.response);
    if (option.correct) {
      setChoiceCorrect(true);
    }
  };

  // === RENDER ===
  const bgStyle = {
    ...styles.sceneContainer,
    backgroundImage: currentPhase.background ? `url(${currentPhase.background})` : "none",
  };

  // --- TRANSITION PHASE ---
  if (currentPhase.type === "transition") {
    const hasAnnouncement = !!currentPhase.announcement;
    const hasReaction = !!currentPhase.dufu_reaction;
    const handleTransitionClick = () => {
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
              <p style={styles.transitionText}>{currentPhase.transitionText}</p>
              <p style={styles.clickHint}>{"\u70B9\u51FB\u7EE7\u7EED"}</p>
            </div>
          ) : !showConclusion && hasAnnouncement ? (
            <div style={styles.scrollContainer} onClick={() => hasReaction ? setShowConclusion(true) : goToNextPhase()}>
              <div style={styles.scrollWrap}>
                <img src="/assets/scenes/02_changan/scroll.png" alt="" style={styles.scrollImg} />
                <div style={styles.scrollTextArea}>
                  <h2 style={styles.scrollTitle}>{"\u5236\u4E3E\u653E\u699C"}</h2>
                  <p style={styles.scrollResult}>{currentPhase.announcement.text}</p>
                </div>
              </div>
              <p style={styles.clickHint}>{"\u70B9\u51FB\u7EE7\u7EED"}</p>
            </div>
          ) : hasReaction ? (
            <div style={styles.announcementPanel}>
              <div style={styles.reactionBox}>
                <img
                  src={
                    currentPhase.dufu_reaction.portrait && currentPhase.dufu_reaction.portrait !== DUFU_LEGACY_PORTRAIT
                      ? currentPhase.dufu_reaction.portrait
                      : dufuPortraitPath(currentPhase.dufu_reaction.dufu_pose || currentPhase.dufu_pose || sceneData.dufu_pose, sceneData.year)
                  }
                  alt="" style={styles.reactionPortrait} />
                <p style={styles.reactionText}>{currentPhase.dufu_reaction.text}</p>
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
            backgroundImage: currentPhase.background ? `url(${currentPhase.background})` : "none",
          }}>
            {/* Phase title & instruction */}
            <div style={styles.phaseHeader}>
              <h2 style={styles.phaseTitle}>{currentPhase.title}</h2>
              {currentPhase.narrative && <p style={styles.phaseNarrative}>{currentPhase.narrative}</p>}
            </div>

            {currentPhase.instruction && (
              <div style={styles.instructionBar}>
                <span style={styles.instructionIcon}>{"\u{1F4AC}"}</span>
                <span>{currentPhase.instruction}</span>
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
              const basePct = 12 * (npc.scale || 1);
              const npcSize = `min(${basePct}vw, ${(basePct * 16) / 9}vh)`;
              return (
                <div
                  key={npc.id}
                  style={{
                    ...styles.npcMarker,
                    left: npc.position.x + "%",
                    top: npc.position.y + "%",
                    opacity: talked ? 0.6 : 1,
                  }}
                  onClick={() => handleNpcClick(npc)}
                >
                  {/* Portrait-less items render as a single ? marker — no name label.
                      Items with a portrait still show ? bubble + name. */}
                  {!npc.portrait ? (
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
                  ) : (
                    <>
                      {!talked && <div style={styles.npcBubble}>{"?"}</div>}
                      {talked && <div style={styles.npcCheckMark}>{"\u2713"}</div>}
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
                          src={npc.portrait}
                          alt={npc.name}
                          style={styles.npcPortraitImg}
                          onError={(e) => { e.currentTarget.style.opacity = "0.2"; }}
                        />
                      </div>
                      <span style={styles.npcName}>{npc.name}</span>
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
              const isSelf = line.speaker === "dufu" || line.speaker === "self";
              // Du Fu pose: per-line override > per-phase > per-event > stage default by year.
              const dufuPose = line.dufu_pose || currentPhase.dufu_pose || sceneData.dufu_pose;
              let portrait;
              if (isSelf) portrait = dufuPortraitPath(dufuPose, sceneData.year);
              else if (line.speaker === "narrator" || line.speaker === "portrait") portrait = "";
              else portrait = npcPortraitPath(line.speaker) || activeNpc.portrait;
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
                          src={portrait}
                          alt=""
                          style={styles.dialoguePortraitLarge}
                          onError={(e) => {
                            // If the speaker-specific portrait is missing,
                            // fall back to the activeNpc's portrait, then
                            // to a neutral silhouette so dialogue never
                            // loses its avatar.
                            if (activeNpc.portrait && e.currentTarget.src !== window.location.origin + activeNpc.portrait) {
                              e.currentTarget.src = activeNpc.portrait;
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
                        {line.text}
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
              <img src={examinerPortrait} alt={currentPhase.examiner?.name || ""} style={styles.examPortraitImg} />
            ) : (
              <div style={{ width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 14 }}>
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
                  )}
                  {examShowResult && !isCorrect && (
                    <div style={{ fontSize: 14, color: "#28A745", marginTop: 8 }}>
                      {"\u6B63\u786E\u7B54\u6848: " + q.answer}
                    </div>
                  )}
                </div>
              );
            })()}

            {examShowResult && q.explanation && (
              <div style={styles.explanationBox}>
                <p>{q.explanation}</p>
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
                    {opt.text}
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
            <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>{"\u{1F4DC} " + (currentPhase.title || "\u8BD7\u6B4C\u521B\u4F5C")}</h2>
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
                        const firstEmpty = composedBlanks.findIndex((v, i) => !v && i < blanks.length);
                        const idx = firstEmpty >= 0 ? firstEmpty : 0;
                        setBlank(idx, word);
                      }}
                      style={styles.fillChip}
                    >
                      {word}
                    </div>
                  ))}
                </div>
                <button
                  style={{ ...styles.proceedBtn, opacity: allFilled ? 1 : 0.5, cursor: allFilled ? "pointer" : "not-allowed" }}
                  disabled={!allFilled}
                  onClick={() => {
                    setComposedSubmitted(true);
                    onScoreChange(globalScore + correctCount);
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
                    <div key={i} style={{ fontSize: 13, color: "#28A745", marginTop: 4 }}>
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
    const allVisited = waypoints.every((w) => visitedWaypoints.has(w.id || w.name));
    const handleWaypointClick = (wp) => {
      const wid = wp.id || wp.name;
      if (wp.dialogues && wp.dialogues.length > 0) {
        setActiveWaypoint(wp);
        setWaypointDialogueIdx(0);
      } else {
        const next = new Set(visitedWaypoints);
        next.add(wid);
        setVisitedWaypoints(next);
      }
    };
    const advanceWaypointDialogue = () => {
      if (!activeWaypoint) return;
      const dlgs = activeWaypoint.dialogues || [];
      if (waypointDialogueIdx < dlgs.length - 1) {
        setWaypointDialogueIdx(waypointDialogueIdx + 1);
      } else {
        const wid = activeWaypoint.id || activeWaypoint.name;
        const next = new Set(visitedWaypoints);
        next.add(wid);
        setVisitedWaypoints(next);
        setActiveWaypoint(null);
        setWaypointDialogueIdx(0);
      }
    };

    return (
      <div style={styles.sceneOuter}>
        <div style={styles.sceneStage}>
          <div style={{
            ...styles.sceneStageInner,
            backgroundImage: currentPhase.background ? `url(${currentPhase.background})` : "none",
          }}>
            <div style={styles.phaseHeader}>
              <h2 style={styles.phaseTitle}>{currentPhase.title || "\u5730\u56FE\u884C\u65C5"}</h2>
              {currentPhase.travelNarrative && <p style={styles.phaseNarrative}>{currentPhase.travelNarrative}</p>}
            </div>

            {currentPhase.instruction && (
              <div style={styles.instructionBar}>
                <span style={styles.instructionIcon}>{"\u{1F5FA}"}</span>
                <span>{currentPhase.instruction}</span>
                <span style={styles.talkCount}>{"\u5DF2\u5230\u8BBF: " + visitedWaypoints.size + "/" + waypoints.length}</span>
              </div>
            )}

            {waypoints.map((wp) => {
              const wid = wp.id || wp.name;
              const visited = visitedWaypoints.has(wid);
              return (
                <div
                  key={wid}
                  style={{ ...styles.triggerZone, left: (wp.x || 50) + "%", top: (wp.y || 50) + "%", opacity: visited ? 0.55 : 1 }}
                  onClick={() => handleWaypointClick(wp)}
                >
                  <div style={{
                    ...styles.triggerPulse,
                    backgroundColor: visited ? "rgba(149,165,166,0.4)" : (wp.isKey ? "rgba(231,76,60,0.4)" : "rgba(46,204,113,0.4)"),
                    borderColor: visited ? "#95A5A6" : (wp.isKey ? "#E74C3C" : "#2ECC71"),
                    animation: visited ? "none" : "pulse 1.5s ease-in-out infinite",
                  }} />
                  <span style={{
                    ...styles.triggerLabel,
                    backgroundColor: visited ? "rgba(149,165,166,0.85)" : (wp.isKey ? "rgba(231,76,60,0.85)" : "rgba(46,204,113,0.85)"),
                  }}>{(visited ? "\u2713 " : "") + (wp.name || "\u76EE\u7684\u5730")}</span>
                </div>
              );
            })}

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
            <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>{"\u{1F4AC} \u5BF9\u8BDD: " + (currentPhase.branchCharacter || "")}</h2>
            {currentPhase.narrative && <p style={styles.choiceNarrative}>{currentPhase.narrative}</p>}
            <p style={{ color: "#999", fontSize: 13, marginBottom: 16 }}>{"\uFF08\u5BF9\u8BDD\u5206\u652F\u529F\u80FD\u5F00\u53D1\u4E2D\u2026\u2026\u591A\u8F6E\u5BF9\u8BDD\u6811\u5C06\u5728\u6B64\u5C55\u793A\uFF09"}</p>
            {(currentPhase.dialogueTree || []).map((node, i) => (
              <div key={i} style={{ ...styles.explanationBox, marginBottom: 8 }}>
                <strong>{node.speaker || "\u65C1\u767D"}: </strong>{node.text}
                {node.choices && node.choices.length > 0 && (
                  <div style={{ marginTop: 4, paddingLeft: 12 }}>
                    {node.choices.map((c, ci) => (
                      <div key={ci} style={{ color: "#2980B9", fontSize: 13 }}>{"\u2192 " + c.text}</div>
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
          <div style={{ maxWidth: 600, width: "90%", maxHeight: "85vh", overflowY: "auto" }}>
            {slides.length === 0 ? (
              <p style={{ color: "#AAA", textAlign: "center" }}>{"\uFF08\u6682\u65E0\u53D9\u4E8B\u5185\u5BB9\uFF09"}</p>
            ) : slides.map((slide, i) => (
              <div key={i} style={{ marginBottom: 24, textAlign: "center" }}>
                {slide.image && <img src={slide.image} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8 }} />}
                {slide.speaker && <div style={{ color: "#D4A574", fontSize: 14, fontWeight: "bold", marginBottom: 4 }}>{slide.speaker}</div>}
                <p style={{ color: "#F5E6D3", fontSize: 16, lineHeight: 1.8, margin: 0 }}>{slide.text}</p>
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
        <SlidingPuzzlePhase phase={currentPhase} onComplete={goToNextPhase} />
      </div>
    );
  }

  // --- CLICK POINTS PHASE (点击触发独白 + 渐进式诗句) ---
  // Renders as a popup modal containing the scene image with click-to-circle
  // 找茬-style markers, instruction at the top, and progressive poem reveal.
  if (currentPhase.type === "click_points") {
    return <ClickPointsPhase phase={currentPhase} onComplete={goToNextPhase} />;
  }

  // --- ESCAPE GAME PHASE (红蓝点逃离) ---
  if (currentPhase.type === "escape_game") {
    return (
      <div style={bgStyle}>
        <EscapeGamePhase
          phase={currentPhase}
          defaultPlayerPortrait={dufuPortraitPath(currentPhase.dufu_pose || sceneData.dufu_pose, sceneData.year)}
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
            <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>{"\u{1F3AE} " + (typeLabel[currentPhase.minigameType] || "\u5C0F\u6E38\u620F")}</h2>
            {currentPhase.minigameInstruction && <p style={styles.choiceNarrative}>{currentPhase.minigameInstruction}</p>}
            <p style={{ color: "#999", fontSize: 13, marginBottom: 16 }}>{"\uFF08\u5C0F\u6E38\u620F\u529F\u80FD\u5F00\u53D1\u4E2D\u2026\u2026\uFF09"}</p>
            {items.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {items.map((item, i) => (
                  <div key={i} style={{ ...styles.explanationBox, margin: 0, textAlign: "center" }}>
                    <div style={{ fontWeight: "bold" }}>{item.left}</div>
                    <div style={{ color: "#888", fontSize: 12 }}>{"\u2194 " + item.right}</div>
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
function SlidingPuzzlePhase({ phase, onComplete }) {
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
      if (isSolved) setSolved(true);
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
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>
          {"\u{1F4DC} 数字华容道  "}<span style={{ color: "#888", fontSize: 14 }}>{`(${pIdx + 1}/${puzzles.length})`}</span>
        </h2>
        {currentP.label && <p style={{ color: "#666", fontSize: 14, margin: "4px 0 12px" }}>{currentP.label}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: timeLeft <= 30 ? "#DC3545" : "#666" }}>
            {"⏱ 剩余 "}{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </span>
          <button style={{ ...styles.choiceBtn, fontSize: 12, padding: "4px 12px", margin: 0, width: "auto" }} onClick={skipPuzzle}>
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
                fontSize: 24,
                fontFamily: "'Noto Serif SC', 'Songti SC', serif",
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
            <div style={{ marginTop: 6, fontSize: 16 }}>{currentP.solution}</div>
          </div>
        )}
        {timeLeft === 0 && !solved && (
          <div style={{ ...styles.explanationBox, backgroundColor: "#FFF3CD", textAlign: "center" }}>
            <strong>{"⏱ 时间到"}</strong>
            <div style={{ marginTop: 6, fontSize: 14, color: "#666" }}>{"原句：" + currentP.solution}</div>
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
function ClickPointsPhase({ phase, onComplete }) {
  const points = phase.points || [];
  const poemLines = phase.progressivePoem || [];
  const threshold = phase.unlockThreshold || 3;
  const imageSrc = phase.image || phase.background;
  const hintIntervalSec = phase.hintIntervalSec || 30;
  const hintDurationSec = phase.hintDurationSec || 3;
  const [clicked, setClicked] = useState(new Set());
  const [activePoint, setActivePoint] = useState(null);
  const [showHint, setShowHint] = useState(false);

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

        {/* Image with click-to-circle markers */}
        <div style={cpStyles.imageWrap}>
          <img src={imageSrc} alt="" style={cpStyles.image} />
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

        {/* Progressive 春望 reveal */}
        {visibleLines > 0 && (
          <div style={cpStyles.poemBox}>
            <div style={cpStyles.poemTitle}>{"\u300A\u6625\u671B\u300B"}</div>
            {poemLines.slice(0, visibleLines).map((ln, i) => (
              <div key={i} style={cpStyles.poemLine}>{ln}</div>
            ))}
          </div>
        )}

        {/* Footer: continue */}
        {allClicked ? (
          <button onClick={onComplete} style={cpStyles.continueBtn}>
            {"\u7EE7\u7EED \u2192"}
          </button>
        ) : (
          <div style={cpStyles.hint}>
            {clicked.size < threshold
              ? `\u518D\u70B9 ${threshold - clicked.size} \u5904\uFF0C\u300A\u6625\u671B\u300B\u5C06\u7F13\u7F13\u6D6E\u73B0\u2026`
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
            <div style={cpStyles.bubbleText}>{activePoint.text}</div>
            <button onClick={() => setActivePoint(null)} style={cpStyles.bubbleClose}>{"\u77E5\u9053\u4E86"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const cpStyles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 250,
    backgroundColor: "rgba(0,0,0,0.75)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    padding: 20,
  },
  popup: {
    backgroundColor: "#F5E6D3",
    borderRadius: 12,
    maxWidth: "min(900px, 95vw)",
    width: "100%",
    maxHeight: "95vh",
    overflowY: "auto",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    display: "flex", flexDirection: "column",
  },
  header: {
    padding: "16px 24px 12px",
    borderBottom: "1px solid #D4A574",
  },
  title: {
    margin: "0 0 4px", fontSize: 22, color: "#3E2723",
    letterSpacing: 2,
  },
  narrative: {
    margin: "0 0 8px", fontSize: 13, color: "#6B5340", lineHeight: 1.6,
  },
  instructionRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: 13, color: "#8B7355",
  },
  progress: { color: "#3E2723" },
  imageWrap: {
    position: "relative",
    margin: "12px 16px",
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
    lineHeight: 0,
  },
  image: { width: "100%", height: "auto", display: "block" },
  poemBox: {
    margin: "8px 24px 12px",
    padding: "12px 16px",
    backgroundColor: "rgba(212,165,116,0.18)",
    borderLeft: "4px solid #D4A574",
    borderRadius: 4,
    textAlign: "center",
  },
  poemTitle: {
    fontSize: 14, color: "#8B7355", marginBottom: 6, letterSpacing: 2,
  },
  poemLine: {
    fontSize: 18, color: "#3E2723", lineHeight: 1.8, letterSpacing: 2,
  },
  continueBtn: {
    margin: "8px 24px 20px",
    padding: "12px 0", fontSize: 16, fontWeight: "bold",
    backgroundColor: "#8B7355", color: "#FFF", border: "none", borderRadius: 6,
    cursor: "pointer", fontFamily: "inherit",
  },
  hint: {
    margin: "8px 24px 20px",
    fontSize: 13, color: "#8B7355", textAlign: "center", fontStyle: "italic",
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
  bubbleLabel: { fontSize: 12, color: "#999", marginBottom: 8, letterSpacing: 1 },
  bubbleText: {
    fontSize: 18, color: "#3E2723", lineHeight: 1.8, letterSpacing: 1,
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
  },
  bubbleClose: {
    marginTop: 16, padding: "8px 24px", fontSize: 14,
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
function EscapeGamePhase({ phase, defaultPlayerPortrait, onComplete }) {
  // The legacy dufu/portrait.png is blank — remap it to the stage default.
  const playerPortrait =
    phase.playerPortrait && phase.playerPortrait !== DUFU_LEGACY_PORTRAIT
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

  const resetGame = useCallback(() => {
    setPlayer({ ...phase.start });
    setGuards(buildGuards());
    setWon(false);
  }, [phase.start, buildGuards]);

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
      const { dx, dy } = stepDir(dir);
      setPlayer((p) => {
        const nx = p.x + dx, ny = p.y + dy;
        if (isBlocked(nx, ny)) return p;
        return { x: nx, y: ny };
      });
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
        if (chaseRadius > 0) {
          const adx = Math.abs(player.x - g.pos.x);
          const ady = Math.abs(player.y - g.pos.y);
          if (Math.max(adx, ady) <= chaseRadius) {
            if (adx >= ady) {
              dir = player.x > g.pos.x ? "right" : (player.x < g.pos.x ? "left" : dir);
            } else {
              dir = player.y > g.pos.y ? "down" : (player.y < g.pos.y ? "up" : dir);
            }
          }
        }
        // If current cell has an arrow AND we're not chasing, take the arrow.
        if (chaseRadius === 0 || Math.max(Math.abs(player.x - g.pos.x), Math.abs(player.y - g.pos.y)) > chaseRadius) {
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
  }, [won, tickMs, player.x, player.y]);

  // ---- Collision + win ------------------------------------------------------
  useEffect(() => {
    if (won) return;
    if (player.x === phase.end.x && player.y === phase.end.y) {
      setWon(true);
      return;
    }
    if (guards.some((g) => g.pos.x === player.x && g.pos.y === player.y)) {
      setDeaths((d) => d + 1);
      setPlayer({ ...phase.start });
      setGuards(buildGuards());
    }
  }, [player, guards, won, phase.end, phase.start, buildGuards]);

  // ---- Render ---------------------------------------------------------------
  // Each cell is a square; merged cells span via grid-column/row.
  const cellPx = `min(calc(80vw / ${gridW}), calc(70vh / ${gridH}))`;
  const arrowGlyph = { up: "\u2191", down: "\u2193", left: "\u2190", right: "\u2192" };

  return (
    <div style={egStyles.overlay}>
      <div style={egStyles.popup}>
        <h2 style={egStyles.title}>{"\u{1F6AA} \u51FA\u57CE\uFF1A\u907F\u5F00\u5B88\u536B"}</h2>
        {phase.narrative && <p style={egStyles.narrative}>{phase.narrative}</p>}
        <div style={egStyles.statusRow}>
          <span>{"\u65B9\u5411\u952E / WASD \u79FB\u52A8 \u00B7 \u9047\u5B88\u536B\u56DE\u8D77\u70B9 \u00B7 \u62B5\u8FBE\u95E8\u5916\u80DC\u5229"}</span>
          <span style={{ color: "#DC3545" }}>{"\u88AB\u6293\uFF1A" + deaths}</span>
          <button onClick={resetGame} style={egStyles.restartBtn}>{"\u91CD\u65B0\u5F00\u59CB"}</button>
        </div>

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
              // Only render the top-left tile of a merged building; let others be transparent
              const owner = ownerMap.get(x + "," + y);
              if (owner && (owner.x !== x || owner.y !== y)) {
                return <div key={i} style={{ backgroundColor: "transparent" }} />;
              }
              return (
                <div key={i} style={{
                  gridColumn: `${x + 1} / span ${(owner?.w) || 1}`,
                  gridRow: `${y + 1} / span ${(owner?.h) || 1}`,
                  backgroundColor: owner?.fill || "#D4B89A",
                  border: "2px solid #8B7355",
                  borderRadius: 6,
                  margin: 3, // shrink buildings so the lanes between walls look wider
                  boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  textAlign: "center",
                  fontFamily: "'Noto Serif SC', 'Songti SC', serif",
                  color: "#3E2723",
                  fontSize: "min(1.2vw, 14px)", fontWeight: "bold",
                  letterSpacing: 1, lineHeight: 1.2,
                  whiteSpace: "pre-wrap",
                }}>
                  {owner?.label || ""}
                </div>
              );
            }

            // Street cell (walkable)
            let bg = "#F5F5DC";
            if (isEnd) bg = "#90EE90";
            if (isStart) bg = "#FFD580";
            return (
              <div key={i} style={{
                backgroundColor: bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
                fontSize: 10, color: "#888",
              }}>
                {arrow && (
                  <span style={{ color: "#3498DB", fontSize: "min(2vw, 22px)", fontWeight: "bold", opacity: 0.7 }}>
                    {arrowGlyph[arrow] || ""}
                  </span>
                )}
                {gate && (
                  <span style={{ position: "absolute", top: 1, left: 2, fontSize: 9, color: "#666", whiteSpace: "nowrap" }}>
                    {gate}
                  </span>
                )}
                {isEnd && !arrow && <span style={{ fontSize: 9, color: "#1B5E20", fontWeight: "bold" }}>{"\u51FA\u95E8"}</span>}
                {isStart && !arrow && <span style={{ fontSize: 9, color: "#E65100", fontWeight: "bold" }}>{"\u8D77\u70B9"}</span>}
              </div>
            );
          })}

          {/* Player overlay (absolute over the grid) */}
          <div style={{
            position: "absolute",
            left: `calc(4px + (${player.x} + 0.5) * ${cellPx})`,
            top:  `calc(4px + (${player.y} + 0.5) * ${cellPx})`,
            transform: "translate(-50%, -50%)",
            width: `calc(${cellPx} * 0.8)`,
            height: `calc(${cellPx} * 0.8)`,
            borderRadius: "50%",
            backgroundColor: playerPortrait ? "transparent" : "#E74C3C",
            backgroundImage: playerPortrait ? `url(${playerPortrait})` : "none",
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
              width: `calc(${cellPx} * 0.85)`,
              height: `calc(${cellPx} * 0.85)`,
              borderRadius: "50%",
              backgroundColor: g.portrait ? "transparent" : "#3498DB",
              backgroundImage: g.portrait ? `url(${g.portrait})` : "none",
              backgroundSize: "cover", backgroundPosition: "center top",
              border: "2px solid #1F4E79",
              boxShadow: "0 0 6px rgba(52,152,219,0.65)",
              zIndex: 15,
              transition: `left ${tickMs}ms linear, top ${tickMs}ms linear`,
              pointerEvents: "none",
            }} />
          ))}
        </div>

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
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    padding: 16, overflow: "auto",
  },
  popup: {
    backgroundColor: "#F5E6D3", borderRadius: 12, padding: "16px 20px",
    maxWidth: "min(95vw, 980px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    textAlign: "center", maxHeight: "95vh", overflow: "auto",
  },
  title: { margin: "0 0 4px", fontSize: 22, color: "#3E2723", letterSpacing: 2 },
  narrative: { margin: "0 0 8px", fontSize: 13, color: "#6B5340" },
  statusRow: {
    fontSize: 12, color: "#666", marginBottom: 10,
    display: "flex", gap: 16, justifyContent: "center", alignItems: "center",
    flexWrap: "wrap",
  },
  restartBtn: {
    fontSize: 12, padding: "4px 12px", border: "1px solid #999",
    borderRadius: 4, backgroundColor: "#FFF", cursor: "pointer",
    fontFamily: "inherit",
  },
  win: {
    marginTop: 16, padding: 12, backgroundColor: "#D4EDDA",
    color: "#155724", borderRadius: 6,
  },
  continueBtn: {
    marginTop: 12, padding: "12px 32px", fontSize: 16, fontWeight: "bold",
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
// STYLES
// ============================================================
const styles = {
  sceneContainer: {
    position: "fixed", inset: 0, zIndex: 200,
    backgroundSize: "cover", backgroundPosition: "center",
    backgroundColor: "#2C3E50",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    display: "flex", flexDirection: "column",
  },
  // Locked aspect-ratio wrapper for explore phase
  sceneOuter: {
    position: "fixed", inset: 0, zIndex: 200,
    backgroundColor: "#000",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
  },
  sceneStage: {
    width: "100%", height: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  sceneStageInner: {
    position: "relative",
    width: "min(100vw, calc(100vh * 16 / 9))",
    height: "min(100vh, calc(100vw * 9 / 16))",
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
  phaseTitle: { margin: "0 0 4px", fontSize: 22, letterSpacing: 4 },
  phaseNarrative: { margin: 0, fontSize: 13, opacity: 0.85, lineHeight: 1.6 },
  // Instruction
  instructionBar: {
    // Top-right corner so it never overlaps character art in the scene.
    position: "absolute", top: 14, right: 14,
    maxWidth: "36%",
    backgroundColor: "rgba(0,0,0,0.8)", color: "#F5E6D3",
    padding: "10px 16px", borderRadius: 8, fontSize: 13, lineHeight: 1.5,
    display: "flex", alignItems: "center", gap: 8,
    zIndex: 25,
  },
  instructionIcon: { fontSize: 18 },
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
    color: "#FFF", fontSize: 16, fontWeight: "bold",
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
    fontSize: 15, fontWeight: "bold", color: "#FFF",
    textShadow: "1px 1px 3px rgba(0,0,0,0.8)",
  },
  npcTextLabelHint: {
    fontSize: 10, color: "rgba(255,255,255,0.7)",
  },
  npcName: {
    marginTop: 4, fontSize: 12, color: "#FFF",
    backgroundColor: "rgba(0,0,0,0.6)", padding: "2px 8px",
    borderRadius: 4, whiteSpace: "nowrap",
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
    fontSize: 14, fontWeight: "bold",
    pointerEvents: "none",
    marginBottom: 4,
  },
  // Standalone ? marker for portrait-less items (props, paintings, scrolls).
  // No name label; the ? itself is the clickable element.
  npcQuestionMark: {
    width: 36, height: 36, borderRadius: "50%",
    color: "#FFF",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, fontWeight: "bold",
    border: "2px solid rgba(255,255,255,0.9)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
    cursor: "pointer",
    transition: "transform 0.15s ease",
  },
  npcCheckMark: {
    width: 28, height: 28, borderRadius: "50%",
    backgroundColor: "rgba(46,204,113,0.85)", color: "#FFF",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: "bold",
    pointerEvents: "none",
    marginBottom: 4,
  },
  // Trigger zone
  triggerZone: {
    position: "absolute", transform: "translate(-50%, -50%)",
    display: "flex", flexDirection: "column", alignItems: "center",
    cursor: "pointer", zIndex: 10,
  },
  triggerPulse: {
    width: 50, height: 50, borderRadius: "50%",
    backgroundColor: "rgba(46,204,113,0.4)",
    border: "3px solid #2ECC71",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  triggerLabel: {
    marginTop: 6, fontSize: 13, color: "#FFF", fontWeight: "bold",
    backgroundColor: "rgba(46,204,113,0.85)", padding: "4px 12px",
    borderRadius: 4, whiteSpace: "nowrap",
  },
  floatingProceed: {
    position: "absolute", bottom: 20, right: 20,
    padding: "12px 24px", backgroundColor: "#2ECC71",
    color: "#FFF", border: "none", borderRadius: 8,
    fontSize: 15, fontWeight: "bold", cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
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
    width: "25vw", minWidth: 180, maxWidth: 360,
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
    color: "#D4A574", fontSize: 16, fontWeight: "bold",
    letterSpacing: 3, marginBottom: 12,
  },
  dialogueText: {
    color: "#F5E6D3", fontSize: 17, lineHeight: 2,
  },
  dialogueContinue: {
    textAlign: "right", color: "#A89968", fontSize: 13,
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
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
  },
  bubbleSpeaker: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#8B6914",
    letterSpacing: 2,
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "#3B2510",
    whiteSpace: "pre-wrap",
  },
  bubbleContinue: {
    textAlign: "right",
    fontSize: 12,
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
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  transitionCard: {
    textAlign: "center", cursor: "pointer", padding: 40,
  },
  transitionText: {
    color: "#F4D03F", fontSize: 32, letterSpacing: 8,
    marginBottom: 16,
  },
  clickHint: { color: "#AAA", fontSize: 14, marginTop: 12 },
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
    color: "#D4A574", fontSize: 22, fontWeight: "bold",
    letterSpacing: 4, marginBottom: 12,
  },
  examIntroText: {
    color: "#F5E6D3", fontSize: 16, lineHeight: 2,
    margin: "0 0 8px",
  },
  // Scroll bulletin board
  scrollContainer: {
    display: "flex", flexDirection: "column", alignItems: "center",
    cursor: "pointer",
  },
  scrollWrap: {
    position: "relative", width: 500, maxWidth: "90vw",
  },
  scrollImg: {
    width: "100%", height: "auto", display: "block",
  },
  scrollTextArea: {
    position: "absolute",
    top: "18%", left: "18%", right: "18%", bottom: "22%",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    textAlign: "center",
  },
  scrollTitle: {
    fontSize: 28, color: "#3B2510", letterSpacing: 8,
    fontWeight: "bold", margin: "0 0 20px",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
  },
  scrollResult: {
    fontSize: 36, color: "#8B0000", fontWeight: "bold",
    letterSpacing: 12, margin: 0,
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
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
    fontSize: 16, fontWeight: "bold", border: "2px solid #922B21",
  },
  decreeText: {
    color: "#F5E6D3", fontSize: 16, lineHeight: 1.8, marginTop: 8,
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
  reactionText: { color: "#F5E6D3", fontSize: 14, lineHeight: 1.6, margin: 0, flex: 1 },
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
  },
  examPortraitImg: {
    width: "100%", height: "auto", maxHeight: "80vh",
    objectFit: "contain",
    filter: "drop-shadow(4px 4px 16px rgba(0,0,0,0.7))",
  },
  examPanelRight: {
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 12,
    padding: "24px 32px",
    maxHeight: "80vh", overflowY: "auto",
    width: "55vw", maxWidth: 680, minWidth: 360,
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
    zIndex: 1,
  },
  examPanel: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 28,
    maxWidth: 600, width: "90%", maxHeight: "85vh", overflowY: "auto",
  },
  examinerBar: {
    backgroundColor: "#8B7355", color: "#FFF", padding: "6px 16px",
    borderRadius: 6, marginBottom: 16, display: "inline-block", fontSize: 13,
  },
  examinerName: { fontWeight: "bold" },
  examProgress: { fontSize: 13, color: "#999", marginBottom: 16 },
  examQuestion: { fontSize: 17, lineHeight: 1.6, marginBottom: 20, whiteSpace: "pre-wrap" },
  examOptions: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 },
  examOption: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px", border: "2px solid", borderRadius: 8,
    cursor: "pointer", transition: "all 0.2s",
  },
  examOptionLetter: { fontWeight: "bold", fontSize: 16, minWidth: 24 },
  fillRow: { display: "flex", gap: 8, marginBottom: 20 },
  fillInput: {
    flex: 1, padding: "10px 14px", border: "2px solid", borderRadius: 6,
    fontSize: 16, fontFamily: "inherit", textAlign: "center",
  },
  fillSubmit: {
    padding: "10px 18px", backgroundColor: "#8B7355", color: "#FFF",
    border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold",
  },
  fillPassage: {
    fontSize: 16, lineHeight: 2.2, color: "#333",
    marginBottom: 16, whiteSpace: "pre-wrap",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
  },
  fillDropZone: {
    display: "inline-block", minWidth: 60, padding: "4px 12px",
    border: "2px dashed", borderRadius: 6,
    textAlign: "center", fontSize: 16, fontWeight: "bold",
    transition: "all 0.2s", verticalAlign: "middle",
  },
  fillChips: {
    display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16,
    justifyContent: "center",
  },
  fillChip: {
    padding: "8px 18px", backgroundColor: "#FDF8F0",
    border: "2px solid #D4A574", borderRadius: 8,
    fontSize: 16, fontWeight: "bold", color: "#5D4E37",
    cursor: "grab", userSelect: "none",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    transition: "all 0.2s",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  explanationBox: {
    backgroundColor: "#F0F8FF", border: "1px solid #B0D4FF",
    borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 14, lineHeight: 1.6,
  },
  examResultCard: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 32,
    maxWidth: 400, width: "90%", textAlign: "center",
  },
  examResultTitle: { marginBottom: 16 },
  examScoreDisplay: { marginBottom: 16 },
  examScoreBig: { fontSize: 48, fontWeight: "bold", color: "#333" },
  examScoreTotal: { fontSize: 24, color: "#999" },
  examResultNote: { color: "#999", fontSize: 14, marginBottom: 20 },
  // Forced choice
  choiceOverlay: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)", padding: 20,
  },
  choicePanel: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 28,
    maxWidth: 500, width: "90%",
  },
  choiceNarrative: { fontSize: 14, lineHeight: 1.8, color: "#555", marginBottom: 16 },
  choiceQuestion: { fontSize: 18, marginBottom: 20 },
  choiceOptions: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 },
  choiceBtn: {
    padding: "12px 16px", backgroundColor: "#F8F9FA",
    border: "2px solid #DEE2E6", borderRadius: 8,
    cursor: "pointer", fontSize: 14, textAlign: "left",
    transition: "all 0.2s", fontFamily: "inherit",
  },
  choiceResponseBox: {
    padding: 16, borderRadius: 8, border: "2px solid",
    marginBottom: 16,
  },
  choiceResponseSpeaker: { fontWeight: "bold", marginBottom: 4, fontSize: 13, color: "#555" },
  choiceResponseText: { margin: 0, fontSize: 14, lineHeight: 1.6 },
  // Conclusion
  conclusionOverlay: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.8)", padding: 20,
  },
  conclusionPanel: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 28,
    maxWidth: 560, width: "90%", maxHeight: "85vh", overflowY: "auto",
  },
  conclusionNarrative: { fontSize: 15, lineHeight: 1.8, color: "#444", textIndent: "2em", marginBottom: 20 },
  conclusionPoem: {
    backgroundColor: "#FDF8F0", borderRadius: 12, padding: 20,
    marginBottom: 20, border: "1px solid #E8DCC8",
  },
  poemTitle: { margin: "0 0 12px", color: "#8B6914", fontSize: 15 },
  poemContent: {
    margin: 0, fontSize: 16, lineHeight: 2, color: "#5D4E37",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    whiteSpace: "pre-wrap", textAlign: "center",
  },
  // Shared
  proceedBtn: {
    display: "block", width: "100%", padding: "12px",
    backgroundColor: "#8B7355", color: "#FFF", border: "none",
    borderRadius: 8, fontSize: 15, fontWeight: "bold",
    cursor: "pointer", marginTop: 12,
  },
};

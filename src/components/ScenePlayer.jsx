import { useState, useEffect, useCallback } from "react";

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
                <img src={currentPhase.dufu_reaction.portrait} alt="" style={styles.reactionPortrait} />
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
                  {!talked && <div style={styles.npcBubble}>{"?"}</div>}
                  {talked && <div style={styles.npcCheckMark}>{"\u2713"}</div>}
                  {npc.portrait ? (
                    <div style={{
                      ...styles.npcPortraitWrap,
                      width: npcSize,
                      height: npcSize,
                      borderColor: talked ? "#95A5A6" : npc.isClue ? "#E74C3C" : "#3498DB",
                      transform: npc.flip ? "scaleX(-1)" : "none",
                    }}>
                      <img src={npc.portrait} alt={npc.name} style={styles.npcPortraitImg} />
                    </div>
                  ) : (
                    <div style={{
                      ...styles.npcTextLabel,
                      borderColor: talked ? "#95A5A6" : npc.isClue ? "#E74C3C" : "#D4A574",
                      backgroundColor: talked ? "rgba(149,165,166,0.15)" : "rgba(212,165,116,0.2)",
                    }}>
                      <span style={styles.npcTextLabelName}>{npc.name}</span>
                      {!talked && <span style={styles.npcTextLabelHint}>{"点击查看"}</span>}
                    </div>
                  )}
                  {npc.portrait && <span style={styles.npcName}>{npc.name}</span>}
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
          </div>
        </div>

        {/* Active NPC dialogue — large portrait left, text right */}
        {activeNpc && (
          <div style={styles.dialogueOverlay} onClick={handleDialogueNext}>
            {(() => {
              const line = activeNpc.dialogues[dialogueIndex];
              const isSelf = line.speaker === "dufu" || line.speaker === "self";
              const speakerPortraitMap = {
                scholar_a: "/assets/characters/npcs/scholar_a.png",
                scholar_b: "/assets/characters/npcs/scholar_b.png",
                merchant_a: "/assets/characters/npcs/merchant_a.png",
                merchant_b: "/assets/characters/npcs/merchant_b.png",
                merchant_c: "/assets/characters/npcs/merchant_c.png",
                waiter: "/assets/characters/npcs/waiter.png",
                innkeeper: "/assets/characters/npcs/innkeeper.png",
                LinFu_Li: "/assets/characters/npcs/LinFu_Li.png",
              };
              let portrait;
              if (isSelf) portrait = "/assets/characters/dufu/portrait.png";
              else if (line.speaker === "narrator" || line.speaker === "portrait") portrait = "";
              else portrait = speakerPortraitMap[line.speaker] || activeNpc.portrait;
              return (
                <>
                  {/* Full-width dialogue background bar at bottom */}
                  <div style={styles.dialogueBar}>
                    {/* Portrait overlapping the bar from the left */}
                    {portrait && (
                      <div style={styles.dialoguePortraitArea}>
                        <img src={portrait} alt="" style={styles.dialoguePortraitLarge} />
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
                        {dialogueIndex < activeNpc.dialogues.length - 1 ? "\u25BC \u70B9\u51FB\u4EFB\u610F\u4F4D\u7F6E\u7EE7\u7EED" : "\u2713 \u70B9\u51FB\u4EFB\u610F\u4F4D\u7F6E\u5173\u95ED"}
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
    return (
      <div style={bgStyle}>
        <div style={styles.choiceOverlay}>
          <div style={styles.choicePanel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>{"\u{1F4DC} \u8BD7\u6B4C\u521B\u4F5C"}</h2>
            {currentPhase.poemContext && <p style={styles.choiceNarrative}>{currentPhase.poemContext}</p>}
            <p style={{ color: "#999", fontSize: 13, marginBottom: 16 }}>{"\uFF08\u6B64\u529F\u80FD\u5F00\u53D1\u4E2D\u2026\u2026\u73A9\u5BB6\u5C06\u4ECE\u5019\u9009\u8BCD\u53E5\u4E2D\u62FC\u51FA\u8BD7\u53E5\uFF09"}</p>
            {currentPhase.poemAnswer && (
              <div style={styles.conclusionPoem}>
                <pre style={styles.poemContent}>{currentPhase.poemAnswer}</pre>
              </div>
            )}
            <button style={styles.proceedBtn} onClick={goToNextPhase}>{"\u7EE7\u7EED \u2192"}</button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAP TRAVEL PHASE ---
  if (currentPhase.type === "map_travel") {
    return (
      <div style={bgStyle}>
        <div style={styles.phaseHeader}>
          <h2 style={styles.phaseTitle}>{currentPhase.title || "\u5730\u56FE\u884C\u65C5"}</h2>
          {currentPhase.travelNarrative && <p style={styles.phaseNarrative}>{currentPhase.travelNarrative}</p>}
        </div>
        {(currentPhase.destinations || []).map((dest, i) => (
          <div
            key={i}
            style={{ ...styles.triggerZone, left: (dest.x || 50) + "%", top: (dest.y || 50) + "%" }}
            onClick={goToNextPhase}
          >
            <div style={styles.triggerPulse} />
            <span style={styles.triggerLabel}>{dest.name || "\u76EE\u7684\u5730"}</span>
          </div>
        ))}
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", color: "#FFF", backgroundColor: "rgba(0,0,0,0.6)", padding: "8px 16px", borderRadius: 8, fontSize: 13 }}>
          {"\uFF08\u5730\u56FE\u884C\u65C5\u529F\u80FD\u5F00\u53D1\u4E2D\u2026\u2026\u70B9\u51FB\u76EE\u7684\u5730\u7EE7\u7EED\uFF09"}
        </div>
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
    background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
    color: "#FFF",
    position: "relative",
    zIndex: 20,
  },
  phaseTitle: { margin: "0 0 4px", fontSize: 22, letterSpacing: 4 },
  phaseNarrative: { margin: 0, fontSize: 13, opacity: 0.85, lineHeight: 1.6 },
  // Instruction
  instructionBar: {
    position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
    backgroundColor: "rgba(0,0,0,0.8)", color: "#F5E6D3",
    padding: "10px 20px", borderRadius: 8, fontSize: 13,
    display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
  },
  instructionIcon: { fontSize: 18 },
  talkCount: { marginLeft: 16, color: "#F4D03F", fontWeight: "bold" },
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

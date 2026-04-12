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
    return (
      <div style={bgStyle}>
        <div style={styles.transitionOverlay}>
          {!transitionDone ? (
            <div style={styles.transitionCard} onClick={() => setTransitionDone(true)}>
              <p style={styles.transitionText}>{currentPhase.transitionText}</p>
              <p style={styles.clickHint}>{"\u70B9\u51FB\u7EE7\u7EED"}</p>
            </div>
          ) : (
            <div style={styles.announcementPanel}>
              {currentPhase.announcement && (
                <div style={styles.decree}>
                  <div style={styles.decreeSeal}>{"\u7687"}</div>
                  <p style={styles.decreeText}>{currentPhase.announcement.text}</p>
                </div>
              )}
              {currentPhase.dufu_reaction && (
                <div style={styles.reactionBox}>
                  <img src={currentPhase.dufu_reaction.portrait} alt="" style={styles.reactionPortrait} />
                  <p style={styles.reactionText}>{currentPhase.dufu_reaction.text}</p>
                </div>
              )}
              <button style={styles.proceedBtn} onClick={goToNextPhase}>
                {"\u7EE7\u7EED \u2192"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- EXPLORE PHASE ---
  if (currentPhase.type === "explore") {
    return (
      <div style={bgStyle}>
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

        {/* NPC markers with portraits */}
        {currentPhase.npcs.map((npc) => {
          const talked = talkedNpcs.has(npc.id);
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
              {npc.portrait ? (
                <div style={{
                  ...styles.npcPortraitWrap,
                  borderColor: talked ? "#95A5A6" : npc.isClue ? "#E74C3C" : "#3498DB",
                }}>
                  <img src={npc.portrait} alt={npc.name} style={styles.npcPortraitImg} />
                  {!talked && <div style={styles.npcBubble}>{"?"}</div>}
                  {talked && <div style={styles.npcCheckMark}>{"\u2713"}</div>}
                </div>
              ) : (
                <div style={{
                  ...styles.npcDot,
                  backgroundColor: talked ? "#95A5A6" : npc.isClue ? "#E74C3C" : "#3498DB",
                }}>
                  {talked ? "\u2713" : "?"}
                </div>
              )}
              <span style={styles.npcName}>{npc.name}</span>
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

        {/* Active NPC dialogue with portrait — click anywhere to advance/close */}
        {activeNpc && (
          <div style={styles.dialogueOverlay} onClick={handleDialogueNext}>
            <div style={styles.dialogueBox}>
              <div style={styles.dialogueInner}>
                {(() => {
                  const line = activeNpc.dialogues[dialogueIndex];
                  const isSelf = line.speaker === "dufu" || line.speaker === "self";
                  const portrait = isSelf ? "/assets/characters/dufu/portrait.png" : activeNpc.portrait;
                  return portrait ? <img src={portrait} alt="" style={styles.dialoguePortrait} /> : null;
                })()}
                <div style={styles.dialogueContent}>
                  <div style={styles.dialogueSpeaker}>
                    {activeNpc.dialogues[dialogueIndex].speakerName || activeNpc.name}
                  </div>
                  <div style={styles.dialogueText}>
                    {activeNpc.dialogues[dialogueIndex].text}
                  </div>
                </div>
              </div>
              <div style={styles.dialogueContinue}>
                {dialogueIndex < activeNpc.dialogues.length - 1 ? "\u25BC \u70B9\u51FB\u4EFB\u610F\u4F4D\u7F6E\u7EE7\u7EED" : "\u2713 \u70B9\u51FB\u4EFB\u610F\u4F4D\u7F6E\u5173\u95ED"}
              </div>
            </div>
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

    return (
      <div style={bgStyle}>
        <div style={styles.examOverlay}>
          <div style={styles.examPanel}>
            {currentPhase.examiner && (
              <div style={styles.examinerBar}>
                <span style={styles.examinerName}>{currentPhase.examiner.name}</span>
              </div>
            )}
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

            {q.type === "poem_fill" && (
              <div style={styles.fillRow}>
                <input
                  type="text"
                  value={examFillInput}
                  onChange={(e) => setExamFillInput(e.target.value)}
                  placeholder={"\u8BF7\u8F93\u5165\u7B54\u6848..."}
                  style={{
                    ...styles.fillInput,
                    borderColor: examShowResult ? (examFillInput.trim() === q.answer ? "#28A745" : "#DC3545") : "#CCC",
                  }}
                  disabled={examShowResult}
                  onKeyDown={(e) => e.key === "Enter" && handleExamFill()}
                />
                {!examShowResult && (
                  <button style={styles.fillSubmit} onClick={handleExamFill}>{"\u786E\u8BA4"}</button>
                )}
              </div>
            )}

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
              <button style={styles.proceedBtn} onClick={onComplete}>
                {"\u5B8C\u6210\u672C\u573A\u666F \u2192"}
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
  // Phase header
  phaseHeader: {
    padding: "16px 24px",
    background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
    color: "#FFF",
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
    position: "absolute", top: -4, right: -4,
    width: 20, height: 20, borderRadius: "50%",
    backgroundColor: "#E74C3C", color: "#FFF",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: "bold",
  },
  npcCheckMark: {
    position: "absolute", top: -4, right: -4,
    width: 20, height: 20, borderRadius: "50%",
    backgroundColor: "#2ECC71", color: "#FFF",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: "bold",
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
    display: "flex", flexDirection: "column", justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)", cursor: "pointer",
  },
  dialogueBox: {
    backgroundColor: "rgba(30,20,10,0.95)",
    padding: "20px 28px", minHeight: 140,
    borderTop: "2px solid #8B7355",
  },
  dialogueInner: {
    display: "flex", alignItems: "flex-start", gap: 16,
  },
  dialoguePortrait: {
    width: 72, height: 72, objectFit: "contain",
    flexShrink: 0,
  },
  dialogueContent: { flex: 1 },
  dialogueSpeaker: {
    color: "#D4A574", fontSize: 14, fontWeight: "bold",
    letterSpacing: 2, marginBottom: 8,
  },
  dialogueText: {
    color: "#F5E6D3", fontSize: 15, lineHeight: 1.8,
  },
  dialogueContinue: {
    textAlign: "right", color: "#A89968", fontSize: 12,
    marginTop: 12, cursor: "pointer",
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
  clickHint: { color: "#AAA", fontSize: 14 },
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

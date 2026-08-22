import { useState, useEffect } from "react";
import { POINTS } from "../utils/scoring";

export default function QuizPanel({ stage, awardScore, onComplete, onClose }) {
  const [quizData, setQuizData] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [fillInput, setFillInput] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load quiz data (event-based path; 事件 id 年份 <1000 → dufu，否则 → dante)
  useEffect(() => {
    if (loading) {
      const line = parseInt(stage.id, 10) < 1000 ? "dufu" : "dante";
      import(`../data/${line}/events/${stage.id}/quiz.json`)
        .then((module) => {
          setQuizData(module.default);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [stage.id, loading]);

  if (loading || !quizData) {
    return null;
  }

  const quizzes = quizData.quizzes;
  const current = quizzes[qIndex];

  const handleChoice = (idx) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    if (idx === current.answer) {
      setScore((s) => s + 1);
      if (awardScore) awardScore(`${stage.id}:quiz:q${qIndex}`, POINTS.choice);
    }
  };

  const handleFill = () => {
    if (showResult) return;
    setShowResult(true);
    if (fillInput.trim() === current.answer) {
      setScore((s) => s + 1);
      if (awardScore) awardScore(`${stage.id}:quiz:q${qIndex}`, POINTS.poemFill);
    }
  };

  const nextQuestion = () => {
    if (qIndex + 1 >= quizzes.length) {
      setIsFinished(true);
    } else {
      setQIndex(qIndex + 1);
      setSelected(null);
      setShowResult(false);
      setFillInput("");
    }
  };

  if (isFinished) {
    const passed = score >= Math.ceil(quizzes.length * 0.5);
    return (
      <div style={styles.eventOverlay} onClick={onClose}>
        <div style={styles.quizResultPanel} onClick={(e) => e.stopPropagation()}>
          <h2 style={{ margin: "0 0 16px", textAlign: "center" }}>
            {passed
              ? "\u{1F389} \u606d\u559c\u8fc7\u5173\uff01"
              : "\u{1F4DA} \u7ee7\u7eed\u52a0\u6cb9\uff01"}
          </h2>
          <div style={styles.scoreDisplay}>
            <span style={styles.scoreBig}>
              {score}/{quizzes.length}
            </span>
          </div>
          <p style={{ textAlign: "center", color: "#666", margin: "16px 0" }}>
            {passed
              ? "\u4f60\u5df2\u638c\u63e1\u300c" +
                stage.period +
                "\u300d\u7684\u5386\u53f2\u77e5\u8bc6\uff01"
              : "\u518d\u56de\u987e\u4e00\u4e0b\u8fd9\u6bb5\u5386\u53f2\u5427~"}
          </p>
          <button
            style={{
              ...styles.quizBtn,
              backgroundColor: stage.color,
              width: "100%",
            }}
            onClick={() => {
              onComplete(passed);
              onClose();
            }}
          >
            {passed ? "\u7ee7\u7eed\u65c5\u7a0b \u2192" : "\u5173\u95ed"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.eventOverlay} onClick={onClose}>
      <div style={styles.quizPanel} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          {"\u2715"}
        </button>
        <div style={styles.quizHeader}>
          <span style={{ ...styles.quizBadge, backgroundColor: stage.color }}>
            {stage.period}
          </span>
          <span style={styles.quizProgress}>
            {qIndex + 1} / {quizzes.length}
          </span>
        </div>

        <h3 style={styles.quizQuestion}>{current.question}</h3>

        {current.type === "choice" && (
          <div style={styles.optionsContainer}>
            {current.options.map((opt, i) => {
              let bg = "#F8F9FA";
              let border = "#DEE2E6";
              if (showResult) {
                if (i === current.answer) {
                  bg = "#D4EDDA";
                  border = "#28A745";
                } else if (i === selected && i !== current.answer) {
                  bg = "#F8D7DA";
                  border = "#DC3545";
                }
              } else if (i === selected) {
                bg = "#E3F2FD";
                border = stage.color;
              }
              return (
                <div
                  key={i}
                  style={{
                    ...styles.optionBtn,
                    backgroundColor: bg,
                    borderColor: border,
                  }}
                  onClick={() => handleChoice(i)}
                >
                  <span style={styles.optionLetter}>
                    {["A", "B", "C", "D"][i]}
                  </span>
                  {opt}
                </div>
              );
            })}
          </div>
        )}

        {current.type === "poem_fill" && (
          <div style={styles.fillContainer}>
            <input
              type="text"
              value={fillInput}
              onChange={(e) => setFillInput(e.target.value)}
              placeholder={"\u8bf7\u8f93\u5165\u7b54\u6848..."}
              style={{
                ...styles.fillInput,
                borderColor: showResult
                  ? fillInput.trim() === current.answer
                    ? "#28A745"
                    : "#DC3545"
                  : "#CCC",
              }}
              disabled={showResult}
              onKeyDown={(e) => e.key === "Enter" && handleFill()}
            />
            {!showResult && (
              <button
                style={{ ...styles.submitBtn, backgroundColor: stage.color }}
                onClick={handleFill}
              >
                {"\u786e\u8ba4"}
              </button>
            )}
            {showResult && fillInput.trim() !== current.answer && (
              <p style={{ color: "#28A745", marginTop: 8 }}>
                {"\u6b63\u786e\u7b54\u6848\uff1a" + current.answer}
              </p>
            )}
          </div>
        )}

        {showResult && (
          <div style={styles.explanationBox}>
            <p style={styles.explanationText}>{current.explanation}</p>
          </div>
        )}

        {showResult && (
          <button style={{ ...styles.quizBtn, backgroundColor: stage.color }} onClick={nextQuestion}>
            {qIndex + 1 >= quizzes.length
              ? "\u67e5\u770b\u6210\u7ee9 \u2192"
              : "\u4e0b\u4e00\u9898 \u2192"}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  eventOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  quizPanel: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 24,
    maxWidth: 600,
    width: "90%",
    maxHeight: "80vh",
    overflowY: "auto",
    position: "relative",
    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    backgroundColor: "#F0EBE0",
    border: "none",
    borderRadius: "50%",
    fontSize: "clamp(14.4px, 1.25vw, 20.7px)",
    cursor: "pointer",
  },
  quizHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  quizBadge: {
    color: "white",
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: "clamp(9.6px, 0.833vw, 13.8px)",
    fontWeight: "bold",
  },
  quizProgress: {
    fontSize: "clamp(11.2px, 0.972vw, 16.1px)",
    color: "#999",
  },
  quizQuestion: {
    fontSize: "clamp(14.4px, 1.25vw, 20.7px)",
    color: "#333",
    margin: "0 0 20px",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  optionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 20,
  },
  optionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    border: "2px solid",
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  optionLetter: {
    fontWeight: "bold",
    fontSize: "clamp(12.8px, 1.111vw, 18.4px)",
    minWidth: 24,
  },
  fillContainer: {
    display: "flex",
    gap: 8,
    marginBottom: 20,
  },
  fillInput: {
    flex: 1,
    padding: "10px 12px",
    border: "2px solid",
    borderRadius: 6,
    fontSize: "clamp(11.2px, 0.972vw, 16.1px)",
    fontFamily: "inherit",
  },
  submitBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: 6,
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
  explanationBox: {
    backgroundColor: "#F0F8FF",
    border: "1px solid #B0D4FF",
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
  },
  explanationText: {
    margin: 0,
    fontSize: "clamp(11.2px, 0.972vw, 16.1px)",
    color: "#333",
    lineHeight: 1.6,
  },
  quizBtn: {
    width: "100%",
    padding: "10px 16px",
    border: "none",
    borderRadius: 6,
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "clamp(11.2px, 0.972vw, 16.1px)",
  },
  quizResultPanel: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 32,
    maxWidth: 400,
    textAlign: "center",
    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
  },
  scoreDisplay: {
    marginBottom: 20,
  },
  scoreBig: {
    fontSize: "clamp(38.4px, 3.333vw, 55.2px)",
    fontWeight: "bold",
    color: "#333",
  },
};

import { useState } from "react";
import DialogueBox from "./DialogueBox";

export default function EventPanel({ stage, onStartQuiz, onClose }) {
  const [sceneData, setSceneData] = useState(null);
  const [showDialogue, setShowDialogue] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load scene data when stage changes
  if (!sceneData && loading) {
    setLoading(false);
    import(`../data/dufu/scenes/${stage.sceneFile}`)
      .then((module) => {
        setSceneData(module.default);
        setShowDialogue(true);
      })
      .catch(() => {
        setLoading(false);
      });
  }

  const handleDialogueComplete = () => {
    setShowDialogue(false);
  };

  return (
    <>
      <div style={styles.eventOverlay} onClick={onClose}>
        <div
          style={styles.eventPanel}
          onClick={(e) => e.stopPropagation()}
        >
          <button style={styles.closeBtn} onClick={onClose}>
            {"\u2715"}
          </button>

          <h2 style={{ ...styles.eventTitle, color: stage.color }}>
            {sceneData?.title || stage.period}
          </h2>

          {sceneData?.poem && (
            <div style={styles.poemSection}>
              <h3 style={styles.poemTitle}>{sceneData.poem.title}</h3>
              <div style={styles.poemContent}>
                {sceneData.poem.content.split("\n").map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          )}

          {sceneData?.narrative && (
            <div style={styles.narrativeSection}>
              <p style={styles.narrativeText}>{sceneData.narrative}</p>
            </div>
          )}

          <div style={styles.buttonGroup}>
            <button
              style={{ ...styles.actionBtn, backgroundColor: stage.color }}
              onClick={() => {
                setShowDialogue(true);
                onClose();
              }}
            >
              {"\ud83d\udde3 \u67e5\u770b\u5bf9\u8bdd"}
            </button>
            <button
              style={{ ...styles.actionBtn, backgroundColor: stage.color }}
              onClick={onStartQuiz}
            >
              {"\ud83c\udf89 \u5f00\u59cb\u7aaf\u9898"}
            </button>
          </div>
        </div>
      </div>

      {showDialogue && sceneData?.dialogues && (
        <DialogueBox
          dialogues={sceneData.dialogues}
          onComplete={handleDialogueComplete}
        />
      )}
    </>
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
  eventPanel: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 32,
    maxWidth: 600,
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
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  eventTitle: {
    fontSize: 28,
    margin: "0 0 24px",
  },
  poemSection: {
    backgroundColor: "#F9F7F2",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeft: "4px solid",
  },
  poemTitle: {
    margin: "0 0 12px",
    fontSize: 16,
    fontWeight: "bold",
  },
  poemContent: {
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    fontSize: 14,
    lineHeight: 2,
    color: "#333",
    whiteSpace: "pre-wrap",
  },
  narrativeSection: {
    marginBottom: 24,
  },
  narrativeText: {
    fontSize: 14,
    lineHeight: 1.8,
    color: "#555",
    margin: 0,
  },
  buttonGroup: {
    display: "flex",
    gap: 12,
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 6,
    border: "none",
    color: "#FFF",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 14,
    transition: "all 0.2s",
  },
};

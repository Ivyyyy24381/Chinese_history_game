import { useState } from "react";
import DialogueBox from "./DialogueBox";

export default function EventPanel({ stage, onStartQuiz, onClose }) {
  const [sceneData, setSceneData] = useState(null);
  const [showDialogue, setShowDialogue] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load scene data when stage changes (event-based path)
  if (!sceneData && loading) {
    setLoading(false);
    import(`../data/dufu/events/${stage.id}/event.json`)
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
    fontSize: "clamp(14.4px, 1.25vw, 20.7px)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  eventTitle: {
    fontSize: "clamp(22.4px, 1.944vw, 32.2px)",
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
    fontSize: "clamp(12.8px, 1.111vw, 18.4px)",
    fontWeight: "bold",
  },
  poemContent: {
    fontFamily: "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif",
    fontSize: "clamp(11.2px, 0.972vw, 16.1px)",
    lineHeight: 2,
    color: "#333",
    whiteSpace: "pre-wrap",
  },
  narrativeSection: {
    marginBottom: 24,
  },
  narrativeText: {
    fontSize: "clamp(11.2px, 0.972vw, 16.1px)",
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
    fontSize: "clamp(11.2px, 0.972vw, 16.1px)",
    transition: "all 0.2s",
  },
};

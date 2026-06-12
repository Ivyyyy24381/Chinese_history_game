import { useState, useEffect } from "react";

export default function DialogueBox({ dialogues, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const current = dialogues[currentIndex];
  const isNarrator = current.speaker === "narrator";

  useEffect(() => {
    setIsAnimating(true);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < dialogues.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentIndex]);

  return (
    <div style={styles.dialogueContainer} onClick={handleNext}>
      <div style={styles.dialoguePanel}>
        {/* Character Portrait on left/right */}
        {!isNarrator && current.position === "left" && (
          <div style={styles.portraitLeft}>
            <img
              src={current.portrait}
              alt={current.speakerName}
              style={styles.portraitImage}
            />
          </div>
        )}

        {/* Main dialogue content */}
        <div
          style={{
            ...styles.dialogueContent,
            flex: isNarrator ? 1 : 0.6,
          }}
        >
          {/* Speaker name */}
          {!isNarrator && (
            <div style={styles.speakerName}>{current.speakerName}</div>
          )}

          {/* Dialogue text */}
          <div
            style={{
              ...styles.dialogueText,
              opacity: isAnimating ? 1 : 0,
              transition: "opacity 0.3s ease-in",
            }}
          >
            {current.text}
          </div>

          {/* Continue indicator */}
          <div style={styles.continueIndicator}>
            {currentIndex < dialogues.length - 1 ? (
              <span style={styles.clickPrompt}>{"\u2193 \u70b9\u51fb\u7ee7\u7eed"}</span>
            ) : (
              <span style={styles.clickPrompt}>{"\u2713 \u7ed3\u675f"}</span>
            )}
          </div>
        </div>

        {/* Character Portrait on right */}
        {!isNarrator && current.position === "right" && (
          <div style={styles.portraitRight}>
            <img
              src={current.portrait}
              alt={current.speakerName}
              style={styles.portraitImage}
            />
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${((currentIndex + 1) / dialogues.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

const styles = {
  dialogueContainer: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    cursor: "pointer",
    zIndex: 100,
  },
  dialoguePanel: {
    backgroundColor: "rgba(30,20,10,0.95)",
    display: "flex",
    alignItems: "center",
    padding: "24px 32px",
    minHeight: 180,
    gap: 20,
    borderTop: "2px solid #8B7355",
  },
  portraitLeft: {
    flex: "0 0 140px",
    height: 160,
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  },
  portraitRight: {
    flex: "0 0 140px",
    height: 160,
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    order: 3,
  },
  portraitImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center top", // full-body art: keep the face in frame
  },
  dialogueContent: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    order: 2,
  },
  speakerName: {
    color: "#D4A574",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  dialogueText: {
    color: "#F5E6D3",
    fontSize: 15,
    lineHeight: 1.8,
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    minHeight: 60,
  },
  continueIndicator: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  clickPrompt: {
    color: "#A89968",
    fontSize: 12,
    animation: "pulse 1.5s ease-in-out infinite",
  },
  progressBar: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#D4A574",
    transition: "width 0.3s ease",
  },
};

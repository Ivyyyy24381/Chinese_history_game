export default function GameMap({ currentStage, stages, onLocationClick }) {
  return (
    <div style={styles.mapContainer}>
      <div
        style={{
          ...styles.mapBackground,
          backgroundImage: `url('/assets/maps/tang_dynasty.png')`,
        }}
      >
        {stages.map((stage) => (
          <button
            key={stage.id}
            style={{
              ...styles.locationMarker,
              left: `${stage.location.mapX}%`,
              top: `${stage.location.mapY}%`,
              backgroundColor: stage.color,
              opacity: stage.id === currentStage.id ? 1 : 0.7,
              transform:
                stage.id === currentStage.id
                  ? "scale(1.2)"
                  : "scale(1)",
              boxShadow:
                stage.id === currentStage.id
                  ? `0 0 20px ${stage.color}`
                  : "0 2px 8px rgba(0,0,0,0.2)",
            }}
            onClick={() => onLocationClick(stage.id)}
            title={stage.location.name}
          >
            {stage.location.name}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  mapContainer: {
    flex: 1,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 20px",
    minHeight: 400,
  },
  mapBackground: {
    width: "100%",
    maxWidth: 800,
    aspectRatio: "1",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    position: "relative",
    borderRadius: 8,
  },
  locationMarker: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    width: 60,
    height: 60,
    borderRadius: "50%",
    border: "2px solid white",
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 4,
    boxSizing: "border-box",
  },
};

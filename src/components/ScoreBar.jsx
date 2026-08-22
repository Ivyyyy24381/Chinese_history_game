import { asset } from "../utils/asset";
import { getCharacter } from "../data/characters";
import { COLOR, TRACKING, SHADOW, halo } from "../styles/theme";

/**
 * 地图页左上角的人物信息条 —— 用主页名牌的排版：
 * 书法名字图 + 一行可读中文名 + 次级信息（积分/进度），
 * 不套框不铺底，只靠 halo() 的暖光从地图里托出来。
 */
export default function ScoreBar({ character, progress, totalStages, score = 0 }) {
  // 书法名字图等主页素材从花名册取（timeline.json 的 character 块没有这些字段）
  const home = getCharacter(character.id);

  return (
    <div style={styles.plate}>
      {home?.name_img ? (
        <img
          src={asset(home.name_img)}
          alt={character.name}
          style={{ ...styles.nameImg, height: (home.nameHeight || 34) * 0.82 }}
        />
      ) : (
        <span style={styles.nameText}>{character.name}</span>
      )}
      <p style={styles.readableName}>
        {character.name}
        <span style={styles.metaSep}>{" · "}</span>
        <span style={styles.readableTitle}>{character.title}</span>
      </p>
      <p style={styles.meta}>
        {"积分 "}
        <strong style={styles.scoreValue}>{score}</strong>
        <span style={styles.metaSep}>{" · "}</span>
        {`进度 ${progress} / ${totalStages}`}
      </p>
    </div>
  );
}

const styles = {
  plate: {
    textAlign: "center",
    padding: "14px 34px 14px",
    // 收得比内边距紧的暖光托底（同主页名牌），不出现方块边
    background: halo({ w: 88, h: 86, core: 0.9, mid: 0.55, midStop: 42, edge: 70 }),
  },
  nameImg: {
    width: "auto",
    maxWidth: "100%",
    objectFit: "contain",
    display: "block",
    margin: "0 auto",
    filter: "drop-shadow(0 1px 2px rgba(255,255,255,0.7))",
  },
  nameText: {
    display: "block",
    color: COLOR.inkStrong,
    fontSize: "clamp(17px, 2.4vh, 24px)",
    letterSpacing: TRACKING.wide,
    fontWeight: 600,
  },
  readableName: {
    color: COLOR.ink,
    fontSize: "clamp(12.5px, 1.6vh, 17px)",
    letterSpacing: TRACKING.loose,
    fontWeight: 600,
    margin: "6px 0 0",
    textShadow: SHADOW.text,
    whiteSpace: "nowrap",
  },
  readableTitle: {
    color: COLOR.secondary,
    fontSize: "0.78em",
    fontWeight: 400,
    letterSpacing: TRACKING.normal,
  },
  meta: {
    color: COLOR.secondary,
    fontSize: "clamp(10px, 1.25vh, 13.5px)",
    letterSpacing: TRACKING.tight,
    margin: "3px 0 0",
    textShadow: "0 1px 2px rgba(255,255,255,0.55)",
    whiteSpace: "nowrap",
  },
  scoreValue: {
    color: COLOR.goldBrown,
    fontWeight: 600,
  },
  metaSep: { opacity: 0.45 },
};

import { useState } from "react";
import { asset } from "../utils/asset";
import { TITLE_IMG } from "../data/characters";

const FONT = "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif";

/**
 * 主页 · 选择主人公
 *
 * 视觉规则：
 *  - 背景整屏铺满，随「悬停 > 选中 > 第一个人物」淡入淡出切换
 *  - 立绘本身就是卡片：每张 PNG 已含该文明的窗框，窗内镂空透明，背景会从窗里透出来，
 *    所以不要再套边框/白底，否则会把镂空效果盖掉
 *  - 两步进入：先点立绘选中（换背景 + 展开简介），再点「开始」按钮进游戏
 */
export default function CharacterSelect({
  characters,
  onSelect,
  onRestart,
  savedRun = null,
  achievements = {},
  achievementTitles = {},
  onRecap,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  // 名字书法图缺失时退回文字渲染
  const [nameImgFailed, setNameImgFailed] = useState({});

  const selected = characters.find((c) => c.id === selectedId) || null;
  // 背景优先级：鼠标悬停 > 已选中 > 第一个人物（首屏兜底）
  const activeBgId = hoverId || selectedId || characters[0]?.id;
  const earnedCount = characters.filter((c) => achievements[c.id]).length;

  const handleClick = (char) => {
    if (char.locked) return;
    // 再点一次已选中的立绘 = 直接开始（老玩家不用绕到按钮）
    if (selectedId === char.id) onSelect(char);
    else setSelectedId(char.id);
  };

  const resumeForSelected =
    selected && savedRun && savedRun.characterId === selected.id ? savedRun : null;

  return (
    <div style={styles.screen}>
      {/* ── 背景层：每人一张，靠 opacity 交叉淡入，避免切换时闪白 ── */}
      {characters.map((c) => (
        <div
          key={c.id}
          aria-hidden="true"
          style={{
            ...styles.bgLayer,
            backgroundImage: `url('${asset(c.background)}')`,
            opacity: activeBgId === c.id ? 1 : 0,
          }}
        />
      ))}
      <div aria-hidden="true" style={styles.scrim} />

      <div style={styles.content}>
        <h1 style={styles.titleWrap}>
          <img src={asset(TITLE_IMG)} alt="历史长河" style={styles.titleImg} />
        </h1>
        <p style={styles.subtitle}>{"选择你的主人公"}</p>

        {/* ── 立绘排 ── */}
        <div style={styles.row}>
          {characters.map((char) => {
            const isSelected = selectedId === char.id;
            const dimmed = selectedId && !isSelected;
            return (
              <div
                key={char.id}
                role="button"
                tabIndex={char.locked ? -1 : 0}
                aria-pressed={isSelected}
                aria-label={`${char.name} · ${char.title}`}
                style={{
                  ...styles.item,
                  cursor: char.locked ? "not-allowed" : "pointer",
                }}
                onClick={() => handleClick(char)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClick(char);
                  }
                }}
                onMouseEnter={() => !char.locked && setHoverId(char.id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => !char.locked && setHoverId(char.id)}
                onBlur={() => setHoverId(null)}
              >
                <div style={styles.portraitWrap}>
                  <img
                    src={asset(char.portrait)}
                    alt={char.name}
                    draggable="false"
                    style={{
                      ...styles.portrait,
                      transform: isSelected
                        ? "translateY(-10px) scale(1.06)"
                        : hoverId === char.id
                        ? "translateY(-4px) scale(1.02)"
                        : "none",
                      filter: char.locked
                        ? "grayscale(0.9) brightness(1.06) drop-shadow(0 8px 18px rgba(70,55,35,0.18))"
                        : isSelected
                        ? "drop-shadow(0 18px 34px rgba(70,55,35,0.34))"
                        : "drop-shadow(0 10px 22px rgba(70,55,35,0.22))",
                      opacity: char.locked ? 0.55 : dimmed ? 0.68 : 1,
                    }}
                  />
                  {char.locked && (
                    <span style={styles.lockPill}>{"🔒 即将开放"}</span>
                  )}
                  {achievements[char.id] && (
                    <span
                      style={styles.achBadge}
                      title={"历史成就 · " + (achievementTitles[char.id] || char.name)}
                    >
                      {"🏆"}
                    </span>
                  )}
                </div>

                {/* ── 名牌 ── */}
                <div style={{ ...styles.plate, opacity: dimmed ? 0.6 : 1 }}>
                  {char.name_img && !nameImgFailed[char.id] ? (
                    <img
                      src={asset(char.name_img)}
                      alt={char.name}
                      style={{ ...styles.nameImg, height: char.nameHeight || 34 }}
                      onError={() =>
                        setNameImgFailed((m) => ({ ...m, [char.id]: true }))
                      }
                    />
                  ) : (
                    <span style={styles.nameText}>{char.name}</span>
                  )}
                  <p style={styles.meta}>
                    {char.title}
                    <span style={styles.metaSep}>{" · "}</span>
                    {char.years}
                  </p>
                  <p style={styles.dynasty}>{char.dynasty}</p>
                  <p
                    style={{
                      ...styles.desc,
                      maxHeight: isSelected ? 60 : 0,
                      opacity: isSelected ? 1 : 0,
                      marginTop: isSelected ? 8 : 0,
                    }}
                  >
                    {char.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 开始区：高度固定，选中与否都不抖动 ── */}
        <div style={styles.actionBar}>
          {selected && (
            <>
              <button
                style={styles.startBtn}
                onClick={() => onSelect(selected)}
              >
                {resumeForSelected
                  ? `▶ 继续上局 · ${resumeForSelected.runScore || 0} 分`
                  : `开始 · 走进${selected.name}的一生`}
              </button>
              {resumeForSelected && (
                <button
                  style={styles.ghostBtn}
                  title="清除上局进度，从头开始"
                  onClick={() => onRestart && onRestart(selected)}
                >
                  {"重新开始"}
                </button>
              )}
              {achievements[selected.id] && (
                <button
                  style={styles.ghostBtn}
                  onClick={() => onRecap && onRecap(selected.id)}
                >
                  {"📜 人物回顾"}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── 成就栏 ── */}
        <div style={styles.achievementBar}>
          <span style={styles.achievementHeading}>
            {`🏆 历史成就 ${earnedCount} / ${characters.length}`}
          </span>
          {characters.map((c) => (
            <span
              key={c.id}
              style={{
                ...styles.achievementChip,
                ...(achievements[c.id] ? {} : styles.achievementChipLocked),
              }}
            >
              {(achievements[c.id] ? "✓ " : "… ") +
                (achievementTitles[c.id] || c.name)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  screen: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    fontFamily: FONT,
    backgroundColor: "#EFE7D8",
  },
  bgLayer: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    transition: "opacity 700ms ease",
    willChange: "opacity",
  },
  // 背景压一层暖白：整屏薄雾 + 中央更浓，保证立绘和文字在三张画上都读得清
  scrim: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(rgba(250,246,238,0.20), rgba(250,246,238,0.20))," +
      "radial-gradient(ellipse 80% 72% at 50% 56%, rgba(250,246,238,0.52) 0%, rgba(250,246,238,0.24) 55%, rgba(250,246,238,0) 84%)",
    pointerEvents: "none",
  },
  content: {
    position: "relative",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(16px, 3vh, 36px) 24px",
    gap: 0,
  },
  titleWrap: { margin: 0, lineHeight: 0 },
  titleImg: {
    height: "clamp(46px, 7.6vh, 88px)",
    filter: "drop-shadow(0 1px 3px rgba(255,255,255,0.65))",
  },
  subtitle: {
    color: "#6B5A44",
    fontSize: "clamp(12px, 1.5vh, 16px)",
    letterSpacing: 8,
    margin: "clamp(8px, 1.4vh, 16px) 0 clamp(12px, 2.4vh, 28px)",
    textShadow: "0 1px 2px rgba(255,255,255,0.6)",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    alignItems: "end",
    gap: "clamp(8px, 2.4vw, 44px)",
    width: "100%",
    maxWidth: 1180,
  },
  item: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 0,
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  portraitWrap: { position: "relative", lineHeight: 0 },
  portrait: {
    height: "clamp(170px, 38vh, 400px)",
    width: "auto",
    maxWidth: "100%",
    objectFit: "contain",
    display: "block",
    transition: "transform 320ms cubic-bezier(.2,.7,.3,1), filter 320ms ease, opacity 320ms ease",
  },
  lockPill: {
    position: "absolute",
    left: "50%",
    top: "74%",
    transform: "translate(-50%, -50%)",
    whiteSpace: "nowrap",
    backgroundColor: "rgba(252,248,238,0.92)",
    color: "#8A7A5E",
    padding: "6px 16px",
    borderRadius: 20,
    border: "1px solid #D8CDB8",
    fontSize: "clamp(11px, 1.3vh, 14px)",
    letterSpacing: 2,
    boxShadow: "0 2px 8px rgba(90,70,40,0.16)",
  },
  achBadge: {
    position: "absolute",
    top: 4,
    right: "6%",
    fontSize: "clamp(18px, 2.4vh, 26px)",
    filter: "drop-shadow(0 0 5px rgba(201,168,106,0.95))",
  },
  // 名牌自带一圈柔和暖光：三张背景里都有建筑/树压在这一段，没有它文字会糊掉
  plate: {
    textAlign: "center",
    marginTop: "clamp(2px, 0.8vh, 8px)",
    padding: "clamp(8px, 1.5vh, 16px) 30px clamp(10px, 1.8vh, 18px)",
    transition: "opacity 320ms ease",
    // 收得比内边距更紧，让暖光在触到方框四角前就淡尽，不会露出方块边
    background:
      "radial-gradient(ellipse 82% 72% at 50% 46%, rgba(250,246,238,0.88) 0%, rgba(250,246,238,0.52) 40%, rgba(250,246,238,0) 66%)",
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
    color: "#2B2118",
    fontSize: "clamp(19px, 2.8vh, 28px)",
    letterSpacing: 6,
    fontWeight: 600,
  },
  meta: {
    color: "#7A6A50",
    fontSize: "clamp(10px, 1.3vh, 14px)",
    letterSpacing: 1,
    margin: "6px 0 0",
    textShadow: "0 1px 2px rgba(255,255,255,0.55)",
  },
  metaSep: { opacity: 0.5 },
  dynasty: {
    color: "#9A8B72",
    fontSize: "clamp(9px, 1.15vh, 12.5px)",
    letterSpacing: 1,
    margin: "2px 0 0",
    textShadow: "0 1px 2px rgba(255,255,255,0.55)",
  },
  // 简介只在选中时展开，收起时高度为 0，三列不会因文字长短错位
  desc: {
    color: "#5A4A38",
    fontSize: "clamp(10.5px, 1.35vh, 14px)",
    lineHeight: 1.6,
    margin: 0,
    overflow: "hidden",
    transition: "max-height 320ms ease, opacity 320ms ease, margin-top 320ms ease",
    textShadow: "0 1px 2px rgba(255,255,255,0.55)",
  },
  actionBar: {
    height: "clamp(46px, 7vh, 62px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
    marginTop: "clamp(8px, 1.6vh, 18px)",
  },
  startBtn: {
    padding: "10px 30px",
    border: "1px solid #C9A86A",
    borderRadius: 24,
    backgroundColor: "rgba(252,248,238,0.92)",
    color: "#7A5C2E",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "clamp(13px, 1.7vh, 17px)",
    letterSpacing: 3,
    boxShadow: "0 4px 16px rgba(90,70,40,0.18)",
  },
  ghostBtn: {
    padding: "8px 16px",
    border: "1px solid #C9B08A",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.62)",
    color: "#8A7A5E",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "clamp(10.5px, 1.35vh, 13.5px)",
    letterSpacing: 1,
  },
  achievementBar: {
    marginTop: "clamp(6px, 1.6vh, 18px)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  achievementHeading: {
    color: "#8A6D3B",
    fontSize: "clamp(10.5px, 1.3vh, 14px)",
    letterSpacing: 2,
    fontWeight: 600,
    textShadow: "0 1px 2px rgba(255,255,255,0.55)",
  },
  achievementChip: {
    padding: "3px 12px",
    borderRadius: 14,
    fontSize: "clamp(9.5px, 1.15vh, 12.5px)",
    letterSpacing: 1,
    backgroundColor: "rgba(201,168,106,0.22)",
    color: "#8A6D3B",
    border: "1px solid #C9A86A",
  },
  achievementChipLocked: {
    backgroundColor: "rgba(255,255,255,0.5)",
    color: "#A2957F",
    border: "1px solid #D8CDB8",
  },
};

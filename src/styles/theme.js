// 历史长河 · 全局视觉 token（单一事实来源）
//
// 这套语言在主页 CharacterSelect.jsx 跑通后抽出，是全产品的风格基准：
// 地图页、时间轴、后续新页面一律从这里取值，不再各自硬编码颜色。
//
// 三条核心手法（比色值更重要）：
//   1. 不给内容套框 —— 文字/信息靠 halo() 的 radial 暖光从底图里「托」出来，
//      光收得比内边距紧，碰到方角之前就淡尽，看不出方块。
//   2. 蒙版分层 —— scrim() 生成「顶带 + 底带 + 中央 radial」三层纸色蒙版，
//      顶带护标题、底带护按钮、中央护主体。
//   3. 底图密就减淡 —— 每张底图自带一个减淡系数（如 characters.js 的
//      scrimBoost），用 paper(alpha) 叠一层，跟底图一起淡入淡出。

// ── 字体 ──
export const FONT = "'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif";

// ── 纸色：全站唯一的「白」。蒙版、暖光、雾、按钮底都用它，只改 alpha ──
export const paper = (a) => `rgba(250,246,238,${a})`;
// 按钮/名片用的纸底，比蒙版纸色再暖一度
export const paperBtn = (a) => `rgba(252,248,238,${a})`;
// 金线色的透明变体（成就 chip 底等）
export const gold = (a) => `rgba(201,168,106,${a})`;

// ── 色板 ──
export const COLOR = {
  // 文字色阶
  ink: "#3A2E20",          // 主文字
  inkStrong: "#2B2118",    // 大标题/名字
  secondary: "#7A6A50",    // 次级
  faint: "#9A8B72",        // 弱化
  body: "#5A4A38",         // 正文/简介
  subtitle: "#6B5A44",     // 副标题
  goldBrown: "#8A6D3B",    // 金棕强调（成就等）
  muted: "#8A7A5E",        // 灰棕（ghost 按钮等）
  btnText: "#7A5C2E",      // 主按钮文字
  btnTextSub: "#5A4A32",   // 次按钮文字
  lockedText: "#A2957F",   // 禁用文字
  // 金线三级
  goldLine: "#C9A86A",         // 实线（主按钮描边）
  goldLineSoft: "#C9B08A",     // 虚线/次级描边
  goldLineDisabled: "#D8CDB8", // 禁用描边
  // 兜底底色（背景图加载前）
  paperSolid: "#EFE7D8",
};

// ── 字距梯度（按层级 1 / 2 / 3 / 6 / 8）──
export const TRACKING = { tight: 1, normal: 2, loose: 3, wide: 6, hero: 8 };

// ── 过渡 ──
export const EASE = "cubic-bezier(.2,.7,.3,1)";
export const TRANSITION = {
  element: `320ms ${EASE}`, // 元素位移/展开
  bg: "700ms ease",         // 背景交叉淡入
};

// ── 落影 ──
export const SHADOW = {
  art: "drop-shadow(0 10px 22px rgba(70,55,35,0.22))",         // 美术件常态
  artSelected: "drop-shadow(0 18px 34px rgba(70,55,35,0.34))", // 选中加深
  button: "0 4px 16px rgba(90,70,40,0.18)",                    // 主按钮
  chip: "0 2px 10px rgba(90,70,40,0.12)",                      // 小件/名片
  text: "0 1px 2px rgba(255,255,255,0.6)",                     // 文字提白
};

// ── 按钮（fontSize 由使用处按场景 clamp）──
export const BUTTON = {
  // 主胶囊：半透明纸底 + 金线描边 + 圆角 24
  pill: {
    padding: "10px 30px",
    border: `1px solid ${COLOR.goldLine}`,
    borderRadius: 24,
    backgroundColor: paperBtn(0.92),
    color: COLOR.btnText,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: TRACKING.loose,
    boxShadow: SHADOW.button,
  },
  // 次级 ghost
  ghost: {
    padding: "8px 16px",
    border: `1px solid ${COLOR.goldLineSoft}`,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.62)",
    color: COLOR.muted,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: TRACKING.tight,
  },
};

/**
 * halo — 主页名牌那种「暖光托底」：radial 渐变，收得比内边距紧，
 * 光在碰到方角前就淡尽，所以完全看不出方块边。
 * 用它替代任何带边框/实底的卡片。
 *
 * @param {object} opts
 *   w,h        椭圆宽高（% of 元素）
 *   x,y        椭圆中心位置（%）
 *   core       中心 alpha
 *   mid        中段 alpha
 *   midStop    中段位置（%）
 *   edge       完全淡出的位置（%）——务必 < 100，别让光贴到边
 */
export function halo({
  w = 82, h = 72, x = 50, y = 46,
  core = 0.88, mid = 0.52, midStop = 40, edge = 66,
} = {}) {
  return `radial-gradient(ellipse ${w}% ${h}% at ${x}% ${y}%, ${paper(core)} 0%, ${paper(mid)} ${midStop}%, ${paper(0)} ${edge}%)`;
}

/**
 * scrim — 主页那套三层蒙版：
 *   顶带（护标题）+ 底带（护按钮/时间轴）+ 整屏薄雾 + 中央 radial（护主体）。
 * 任一层可以用 alpha=0 关掉。
 */
export function scrim({
  top = 0.66, topFade = 0.26, topStop = 20, topEnd = 36,
  bottomStart = 60, bottomFade = 0.30, bottomStop = 79, bottom = 0.70,
  veil = 0.16,
  center = 0.46, centerMid = 0.22, centerMidStop = 55,
  centerW = 80, centerH = 72, centerX = 50, centerY = 56, centerEnd = 84,
} = {}) {
  const layers = [
    `linear-gradient(to bottom, ${paper(top)} 0%, ${paper(topFade)} ${topStop}%,` +
      ` ${paper(0)} ${topEnd}%, ${paper(0)} ${bottomStart}%, ${paper(bottomFade)} ${bottomStop}%,` +
      ` ${paper(bottom)} 100%)`,
  ];
  if (veil > 0) layers.push(`linear-gradient(${paper(veil)}, ${paper(veil)})`);
  if (center > 0) {
    layers.push(
      `radial-gradient(ellipse ${centerW}% ${centerH}% at ${centerX}% ${centerY}%,` +
        ` ${paper(center)} 0%, ${paper(centerMid)} ${centerMidStop}%, ${paper(0)} ${centerEnd}%)`
    );
  }
  return layers.join(",");
}

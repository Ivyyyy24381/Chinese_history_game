// Dante portrait poses, organized by life stage.
// Files live at /assets/dante/hero/<stage>/<pose>.webp
// Resolution priority (in ScenePlayer):
//   dialogue line dufu_pose > phase dufu_pose > event dufu_pose > stage default by event year
// (键名沿用引擎现有的 dufu_pose / dufu_reaction，不改引擎。)

export const DANTE_POSES = [
  { value: "youth/standing", label: "青年·站立（红衣）" },
  { value: "youth/gazing", label: "青年·桥头凝望" },
  { value: "youth/armored", label: "青年·轻骑兵（坎帕尔迪诺）" },
  { value: "citizen/robe", label: "公民·执政官袍" },
  { value: "citizen/signing", label: "公民·执笔签署" },
  { value: "exile/cloak", label: "流亡·旅装行路" },
  { value: "exile/writing", label: "流亡·执笔（神曲）" },
  { value: "exile/bitter", label: "流亡·冷峻侧影" },
  { value: "exile/refusing", label: "流亡·拒信挺立" },
  { value: "old/laurel", label: "晚年·桂冠红袍" },
  { value: "old/dying", label: "晚年·病榻" },
];

// The character-select portrait. Any event reference to it is treated as
// "unset" and resolves to a stage default instead (same convention as dufu).
export const DANTE_LEGACY_PORTRAIT = "/assets/dante/hero/portrait.webp";

const STAGE_DEFAULT_POSE = {
  youth: "youth/standing",
  citizen: "citizen/robe",
  exile: "exile/cloak",
  old: "old/laurel",
};

// Life-stage boundaries (inclusive upper bound on event year).
export function danteStageForYear(year) {
  if (!year) return null;
  if (year <= 1294) return "youth";   // 1265 佛罗伦萨之子 / 1283 贝雅特丽切
  if (year <= 1301) return "citizen"; // 1295 步入政坛 / 1300 执政官
  if (year <= 1315) return "exile";   // 1302 放逐 / 1308 动笔 / 1313 帝国梦 / 1315 拒赦
  return "old";                       // 1316–1321 拉文纳
}

// Resolve a Dante portrait URL. `pose` like "exile/writing"; falls back to the
// stage default for `year`, then to the exile look.
export function dantePortraitPath(pose, year) {
  if (pose === DANTE_LEGACY_PORTRAIT) pose = null; // select-screen portrait → resolve
  if (!pose) {
    const stage = danteStageForYear(year) || "exile";
    pose = STAGE_DEFAULT_POSE[stage];
  }
  return `/assets/dante/hero/${pose}.webp`;
}

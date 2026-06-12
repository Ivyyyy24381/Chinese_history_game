// Du Fu portrait poses, organized by life stage.
// Files live at /assets/characters/dufu/<stage>/<pose>.png
// Resolution priority (in ScenePlayer):
//   dialogue line dufu_pose > phase dufu_pose > event dufu_pose > stage default by event year

export const DUFU_POSES = [
  { value: "youth/standing", label: "青年·站立（壮游）" },
  { value: "youth/drinking", label: "青年·饮酒" },
  { value: "scholar/standing", label: "中年·站立（困守长安）" },
  { value: "scholar/writing", label: "中年·执笔" },
  { value: "scholar/dejected", label: "中年·失意" },
  { value: "official/standing", label: "官服·站立（左拾遗）" },
  { value: "official/kneeling", label: "官服·跪奏" },
  { value: "drift/walking", label: "漂泊·行路" },
  { value: "drift/writing", label: "漂泊·写诗" },
  { value: "drift/grief", label: "漂泊·悲恸" },
  { value: "drift/drinking_alone", label: "漂泊·独酌" },
  { value: "drift/holding_child", label: "漂泊·抱子" },
  { value: "old/sitting", label: "晚年·独坐" },
  { value: "old/dying", label: "晚年·病榻" },
];

// The old all-purpose default. The file on disk is nearly blank, so the engine
// treats any reference to it as "unset" and resolves a stage default instead.
export const DUFU_LEGACY_PORTRAIT = "/assets/characters/dufu/portrait.png";

const STAGE_DEFAULT_POSE = {
  youth: "youth/standing",
  scholar: "scholar/standing",
  official: "official/standing",
  drift: "drift/walking",
  old: "old/sitting",
};

// Life-stage boundaries (inclusive upper bound on event year).
export function dufuStageForYear(year) {
  if (!year) return null;
  if (year <= 745) return "youth";     // 736 壮游 / 744 遇李白
  if (year <= 756) return "scholar";   // 747 制举 / 751 献赋 / 755 安史
  if (year <= 758) return "official";  // 757 左拾遗
  if (year <= 769) return "drift";     // 759 弃官 / 760 草堂 / 765 夔州
  return "old";                        // 770 舟中
}

// Resolve a Du Fu portrait URL. `pose` like "drift/grief"; falls back to the
// stage default for `year`, then to the scholar look.
export function dufuPortraitPath(pose, year) {
  if (pose === DUFU_LEGACY_PORTRAIT) pose = null; // legacy blank file → resolve
  if (!pose) {
    const stage = dufuStageForYear(year) || "scholar";
    pose = STAGE_DEFAULT_POSE[stage];
  }
  return `/assets/characters/dufu/${pose}.png`;
}

// 积分规则（来自建议.docx）
// - 选择题答对：+20
// - 填诗每空答对：+10
// - 数字华容道：满分 100，每过 1 秒扣 1 分
// - 出逃：满分 50，每过 1 秒扣 1 分，被抓一次额外扣 10 分
// - 图片找点：满分 50，每过 1 秒扣 1 分
// - 地狱安放：每放对一个人 +20（comedy_encounter 不计分，那一层考的是理解）
// 单次游玩每一关只计一次分（用 key 去重），结束后结算总分进排行榜。

export const POINTS = {
  choice: 20,
  poemFill: 10,
  slidingPuzzleMax: 100,
  escapeMax: 50,
  escapeCaughtPenalty: 10,
  clickPointsMax: 50,
  predict: 15,        // 「敢下判断」本身给分——猜对猜错一样多，否则玩家会退回揣摩标准答案
  evidence: 20,       // 挑对一条支持性证据
  explain: 20,        // 因果链每摆对一格
  contrapasso: 25,    // build 档没有唯一正解——给「敢设计」这个动作
  prophecy: 20,       // 时间块每摆对一格
  trust: 30,          // 走完放逐循环那一关
  sphere: 15,         // 九重天每点亮一重
  infernoPlace: 20,   // 「但丁把他们放在哪儿了」每放对一个
};

/** 限时类得分：满分 - 用时秒数 - 额外罚分，最低 0 分 */
export function timedScore(max, elapsedSec, extraPenalty = 0) {
  return Math.max(0, Math.round(max - elapsedSec - extraPenalty));
}

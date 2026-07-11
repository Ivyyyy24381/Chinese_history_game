// 积分规则（来自建议.docx）
// - 选择题答对：+20
// - 填诗每空答对：+10
// - 数字华容道：满分 100，每过 1 秒扣 1 分
// - 出逃：满分 50，每过 1 秒扣 1 分，被抓一次额外扣 10 分
// - 图片找点：满分 50，每过 1 秒扣 1 分
// 单次游玩每一关只计一次分（用 key 去重），结束后结算总分进排行榜。

export const POINTS = {
  choice: 20,
  poemFill: 10,
  slidingPuzzleMax: 100,
  escapeMax: 50,
  escapeCaughtPenalty: 10,
  clickPointsMax: 50,
};

/** 限时类得分：满分 - 用时秒数 - 额外罚分，最低 0 分 */
export function timedScore(max, elapsedSec, extraPenalty = 0) {
  return Math.max(0, Math.round(max - elapsedSec - extraPenalty));
}

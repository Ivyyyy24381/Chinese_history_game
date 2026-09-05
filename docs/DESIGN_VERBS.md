# 认知动词 · 这个游戏的设计原则

> 适用于全部人物线（不只但丁）。编排由 `npm run lint:phases` 把关。

## 一句话

> **每一个 interaction 都应该把一个认知动作外化：预测、观察、归类、连接、解释、修正、重建。**

不是「有 16 种小游戏」，而是「每种交互对应一件脑子里正在发生的事」。
这句话应该成为以后写 paper / design rationale 的核心，也是判断一个新 phase 该不该做的唯一标准。

## 问题的诊断（2026-09）

lint 首次跑出来的基线：

| 线 | 读屏 | 浏览 | 认知动作占比 |
|---|---:|---:|---:|
| 杜甫 | 34% | 44% | **18%** |
| 但丁（改造前） | 35% | 25% | **22%** |

八成时间玩家在做同一件事：**点一下，读一段。**

根因不是 phase 类型不够多，而是：**知识先以文字形式进入玩家脑子，interaction 只负责推进 UI。**
`explore`（点 NPC 读对话）和 `transition`（读屏）是同一个动作的两张皮；
`sliding_puzzle`、`escape_game` 这类「花样」跟历史理解无关——它们是包装，不是学习动作。

## 设计原则

```
Do first → see consequence → explain / compare → name the idea
```

先让玩家形成一个 tentative model，再让系统用后续信息修正它。
关键不是「让孩子答错」，是**让错误暴露他当前的心智模型，然后马上和史实并排放着**。

三条推论：

1. **先产出，再讲解。** 任何解释性文本之前，必须有一个让玩家先下判断的动作。
2. **不打 ✓✗。** 玩家的答案要留在屏幕上，和正确答案并列——差额本身是教材。
3. **retrieval 要搬进世界。** 不是事后问「但丁属于哪个党派」，而是在后面的场景里让他
   「把这些人放回你记得的那一边」。从 *retrieve to answer* 变成 *retrieve to act*。

## phase 的分类（lint 用的就是这套）

| 类 | 标记 | 玩家在做什么 | 包含 |
|---|:--:|---|---|
| 读屏 | `·` | 点一下，读一段 | transition, narration, comic_reveal |
| 浏览 | `○` | 找一找，读一段 | explore, map_travel |
| 先判断 | `▲` | 在知道答案前先产出一个判断 | **predict_reveal**, poem_compose, forced_choice |
| 辨证据 | `◆` | 在材料里做区分 | **evidence_select**, click_points, exam |
| 改模型 | `★` | 拿自己的答案去撞史实/文本 | inferno_placement, comedy_encounter |
| 过桥 | `◈` | 要动手，但不要求判断（仪式性转场） | echo_portal |
| 手速 | `◇` | 跟理解无关的包装 | sliding_puzzle, escape_game, minigame |

**过桥和手速不计入认知动作占比**——它们好看，但不教东西，别让它们把分数刷上去。

目标：**认知动作占比 ≥ 40%**。

## lint 规则

```
npm run lint:phases          # 全线记分板
npm run lint:phases -- dante  # 单线
```

硬规则（不过 exit 1）
- `H1` 不允许连续 3 个读屏 phase
- `H2` 一个事件不允许「只有读屏 + 点人读字」

软规则（警告 = 待办清单）
- `S1` 每个事件应含 generation　`S2` 应含 evidence　`S3` 应含 revision　`S4` 不建议连续 2 个读屏

## 已实现的新动词

### `predict_reveal` — 先猜，再对照
玩家在事情发生前先预测。提交后左右并列「你猜 / 实际」，**没有对错标记**，
再演出后果。分数奖励「敢下判断」这个动作本身——猜对猜错一样多，
否则玩家会退回到揣摩标准答案。
> 替换：大量作为伪选择的 `forced_choice`。素材成本：纯文本。

### `evidence_select` — 给一个判断，挑出支持它的材料
干扰项的设计要点：**不要放假的，要放「真的但不相干」**。
要练的是「真实 ≠ 支持结论」，不是辨真假。最好的一条干扰项甚至是
「真实、重要，但对这个判断反而不利」——好的推理要认得出哪些事实对自己不利。
> 替换：`explore` 之后那段替玩家写好的文字总结。素材成本：纯文本。

### `inferno_placement` — 已从 correct/wrong 改成 commit → contrast
提交后玩家的答案留在原地变成 ghost（虚线），但丁的答案在旁边亮起来。
判词从「放对 N/4」改成「你和但丁，N/4 处放到了一起」，
并对每个人显示「你放「炼狱」　但丁放「地狱」」。

## 下一批（按 ROI）

| 优先 | phase | 做什么 |
|:--:|---|---|
| 1 | `explain_by_building` | 不让孩子打字写解释，用 token 搭出「事件→动机→行动→后果」，系统把他搭的结构转成一句自然语言 |
| 2 | `contrapasso_build` | 给罪，让玩家从惩罚零件里设计一个，再 reveal 但丁怎么写的。同一组件四种难度（match / choose / reverse / build）= fading scaffolding |
| 3 | `prophecy_paradox` | 摆时间块：人物在 1300 年「预言」1302 年的事，而作者写作时早已知道。几乎零美术成本 |
| 4 | `cause_chain` | 连因果，连错不消失——让剧情产生矛盾再提示重连 |

**暂缓的**（记录理由，免得来回讨论）
- 「三界 = 三种 interaction grammar」：方向漂亮，但它预设玩家在《神曲》里待很久；
  现在《神曲》是每关末尾两分钟的一段。先当作**写作约束**用（地狱关用归类动词、
  炼狱关用变化动词、天堂关用连接动词），不做成三套规则系统。
- `chain_compose`（terza rima）：中译不承载韵，只教 ABA BCB 的形状是在教一个空壳。
- `guide_handoff` 做 scaffold fading：全线现在只有三处《神曲》遭遇，重复次数不够，fading 感觉不出来。
- 删掉现有 61 道 quiz：先别删。等新动词在几个事件上验证过，再逐个事件替换。

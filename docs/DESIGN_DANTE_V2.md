# 但丁线 V2 · 《神曲》作为第二世界

> 状态：设计中（2026-09）。取代「《神曲》= 某一个独立事件」的旧做法。
> 一句话命题：**《神曲》不是但丁编的一个关于地狱的故事，是他用政治、师友、信仰、流亡亲手盖出来的一个世界。**

---

## 一、V1 的问题（先说清楚，免得改错地方）

对现有 9 个事件、55 个 phase 做的结构统计：

| phase 类型 | 个数 |
|---|---:|
| transition | 20 |
| explore | 15 |
| forced_choice | 6 |
| comic_reveal | 4 |
| exam / map_travel | 3 / 3 |
| poem_compose / escape_game / sliding_puzzle / click_points | 各 1 |

每个事件的骨架都是：

```
transition(讲坛引子) → explore(找线索) → forced_choice(下结论) → transition(后世回声)
```

模版感的来源是 **transition 占了 36%**，而且首尾两个 transition 是纯读屏——玩家不动手。

更要命的是：**《神曲》在 V1 里只以「引文」形式存在。** 薄伽丘在讲坛上*告诉*你《地狱》XV 里有个布鲁内托，
玩家从头到尾没碰过《神曲》一下。唯一的例外是 `1308_inferno`——恰恰是那个应该被溶解掉的「独立神曲章节」。

结论：**不推翻 Timeline → People → Dialogue → Scene → Conflict。它是对的。只是每关缺最后一问。**

---

## 二、5 层结构

原来的 4 层全部保留，只在末尾追加第 5 层。

| 层 | 玩家问的问题 | 现有 phase 类型 | 改动 |
|---|---|---|---|
| 1 · Historical Moment | 此时发生了什么？ | `explore` / `map_travel` / `comic_reveal` | 无 |
| 2 · Character | 他遇到了谁？ | `explore` 里的 NPC | NPC 需登记进 cast（见 §4） |
| 3 · Conflict | 他面临什么矛盾？ | `forced_choice` | 无 |
| 4 · Dante's Response | 他怎么看这件事？ | `forced_choice` 的 response / conclusion | 无 |
| **5 · Divine Comedy Echo** | **这段经历后来去了哪？** | ~~`transition` 念一段引文~~ | **`echo_portal` → `inferno_placement` / `comedy_encounter`** |

代价很小：1–4 层零改动，只加 3 个新 phase 类型。

**不是每关都必须有第 5 层。** 有明确 connection 的才连。硬凑会毁掉这个机制的可信度。

---

## 三、两条平行线

```
但丁的一生
────────────────────────────────────────────────────────→
 1265      1283     1292      1295    1300   1302        1313    1321
 佛罗伦萨   贝雅特丽切  布鲁内托   步入政坛  执政官  放逐令       帝国之梦  拉文纳
   │          │         │         │       │      │            │       │
   ↓          ↓         ↓         ↓       ↓      ↓            ↓       ↓
────────────────────────────────────────────────────────→
《神曲》
 天堂 XV   炼狱 XXX   地狱 XV   地狱 VI  地狱 X  天堂 XVII    天堂 XXX  天堂 XXXIII
 卡恰圭达   她的登场    火雨沙地   恰科预言  老卡瓦  别人的面包    空座     终极之光
                                         尔坎蒂  ＋地狱 XIX
                                                 卜尼法斯
```

时间轴 UI（`Timeline.jsx`）加第二条淡轨，**只在有连接的事件下方画竖线**。没连接的留空——留白本身是信息。

---

## 四、全线映射表

| 年 | 现实事件 | Token | 《神曲》去处 | 第 5 层机制 | 本轮 |
|---:|---|---|---|---|:--:|
| 1265 | 佛罗伦萨之子 | `idea` 旧城 | 天堂 XV–XVII 卡恰圭达 | 已有 comic_reveal，后接 `echo_portal` | |
| 1283 | 贝雅特丽切 | `person` 贝雅特丽切 | 炼狱 XXX 她的登场 | `comedy_encounter` | |
| **1292** | **老师布鲁内托（新）** | `person` 老师 | **地狱 XV 火雨沙地** | **`comedy_encounter`** | ✅ |
| 1295 | 步入政坛 | `idea` 公民理想 | 地狱 VI 恰科预言城之分裂 | `comedy_encounter` | |
| 1300 | 执政官·禧年 | `conflict` 放逐挚友 | 地狱 X 老卡瓦尔坎蒂「我儿子呢？」 | `comedy_encounter` | |
| 1302 | 放逐令 | `conflict` 流亡 | 天堂 XVII 预言 ＋ 地狱 XIX 卜尼法斯 | **`echo_portal` + `inferno_placement`** | ✅ |
| 1308 | 异乡的面包 | `idea` 用俗语写作 | 地狱 III 地狱之门 | `echo_portal`（溶解掉「独立神曲章节」） | |
| 1313 | 帝国之梦 | `memory` 亨利七世 | 天堂 XXX 为他留的空座 | `echo_portal` | |
| 1315 | 拒绝赦免 | `conflict` 尊严 | 天堂 XXV「若这圣诗能让我返乡……」 | `echo_portal` | |
| 1321 | 拉文纳·天堂 | — | 天堂 XXXIII 终极之光 | 全部 token 回收结算 | |

### 关于新增的 1292 布鲁内托事件

用户提议 ~1287，改到 **1292**，理由：

1. 布鲁内托 1294 年去世，1292 是最后的窗口；
2. 贝雅特丽切 1290 死后但丁转向哲学与古典（《飨宴》自述），此时遇见「教我如何使人不朽」的老师，
   分量最重——他刚失去她，刚发誓「要写出前人从未为任何女子写过的话」；
3. 避开 1283 事件已叙述到 1290 的时间重叠；
4. 仍在 1295 从政之前，「老师教他公民生活」的因果不变。

**一个诚实的教学点**：我们其实不知道但丁怎么认识布鲁内托的。我们知道有这回事，
**是因为但丁在《地狱》里写了**。讲坛框架（薄伽丘）正好可以直说这一句——
让孩子看到：现实这一半的证据，来自文学那一半。

---

## 五、Token / Portal 系统

每个事件走完第 4 层，掉落一枚 token：

```json
"echoToken": {
  "id": "esilio",
  "kind": "conflict",          // person | memory | idea | conflict
  "name": "流亡",
  "detail": "1302 · 缺席审判，终身放逐，拒不到庭者火焚之"
}
```

四种 kind 决定图标与配色。token 存 `localStorage`（沿用成就系统那套持久化），
在人物回顾页（`CharacterRecap.jsx`）汇成一份「手稿」。

**Portal 仪式**：玩家把 token 拖进但丁的手稿 → 现实场景去色、淡出 → 墨迹晕开 → 《神曲》场景淡入。
这一下之后，游戏问的不再是「但丁后来怎么了」，而是：

> **他把这段经历，变成了什么？**

---

## 六、3 个新 phase 类型（数据契约）

### 1 · `echo_portal` —— 现实 → 文学 的转场仪式

```json
{
  "id": "portal_esilio",
  "type": "echo_portal",
  "background": "/assets/dante/events/1302_esilio/backgrounds/inn_snow_night.webp",
  "comedyBackground": "/assets/dante/comedy/backgrounds/inferno_gate.webp",
  "manuscript": "/assets/dante/comedy/manuscript.webp",
  "token": { "id": "esilio", "kind": "conflict", "name": "流亡",
             "detail": "1302 · 缺席审判，终身放逐" },
  "prompt": "把「流亡」放进但丁的手稿",
  "afterTitle": "十四年后 · 天堂 第十七歌",
  "afterText": "他让 1300 年的先祖，「预言」1302 年已经发生的事。",
  "nextPhase": "..."
}
```

拖拽 + 点击双通道（触屏必须能点）。约 15 秒。

### 2 · `inferno_placement` —— 「但丁把他们放在哪儿了？」

```json
{
  "id": "place_enemies",
  "type": "inferno_placement",
  "background": "/assets/dante/comedy/backgrounds/inferno_funnel.webp",
  "question": "这些人，但丁把他们放进了地狱的哪一层？",
  "circles": [
    { "id": "c7", "name": "第七圈", "label": "暴力", "y": 46 },
    { "id": "c8b3", "name": "第八圈 · 第三沟", "label": "买卖圣职", "y": 64 },
    { "id": "c9", "name": "第九圈", "label": "背叛", "y": 84 }
  ],
  "souls": [
    { "id": "boniface", "name": "卜尼法斯八世",
      "portrait": "/assets/dante/npcs/boniface.webp",
      "metIn": "1302_esilio", "metLabel": "1301 罗马 · 教皇接见厅",
      "answer": "c8b3",
      "verdict": "《地狱》XIX：尼古拉三世认错了人，「预言」卜尼法斯将来要头下脚上倒插进这道石缝——写这段时，教皇还活着。",
      "hint": "他犯的罪，和「钱」与「圣职」有关。" }
  ],
  "timeLimitSec": 45
}
```

**关键约束：`souls` 里的人，必须是玩家在前面的现实场景里真的对过话的。**
UI 会显示 `metLabel`（「你在 1301 罗马见过他」）——「等等，这个人我刚刚见过」正是这个机制的全部意义。
名字不能凭空出现在 quiz 里。

### 3 · `comedy_encounter` —— 同一个人，重新遇见

```json
{
  "id": "meet_brunetto",
  "type": "comedy_encounter",
  "background": "/assets/dante/comedy/backgrounds/inferno_xv_sand.webp",
  "soul": {
    "id": "brunetto", "name": "布鲁内托·拉蒂尼",
    "realityPortrait": "/assets/dante/npcs/brunetto.webp",
    "comedyPortrait": "/assets/dante/comedy/souls/brunetto_burnt.webp",
    "metIn": "1292_brunetto", "metLabel": "1292 佛罗伦萨 · 老师的书房"
  },
  "recognition": "「你在这儿吗，布鲁内托先生？」",
  "asks": [
    { "q": "你敬重他。他为什么在这里？", "a": "..." },
    { "q": "你为什么还叫他「先生」？", "a": "..." },
    { "q": "他会因为这首诗被记住吗？", "a": "..." }
  ],
  "requiredAsks": 2,
  "closing": "..."
}
```

**问的对象是但丁，不是玩家。** 这一层不考记忆，考理解——所以没有对错，只有追问。
现实立绘 → 地狱立绘的交叉淡化是这一层的情绪核心：同一张脸，环境、衣着、状态全变了。

---

## 七、引擎改动清单

| 文件 | 改动 |
|---|---|
| `src/components/ScenePlayer.jsx` | +3 个 phase 分支，+3 个自包含子组件（照 `ComicRevealPhase` 的写法） |
| `src/components/SceneEditor.jsx` | 交互模板库 +3 个一键插入模板 |
| `src/components/Timeline.jsx` | 第二条《神曲》淡轨 + 竖向连线 |
| `src/data/dante/timeline.json` | 新增 1292 事件；事件加 `comedyAnchor` 字段（供双轨用） |
| `src/utils/scoring.js` | `POINTS.infernoPlace`（放对一个 +20），`comedy_encounter` 不计分 |
| `src/data/dante/comedy/cast.json`（新） | 全线「现实见过的人 → 《神曲》去处」注册表，防止两边写岔 |

新素材目录：`public/assets/dante/comedy/{backgrounds,souls,manuscript.webp}`。

---

## 八、实施顺序

1. ✅ 本文档
2. 引擎：3 个 phase 类型 + 占位素材（先跑通渲染）
3. 新增 1292 布鲁内托事件（现实半场）
4. 1302 放逐令接上第 5 层：`echo_portal` → `inferno_placement` → `comedy_encounter`(布鲁内托)
5. `npm run build` + 浏览器实跑验证
6. —— 竖切跑通后 —— 双时间轴 UI、其余 7 个事件的第 5 层、token 回收结算页

---

## 九、学习弧线（这是这一章真正的教学论点）

玩家一开始以为：《神曲》= 但丁编的一个关于地狱的故事。

随着时间轴往后：

```
佛罗伦萨政治  →  政敌出现在《地狱》里
老师与朋友    →  以亡魂的身份重新登场
流亡          →  旅途 / 失所 / 幽暗森林
政治审判      →  《地狱》的道德地理
古典教育      →  维吉尔
信仰          →  炼狱 / 天堂
```

最后玩家自己得出：

> 《神曲》和但丁的人生不是两件事。它是用他的政治、他的师友、他的思想来源、
> 他的信仰和他的经历，盖出来的一个虚构世界。

而这个结论，是玩家**亲手把 token 拖进手稿**得出来的，不是薄伽丘在讲坛上告诉他的。

# 新人物制作模版 & 工作流

> 以杜甫线为基准沉淀的流程。照此顺序做，避免剧本/数据/资产来回返工。
> 一个人物 ≈ 8–10 个事件、50–65 个 phase、40+ 背景、30+ NPC 立绘。

## 工作流（严格按顺序）

```
1. 选事件     → 定 8–10 个关键年份事件，画出人物弧线（每事件一句"负责什么"）
2. 写 SCREENPLAY → 按下方模版逐事件写完，每个 phase 标注类型与通过条件
3. 审阅锁稿   → 剧本确认后才进入 3 以后；之后只许小改
4. 转 event.json → 照 SCREENPLAY 机械转写（最好一次性全部转完）
5. 写 quiz.json  → 每事件 3 题（2 选择 + 1 补诗），考剧情里出现过的知识点
6. 生成资产    → 按 ASSET_PROMPTS 模版批量出图（背景→NPC→道具），统一画风
7. 编辑器微调  → 坐标、缩放、立绘指定，全部在 ?editor=true 里做
8. 通关测试    → 从头玩到尾一遍，确认成就触发
```

## 目录约定

```
src/data/<charId>/
├── timeline.json                # 人物 + stages[] + events[]（含 mapPosition）
└── events/<year>_<slug>/
    ├── event.json               # phases[]
    └── quiz.json                # quizzes[]（3 题）
public/assets/
├── characters/<charId>/         # 分期立绘 <stage>/<pose>.png + portrait.png
├── characters/npcs/             # 共用 NPC（按 speaker id 命名）
├── events/<year>_<slug>/backgrounds/
├── maps/                        # <charId>_general_map.png + route_<event>.png
└── audio/bgm/<stageId>.mp3      # 一时期一曲
```

## SCREENPLAY.md 模版（每个事件一节）

```markdown
## <年份> <事件名>

**地点**：X → Y　**时期**：<stage>　**状态**：<人物心境一词>
状态标记：📝 草稿 / ✅ 已实现

### 设计意图
一句话：本事件在人物弧线中负责什么（如"第一次看见政治黑暗"）。

### Phase N · <type> · <小标题>
- **背景**：`<bg>.png`（一句画面描述，将来直接当生图 prompt）
- **叙事 narrative**：开场旁白（可空）
- **指示 instruction**：给玩家的一句操作提示
- **内容**：按类型写——
  - explore: NPC 列表（🔑=线索）：`id`「名」立绘 位置(x,y) + 台词
  - forced_choice: 题干 + 选项表（每项：选项文字 | 人物反应 | 走向）
  - poem_compose: 候选词 + 正确填法
  - exam: 考官 + 题目列表
  - map_travel: 途经点 `id`「名」(x,y) + 到达台词
  - comic_reveal: 分格表 `id` (x,y,w,h%) + 揭开台词；注明 点击/自动(秒)
  - escape_game: 棋盘尺寸、起终点、建筑表、守卫表、追逐半径
  - transition: 过场文字 / 公告(标题+正文) / 杜甫式 reaction
- **通过条件**：requiredTalks N / 全部线索 / 选对 等
- **nextPhase**: `<id>`

### 诗作
本事件绑定的诗（出处 + 节选）。

### 资源需求
背景 N 张（列名）、专属 NPC 立绘（列名）——这节就是资产清单。
```

## phase 类型速查（引擎已支持，新人物零代码可用）

| type | 用途 | 关键字段 |
|---|---|---|
| explore | 点 NPC/物件对话 | npcs[](可设 clickable:false / hideHint)、requiredTalks |
| transition | 过场/诏书/反应 | transitionText、announcement{title,text}、dufu_reaction |
| forced_choice | 单选分支 | question、options[]、conclusion |
| exam | 考试 | examiner、questions[]（choice/poem_fill） |
| poem_compose | 拼诗 | poemContext、poemCandidates、poemAnswer |
| map_travel | 地图途经点 | background(路线图)、waypoints[]{id,name,x,y,dialogues} |
| comic_reveal | 连环画分格 | panels[]{x,y,w,h,dialogues}、autoAdvanceSec |
| click_points | 找茬触发点 | points[]、progressivePoem、unlockThreshold |
| sliding_puzzle | 数字华容道 | puzzles[] |
| escape_game | 追逐逃脱 | gridW/H、cells、guards、chaseRadius、start/end |

主人公分期立绘：在 `src/data/dufuPoses.js` 同款文件里登记 `<charId>Poses.js`
（分期年份表 + 姿态清单），引擎按事件年份自动选默认立绘。

## 接入 checklist（新人物上线前）

- [ ] App.jsx CHARACTERS 数组解锁该人物（去掉 locked）
- [ ] ACHIEVEMENT_TITLES 加成就名（如 libai: "诗仙之路"）
- [ ] timeline.json 的 hasScene/hasQuiz 标记齐全
- [ ] 大地图图钉 mapPosition 在 TimelineEditor 里校准
- [ ] bgm/<stageId>.mp3 就位（可后补）
- [ ] 资产引用扫描 0 断链（脚本見 scripts/）
- [ ] 全流程通关一遍 → 成就 + 回顾正常

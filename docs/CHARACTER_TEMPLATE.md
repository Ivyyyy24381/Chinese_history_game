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

## 完整范例：杜甫 · 747 制举「野无遗贤」

> 选这个事件做范例，是因为它把「剧情 → 小游戏 → 揭示」的设计套路走得最完整。
> 写每个事件时对照它检查：玩家是**亲历**了这段历史，还是只是被告知了？

```markdown
## 747 制举「野无遗贤」

**地点**：长安　**时期**：困守长安　**状态**：第一次看见政治黑暗

### 设计意图
第一次让杜甫看见「公平」是假的。考试本身是「难」的——但即便答对，
也照样落榜。这是全剧的第一次结构性失败。

### Phase 1 · explore · 长安街头（6 NPC）
> 天宝六载，皇帝下诏特办制举，「通一艺者」皆可来长安应考。
- 商贩甲：「前时才科举，为何今秋又办？」
- 士人乙：「制举多有觅举，唯恐有害士风，耿介羞与为伍。」
- ……（6 个市井 NPC，每人一句侧面信息：制举多稀罕、谁会来考、士人怎么看）
- 通过：与 3 人交谈 → 触发区域 (48,25)，进入考场。

### Phase 3 · exam · 制举考试（8 题）
考官：李林甫。5 选择 + 3 补诗，全部是真实唐代文学考点：
1. 「风雅」指哪部典籍？→《诗经》
6. 贾谊《鵩鸟赋》：「万物为 ___」→ 铜
……（玩家认真作答，且确实能答对——这是关键）

### Phase 4 · transition · 揭榜
> 一个月后……

### Phase 5 · explore · 长安市（5 条线索）
- 🔑 榜单（点击）：「未上榜」+ 杜甫四段反应
- 🔑 落榜书生：「这次制举及第人数颇少啊。」
- 🔑 提文：「相国晋公林甫，以草野之士猥多……——元结」

### Phase 6 · forced_choice · 得出结论
| 选项 | 反应 | 结果 |
| 运气不好 | 「总感觉漏掉了什么？」 | ❌ 退回去继续找线索 |
| 李林甫！ | 「平民无一人及第！这是『野无遗贤』把戏。」 | ✅ 真相 |

结语：宰相李林甫为巩固权位，上书称「野无遗贤」。这一年无一人被录取。
```

**从这个范例提炼的设计原则（写所有剧情/小游戏前先读一遍）**

1. **设计意图先行**：一句话说清本事件让玩家"经历什么情绪"。747 是「认真努力却被结构性作弊」——所有 phase 都为这一句服务。
2. **信息埋在闲谈里，不用旁白灌输**：制举的背景知识全部拆成市井 NPC 的只言片语，玩家拼起来的才记得住。
3. **小游戏必须是叙事本身，不是打断叙事**：考试真出题、真答题（且答得对），落榜才有冲击力。同理：出城逃脱=战乱恐惧，华容道=写赋推敲，找茬=《春望》之眼，连环画=梦境/夜宿的窥视感。
4. **失败后让玩家自己查案**：揭榜不直接给答案，给 5 条线索让玩家自己得出「李林甫」——主动推理出的黑暗才震撼。
5. **错误选项不惩罚，而是送回去找线索**：forced_choice 的「❌」是引导（再看看），不是 game over。
6. **每事件绑一首诗 + 一个心境词**：「状态」字段（少年意气→政治黑暗→盛世崩塌→…）串起来就是人物弧线，写完十个事件检查状态序列是否成立。

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

## ASSET_PROMPTS.md 怎么写（资产描述模版）

> 参考杜甫线的 `docs/ASSET_PROMPTS.md`（80+ 张图一批跑完）。原则：
> **SCREENPLAY 里每个 phase 的「背景」「NPC」描述就是 prompt 的素材**，
> 资产文档只是把它们汇总成可以直接批量生成的清单。

### 文档结构（固定六类）

```markdown
# 美工生成指南 · <人物名>

## 通用风格指南          ← 全人物统一画风，每条 prompt 前都粘这段
   - 画风正向 prompt（中 + 英两版，如"唐代工笔重彩…"）
   - 反面 prompt（no text, no watermark, no modern elements…）
   - 输出规格（见下表）
   - 同一 seed / style reference 跑完整批，保证画风统一

## 一、背景图             ← 按事件分组，每事件 4–6 张
## 二、NPC 立绘           ← 按圈层分组（家人/文人圈/市井/战乱/晚年…）
## 三、主角分期姿态立绘    ← 按人生阶段分组，每期 2–5 个姿态
## 四、道具               ← 可交互物件（卷轴/酒杯/兵器…）
## 五、地图               ← 主地图 1 张 + 每个 map_travel 路线图 1 张
## 六、BGM                ← 一时期一首（风格描述即可，见 audio/bgm/README）
```

### 每类的规格与写法

| 类别 | 规格 | 路径 | prompt 要点 |
|---|---|---|---|
| 背景 | 1920×1080 PNG | `events/<事件>/backgrounds/` | 场景+时辰+光线+氛围；**不画可交互 NPC**（立绘独立放置，bubbleMode 例外） |
| NPC 立绘 | 768×1024 透明底 | `characters/npcs/<speakerId>.png` | 年龄+服饰（朝代考证）+神情+姿态；视线朝画面中央偏左；需镜像的引擎 flip 处理，生成正向即可 |
| 主角姿态 | 768×1024 透明底 | `characters/<charId>/<stage>/<pose>.png` | 同一张脸不同年龄段！写明岁数、体态变化（清瘦/佝偻）、服饰随境遇变化 |
| 道具 | 1024×1024 透明底 | `props/<name>.png` | 单物居中、可平放可手持视角，古物考证 |
| 地图 | ≥1600 宽，统一比例 | `maps/` | 手绘古地图风；路线图标注途经地名；留好图钉空间（避免文字挤在路线上） |
| BGM | mp3 ≤2MB 可循环 | `audio/bgm/<stageId>.mp3` | 写"乐器+情绪+节奏"一句即可（交给作曲/AI 音乐工具） |

### 单条 prompt 的固定字段（表格一行一张图）

```
| 文件名 | 用途（事件/角色） | Prompt（中文） |
```

写 prompt 的口诀：**主体 + 年龄服饰考证 + 神情动作 + 构图（半身/全身/视角）+ 透明背景**。
背景类：**地点 + 时辰天气 + 光源 + 氛围词 + 镜头（远景/室内一角）**。

### 数量预算（一个人物的典型体量，照杜甫线）

背景 ≈ 40–46 张 · NPC ≈ 25–36 张 · 主角姿态 ≈ 14 张 · 道具 ≈ 18–23 件 · 地图 ≈ 6–7 张 · BGM 5 首

### 批量生成

ComfyUI 批跑脚本和 CSV 清单模板见 `scripts/COMFYUI_SETUP.md`——
把上面表格导成 CSV（文件名, prompt）即可整批出图，出完按文件名归位，
跑一次资产扫描脚本确认 0 断链。

## 接入 checklist（新人物上线前）

- [ ] App.jsx CHARACTERS 数组解锁该人物（去掉 locked）
- [ ] ACHIEVEMENT_TITLES 加成就名（如 libai: "诗仙之路"）
- [ ] timeline.json 的 hasScene/hasQuiz 标记齐全
- [ ] 大地图图钉 mapPosition 在 TimelineEditor 里校准
- [ ] bgm/<stageId>.mp3 就位（可后补）
- [ ] 资产引用扫描 0 断链（脚本見 scripts/）
- [ ] 全流程通关一遍 → 成就 + 回顾正常

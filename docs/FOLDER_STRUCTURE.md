# 项目目录结构

> 一句话规则：**每条故事线 = 一个 line id（`dufu` / `dante` / `rumi`…）；每个事件 = 一个文件夹。**
> 数据在 `src/data/<line>/`，素材在 `public/assets/<line>/`，跨线共用的进 `shared/`。

（活的完整目录树以 `docs/PIPELINE.md` 附录 A 为准，这里只讲"东西放哪、为什么"。）

## 整体布局

```
Chinese_history_game/
├── README.md                       # 项目主页（在这里入手）
├── package.json / vite.config.js   # 构建配置 + 编辑器 dev 保存中间件
├── index.html / src/main.jsx       # 入口
│
├── docs/                           # 📚 所有文档（清单见 PIPELINE.md 附录 A）
│
├── src/
│   ├── App.jsx                     # 顶层：选人 / 游戏 / 编辑器路由
│   ├── styles/
│   │   ├── game.css
│   │   └── theme.js                # 全局视觉 token：纸色/文字色阶/金线/字距/
│   │                               #   halo()/scrim()——主页与地图页共用的风格基准
│   ├── components/                 # React 组件
│   │   ├── CharacterSelect.jsx     # 主页（视觉风格基准）
│   │   ├── GameMap.jsx             # 地图页：旅人墨线/古地图符号/雾/mapTheme
│   │   ├── Timeline.jsx            # 底部时间轴细带（hover 展开）
│   │   ├── ScenePlayer.jsx         # 13 种交互的播放器
│   │   ├── SceneEditor.jsx         # 场景编辑器（?editor=true 下钻）
│   │   ├── TimelineEditor.jsx      # 时间线编辑器（?editor=true 入口）
│   │   └── EventPanel · QuizPanel · DialogueBox · ScoreBar · …
│   ├── data/
│   │   ├── characters.js           # 人物花名册（单一事实来源；含地图 mapTheme）
│   │   ├── phaseTemplates.js       # 编辑器「插入交互模板」的 13 种模板
│   │   ├── dufuPoses.js · dantePoses.js   # 主角分期立绘表
│   │   └── <line>/                 # 每条故事线一个目录
│   │       ├── timeline.json       # 主时间线：时期 × 事件（含地图坐标）
│   │       └── events/<事件ID>/
│   │           ├── event.json      # 场景定义（phases、NPC、对话）
│   │           └── quiz.json       # 答题题目（可选）
│   └── utils/                      # asset.js · usePrefersReducedMotion.js
│
├── public/assets/
│   ├── home/                       # 主页素材 hp_{title,background,portrait,name}_<line>
│   ├── shared/{items,bgm}/         # 跨线共用（道具等）
│   └── <line>/                     # 每条故事线一套素材
│       ├── hero/                   # 主角分期立绘
│       ├── npcs/                   # 该线反复出现的 NPC
│       ├── props/                  # 道具
│       ├── maps/                   # 主地图 + 各 map_travel 路线图
│       ├── bgm/                    # 每时期一首，文件名 = stage id
│       └── events/<事件ID>/{backgrounds,npcs}/   # 事件专属素材
│
├── assets_src/                     # 原图存档（gitignore，不入库）
└── .editor-backups/                # 编辑器写盘前自动备份（gitignore，每文件留 20 份）
```

> ⚠️ `public/assets/characters/` 和 `public/assets/events/`（无 line 前缀）是旧版布局的
> 遗留目录，仅个别旧路径还在引用；新素材一律放 `public/assets/<line>/…`。
> 迁移计划见 `docs/ASSET_RESTRUCTURE_PLAN.md`。

## 决策三问 — 我的图放哪里？

1. **是某条线的主角？** → `public/assets/<line>/hero/`
2. **这个角色会出现在该线多个事件里？** → `public/assets/<line>/npcs/`
3. **只在一个事件里出现？** → `public/assets/<line>/events/<事件ID>/npcs/`

场景背景永远进 `public/assets/<line>/events/<事件ID>/backgrounds/`；
跨线共用的道具进 `public/assets/shared/items/`。

## 添加新事件的流程

1. 在 `src/data/<line>/timeline.json` 的某个 stage 下加一个 event 对象
2. `mkdir src/data/<line>/events/<事件ID>/` 写 `event.json`（和可选的 `quiz.json`）
3. `mkdir public/assets/<line>/events/<事件ID>/backgrounds/` 和 `npcs/` 放素材
4. event.json 里背景路径写 `/assets/<line>/events/<事件ID>/backgrounds/<filename>.png`
5. 打开 `?editor=true` 精修：坐标、缩放、对话（保存自动按故事线落盘并备份）

## 命名约定

| 类型 | 命名 | 示例 |
|---|---|---|
| line id | 英文小写 | `dufu`, `dante`, `rumi` |
| 事件 ID | `YYYY_拼音/意大利语简称` | `747_exam`, `1302_esilio` |
| 文件夹 | 与事件 ID 完全一致 | `events/747_exam/` |
| 背景图 | 描述性英文 | `changan_street.png`, `gate_of_hell.png` |
| NPC 图 | 角色拼音/名字 | `libai.png`, `boccaccio.png` |

## 路径前缀

资源在 JSON 里以 `/assets/...` 开头（Vite 自动从 `public/` 服务）。**不要写 `/public/assets/...`。**

| JSON 里写 | 实际文件位置 |
|---|---|
| `/assets/dufu/hero/portrait.png` | `public/assets/dufu/hero/portrait.png` |
| `/assets/dante/events/1308_inferno/backgrounds/gate_of_hell.png` | `public/assets/dante/events/1308_inferno/backgrounds/gate_of_hell.png` |

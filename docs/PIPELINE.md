# 历史长河 · 一条人物线的完整制作流程

> 这份是**总流程**：从"想做谁"到"网页上线"，每一步谁做、产出什么、文件落在哪。
> 剧本模版看 `CHARACTER_TEMPLATE.md`，美工 prompt 写法看 `ASSET_PROMPTS.md`，部署细节看 `DEPLOYMENT.md`。
>
> ⚠️ `FOLDER_STRUCTURE.md` 写的是 2026-08 资产重构**之前**的目录，已过期。以本文附录 A 为准。

---

## 0. 全貌

一条人物线 = 一个 **line id**（英文小写，如 `dufu` / `dante` / `rumi`）。
所有产出都按这个 id 分目录，三条线互不干扰。

| # | 阶段 | 谁做 | 产出 | 落在哪 |
|---|---|---|---|---|
| 1 | 定框架 | 人 | 8–10 个事件的一句话清单 + 画风一句话 | `docs/SCREENPLAY_<LINE>.md` 开头 |
| 2 | 写剧本 | 人 + AI 起草 | 逐事件、逐 phase 的剧本 | `docs/SCREENPLAY_<LINE>.md` |
| 3 | 出资产 | AI 批量 + 人验 | 背景 / NPC / 主角姿态 / 道具 / 地图 | `public/assets/<line>/**` |
| 4 | 转成游戏 | Claude | timeline / event / quiz 三种 json | `src/data/<line>/**` |
| 5 | 编辑器精修 | 人 | 改回同样那几个 json | 同上 |
| 6 | 细节微调 | 人 | 换图、改文案 | 资产目录 + json |
| 7 | 新交互 | 人定设计 + Claude 实现 | 新 phase type | `src/components/ScenePlayer.jsx` |
| 8 | 部署 | CI | 线上站点 | `dist/` → GitHub Pages |

**一句话分工**：内容（剧本 + 图）是人的活，转写和接引擎是 Claude 的活，
**精修是人在编辑器里做的活** —— 第 5 步是这条流水线里最需要人眼的一步。

---

## 1. 定框架

先别写剧本。先把这三件事定死，否则后面全是返工：

1. **事件清单**：8–10 个关键年份，每个一行 —— `年份 · 地点 · 事件名 · 这个事件负责人物弧线的哪一段`。
   宁可少不要多，一个事件展开就是 5–8 个 phase。
2. **画风一句话**：杜甫线是"唐代工笔重彩"，但丁线是"乔托湿壁画 × 中世纪泥金手抄本"。
   这句话会变成所有图的公共前缀，定错了整线返工。
3. **line id** 和**分期划分**（3–5 个人生时期，每期一个颜色、一首 BGM）。

清单定稿后，**先把人物注册进去占位**，这样主页立刻能看见：

```js
// src/data/characters.js —— 新增一项，locked: true
{
  id: "rumi", dataDir: "rumi", name: "鲁米", title: "旋舞的诗人",
  years: "1207—1273", dynasty: "呼罗珊 · 科尼亚",
  description: "…", achievementTitle: "旋舞之路", completionLine: "…",
  background: "/assets/home/hp_background_rumi.jpg",
  scrimBoost: 0.3,                       // 底图画面越密数值越大
  portrait: "/assets/home/hp_portrait_rumi.png",
  name_img: "/assets/home/hp_name_rumi.png", nameHeight: 34,
  locked: true,                          // 剧本没做完就保持 true
}
```

剧本目录还没建也不会报错，进游戏会显示「建设中」占位页。

---

## 2. 写剧本

照 `docs/CHARACTER_TEMPLATE.md` 的模版逐事件写，**每个 phase 必须标注 type**。
引擎已支持的 13 种，零代码可用：

| type | 玩法 | 剧本要写什么 |
|---|---|---|
| `explore` | 点场景里的人和物听台词 | 场景描述 + 每个 NPC 的 2–3 句台词，标出谁是线索人物 |
| `forced_choice` | 二三选一的抉择 | 情境 + 问题 + 每个选项的回应文本 |
| `exam` | 答题（选择 / 补诗） | 4 选 1 + 解析，或原句 + 3 个干扰项 |
| `transition` | 过场 | 一段旁白 |
| `narration` | 纯叙述 | 一段旁白 |
| `map_travel` | 在路线图上依次点经停点 | 路线 + 每个点的一句话 |
| `poem_compose` | 补诗 / 集句 | 原诗 + 挖空位置 + 干扰项 |
| `comic_reveal` | 连环画逐格揭开 | 每格的画面描述 + 文字 |
| `dialogue_branch` | 分支对话 | 对话树 |
| `click_points` | 图上找点 | 找什么 + 找到后的台词 |
| `sliding_puzzle` | 数字华容道拼诗句 | 要拼的原句 + 限时 |
| `escape_game` | 躲守卫出逃 | 玩法说明（布点开发做） |
| `minigame` | 自定义小游戏 | 玩法说明 |

**剧本阶段就要自查的三件事**（杜甫线踩过的坑）：
引用的诗句在该年份**是否已经写出来了**；行程路线**是否合史实**；
台词**是否符合人物当期的思想**、有无争议表述。

同时列出**资源需求清单**（每个 phase 要哪些背景、哪些 NPC、哪些道具），
这份清单直接变成第 3 步的 manifest。

---

## 3. 出资产（ComfyUI 批量）

### 目录约定

```
public/assets/<line>/
├── hero/                    # 主角
│   ├── portrait.png         # 通用立绘（地图页头像用）
│   ├── <时期>/              # 按人生阶段分目录
│   │   └── <姿态>.png       # 如 youth/standing.png, exile/writing.png
├── npcs/                    # 该线所有 NPC（跨事件复用，平铺不分子目录）
│   └── beatrice_young.png
├── props/                   # 可交互道具
│   └── laurel_crown.png
├── maps/
│   ├── <line>_general_map.png     # 主地图（GameMap 用）
│   └── route_<年份>_<简称>.png     # 每个 map_travel 一张路线图
├── bgm/
│   └── <stageId>.mp3        # 一个时期一首
└── events/<事件ID>/backgrounds/
    └── <场景英文名>.png      # 该事件专属背景，16:9
```

跨故事线共用的东西放 `public/assets/shared/{items,bgm}/`，主页素材放 `public/assets/home/`。

### 流程

1. **写 manifest**：`scripts/assets_manifest_<line>.csv`，五列
   `type,output_path,prompt,width,height,transparent`
   - `output_path` 直接写最终落点（`public/assets/dante/npcs/boccaccio.png`），脚本按这个路径存
   - 立绘/道具 `transparent=true`，背景 `false`
   - `prompt` 只写这一张的内容，**公共画风由脚本的 preset 统一加**，不要每行重复
2. **先试跑几张**：
   ```bash
   python scripts/run_comfyui_batch.py --manifest scripts/assets_manifest_<line>.csv \
     --preset <tang|dante> --filter 1265 --skip-existing
   ```
   人眼验收 → 改 prompt → 再试。**画风和人脸锚点没定稿前不要批量跑**
   （但丁线因为鼻子描述权重问题返工过两轮）。
3. **批量跑**：去掉 `--filter`，全量生成 → 人眼逐张验收。
4. **抠透明底**：`python scripts/remove_bg.py`（rembg u2net + alpha matting），
   跑完确认全部是 RGBA。
5. 新画风要加 preset 的话，改 `scripts/run_comfyui_batch.py` 里的 `STYLE_PRESETS`。

ComfyUI 环境搭建看 `scripts/COMFYUI_SETUP.md`。

---

## 4. 交给 Claude 转成游戏

把这三样丢给 Claude，说"做 XX 人物线"：

- `docs/SCREENPLAY_<LINE>.md`（定稿剧本）
- 已经归好位的 `public/assets/<line>/`
- 事件清单里的分期划分

Claude 产出：

```
src/data/<line>/
├── timeline.json                    # 人物信息 + 分期 + 事件列表 + 地图坐标
└── events/<事件ID>/
    ├── event.json                   # 场景：phases / NPC / 对话 / 触发点
    └── quiz.json                    # 题目（可选）
src/data/<line>Poses.js              # 主角姿态表（哪个时期有哪些姿势）
src/data/characters.js               # 把 locked 改成 false
```

三个 json 的字段速查见附录 B。

**验收**：`npm run dev` → 选人 → 走完整条线，每个 phase 都能过、没有 404 图。
这一步只要"能跑通"，好不好看是第 5 步的事。

---

## 5. 编辑器精修 ⭐

这是给人用的一步。目标是**改文案、挪位置、套模板** —— 不碰代码。

### 怎么进

```bash
npm run dev
# 浏览器打开 http://localhost:5173/?editor=true
```

编辑器**只在 dev 模式下能保存**（保存靠 `vite.config.js` 里的 dev 中间件写文件），
`npm run build` 出来的线上版本没有这个功能。

### 两层结构

```
?editor=true
  └─ 🗺 时间线编辑器 (TimelineEditor)      ← 管 timeline.json
       └─ 📝 编辑此事件的场景 (SceneEditor) ← 管 event.json
```

两层顶部都有**故事线切换器**（dufu / dante / …，自动发现 `src/data/*/`），
并且**始终显示当前正在编辑的完整落盘路径**（如 `src/data/dante/events/1295_arte/event.json`）——
看一眼路径再保存，永远不会存错线。

**第一层 · 时间线编辑器** 改的是 `src/data/<line>/timeline.json`：

| 想改什么 | 怎么做 |
|---|---|
| 事件在地图上的位置 | 直接**拖动地图上的 pin** → 自动写 `location.mapX/mapY` |
| 事件年份 | 拖动下方时间线上的 tick |
| 事件名 / 简介 / 地点名 / 人物状态 | 点选 pin → 右侧表单 |
| 时期名 / 起止年 / 颜色 / 时期简介 | 点选时期段 → 右侧表单 |
| 这个事件有没有场景、有没有题 | `hasScene` / `hasQuiz` 勾选 |

改完点 **💾 保存 timeline.json**。

**第二层 · 场景编辑器** 改的是 `src/data/<line>/events/<事件ID>/event.json`：

| 想改什么 | 怎么做 |
|---|---|
| **改一句台词** | 点画布上的 NPC → 右侧对话列表 → 直接改文字；`+ 台词` 加一句 |
| **挪 NPC 位置** | 在画布上直接拖（拖动 5px 才触发，避免误拖）；`大小:` 调缩放 |
| **加一个 NPC** | 左侧立绘面板点一下 → 落在画布中央 → 拖到位 → 填台词 |
| **换背景** | 顶部背景下拉框（自动扫描 `public/assets/*/events/**`，放好图刷新就有） |
| **加道具** | 左侧道具面板，用法同 NPC；不可点的装饰物勾"装饰"，不计入必谈数 |
| **改必谈人数** | `所有NPC交谈后` 相关设置 —— 决定"继续"按钮什么时候亮 |
| **加/删一屏（phase）** | 顶部 phase 列表；`显示类型` 下拉切 13 种交互类型 |
| **从模板加一屏** | 顶部 **🧩 插入交互模板** → 13 种交互每种一张卡（示意图 + 一句话说明 + 取材事件），点卡即插入一个填好占位内容、可直接运行的新 phase，改文字即可用（模板定义在 `src/data/phaseTemplates.js`） |
| **接下一屏** | `-- 按顺序下一个 --` 或指定 `目标阶段` |
| **加触发点** | `+ 添加触发点` → 继续按钮 / 场景传送门 / 文字标签 |
| **map_travel 路线** | 在画布上拖编号 waypoint，会自动连线 |
| **改题目** | ⚠️ **编辑器不管 `quiz.json`，直接改文件** |

改完点保存。

### 保存链路的防线（2026-08 已修复三个数据坑）

早期版本有三个坑：保存丢当前屏（闭包陈旧值）、非杜甫线存进杜甫目录（保存接口写死 dufu）、
无备份无提示。**现已全部修复**，当前保存链路的行为是：

1. **保存的就是你眼前的内容** —— 当前屏的编辑先同步拼进场景对象再写盘，改完直接点保存即可。
2. **按故事线落盘** —— 保存接口按当前线拼路径，且对线名做白名单校验（必须是 `src/data/` 下真实目录）。
3. **写盘前自动备份** —— 原文件先复制到 `.editor-backups/<line>/<事件ID>/<时间戳>.json`
   （已 gitignore，每个文件保留最近 20 份）；写入前做 JSON 校验；保存成功回显完整路径 + 字节数。
4. **未保存改动有确认** —— 关页面 / 返回 / 切换故事线 / 下钻场景编辑器时，如有未写盘的改动会弹确认。

好习惯仍然保留：一次只改一个事件，一个事件一个提交，`git diff` 看一眼再提交。

### 精修的验收标准

每个事件改完，从头玩一遍，问自己：
- NPC 站的位置合不合理？有没有人站在墙里、飘在半空、挡住主体？
- 台词读起来像不像那个时代那个人说的话？有没有出戏的现代词？
- 必谈的人是不是真的推动了剧情？可谈可不谈的有没有变成噪音？
- 一屏之内信息量会不会太大？点完是不是知道下一步干嘛？

---

## 6. 细节微调

编辑器改不了的，直接改文件：

| 改什么 | 改哪 |
|---|---|
| 题目 | `src/data/<line>/events/<ID>/quiz.json` |
| 某张图不满意 | 重跑那一行 manifest（`--filter`），覆盖同名文件即可，json 不用动 |
| 主角姿态表 | `src/data/<line>Poses.js` |
| BGM | `public/assets/<line>/bgm/<stageId>.mp3`，文件名 = 时期 id 就自动生效 |
| 主页立绘 / 背景 / 名字图 | `public/assets/home/hp_*_<line>.*` + `characters.js` |

图片替换后记得压缩 —— 主页那批原图 15MB 压到 1.9MB，首屏差别很大。
原图存 `assets_src/`（已 gitignore），`public/` 里只放压缩版。

---

## 7. 加一种新交互

现有 13 种都不合适时才做，顺序是：

1. **先想清楚玩法**：玩家看到什么、能点什么、什么条件算过、过不去怎么办。
2. **写成 phase 的字段**：这个玩法需要 json 里存哪些字段？先把一份示例 JSON 写出来。
3. **让 Claude 在 `ScenePlayer.jsx` 里加一个 `if (currentPhase.type === "xxx")` 分支**，
   并在 `SceneEditor.jsx` 的类型下拉里加上对应的编辑面板。
4. 把它做成模板放进模板库，下一条线直接复用。

**不要为一个事件写一次性代码** —— 每种交互都要能被下一个人物线复用。

---

## 8. 部署

```bash
npm run build          # 产出 dist/
npm run preview        # 本地验一遍构建产物
```

`main` 分支 push 后 GitHub Actions 自动构建部署（`.github/workflows/deploy.yml`）。
国内加速走 CloudBase 静态托管，步骤见 `docs/DEPLOYMENT.md`。

**上线前必查**：`vite.config.js` 的 `base` 是 `"./"`；图片总体积；三条线各走一遍无 404。

---

## 附录 A · 目录结构（现行）

```
Chinese_history_game/
├── docs/                              # 全部文档
│   ├── PIPELINE.md                    # 本文（总流程）
│   ├── CHARACTER_TEMPLATE.md          # 剧本模版 + phase 类型详解
│   ├── SCREENPLAY.md / SCREENPLAY_DANTE.md
│   ├── ASSET_PROMPTS.md / ASSET_PROMPTS_DANTE.md
│   ├── NEXT_STEPS_PROMPTS.md          # 编辑器 / 地图页待办
│   ├── DEPLOYMENT.md · ADD_MUSIC.md · ACCOUNTS_SETUP.md
│   └── RAY_CHECKLIST.md               # 交付清单（简版）
│
├── scripts/                           # 资产生成
│   ├── COMFYUI_SETUP.md
│   ├── comfy_workflow.json
│   ├── run_comfyui_batch.py           # 批量生成
│   ├── remove_bg.py                   # 抠透明底
│   └── assets_manifest[_<line>].csv   # 每条线一份
│
├── src/
│   ├── App.jsx                        # 顶层：选人 / 游戏 / 编辑器路由
│   ├── components/
│   │   ├── CharacterSelect.jsx        # 主页（视觉风格基准）
│   │   ├── GameMap.jsx · Timeline.jsx # 地图页
│   │   ├── ScenePlayer.jsx            # 13 种交互的播放器
│   │   ├── SceneEditor.jsx            # 场景编辑器
│   │   ├── TimelineEditor.jsx         # 时间线编辑器
│   │   └── EventPanel · QuizPanel · DialogueBox · ScoreBar · …
│   ├── data/
│   │   ├── characters.js              # 人物花名册（新增人物只改这里；含地图 mapTheme）
│   │   ├── phaseTemplates.js          # 编辑器「插入交互模板」的 13 种模板
│   │   ├── <line>Poses.js             # 主角姿态表
│   │   └── <line>/
│   │       ├── timeline.json
│   │       └── events/<事件ID>/{event.json, quiz.json}
│   ├── styles/theme.js                # 全局视觉 token（纸色/文字色阶/金线/字距/halo()/scrim()）
│   └── utils/                         # asset.js（资源路径）· usePrefersReducedMotion.js
│
├── public/assets/
│   ├── home/                          # 主页素材 hp_{title,background,portrait,name}_*
│   ├── shared/{items,bgm}/            # 跨线共用
│   └── <line>/{hero,npcs,props,maps,bgm,events}/
│
├── assets_src/                        # 原图存档（gitignore，不入库）
├── .editor-backups/                   # 编辑器写盘前的自动备份（gitignore，每文件留 20 份）
└── vite.config.js                     # 含编辑器的 dev 保存中间件（按故事线落盘 + 备份 + 校验）
```

**路径前缀规则**：json 里写 `/assets/...`，**不要写 `/public/assets/...`**。
`public/` 是 Vite 的服务根目录，会被自动剥掉。

---

## 附录 B · 三个 JSON 速查

**timeline.json**
```jsonc
{
  "character": {
    "id": "dante", "name": "但丁", "title": "至高诗人",
    "years": "1265—1321", "dynasty": "…", "description": "…",
    "portrait": "/assets/dante/hero/portrait.png",
    "generalMap": "/assets/dante/maps/dante_general_map.png",
    "mapRatio": 1.7778                       // 地图宽高比
  },
  "stages": [{
    "id": "firenze", "period": "旧佛罗伦萨", "yearStart": 1265, "yearEnd": 1295,
    "color": "#A93226", "summary": "…",
    "events": [{
      "id": "1265_firenze", "year": 1265, "name": "佛罗伦萨之子",
      "state": "起点·被祝福的城",              // 人物当期状态，显示在时间线上
      "summary": "…",
      "location": { "name": "佛罗伦萨", "mapX": 38, "mapY": 38 },  // 百分比
      "hasScene": true, "hasQuiz": true
    }]
  }]
}
```

**event.json**
```jsonc
{
  "id": "1265_firenze", "title": "佛罗伦萨之子", "year": "1265",
  "type": "interactive",
  "phases": [{
    "id": "lectern_intro",
    "type": "explore",                        // 13 种之一
    "background": "/assets/dante/events/1265_firenze/backgrounds/lectern_1373.png",
    "title": "1373 · 后世讲坛",
    "narrative": "…",                          // 屏幕左上角的叙述
    "instruction": "点击讲坛上的薄伽丘，听他开讲。",  // 右上角的任务提示
    "npcs": [{
      "id": "boccaccio", "name": "薄伽丘",
      "portrait": "/assets/dante/npcs/boccaccio.png",
      "position": { "x": 50, "y": 66 },        // 百分比，编辑器拖出来的
      "scale": 1.8,
      "dialogues": [{ "speaker": "boccaccio", "speakerName": "薄伽丘", "text": "…" }]
    }],
    "requiredTalks": 1,                        // 谈够几个才能继续
    "nextPhase": "battistero"                  // 省略 = 按顺序下一个
  }]
}
```
不同 `type` 各有专属字段（`exam` 的 `questions`、`forced_choice` 的 `options`、
`map_travel` 的 `waypoints`、`comic_reveal` 的 `panels`…），
照抄现有事件里同类型的那一份最省事。

**quiz.json**
```jsonc
{ "quizzes": [
  { "type": "choice", "question": "…", "options": ["…","…","…","…"],
    "answer": 1, "explanation": "…" },                    // answer 是下标，从 0 开始
  { "type": "poem_fill", "question": "…___…", "answer": "强", "explanation": "…" }
]}
```

---

## 附录 C · 命名约定

| 类型 | 规则 | 示例 |
|---|---|---|
| line id | 英文小写 | `dufu` `dante` `rumi` |
| 事件 ID | `年份_英文或拼音简称` | `747_exam` `1265_firenze` |
| 事件目录 | 与事件 ID 完全一致 | `events/1265_firenze/` |
| 背景图 | 描述性英文 | `exam_hall.png` `lectern_1373.png` |
| NPC 图 | 角色名（可加限定） | `libai.png` `beatrice_young.png` |
| 主角姿态 | `<时期>/<姿态>.png` | `exile/writing.png` |
| 路线图 | `route_<年份>_<简称>.png` | `route_759_qinzhou.png` |
| BGM | 文件名 = stage id | `firenze.mp3` |
| 主页素材 | `hp_<用途>_<line>.<ext>` | `hp_portrait_rumi.png` |

---

## 附录 D · 新人物上线检查清单

- [ ] `characters.js` 里 `locked: false`，主页三张图都在（背景 / 立绘 / 名字），`scrimBoost` 调过
- [ ] `timeline.json` 每个事件的 `mapX/mapY` 在地图上位置正确（编辑器拖过）
- [ ] 每个 `hasScene: true` 的事件都有 `event.json` 且能从头走到尾
- [ ] 每个 `hasQuiz: true` 的事件都有 `quiz.json`，答案下标对得上
- [ ] 每个时期有 BGM，文件名 = stage id
- [ ] 全流程无 404（开控制台走一遍）
- [ ] 走完最后一个事件能触发通关 + 成就 + `completionLine`
- [ ] `npm run build` 通过，`npm run preview` 再走一遍
- [ ] 图片总体积合理，原图在 `assets_src/` 而不在 `public/`

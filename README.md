# 历史长河 — 互动历史教育游戏

通过游戏方式学习中国历史人物的生平故事。选择不同角色，沿着时间轴探索他们走过的地点，体验视觉小说式对话，阅读历史叙事与经典诗篇，并通过问答挑战检验所学。

## 环境要求

- [Node.js](https://nodejs.org/) >= 18（推荐 20+）
- npm（随 Node.js 一起安装）
- Git

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/Ivyyyy24381/Chinese_history_game.git
cd Chinese_history_game

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:5173` 即可开始游戏。

打开 `http://localhost:5173/?editor=true` 进入场景编辑器。

构建生产版本：

```bash
npm run build
```

构建产物在 `dist/` 目录下，可以直接部署到任意静态托管服务（GitHub Pages、Vercel、Netlify 等）。

## 项目结构

```
Chinese_history_game/
├── index.html
├── package.json
├── vite.config.js
│
├── public/assets/                    # 静态资源（Vite直接serve）
│   ├── maps/
│   │   └── tang_dynasty.png          # 唐朝疆域图
│   ├── characters/
│   │   ├── dufu/portrait.png         # 杜甫立绘
│   │   └── npcs/                     # NPC立绘（小商贩、难民等）
│   └── scenes/
│       ├── 01_youth/bg.png           # 各场景背景图
│       ├── 02_changan/bg.png
│       └── ...
│
├── src/
│   ├── main.jsx                      # React入口
│   ├── App.jsx                       # 游戏主逻辑 & 状态管理
│   │
│   ├── components/
│   │   ├── CharacterSelect.jsx       # 角色选择页
│   │   ├── GameMap.jsx               # 真实唐朝地图 + 地点标记
│   │   ├── Timeline.jsx              # 底部时间轴
│   │   ├── ScenePlayer.jsx           # 互动场景引擎（对话、考试、选择等）
│   │   ├── SceneEditor.jsx           # 可视化场景编辑器
│   │   ├── EventPanel.jsx            # 历史叙事 + 诗词面板
│   │   ├── QuizPanel.jsx             # 问答系统
│   │   └── ScoreBar.jsx              # 顶部得分/进度条
│   │
│   ├── data/
│   │   └── dufu/
│   │       ├── timeline.json         # 时间轴总览 + 角色信息
│   │       ├── scenes/
│   │       │   ├── 01_youth.json     # 各阶段：叙事 + 诗词 + 对话
│   │       │   ├── 02_changan.json
│   │       │   ├── 03_anshi.json
│   │       │   ├── 04_chengdu.json
│   │       │   ├── 05_kuizhou.json
│   │       │   └── 06_final.json
│   │       └── quizzes/
│   │           ├── 01_youth.json     # 各阶段问答题
│   │           └── ...
│   │
│   └── styles/
│       └── game.css
```

## 场景编辑器

浏览器打开 `http://localhost:5173/?editor=true` 进入可视化场景编辑器。

### 基本操作

1. 顶部工具栏选择**场景文件**（如 `02_changan`），再通过**阶段标签**切换不同阶段。
2. 点击 **+ 新增阶段** 创建新阶段，选择阶段类型（explore、exam、transition、forced_choice、poem_compose、map_travel 等）。
3. 点击 **💾 保存到文件** 将修改写回 JSON（需要开发服务器的文件保存中间件）。

### 左侧面板 — 资源 & 触发器

**人物资源**：点击立绘添加到场景中，拖拽调整位置。第一个选项 **「Aa 文字标签」** 可添加无立绘的纯文字交互点（适合榜单、墙壁题文等物品）。

**交互触发器**：
- **➡️ 继续按键** — 场景中显示的可点击按钮
- **🚪 场景入口** — 区域触发点

选中触发器后可在右侧编辑触发动作（进入下一阶段、跳转指定阶段、跳转其他场景、触发对话）和触发条件（始终可用、所有NPC交谈后等）。

**场景信息**：设置当前阶段的 ID、标题、叙述文字、玩家指示。

### 中间画布

拖拽人物和触发器调整位置，点击选中后在右侧编辑详情。

### 右侧面板 — 详情编辑

**阶段流程**：查看所有阶段的流程图，设置当前阶段的下一步跳转。

根据阶段类型显示不同的编辑内容：
- **explore（探索）**：NPC 对话编辑、缩放/翻转、是否为线索
- **exam（考试）**：考官立绘/名称、选择题和填空题（含干扰项）编辑
- **transition（过场）**：过场文字、公告/榜单、杜甫反应
- **forced_choice（选择）**：问题、选项、正确/错误反馈、结论叙述
- **poem_compose（诗歌创作）**：情境描述、正确诗句、候选词句

### 场景 JSON 结构

每个场景文件包含多个阶段（phases），阶段间通过 `nextPhase` 字段串联：

```json
{
  "id": "02_changan",
  "title": "制举科考",
  "year": "746",
  "type": "interactive",
  "phases": [
    {
      "id": "explore_outside",
      "type": "explore",
      "background": "/assets/scenes/02_changan/changan_street_2.png",
      "title": "长安街头",
      "narrative": "...",
      "instruction": "点击周围的人物与他们交谈",
      "npcs": [...],
      "requiredTalks": 3,
      "nextPhase": "exam_intro",
      "triggers": [...]
    },
    {
      "id": "exam",
      "type": "exam",
      "examiner": { "portrait": "...", "name": "李林甫" },
      "questions": [...]
    }
  ]
}
```

## 添加新内容

**添加新场景素材**：立绘放到 `public/assets/characters/npcs/`，背景图放到 `public/assets/scenes/XX_name/`。编辑器会自动发现新文件。

**用编辑器创建/修改场景**：打开 `?editor=true`，选择场景文件或新建阶段，拖放人物、编辑对话、设置触发器，保存即可。

**手动编辑 JSON**：修改 `src/data/dufu/scenes/XX_name.json`，NPC 对话格式：

```json
{
  "id": "merchant",
  "name": "小商贩",
  "portrait": "/assets/characters/npcs/merchant.png",
  "position": { "x": 30, "y": 60 },
  "dialogues": [
    { "speaker": "merchant", "speakerName": "小商贩", "text": "客官，来碗胡辣汤？" }
  ]
}
```

无立绘的文字交互点将 `portrait` 设为空字符串即可。

**添加新角色的完整故事线**：在 `src/data/` 下创建新文件夹（如 `libai/`），按照 `dufu/` 的结构创建 timeline.json 和 scenes。

## 技术栈

- **React 18** — UI 组件化
- **Vite** — 开发服务器与构建
- **JSON 数据驱动** — 内容与代码分离，方便扩展
- **场景编辑器** — 可视化编辑 NPC 位置、对话、触发器、考试题目

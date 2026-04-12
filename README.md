# 历史长河 — 互动历史教育游戏

通过游戏方式学习中国历史人物的生平故事。选择不同角色，沿着时间轴探索他们走过的地点，体验视觉小说式对话，阅读历史叙事与经典诗篇，并通过问答挑战检验所学。

## 快速开始

```bash
cd Chinese_history_game
npm install
npm run dev
```

浏览器打开 `http://localhost:5173` 即可开始游戏。

构建生产版本：`npm run build`

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
│   │   ├── DialogueBox.jsx           # 视觉小说式对话框（NEW）
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

## 添加新内容

**添加新场景素材**：把立绘丢到 `public/assets/characters/npcs/`，背景图丢到对应的 `public/assets/scenes/XX_name/`。

**添加/修改对话**：编辑 `src/data/dufu/scenes/XX_name.json`，在 `dialogues` 数组中添加对话对象：

```json
{
  "speaker": "merchant",
  "speakerName": "小商贩",
  "portrait": "/assets/characters/npcs/merchant.png",
  "text": "客官，来碗胡辣汤？",
  "position": "right"
}
```

**添加新角色的完整故事线**：在 `src/data/` 下创建新文件夹（如 `libai/`），按照 `dufu/` 的结构创建 timeline.json、scenes、quizzes。

## 技术栈

- **React 18** — UI 组件化
- **Vite** — 开发服务器与构建
- **JSON 数据驱动** — 内容与代码分离，方便扩展

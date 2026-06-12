# 项目目录结构

> 一句话规则：**每个事件 = 一个文件夹。** 角色复用就放共享区；只在一个事件出现就放该事件文件夹。

## 整体布局

```
Chinese_history_game/
├── README.md                       # 项目主页（在这里入手）
├── package.json / vite.config.js   # 构建配置
├── index.html / src/main.jsx       # 入口
│
├── docs/                           # 📚 所有文档
│   ├── FOLDER_STRUCTURE.md         # 你正在看的这一份
│   └── SCREENPLAY.md               # 全部场景的剧本（编剧产出）
│
├── src/
│   ├── App.jsx                     # 顶层组件
│   ├── main.jsx
│   ├── styles/game.css
│   ├── components/                 # React 组件
│   │   ├── App.jsx
│   │   ├── CharacterSelect.jsx
│   │   ├── DialogueBox.jsx
│   │   ├── EventPanel.jsx
│   │   ├── GameMap.jsx
│   │   ├── QuizPanel.jsx
│   │   ├── SceneEditor.jsx
│   │   ├── ScenePlayer.jsx
│   │   ├── ScoreBar.jsx
│   │   ├── Timeline.jsx
│   │   └── TimelineEditor.jsx
│   └── data/
│       └── dufu/
│           ├── timeline.json       # 主时间线：5 个时期 × 10 个事件
│           └── events/             # 每个事件一个文件夹
│               ├── README.md
│               ├── 736_qizhao/
│               │   ├── event.json  # 场景定义（phases、NPC、对话）
│               │   └── quiz.json   # 答题题目（可选）
│               ├── 744_libai/
│               ├── 747_exam/
│               ├── 751_lifu/
│               ├── 755_anshi/
│               ├── 757_zuoshiyi/
│               ├── 759_qinzhou/
│               ├── 760_caotang/
│               ├── 765_kuizhou/
│               └── 770_xiangjiang/
│
└── public/
    └── assets/                     # 🎨 所有美工资源
        ├── characters/             # 跨事件复用的角色
        │   ├── dufu/portrait.png   # 主角立绘（唯一）
        │   └── npcs/               # 反复出现的 NPC（李白、李林甫、张九龄…）
        ├── maps/
        │   ├── dufu_general_map.png   # 主地图（GameMap / TimelineEditor）
        │   ├── route_736_qizhao.png   # 736 齐赵壮游 路线图
        │   ├── route_757_fengxiang.png# 757 奔赴凤翔 路线图
        │   ├── route_759_qinzhou.png  # 759 秦州古道 路线图
        │   ├── route_765_sanxia.png   # 765 三峡行舟 路线图
        │   ├── route_770_xiangjiang.png # 770 湘江漂泊 路线图
        │   └── tang_dynasty.png       # 旧版大地图（备用）
        └── events/                 # 每个事件的专属美工
            ├── 736_qizhao/
            │   ├── backgrounds/    # 场景背景图
            │   └── npcs/           # 仅此事件出现的 NPC
            ├── 744_libai/
            │   ├── backgrounds/
            │   └── npcs/
            └── ... (一个事件一个文件夹)
```

## 决策三问 — 我的图放哪里？

1. **是主角杜甫？** → `public/assets/characters/dufu/`
2. **这个角色会出现在多个事件里？**（李白、李林甫等）→ `public/assets/characters/npcs/`
3. **只在一个事件里出现？** → `public/assets/events/<事件ID>/npcs/`

场景背景永远进 `public/assets/events/<事件ID>/backgrounds/`。

## 添加新事件的流程

1. 在 `src/data/dufu/timeline.json` 的某个 stage 下加一个 event 对象
2. `mkdir src/data/dufu/events/<事件ID>/` 写 `event.json` 和 `quiz.json`
3. `mkdir public/assets/events/<事件ID>/backgrounds/` 和 `npcs/` 放素材
4. event.json 里背景路径写 `/assets/events/<事件ID>/backgrounds/<filename>.png`

## 命名约定

| 类型 | 命名 | 示例 |
|---|---|---|
| 事件 ID | `YYYY_拼音简称` | `747_exam`, `770_xiangjiang` |
| 文件夹 | 与事件 ID 完全一致 | `events/747_exam/` |
| 背景图 | 描述性英文 | `changan_street.png`, `exam_hall.png` |
| NPC 图 | 角色拼音 | `libai.png`, `linfu.png` |

## 路径前缀

资源在 JSON 里以 `/assets/...` 开头（Vite 自动从 `public/` 服务）。**不要写 `/public/assets/...`。**

| JSON 里写 | 实际文件位置 |
|---|---|
| `/assets/characters/dufu/portrait.png` | `public/assets/characters/dufu/portrait.png` |
| `/assets/events/747_exam/backgrounds/exam_hall.png` | `public/assets/events/747_exam/backgrounds/exam_hall.png` |

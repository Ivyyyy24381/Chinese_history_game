# 杜甫事件 (Events)

每个事件 = 一个独立文件夹。文件夹名 = 年份 + 短描述（拼音），按年份排序。

## 当前事件列表

| 文件夹 | 年份 | 事件 | 状态 |
|---|---|---|---|
| `736_qizhao/` | 736 | 初次落第·壮游 | ✅ 已实现 |
| `744_libai/` | 744 | 遇李白 | ✅ 已实现 |
| `747_exam/` | 747 | 制举「野无遗贤」 | ✅ 已实现 |
| `751_lifu/` | 751 | 进三大礼赋 | ✅ 已实现 |
| `755_anshi/` | 755 | 安史之乱爆发 | ✅ 已实现 |
| `757_zuoshiyi/` | 757 | 任左拾遗 | ✅ 已实现 |
| `759_qinzhou/` | 759 | 弃官西行 | ✅ 已实现 |
| `760_caotang/` | 760 | 草堂时期 | ✅ 已实现 |
| `765_kuizhou/` | 765 | 漂泊夔州 | ✅ 已实现 |
| `770_xiangjiang/` | 770 | 病死舟中 | ✅ 已实现 |

## 添加新事件

1. **注册到时间线**: 编辑 `../timeline.json`，在合适的 stage 内的 `events` 数组添加：
   ```json
   {
     "id": "YYYY_shortname",
     "year": YYYY,
     "name": "事件名",
     "state": "杜甫此时心境",
     "summary": "一句话简介",
     "location": { "name": "地点", "mapX": 50, "mapY": 50 },
     "hasScene": true,
     "hasQuiz": true
   }
   ```

2. **创建事件文件夹**: `mkdir events/YYYY_shortname/`

3. **填入 `event.json`** — 交互场景定义。结构参考 `747_exam/event.json`：
   - `type: "interactive"` + `phases` 数组
   - 每个 phase 是 `explore` / `exam` / `transition` / `forced_choice` 之一
   - NPC 的 `portrait` 字段引用图片路径

4. **填入 `quiz.json`**（可选） — 多选 / 填空题。

5. **放素材**: 在 `public/assets/events/YYYY_shortname/` 下：
   - `backgrounds/` — 该事件专用的场景背景图
   - `npcs/` — 该事件专用的 NPC 立绘
   - 跨事件复用的角色（如李白、李林甫）放在 `public/assets/characters/npcs/`

## 文件夹布局示例

```
events/747_exam/
├── event.json    场景定义（phases、NPC、对话）
└── quiz.json     答题题目

public/assets/events/747_exam/
├── backgrounds/  场景背景
│   ├── changan_street.png
│   ├── exam_hall.png
│   └── ...
└── npcs/         事件专用 NPC 立绘
    ├── scholar_a.png
    └── ...
```

## 命名约定

- 事件 ID = 年份 + 下划线 + 拼音简称（如 `747_exam`、`770_xiangjiang`）
- 文件夹名 = 事件 ID
- 资源路径 = `/assets/events/<id>/backgrounds/<filename>.png` 或 `/assets/events/<id>/npcs/<filename>.png`

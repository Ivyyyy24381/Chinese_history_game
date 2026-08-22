# Asset 目录重构方案 · 一条故事线 = 一个游戏

> 动机：但丁线画风/人物与杜甫线完全不同，混在 `characters/npcs`、`props`、`maps` 里没法管理。
> 原则：**故事线（charId）作为 `public/assets/` 下的一级目录**，线内自包含；跨线共用的进 `shared/`。

## 目标结构

```
public/assets/
├── shared/                          # 跨线共用
│   ├── home_background.png          # 主界面背景
│   ├── 中国历史游.png / 李白.png / 杜甫.png / 苏轼.png   # 选人界面
│   ├── items/                       # 通用可交互小物件
│   └── bgm/                         # 主界面音乐（hitslab-china-*.mp3）
├── dufu/
│   ├── hero/<stage>/<pose>.png      # 原 characters/dufu/
│   ├── npcs/                        # 原 characters/npcs/ 中杜甫线角色
│   ├── events/<year>_<slug>/…       # 原 events/7xx_*
│   ├── maps/                        # dufu_general_map + route_7xx
│   ├── props/                       # 杜甫线道具
│   └── bgm/<stageId>.mp3            # youth/changan/anshi/chengdu/piaobo
└── dante/                           # 同构（hero/npcs/events/maps/props/bgm）
```

URL 规则从 `/assets/<类型>/<人物>` 变为 **`/assets/<charId>/<类型>`**；引擎里所有动态拼接都能拿到 charId（见下）。

## 执行方式

```bash
# 1. 预演（只打印，不动文件）——先看清单对不对
python scripts/migrate_assets_layout.py

# 2. 真跑（git mv 移动 + 全仓路径重写 + 断链扫描）
python scripts/migrate_assets_layout.py --apply

# 3. 手工完成脚本最后打印的 1 处 TODO（ScenePlayer npcPortraitPath，见下）

# 4. 验证
npm run dev   # 杜甫线从头玩一遍：立绘/背景/BGM/编辑器素材列表
python scripts/migrate_assets_layout.py --check   # 再跑一次断链扫描
git add -A && git commit
```

脚本做三件事：
1. **移动**：按上面的映射 `git mv` 全部资产文件（dry-run 先打印完整清单）。
2. **重写**：对 `src/**/*.{js,jsx}`、`src/data/**/*.json`、`scripts/*.csv`、`docs/*.md` 里
   出现的每一个**被移动文件**的旧路径（`/assets/...` 与 `public/assets/...` 两种写法）替换为新路径；
   另外替换 4 处已知的动态拼接/glob（下表）。
3. **校验**：扫描全仓字面 `/assets/` 引用，逐一检查文件存在；输出断链清单（0 断链才算完成）。

## 4 处动态代码（脚本自动改 3 处，1 处留 TODO）

| 位置 | 旧 | 新 | 处理 |
|---|---|---|---|
| `App.jsx` BGM | `` asset(`/assets/audio/bgm/${stageId}.mp3`) `` | `` asset(`/assets/${character?.id \|\| "dufu"}/bgm/${stageId}.mp3`) `` | 自动（`character` 在作用域内） |
| `CharacterSelect.jsx` | `` asset(`/assets/${char.name}.png`) `` | `` asset(`/assets/shared/${char.name}.png`) `` | 自动 |
| `SceneEditor.jsx` 3 个 glob | `"/public/assets/events/**"` 等 | `"/public/assets/*/events/**"` 等（characters→`*/{hero,npcs}`，props→`*/props`） | 自动 |
| `ScenePlayer.jsx` `npcPortraitPath` | `` `/assets/characters/npcs/${speakerId}.png` `` | 需要 charId：建议改成 `npcPortraitPath(speakerId, eventId)`，`const line = parseInt(eventId, 10) < 1000 ? "dufu" : "dante";` 再拼 `` `/assets/${line}/npcs/${speakerId}.png` `` | **TODO 手工**（调用点在组件内部，eventId 在作用域；脚本会打印所有调用行号） |

> `npcPortraitPath` 只是 NPC 未写 `portrait` 字段时的兜底约定；所有 event.json 显式路径已被步骤 2 覆盖，
> 所以就算这处暂时不改，只影响"省略 portrait 字段"的 NPC。

## 归属分类表（脚本内置，改这里要同步改脚本）

- **dante 共用 NPC（14）**：boccaccio, beatrice_young, beatrice_paradiso, cavalcanti, forese,
  boniface, corso_donati, henry_vii, cangrande_young, guido_novello, pietro_adult, antonia_nun,
  scribe, friar_messenger —— `characters/npcs/` 其余全部归 dufu
- **dante 道具（10）**：sentenza_scroll, amnistia_scroll, epistole_letters, aeneid_codex,
  spindle_wool, laurel_crown, florin_coin, mosaic_fragment, moldy_manuscript, lectern_codex
  —— `props/` 其余全部归 dufu
- **events**：目录名年份 < 1000 → dufu，≥ 1000 → dante
- **maps**：`dufu_*`/`route_7xx` → dufu；`dante_*`/`route_1xxx` → dante
- **bgm**：youth/changan/anshi/chengdu/piaobo → dufu；hitslab* + README → shared

## 后续约定（新故事线接入时）

1. 新线一律 `public/assets/<charId>/{hero,npcs,events,maps,props,bgm}`，不再往共享目录放东西。
2. `assets_manifest_<charId>.csv` 的 output_path 直接写新结构。
3. GameMap 目前硬编码杜甫地图（迁移后为 `/assets/dufu/maps/dufu_general_map.png`）——
   接入但丁线时应把地图路径挪进 timeline.json（如 `character.generalMap` 字段），编辑器同理。
4. `CHARACTER_TEMPLATE.md` / `events/README.md` 中的路径示例由本次脚本一并重写。

# 历史长河 · 下一步：编辑器 & 地图页

两段可直接粘进 Claude Code 的 prompt，附我读代码时发现的具体问题。

---

## ✅ 完成状态（2026-08-22）

| 项 | 状态 | 提交 |
|---|---|---|
| Prompt 1 · P0 三个数据 bug（闭包丢改动 / 存错线 / 无备份校验） | ✅ 已修 | `76038f1` |
| Prompt 1 · P1 交互模板库（13 种类型一键插入可运行占位） | ✅ 已做 | `f02e45b` |
| Prompt 1 · P3 未保存改动确认（关页/返回/切线/下钻） | ✅ 已做 | `ac99682` |
| Prompt 1 · P2 「本屏全部对话」平铺视图 | ✅ 已做 | `2592820` |
| Prompt 1 · P3 SceneEditor 按职责拆文件 | ⬜ 待做（行为零改动的纯拆分，单独排期） | |
| Prompt 2 · ⓪ theme.js token 抽取（主页像素级不变） | ✅ 已做 | `798a724` |
| Prompt 2 · ① 旅人与墨线路径（含足迹渐亮、倒走、reduced-motion） | ✅ 已做 | `29a9557` |
| Prompt 2 · ② 同时代地图符号（城塔/朱砂圈，三态） | ✅ 已做 | `91f9301` |
| Prompt 2 · ③ 面板与控件按主页手法重做 | ✅ 已做 | `9fbd94a` |
| Prompt 2 · ④ 未至之地的雾 | ✅ 已做 | `e8c3052` |
| Prompt 2 · ⑤ 时间轴瘦身（细带 + hover 展开） | ✅ 已做 | `b22176b` + `878143b` |
| Prompt 2 · ⑥ 每线一套 mapTheme | ✅ 已做 | `929ee31` |

**建议之后替换成手绘素材的清单**（目前为 SVG 手绘占位，均在代码里标注）：
- 但丁线城塔符号 / 杜甫线朱砂圈点（`GameMap.jsx` 的 `MapSymbol`）
- 「至」小印章（同上）
- 编辑器模板卡的线框示意 → 换成真实事件截图（`SceneEditor.jsx` 的 `TemplateSketch`）
- 可选：墨绘罗盘替代 ＋－⟲ 圆钮组、纸纹叠加

---

## 先说三个已确认的 bug（不修的话编辑器越用越乱）

**① 保存会丢掉当前正在编辑的那一屏 —— 最要命的一个**

`SceneEditor.jsx:814` 的 `saveToFile()`：

```js
saveCurrentPhaseToScene();          // 内部只是 setSceneData(...)，异步
await new Promise(r => setTimeout(r, 50));   // 等 50ms 没用
const content = JSON.stringify(sceneData);   // ← 闭包里的旧值
```

`sceneData` 是函数被调用那一刻捕获的常量，`setSceneData` 再怎么更新也不会改变它，
等多久都没用。结果就是：**你刚改完对话点保存，改的那一屏被写回旧内容。**
`exportFullScene()`（:449）同样的写法，同样的问题。

正确做法是让 `saveCurrentPhaseToScene()` 直接 return 拼好的对象，保存时用返回值，
不要经过 state。

**② 编辑但丁的场景，保存会写进杜甫的目录**

`SceneEditor.jsx:54` 已经算出了 `charId`，但 :55 组 `SCENE_FILES` 时只留了 label，
`saveToFile` POST 的 body 里只有 `{ eventId, content }`。而 `vite.config.js` 的
`/api/save-event` 写死：

```js
const dir = path.resolve('src/data/dufu/events', eventId);
```

`/api/save-timeline`、`/api/save-scene` 同样写死 dufu。`TimelineEditor.jsx:28,34`
也写死 `fetch('/src/data/dufu/timeline.json')`。

也就是说但丁线目前**根本没法用编辑器保存** —— 存下去会在 `data/dufu/events/1265_firenze/`
凭空长出一个文件。

**③ 没有任何防线**

无脏数据提示（切 phase / 关页面直接丢）、无备份、无写入前 JSON 校验、无撤销。
编辑器写的是源码目录里的文件，出错就得靠 git 回滚。

---

## Prompt 1 — 编辑器

> 这是一个 React + Vite 的历史教育游戏（历史长河），双故事线：`src/data/dufu/` 和 `src/data/dante/`，
> 后面还会加 `rumi`。编辑器在 `?editor=true`，入口 `App.jsx` 的 `EditorShell`，
> 由 `TimelineEditor.jsx` 和 `SceneEditor.jsx` 组成，通过 `vite.config.js` 里的
> dev-only 中间件把 JSON 写回源码目录。
>
> 编辑器的定位是**人工精修**：调对话文案、调人物位置、从已有的交互模板里挑一个套上去。
> 不是给玩家用的，是给我审阅和微调用的。现在数据通路有问题，先修通路再谈体验。
>
> **P0 · 修数据正确性（先做，做完单独提交）**
>
> 1. `SceneEditor.jsx` 的 `saveToFile()` 和 `exportFullScene()` 有闭包陈旧值 bug：
>    `saveCurrentPhaseToScene()` 只调 `setSceneData`，随后读到的 `sceneData` 仍是旧值，
>    `setTimeout(50)` 解决不了。把 `saveCurrentPhaseToScene()` 改成 **返回**拼好的 scene 对象
>    （可以同时 setState），保存/导出直接用返回值。
>    验证：改一句对话 → 保存 → 重新加载该事件 → 那句对话必须是新的。
>
> 2. 故事线在保存链路上丢失。`SCENE_FILES`（:52）算出的 `charId` 要带进选中态，
>    `saveToFile` 的 POST body 加 `line` 字段；`vite.config.js` 的
>    `/api/save-event`、`/api/save-timeline`、`/api/save-scene` 全部改成按 `line` 拼路径，
>    并对 `line` 做白名单校验（只允许 `src/data/` 下真实存在的目录，防路径穿越）。
>    `TimelineEditor.jsx` 写死的 `/src/data/dufu/timeline.json` 同样改成按当前故事线取。
>    编辑器顶部加一个明确的故事线切换器，并且**始终显示当前正在编辑哪条线的哪个文件的完整路径**。
>    验证：编辑但丁 1265_firenze 保存 → 文件必须落在 `src/data/dante/events/1265_firenze/event.json`，
>    且 `src/data/dufu/` 下不新增任何东西。
>
> 3. 写入前先 `JSON.parse` 自校验；写入前把原文件复制一份到
>    `.editor-backups/<line>/<eventId>/<timestamp>.json`（加进 .gitignore），保留最近 20 份。
>    保存成功后回显完整路径 + 字节数，不要只显示一个勾。
>
> **P1 · 交互模板库**
>
> `ScenePlayer.jsx` 已经支持 13 种 phase type：`explore` `exam` `transition` `forced_choice`
> `poem_compose` `map_travel` `dialogue_branch` `narration` `sliding_puzzle` `click_points`
> `comic_reveal` `escape_game` `minigame`。`SceneEditor` 的下拉框能选，但要从零填字段。
>
> 做一个「插入交互模板」面板：每种类型一张卡片，给出**一句话说明 + 一张现有事件的截图或缩略示意 +
> 一份填好占位内容的可用 JSON**（占位内容要能直接跑起来，不是空壳）。点一下就插入一个新 phase。
> 模板取材于现有数据里已经跑通的用法（比如 `map_travel` 参考 dufu 线，`comic_reveal` 参考但丁线）。
> 模板定义单独放 `src/data/phaseTemplates.js`，别塞进 SceneEditor。
>
> **P2 · 对话编辑体验**
>
> 对话是我改得最多的东西。当前 NPC 对话编辑埋在右侧面板里，要点开 NPC 才看得到。
> 加一个「本屏全部对话」的列表视图：一屏之内所有 NPC 的所有对白按顺序平铺，可直接改、可拖动排序、
> 可看到总字数。改动实时反映到画布上对应 NPC 的高亮。
>
> **P3 · 收拾细节**
>
> `SceneEditor.jsx` 已经 2565 行了，按职责拆分（画布 / 素材面板 / phase 属性面板 / 对话面板 /
> 保存逻辑），但**不要顺手重构行为** —— 拆完功能必须完全一致。
> 切换 phase 或关闭页面时若有未保存改动，弹确认。
>
> **要求**：每个 P 单独提交，提交信息说清改了什么、怎么验证的。每步做完先自己跑一遍
> `npm run dev` 加 `?editor=true` 实际点一遍，确认没坏再进入下一步。不要一次性大改。

---

## Prompt 2 — 地图页视觉

先说我看到的问题。你那张地图本身（15 世纪泥金手抄本风）非常好，但压在上面的 UI 是**默认的网页控件**：
灰色水滴 pin、白底红标题的浮动卡片、方形 `＋ － ⟲` 按钮、底部一条纯色滑轨、左上角裸文字。
两种语言打架，地图越好看，UI 越显得廉价。

而且「在地图上走」这个想法目前**并没有真的发生** —— 你是在时间线上跳，人物没有在地图上移动过。

方向是：**把主页那套语言原样搬过来**（你说主页是最喜欢的风格），并且让旅程真的走起来。

### 主页那套语言到底是什么

`CharacterSelect.jsx` 里已经跑通的几条，是这个产品的视觉基准，值得先抽成共享 token：

| | |
|---|---|
| 纸色 | `rgba(250,246,238,x)` —— 蒙版、暖光、按钮底全用它，只改 alpha |
| 文字 | 主 `#3A2E20` / 次 `#7A6A50` / 弱 `#9A8B72` / 金棕 `#8A6D3B` |
| 金线 | `#C9A86A`（实）·`#C9B08A`（虚/次级）·`#D8CDB8`（禁用） |
| 字体 | `'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', serif` |
| 字距 | 按层级 1 / 2 / 3 / 6 / 8，标题和按钮字距要拉开 |
| 按钮 | `rgba(252,248,238,0.92)` + `1px solid #C9A86A` + `borderRadius 24` + 暖投影 |
| 美术落影 | `drop-shadow(0 10px 22px rgba(70,55,35,0.22))`，选中时加深到 `0 18px 34px …0.34` |
| 过渡 | 元素 `320ms cubic-bezier(.2,.7,.3,1)`，背景交叉淡入 `700ms ease` |

最关键的是**手法**，不是色值：

1. **不给内容套框。** 主页三张立绘没有卡片边框，画本身就是卡片。文字靠一圈
   `radial-gradient` 暖光从背景里"托"出来（`styles.plate` / `styles.header`），
   收得比内边距紧，让光在碰到方角前就淡尽，所以完全看不出方块。
2. **蒙版分层。** 顶带护标题、底带护按钮和成就栏、中间 radial 护主体（`styles.scrim`）。
3. **底图密就减淡。** `characters.js` 的 `scrimBoost`，跟着底图一起淡入淡出。

地图页要沿用的就是这三条 —— 不要引入新的边框卡片、不要引入新的强调色。

> 这是历史长河的游戏主页面 `src/components/GameMap.jsx`（445 行）+ `src/components/Timeline.jsx`（351 行）。
> 地图底图是各故事线自己的古地图（但丁线是 15 世纪泥金手抄本世界地图，杜甫线是青绿山水舆图，
> 之后还有鲁米线的波斯细密画）。事件坐标存在 `timeline.json` 的 `event.location.mapX/mapY`（百分比）。
>
> 现在的问题：地图美术很讲究，但压在上面的 UI 是默认网页控件（灰色 pin、白底卡片、方形缩放按钮、
> 纯色时间轴），风格完全打架。而且「在地图上旅行」这个核心概念没有被表达出来 ——
> 玩家是在时间线上跳，人物从来没有在地图上移动过。
>
> 目标：**把主页（`CharacterSelect.jsx`）已经跑通的视觉语言延续到地图页，并让旅程真的走起来。**
> 主页是这个产品认可的风格基准，地图页不要另起一套。按下面顺序做，每步单独提交。
>
> **⓪ 先抽 token（先做，单独提交，不改任何观感）**
> 把 `CharacterSelect.jsx` 里的设计常量抽到 `src/styles/theme.js`：
> 纸色 `rgba(250,246,238,x)`、文字色阶（主 `#3A2E20` / 次 `#7A6A50` / 弱 `#9A8B72` /
> 金棕 `#8A6D3B`）、金线三级（`#C9A86A` / `#C9B08A` / `#D8CDB8`）、字体栈、
> 字距梯度、按钮样式、美术落影、过渡曲线。再导出两个工具函数：
> `halo(opts)` 生成主页那种「收得比内边距紧、碰不到方角」的 radial 暖光背景，
> `scrim(opts)` 生成顶带 + 底带 + 中央 radial 的三层蒙版。
> `CharacterSelect.jsx` 改成消费这些 token，**渲染结果必须像素级不变**（截图比对确认）。
> 然后 GameMap / Timeline 全部只用这套 token，不许出现新的硬编码颜色。
>
> 三条必须继承的手法：
> - **不给内容套框**：地图上的信息不用带边框的卡片，用 `halo()` 把文字从底图里托出来
> - **蒙版分层**：顶带护人物信息条、底带护时间轴、需要时中央 radial 护事件面板
> - **底图密就减淡**：沿用 `scrimBoost` 的思路，每张古地图自带一个减淡系数
>
> **① 旅人与墨线路径（视觉上最出效果的一步）**
> 主角的小 token 站在当前事件的位置上。年份推进时，token 沿着一条手绘感的墨线路径
> 从上一个地点走到下一个，配一串渐次点亮的虚线足迹，走完落定。已走过的路段留成实墨线，
> 未来的路段是极淡的铅笔稿。路径用 SVG 画在地图坐标系里（跟随 pan/zoom 变换），
> 用二次贝塞尔而不是直线，让它像手绘的。
>
> **② 图钉换成同时代的地图符号**
> 别用水滴 pin。用这张地图自己的语汇：但丁线用小小的红顶城塔剪影（和底图上的城市符号同族），
> 杜甫线用朱砂圈点或小舟。三态要一眼分得清：**已至**（实墨 + 一枚小印章）、
> **当前**（微微呼吸的高亮 + 更重的落影）、**未至**（淡铅笔稿）。
>
> **③ 面板与控件按主页的手法重做**
> 现在那张白底红标题的事件卡片，换成主页名牌的做法：**去掉边框和实底**，
> 用 `halo()` 的暖光把标题/年份/简介从地图上托出来。
> 「探索此事件」那颗实心红按钮，换成主页「开始 · 走进但丁的一生」那种
> 半透明纸底 + 金线描边 + 圆角 24 的胶囊按钮（红色留给真正的强调，不要大面积铺）。
> `＋ － ⟲` 三个方块也换成同款小胶囊，或者合成一个墨绘罗盘。
> 左上角的人物信息条用主页名牌的排版：书法名字图 + 一行可读中文名 + 次级信息，
> 同样只靠暖光托底。
>
> **④ 未至之地的雾**
> 还没走到的区域盖一层纸色雾（就用 `rgba(250,246,238,x)`，轻微降饱和），走到就化开。
> 让地图本身变成进度条。雾要淡 —— 是氛围不是遮挡，别糊掉底图的美。
>
> **⑤ 时间轴瘦身**
> 底部时间轴现在吃掉约 15% 屏幕高度，而且是一条纯色滑轨。
> 收成一条细带（hover / focus 展开），底用 `scrim()` 的底带而不是实色，
> 刻度用墨点，各时期用极淡的色带区分，文字用主页那套色阶和字距。
>
> **⑥ 每条故事线一套 mapTheme**
> 墨色、印章色、pin 样式、底图减淡系数，抽成每条线一套 token，
> 放 `src/data/characters.js`（和 `scrimBoost` 放一起）或 `timeline.json` 的 `character.mapTheme`。
> 杜甫=青绿山水，但丁=泥金手抄本，鲁米=波斯细密画，**共用同一个 GameMap 组件**，
> 不要为每条线复制组件。注意这套 theme 是在 ⓪ 的全局 token 之上做偏移，不是另一套体系。
>
> **约束**
> - **风格基准是 `CharacterSelect.jsx`**。改完把地图页和主页并排看，两张图必须像同一个产品的两页。
>   不许引入新的强调色、新的边框卡片、新的字体、新的圆角规格。
> - 不改 `timeline.json` 的数据结构（除了新增 `mapTheme`），事件坐标仍是 mapX/mapY 百分比
> - pan/zoom、双击复位、事件点击这些现有交互不能坏
> - 动效要能被 `prefers-reduced-motion` 关掉
> - 1280×800 到 1920×1200 都要正常，不要出现横向滚动
> - 每步做完截图自查，确认比改之前好看再提交；每步单独提交
>
> 素材上如果需要新的美术（罗盘、印章、城塔剪影、纸纹），先用 SVG 手绘一版能跑的，
> 并在提交信息里列出「建议之后替换成手绘素材」的清单。

---

## 顺序建议

先做 Prompt 1 的 P0（半小时的事，但现在每次保存都在丢数据），再做地图页 ①②③，
之后回头做编辑器的模板库。地图页的 ①「旅人走路」是最能立刻拉高质感的一步。

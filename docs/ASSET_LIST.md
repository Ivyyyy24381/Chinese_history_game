# 需要生成的素材 —— 精简到最少

> 原则：**能用公版就不生成，能用代码就不用图。**
> 全线引用素材 97 个，其中 83 个是原有真美术件，**不用动**。
> 这次会话我用 PIL 画了 14 个占位图，下面把它们分成三类。

## 一、Ivy 需要生成的：**只有 3 个**

要和现有立绘/背景的画风一致，只能生成：

| 文件 | 是什么 | 提示词方向 |
|---|---|---|
| `dante/npcs/brunetto.webp` | 布鲁内托·拉蒂尼**活着的时候**：十三世纪佛罗伦萨公证人/学者，六十来岁，长袍，学者方帽 | 透明底半身立绘，比照现有 `npcs/boccaccio.webp` 的画风与打光 |
| `dante/events/1292_brunetto/backgrounds/brunetto_study.webp` | 老师的书房：烛光、两侧书架、讲桌上摊开的抄本 | 1920×1080 横构图，比照 `1308_inferno/backgrounds/study_candle.webp` |
| `dante/events/1302_esilio/backgrounds/porta_san_piero.webp` | 佛罗伦萨圣彼得门内侧的街，正对城门洞，门外有光 | 1920×1080，中央对称，门洞在正中（代码会在门洞两侧合上两扇门） |

**就这三个。** 其余全部由下面两类解决。

## 二、公版图库能解决的（不用生成，下载即可）

这几张多雷 1861–68 年《神曲》铜版画**画的就是这些场景**，公有领域：

| 现有占位 | 换成 | 出处 |
|---|---|---|
| `comedy/backgrounds/inferno_gate.webp` | 地狱之门 | 多雷《地狱》第三歌 |
| `comedy/backgrounds/inferno_xv_sand.webp` | 火雨落在沙上、堤岸上的相遇 | 多雷《地狱》第十五歌 —— **画的正是但丁遇见布鲁内托那一幕** |
| `comedy/souls/brunetto_shade.webp` | 布鲁内托的亡魂 | 同上，把人物抠出来 |
| `comedy/backgrounds/moral_geography.webp` | 三界／地狱漏斗剖面 | 波提切利《地狱图》或米凯利诺 1465 年主教座堂壁画 |

下载：Wikimedia Commons 或 archive.org 搜 "Doré Divine Comedy"，全 135 幅。
放进 `public/assets/dante/dore/`，再按上表覆盖同名文件（尺寸对齐 1920×1080）。
云端容器访问不到这两个站，**本机下载**。

## 三、代码解决的（Claude Code 做，不用图）

| 现有占位 | 怎么办 |
|---|---|
| `props/winter_cloak.webp` | **已经不用了** —— 出城那关的冬衣走的是 `icons.js` 里的 `cloak` 图标。文件可删 |
| `comedy/manuscript.webp` | 手稿改成 CSS 羊皮纸（组件里已有缺图降级），或用公版抄本书页 |
| `1302_esilio/choices/{hold,coup,mediate}.webp` | 三张 640×400 示意图 → 改成内联 SVG（城门关/城门开火光/两队人对峙），可随主题变色 |
| `1315_amnistia/choices/{home,exile}.webp` | 两扇门 → 左边直接复用 `porta_san_piero`（生成好之后），右边用 SVG 山路 |

---

## 顺带：图标不用生成

`src/data/icons.js` 收的是 game-icons.net 的 SVG path（CC BY 3.0，署名见 `CREDITS.md`）。
一个图标约 1KB，随 CSS 改色改大小，不落文件不走 CDN。要新图标照那个文件顶部的注释取。

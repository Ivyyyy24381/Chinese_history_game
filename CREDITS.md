# 素材署名

## 图标
`src/data/icons.js` 里的 SVG path 来自 **[game-icons.net](https://game-icons.net)**，
授权 **CC BY 3.0**，作者：Lorc、Delapouite、Skoll、DarkZaitzev 等。
按 CC BY 要求，游戏内需可见署名（建议放主页「关于」或人物回顾页页脚）：

> 部分图标来自 game-icons.net（Lorc / Delapouite / Skoll 等），CC BY 3.0

## 可直接取用的公版画作（尚未接入，备查）
但丁题材有极大的公有领域图库，**不需要自己生成**：

| 来源 | 内容 | 授权 |
|---|---|---|
| 古斯塔夫·多雷 1861–68 年《神曲》插图 | 木口木刻（不是铜版画）。《地狱》1861 年初版约 76 幅，《炼狱》《天堂》1868 年，三部合计 135 幅 | 公版（作者 1883 年去世） |
| 波提切利《神曲》素描 | 现存 92 幅，线描，风格极干净 | 公版 |
| 大英图书馆 Yates Thompson 36 号抄本 | 15 世纪彩绘《神曲》全本 | 公版 |
| 多梅尼科·迪·米凯利诺 1465 年主教座堂壁画 | 但丁与他的三界，最著名的那张 | 公版 |

多雷那套最适合本项目：黑白版画，跟现有手绘风不冲突，一次下载全部到
`public/assets/dante/dore/`，零生成成本。Wikimedia 与 archive.org 都有全集
（云端容器访问不到这两个站，需在本机下载）。

## 已接入的公版画作

游戏内逐张显示墙签（右下角的 ⓘ），登记表在 `src/data/artworks.json`，
「关于 / 致谢」页在主页右下角。元数据抄自 Wikimedia Commons 文件页。

| 用在哪 | 作品 | 作者 | 年份 | 收藏 |
|---|---|---|---|---|
| `comedy/backgrounds/moral_geography.webp` | 地狱图（La mappa dell'Inferno） | 桑德罗·波提切利（1445–1510） | 约 1480–1490 | 梵蒂冈宗座图书馆，Reg. lat. 1896 pt. A |
| `comedy/backgrounds/selva_canto1.webp` | 《地狱》第一歌 · 幽暗森林 | 古斯塔夫·多雷（1832–1883） | 1861 年初版 | —（书籍插图） |
| `comedy/backgrounds/inferno_gate.webp` | 《地狱》第三歌 · 地狱之门 | 古斯塔夫·多雷 | 1861 年初版 | — |
| `comedy/backgrounds/inferno_xv_sand.webp` | 《地狱》第十五歌 · 布鲁内托 | 古斯塔夫·多雷 | 1861 年初版 | — |

三条查证时的坑，记下来免得下次重踩：
1. Commons 的多雷分类页写「1857」，但只有 1861 年 Hachette 初版能从第三方
   （康奈尔善本部）佐证。**《地狱》用 1861**；1868 是《炼狱》《天堂》那一卷，写这里是错的。
2. 多雷三张在 Commons 上都**没有**收藏机构字段——它们是书籍插图不是馆藏，所以
   `artworks.json` 里整个不写 `holder`，不猜。
3. 波提切利的《神曲》素描是**分藏两处**的：柏林铜版画陈列馆 85 张，梵蒂冈 7 张 8 幅，
   《地狱图》在**梵蒂冈**这一批里。别写成柏林。
4. `File:Gustave Dore Inferno1.jpg`（第一歌）的 Commons 作者字段填成了 Walter Crane，是错的，别用那个文件。

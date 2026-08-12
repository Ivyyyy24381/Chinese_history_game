# 美工生成指南 · ASSET_PROMPTS_DANTE

> 但丁线资产 prompt 清单，体例同杜甫线 `ASSET_PROMPTS.md`。
> 机器可读版：[`scripts/assets_manifest_dante.csv`](../scripts/assets_manifest_dante.csv)（83 行）。
>
> **统计**：主角分期立绘 12 张 · NPC 立绘 31 张 · 背景 26 张 · 地图 4 张 · 道具 10 张 = **共 83 张** + BGM 4 首。
> 建议同一个 style reference / seed 一批跑完，画风统一。
>
> 批量生成（脚本已支持多清单与但丁画风预设）：
>
> ```bash
> # 先跑 5 张主角立绘测脸（同脸一致性是本线最大风险，最先测！）
> python scripts/run_comfyui_batch.py --manifest scripts/assets_manifest_dante.csv --preset dante --only dante --filter youth
>
> # 风格定了 → 全量
> python scripts/run_comfyui_batch.py --manifest scripts/assets_manifest_dante.csv --preset dante --skip-existing
> ```

## 通用风格指南（每张图 prompt 前都粘这段）

> **统一画风：乔托湿壁画 × 泥金手抄本**——但丁同时代（13–14 世纪初意大利）的真实主流画风，
> 参考乔托《斯克罗维尼礼拜堂壁画》与中世纪泥金抄本（如后世 Yates Thompson 36 号《神曲》抄本）。
> 与杜甫线的"唐代工笔重彩"同一逻辑：用人物自己时代的画风画他的一生。

**画风（中文 prompt）**

```
中世纪晚期意大利画风，乔托湿壁画与泥金手抄本混合风格，蛋彩画质感，细线勾勒，平涂叠染，
群青朱红赭石金箔主色，13至14世纪意大利服饰建筑器物严格考证，半写实，庄重典雅，
无文字水印，无现代元素
```

**画风（英文 prompt — 适合 MJ / SDXL）**

```
Late medieval Italian painting, Giotto fresco and illuminated manuscript hybrid style,
egg tempera texture, fine outlines, flat layered washes, ultramarine vermilion ochre and
gold-leaf palette, historically accurate 13th-14th century Italian costumes and architecture,
semi-realistic, solemn and elegant, no modern elements, no text or watermark
```

**反面 prompt（negative，所有图都加）**

```
text, watermark, signature, modern, anachronism, chibi, anime style, harsh contrast,
oversaturation, blurry, low quality, deformed, extra fingers,
Chinese elements, Asian architecture, hanfu, kimono
```

（`--preset dante` 会自动追加中国元素类 negative，防止和杜甫线画风串味。）

**输出规格**（与杜甫线一致）

| 类别 | 规格 | 路径 |
|---|---|---|
| 背景 | 1920×1080 PNG | `public/assets/events/<事件>/backgrounds/` |
| NPC 立绘 | 768×1280 透明底 | `public/assets/characters/npcs/`（共用）或 `events/<事件>/npcs/`（专属） |
| 主角立绘 | 768×1280 透明底 | `public/assets/characters/dante/<stage>/<pose>.png` |
| 道具 | 1024×1024 透明底 | `public/assets/props/` |
| 地图 | 1920×1080 PNG | `public/assets/maps/` |

**重要约束**
- **主角同脸**：但丁 12 张立绘必须同一张脸。CSV 每条 dante 行已内嵌完整面部锚点（对照经典但丁像逐项写死）：

  ```
  消瘦长脸，subtle aquiline nose，眉弓突出，眼窝深陷，目光沉郁，双颊微陷，颧骨高，
  下颌方长，面部无须 clean-shaven，白色亚麻内帽 coif 贴头包裹双颊沿下颌系带，
  外罩红色尖顶连颈头巾帽 white linen coif under red cappuccio hood
  ```

  **鼻子铁律（两次踩坑总结）**：
  1. **只提一次，轻描淡写**——`subtle aquiline nose` 三个词就够。prompt 里每多提一次 nose/鼻
     （哪怕是"正常大小""别太长"这种限定语），模型都当成加权，鼻子就多长一截，最终长成鸟嘴。
  2. **别用 negative 管鼻子**——Turbo/schnell 类模型 CFG=1 时 negative 整个被忽略（道具那节
     的注释就是同一个坑），写了等于没写还制造错觉。
  3. 辨识度不靠文字堆——靠**整组特征**（长脸+深眼窝+高颧骨+方长下颌+白coif+红帽）加
     **face reference**：第一批挑一张脸最像的，IPAdapter 喂进去跑全组，鼻子自然稳定。
  4. 单张不满意优先**换 seed 重抽**（`--seed 777 --filter <名字>`），不要改文字加码。

  armored（戴锁子甲头巾）与 dying（病榻只留白内帽）两张不戴红帽，锚点已相应调整。
- 背景里不画可交互 NPC（立绘独立放置）。
- 贝雅特丽切两张立绘（少女白衣 / 天堂华服）也必须同脸。

---

## 一、主角但丁 · 分期立绘（12 张，type=`dante`）

> 面部锚点（每条已含，全文见上方"重要约束"）：`消瘦长脸 + subtle aquiline nose（只提这一次！）+ 深陷眼窝 + 高颧骨方长下颌 + 白coif内帽 + 红cappuccio帽`

| 文件 | 阶段·姿态 | Prompt 要点（中） |
|---|---|---|
| `dante/portrait.png` | 选人头像 | 五十五岁桂冠红袍侧面半身，经典但丁像构图 |
| `dante/youth/standing.png` | 青年·站立 | 约二十岁，绯红长袍（lucco），清瘦挺拔，全身含双脚 |
| `dante/youth/gazing.png` | 青年·凝望 | 十八岁，桥头凝望姿，右手抚胸，神情震动 |
| `dante/youth/armored.png` | 青年·轻骑兵 | 二十四岁，链甲外罩红色轻骑兵战袍，持骑枪，坎帕尔迪诺 |
| `dante/citizen/robe.png` | 公民·执政官袍 | 三十五岁，深红官袍白色头巾，持卷轴，威仪初具 |
| `dante/citizen/signing.png` | 公民·签署 | 三十五岁，执羽笔低头签署，眉头紧锁，内心挣扎 |
| `dante/exile/cloak.png` | 流亡·行路 | 四十余岁，深褐旅行斗篷风尘仆仆，拄杖行路，面容清癯 |
| `dante/exile/writing.png` | 流亡·执笔 | 四十余岁，烛光下伏案执笔，眼中有火 |
| `dante/exile/bitter.png` | 流亡·冷峻 | 四十余岁，抱臂侧身，嘴角向下，衣袍半旧 |
| `dante/exile/refusing.png` | 流亡·拒信 | 五十岁，昂首挺立，一手按在信纸上，凛然不可犯 |
| `dante/old/laurel.png` | 晚年·桂冠 | 五十五岁，月桂冠深红长袍，手持书卷，侧面鹰钩鼻剪影感，经典像 |
| `dante/old/dying.png` | 晚年·病榻 | 五十六岁，病榻半卧，面容平静安详，手搭书稿 |

## 二、NPC 立绘（31 张，type=`npc`）

### 1. 框架与核心（共用 `characters/npcs/`，14 张）

| 文件 | 角色 | Prompt 要点（中） |
|---|---|---|
| `boccaccio.png` | 薄伽丘（讲述者） | 六十岁学者，体态圆润和蔼，深色学者袍软帽，手持摊开讲义，睿智幽默 |
| `beatrice_young.png` | 贝雅特丽切·少女 | 十八岁佛罗伦萨少女，白色长裙，颔首浅笑致意，圣洁温柔 |
| `beatrice_paradiso.png` | 贝雅特丽切·天堂 | 同一张脸成年，白纱绿斗篷火红长裙，橄榄枝冠冕，目光庄严（炼狱XXX考证配色） |
| `cavalcanti.png` | 圭多·卡瓦尔坎蒂 | 三十余岁贵族诗人，白衣银边，清高傲岸，眼神锐利忧郁 |
| `forese.png` | 福雷塞·多纳蒂 | 圆脸市民酒友，粗布外衣，举杯大笑 |
| `boniface.png` | 卜尼法斯八世 | 老年教皇，金色三重冠华丽披风，权杖，居高临下威压感 |
| `corso_donati.png` | 科尔索·多纳蒂 | 黑党首领，五十岁武人贵族，深红衣按剑，鹰视狼顾 |
| `henry_vii.png` | 亨利七世 | 皇帝，铁王冠银铠金披风，清瘦高贵，眼含疲惫的理想 |
| `cangrande_young.png` | 少年坎格兰德 | 斯卡拉家少年公子，猎装，腕上立猎鹰，明朗大方 |
| `guido_novello.png` | 圭多·诺韦洛 | 拉文纳领主，四十岁文雅，锦袍执书卷，执弟子礼的谦和 |
| `pietro_adult.png` | 彼得罗（子） | 三十岁文士，朴素长袍，眉目肖父而柔和，忧郁 |
| `antonia_nun.png` | 安东妮娅（女） | 年轻修女，本笃会黑袍白头巾，面容平静似有光 |
| `scribe.png` | 抄写员 | 中年抄写员，手指墨渍，捧信纸手微抖，惶恐 |
| `friar_messenger.png` | 送信修士 | 方济各会灰袍修士，束绳腰带，双手捧公函 |

### 2. 事件专属（`events/<id>/npcs/`，17 张）

| 事件 | 文件 | 角色 | Prompt 要点 |
|---|---|---|---|
| 1265_firenze | `father_alighieri.png` | 父亲 | 小贵族放贷人，四十岁，褐袍算袋，疲惫精明 |
| 1265_firenze | `veteran_montaperti.png` | 老兵 | 独臂老兵，旧皮甲，讲古神情 |
| 1265_firenze | `priest_baptistery.png` | 教士 | 老教士，黑袍，慈和 |
| 1265_firenze | `neighbor_woman.png` | 邻妇 | 中年市民妇人，头巾围裙，爱说闲话的热络 |
| 1265_firenze | `vendor_florence.png` | 商贩 | 布行商贩，展示呢绒，精干 |
| 1283_beatrice | `lady_companion.png` | 女伴 | 贝雅特丽切同行女伴，浅色长裙，微笑 |
| 1295_arte | `guild_clerk.png` | 行会书记 | 戴眼镜（水晶片）老书记，羽笔登记簿，一丝不苟 |
| 1295_arte | `bookseller.png` | 书商 | 抱一摞抄本的中年书商，热情 |
| 1295_arte | `apothecary.png` | 药剂师 | 药剂师围裙持药杵，好奇打量诗人 |
| 1300_priore | `fellow_prior.png` | 同僚执政官 | 同僚执政官，深红官袍，忧心忡忡递名单 |
| 1302_esilio | `papal_attendant.png` | 教皇侍从 | 紫衣侍从神甫，低声耳语状，眼神闪烁 |
| 1302_esilio | `white_refugee.png` | 白党难民 | 落魄贵族，锦衣破损烟熏，怀抱包袱，惊魂未定 |
| 1308_inferno | `steward_scala.png` | 管家 | 斯卡拉宫管家，锦袍钥匙串，皮笑肉不笑 |
| 1308_inferno | `jester_scala.png` | 弄臣 | 宫廷弄臣，杂色衣铃铛帽，讥诮坏笑 |
| 1308_inferno | `white_envoy.png` | 白党使者 | 流亡白党使者，风尘甲胄，激愤 |
| 1313_impero | `bologna_scholar.png` | 博洛尼亚学者 | 大学学者，蓝袍方帽，持《帝制论》抄本，辩论手势 |
| 1315_amnistia | `landlady_girl.png` | 房东女儿 | 十岁小姑娘，粗布裙，仰头天真发问 |

## 三、背景图（26 张，type=`bg`，按事件分组）

| 事件 | 文件 | 画面 |
|---|---|---|
| 1265_firenze | `lectern_1373.png` | 1373年教堂讲坛夜景，烛光，摊开的巨大抄本，一束光打在讲坛（全线复用） |
| 1265_firenze | `firenze_battistero.png` | 圣乔万尼八角洗礼堂前市集，晨光，人流摊贩，塔楼林立的旧佛罗伦萨 |
| 1265_firenze | `casa_alighieri.png` | 中世纪小贵族宅邸书房，羊皮纸抄本，木格窗透光 |
| 1265_firenze | `comic_cacciaguida.png` | 连环画长图4格：旧城墙钟声/纺锤主妇/十字军出征/婴儿受洗 |
| 1283_beatrice | `ponte_arno.png` | 阿诺河老桥晨光，薄雾，石桥拱洞倒影（圣三一桥） |
| 1283_beatrice | `campaldino_field.png` | 坎帕尔迪诺平原战场，尘土蔽日，长矛如林，旌旗，远山 |
| 1283_beatrice | `comic_beatrice_death.png` | 连环画3格：空桥头/白花送葬队列/伏案剪影 |
| 1295_arte | `arte_medici.png` | 医药行会大厅，药柜天平登记簿，彩窗光 |
| 1295_arte | `ponte_vecchio_dusk.png` | 老桥暮色，桥上店铺挑灯，河面金紫色 |
| 1300_priore | `roma_porta_giubileo.png` | 1300禧年罗马城门，朝圣人流如蚁分两列过桥，尘土与夕照 |
| 1300_priore | `san_pietro_old.png` | 老圣彼得堂前广场（君士坦丁巴西利卡，非现今穹顶！），香烟缭绕 |
| 1300_priore | `palazzo_priori.png` | 执政官厅内景，石砌高窗，长桌文书，烛台 |
| 1300_priore | `dark_forest.png` | 幽暗森林，扭曲巨木遮天，唯远处山顶一线晨光（1308复用） |
| 1300_priore | `comic_selva.png` | 连环画3格：烛下伏案/文书化藤蔓/森林中回首 |
| 1302_esilio | `papal_hall.png` | 教皇接见厅，金色马赛克半穹顶，红斑岩柱，威压构图 |
| 1302_esilio | `inn_snow_night.png` | 城外驿站雪夜，篝火，屋檐冰凌，远处佛罗伦萨城影 |
| 1308_inferno | `verona_scala_court.png` | 维罗纳斯卡拉宫廊庭，梯形雉堞，宴席远景，诗人坐末席视角 |
| 1308_inferno | `gate_of_hell.png` | 地狱之门，巨岩拱门暗刻铭文，门内深渊微光，压迫感 |
| 1308_inferno | `study_candle.png` | 客居斗室烛光书案，稿纸散落（1313书信 phase 复用） |
| 1313_impero | `milano_incoronazione.png` | 米兰圣安波罗修堂加冕，铁王冠高举，烛海旌旗 |
| 1313_impero | `buonconvento_camp.png` | 布翁孔文托军营灵帐，黑纱垂帐，蜡烛，甲士垂首剪影 |
| 1315_amnistia | `lodging_courtyard.png` | 客居小院清晨，葡萄架漏光，石井，南望群山 |
| 1321_ravenna | `ravenna_pineta.png` | 拉文纳海松林，笔直松干金色光柱，静谧如殿堂 |
| 1321_ravenna | `ravenna_mosaic.png` | 圣阿波利纳雷教堂金色马赛克内景，星空穹顶，烛光 |
| 1321_ravenna | `heaven_exam.png` | 天堂考试：纯白金光同心光环，三团光焰环绕中央（三使徒），抽象神圣 |
| 1321_ravenna | `comic_tredici_canti.png` | 连环画4格：梦中白衣父亲/手指墙壁/壁龛霉稿/终行手迹特写 |

## 四、地图（4 张，type=`bg`，`public/assets/maps/`）

| 文件 | 用途 | 画面 |
|---|---|---|
| `dante_general_map.png` | 但丁线总图 | 手绘中世纪风意大利全图（波特兰海图风），标佛罗伦萨/罗马/维罗纳/拉文纳等，留图钉空间 |
| `route_1300_giubileo.png` | 禧年朝圣路线 | 佛罗伦萨→罗马路线图，沿途城镇小图标 |
| `route_1302_ritorno.png` | 放逐归途 | 罗马→锡耶纳道路线，冬季色调 |
| `route_1313_enrico.png` | 亨利南征 | 阿尔卑斯→米兰→罗马→布翁孔文托行军路线，帝国鹰旗小图标 |

## 五、道具（10 张，type=`prop`，1024×1024 透明底）

| 文件 | 道具 | 要点 |
|---|---|---|
| `sentenza_scroll.png` | 1302判决书 | 展开羊皮纸卷，红蜡封印，拉丁文暗示（不出可读文字） |
| `amnistia_scroll.png` | 1315大赦令 | 官方卷轴配纸悔罪帽并置 |
| `epistole_letters.png` | 三封公开信 | 三封叠放的信件，火漆，鹅毛笔 |
| `aeneid_codex.png` | 维吉尔抄本 | 厚重皮面抄本半开，泥金首字母 |
| `spindle_wool.png` | 纺锤 | 旧木纺锤缠羊毛线 |
| `laurel_crown.png` | 桂冠 | 月桂枝编成的冠，几点金箔 |
| `florin_coin.png` | 弗罗林金币 | 佛罗伦萨百合纹金币一枚 |
| `mosaic_fragment.png` | 马赛克残片 | 金底蓝星马赛克局部残片 |
| `moldy_manuscript.png` | 霉湿手稿 | 一叠受潮发黄稿纸，边缘霉斑，字迹暗示 |
| `lectern_codex.png` | 讲坛讲义 | 摊开的大开本抄本，泥金装饰页 |

## 六、BGM（4 首，`audio/bgm/<stageId>.mp3`）

| stageId | 时期 | 风格一句话 |
|---|---|---|
| `firenze` | 旧佛罗伦萨 | 中世纪舞曲，鲁特琴+竖笛，明快温暖 |
| `comune` | 自由的公社 | 弦乐+手鼓渐紧，暗流涌动 |
| `esilio` | 流亡 | 独奏维奥尔琴，苍凉辽远，风声底噪 |
| `ravenna` | 拉文纳 | 格里高利圣咏+管风琴，金色安宁，尾句上行 |

---

## 生成顺序建议

1. **先跑主角 youth 组 3 张**（`--only dante --filter youth`）→ 定脸、定画风 reference
2. 主角全 12 张（同 seed + face ref）
3. 贝雅特丽切 2 张（同脸校验）→ 其余 NPC
4. 背景 → 地图 → 道具
5. 立绘批量抠图：`python scripts/remove_bg.py`（或 rembg 逐张）
6. 跑资产扫描确认 0 断链

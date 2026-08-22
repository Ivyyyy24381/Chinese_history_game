// 交互模板库 —— 场景编辑器「插入交互模板」面板的数据源。
//
// 每个模板：
//   type    phase 类型（与 ScenePlayer 支持的 13 种一一对应）
//   name    卡片标题
//   desc    一句话说明（玩家看到什么、要做什么）
//   ref     取材的现有事件（该用法已在游戏里跑通）
//   sketch  缩略示意的线框类型（SceneEditor 里画小 SVG 用）
//   make()  生成一个"填好占位内容、能直接跑起来"的 phase 对象——
//           字段结构照抄 ref 里的真实用法，文案是占位文案，改文字即可用。
//
// 注意：background 留空 = 沿用编辑器当前选中的背景；立绘留空 = 文字标签
// （ScenePlayer 对无立绘 NPC 有专门渲染，不会破图）。

const uid = () => Date.now().toString(36);

export const PHASE_TEMPLATES = [
  {
    type: "explore",
    name: "探索对话",
    desc: "场景里放若干可点击的 NPC/物品，逐个交谈后解锁「继续」。",
    ref: "dante · 1265_firenze「后世讲坛」",
    sketch: "npcs",
    make: () => ({
      id: "explore_" + uid(),
      type: "explore",
      background: "",
      title: "新探索场景",
      narrative: "（一句场景引子：交代时间地点与气氛。）",
      instruction: "点击场景中的人物交谈。",
      npcs: [
        {
          id: "npc_a",
          name: "示例人物",
          portrait: "",
          position: { x: 38, y: 62 },
          dialogues: [
            { speaker: "npc_a", speakerName: "示例人物", text: "（第一句对白。）" },
            { speaker: "npc_a", speakerName: "示例人物", text: "（第二句对白。）" },
          ],
        },
        {
          id: "npc_b",
          name: "示例物件",
          portrait: "",
          position: { x: 66, y: 58 },
          dialogues: [
            { speaker: "narrator", speakerName: "旁白", text: "（点击物件时的旁白说明。）" },
          ],
        },
      ],
      requiredTalks: 2,
      triggers: [
        {
          type: "continue",
          label: "继续 →",
          area: { x: 50, y: 22, radius: 8 },
          action: "next_phase",
          condition: "required_talked",
        },
      ],
    }),
  },
  {
    type: "exam",
    name: "考试问答",
    desc: "考官逐题提问，四选一 + 每题解析；答完进入下一阶段。",
    ref: "dante · 1295_arte「公民资格问答」",
    sketch: "quiz",
    make: () => ({
      id: "exam_" + uid(),
      type: "exam",
      background: "",
      title: "新考试",
      narrative: "（考试开场白：谁在考、考什么。）",
      examiner: { name: "考官", portrait: "" },
      questions: [
        {
          type: "choice",
          question: "（第一题题干？）",
          options: ["选项一", "选项二（正确）", "选项三", "选项四"],
          answer: 1,
          explanation: "（答完显示的史料解析。）",
        },
        {
          type: "choice",
          question: "（第二题题干？）",
          options: ["选项一（正确）", "选项二", "选项三", "选项四"],
          answer: 0,
          explanation: "（答完显示的史料解析。）",
        },
      ],
    }),
  },
  {
    type: "transition",
    name: "过场",
    desc: "整屏过场文字，可附一张「公告/诏书」卡与主角反应。",
    ref: "dante · 1265_firenze「后世回声」",
    sketch: "curtain",
    make: () => ({
      id: "transition_" + uid(),
      type: "transition",
      background: "",
      title: "新过场",
      narrative: "",
      transitionText: "（过场叙述文字，可用 \\n 分行。）",
      announcement: {
        title: "（公告标题）",
        text: "（公告正文——不需要公告就把 announcement 整块删掉。）",
        style: "imperial_decree",
      },
    }),
  },
  {
    type: "forced_choice",
    name: "抉择",
    desc: "一个必答的选择题，每个选项有人物回应，最后给结语。",
    ref: "dante · 1283_beatrice「《新生》的结尾」",
    sketch: "choice",
    make: () => ({
      id: "choice_" + uid(),
      type: "forced_choice",
      background: "",
      title: "新抉择",
      narrative: "（局面铺垫：他面前有两条路。）",
      question: "（你要怎么选？）",
      options: [
        {
          id: "opt_a",
          text: "（选项一）",
          correct: false,
          response: { speaker: "npc", speakerName: "旁人", text: "（选它之后的回应。）" },
        },
        {
          id: "opt_b",
          text: "（选项二——历史上他的选择）",
          correct: true,
          response: { speaker: "hero", speakerName: "主角", text: "（选它之后的回应。）" },
        },
      ],
      conclusion: { narrative: "（选择之后的结语：这个决定通向了什么。）" },
    }),
  },
  {
    type: "poem_compose",
    name: "补诗填字",
    desc: "诗句挖空，从候选词（含干扰项）里把词放回正确的空格。",
    ref: "dufu · 760_caotang「茅屋为秋风所破歌」",
    sketch: "poem",
    make: () => ({
      id: "poem_" + uid(),
      type: "poem_compose",
      background: "",
      title: "新补诗",
      narrative: "",
      poemContext: "（写诗前的情境：为什么此刻这首诗呼之欲出。）",
      puzzle: "第一行诗句___，\n第二行诗句___。",
      blanks: ["正确词一", "正确词二"],
      distractors: ["干扰词一", "干扰词二"],
      poemTitle: "（诗题）",
    }),
  },
  {
    type: "map_travel",
    name: "地图行旅",
    desc: "在路线图上按顺序点击途经站点，每站触发对话。",
    ref: "dante · 1300_priore「禧年朝圣」",
    sketch: "map",
    make: () => ({
      id: "travel_" + uid(),
      type: "map_travel",
      background: "",
      title: "新行旅",
      travelNarrative: "（这段路的总叙述：从哪里到哪里、为什么上路。）",
      instruction: "沿路线点击每一站。",
      requireAll: true,
      waypoints: [
        {
          id: "wp_start",
          name: "出发地",
          x: 20,
          y: 30,
          dialogues: [{ speaker: "hero", speakerName: "主角", text: "（出发时的独白。）" }],
        },
        {
          id: "wp_mid",
          name: "途中",
          x: 50,
          y: 52,
          dialogues: [{ speaker: "narrator", speakerName: "旁白", text: "（路上见闻。）" }],
        },
        {
          id: "wp_end",
          name: "目的地",
          x: 78,
          y: 68,
          isKey: true,
          dialogues: [{ speaker: "narrator", speakerName: "旁白", text: "（抵达时的场面。）" }],
        },
      ],
    }),
  },
  {
    type: "dialogue_branch",
    name: "对话分支",
    desc: "多轮对话树（当前玩家端为简版展示，编辑先行）。",
    ref: "（现有数据暂无用例，播放端为简版）",
    sketch: "branch",
    make: () => ({
      id: "branch_" + uid(),
      type: "dialogue_branch",
      background: "",
      title: "新对话分支",
      narrative: "（对话背景。）",
      branchCharacter: "对话对象",
      dialogueTree: [
        {
          speaker: "对话对象",
          text: "（对方的第一句话。）",
          choices: [{ text: "（回应一）" }, { text: "（回应二）" }],
        },
      ],
    }),
  },
  {
    type: "narration",
    name: "叙事演出",
    desc: "逐段展示「配图 + 说话人 + 文字」的叙事幻灯。",
    ref: "（现有数据暂无用例，播放端为简版）",
    sketch: "slides",
    make: () => ({
      id: "narration_" + uid(),
      type: "narration",
      background: "",
      title: "新叙事",
      narrative: "",
      narrationSlides: [
        { speaker: "旁白", text: "（第一段叙事。image 字段可选配图路径。）" },
        { speaker: "主角", text: "（第二段叙事。）" },
      ],
    }),
  },
  {
    type: "sliding_puzzle",
    name: "数字华容道",
    desc: "把打乱的 15 个字滑回原位，拼出一句 15 字的话（4×4）。",
    ref: "dante · 1308_inferno「锻造俗语」",
    sketch: "grid4",
    make: () => ({
      id: "puzzle_" + uid(),
      type: "sliding_puzzle",
      background: "",
      title: "新华容道",
      narrative: "（为什么要拼这句话。）",
      puzzles: [
        {
          label: "（这一局的标题）",
          // solution 必须恰好 15 个字（4×4 留一空格）
          solution: "白日依山尽黄河入海流欲穷千里目",
          timeoutSec: 300,
        },
      ],
    }),
  },
  {
    type: "click_points",
    name: "画中寻迹",
    desc: "在整幅画上点亮隐藏细节，每点一处出独白，集齐逐行显诗。",
    ref: "dante · 1308_inferno「地狱之门」",
    sketch: "spots",
    make: () => ({
      id: "clicks_" + uid(),
      type: "click_points",
      background: "",
      title: "新寻迹",
      narrative: "（这幅画面是什么。）",
      instruction: "点击画面中的细节。",
      unlockThreshold: 2,
      poemTitle: "（集齐后显示的诗题）",
      points: [
        {
          id: "pt_a",
          label: "细节一",
          position: { x: 30, y: 35 },
          size: 110,
          text: "（点它时出现的一段独白。）",
        },
        {
          id: "pt_b",
          label: "细节二",
          position: { x: 62, y: 50 },
          size: 110,
          text: "（点它时出现的一段独白。）",
        },
        {
          id: "pt_c",
          label: "细节三",
          position: { x: 46, y: 70 },
          size: 110,
          text: "（点它时出现的一段独白。）",
        },
      ],
      progressivePoem: ["（第一行诗）", "（第二行诗）"],
    }),
  },
  {
    type: "comic_reveal",
    name: "连环画",
    desc: "一张大图分格遮盖，按顺序点击揭开，每格配一段话。",
    ref: "dante · 1265_firenze「卡恰圭达的佛罗伦萨」",
    sketch: "panels",
    make: () => ({
      id: "comic_" + uid(),
      type: "comic_reveal",
      background: "",
      title: "新连环画",
      narrative: "（这组画讲什么。）",
      instruction: "点击画面，一格一格看下去。",
      panels: [
        {
          id: "p1",
          x: 1,
          y: 2,
          w: 48,
          h: 96,
          dialogues: [{ speaker: "narrator", speakerName: "旁白", text: "（第一格的话。）" }],
        },
        {
          id: "p2",
          x: 51,
          y: 2,
          w: 48,
          h: 96,
          dialogues: [{ speaker: "narrator", speakerName: "旁白", text: "（第二格的话。）" }],
        },
      ],
    }),
  },
  {
    type: "escape_game",
    name: "出城 / 逃脱",
    desc: "网格地图上避开巡逻守卫，从起点走到出口（吃豆人式）。",
    ref: "dufu · 755_anshi「长安出城」 / dante · 1283「坎帕尔迪诺」",
    sketch: "maze",
    make: () => ({
      id: "escape_" + uid(),
      type: "escape_game",
      background: "",
      title: "新逃脱关",
      narrative: "（为什么要逃、逃向哪里。）",
      gridW: 10,
      gridH: 8,
      tickMs: 350,
      chaseRadius: 2,
      start: { x: 8, y: 6 },
      end: { x: 0, y: 3 },
      playerPortrait: "",
      soldierPortraits: [],
      cells: [
        { x: 2, y: 1, w: 3, h: 2, label: "障碍一", fill: "#8A6F52" },
        { x: 6, y: 3, w: 2, h: 2, label: "障碍二", fill: "#8A6F52" },
        { x: 2, y: 5, w: 3, h: 2, label: "障碍三", fill: "#8A6F52" },
      ],
      arrows: [],
      gates: [{ x: 0, y: 3, label: "出口" }],
      guards: [
        { x: 5, y: 1, dir: "left" },
        { x: 4, y: 6, dir: "right" },
      ],
    }),
  },
  {
    type: "minigame",
    name: "小游戏（配对）",
    desc: "左右配对的小游戏占位（当前玩家端为简版展示）。",
    ref: "（现有数据暂无用例，播放端为简版）",
    sketch: "pairs",
    make: () => ({
      id: "minigame_" + uid(),
      type: "minigame",
      background: "",
      title: "新小游戏",
      narrative: "",
      minigameType: "matching",
      minigameInstruction: "（玩法说明。）",
      minigameItems: [
        { left: "（左项一）", right: "（右项一）" },
        { left: "（左项二）", right: "（右项二）" },
      ],
    }),
  },
];

export default PHASE_TEMPLATES;

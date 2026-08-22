// 历史长河 — 主人公花名册（单一事实来源）
//
// 主页、成就、数据加载都从这里读，新增人物只改这个文件：
//   1. 在 CHARACTERS 里加一项
//   2. 放好 public/assets/home/hp_{background,portrait,name}_<id> 三张图
//   3. 放好 src/data/<dataDir>/timeline.json（没有也不会崩，主页显示「建设中」）
//
// 字段说明：
//   id          唯一标识，同时用作 localStorage 成就 key、资源目录名
//   dataDir     src/data/<dataDir>/ 剧本目录，默认等于 id
//   background  主页背景（选中/悬停时淡入）
//   portrait    主页立绘 —— 已含该文明的窗框，窗内镂空透明，背景会透出来
//   name        名字书法/花体图；nameHeight 控制显示高度（各语种字形比例差别大）
//   locked      true = 显示 🔒，不可进入

export const CHARACTERS = [
  {
    id: "dufu",
    dataDir: "dufu",
    name: "杜甫",
    latin: "Du Fu",
    title: "诗圣",
    years: "712—770",
    dynasty: "唐 · 中国",
    description: "以诗为史，走过盛唐的绚烂与崩塌",
    achievementTitle: "诗圣之路",
    avatar: "🖊",
    color: "#4A90A4",
    background: "/assets/home/hp_background_dufu.jpg",
    portrait: "/assets/home/hp_portrait_dufu.png",
    name_img: "/assets/home/hp_name_dufu.png",
    nameHeight: 44,
    locked: false,
  },
  {
    id: "dante",
    dataDir: "dante",
    name: "但丁",
    latin: "Dante Alighieri",
    title: "至高诗人",
    years: "1265—1321",
    dynasty: "佛罗伦萨 · 意大利",
    description: "从流亡之路走进地狱、炼狱与天堂",
    achievementTitle: "神曲之路",
    avatar: "📕",
    color: "#A63A2E",
    background: "/assets/home/hp_background_dante.jpg",
    portrait: "/assets/home/hp_portrait_dante.png",
    name_img: "/assets/home/hp_name_dante.png",
    nameHeight: 26,
    locked: false,
  },
  {
    id: "rumi",
    dataDir: "rumi",
    name: "鲁米",
    latin: "Jalāl al-Dīn Rūmī",
    title: "旋舞的诗人",
    years: "1207—1273",
    dynasty: "呼罗珊 · 科尼亚",
    description: "在旋舞与诗行之间追寻神圣之爱",
    achievementTitle: "旋舞之路",
    avatar: "🌀",
    color: "#2F6F6B",
    background: "/assets/home/hp_background_rumi.jpg",
    portrait: "/assets/home/hp_portrait_rumi.png",
    name_img: "/assets/home/hp_name_rumi.png",
    nameHeight: 34,
    locked: true,
  },
];

// 主页标题（篆书「歷史長河」）
export const TITLE_IMG = "/assets/home/hp_title.png";

export const ACHIEVEMENT_TITLES = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c.achievementTitle])
);

export const getCharacter = (id) => CHARACTERS.find((c) => c.id === id) || null;

export default CHARACTERS;

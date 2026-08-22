// 中文排版小工具：不该拆行的语义单元整体保护。
//
// 浏览器对 CJK 默认逐字换行，会把《新生》拆成「《新\n生》」、把 "1290 年"
// 拆成「1290\n年」。nb() 把这三类短单元包进 white-space: nowrap 的 span：
//   - 《书名》     （≤14 字，防超长书名撑破容器）
//   - 「短引语」   （≤8 字，长引语照常换行）
//   - 数字 + 年    （"1290 年" / "747年"）
//
// 用法：{nb(text)} 替代 {text}。非字符串原样返回。

const UNIT_RE = /(《[^《》]{1,14}》|「[^「」]{1,8}」|\d+\s*年)/g;

export function nb(text) {
  if (typeof text !== "string" || !text) return text;
  UNIT_RE.lastIndex = 0;
  if (!UNIT_RE.test(text)) return text;
  const parts = text.split(UNIT_RE);
  return parts.map((part, i) =>
    // split 带捕获组：奇数下标是命中的单元
    i % 2 === 1 ? (
      <span key={i} style={{ whiteSpace: "nowrap" }}>{part}</span>
    ) : (
      part
    )
  );
}

export default nb;

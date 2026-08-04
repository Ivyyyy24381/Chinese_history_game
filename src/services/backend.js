// ============================================================
// 账号 + 排行榜后端（腾讯云开发 CloudBase）
// ============================================================
// 配置了 CloudBase（src/config/cloudbase.js）→ 云端模式：
//   邮箱验证码注册 / 密码登录，全网排行榜（scores 集合）。
//   未登录玩家以匿名身份也能提交分数、看排行榜。
// 未配置 → 本地模式：
//   昵称即账号，数据存 localStorage，排行榜只有本机记录。
// 两种模式对外接口一致，UI 层不用关心。
//
// 注意：CloudBase 邮箱注册需要验证码。register() 在云端模式下返回
// { needCode: true, verify(code) }，UI 需引导用户输入邮箱收到的验证码。

import { CLOUDBASE_CONFIG, isCloudConfigured } from "../config/cloudbase";

const LOCAL_USER_KEY = "lishiyou_user";
const LOCAL_BOARD_KEY = "lishiyou_leaderboard";
const NICK_KEY = "lishiyou_nickname"; // 云端模式下昵称存本地（中文昵称不适合做 username）

let appPromise = null;
let cachedUser = null; // 云端模式的当前用户缓存（同步读取用）

async function getApp() {
  if (!appPromise) {
    appPromise = import("@cloudbase/js-sdk").then((m) => {
      const cloudbase = m.default || m;
      return cloudbase.init({
        env: CLOUDBASE_CONFIG.envId,
        region: CLOUDBASE_CONFIG.region || "ap-shanghai",
        accessKey: CLOUDBASE_CONFIG.publishableKey,
      });
    });
  }
  return appPromise;
}

// SDK 版本兼容：v3 里 app.auth 是函数（app.auth() 返回实例），
// 个别版本是属性。两种都支持，避免 "signUp is not a function"。
function getAuth(app) {
  return typeof app.auth === "function" ? app.auth() : app.auth;
}

const getNick = () => {
  try { return localStorage.getItem(NICK_KEY) || ""; } catch { return ""; }
};
const setNick = (n) => {
  try { localStorage.setItem(NICK_KEY, n || ""); } catch { /* ignore */ }
};

function userFromCloud(u) {
  if (!u || u.is_anonymous) return null;
  return {
    uid: u.id || "",
    nickname: getNick() || u.user_metadata?.nickName || u.user_metadata?.username || u.email?.split("@")[0] || "玩家",
    email: u.email || "",
  };
}

export const isCloud = isCloudConfigured;

// ---- 账号 -------------------------------------------------------------

/** 当前登录用户（同步）：{ nickname, email } 或 null */
export function getCurrentUser() {
  if (isCloud()) return cachedUser;
  try { return JSON.parse(localStorage.getItem(LOCAL_USER_KEY)); } catch { return null; }
}

/** 恢复登录态（页面加载后调用一次） */
export async function restoreSession() {
  if (!isCloud()) return getCurrentUser();
  try {
    const app = await getApp();
    const auth = getAuth(app);
    const { data } = await auth.getSession();
    if (data?.session) {
      const r = await auth.getUser();
      cachedUser = userFromCloud(r.data?.user);
    }
  } catch { /* 未登录或网络问题 — 保持未登录状态 */ }
  return cachedUser;
}

/**
 * 注册。云端：发送邮箱验证码，返回 { needCode: true, verify(code) }；
 * verify 成功后完成注册并登录。本地：直接生效。
 */
export async function register({ email, password, nickname }) {
  if (isCloud()) {
    const app = await getApp();
    const { data, error } = await getAuth(app).signUp({ email, password });
    if (error) throw new Error(error.message || "注册失败");
    return {
      needCode: true,
      verify: async (code) => {
        const r = await data.verifyOtp({ token: code });
        if (r.error) throw new Error(r.error.message || "验证码不正确");
        setNick(nickname || email.split("@")[0]);
        cachedUser = { uid: r.data?.user?.id || "", nickname: getNick(), email };
        return cachedUser;
      },
    };
  }
  const u = { nickname: nickname || email || "游客", email: email || "" };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
  return { needCode: false, user: u };
}

export async function login({ email, password }) {
  if (isCloud()) {
    const app = await getApp();
    const { data, error } = await getAuth(app).signInWithPassword({ email, password });
    if (error) throw new Error(error.message || "登录失败");
    cachedUser = userFromCloud(data?.user) || { uid: data?.user?.id || "", nickname: getNick() || email.split("@")[0], email };
    return cachedUser;
  }
  const u = { nickname: email || "游客", email: email || "" };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
  return u;
}

export async function logout() {
  if (isCloud()) {
    try {
      const app = await getApp();
      await getAuth(app).signOut();
    } catch { /* ignore */ }
    cachedUser = null;
    return;
  }
  try { localStorage.removeItem(LOCAL_USER_KEY); } catch { /* ignore */ }
}

// ---- 访问统计 ---------------------------------------------------------

const DEVICE_KEY = "lishiyou_device";
function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch { return "unknown"; }
}

/**
 * 记一次访问（每个浏览器会话只记一次，玩家无需注册/登录）。
 * 数据写入 CloudBase `visits` 集合，控制台可看总数和明细。
 * 失败静默，绝不影响游戏。
 */
export async function logVisit() {
  if (!isCloud()) return;
  try {
    if (sessionStorage.getItem("lishiyou_visited")) return; // 本会话已记
    sessionStorage.setItem("lishiyou_visited", "1");
  } catch { /* ignore */ }
  try {
    const app = await getApp();
    await ensureSignedIn(app);
    const db = app.database();
    await db.collection("visits").add({
      deviceId: getDeviceId(),          // 同一设备同一个 id，可用于估算独立访客
      path: location.pathname,
      referrer: document.referrer || "",
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      touch: navigator.maxTouchPoints > 0, // 大致区分手机/电脑
      createdAt: db.serverDate(),
    });
  } catch { /* 集合未建或网络失败 — 静默 */ }
}

// ---- 排行榜 -----------------------------------------------------------

// 数据库操作需要登录态；未登录玩家用匿名登录兜底。
async function ensureSignedIn(app) {
  const auth = getAuth(app);
  const { data } = await auth.getSession();
  if (!data?.session) await auth.signInAnonymously();
}

/** 提交一局总分。entry: { score, characterId } */
export async function submitScore({ score, characterId }) {
  const user = getCurrentUser();
  const nickname = user?.nickname || "匿名玩家";
  if (isCloud()) {
    const app = await getApp();
    await ensureSignedIn(app);
    const db = app.database();
    await db.collection("scores").add({
      score,
      characterId,
      nickname,
      uid: user?.uid || "", // 绑定账号，便于查"我的成绩"
      createdAt: db.serverDate(),
    });
    return;
  }
  let board = [];
  try { board = JSON.parse(localStorage.getItem(LOCAL_BOARD_KEY)) || []; } catch { /* ignore */ }
  board.push({ nickname, score, characterId, date: new Date().toISOString() });
  board.sort((a, b) => b.score - a.score);
  localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(board.slice(0, 100)));
}

/** 我的最好成绩和真实排名：{ best, rank } 或 null（未登录/无记录） */
export async function fetchMyBest() {
  const user = getCurrentUser();
  if (!isCloud() || !user?.uid) return null;
  try {
    const app = await getApp();
    await ensureSignedIn(app);
    const db = app.database();
    const mine = await db.collection("scores")
      .where({ uid: user.uid })
      .orderBy("score", "desc")
      .limit(1)
      .get();
    const best = mine.data?.[0]?.score;
    if (best == null) return null;
    // 排名按"每人最高分"口径：取前 100 去重后找自己的位置
    const top = await db.collection("scores").orderBy("score", "desc").limit(100).get();
    const deduped = dedupeBest((top.data || []).map((row) => ({
      nickname: row.nickname || "匿名玩家",
      score: row.score,
      uid: row.uid || "",
    })));
    const idx = deduped.findIndex((r) => r.uid === user.uid);
    return { best, rank: idx >= 0 ? idx + 1 : `100+` };
  } catch {
    return null;
  }
}

/** 每个玩家只保留最高分（按 uid 去重；无 uid 的按昵称去重） */
function dedupeBest(rows) {
  const best = new Map();
  for (const r of rows) {
    const key = r.uid ? `u:${r.uid}` : `n:${r.nickname}`;
    if (!best.has(key) || r.score > best.get(key).score) best.set(key, r);
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

/** 取排行榜前 limit 名（每人只计最高分）：[{ nickname, score, characterId }] */
export async function fetchLeaderboard(limit = 20) {
  if (isCloud()) {
    const app = await getApp();
    await ensureSignedIn(app);
    const db = app.database();
    // 多取一些再按玩家去重，保证去重后仍够 limit 条
    const r = await db.collection("scores")
      .orderBy("score", "desc")
      .limit(100)
      .get();
    const rows = (r.data || []).map((row) => ({
      nickname: row.nickname || "匿名玩家",
      score: row.score,
      characterId: row.characterId,
      uid: row.uid || "",
    }));
    return dedupeBest(rows).slice(0, limit);
  }
  try {
    const rows = JSON.parse(localStorage.getItem(LOCAL_BOARD_KEY)) || [];
    return dedupeBest(rows.map((x) => ({ ...x, uid: "" }))).slice(0, limit);
  } catch {
    return [];
  }
}

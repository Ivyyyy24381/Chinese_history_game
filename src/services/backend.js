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
    const _ = db.command;
    const higher = await db.collection("scores").where({ score: _.gt(best) }).count();
    return { best, rank: (higher.total ?? 0) + 1 };
  } catch {
    return null;
  }
}

/** 取排行榜前 limit 名：[{ nickname, score, characterId }] */
export async function fetchLeaderboard(limit = 20) {
  if (isCloud()) {
    const app = await getApp();
    await ensureSignedIn(app);
    const db = app.database();
    const r = await db.collection("scores")
      .orderBy("score", "desc")
      .limit(limit)
      .get();
    return (r.data || []).map((row) => ({
      nickname: row.nickname || "匿名玩家",
      score: row.score,
      characterId: row.characterId,
    }));
  }
  try {
    return (JSON.parse(localStorage.getItem(LOCAL_BOARD_KEY)) || []).slice(0, limit);
  } catch {
    return [];
  }
}

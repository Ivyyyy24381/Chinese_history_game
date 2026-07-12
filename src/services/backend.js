// ============================================================
// 账号 + 排行榜后端
// ============================================================
// 配置了 LeanCloud（src/config/leancloud.js）→ 云端模式：
//   邮箱注册/登录，全网排行榜（Score 表）。
// 未配置 → 本地模式：
//   昵称即账号，数据存 localStorage，排行榜只有本机记录。
// 两种模式对外接口完全一致，UI 层不用关心。

import { LEANCLOUD_CONFIG, isCloudConfigured } from "../config/leancloud";

const LOCAL_USER_KEY = "lishiyou_user";
const LOCAL_BOARD_KEY = "lishiyou_leaderboard";

let AV = null; // lazily-loaded LeanCloud SDK

async function getAV() {
  if (AV) return AV;
  const mod = await import("leancloud-storage");
  AV = mod.default || mod;
  if (!AV.applicationId) {
    AV.init({
      appId: LEANCLOUD_CONFIG.appId,
      appKey: LEANCLOUD_CONFIG.appKey,
      serverURL: LEANCLOUD_CONFIG.serverURL,
    });
  }
  return AV;
}

export const isCloud = isCloudConfigured;

// ---- 账号 -------------------------------------------------------------

/** 当前登录用户：{ nickname, email } 或 null */
export function getCurrentUser() {
  if (isCloud()) {
    // AV.User.current() 是同步的，但 SDK 可能还没加载；用缓存兜底
    if (AV) {
      const u = AV.User.current();
      return u ? { nickname: u.get("nickname") || u.getUsername(), email: u.getEmail() } : null;
    }
  }
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USER_KEY));
  } catch {
    return null;
  }
}

/** 注册。云端：email+password+nickname；本地：只需 nickname。 */
export async function register({ email, password, nickname }) {
  if (isCloud()) {
    const av = await getAV();
    const user = new av.User();
    user.setUsername(email);
    user.setEmail(email);
    user.setPassword(password);
    user.set("nickname", nickname || email.split("@")[0]);
    await user.signUp();
    return getCurrentUser();
  }
  const u = { nickname: nickname || email || "游客", email: email || "" };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
  return u;
}

export async function login({ email, password }) {
  if (isCloud()) {
    const av = await getAV();
    await av.User.logIn(email, password);
    return getCurrentUser();
  }
  const u = { nickname: email || "游客", email: email || "" };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
  return u;
}

export async function logout() {
  if (isCloud() && AV) await AV.User.logOut();
  try { localStorage.removeItem(LOCAL_USER_KEY); } catch { /* ignore */ }
}

/** 云端模式下恢复登录态（页面刷新后调用一次即可） */
export async function restoreSession() {
  if (!isCloud()) return getCurrentUser();
  await getAV();
  return getCurrentUser();
}

// ---- 排行榜 -----------------------------------------------------------

/** 提交一局总分。entry: { score, characterId } */
export async function submitScore({ score, characterId }) {
  const user = getCurrentUser();
  const nickname = user?.nickname || "匿名玩家";
  if (isCloud()) {
    const av = await getAV();
    const Score = av.Object.extend("Score");
    const s = new Score();
    s.set("score", score);
    s.set("characterId", characterId);
    s.set("nickname", nickname);
    if (av.User.current()) s.set("player", av.User.current());
    await s.save();
    return;
  }
  let board = [];
  try { board = JSON.parse(localStorage.getItem(LOCAL_BOARD_KEY)) || []; } catch { /* ignore */ }
  board.push({ nickname, score, characterId, date: new Date().toISOString() });
  board.sort((a, b) => b.score - a.score);
  localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(board.slice(0, 100)));
}

/** 取排行榜前 limit 名：[{ nickname, score, characterId, date }] */
export async function fetchLeaderboard(limit = 20) {
  if (isCloud()) {
    const av = await getAV();
    const q = new av.Query("Score");
    q.descending("score");
    q.limit(limit);
    const rows = await q.find();
    return rows.map((r) => ({
      nickname: r.get("nickname") || "匿名玩家",
      score: r.get("score"),
      characterId: r.get("characterId"),
      date: r.createdAt?.toISOString?.() || "",
    }));
  }
  try {
    return (JSON.parse(localStorage.getItem(LOCAL_BOARD_KEY)) || []).slice(0, limit);
  } catch {
    return [];
  }
}

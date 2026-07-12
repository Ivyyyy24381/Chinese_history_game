import { useState } from "react";
import { isCloud, register, login } from "../services/backend";

/**
 * AuthPanel — 登录/注册弹窗。
 * 云端模式（配置了 LeanCloud）：邮箱 + 密码 + 昵称。
 * 本地模式：只填昵称，数据存本机浏览器。
 * onAuthed(user) 在登录/注册成功后回调。
 */
export default function AuthPanel({ onAuthed, onClose }) {
  const cloud = isCloud();
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (cloud) {
      if (!email.trim() || !password) { setError("请填写邮箱和密码"); return; }
    } else if (!nickname.trim() && !email.trim()) {
      setError("请填写昵称"); return;
    }
    setBusy(true);
    try {
      const user = mode === "register"
        ? await register({ email: email.trim(), password, nickname: nickname.trim() })
        : await login({ email: email.trim(), password });
      onAuthed(user);
    } catch (e) {
      setError(translateError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>
          {cloud ? (mode === "register" ? "注册账号" : "登录") : "本地账号"}
        </h2>

        {!cloud && (
          <p style={styles.localNote}>
            {"未配置云端服务，账号与积分仅保存在本机浏览器。填个昵称即可开始。"}
          </p>
        )}

        {cloud ? (
          <>
            <input
              style={styles.input}
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              style={styles.input}
              type="password"
              placeholder="密码（至少 6 位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            {mode === "register" && (
              <input
                style={styles.input}
                placeholder="昵称（显示在排行榜上）"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            )}
          </>
        ) : (
          <input
            style={styles.input}
            placeholder="昵称（显示在排行榜上）"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        )}

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.primaryBtn} disabled={busy} onClick={submit}>
          {busy ? "请稍候…" : cloud ? (mode === "register" ? "注册" : "登录") : "开始游玩"}
        </button>

        {cloud && (
          <button
            style={styles.switchBtn}
            onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}
          >
            {mode === "register" ? "已有账号？去登录" : "没有账号？去注册"}
          </button>
        )}

        <button style={styles.closeBtn} onClick={onClose}>{"×"}</button>
      </div>
    </div>
  );
}

function translateError(e) {
  const msg = String(e?.message || e);
  if (/already taken|已经被占用|already exists/i.test(msg)) return "该邮箱已注册，请直接登录";
  if (/could not find user|doesn't exist/i.test(msg)) return "账号不存在，请先注册";
  if (/password|密码/i.test(msg)) return "邮箱或密码不正确";
  if (/network|fetch/i.test(msg)) return "网络错误，请稍后重试";
  return msg;
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 400,
    backgroundColor: "rgba(12,10,8,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Noto Serif SC', 'Songti SC', serif",
  },
  panel: {
    position: "relative",
    backgroundColor: "#F5EFE3", borderRadius: 14,
    padding: "32px 36px", width: 360,
    border: "2px solid #C9A86A",
    boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
    display: "flex", flexDirection: "column", gap: 12,
  },
  title: { margin: 0, fontSize: 22, color: "#3B2510", letterSpacing: 4, textAlign: "center" },
  localNote: { margin: 0, fontSize: 12, color: "#8B7355", lineHeight: 1.6 },
  input: {
    padding: "10px 12px", fontSize: 14, fontFamily: "inherit",
    border: "1px solid #C9B08A", borderRadius: 8, backgroundColor: "#FFF",
  },
  error: { color: "#C0392B", fontSize: 13 },
  primaryBtn: {
    padding: "10px 18px", border: "none", borderRadius: 8,
    backgroundColor: "#8B7355", color: "#FFF",
    cursor: "pointer", fontSize: 15, fontFamily: "inherit", letterSpacing: 2,
  },
  switchBtn: {
    padding: 4, border: "none", background: "none",
    color: "#8B7355", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
    textDecoration: "underline",
  },
  closeBtn: {
    position: "absolute", top: 8, right: 12,
    border: "none", background: "none", fontSize: 22,
    color: "#8B7355", cursor: "pointer",
  },
};

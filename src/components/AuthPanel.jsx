import { useState } from "react";
import { isCloud, register, login } from "../services/backend";
import { t } from "../i18n/ui";

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
  // 云端注册需要邮箱验证码：pendingVerify 存 verify 函数，进入输码步骤
  const [pendingVerify, setPendingVerify] = useState(null);
  const [code, setCode] = useState("");

  const submit = async () => {
    setError("");
    if (cloud) {
      if (!email.trim() || !password) { setError(t("请填写邮箱和密码")); return; }
    } else if (!nickname.trim() && !email.trim()) {
      setError(t("请填写昵称")); return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        const res = await register({ email: email.trim(), password, nickname: nickname.trim() });
        if (res.needCode) {
          setPendingVerify(() => res.verify); // 下一步：输入邮箱验证码
        } else {
          onAuthed(res.user);
        }
      } else {
        const user = await login({ email: email.trim(), password });
        onAuthed(user);
      }
    } catch (e) {
      setError(translateError(e));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (!code.trim()) { setError(t("请输入邮箱收到的验证码")); return; }
    setError("");
    setBusy(true);
    try {
      const user = await pendingVerify(code.trim());
      onAuthed(user);
    } catch (e) {
      setError(translateError(e));
    } finally {
      setBusy(false);
    }
  };

  // —— 验证码输入步骤 ——
  if (pendingVerify) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
          <h2 style={styles.title}>{t("输入验证码")}</h2>
          <p style={styles.localNote}>
            {t("验证码已发送到 ")}{email}{t("，请查收（含垃圾箱）。")}
          </p>
          <input
            style={styles.input}
            placeholder={t("邮箱验证码")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitCode()}
            autoFocus
          />
          {error && <div style={styles.error}>{error}</div>}
          <button style={styles.primaryBtn} disabled={busy} onClick={submitCode}>
            {busy ? t("请稍候…") : t("完成注册")}
          </button>
          <button style={styles.switchBtn} onClick={() => { setPendingVerify(null); setCode(""); setError(""); }}>
            {t("← 返回重填")}
          </button>
          <button style={styles.closeBtn} onClick={onClose}>{"×"}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>
          {cloud ? (mode === "register" ? t("注册账号") : t("登录")) : t("本地账号")}
        </h2>

        {!cloud && (
          <p style={styles.localNote}>
            {t("未配置云端服务，账号与积分仅保存在本机浏览器。填个昵称即可开始。")}
          </p>
        )}

        {cloud ? (
          <>
            <input
              style={styles.input}
              type="email"
              placeholder={t("邮箱")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              style={styles.input}
              type="password"
              placeholder={t("密码（至少 6 位）")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            {mode === "register" && (
              <input
                style={styles.input}
                placeholder={t("昵称（显示在排行榜上）")}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            )}
          </>
        ) : (
          <input
            style={styles.input}
            placeholder={t("昵称（显示在排行榜上）")}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        )}

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.primaryBtn} disabled={busy} onClick={submit}>
          {busy ? t("请稍候…") : cloud ? (mode === "register" ? t("注册") : t("登录")) : t("开始游玩")}
        </button>

        {cloud && (
          <button
            style={styles.switchBtn}
            onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}
          >
            {mode === "register" ? t("已有账号？去登录") : t("没有账号？去注册")}
          </button>
        )}

        <button style={styles.closeBtn} onClick={onClose}>{"×"}</button>
      </div>
    </div>
  );
}

function translateError(e) {
  const msg = String(e?.message || e);
  if (/already|已存在|已注册|exist/i.test(msg)) return t("该邮箱已注册，请直接登录");
  if (/not.?found|不存在|no user/i.test(msg)) return t("账号不存在，请先注册");
  if (/password|密码|credential/i.test(msg)) return t("邮箱或密码不正确");
  if (/token|verify|验证码|otp|code/i.test(msg)) return t("验证码不正确或已过期");
  if (/permission_denied|permission/i.test(msg)) return t("服务未就绪：请在云开发控制台把本站域名加入安全域名");
  if (/network|fetch|timeout/i.test(msg)) return t("网络错误，请稍后重试");
  return msg;
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 400,
    backgroundColor: "rgba(12,10,8,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-body)",
  },
  panel: {
    position: "relative",
    backgroundColor: "#F5EFE3", borderRadius: 14,
    padding: "32px 36px", width: "min(360px, calc(100vw - 24px))",
    border: "2px solid #C9A86A",
    boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
    display: "flex", flexDirection: "column", gap: 12,
  },
  title: { margin: 0, fontSize: "clamp(17.6px, 1.528vw, 25.3px)", color: "#3B2510", letterSpacing: 4, textAlign: "center" },
  localNote: { margin: 0, fontSize: "clamp(12px, 0.833vw, 13.8px)", color: "#8B7355", lineHeight: 1.6 },
  input: {
    padding: "10px 12px", fontSize: "clamp(16px, 0.972vw, 16.1px)", fontFamily: "inherit",
    border: "1px solid #C9B08A", borderRadius: 8, backgroundColor: "#FFF",
  },
  error: { color: "#C0392B", fontSize: "clamp(12px, 0.903vw, 14.9px)" },
  primaryBtn: {
    padding: "10px 18px", border: "none", borderRadius: 8,
    backgroundColor: "#8B7355", color: "#FFF",
    cursor: "pointer", fontSize: "clamp(12.0px, 1.042vw, 17.2px)", fontFamily: "inherit", letterSpacing: 2,
  },
  switchBtn: {
    padding: 4, border: "none", background: "none",
    color: "#8B7355", cursor: "pointer", fontSize: "clamp(12px, 0.903vw, 14.9px)", fontFamily: "inherit",
    textDecoration: "underline",
  },
  closeBtn: {
    position: "absolute", top: 8, right: 12,
    border: "none", background: "none", fontSize: "clamp(17.6px, 1.528vw, 25.3px)",
    color: "#8B7355", cursor: "pointer",
  },
};

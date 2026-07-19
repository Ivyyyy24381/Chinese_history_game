// ============================================================
// 腾讯云开发 CloudBase 配置 —— 在这里粘贴你的密钥
// ============================================================
// 注册和配置步骤见 docs/ACCOUNTS_SETUP.md。
// envId 和 publishableKey 留空时，游戏自动降级为「本地模式」：
// 账号和排行榜只存在玩家自己的浏览器里，游戏其他功能完全正常。

export const CLOUDBASE_CONFIG = {
  envId: "a1-d9g6kjlne4eb972f1", // 云开发平台 → 环境ID
  publishableKey: "", // ⬅ 待填：云开发平台 → API Key 配置 → Publishable Key（很长的一串 eyJ... 完整复制）
  region: "ap-shanghai", // 环境所在地域
};

export const isCloudConfigured = () =>
  Boolean(CLOUDBASE_CONFIG.envId && CLOUDBASE_CONFIG.publishableKey);

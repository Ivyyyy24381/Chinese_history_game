// ============================================================
// LeanCloud 配置 —— 在这里粘贴你的密钥
// ============================================================
// 注册步骤见 docs/ACCOUNTS_SETUP.md。
// 三个值都留空时，游戏自动降级为「本地模式」：
// 账号和排行榜只存在玩家自己的浏览器里，游戏其他功能完全正常。

export const LEANCLOUD_CONFIG = {
  appId: "",      // LeanCloud 控制台 → 设置 → 应用凭证 → AppID
  appKey: "",     // 同上 → AppKey
  serverURL: "",  // 同上 → 服务器地址（REST API 域名，形如 https://xxx.lc-cn-n1-shared.com）
};

export const isCloudConfigured = () =>
  Boolean(LEANCLOUD_CONFIG.appId && LEANCLOUD_CONFIG.appKey && LEANCLOUD_CONFIG.serverURL);

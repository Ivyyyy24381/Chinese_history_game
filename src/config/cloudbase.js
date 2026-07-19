// ============================================================
// 腾讯云开发 CloudBase 配置 —— 在这里粘贴你的密钥
// ============================================================
// 注册和配置步骤见 docs/ACCOUNTS_SETUP.md。
// envId 和 publishableKey 留空时，游戏自动降级为「本地模式」：
// 账号和排行榜只存在玩家自己的浏览器里，游戏其他功能完全正常。

export const CLOUDBASE_CONFIG = {
  envId: "a1-d9g6kjlne4eb972f1", // 云开发平台 → 环境ID
  publishableKey: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL2ExLWQ5ZzZramxuZTRlYjk3MmYxLmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJhMS1kOWc2a2psbmU0ZWI5NzJmMSIsImV4cCI6NDA4ODExMTE1NiwiaWF0IjoxNzg0NDI3OTU2LCJub25jZSI6ImFCQlhtWGVNU1VLZTI0S011aXNKQ2ciLCJhdF9oYXNoIjoiYUJCWG1YZU1TVUtlMjRLTXVpc0pDZyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJhMS1kOWc2a2psbmU0ZWI5NzJmMSIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJ1c2VyX3R5cGUiOiIiLCJjbGllbnRfdHlwZSI6ImNsaWVudF91c2VyIiwiaXNfc3lzdGVtX2FkbWluIjpmYWxzZX0.VtLpxcRNl42t7BxKI94Sm7eSGlBxnuqxXOweLdms6CxMvsH4W-Rf52E6otUeruxkga4REk3vAgwhubVtbbetBOoFkOQcGHbc_389ydSTmd4DZ71VaTppW-Zzye5vfIXDnlwUSS94cC5IZug8vu5kGQkG_XEkn2s5xrYFjnhOi_tg77TuA8Pe3ikuijiNtEwXhy7P7ONyV4uGji6HKeaWOOQUV4dQG5oJB9r51kTfL3DLbWwsazF6h7F-ndqx3zJJ-gSEHyxjLKmPJaDvxuBdcMdqDYuPs0aLkMO3DHSRV6KGqiSHH3P6EhiysdZSQKmum_0P4_pzDV8SpyPs9bkA6Q",
  region: "ap-shanghai", // 环境所在地域
};

export const isCloudConfigured = () =>
  Boolean(CLOUDBASE_CONFIG.envId && CLOUDBASE_CONFIG.publishableKey);

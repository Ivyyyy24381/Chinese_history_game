# 部署指南 · DEPLOYMENT

> 本项目是 **纯静态站点**（Vite + React，无后端无数据库），任何静态托管都能跑。

## 0. 构建

```bash
# vite.config.js 里确认 base 为相对路径（OSS/子目录部署必需）：
#   export default defineConfig({ base: "./", ... })
npm install
npm run build        # 产出 dist/
npx vite preview     # 本地验收 dist
```

## 1. 上线前必做：资源瘦身

当前 assets 总量较大（单张地图 4–6MB）。上线前：

```bash
# 批量转 webp（约省 70%），png 引用路径不变的话可用同名 .png 但内容为压缩图
npx sharp-cli --input "public/assets/**/*.png" --output ... # 或用 squoosh 手动压大图
```

优先压：maps/（7 张大图）、events/*/backgrounds/（46 张）。立绘和道具较小可后压。
目标：首屏 < 3MB，全量 < 40MB。

## 2. 国内正式部署（推荐：腾讯云 COS 或 阿里云 OSS）

1. 开通 COS/OSS 存储桶，开启「静态网站托管」，索引文档 `index.html`
2. 把 `dist/` 整个上传（保持目录结构）
3. 绑定 CDN 加速域名，开启 gzip/brotli、HTTP2、缓存（assets 设长缓存，index.html 不缓存）
4. **自定义域名需 ICP 备案**（个人备案 1–2 周，需购买同厂商云服务器或轻量服务器做备案主体载体）
5. HTTPS：CDN 控制台申请免费证书一键部署

成本估算：OSS+CDN 按量计费，小流量每月几块钱。

## 3. 免备案过渡方案（内测/给朋友玩）

| 方案 | 优点 | 缺点 |
|---|---|---|
| Cloudflare Pages | 免费、git push 自动部署 | 大陆访问时快时慢 |
| GitHub Pages | 免费、最简单 | 大陆经常很慢 |
| 云厂商默认域名（COS/OSS 自带） | 免备案、速度好 | 域名丑，仅适合内测 |

Cloudflare Pages 步骤：仓库连到 CF → Framework 选 Vite → build 命令 `npm run build`、输出 `dist` → 完成。

## 4. 更新流程

```bash
npm run build
# COS/OSS：用 coscli / ossutil 同步 dist/（只传变更文件）
# Cloudflare/GitHub Pages：git push 即自动构建
```

注意：玩家进度/成就存 localStorage，部署更新不影响存档；但换域名会丢存档（localStorage 按域名隔离）。

## 5. 以后如果要加后端（云存档/排行榜）

保持前端静态不动，加轻后端即可：国内选 uniCloud / 腾讯云函数 + 云数据库；
海外选 Supabase / Firebase。当前阶段不需要。

---

## CloudBase 静态托管部署（2026-07 补充：解决国内访问慢）

> 前提：已有 CloudBase 环境（envId: a1-d9g6kjlne4eb972f1）。免费体验环境自带静态托管额度。

### 方式 A：网页上传（最简单，5 分钟）

1. 本地 `npm run build`，得到 `dist/` 文件夹
2. 打开 <https://tcb.cloud.tencent.com/dev> → 左侧「静态托管」→ 首次进入点「开通」
3. 把 **dist 文件夹里的全部内容**（不是 dist 文件夹本身）拖拽上传到根目录
4. 「基础配置」里找到默认域名（形如 `xxx.tcloudbaseapp.com`），打开即是国内加速版

### 方式 B：命令行（以后每次更新一条命令）

```bash
npm i -g @cloudbase/cli
tcb login                # 浏览器授权一次
npm run build
tcb hosting deploy ./dist -e a1-d9g6kjlne4eb972f1
```

### 三个必看注意点

1. **安全来源要加新域名**：CloudBase 控制台 → 环境 → 安全来源，把 `xxx.tcloudbaseapp.com` 加进去，否则新域名上注册/排行榜会报 Failed to fetch（是的，自家域名也要加）
2. **historycharacter.com 绑定静态托管需 ICP 备案**；备案完成前先用默认域名在国内分享，GitHub Pages 域名继续当海外入口
3. 资产约 100MB，首次上传耐心等；之后 CLI 部署是增量的，很快

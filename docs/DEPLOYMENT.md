# 静态部署指南

项目输出静态文件，不依赖特定云账号。当前官网使用 CloudBase 静态托管，源码也可发布到其他支持静态网站的服务。

## 构建与发布目录

```bash
npm ci
npm run lint:app
npm test
npm run build
node scripts/check-release-assets.mjs
```

将 `dist/` 内的文件发布到站点根目录。无需上传源码、`node_modules/`、开发示例或文档。项目使用站点根路径引用资源；部署到 `/某个子目录/` 需要进一步修改资源路径和构建配置。

## 路由

| 请求路径 | 托管服务需要提供的内容 |
| :--- | :--- |
| `/` | `index.html` |
| `/gallery`、`/studio`、`/about`、`/contact` | 对应目录的 `index.html`，或内部回退到主入口 |
| `/start`、`/start/` | `start/index.html` |
| `/assets/*`、`/textures/*` 等 | 实际静态文件 |

构建会为四个房间生成 HTML。使用主入口回退时，React 会从 URL 识别初始房间；优先提供生成的对应 HTML，可以保留首次响应的页面专属元数据。`/start` 必须提供静态轻量页，不能被通用 SPA 回退覆盖。

`public/_headers` 和 `public/_redirects` 提供兼容配置，仅在托管平台支持这些文件时生效。使用 CloudBase 等平台时，在其托管设置中配置对应路由和响应头。

## 域名与元数据

先在 `src/config/site-profile.js` 设置你自己的域名，再构建。托管服务需要绑定域名并配置 HTTPS，DNS 使用平台实际给出的记录。修改域名后，核对 canonical、sitemap、robots、分享图与结构化数据。

备案信息由 `src/config/site-filing.js` 控制。发布自己的版本时，不要沿用时安的网站身份、联系方式和备案号。

## 缓存

- `/assets/` 的文件名带内容哈希，可使用一年缓存及 `immutable`。
- HTML 入口、robots 与 sitemap 应及时重新验证，避免更新后仍显示旧内容。
- 未带内容哈希的纹理、图片、字体与音效采用较短缓存，替换后按需刷新 CDN。
- 构建会生成压缩副本；启用预压缩服务时，需要返回正确的 `Content-Encoding` 与 `Content-Type`。

## 发布后检查

直接访问并刷新六个入口，确认房间路由、轻量页面、字体与场景资源正常。检查桌面与手机视口下的地图导航、返回、音量控制、外链和复制操作，并确认控制台没有新的应用异常。

保留上一版静态产物，便于通过托管服务的版本功能回滚。GitHub Actions 负责代码与构建验证，不会自动部署到官网。

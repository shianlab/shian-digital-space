# 定制指南

内容集中于 `src/config/`。建议先替换身份与链接，再调整作品与房间，最后更换素材和视觉细节。

## 1. 修改网站身份

在 `src/config/site-profile.js` 更新 `SITE_NAME`、`OFFICIAL_ACCOUNT_NAME`、`SITE_PROFILE` 和 `PAGE_META`。`SITE_PROFILE.url` 会用于 canonical、结构化数据、robots 与 sitemap，应填写你自己的 HTTPS 域名。

在 `about-profile.js` 更新简介、座右铭、资质、荣誉和社区身份，在 `contact-channels.js` 更新联系账号、复制内容与跳转链接。公众号入口会引用工作室的一条文章；调整文章 ID 时，同时维护对应关联。

在 `site-filing.js` 配置自己的备案信息。不要使用时安的备案号；如无需展示备案信息，应同时调整 `seo-plugin.js` 的页脚生成逻辑及相应验证脚本。

## 2. 修改作品与工作室

`gallery-projects.js` 定义作品数据。每个作品保持唯一 `id`，卡片标题支持 `\n` 换行。`preview` 使用 `public/` 下资源的站点路径；`url: null` 表示不显示项目外链。

`studio-content.js` 定义文章、创作、视频与资源。保留内容 ID、平台信息、预览图与链接之间的对应关系；工作室的摆放和交互由 `components/canvas/rooms/Studio/` 管理。重新发布个人内容时，请使用自己的文案和有权使用的配图。

## 3. 更换视觉素材

纹理、图片、音效与字体位于 `public/`。资源路径以 `/textures/…`、`/images/…` 等形式引用，不包含 `public` 前缀。

更换纹理时，检查图片宽高比、透明通道和场景平面的尺寸。品牌分享图位于 `public/images/share/shian-digital-space.png`，站点图标位于 `public/images/brand/shian-touch-icon.png`。手写标签的字形图片与配置分别位于 `public/textures/shian/handwriting/` 和 `src/config/handwriting.js`。

中文 UI 字体经过子集处理。若新增文字出现缺字，可使用 `scripts/build-chinese-fonts.py` 从具有合适许可的源字体重新生成；该工具另需 Python、fonttools 和 brotli，本地运行网站无需 Python。字体修改须保留许可并遵循字体名称要求。

原模板的素材和时安个人品牌素材具有独立许可。复制前阅读 [ASSETS.md](ASSETS.md)，取得相应授权或换成自己的素材。

## 4. 同步并验证

```bash
npm run lint:app
npm test
npm run build
npm run preview
```

`predev` / `prebuild` 调用 `scripts/sync-site-pages.mjs`，同步主入口、静态轻量页面、robots、sitemap 与分发许可证。不要直接改生成的页面内容。临时品牌生成文件写入 `.cache/`，不进入版本控制。

已有测试覆盖了当前网站的内容约定与 canonical；更换身份、作品或域名后，按新内容更新测试中的预期值。

检查 `/`、`/gallery`、`/studio`、`/about`、`/contact` 与 `/start/`，以及地图跳转、返回、刷新、外链和联系复制操作。使用自己的域名发布时，还要核对分享图和搜索元数据。

## 5. 可选统计与联系服务

默认不启用访问统计。若需启用，将 `.env.example` 复制为 `.env.local`，设置自己的 PostHog 公共项目 key 和 host；两个值都填写后才会加载统计客户端。

正式联系房间展示账号与外链，不提供收件后端。仓库保留的 `MessagePaper.jsx` 是旧开发示例，其提交开关关闭；接入真实收件服务时，应作为独立功能实现和验证。

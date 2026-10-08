# 素材与第三方许可

代码许可与素材许可分别管理。根目录的 [MIT License](../LICENSE) 覆盖本项目代码及相应修改，保留原作者 Tomasz Szmajda 和时安的版权声明。

## 原模板场景素材

项目源自 [ITomPoland/portfolio-itom](https://github.com/ITomPoland/portfolio-itom)。原 README 对个人图片、三维纹理和文案声明了独立版权，并要求复用或复制前取得明确许可；原声明归档于 [UPSTREAM.md](UPSTREAM.md)。

维护者于 2026-10-08 确认将当前项目及其所含场景素材通过公开 GitHub 仓库分发。此发布确认不改变第三方素材的原有许可，也不将素材统一改为 MIT。

原场景素材不会因本项目代码采用 MIT 而成为 MIT 素材。请勿将原作者图片、纹理、音视频或文案当作可自由提取、商用或再次分发的素材包。定制自己的站点时，取得对应权利人的许可，或替换为自行制作、具有适用许可的素材。

## 时安个人内容与品牌

时安的个人形象、手写字形图片、品牌图、作品预览、文章配图和个人介绍，用于呈现本网站与项目。除单独注明的开源内容外，这些素材保留各自权利人的权利。代码 MIT 许可不授予他人使用时安身份、品牌或个人内容的权利。

`docs/images/` 为网站实景截图，用于项目介绍，可能同时包含原模板和个人品牌素材，不能作为独立素材包使用。

## 字体

| 字体 | 随仓库分发的许可 |
| :--- | :--- |
| LXGW WenKai 中文子集（ShianWenKai） | [`OFL-LXGW-WenKai.txt`](../public/fonts/OFL-LXGW-WenKai.txt) |
| Cabin Sketch | [`OFL-CabinSketch.txt`](../public/fonts/OFL-CabinSketch.txt) |
| Fredericka the Great | [`OFL-FrederickaTheGreat.txt`](../public/fonts/OFL-FrederickaTheGreat.txt) |
| Rubik Scribble | [`OFL-RubikScribble.txt`](../public/fonts/OFL-RubikScribble.txt) |
| Satisfy | [`LICENSE-Satisfy.txt`](../public/fonts/LICENSE-Satisfy.txt) |
| Barlow Condensed | [`start/fonts/OFL.txt`](../public/start/fonts/OFL.txt) |

中文字体子集使用 `ShianWenKai` 名称，来源与生成范围记录于 `public/fonts/chinese-font-manifest.json`。重新制作字体子集时，遵循对应许可中的版权、保留名称与分发要求。

## 依赖与构建分发

React、Three.js、React Three Fiber、Drei、GSAP、Vite 等依赖各自适用其软件许可，以锁定版本的包内许可为准。项目的 MIT 不替换依赖的许可。

构建时将根许可证复制为 `/template-LICENSE.txt`，字体许可文件随 `dist/` 一并分发。新增第三方素材时，应记录来源、权利人和适用许可，并保留需要随产物分发的通知。

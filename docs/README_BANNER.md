# README 横幅

`readme-banner.jpg` 用于 README 顶部，点击后进入 https://www.shian.life/。

横幅于 2026-10-09 使用 Codex 内置 imagegen 工具生成，参考本仓库已有的黑白铅笔线稿、纸张纹理、时安线稿人物、手绘走廊、云朵与纸飞机。参考图片为 `public/images/share/shian-digital-space.png` 和 `docs/images/about.png`。这是重新编排的概念视觉，不是网站实景截图。

素材使用规则沿用 [素材与第三方许可](ASSETS.md) 中的“时安个人内容与品牌”说明；第三方场景素材的原有许可保持适用。横幅仅作为本项目的品牌介绍素材，代码的 MIT 许可不授予他人使用时安身份与品牌的权利。

生成的 PNG 原图保留在本地；仓库使用按比例缩小并压缩的 JPEG。网站实际截图和线上分享图保持原样。

## 完整生成提示词

```text
Use case: compositing
Asset type: GitHub README top banner for the existing project 时安的数字空间 / ShiAn’s Digital Space.
Input images: Image 1 (corridor screenshot) is the character and visual-style reference; Image 2 (about-room screenshot) is the pencil-cloud and paper-airplane visual-style reference. Redesign these existing visual motifs as one refined new horizontal banner, not a screenshot. Preserve the identity and sketch design of the smiling wavy-haired hoodie character in Image 1: same face, hairstyle, hoodie, trousers and sneakers, casual friendly wave. Do not create a different person.
Primary request: A finished, very wide 3:1 horizontal composition, roughly 2100 by 700 pixels, blending light graphite pencil drawing and hand-lettered typography on near-white subtly textured sketchbook paper. The mood is playful, curious, personal, calm and open, as if an illustrator drew a welcoming digital world in a notebook. Everything grayscale: charcoal pencil lines, very pale graphite hatching and off-white paper. Maintain strong readability; abundant negative space. No color accents.
Composition: The left half is a spacious typographic area. On the right half the existing waving character stands beside an open sketched doorway into a gently receding hand-drawn corridor; the floor has sparse perspective pencil lines. Integrate a few loosely outlined paper clouds and one paper airplane from the reference vocabulary around the doorway, with a delicate dotted flight path leading toward the typographic area. The scene should remain simple and light, all important elements within generous margins. Character rendered once, not duplicated. A clean thoughtful cover, not a collage of rooms.
Text (verbatim): '时安的数字空间' is the main large title, in beautifully legible expressive Chinese handwriting matching the site's handwritten feel. Under it, smaller 'ShiAn’s Digital Space' in graceful pencil-like hand lettering. Beneath that, small clean 'www.shian.life'. Spell all three exactly. Only these three text items. No badges or navigation labels from the screenshots.
Constraints: Faithful black-and-white pencil-sketch aesthetic and friendly existing character. No photographs, no solid 3D clay forms, no glossy materials, no saturated colors, no tech logos, no neon cyberpunk, no dark background, no fake UI, no watermarks, no extra people. Original re-composition of the supplied motifs, not pixel-for-pixel copying of either screenshot. The result must work as a GitHub README banner at 900px width.
```

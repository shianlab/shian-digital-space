// Confirmed by the user. The production domain is configured here; publication is stage 14.
export const SITE_NAME = 'ShiAn’s Digital Space';
export const OFFICIAL_ACCOUNT_NAME = '时安的AI实验室';
export const SITE_PROFILE = {
    name: '时安', brand: 'SHIAN', url: 'https://www.shian.life',
    identities: ['大模型工程师', '软件开发工程师', '内容创作者'],
    description: '时安的个人数字空间。在三维手绘场景中探索 AI 应用、软件作品、文章与知识资源，了解时安并取得联系。',
    image: '/images/share/shian-digital-space.png',
    imageAlt: 'ShiAn’s Digital Space：手绘走廊中的 SHIAN、三个身份标签与时安线稿人物。',
};

export const PAGE_META = {
    null: { path: '/', title: SITE_NAME, description: SITE_PROFILE.description },
    gallery: { path: '/gallery', title: `作品展厅 — ${SITE_NAME}`, description: '查看时安的作品：ShiAn’s Digital Space、openGEO 知识库、时安字库工作台与学匣 · LearnKit。' },
    studio: { path: '/studio', title: `工作室 — ${SITE_NAME}`, description: '阅读时安的 AI 文章、小红书图文与抖音视频，了解潮玩创作和手写字库，访问 OpenClaw 知识库与 ShiAn Skill Hub。' },
    about: { path: '/about', title: `关于我 — ${SITE_NAME}`, description: '了解时安的个人介绍、专业资质、竞赛荣誉，以及在飞书、ZCode、Trae Friends 和 Way to AGI 的社区身份。' },
    contact: { path: '/contact', title: `联系我 — ${SITE_NAME}`, description: '通过微信、邮箱联系时安，或访问时安的AI实验室、小红书、GitHub 与 X。' },
};

// Personal introduction and community roles confirmed by the user; see stage-10/sources/.
// The 2026-10-05 user message supersedes older titles in the Feishu snapshot.
import { SITE_PROFILE } from './site-profile.js';

const qualifications = [
    { id: 'acp', name: '阿里云 ACP 大模型高级工程师', cardTitle: '阿里云 ACP\n大模型高级工程师' },
    { id: 'ai-trainer', name: '人工智能高级训练师', cardTitle: '人工智能\n高级训练师' },
];
const honors = [
    { id: 'feishu-double-champion', name: '飞书 OpenClaw 虾神争霸赛 & ArkClaw 挑战赛 双赛冠军', displayTitle: '飞书 OpenClaw 虾神争霸赛 & ArkClaw 挑战赛\n双赛冠军' },
];
const communityRoles = ['飞书 AI 知识库版主', 'ZCode Talent', 'Trae Friends 贵阳负责人', 'Way to AGI 贵阳共建者'];

export const ABOUT_PROFILE = {
    name: SITE_PROFILE.name,
    brand: SITE_PROFILE.brand,
    identities: SITE_PROFILE.identities,
    tags: ['00 后', 'OPC', 'INTJ'],
    motto: '用 AI，把想法变成作品。',
    paragraphs: [
        '我是时安，一名 AI 应用开发者，也是一名内容创作者。我正在围绕 AI 做自己的项目和服务，探索一个人如何借助 AI，把更多想法变成可以使用的东西。',
        '我喜欢研究 AI 工具、Vibe Coding、Agent、Skill、知识库和自动化工作流，也喜欢把散乱的资料、想法和流程整理成清楚可用的系统。',
        '我会研究表达、选题和内容传播。平时偏向安静地研究问题，也有很强的表达欲，喜欢组织活动、做分享，和同频的人交流。',
        '我正在探索一种更自由的工作方式：一个人，也能借助 AI 做出更多有意思的东西。',
    ],
    qualifications,
    honors,
    communityRoles,
    practices: [
        { id: 'community', title: '社区共建', description: communityRoles.slice(2).join('\n') },
        { id: 'knowledge', title: '知识分享', description: communityRoles.slice(0, 2).join('\n') },
    ],
    interests: ['AI 工具', 'Vibe Coding', 'Agent', 'Skill', '知识库', '自动化工作流', '内容创作'],
    sourceUrl: 'https://larkcommunity.feishu.cn/wiki/PZfvwUkWNizauUkMXXucGPKcnCe',
};

export const ABOUT_INTRO_DETAIL = {
    id: 'shian-introduction',
    title: '关于时安',
    platformConfig: { label: '个人介绍' },
    description: [
        ...ABOUT_PROFILE.paragraphs,
        `专业资质\n${qualifications.map(item => item.name).join('\n')}`,
        `竞赛荣誉\n${honors.map(item => item.name).join('\n')}`,
        `社区与共建\n${communityRoles.join('\n')}`,
    ].join('\n\n'),
};

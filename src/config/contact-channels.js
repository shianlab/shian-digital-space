import { OFFICIAL_ACCOUNT_NAME } from './site-profile.js';
import { STUDIO_CONTENT } from './studio-content.js';
// Account names and links are taken from the user's personal introduction and
// provided articles. Read evidence: docs/planning/materials/stage-11/sources/.
export const CONTACT_CHANNELS = [
    {
        id: 'wechat', label: '微信', title: '微信联系', account: 'shian_V',
        description: '可以通过微信与我联系。复制微信号后，在微信中搜索添加。',
        copyValue: 'shian_V', copyLabel: '复制微信号',
    },
    {
        id: 'email', label: '邮箱', title: '邮件联系', account: 'shianlab.ai@gmail.com',
        description: '也可以给我发邮件，聊聊你的想法。',
        copyValue: 'shianlab.ai@gmail.com', copyLabel: '复制邮箱',
        url: 'mailto:shianlab.ai@gmail.com', actionLabel: '打开邮件应用',
    },
    {
        id: 'official-account', label: '公众号', title: OFFICIAL_ACCOUNT_NAME, account: OFFICIAL_ACCOUNT_NAME,
        description: '记录 AI 时代的探索与思考，分享工具、方法、实践与创造。在微信中搜索公众号名称，或从文章页进入公众号。',
        copyValue: OFFICIAL_ACCOUNT_NAME, copyLabel: '复制公众号名称',
        url: STUDIO_CONTENT.find(item => item.id === 'jev').url, actionLabel: '阅读公众号文章',
    },
    {
        id: 'xiaohongshu', label: '小红书', title: '小红书 · 时安lab', account: '时安lab',
        description: '在小红书找到时安lab。', url: 'https://www.xiaohongshu.com/user/profile/5b349d7f4eacab45f195f82c', actionLabel: '访问小红书主页',
    },
    {
        id: 'github', label: 'GitHub', title: 'GitHub · shianlab', account: 'shianlab',
        description: '在 GitHub 查看我的开源项目。',
        url: 'https://github.com/shianlab', actionLabel: '访问 GitHub 主页',
    },
    {
        id: 'x', label: 'X', title: 'X · 时安', account: '@ShiAnOPC',
        description: '在 X 找到时安。', url: 'https://x.com/ShiAnOPC', actionLabel: '访问 X 主页',
    },
];

export function contactDetail(channel) {
    return {
        ...channel, id: `contact-${channel.id}`, contact: true,
        platformConfig: { label: channel.label },
    };
}

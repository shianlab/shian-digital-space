export { SITE_NAME } from './site-profile.js';
export { ABOUT_PROFILE } from './about-profile.js';
import { ABOUT_PROFILE } from './about-profile.js';
export const CHINESE_FONT = '/fonts/ShianWenKai-UI.woff';
export const CHINESE_INPUT_FONT = '/fonts/ShianWenKai-CJK.woff';
export const CHINESE_FONT_FAMILY = "'Shian WenKai', 'Microsoft YaHei', sans-serif";

export const ENTRANCE_COPY = {
    enter: '进入时安的数字空间',
    bugFixed: '问题解决了！',
    duckQuotes: ['试试 console.log()？', '清过缓存了吗？', '我这儿能运行呀！', '关掉再打开试试？',
        '会不会是 CSS 的问题？', '检查一下，是不是少了分号？', '看过报错信息了吗？',
        '去 Stack Overflow 找找答案？', '插上电了吗？', '上线也能运行！'],
};

export const UI = {
    back: '返回走廊', map: '地图', openMap: '打开地图', closeMap: '关闭地图', mapImage: '空间地图',
    goTo: name => `前往${name}`, here: '你在这里', audio: '声音设置', closeAudio: '关闭声音设置',
    music: '背景音乐', musicVolume: '背景音乐音量', sfx: '音效', sfxVolume: '音效音量',
    achievements: '探索成就', closeAchievements: '关闭探索成就', explored: (count, total) => `已探索 ${count}/${total}`,
    entrance: '点击门，进入空间。声音当前', soundOn: '已开启', soundOff: '已关闭', mute: '关闭声音', unmute: '开启声音',
    loading: '正在加载…', closeDetails: '关闭详情', content: '内容', openLink: '查看原页面',
    views: count => `${count} 次浏览`, entered: name => `已进入${name}`, inRoom: name => `你在${name}。`,
};

export const EXPLORATION = {
    corridor_enter: { id: 'corridor_enter', label: '点击门，进入空间', title: '探索者' },
    corridor_explore: { id: 'corridor_explore', label: '滚动，探索走廊', title: '漫游者' },
    about_fly: { id: 'about_fly', label: '滚动，飞过我的故事', title: '云中漫步者' },
    studio_interact: { id: 'studio_interact', label: '拖动，旋转浏览', title: '导演' },
    gallery_inspect: { id: 'gallery_inspect', label: '点击作品，查看详情', title: '作品鉴赏家' },
    contact_choose: { id: 'contact_choose', label: '选择一种联系方式', title: '善于交流' },
};

export const FORM = {
    email: '邮箱', subject: '主题', message: '留言内容', emailPlaceholder: '你的邮箱',
    subjectPlaceholder: '留言主题', messagePlaceholder: '想聊些什么？', edit: '编辑留言', done: '完成编辑',
    emailRequired: '请填写邮箱', emailInvalid: '邮箱格式不正确', subjectRequired: '请填写主题',
    messageRequired: '请填写留言内容', allRequired: '请填写完整信息', sending: '发送中…', send: '发送留言',
    sent: '留言已发送。', failed: '发送失败，请稍后重试。', unavailable: '留言功能准备中',
    previewNotice: '可以先写下想说的话，留言发送功能还在准备中。',
    wait: minutes => `请在 ${minutes} 分钟后再发送。`, rejected: '这条留言未能通过校验，请检查内容后重试。',
    domainInvalid: '该邮箱域名暂时无法接收邮件，请检查地址。', count: (count, limit) => `${count} / ${limit} 字`,
};

export const PROFILE_PARAGRAPHS = ABOUT_PROFILE.paragraphs;

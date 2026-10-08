// These are the original pixels from the approved B image, not a substitute font.
const entry = (file, width, height) => ({ texture: `/textures/shian/handwriting/${file}.png`, aspect: width / height });
export const HANDWRITING = {
    '时安的数字空间': entry('digital-space', 713, 132),
    '作品展厅': entry('gallery', 257, 77),
    '工作室': entry('studio', 202, 77),
    '关于我': entry('about', 194, 78),
    '联系我': entry('contact', 208, 81),
    '大模型工程师': entry('llm-engineer', 291, 57),
    '软件开发工程师': entry('software-engineer', 347, 55),
    '内容创作者': entry('content-creator', 260, 57),
};

const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
export const graphemes = value => Array.from(segmenter.segment(value), part => part.segment);
export const limitText = (value, limit) => graphemes(value).slice(0, limit).join('');
export const textLength = value => graphemes(value).length;

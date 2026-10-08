// Stable IDs and legacy texture keys stay separate from visitor-facing text.
export const ROOMS = {
    gallery: { id: 'gallery', legacyLabel: 'THE GALLERY', name: '作品展厅', shortName: '作品', path: '/gallery', x: 43, y: 72 },
    studio: { id: 'studio', legacyLabel: 'THE STUDIO', name: '工作室', shortName: '工作室', path: '/studio', x: 57, y: 55 },
    about: { id: 'about', legacyLabel: 'THE ABOUT', name: '关于我', shortName: '关于', path: '/about', x: 43, y: 38 },
    contact: { id: 'contact', legacyLabel: "LET'S CONNECT", name: '联系我', shortName: '联系', path: '/contact', x: 57, y: 25 },
};

export const MAP_ROOMS = ['about', 'gallery', 'contact', 'studio'].map(id => ROOMS[id]);
export const ROOM_BY_LABEL = Object.fromEntries(Object.values(ROOMS).map(room => [room.legacyLabel, room]));
export const roomName = id => ROOMS[id]?.name || '走廊';
export const roomFromPath = path => Object.values(ROOMS).find(room => room.path === path.replace(/\/+$/, ''))?.id ?? null;

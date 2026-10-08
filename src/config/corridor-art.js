// User-owned art and original handwritten glyphs; docs/planning/corridor-personal-art.md.
export const CORRIDOR_ART = {
    aiFirst: {
        texture: '/textures/shian/corridor/art/ai-first.png',
        width: 1.7, height: 1,
    },
    painting: {
        texture: '/textures/shian/corridor/art/spider-lilies.webp',
        idleStrength: .42,
        width: 2.04, height: 1.36, frameWidth: 2.5, frameHeight: 1.94,
    },
    calligraphy: {
        texture: '/textures/shian/corridor/art/lifelong-learning-repaired.png',
        // Crop blank margins in the texture coordinates; keep the supplied bitmap unchanged.
        uvCrop: { sourceWidth: 941, sourceHeight: 1671, left: 276, top: 44, width: 486, height: 1607 },
        width: 1.85 * 486 / 1607, height: 1.85, y: .3, offsetBeforeVent: 2.9,
    },
};

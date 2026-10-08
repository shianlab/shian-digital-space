import { SITE_PROFILE } from './site-profile.js';
// Stage 5 image coordinates are measured from the top left, in pixels.
export const SHIAN_IP = {
    frames: Array.from({ length: 9 }, (_, i) => `/textures/shian/corridor/${String(i + 1).padStart(2, '0')}.webp`),
    canvas: { width: 1254, height: 1254 },
    foot: { x: 612, y: 1220 },
    crownY: 47,
    visibleHeight: 2.1,
    floorY: -1.74,
    fps: 12,
    stillFrame: 5,
    sequence: [1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2],
    labels: SITE_PROFILE.identities,
};

export const WELCOME_CAMERA_Z = 11.65;
export const SHIAN_ENTRANCE = {
    sign: '/textures/shian/entrance/sign-blank.webp',
    doorLeftSketch: '/textures/shian/entrance/door_left_sketch.webp',
    doorRightSketch: '/textures/shian/entrance/door_right_sketch.webp',
    doorLeftPainted: '/textures/shian/entrance/door_left_painted.webp',
    doorRightPainted: '/textures/shian/entrance/door_right_painted.webp',
    // Use the complete figure so the window sill, rather than a cropped hoodie, ends the silhouette.
    window: '/textures/shian/corridor/05.webp',
};

export function getEntranceCameraZ(aspect) {
    // Frame the original facade, including the right window, on portrait screens.
    return 22 + Math.max(6, 7.6 / (2 * Math.tan(Math.PI / 6) * aspect));
}

export function getWelcomeTextScale(aspect) {
    const width = 2 * (WELCOME_CAMERA_Z - 7.7) * Math.tan(Math.PI / 6) * aspect;
    return Math.min(1, width / 2.65);
}

export function getAvatarLayout(visibleHeight = SHIAN_IP.visibleHeight) {
    const unitsPerPixel = visibleHeight / (SHIAN_IP.foot.y - SHIAN_IP.crownY);
    return {
        width: SHIAN_IP.canvas.width * unitsPerPixel,
        height: SHIAN_IP.canvas.height * unitsPerPixel,
        offsetX: (SHIAN_IP.canvas.width / 2 - SHIAN_IP.foot.x) * unitsPerPixel,
        offsetY: (SHIAN_IP.foot.y - SHIAN_IP.canvas.height / 2) * unitsPerPixel,
    };
}

export function getDodgeTarget(distance) {
    const t = distance > 0 && distance < 3 ? (3 - distance) / 3
        : distance <= 0 && distance > -2 ? (distance + 2) / 2 : 0;
    return t === 0 ? 0 : -1.5 * t * (2 - t);
}

export function advanceWave(index, elapsed, delta, fps) {
    const time = elapsed + delta;
    const steps = Math.floor(time * fps);
    return { index: (index + steps) % SHIAN_IP.sequence.length, elapsed: time - steps / fps };
}

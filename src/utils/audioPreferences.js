export function normalizeVolume(value, fallback) {
    if (value === null || value === '' || value === undefined) return fallback;
    const volume = Number(value);
    return Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : fallback;
}

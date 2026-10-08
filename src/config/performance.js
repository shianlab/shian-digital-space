export const TIERS = { HIGH:'HIGH', MEDIUM:'MEDIUM', LOW:'LOW' };
export const PERFORMANCE_SETTINGS = {
    HIGH: { dpr:[1,2], shadows:true, antialias:true, powerPreference:'high-performance', physicsStep:1/60, textureQuality:'high', particleCount:1 },
    MEDIUM: { dpr:[1,1.5], shadows:false, antialias:true, powerPreference:'default', physicsStep:1/60, textureQuality:'medium', particleCount:.6 },
    LOW: { dpr:[.8,1], shadows:false, antialias:false, powerPreference:'low-power', physicsStep:1/45, textureQuality:'low', particleCount:.3 },
};
export function detectDeviceTier({ userAgent='', cores, memory, coarsePointer=false }) {
    const mobile = /iPhone|iPad|iPod|Android/i.test(userAgent) || coarsePointer;
    if (memory && memory <= 4) return TIERS.LOW;
    if (cores && cores <= 4) return mobile ? TIERS.LOW : TIERS.MEDIUM;
    return mobile ? TIERS.MEDIUM : TIERS.HIGH;
}

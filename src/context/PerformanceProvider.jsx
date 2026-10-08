import { useState, useCallback } from 'react';
import { PerformanceContext } from './PerformanceContext';
import { TIERS, PERFORMANCE_SETTINGS, detectDeviceTier } from '../config/performance';
export function PerformanceProvider({ children }) {
    // Choose the tier before creating WebGL so a phone does not start with desktop settings.
    const [tier, setTier] = useState(() => detectDeviceTier({
        userAgent:navigator.userAgent, cores:navigator.hardwareConcurrency, memory:navigator.deviceMemory,
        coarsePointer:window.matchMedia('(pointer: coarse)').matches,
    }));
    const downgradeTier = useCallback(() => setTier(value => value === TIERS.HIGH ? TIERS.MEDIUM : TIERS.LOW), []);
    return <PerformanceContext.Provider value={{ tier, settings:PERFORMANCE_SETTINGS[tier], isDetecting:false, downgradeTier }}>{children}</PerformanceContext.Provider>;
}

import { createContext, useContext } from 'react';
export const PerformanceContext = createContext(null);
export { TIERS } from '../config/performance';
export function usePerformance() {
    const context = useContext(PerformanceContext);
    if (!context) throw new Error('usePerformance must be used within a PerformanceProvider');
    return context;
}

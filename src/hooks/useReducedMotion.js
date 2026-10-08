import { useSyncExternalStore } from 'react';

const subscribe = callback => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
};
const snapshot = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function useReducedMotion() {
    return useSyncExternalStore(subscribe, snapshot, () => false);
}

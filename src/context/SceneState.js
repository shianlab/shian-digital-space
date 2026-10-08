import { createContext, useContext } from 'react';

export const SceneContext = createContext(null);

export function useScene() {
    const context = useContext(SceneContext);
    if (!context) throw new Error('useScene must be used within a SceneProvider');
    return context;
}

import { createContext, useContext } from 'react';
import { EXPLORATION } from '../config/zh-CN';
export const ACHIEVEMENTS = EXPLORATION;
export const AchievementsContext = createContext();
export const useAchievements = () => useContext(AchievementsContext);

"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface GamificationStats {
  user_id: string;
  points?: number; // Points awarded in this action (for toast notifications)
  bonus_message?: string; // Bonus message if applicable (for toast notifications)
  lifetime_xp: number;
  level: number;
  level_name: string;
  level_icon: string;
  xp_to_next_level: number;
  current_year_xp: number;
  current_year: number;
  annual_tier: string;
  tier_name: string;
  tier_icon: string;
  xp_to_next_tier: number;
  current_streak: number;
  longest_streak: number;
  reports_submitted: number;
  tasks_completed: number;
  current_rank?: number; // Optional - not always returned from backend
  level_changed?: boolean; // Indicates if level changed
  old_level?: number;
  new_level?: number;
  tier_changed?: boolean; // Indicates if tier changed
  old_tier?: string;
  new_tier?: string;
}

interface GamificationContextType {
  refreshTrigger: number;
  latestStats: GamificationStats | null;
  triggerRefresh: (newStats?: GamificationStats) => void;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [latestStats, setLatestStats] = useState<GamificationStats | null>(null);

  const triggerRefresh = useCallback((newStats?: GamificationStats) => {
    // console.log('[GamificationContext] triggerRefresh called with newStats:', newStats);
    if (newStats) {
      // console.log('[GamificationContext] Setting latestStats:', newStats);
      setLatestStats(newStats);
    }
    setRefreshTrigger(prev => {
      // console.log('[GamificationContext] Incrementing refreshTrigger from', prev, 'to', prev + 1);
      return prev + 1;
    });
  }, []);

  return (
    <GamificationContext.Provider value={{ refreshTrigger, latestStats, triggerRefresh }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}

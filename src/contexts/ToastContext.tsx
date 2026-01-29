"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'xp' | 'level_up' | 'tier_up' | 'badge_unlock';
  xpAmount?: number;
  bonusMessage?: string;
  levelInfo?: { level: number; name: string; icon: string };
  tierInfo?: { tier: string; name: string; icon: string };
  badgeInfo?: { name: string; icon: string; rarity: string };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: Toast['type'], options?: { xpAmount?: number; bonusMessage?: string }) => void;
  showXPToast: (xpAmount: number, bonusMessage?: string) => void;
  showLevelUpToast: (level: number, levelName: string, levelIcon: string) => void;
  showTierUpToast: (tier: string, tierName: string, tierIcon: string) => void;
  showBadgeUnlockToast: (name: string, icon: string, rarity: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    message: string,
    type: Toast['type'],
    options?: { xpAmount?: number; bonusMessage?: string }
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      message,
      type,
      xpAmount: options?.xpAmount,
      bonusMessage: options?.bonusMessage,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const showXPToast = useCallback((xpAmount: number, bonusMessage?: string) => {
    showToast(
      `+${xpAmount} XP earned!`,
      'xp',
      { xpAmount, bonusMessage }
    );
  }, [showToast]);

  const showLevelUpToast = useCallback((level: number, levelName: string, levelIcon: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      message: 'Level Up!',
      type: 'level_up',
      levelInfo: { level, name: levelName, icon: levelIcon }
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after 5 seconds (longer for level-up celebration)
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const showTierUpToast = useCallback((tier: string, tierName: string, tierIcon: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      message: 'Tier Up!',
      type: 'tier_up',
      tierInfo: { tier, name: tierName, icon: tierIcon }
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after 5 seconds (longer for tier-up celebration)
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const showBadgeUnlockToast = useCallback((name: string, icon: string, rarity: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      message: 'Badge Unlocked!',
      type: 'badge_unlock',
      badgeInfo: { name, icon, rarity }
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after 5 seconds (longer for badge unlock celebration)
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, showXPToast, showLevelUpToast, showTierUpToast, showBadgeUnlockToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast Container Component
function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

// Individual Toast Item
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-600 border-green-500 shadow-xl opacity-100';
      case 'error':
        return 'bg-red-600 border-red-500 shadow-xl opacity-100';
      case 'info':
        return 'bg-blue-600 border-blue-500 shadow-xl opacity-100';
      case 'xp':
        return 'bg-gray-800 border-purple-400 shadow-2xl opacity-100';
      case 'level_up':
        return 'bg-gradient-to-r from-yellow-500 via-orange-600 to-yellow-500 border-yellow-400 shadow-2xl animate-pulse opacity-100';
      case 'tier_up':
        return 'bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 border-cyan-400 shadow-2xl animate-pulse opacity-100';
      case 'badge_unlock':
        return 'bg-gradient-to-r from-purple-500 via-pink-600 to-purple-500 border-purple-400 shadow-2xl animate-pulse opacity-100';
      default:
        return 'bg-gray-700 border-gray-600 shadow-xl opacity-100';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      case 'xp':
        return '🎉';
      case 'level_up':
        return toast.levelInfo?.icon || '🏆';
      case 'tier_up':
        return toast.tierInfo?.icon || '💎';
      case 'badge_unlock':
        return toast.badgeInfo?.icon || '🏅';
      default:
        return '📢';
    }
  };

  return (
    <div
      className={`
        ${getToastStyles()}
        pointer-events-auto
        min-w-[300px] max-w-md
        rounded-lg border-2 shadow-2xl
        p-4
        animate-slide-in-right
        flex items-start gap-3
        transform transition-all duration-300
      `}
    >
      {/* Icon */}
      <div className="text-2xl flex-shrink-0">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.type === 'xp' && toast.xpAmount ? (
          <>
            <p className="text-white font-extrabold text-xl drop-shadow-lg">
              +{toast.xpAmount} XP
            </p>
            {toast.bonusMessage && (
              <p className="text-white font-semibold text-sm mt-1 drop-shadow">
                {toast.bonusMessage}
              </p>
            )}
          </>
        ) : toast.type === 'level_up' && toast.levelInfo ? (
          <>
            <p className="text-white font-extrabold text-2xl drop-shadow-lg">
              Level Up!
            </p>
            <p className="text-white font-bold text-lg mt-1 drop-shadow">
              {toast.levelInfo.icon} {toast.levelInfo.name}
            </p>
            <p className="text-white/90 font-medium text-sm mt-1 drop-shadow">
              You're now Level {toast.levelInfo.level}!
            </p>
          </>
        ) : toast.type === 'tier_up' && toast.tierInfo ? (
          <>
            <p className="text-white font-extrabold text-2xl drop-shadow-lg">
              Tier Up!
            </p>
            <p className="text-white font-bold text-lg mt-1 drop-shadow">
              {toast.tierInfo.icon} {toast.tierInfo.name} 2026
            </p>
            <p className="text-white/90 font-medium text-sm mt-1 drop-shadow">
              Amazing progress this year!
            </p>
          </>
        ) : toast.type === 'badge_unlock' && toast.badgeInfo ? (
          <>
            <p className="text-white font-extrabold text-2xl drop-shadow-lg">
              Badge Unlocked!
            </p>
            <p className="text-white font-bold text-lg mt-1 drop-shadow">
              {toast.badgeInfo.icon} {toast.badgeInfo.name}
            </p>
            <p className="text-white/90 font-medium text-sm mt-1 drop-shadow">
              {toast.badgeInfo.rarity.charAt(0).toUpperCase() + toast.badgeInfo.rarity.slice(1)} badge earned!
            </p>
          </>
        ) : (
          <p className="text-white font-medium">
            {toast.message}
          </p>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="text-white/80 hover:text-white transition-colors flex-shrink-0"
        aria-label="Close notification"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

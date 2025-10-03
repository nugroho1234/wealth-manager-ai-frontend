'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  persistent?: boolean; // If true, won't auto-dismiss
  actionUrl?: string; // Optional URL to navigate to when clicked
  metadata?: {
    uploadId?: string;
    documentId?: string;
    processStage?: string;
  };
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
}

// Action types
type NotificationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'CLEAR_ALL_NOTIFICATIONS' }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] };

// Initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
};

// Reducer
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case 'ADD_NOTIFICATION': {
      const newNotifications = [action.payload, ...state.notifications];
      const unreadCount = newNotifications.filter(n => !n.isRead).length;
      return {
        ...state,
        notifications: newNotifications,
        unreadCount,
      };
    }
    
    case 'REMOVE_NOTIFICATION': {
      const filteredNotifications = state.notifications.filter(n => n.id !== action.payload);
      const unreadCount = filteredNotifications.filter(n => !n.isRead).length;
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount,
      };
    }
    
    case 'MARK_AS_READ': {
      const updatedNotifications = state.notifications.map(n =>
        n.id === action.payload ? { ...n, isRead: true } : n
      );
      const unreadCount = updatedNotifications.filter(n => !n.isRead).length;
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount,
      };
    }
    
    case 'MARK_ALL_AS_READ': {
      const updatedNotifications = state.notifications.map(n => ({ ...n, isRead: true }));
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: 0,
      };
    }
    
    case 'CLEAR_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
      };
    
    case 'SET_NOTIFICATIONS': {
      const unreadCount = action.payload.filter(n => !n.isRead).length;
      return {
        ...state,
        notifications: action.payload,
        unreadCount,
      };
    }
    
    default:
      return state;
  }
}

// Context interface
interface NotificationContextType extends NotificationState {
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => string;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
  
  // Convenience methods for different notification types
  notifySuccess: (title: string, message: string, options?: Partial<Notification>) => string;
  notifyError: (title: string, message: string, options?: Partial<Notification>) => string;
  notifyInfo: (title: string, message: string, options?: Partial<Notification>) => string;
  notifyWarning: (title: string, message: string, options?: Partial<Notification>) => string;
  
  // Upload-specific notifications
  notifyUploadProgress: (stage: string, message: string, uploadId: string) => string;
  notifyUploadComplete: (message: string, uploadId: string, documentId?: string) => string;
  notifyUploadError: (message: string, uploadId: string, error?: string) => string;
}

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider component
interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        // Convert timestamp strings back to Date objects and ensure title/message are strings
        const notifications = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
          title: typeof n.title === 'string' ? n.title : 'Notification',
          message: typeof n.message === 'string' ? n.message : JSON.stringify(n.message),
        }));
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
      }
    } catch (error) {
      console.error('Failed to load notifications from localStorage:', error);
      // Clear corrupted notifications
      localStorage.removeItem('notifications');
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('notifications', JSON.stringify(state.notifications));
    } catch (error) {
      console.error('Failed to save notifications to localStorage:', error);
    }
  }, [state.notifications]);

  // Auto-remove non-persistent notifications after 5 seconds
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    state.notifications.forEach(notification => {
      if (!notification.persistent && notification.type !== 'error') {
        const timer = setTimeout(() => {
          dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
        }, 5000);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [state.notifications]);

  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): string => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notification: Notification = {
      ...notificationData,
      id,
      timestamp: new Date(),
      isRead: false,
    };
    
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const markAsRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_AS_READ', payload: id });
  }, []);

  const markAllAsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_AS_READ' });
  }, []);

  const clearAllNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
  }, []);

  // Convenience methods
  const notifySuccess = useCallback((title: string, message: string, options?: Partial<Notification>): string => {
    return addNotification({
      type: 'success',
      title: typeof title === 'string' ? title : 'Success',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      ...options,
    });
  }, [addNotification]);

  const notifyError = useCallback((title: string, message: string, options?: Partial<Notification>): string => {
    return addNotification({
      type: 'error',
      title: typeof title === 'string' ? title : 'Error',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      persistent: true, // Errors should persist until manually dismissed
      ...options,
    });
  }, [addNotification]);

  const notifyInfo = useCallback((title: string, message: string, options?: Partial<Notification>): string => {
    return addNotification({
      type: 'info',
      title: typeof title === 'string' ? title : 'Info',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      ...options,
    });
  }, [addNotification]);

  const notifyWarning = useCallback((title: string, message: string, options?: Partial<Notification>): string => {
    return addNotification({
      type: 'warning',
      title: typeof title === 'string' ? title : 'Warning',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      ...options,
    });
  }, [addNotification]);

  // Upload-specific notifications
  const notifyUploadProgress = useCallback((stage: string, message: string, uploadId: string): string => {
    return addNotification({
      type: 'info',
      title: 'Upload Progress',
      message: `${stage}: ${message}`,
      metadata: { uploadId, processStage: stage },
      actionUrl: '/admin/documents',
    });
  }, [addNotification]);

  const notifyUploadComplete = useCallback((message: string, uploadId: string, documentId?: string): string => {
    return addNotification({
      type: 'success',
      title: 'Upload Complete',
      message,
      metadata: { uploadId, documentId },
      actionUrl: '/admin/documents',
      persistent: true,
    });
  }, [addNotification]);

  const notifyUploadError = useCallback((message: string, uploadId: string, error?: string): string => {
    return addNotification({
      type: 'error',
      title: 'Upload Failed',
      message: error ? `${message}: ${error}` : message,
      metadata: { uploadId },
      actionUrl: '/admin/documents',
      persistent: true,
    });
  }, [addNotification]);

  const contextValue: NotificationContextType = {
    ...state,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
    notifyUploadProgress,
    notifyUploadComplete,
    notifyUploadError,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use notification context
export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
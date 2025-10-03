'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, Notification } from '@/contexts/NotificationContext';
import Sidebar from '@/components/Sidebar';

type FilterType = 'all' | 'unread' | 'read' | 'info' | 'success' | 'warning' | 'error';

function NotificationsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter notifications based on current filter and search term
  const filteredNotifications = notifications.filter(notification => {
    // Apply filter
    let matchesFilter = true;
    switch (filter) {
      case 'unread':
        matchesFilter = !notification.isRead;
        break;
      case 'read':
        matchesFilter = notification.isRead;
        break;
      case 'info':
      case 'success':
      case 'warning':
      case 'error':
        matchesFilter = notification.type === filter;
        break;
      default:
        matchesFilter = true;
    }

    // Apply search term
    const matchesSearch = searchTerm === '' || 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getNotificationBgColor = (type: string, isRead: boolean) => {
    const opacity = isRead ? '50' : '100';
    switch (type) {
      case 'success':
        return `bg-green-${opacity} border-green-200`;
      case 'error':
        return `bg-red-${opacity} border-red-200`;
      case 'warning':
        return `bg-yellow-${opacity} border-yellow-200`;
      case 'info':
      default:
        return `bg-blue-${opacity} border-blue-200`;
    }
  };

  const getNotificationTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return timestamp.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: timestamp.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getFilterCount = (filterType: FilterType) => {
    switch (filterType) {
      case 'unread':
        return notifications.filter(n => !n.isRead).length;
      case 'read':
        return notifications.filter(n => n.isRead).length;
      case 'info':
      case 'success':
      case 'warning':
      case 'error':
        return notifications.filter(n => n.type === filterType).length;
      default:
        return notifications.length;
    }
  };

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-4xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                {unreadCount > 0 
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                  : 'All caught up! No unread notifications'
                }
              </p>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Mark all as read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-6">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'unread', 'read', 'info', 'success', 'warning', 'error'] as FilterType[]).map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    filter === filterType
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  <span className="ml-1 text-xs opacity-75">
                    ({getFilterCount(filterType)})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-12 shadow-lg border border-white/20 text-center">
                <div className="text-6xl mb-4">🔔</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || filter !== 'all' 
                    ? 'No notifications match your filters'
                    : 'No notifications yet'
                  }
                </h3>
                <p className="text-gray-600">
                  {searchTerm || filter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'When you receive notifications, they\'ll appear here'
                  }
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-md border 
                    transition-all duration-200 cursor-pointer hover:shadow-lg
                    ${getNotificationBgColor(notification.type, notification.isRead)}
                    ${!notification.isRead ? 'ring-2 ring-primary-200' : ''}
                    ${notification.actionUrl ? 'hover:scale-[1.01]' : ''}
                  `}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`text-sm font-semibold ${getNotificationTextColor(notification.type)}`}>
                            {notification.title}
                            {!notification.isRead && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                New
                              </span>
                            )}
                          </h4>
                          <p className={`text-sm mt-1 ${notification.isRead ? 'text-gray-600' : 'text-gray-800'}`}>
                            {notification.message}
                          </p>
                          
                          {/* Metadata */}
                          {notification.metadata && (
                            <div className="mt-2 text-xs text-gray-500">
                              {notification.metadata.processStage && (
                                <span className="mr-3">Stage: {notification.metadata.processStage}</span>
                              )}
                              {notification.metadata.uploadId && (
                                <span>Upload ID: {notification.metadata.uploadId.slice(-8)}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-4">
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                            title="Remove notification"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Load More Button (for future pagination) */}
          {filteredNotifications.length > 0 && filteredNotifications.length >= 20 && (
            <div className="text-center mt-8">
              <button className="px-6 py-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white transition-colors duration-200 shadow-md border border-gray-200">
                Load More Notifications
              </button>
            </div>
          )}
        </main>
      </div>
    </Sidebar>
  );
}

export default function NotificationsPage() {
  return <NotificationsContent />;
}
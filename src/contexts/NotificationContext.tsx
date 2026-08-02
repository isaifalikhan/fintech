import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'insight';
  icon?: any;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionUrl?: string;
  category: 'cashflow' | 'categorization' | 'insight' | 'reminder' | 'system';
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('financeOS_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        const withDates = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(withDates);
      } catch (e) {
        console.error('Failed to load notifications:', e);
      }
    }
  }, []);

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem('financeOS_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Generate sample notifications on mount (for demo)
  useEffect(() => {
    if (notifications.length === 0) {
      const sampleNotifications: Omit<Notification, 'id' | 'timestamp' | 'read'>[] = [
        {
          title: 'Cash Flow Alert',
          message: 'Your balance may drop below PKR 500K in 15 days',
          type: 'warning',
          category: 'cashflow',
          actionLabel: 'View Forecast',
          actionUrl: '/dashboard'
        },
        {
          title: '12 Transactions Need Review',
          message: 'Help AI improve categorization accuracy',
          type: 'info',
          category: 'categorization',
          actionLabel: 'Review Now',
          actionUrl: '/dashboard'
        },
        {
          title: 'Profit Margin Increased',
          message: 'Your profit margin improved by 3.2% this month',
          type: 'success',
          category: 'insight',
          actionLabel: 'See Details',
          actionUrl: '/dashboard'
        },
        {
          title: 'Invoice Payment Overdue',
          message: 'Client ABC Corp payment is 15 days overdue',
          type: 'error',
          category: 'reminder',
          actionLabel: 'Send Reminder',
          actionUrl: '/dashboard'
        }
      ];

      sampleNotifications.forEach(n => addNotification(n));
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

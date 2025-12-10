import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  checkLoanDueDate,
  checkCreditScore,
  loadNotifications,
  type Notification,
  getNotificationIcon,
} from '@/services/notification.service';

interface UseNotificationsOptions {
  /**
   * Whether to show toast notifications for new notifications
   */
  enableToasts?: boolean;
  
  /**
   * Interval in milliseconds to check for notifications (default: 60000 = 1 minute)
   */
  checkInterval?: number;
}

/**
 * Hook for managing notifications with automatic checks and toast display
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { enableToasts = true, checkInterval = 60000 } = options;
  const { toast } = useToast();

  /**
   * Show a toast notification for a new notification
   */
  const showToastForNotification = useCallback(
    (notification: Notification) => {
      if (!enableToasts) return;

      const icon = getNotificationIcon(notification.type);
      
      toast({
        title: `${icon} ${notification.title}`,
        description: notification.message,
        variant: notification.priority === 'critical' || notification.priority === 'high' 
          ? 'destructive' 
          : 'default',
        duration: notification.priority === 'critical' ? 0 : 5000, // Critical notifications don't auto-dismiss
      });
    },
    [enableToasts, toast]
  );

  /**
   * Check for loan due dates
   */
  const checkLoanStatus = useCallback(
    (currentBlock: number, dueBlock: number, loanAmount: number) => {
      const notification = checkLoanDueDate(currentBlock, dueBlock, loanAmount);
      if (notification) {
        showToastForNotification(notification);
        return notification;
      }
      return null;
    },
    [showToastForNotification]
  );

  /**
   * Check credit score changes
   */
  const checkCreditScoreChange = useCallback(
    (currentScore: number, previousScore?: number) => {
      const notification = checkCreditScore(currentScore, previousScore);
      if (notification) {
        showToastForNotification(notification);
        return notification;
      }
      return null;
    },
    [showToastForNotification]
  );

  /**
   * Load all notifications
   */
  const getNotifications = useCallback(() => {
    return loadNotifications();
  }, []);

  /**
   * Periodically check for new notifications
   */
  useEffect(() => {
    if (!enableToasts || checkInterval <= 0) return;

    const interval = setInterval(() => {
      const notifications = loadNotifications();
      
      // Check for very recent unread notifications (within last minute)
      const recentUnread = notifications.filter(
        n => !n.read && Date.now() - n.timestamp < 60000
      );
      
      // Show toasts for recent unread notifications
      recentUnread.forEach(notification => {
        showToastForNotification(notification);
      });
    }, checkInterval);

    return () => clearInterval(interval);
  }, [enableToasts, checkInterval, showToastForNotification]);

  return {
    checkLoanStatus,
    checkCreditScoreChange,
    getNotifications,
    showToast: showToastForNotification,
  };
}

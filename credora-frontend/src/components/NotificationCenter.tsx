import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import {
  loadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount,
  getNotificationIcon,
  getNotificationColor,
  formatRelativeTime,
  type Notification,
  type NotificationPriority,
} from '@/services/notification.service';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Load notifications on mount and when dropdown opens
  useEffect(() => {
    loadNotificationData();
  }, [open]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotificationData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  function loadNotificationData() {
    const loaded = loadNotifications();
    setNotifications(loaded);
    setUnreadCount(getUnreadCount());
  }

  function handleNotificationClick(notification: Notification) {
    markNotificationAsRead(notification.id);
    loadNotificationData();

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setOpen(false);
    }
  }

  function handleMarkAllAsRead() {
    markAllNotificationsAsRead();
    loadNotificationData();
  }

  function handleDeleteNotification(notificationId: string, event: React.MouseEvent) {
    event.stopPropagation();
    deleteNotification(notificationId);
    loadNotificationData();
  }

  function handleClearAll() {
    clearAllNotifications();
    loadNotificationData();
  }

  const getPriorityBorderColor = (priority: NotificationPriority): string => {
    const colors: Record<NotificationPriority, string> = {
      low: 'border-l-gray-400',
      medium: 'border-l-blue-500',
      high: 'border-l-orange-500',
      critical: 'border-l-red-500',
    };
    return colors[priority];
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <DropdownMenuLabel className="p-0 text-base font-semibold">
              Notifications
            </DropdownMenuLabel>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearAll}
                className="h-8 w-8"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">No notifications</p>
              <p className="text-xs text-gray-400 mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    p-4 cursor-pointer hover:bg-gray-50 transition-colors border-l-4
                    ${getPriorityBorderColor(notification.priority)}
                    ${!notification.read ? 'bg-blue-50/50' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0
                        ${getNotificationColor(notification.priority)}
                      `}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(notification.timestamp)}
                        </span>
                        {notification.actionLabel && (
                          <span className="text-xs text-blue-600 font-medium">
                            {notification.actionLabel} →
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteNotification(notification.id, e)}
                      className="h-6 w-6 opacity-0 hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 5 && (
          <div className="p-3 border-t text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigate('/notifications');
                setOpen(false);
              }}
              className="text-xs text-blue-600"
            >
              View all notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

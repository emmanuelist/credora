/**
 * Notification Service
 * 
 * Manages notifications for:
 * - Loan due date reminders
 * - Low credit score warnings
 * - Liquidation alerts
 * - Successful transactions
 * - APY changes
 */

export type NotificationType =
  | 'loan_due_soon'
  | 'loan_overdue'
  | 'low_credit_score'
  | 'credit_score_improved'
  | 'transaction_success'
  | 'transaction_failed'
  | 'liquidation_warning'
  | 'apy_change'
  | 'pool_low_liquidity';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

const NOTIFICATION_STORAGE_KEY = 'credora-notifications';
const MAX_NOTIFICATIONS = 50;

/**
 * Generate a unique notification ID
 */
function generateNotificationId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get notification icon emoji based on type
 */
export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    loan_due_soon: '⏰',
    loan_overdue: '⚠️',
    low_credit_score: '📉',
    credit_score_improved: '📈',
    transaction_success: '✅',
    transaction_failed: '❌',
    liquidation_warning: '🚨',
    apy_change: '💹',
    pool_low_liquidity: '💧',
  };
  return icons[type] || '📢';
}

/**
 * Get notification color based on priority
 */
export function getNotificationColor(priority: NotificationPriority): string {
  const colors: Record<NotificationPriority, string> = {
    low: 'text-gray-600 bg-gray-100',
    medium: 'text-blue-600 bg-blue-100',
    high: 'text-orange-600 bg-orange-100',
    critical: 'text-red-600 bg-red-100',
  };
  return colors[priority];
}

/**
 * Load all notifications from localStorage
 */
export function loadNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!stored) return [];
    
    const notifications: Notification[] = JSON.parse(stored);
    
    // Sort by timestamp (newest first)
    return notifications.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to load notifications:', error);
    return [];
  }
}

/**
 * Save notifications to localStorage
 */
function saveNotifications(notifications: Notification[]): void {
  try {
    // Keep only the most recent notifications
    const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save notifications:', error);
  }
}

/**
 * Add a new notification
 */
export function addNotification(
  type: NotificationType,
  priority: NotificationPriority,
  title: string,
  message: string,
  actionUrl?: string,
  actionLabel?: string,
  metadata?: Record<string, any>
): Notification {
  const notification: Notification = {
    id: generateNotificationId(),
    type,
    priority,
    title,
    message,
    timestamp: Date.now(),
    read: false,
    actionUrl,
    actionLabel,
    metadata,
  };
  
  const notifications = loadNotifications();
  notifications.unshift(notification);
  saveNotifications(notifications);
  
  return notification;
}

/**
 * Mark a notification as read
 */
export function markNotificationAsRead(notificationId: string): void {
  const notifications = loadNotifications();
  const notification = notifications.find(n => n.id === notificationId);
  
  if (notification) {
    notification.read = true;
    saveNotifications(notifications);
  }
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsAsRead(): void {
  const notifications = loadNotifications();
  notifications.forEach(n => n.read = true);
  saveNotifications(notifications);
}

/**
 * Delete a notification
 */
export function deleteNotification(notificationId: string): void {
  const notifications = loadNotifications();
  const filtered = notifications.filter(n => n.id !== notificationId);
  saveNotifications(filtered);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications(): void {
  localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
}

/**
 * Get unread notification count
 */
export function getUnreadCount(): number {
  const notifications = loadNotifications();
  return notifications.filter(n => !n.read).length;
}

/**
 * Check if a loan is due soon and create notification if needed
 */
export function checkLoanDueDate(
  currentBlock: number,
  dueBlock: number,
  loanAmount: number
): Notification | null {
  const blocksRemaining = dueBlock - currentBlock;
  const BLOCKS_PER_DAY = 144;
  const daysRemaining = blocksRemaining / BLOCKS_PER_DAY;
  
  // Check if already notified recently (avoid spam)
  const notifications = loadNotifications();
  const recentDueNotif = notifications.find(
    n => n.type === 'loan_due_soon' && Date.now() - n.timestamp < 24 * 60 * 60 * 1000
  );
  
  if (recentDueNotif) return null;
  
  // Overdue
  if (blocksRemaining <= 0) {
    return addNotification(
      'loan_overdue',
      'critical',
      'Loan Payment Overdue!',
      `Your loan of ${(loanAmount / 100000000).toFixed(8)} BTC is overdue. Repay now to avoid penalties.`,
      '/borrow',
      'Repay Now',
      { loanAmount, dueBlock, currentBlock }
    );
  }
  
  // Due within 3 days
  if (daysRemaining <= 3) {
    return addNotification(
      'loan_due_soon',
      'high',
      'Loan Due Soon',
      `Your loan payment of ${(loanAmount / 100000000).toFixed(8)} BTC is due in ${Math.ceil(daysRemaining)} days.`,
      '/borrow',
      'View Details',
      { loanAmount, dueBlock, currentBlock }
    );
  }
  
  // Due within 7 days
  if (daysRemaining <= 7) {
    return addNotification(
      'loan_due_soon',
      'medium',
      'Upcoming Loan Payment',
      `Your loan payment is due in ${Math.ceil(daysRemaining)} days. Plan ahead to repay on time.`,
      '/borrow',
      'View Loan',
      { loanAmount, dueBlock, currentBlock }
    );
  }
  
  return null;
}

/**
 * Check credit score and create notification if needed
 */
export function checkCreditScore(
  currentScore: number,
  previousScore?: number
): Notification | null {
  // Low credit score warning
  if (currentScore < 300) {
    const notifications = loadNotifications();
    const recentLowScore = notifications.find(
      n => n.type === 'low_credit_score' && Date.now() - n.timestamp < 7 * 24 * 60 * 60 * 1000
    );
    
    if (!recentLowScore) {
      return addNotification(
        'low_credit_score',
        'medium',
        'Low Credit Score',
        `Your credit score is ${currentScore}. Build it up by making deposits and repaying loans on time.`,
        '/dashboard',
        'View Score',
        { currentScore }
      );
    }
  }
  
  // Credit score improvement
  if (previousScore && currentScore > previousScore) {
    const improvement = currentScore - previousScore;
    if (improvement >= 50) {
      return addNotification(
        'credit_score_improved',
        'low',
        'Credit Score Improved!',
        `Your credit score increased by ${improvement} points to ${currentScore}. Keep up the good work!`,
        '/dashboard',
        'View Score',
        { currentScore, previousScore, improvement }
      );
    }
  }
  
  return null;
}

/**
 * Create transaction success notification
 */
export function notifyTransactionSuccess(
  type: 'deposit' | 'withdraw' | 'borrow' | 'repay',
  amount: number,
  txId: string
): Notification {
  const actions = {
    deposit: 'Deposit',
    withdraw: 'Withdrawal',
    borrow: 'Loan',
    repay: 'Repayment',
  };
  
  return addNotification(
    'transaction_success',
    'low',
    `${actions[type]} Successful`,
    `Your ${actions[type].toLowerCase()} of ${(amount / 100000000).toFixed(8)} BTC has been confirmed.`,
    `/activity`,
    'View Transaction',
    { type, amount, txId }
  );
}

/**
 * Create transaction failure notification
 */
export function notifyTransactionFailure(
  type: 'deposit' | 'withdraw' | 'borrow' | 'repay',
  amount: number,
  reason?: string
): Notification {
  const actions = {
    deposit: 'Deposit',
    withdraw: 'Withdrawal',
    borrow: 'Loan',
    repay: 'Repayment',
  };
  
  return addNotification(
    'transaction_failed',
    'medium',
    `${actions[type]} Failed`,
    reason || `Your ${actions[type].toLowerCase()} transaction failed. Please try again.`,
    undefined,
    undefined,
    { type, amount, reason }
  );
}

/**
 * Create liquidation warning notification
 */
export function notifyLiquidationWarning(
  loanAmount: number,
  dueBlock: number,
  currentBlock: number
): Notification {
  return addNotification(
    'liquidation_warning',
    'critical',
    'Liquidation Warning!',
    `Your loan is at risk of liquidation. Repay ${(loanAmount / 100000000).toFixed(8)} BTC immediately.`,
    '/borrow',
    'Repay Now',
    { loanAmount, dueBlock, currentBlock }
  );
}

/**
 * Create APY change notification
 */
export function notifyAPYChange(
  oldAPY: number,
  newAPY: number,
  utilizationRate: number
): Notification {
  const change = newAPY - oldAPY;
  const isIncrease = change > 0;
  
  return addNotification(
    'apy_change',
    'low',
    `APY ${isIncrease ? 'Increased' : 'Decreased'}`,
    `Pool APY changed from ${oldAPY.toFixed(2)}% to ${newAPY.toFixed(2)}% (${isIncrease ? '+' : ''}${change.toFixed(2)}%)`,
    '/lend',
    'View Pool',
    { oldAPY, newAPY, utilizationRate }
  );
}

/**
 * Create low liquidity notification
 */
export function notifyLowLiquidity(
  availableLiquidity: number,
  totalPool: number
): Notification {
  const utilizationRate = ((totalPool - availableLiquidity) / totalPool) * 100;
  
  return addNotification(
    'pool_low_liquidity',
    'medium',
    'Pool Low on Liquidity',
    `The lending pool is ${utilizationRate.toFixed(1)}% utilized. Withdrawals may be limited.`,
    '/lend',
    'Check Pool',
    { availableLiquidity, totalPool, utilizationRate }
  );
}

/**
 * Format relative time for notification timestamps
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

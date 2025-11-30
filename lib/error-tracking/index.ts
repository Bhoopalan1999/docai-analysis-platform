/**
 * Error tracking utility
 * Can be easily integrated with Sentry, LogRocket, or other error tracking services
 */

export interface ErrorContext {
  userId?: string;
  documentId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track an error
 * @param error - Error object or message
 * @param context - Additional context
 */
export function trackError(error: Error | string, context?: ErrorContext): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry integration
    // Sentry.captureException(error, {
    //   tags: {
    //     userId: context?.userId,
    //     documentId: context?.documentId,
    //     action: context?.action,
    //   },
    //   extra: context?.metadata,
    // });

    // For now, log to console (replace with actual error tracking service)
    console.error('Error tracked:', {
      message: errorMessage,
      stack: errorStack,
      context,
      timestamp: new Date().toISOString(),
    });
  } else {
    // In development, just log to console
    console.error('Error:', errorMessage, context);
    if (errorStack) {
      console.error('Stack:', errorStack);
    }
  }
}

/**
 * Track a message/event (not necessarily an error)
 * @param message - Message to track
 * @param level - Log level
 * @param context - Additional context
 */
export function trackMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: ErrorContext
): void {
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry integration
    // Sentry.captureMessage(message, level, {
    //   tags: {
    //     userId: context?.userId,
    //     documentId: context?.documentId,
    //     action: context?.action,
    //   },
    //   extra: context?.metadata,
    // });

    console.log(`[${level.toUpperCase()}]`, message, context);
  } else {
    console.log(`[${level.toUpperCase()}]`, message, context);
  }
}

/**
 * Set user context for error tracking
 * @param userId - User ID
 * @param userData - Additional user data
 */
export function setUserContext(userId: string): void {
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry integration
    // Sentry.setUser({
    //   id: userId,
    // });
  }

  // Store in global context for logging
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__errorTrackingUserId = userId;
  }
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry integration
    // Sentry.setUser(null);
  }

  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).__errorTrackingUserId;
  }
}

/**
 * Initialize error tracking
 * Call this in your app initialization
 */
export function initErrorTracking(): void {
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry initialization
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.init({
    //   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    //   environment: process.env.NODE_ENV,
    //   tracesSampleRate: 1.0,
    // });

    // Track unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        trackError(event.error || event.message, {
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        trackError(event.reason, {
          metadata: {
            type: 'unhandledrejection',
          },
        });
      });
    }
  }
}

/**
 * Helper to wrap async functions with error tracking
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(fn: T, context?: ErrorContext): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), context);
      throw error;
    }
  }) as T;
}

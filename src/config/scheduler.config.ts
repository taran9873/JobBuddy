import dotenv from 'dotenv';

dotenv.config();

export const schedulerConfig = {
  // Schedule time in 24-hour format (HH:mm)
  scheduleTime: process.env.SCHEDULER_TIME || '09:00',
  
  // Timezone for the scheduler
  timezone: process.env.SCHEDULER_TIMEZONE || 'UTC',
  
  // Retry configuration
  retry: {
    maxAttempts: parseInt(process.env.SCHEDULER_MAX_RETRIES || '3', 10),
    delayMinutes: parseInt(process.env.SCHEDULER_RETRY_DELAY_MINUTES || '5', 10),
    maxDelayMinutes: parseInt(process.env.SCHEDULER_MAX_RETRY_DELAY_MINUTES || '30', 10),
    backoffFactor: parseFloat(process.env.SCHEDULER_RETRY_BACKOFF_FACTOR || '2')
  },
  
  // Logging configuration
  logging: {
    enabled: process.env.SCHEDULER_LOGGING_ENABLED !== 'false',
    level: process.env.SCHEDULER_LOG_LEVEL || 'info',
    maxLogSize: parseInt(process.env.SCHEDULER_MAX_LOG_SIZE || '10485760', 10), // 10MB
    maxLogFiles: parseInt(process.env.SCHEDULER_MAX_LOG_FILES || '5', 10)
  },

  // Health check configuration
  health: {
    checkIntervalMinutes: parseInt(process.env.SCHEDULER_HEALTH_CHECK_INTERVAL || '5', 10),
    unhealthyThreshold: parseInt(process.env.SCHEDULER_UNHEALTHY_THRESHOLD || '5', 10),
    degradedThreshold: parseInt(process.env.SCHEDULER_DEGRADED_THRESHOLD || '3', 10)
  },

  // Performance configuration
  performance: {
    maxConcurrentFollowUps: parseInt(process.env.SCHEDULER_MAX_CONCURRENT_FOLLOW_UPS || '10', 10),
    batchSize: parseInt(process.env.SCHEDULER_BATCH_SIZE || '50', 10),
    processingTimeoutMinutes: parseInt(process.env.SCHEDULER_PROCESSING_TIMEOUT || '30', 10)
  },

  pollIntervalMs: 10 * 1000, // 2 minutes in milliseconds
}; 
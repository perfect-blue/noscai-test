import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/noscai',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Lock configuration
  lockDuration: parseInt(process.env.LOCK_DURATION || '300000'), // 5 minutes
  lockRenewalThreshold: parseInt(process.env.LOCK_RENEWAL_THRESHOLD || '120000'), // 2 minutes
  
  // Rate limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  lockRateLimitWindow: parseInt(process.env.LOCK_RATE_LIMIT_WINDOW || '60000'), // 1 minute
  lockRateLimitMax: parseInt(process.env.LOCK_RATE_LIMIT_MAX || '10'),
  
  // Cursor update throttling
  cursorUpdateThrottle: parseInt(process.env.CURSOR_UPDATE_THROTTLE || '50'), // 50ms
  
  // Cleanup intervals
  lockCleanupInterval: parseInt(process.env.LOCK_CLEANUP_INTERVAL || '60000'), // 1 minute
};

// Validation
if (!config.jwtSecret || config.jwtSecret === 'your-super-secret-jwt-key') {
  console.warn('⚠️  Warning: Using default JWT secret. Set JWT_SECRET environment variable.');
}

if (config.nodeEnv === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in production');
}

if (config.nodeEnv === 'production' && !process.env.REDIS_URL) {
  throw new Error('REDIS_URL must be set in production');
}
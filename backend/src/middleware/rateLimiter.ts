import rateLimit from 'express-rate-limit';

// Standard rate limiter for basic API queries (100 requests per 1 minute)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many API requests from this IP. Please try again after a minute.' },
});

// Stricter rate limiter for authentication routes (15 login attempts per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
});

// High-performance limiters for heavy file uploads (5 imports per 1 minute)
export const importLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many Excel imports submitted. Please wait a minute and try again.' },
});

// Protection for dev reindexing commands (3 re-index requests per 1 minute)
export const devReindexLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Re-indexing is resource-intensive. Please try again later.' },
});

// Rapid search throttling (60 requests per 1 minute)
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many search requests. Please slow down.' },
});

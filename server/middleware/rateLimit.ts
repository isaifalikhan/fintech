import rateLimit from 'express-rate-limit';

/** Throttle brute-force login attempts: 10 tries / 15 min / IP. */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, error: 'Too many login attempts. Try again later.' },
});

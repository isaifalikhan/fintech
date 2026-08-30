import rateLimit from 'express-rate-limit';

/** Throttle brute-force login attempts: 10 tries / 15 min / IP. */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, error: 'Too many login attempts. Try again later.' },
});

/**
 * Throttle AI Assistant chat calls: 20 messages / hour / signed-in user — protects both the
 * shared free Groq quota and an org's own configured key from runaway use. Keyed by
 * `req.authUser!.id` rather than IP — this route is mounted under `/organizations/:organizationId`,
 * which already runs `requireAuth` before this middleware, so `req.authUser` is guaranteed set.
 */
export const aiAssistantRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.authUser!.id,
  message: { success: false, data: null, error: 'Too many messages. Try again in a bit.' },
});

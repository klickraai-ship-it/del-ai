import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    keyGenerator = (req: Request) => {
      // Use IP address as default key
      const forwarded = req.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string' 
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress || 'unknown';
      return `${req.path}:${ip}`;
    },
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    const record = store[key];

    // Reset if window has passed
    if (now > record.resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    // Increment count
    record.count++;

    // Check if limit exceeded
    if (record.count > maxRequests) {
      res.set('X-RateLimit-Limit', maxRequests.toString());
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    // Add rate limit headers
    res.set('X-RateLimit-Limit', maxRequests.toString());
    res.set('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    res.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    // If skipSuccessfulRequests is true, only count failed requests
    if (skipSuccessfulRequests) {
      const originalSend = res.send;
      res.send = function (body) {
        if (res.statusCode >= 400) {
          // Only count this request if it failed
        } else {
          // Decrement count for successful requests
          if (store[key]) {
            store[key].count--;
          }
        }
        return originalSend.call(this, body);
      };
    }

    next();
  };
}

// Predefined rate limiters for common use cases
export const publicEndpointLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes per IP
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});

export const strictPublicLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute per IP
  message: 'Too many requests, please slow down.',
});

export const subscribeRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 subscriptions per hour per IP
  message: 'Too many subscription attempts. Please try again later.',
});

export const unsubscribeRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10, // 10 unsubscribes per 5 minutes per IP
  message: 'Too many unsubscribe attempts. Please try again in a few minutes.',
  skipSuccessfulRequests: true, // Only count failed attempts
});

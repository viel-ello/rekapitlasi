/**
 * @file In-memory rate limiter for login endpoint
 * Prevents brute-force attacks by limiting failed login attempts per IP.
 */

// Store: { ip -> { count, firstAttempt, blockedUntil } }
const attempts = new Map();

const MAX_ATTEMPTS = 5;       // Max failed attempts before lockout
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const BLOCK_MS = 30 * 60 * 1000;  // 30 minutes block after max attempts

/**
 * Get client IP from Next.js request
 * @param {Request} request
 * @returns {string}
 */
function getIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Check if the IP is rate limited.
 * @param {Request} request
 * @returns {{ limited: boolean, retryAfter?: number }}
 */
export function checkRateLimit(request) {
  const ip = getIP(request);
  const now = Date.now();
  const record = attempts.get(ip);

  if (record) {
    // Currently blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000 / 60);
      return { limited: true, retryAfter };
    }

    // Window expired — reset
    if (now - record.firstAttempt > WINDOW_MS) {
      attempts.delete(ip);
    }
  }

  return { limited: false };
}

/**
 * Record a failed login attempt for the given IP.
 * @param {Request} request
 */
export function recordFailedAttempt(request) {
  const ip = getIP(request);
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) {
    attempts.set(ip, { count: 1, firstAttempt: now, blockedUntil: null });
    return;
  }

  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_MS;
  }

  attempts.set(ip, record);
}

/**
 * Clear failed attempts after a successful login.
 * @param {Request} request
 */
export function clearAttempts(request) {
  const ip = getIP(request);
  attempts.delete(ip);
}

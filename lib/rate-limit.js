/**
 * @file Database-backed rate limiter for login endpoint
 * Prevents brute-force attacks by limiting failed login attempts per IP using Supabase.
 */

import { supabase } from '@/lib/supabase';

const MAX_ATTEMPTS = 5;       // Max failed attempts before lockout
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const BLOCK_MS = 30 * 60 * 1000;  // 30 minutes block after max attempts

/**
 * Get client IP from Next.js request
 * @param {Request} request
 * @returns {string}
 */
export function getIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Check if the IP is rate limited.
 * @param {Request} request
 * @returns {Promise<{ limited: boolean, retryAfter?: number }>}
 */
export async function checkRateLimit(request) {
  const ip = getIP(request);
  const now = Date.now();

  const { data: record } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('ip', ip)
    .maybeSingle();

  if (record) {
    // Currently blocked
    if (record.blocked_until && now < record.blocked_until) {
      const retryAfter = Math.ceil((record.blocked_until - now) / 1000 / 60);
      return { limited: true, retryAfter };
    }

    // Window expired — reset
    if (now - record.first_attempt > WINDOW_MS) {
      await supabase.from('rate_limits').delete().eq('ip', ip);
    }
  }

  return { limited: false };
}

/**
 * Record a failed login attempt for the given IP.
 * @param {Request} request
 */
export async function recordFailedAttempt(request) {
  const ip = getIP(request);
  const now = Date.now();

  const { data: record } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('ip', ip)
    .maybeSingle();

  if (!record) {
    await supabase.from('rate_limits').insert([
      { ip, count: 1, first_attempt: now, blocked_until: null }
    ]);
    return;
  }

  let count = record.count + 1;
  let blocked_until = record.blocked_until;

  if (count >= MAX_ATTEMPTS) {
    blocked_until = now + BLOCK_MS;
  }

  await supabase
    .from('rate_limits')
    .update({ count, blocked_until })
    .eq('ip', ip);
}

/**
 * Clear failed attempts after a successful login.
 * @param {Request} request
 */
export async function clearAttempts(request) {
  const ip = getIP(request);
  await supabase.from('rate_limits').delete().eq('ip', ip);
}

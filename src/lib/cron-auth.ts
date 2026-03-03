/**
 * Timing-safe cron secret verification.
 *
 * Uses crypto.timingSafeEqual to prevent timing-based side-channel attacks
 * on the CRON_SECRET comparison. A plain `===` leaks information about which
 * characters match via response-time differences.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Verify the cron request's Authorization header against CRON_SECRET.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function verifyCronSecret(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${cronSecret}`;

  // Both strings must be the same length for timingSafeEqual.
  // If lengths differ, reject immediately (no timing info is leaked by length check
  // because the expected length is constant for a given deployment).
  if (authHeader.length !== expected.length) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(authHeader),
    Buffer.from(expected),
  );

  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // Auth passed
}

/**
 * Input sanitization utilities.
 * Strips HTML/XSS payloads from user input to prevent stored XSS attacks.
 *
 * Usage:
 *   import { sanitizeInput } from '@/lib/sanitize';
 *   const cleanBody = sanitizeInput(await request.json());
 */

/**
 * Sanitize a string by removing all HTML tags and dangerous content.
 * Returns plain text only.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  
  // Remove all HTML tags
  let clean = input.replace(/<[^>]*>/g, '');
  
  // Remove javascript: URLs
  clean = clean.replace(/javascript\s*:/gi, '');
  
  // Remove data: URLs that could execute code
  clean = clean.replace(/data\s*:\s*text\/html/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  clean = clean.replace(/\bon\w+\s*=/gi, '');
  
  // Decode common HTML entities
  clean = clean
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x3C;/gi, '<')
    .replace(/&#x3E;/gi, '>')
    .replace(/&#60;/g, '<')
    .replace(/&#62;/g, '>');
  
  // After decoding, strip any remaining tags (handles encoded XSS)
  clean = clean.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  return clean.trim();
}

/**
 * Recursively sanitize all string values in an object.
 * Handles nested objects and arrays.
 */
export function sanitizeInput<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizeString(input) as T;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item)) as T;
  }

  if (typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      result[key] = sanitizeInput(value);
    }
    return result as T;
  }

  // Numbers, booleans, etc. pass through unchanged
  return input;
}

/**
 * Validate that a string doesn't contain potential XSS patterns.
 * Returns true if safe, false if suspicious.
 * Use this for logging/alerting rather than blocking.
 */
export function containsXSSPatterns(input: string): boolean {
  if (typeof input !== 'string') return false;
  
  // Check for common XSS patterns
  const xssPatterns = [
    /<script/i,
    /javascript\s*:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<svg[^>]*onload/i,
    /data\s*:\s*text\/html/i,
    /<img[^>]*onerror/i,
    /<body[^>]*onload/i,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

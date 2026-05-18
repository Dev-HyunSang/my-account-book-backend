import { createHash } from 'crypto';

// Canonicalize → sha256 hex. Same canonicalization rules as the users table
// (`LOWER(email)`), so a user that registered as `Alice@X.com` and is later
// added to the blacklist will be matched on re-registration as `alice@x.com`.
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

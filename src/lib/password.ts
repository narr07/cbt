import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * Hash a plain text password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a plain text password against a bcrypt hash
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Check if a string is a bcrypt hash
 * @param str - String to check
 * @returns True if string is a bcrypt hash
 */
export function isBcryptHash(str: string): boolean {
  // Bcrypt hashes start with $2a$, $2b$, or $2y$
  return /^\$2[ayb]\$\d{2}\$.{53}$/.test(str)
}

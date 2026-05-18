import { z } from 'zod';

// Bilingual zod fragments shared by SignIn and SignUp. Extracted so the
// validation contract (especially the bilingual error messages) only needs to
// be updated in one place when copy or rules change.

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { message: 'البريد مطلوب · Email required' })
  .email({ message: 'بريد إلكتروني غير صالح · Invalid email' })
  .max(254);

/**
 * Password field with configurable minimum length. SignIn allows 6+ chars
 * (legacy accounts may have shorter passwords); SignUp requires 8+.
 */
export function passwordField({ min }) {
  return z
    .string()
    .min(min, { message: `كلمة المرور قصيرة · Password too short (${min}+ chars)` })
    .max(72, { message: 'كلمة المرور طويلة جدًا · Password too long' });
}

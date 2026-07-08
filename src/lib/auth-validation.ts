const HAS_LETTER = /[A-Za-z]/;
const HAS_DIGIT = /\d/;

/** Validate password strength (server-side, no confirmation field). */
export function validatePasswordStrength(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!HAS_LETTER.test(password) || !HAS_DIGIT.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}

/** Validate a new password with confirmation (client forms). */
export function validateNewPassword(password: string, confirmPassword: string): string | null {
  const strengthError = validatePasswordStrength(password);
  if (strengthError) return strengthError;
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}

/** Shared password validation for profile and admin flows. */
export function validatePasswordChange(  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): string | null {
  if (!currentPassword.trim()) return "Current password is required.";
  if (newPassword.length < 8) return "New password must be at least 8 characters.";
  if (newPassword !== confirmPassword) return "New passwords do not match.";
  if (newPassword === currentPassword) return "New password must be different from the current password.";
  return null;
}

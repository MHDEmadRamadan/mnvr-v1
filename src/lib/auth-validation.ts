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
export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): string | null {
  if (!currentPassword.trim()) return "Current password is required.";
  if (newPassword.length < 8) return "New password must be at least 8 characters.";
  if (newPassword !== confirmPassword) return "New passwords do not match.";
  if (newPassword === currentPassword) return "New password must be different from the current password.";
  return null;
}

export type LoginFieldErrors = Partial<Record<"email" | "password", string>>;
export type PasswordChangeFieldErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmPassword", string>
>;
export type CreateUserFieldErrors = Partial<Record<"email" | "password" | "fullName", string>>;
export type ResetPasswordFieldErrors = Partial<Record<"password" | "confirmPassword", string>>;

export function validateLoginFields(email: string, password: string): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  if (!email.trim()) errors.email = "Email is required.";
  if (!password) errors.password = "Password is required.";
  return errors;
}

export function validatePasswordChangeFields(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): PasswordChangeFieldErrors {
  const errors: PasswordChangeFieldErrors = {};
  if (!currentPassword.trim()) errors.currentPassword = "Current password is required.";
  if (newPassword.length < 8) errors.newPassword = "New password must be at least 8 characters.";
  else if (newPassword === currentPassword) {
    errors.newPassword = "New password must be different from the current password.";
  }
  if (newPassword !== confirmPassword) errors.confirmPassword = "New passwords do not match.";
  return errors;
}

export function validateCreateUserFields(
  email: string,
  password: string,
): CreateUserFieldErrors {
  const errors: CreateUserFieldErrors = {};
  if (!email.trim()) errors.email = "Email is required.";
  const passwordError = validatePasswordStrength(password);
  if (passwordError) errors.password = passwordError;
  return errors;
}

export function validateResetPasswordFields(
  password: string,
  confirmPassword: string,
): ResetPasswordFieldErrors {
  const errors: ResetPasswordFieldErrors = {};
  const strengthError = validatePasswordStrength(password);
  if (strengthError) errors.password = strengthError;
  if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

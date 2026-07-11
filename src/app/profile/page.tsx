"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { validatePasswordChangeFields } from "@/lib/auth-validation";
import { TextField } from "@/components/form/TextField";
import { useFormFieldErrors } from "@/hooks/useFormFieldErrors";
import { Button } from "@/components/ui/button";

const PASSWORD_FIELD_ORDER = ["currentPassword", "newPassword", "confirmPassword"] as const;

export default function ProfilePage() {
  const { profile, changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const { errors, applyErrors, clearErrors } = useFormFieldErrors(PASSWORD_FIELD_ORDER);

  function syncPasswordErrors(
    current = currentPassword,
    newPwd = newPassword,
    confirm = confirmPassword,
  ) {
    if (!showFieldErrors) return;
    const fieldErrors = validatePasswordChangeFields(current, newPwd, confirm);
    if (Object.keys(fieldErrors).length > 0) {
      applyErrors(fieldErrors);
    } else {
      clearErrors();
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError(null);
    setSuccess(null);
    clearErrors();

    const fieldErrors = validatePasswordChangeFields(currentPassword, newPassword, confirmPassword);
    if (Object.keys(fieldErrors).length > 0) {
      setShowFieldErrors(true);
      applyErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const result = await changePassword(currentPassword, newPassword);
    setSubmitting(false);

    if (result.error) {
      setApiError(result.error);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess("Password updated successfully.");
  }

  function revalidate(changed: (typeof PASSWORD_FIELD_ORDER)[number], next: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }) {
    syncPasswordErrors(
      next.currentPassword ?? currentPassword,
      next.newPassword ?? newPassword,
      next.confirmPassword ?? confirmPassword,
    );
    void changed;
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View your account details and update your password.
        </p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Full name
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{profile.fullName || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Email
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{profile.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Role
            </dt>
            <dd className="mt-1 text-sm capitalize text-gray-900 dark:text-gray-100">{profile.role}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Change password</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter your current password to set a new one.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <TextField
            label="Current password"
            type="password"
            fieldKey="currentPassword"
            variant="auth"
            required
            value={currentPassword}
            onChange={(value) => {
              setCurrentPassword(value);
              revalidate("currentPassword", { currentPassword: value });
            }}
            error={errors.currentPassword}
            autoComplete="current-password"
            disabled={submitting}
          />

          <TextField
            label="New password"
            type="password"
            fieldKey="newPassword"
            variant="auth"
            required
            value={newPassword}
            onChange={(value) => {
              setNewPassword(value);
              revalidate("newPassword", { newPassword: value });
            }}
            error={errors.newPassword}
            autoComplete="new-password"
            disabled={submitting}
          />

          <TextField
            label="Confirm new password"
            type="password"
            fieldKey="confirmPassword"
            variant="auth"
            required
            value={confirmPassword}
            onChange={(value) => {
              setConfirmPassword(value);
              revalidate("confirmPassword", { confirmPassword: value });
            }}
            error={errors.confirmPassword}
            autoComplete="new-password"
            disabled={submitting}
          />

          {apiError ? (
            <p
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              {apiError}
            </p>
          ) : null}

          {success ? (
            <p
              className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300"
              role="status"
            >
              {success}
            </p>
          ) : null}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreateUserInput, Profile, UserRole } from "@/types/auth";
import { useAuth } from "@/contexts/AuthContext";
import {
  validateCreateUserFields,
  validateResetPasswordFields,
} from "@/lib/auth-validation";
import { TextField } from "@/components/form/TextField";
import { EnumField } from "@/components/form/EnumField";
import { useFormFieldErrors } from "@/hooks/useFormFieldErrors";
import {
  createAdminUser,
  fetchAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from "@/lib/users-api";
import { Button } from "@/components/ui/button";
import { dashboardPanel } from "@/components/issues/dashboard-ui";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

type ConfirmAction =
  | { type: "role"; user: Profile; nextRole: UserRole }
  | { type: "disable"; user: Profile }
  | { type: "enable"; user: Profile };

const CREATE_USER_FIELD_ORDER = ["email", "password"] as const;
const RESET_PASSWORD_FIELD_ORDER = ["password", "confirmPassword"] as const;
const USER_ROLES = ["user", "admin"] as const;

export default function AdminUsersPage() {
  const { getAccessToken, isAdmin } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateErrors, setShowCreateErrors] = useState(false);
  const [showResetErrors, setShowResetErrors] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  /** Pending role shown in the select while the confirm dialog is open. */
  const [pendingRoleByUserId, setPendingRoleByUserId] = useState<Record<string, UserRole>>({});

  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetStep, setResetStep] = useState<"form" | "confirm">("form");

  const [form, setForm] = useState<CreateUserInput>({
    email: "",
    password: "",
    fullName: "",
    role: "user",
  });

  const {
    errors: createErrors,
    applyErrors: applyCreateErrors,
    reconcileField: reconcileCreateField,
    clearErrors: clearCreateErrors,
  } = useFormFieldErrors(CREATE_USER_FIELD_ORDER);

  const {
    errors: resetErrors,
    applyErrors: applyResetErrors,
    clearErrors: clearResetErrors,
  } = useFormFieldErrors(RESET_PASSWORD_FIELD_ORDER);

  function syncResetPasswordErrors(password = resetPassword, confirm = resetConfirm) {
    if (!showResetErrors) return;
    const fieldErrors = validateResetPasswordFields(password, confirm);
    if (Object.keys(fieldErrors).length > 0) {
      applyResetErrors(fieldErrors);
    } else {
      clearResetErrors();
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAdminUsers(getAccessToken);
      setUsers(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchAdminUsers(getAccessToken);
        if (!cancelled) setUsers(rows);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, getAccessToken]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    clearCreateErrors();

    const fieldErrors = validateCreateUserFields(form.email, form.password);
    if (Object.keys(fieldErrors).length > 0) {
      setShowCreateErrors(true);
      applyCreateErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      await createAdminUser(getAccessToken, form);
      setForm({ email: "", password: "", fullName: "", role: "user" });
      setShowAdd(false);
      setSuccess("User created.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  async function applyConfirmAction() {
    if (!confirmAction) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (confirmAction.type === "role") {
        const result = await updateAdminUser(getAccessToken, confirmAction.user.id, {
          role: confirmAction.nextRole,
        });
        setUsers((prev) =>
          prev.map((u) =>
            u.id === confirmAction.user.id ? { ...u, role: confirmAction.nextRole } : u,
          ),
        );
        setPendingRoleByUserId((prev) => {
          const next = { ...prev };
          delete next[confirmAction.user.id];
          return next;
        });
        setSuccess(result.message ?? "Role updated. User signed out on all devices.");
      } else {
        const disabled = confirmAction.type === "disable";
        const result = await updateAdminUser(getAccessToken, confirmAction.user.id, { disabled });
        setSuccess(
          result.message ??
            (disabled
              ? "User disabled and signed out on all devices."
              : "User enabled."),
        );
      }
      setConfirmAction(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
      if (confirmAction.type === "role") {
        setPendingRoleByUserId((prev) => {
          const next = { ...prev };
          delete next[confirmAction.user.id];
          return next;
        });
      }
    } finally {
      setSaving(false);
    }
  }

  function cancelConfirmAction() {
    if (confirmAction?.type === "role") {
      setPendingRoleByUserId((prev) => {
        const next = { ...prev };
        delete next[confirmAction.user.id];
        return next;
      });
    }
    setConfirmAction(null);
  }

  function openResetPassword(user: Profile) {
    setResetTarget(user);
    setResetPassword("");
    setResetConfirm("");
    setResetStep("form");
    clearResetErrors();
    setShowResetErrors(false);
    setError(null);
    setSuccess(null);
  }

  async function submitResetPassword() {
    if (!resetTarget) return;

    setError(null);
    clearResetErrors();

    const fieldErrors = validateResetPasswordFields(resetPassword, resetConfirm);
    if (Object.keys(fieldErrors).length > 0) {
      setShowResetErrors(true);
      applyResetErrors(fieldErrors);
      return;
    }

    if (resetStep === "form") {
      setResetStep("confirm");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await resetAdminUserPassword(getAccessToken, resetTarget.id, {
        password: resetPassword,
      });
      setSuccess(result.message);
      setResetTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className={dashboardPanel}>
        <p className="text-sm text-gray-600 dark:text-gray-300">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Users</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage accounts, roles, and passwords</p>
        </div>
        <Button type="button" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "Add User"}
        </Button>
      </div>

      {error && (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <p className="min-w-0 flex-1">{error}</p>
          <Button type="button" variant="secondary" disabled={loading || saving} onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
          {success}
        </p>
      )}

      {confirmAction && (
        <div className={`${dashboardPanel} space-y-4`}>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Confirm change</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {confirmAction.type === "role" ? (
              <>
                Change <strong>{confirmAction.user.email}</strong> role to{" "}
                <strong className="capitalize">{confirmAction.nextRole}</strong>? This will immediately sign
                the user out on all devices.
              </>
            ) : confirmAction.type === "disable" ? (
              <>
                Disable <strong>{confirmAction.user.email}</strong>? This will immediately sign the user out on
                all devices.
              </>
            ) : (
              <>Enable <strong>{confirmAction.user.email}</strong>?</>
            )}
          </p>
          <div className="flex gap-2">
            <Button type="button" disabled={saving} onClick={() => void applyConfirmAction()}>
              {saving ? "Applying…" : "Confirm"}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelConfirmAction}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className={`${dashboardPanel} space-y-4`}>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Reset password — {resetTarget.email}
          </h3>
          {resetStep === "form" ? (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Set a new password. The user will be signed out on all devices immediately.
              </p>
              <TextField
                label="New password"
                type="password"
                fieldKey="password"
                variant="auth"
                required
                value={resetPassword}
                onChange={(value) => {
                  setResetPassword(value);
                  syncResetPasswordErrors(value, resetConfirm);
                }}
                error={resetErrors.password}
                disabled={saving}
              />
              <TextField
                label="Confirm new password"
                type="password"
                fieldKey="confirmPassword"
                variant="auth"
                required
                value={resetConfirm}
                onChange={(value) => {
                  setResetConfirm(value);
                  syncResetPasswordErrors(resetPassword, value);
                }}
                error={resetErrors.confirmPassword}
                disabled={saving}
              />
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Apply password reset for <strong>{resetTarget.email}</strong>? All active sessions will be
              revoked immediately.
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" disabled={saving} onClick={() => void submitResetPassword()}>
              {saving ? "Resetting…" : resetStep === "form" ? "Continue" : "Reset password"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setResetTarget(null);
                setResetStep("form");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleCreate} className={`${dashboardPanel} grid grid-cols-1 gap-4 md:grid-cols-2`} noValidate>
          <TextField
            label="Full name"
            fieldKey="fullName"
            variant="auth"
            value={form.fullName}
            onChange={(value) => setForm((f) => ({ ...f, fullName: value }))}
            className="text-sm"
          />
          <TextField
            label="Email"
            type="email"
            fieldKey="email"
            variant="auth"
            required
            value={form.email}
            onChange={(value) => {
              setForm((f) => ({ ...f, email: value }));
              if (showCreateErrors) {
                reconcileCreateField("email", validateCreateUserFields(value, form.password));
              }
            }}
            error={createErrors.email}
            className="text-sm"
          />
          <TextField
            label="Password"
            type="password"
            fieldKey="password"
            variant="auth"
            required
            value={form.password}
            onChange={(value) => {
              setForm((f) => ({ ...f, password: value }));
              if (showCreateErrors) {
                reconcileCreateField("password", validateCreateUserFields(form.email, value));
              }
            }}
            error={createErrors.password}
            className="text-sm"
          />
          <EnumField
            label="Role"
            fieldKey="role"
            variant="auth"
            value={form.role}
            options={USER_ROLES}
            onChange={(value) => setForm((f) => ({ ...f, role: value }))}
            className="text-sm"
          />
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create user"}
            </Button>
          </div>
        </form>
      )}

      <div className={dashboardPanel}>
        {loading ? (
          <div className="space-y-2" role="status" aria-live="polite">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Loading users…</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Fetching accounts from the admin API.
            </p>
          </div>
        ) : error && users.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Could not load users. Use Retry above after checking production environment variables.
            </p>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-3">{user.fullName || "—"}</td>
                    <td className="px-3 py-3">{user.email ?? "—"}</td>
                    <td className="px-3 py-3">
                      <select
                        value={pendingRoleByUserId[user.id] ?? user.role}
                        disabled={saving && confirmAction?.type === "role" && confirmAction.user.id === user.id}
                        onChange={(e) => {
                          const nextRole = e.target.value as UserRole;
                          if (nextRole === user.role) {
                            setPendingRoleByUserId((prev) => {
                              const next = { ...prev };
                              delete next[user.id];
                              return next;
                            });
                            return;
                          }
                          setPendingRoleByUserId((prev) => ({ ...prev, [user.id]: nextRole }));
                          setConfirmAction({ type: "role", user, nextRole });
                        }}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-950"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">{user.disabledAt ? "Disabled" : "Active"}</td>
                    <td className="px-3 py-3">{formatDate(user.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => openResetPassword(user)}
                        >
                          Reset password
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            setConfirmAction({
                              type: user.disabledAt ? "enable" : "disable",
                              user,
                            })
                          }
                        >
                          {user.disabledAt ? "Enable" : "Disable"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

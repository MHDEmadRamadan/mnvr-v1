"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_LOGOUT_MESSAGE_KEY } from "@/lib/auth-permissions";
import { validateLoginFields } from "@/lib/auth-validation";
import { TextField } from "@/components/form/TextField";
import { useFormFieldErrors } from "@/hooks/useFormFieldErrors";
import { Button } from "@/components/ui/button";

const LOGIN_FIELD_ORDER = ["email", "password"] as const;

function LoginForm() {
  const { signIn, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/issues";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const { errors, applyErrors, reconcileField, clearErrors } = useFormFieldErrors(LOGIN_FIELD_ORDER);

  useEffect(() => {
    try {
      const message = sessionStorage.getItem(AUTH_LOGOUT_MESSAGE_KEY);
      if (message) {
        setNotice(message);
        sessionStorage.removeItem(AUTH_LOGOUT_MESSAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(next);
    }
  }, [authLoading, isAuthenticated, next, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError(null);
    clearErrors();

    const fieldErrors = validateLoginFields(email, password);
    if (Object.keys(fieldErrors).length > 0) {
      setShowFieldErrors(true);
      applyErrors(fieldErrors);
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    if (result.error) {
      setApiError(result.error);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
            IM
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            MNVR device maintenance dashboard
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <TextField
            label="Email"
            type="email"
            fieldKey="email"
            variant="auth"
            required
            value={email}
            onChange={(value) => {
              setEmail(value);
              if (showFieldErrors) reconcileField("email", validateLoginFields(value, password));
            }}
            error={errors.email}
            autoComplete="email"
            disabled={submitting || authLoading}
          />

          <TextField
            label="Password"
            type="password"
            fieldKey="password"
            variant="auth"
            required
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (showFieldErrors) reconcileField("password", validateLoginFields(email, value));
            }}
            error={errors.password}
            autoComplete="current-password"
            disabled={submitting || authLoading}
          />

          {notice ? (
            <p
              className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              role="status"
            >
              {notice}
            </p>
          ) : null}

          {apiError ? (
            <p
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              {apiError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting || authLoading}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Accounts are created by administrators only.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

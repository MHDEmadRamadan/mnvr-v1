"use client";

import { useCallback, useEffect, useState } from "react";
import type { Issue, IssueCreateInput, IssueUpdateInput } from "@/types/issue";
import { findDeviceByImei, resolveOrCreateDeviceForIssue } from "@/lib/device-api";
import { dashboardBtnPrimary, dashboardBtnSecondary, dashboardInput, dashboardPanel } from "@/components/issues/dashboard-ui";

type FormState = {
  deviceImei: string;
  vehicleNumber: string;
  issueType: string;
  motherboardIssue: string;
  pmmIssue: string;
  ssdIssue: string;
  otherIssue: string;
  description: string;
  issueSource: string;
};

type ImeiHint = "idle" | "checking" | "exists" | "new";

function emptyForm(): FormState {
  return {
    deviceImei: "",
    vehicleNumber: "",
    issueType: "",
    motherboardIssue: "",
    pmmIssue: "",
    ssdIssue: "",
    otherIssue: "",
    description: "",
    issueSource: "",
  };
}

function formFromIssue(issue: Issue): FormState {
  return {
    deviceImei: issue.deviceImei ?? "",
    vehicleNumber: issue.vehicleNumber ?? "",
    issueType: issue.issueType ?? "",
    motherboardIssue: issue.motherboardIssue ?? "",
    pmmIssue: issue.pmmIssue ?? "",
    ssdIssue: issue.ssdIssue ?? "",
    otherIssue: issue.otherIssue ?? "",
    description: issue.description ?? "",
    issueSource: issue.issueSource ?? "",
  };
}

export function IssueModal({
  open,
  issue,
  onClose,
  onSave,
}: {
  open: boolean;
  issue: Issue | null;
  onClose: () => void;
  onSave: (values: IssueCreateInput | IssueUpdateInput, editingId?: string) => Promise<void>;
}) {
  const isEdit = !!issue;
  const [state, setState] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imeiHint, setImeiHint] = useState<ImeiHint>("idle");

  // Reset form when modal opens (create = empty, edit = issue fields only).
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- modal must reset when opened */
    setState(isEdit && issue ? formFromIssue(issue) : emptyForm());
    setErrors({});
    setImeiHint("idle");
  }, [open, isEdit, issue]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  /** Optional lookup on blur only — shows hint, never mutates issue fields. */
  const checkImeiOnBlur = useCallback(async () => {
    const imei = state.deviceImei.trim();
    if (!imei || isEdit) {
      setImeiHint("idle");
      return;
    }
    setImeiHint("checking");
    try {
      const existing = await findDeviceByImei(imei);
      setImeiHint(existing ? "exists" : "new");
    } catch {
      setImeiHint("idle");
    }
  }, [state.deviceImei, isEdit]);

  if (!open) return null;

  const heading = isEdit ? "Edit Issue" : "Add Issue";
  const contextLabel = isEdit
    ? [issue.issueType, issue.deviceImei, issue.vehicleNumber].filter(Boolean).join(" · ") ||
      "Update issue details"
    : "Create a maintenance issue. Enter a new IMEI to register a device, or an existing IMEI to link to it.";

  const validate = () => {
    const next: Record<string, string> = {};
    if (!isEdit && !state.deviceImei.trim()) next.deviceImei = "Device IMEI is required";
    if (!state.issueType.trim()) next.issueType = "Issue type is required";
    if (!isEdit && imeiHint === "new" && !state.vehicleNumber.trim()) {
      next.vehicleNumber = "Vehicle number is required for a new device";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      if (isEdit && issue) {
        const patch: IssueUpdateInput = {
          issueType: state.issueType.trim(),
          motherboardIssue: state.motherboardIssue.trim(),
          pmmIssue: state.pmmIssue.trim(),
          ssdIssue: state.ssdIssue.trim(),
          otherIssue: state.otherIssue.trim(),
          description: state.description.trim(),
          issueSource: state.issueSource.trim(),
        };
        await onSave(patch, issue.id);
      } else {
        const result = await resolveOrCreateDeviceForIssue({
          imei: state.deviceImei,
          vehicleNumber: state.vehicleNumber.trim() || undefined,
        });

        if ("error" in result) {
          if (result.error === "IMEI_REQUIRED") {
            setErrors({ deviceImei: "Device IMEI is required" });
          } else if (result.error === "VEHICLE_REQUIRED") {
            setErrors({
              vehicleNumber: "Vehicle number is required when registering a new device",
            });
            setImeiHint("new");
          }
          return;
        }

        const payload: IssueCreateInput = {
          deviceId: result.deviceId,
          issueType: state.issueType.trim(),
          motherboardIssue: state.motherboardIssue.trim(),
          pmmIssue: state.pmmIssue.trim(),
          ssdIssue: state.ssdIssue.trim(),
          otherIssue: state.otherIssue.trim(),
          description: state.description.trim(),
          issueSource: state.issueSource.trim(),
        };
        await onSave(payload);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 overflow-auto p-4 sm:p-6">
        <div className={`mx-auto w-full max-w-4xl ${dashboardPanel} shadow-2xl`}>
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200/80 px-5 py-4 dark:border-zinc-800">
            <div className="min-w-0">
              <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{heading}</div>
              <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{contextLabel}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Close
            </button>
          </div>

          {isEdit && issue && (issue.deviceImei || issue.vehicleNumber) ? (
            <div className="flex flex-wrap gap-3 border-b border-zinc-100 bg-zinc-50/80 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
              {issue.deviceImei ? (
                <span className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  IMEI: <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{issue.deviceImei}</strong>
                </span>
              ) : null}
              {issue.vehicleNumber ? (
                <span className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  Vehicle:{" "}
                  <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{issue.vehicleNumber}</strong>
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="p-5">
            {!isEdit ? (
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Device IMEI" error={errors.deviceImei} className="md:col-span-2">
                  <input
                    value={state.deviceImei}
                    onChange={(e) => {
                      setState((s) => ({ ...s, deviceImei: e.target.value }));
                      if (imeiHint !== "idle") setImeiHint("idle");
                    }}
                    onBlur={() => void checkImeiOnBlur()}
                    placeholder="Enter new or existing IMEI"
                    autoComplete="off"
                    className={inputClass(errors.deviceImei)}
                  />
                </Field>

                <Field
                  label="Vehicle number"
                  error={errors.vehicleNumber}
                  hint={
                    imeiHint === "new"
                      ? "Required — this IMEI is not in the system yet"
                      : imeiHint === "exists"
                        ? "Optional — device already registered"
                        : "Required for new devices"
                  }
                >
                  <input
                    value={state.vehicleNumber}
                    onChange={(e) => setState((s) => ({ ...s, vehicleNumber: e.target.value }))}
                    placeholder="e.g. V-1024"
                    autoComplete="off"
                    className={inputClass(errors.vehicleNumber)}
                  />
                </Field>

                {imeiHint !== "idle" ? (
                  <div className="md:col-span-2">
                    <ImeiStatusBanner hint={imeiHint} />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Issue type" error={errors.issueType}>
                <input
                  value={state.issueType}
                  onChange={(e) => setState((s) => ({ ...s, issueType: e.target.value }))}
                  className={inputClass(errors.issueType)}
                />
              </Field>

              <Field label="Issue source">
                <input
                  value={state.issueSource}
                  onChange={(e) => setState((s) => ({ ...s, issueSource: e.target.value }))}
                  className={inputClass()}
                />
              </Field>

              <Field label="Motherboard issue">
                <input
                  value={state.motherboardIssue}
                  onChange={(e) => setState((s) => ({ ...s, motherboardIssue: e.target.value }))}
                  className={inputClass()}
                />
              </Field>

              <Field label="PMM issue">
                <input
                  value={state.pmmIssue}
                  onChange={(e) => setState((s) => ({ ...s, pmmIssue: e.target.value }))}
                  className={inputClass()}
                />
              </Field>

              <Field label="SSD issue">
                <input
                  value={state.ssdIssue}
                  onChange={(e) => setState((s) => ({ ...s, ssdIssue: e.target.value }))}
                  className={inputClass()}
                />
              </Field>

              <Field label="Other issue">
                <input
                  value={state.otherIssue}
                  onChange={(e) => setState((s) => ({ ...s, otherIssue: e.target.value }))}
                  className={inputClass()}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Description">
                <textarea
                  value={state.description}
                  onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
                  rows={4}
                  className={inputClass()}
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-200/80 px-5 py-4 dark:border-zinc-800">
            <button type="button" onClick={onClose} className={dashboardBtnSecondary} disabled={submitting}>
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={submitting} className={dashboardBtnPrimary}>
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImeiStatusBanner({ hint }: { hint: ImeiHint }) {
  if (hint === "checking") {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Checking IMEI…
      </p>
    );
  }
  if (hint === "exists") {
    return (
      <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
        This IMEI is already registered. The issue will be linked to the existing device. Issue fields are not
        auto-filled.
      </p>
    );
  }
  if (hint === "new") {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
        New IMEI — a device record will be created. Enter a vehicle number below.
      </p>
    );
  }
  return null;
}

function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={["block", className ?? ""].join(" ")}>
      <div className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">{label}</div>
      {children}
      {hint && !error ? <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</div> : null}
      {error ? <div className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</div> : null}
    </label>
  );
}

function inputClass(hasError?: string) {
  return [dashboardInput, hasError ? "border-red-400 dark:border-red-800" : ""].join(" ");
}

"use client";

import type { Issue } from "@/types/issue";
import { Sheet } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BoolPill,
  formatCount,
  formatDisplayDate,
  sanitizeText,
  StatusPill,
} from "@/components/data-table/cells";
import { DeviceTicketsDisplay } from "@/components/issues/DeviceTicketsDisplay";

type IssueViewDrawerProps = {
  open: boolean;
  issue: Issue | null;
  onClose: () => void;
  onEdit?: (issue: Issue) => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function StatusField({ label, value }: { label: string; value: string | null | undefined }) {
  const t = sanitizeText(value);
  return (
    <Field label={label}>
      {t === "—" ? <span className="text-zinc-400">—</span> : <StatusPill value={t} />}
    </Field>
  );
}

function TextField({ label, value }: { label: string; value: string | null | undefined }) {
  const t = sanitizeText(value);
  return (
    <Field label={label}>
      {t === "—" ? (
        <span className="text-zinc-400">—</span>
      ) : (
        <span className="break-words">{t}</span>
      )}
    </Field>
  );
}

function BoolField({ label, value }: { label: string; value: boolean | null | undefined }) {
  return (
    <Field label={label}>
      {value === null || value === undefined ? (
        <span className="text-zinc-400">—</span>
      ) : (
        <BoolPill value={value} />
      )}
    </Field>
  );
}

export function IssueViewDrawer({ open, issue, onClose, onEdit }: IssueViewDrawerProps) {
  if (!issue) return null;

  const title = [issue.issueType, issue.vehicleNumber, issue.deviceImei].filter(Boolean).join(" · ") || "Issue";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Issue details"
      description={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {onEdit ? (
            <Button
              onClick={() => {
                onEdit(issue);
                onClose();
              }}
            >
              Edit issue
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {issue.issueType ? (
            <StatusPill value={sanitizeText(issue.issueType)} variant="issue" />
          ) : null}
          {issue.flespiStatus ? <StatusPill value={sanitizeText(issue.flespiStatus)} /> : null}
          {issue.diskHealth !== null && issue.diskHealth !== undefined ? (
            <Badge variant={issue.diskHealth ? "success" : "danger"}>
              {issue.diskHealth ? "Disk healthy" : "Disk unhealthy"}
            </Badge>
          ) : null}
        </div>

        <Section title="Device Information">
          <TextField label="Vehicle Number" value={issue.vehicleNumber} />
          <TextField label="IMEI" value={issue.deviceImei} />
          <Field label="Tickets">
            <DeviceTicketsDisplay value={issue.deviceTickets} />
          </Field>
          <TextField label="Software Version" value={issue.softwareVersion} />
        </Section>

        <Section title="Device Status">
          <StatusField label="flespi_status" value={issue.flespiStatus} />
          <StatusField label="screen_status" value={issue.screenStatus} />
          <StatusField label="dotmatrix_status" value={issue.dotMatrixStatus} />
          <Field label="ssh_status">
            {issue.sshStatus === null || issue.sshStatus === undefined ? (
              <span className="text-zinc-400">—</span>
            ) : (
              <BoolPill value={issue.sshStatus} />
            )}
          </Field>
          <Field label="pmm_software">
            <span className="font-mono tabular-nums">{formatCount(issue.pmmSoftware)}</span>
          </Field>
        </Section>

        <Section title="Hardware Information">
          <TextField label="Motherboard Type" value={issue.motherboardType} />
          <TextField label="PMM Type" value={issue.pmmType} />
          <TextField label="SSD Type" value={issue.ssdType} />
          <Field label="Disk Health">
            {issue.diskHealth === null || issue.diskHealth === undefined ? (
              <span className="text-zinc-400">—</span>
            ) : (
              <BoolPill value={issue.diskHealth} />
            )}
          </Field>
          <Field label="Power On Hours">
            <span className="font-mono tabular-nums">{formatCount(issue.powerOnHours)}</span>
          </Field>
          <Field label="Power Cycles">
            <span className="font-mono tabular-nums">{formatCount(issue.powerCycles)}</span>
          </Field>
          <Field label="Power Off Count">
            <span className="font-mono tabular-nums">{formatCount(issue.powerOffCount)}</span>
          </Field>
          <Field label="Lifetime">
            <span className="font-mono tabular-nums">{formatCount(issue.lifetime)}</span>
          </Field>
          <div className="sm:col-span-2">
            <TextField label="SSD Summary" value={issue.summarySsd} />
          </div>
        </Section>

        <Section title="Issue Information">
          <Field label="Issue Type">
            {sanitizeText(issue.issueType) === "—" ? (
              <span className="text-zinc-400">—</span>
            ) : (
              <StatusPill value={issue.issueType} variant="issue" />
            )}
          </Field>
          <TextField label="Source" value={issue.issueSource} />
          <TextField label="Motherboard Issue" value={issue.motherboardIssue} />
          <TextField label="PMM Issue" value={issue.pmmIssue} />
          <TextField label="SSD Issue" value={issue.ssdIssue} />
          <TextField label="Other Issue" value={issue.otherIssue} />
          <Field label="Created At">
            <span className="whitespace-nowrap">{formatDisplayDate(issue.createdAt)}</span>
          </Field>
          <Field label="Updated At">
            <span className="text-zinc-400">—</span>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              {sanitizeText(issue.description) === "—" ? (
                <span className="text-zinc-400">—</span>
              ) : (
                <p className="whitespace-pre-wrap break-words leading-relaxed">{issue.description}</p>
              )}
            </Field>
          </div>
        </Section>

        <Section title="Replacements">
          <TextField label="SSD Replacement" value={issue.ssd} />
          <TextField label="Motherboard Replacement" value={issue.motherboard} />
          <TextField label="SATA Cable" value={issue.sataCable} />
          <TextField
            label="IMEI Changed"
            value={
              issue.imeiChanged === null || issue.imeiChanged === undefined
                ? null
                : String(issue.imeiChanged)
            }
          />
          <TextField
            label="SIM Changed"
            value={
              issue.simChanged === null || issue.simChanged === undefined
                ? null
                : String(issue.simChanged)
            }
          />
          <BoolField label="Device Changed" value={issue.deviceChanged} />
        </Section>
      </div>
    </Sheet>
  );
}

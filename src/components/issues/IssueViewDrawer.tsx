"use client";

import type { Issue } from "@/types/issue";
import { Sheet } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BoolPill,
  EmptyCell,
  formatCount,
  formatDisplayDate,
  sanitizeText,
  StatusPill,
} from "@/components/data-table/cells";
import { DeviceTicketsDisplay } from "@/components/issues/DeviceTicketsDisplay";
import {
  formatReplacementDbValueForDisplay,
  hasReplacementChange,
} from "@/lib/replacements-value-mapper";

type IssueViewDrawerProps = {
  open: boolean;
  issue: Issue | null;
  onClose: () => void;
  onEdit?: (issue: Issue) => void;
};

function Field({
  label,
  children,
  span = 1,
}: {
  label: string;
  children: React.ReactNode;
  span?: 1 | 2;
}) {
  return (
    <div className={span === 2 ? "sm:col-span-2" : undefined}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 dark:border-zinc-800 dark:bg-zinc-900/30">
      <h3 className="border-b border-zinc-200/80 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        {title}
      </h3>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 p-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function DisplayText({ value }: { value: string | null | undefined }) {
  const t = sanitizeText(value);
  if (t === "—") return <EmptyCell />;
  return <span className="break-words">{t}</span>;
}

function StatusField({ label, value }: { label: string; value: string | null | undefined }) {
  const t = sanitizeText(value);
  return (
    <Field label={label}>
      {t === "—" ? <EmptyCell /> : <StatusPill value={t} />}
    </Field>
  );
}

function BoolField({ label, value }: { label: string; value: boolean | null | undefined }) {
  return (
    <Field label={label}>
      {value === null || value === undefined ? <EmptyCell /> : <BoolPill value={value} />}
    </Field>
  );
}

function ReplacementChangeField({ label, value }: { label: string; value: unknown }) {
  if (!hasReplacementChange(value)) {
    return (
      <Field label={label}>
        <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">Not changed</span>
      </Field>
    );
  }
  const display = formatReplacementDbValueForDisplay(value);
  return (
    <Field label={label}>
      {display === "—" ? <EmptyCell /> : <span className="font-mono text-sm break-all">{display}</span>}
    </Field>
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function IssueHeroHeader({ issue }: { issue: Issue }) {
  const description = sanitizeText(issue.description);
  const hasIssueSubfields =
    sanitizeText(issue.motherboardIssue) !== "—" ||
    sanitizeText(issue.pmmIssue) !== "—" ||
    sanitizeText(issue.ssdIssue) !== "—" ||
    sanitizeText(issue.otherIssue) !== "—";

  return (
    <header className="space-y-4 rounded-xl border border-zinc-200/90 bg-gradient-to-b from-zinc-50 to-white p-4 shadow-sm dark:border-zinc-800 dark:from-zinc-900/80 dark:to-zinc-950">
      <div className="flex flex-wrap items-center gap-2">
        {issue.issueType ? (
          <StatusPill value={sanitizeText(issue.issueType)} variant="issue" />
        ) : (
          <Badge variant="outline">No issue type</Badge>
        )}
        {issue.flespiStatus ? <StatusPill value={sanitizeText(issue.flespiStatus)} /> : null}
        {issue.diskHealth !== null && issue.diskHealth !== undefined ? (
          <Badge variant={issue.diskHealth ? "success" : "danger"}>
            {issue.diskHealth ? "Disk healthy" : "Disk unhealthy"}
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-2.5 dark:border-zinc-700/80 dark:bg-zinc-900/60">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Vehicle</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {sanitizeText(issue.vehicleNumber) === "—" ? (
              <EmptyCell />
            ) : (
              issue.vehicleNumber
            )}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-2.5 dark:border-zinc-700/80 dark:bg-zinc-900/60">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">IMEI</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {sanitizeText(issue.deviceImei) === "—" ? <EmptyCell /> : issue.deviceImei}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200/80 bg-white/90 px-3 py-3 dark:border-zinc-700/80 dark:bg-zinc-900/50">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Description</p>
        {description === "—" ? (
          <p className="mt-1.5">
            <EmptyCell />
          </p>
        ) : (
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
            {issue.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetaItem
          label="Created by"
          value={sanitizeText(issue.createdByName) === "—" ? <EmptyCell /> : issue.createdByName}
        />
        <MetaItem label="Created" value={formatDisplayDate(issue.createdAt)} />
        <MetaItem
          label="Edited by"
          value={sanitizeText(issue.editedByName) === "—" ? <EmptyCell /> : issue.editedByName}
        />
        <MetaItem
          label="Edited"
          value={issue.editedAt ? formatDisplayDate(issue.editedAt) : <EmptyCell />}
        />
      </div>

      {hasIssueSubfields ? (
        <dl className="grid grid-cols-1 gap-2 border-t border-zinc-200/80 pt-3 sm:grid-cols-2 dark:border-zinc-800">
          {sanitizeText(issue.motherboardIssue) !== "—" ? (
            <Field label="Motherboard issue">
              <DisplayText value={issue.motherboardIssue} />
            </Field>
          ) : null}
          {sanitizeText(issue.pmmIssue) !== "—" ? (
            <Field label="PMM issue">
              <DisplayText value={issue.pmmIssue} />
            </Field>
          ) : null}
          {sanitizeText(issue.ssdIssue) !== "—" ? (
            <Field label="SSD issue">
              <DisplayText value={issue.ssdIssue} />
            </Field>
          ) : null}
          {sanitizeText(issue.otherIssue) !== "—" ? (
            <Field label="Other issue">
              <DisplayText value={issue.otherIssue} />
            </Field>
          ) : null}
        </dl>
      ) : null}
    </header>
  );
}

export function IssueViewDrawer({ open, issue, onClose, onEdit }: IssueViewDrawerProps) {
  if (!issue) return null;

  const subtitle = [issue.vehicleNumber, issue.deviceImei].filter(Boolean).join(" · ") || undefined;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title="Issue details"
      description={subtitle}
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
      <div className="space-y-4 pb-2">
        <IssueHeroHeader issue={issue} />

        <Section title="Device Information">
          <Field label="Tickets">
            <DeviceTicketsDisplay value={issue.deviceTickets} />
          </Field>
          <Field label="Software version">
            <DisplayText value={issue.softwareVersion} />
          </Field>
        </Section>

        <Section title="Device Status">
          <StatusField label="Flespi status" value={issue.flespiStatus} />
          <StatusField label="Screen status" value={issue.screenStatus} />
          <StatusField label="Dot matrix status" value={issue.dotMatrixStatus} />
          <BoolField label="SSH status" value={issue.sshStatus} />
          <Field label="PMM software">
            <span className="font-mono tabular-nums">{formatCount(issue.pmmSoftware)}</span>
          </Field>
        </Section>

        <Section title="Hardware Information">
          <Field label="Motherboard type">
            <DisplayText value={issue.motherboardType} />
          </Field>
          <Field label="PMM type">
            <DisplayText value={issue.pmmType} />
          </Field>
        </Section>

        <Section title="Storage Information">
          <Field label="SSD type">
            <DisplayText value={issue.ssdType} />
          </Field>
          <BoolField label="Disk health" value={issue.diskHealth} />
          <Field label="Power on hours">
            <span className="font-mono tabular-nums">{formatCount(issue.powerOnHours)}</span>
          </Field>
          <Field label="Power cycles">
            <span className="font-mono tabular-nums">{formatCount(issue.powerCycles)}</span>
          </Field>
          <Field label="Power off count">
            <span className="font-mono tabular-nums">{formatCount(issue.powerOffCount)}</span>
          </Field>
          <Field label="Lifetime">
            <span className="font-mono tabular-nums">{formatCount(issue.lifetime)}</span>
          </Field>
          <Field label="SSD summary" span={2}>
            <DisplayText value={issue.summarySsd} />
          </Field>
        </Section>

        <Section title="Replacement Information">
          <Field label="SSD replacement">
            <DisplayText value={issue.ssd} />
          </Field>
          <Field label="Motherboard replacement">
            <DisplayText value={issue.motherboard} />
          </Field>
          <Field label="SATA cable">
            <DisplayText value={issue.sataCable} />
          </Field>
          <BoolField label="Device changed" value={issue.deviceChanged} />
          <ReplacementChangeField label="IMEI changed" value={issue.imeiChanged} />
          <ReplacementChangeField label="SIM changed" value={issue.simChanged} />
        </Section>
      </div>
    </Sheet>
  );
}

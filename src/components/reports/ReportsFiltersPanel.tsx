"use client";

import type { ReportFilters } from "@/types/reports";
import {
  REPLACEMENT_MOTHERBOARD_OPTIONS,
  REPLACEMENT_SATA_CABLE_OPTIONS,
  REPLACEMENT_SSD_OPTIONS,
} from "@/types/replacements";
import { dashboardInput, dashboardPanel, dashboardSelect } from "@/components/issues/dashboard-ui";

type Props = {
  value: ReportFilters;
  onChange: (next: ReportFilters) => void;
  onApply: () => void;
  onReset: () => void;
};

const BOOL_OPTIONS = [
  { value: "", label: "Any" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
] as const;

export function ReportsFiltersPanel({ value, onChange, onApply, onReset }: Props) {
  const set = <K extends keyof ReportFilters>(key: K) => (v: ReportFilters[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className={`${dashboardPanel} p-4`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Filters</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Combine any fields — all active filters are applied together (AND logic).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Apply filters
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <FilterSection title="Identity">
          <FilterField label="Vehicle number">
            <input className={dashboardInput} value={value.vehicleNumber} onChange={(e) => set("vehicleNumber")(e.target.value)} placeholder="e.g. V-1024" />
          </FilterField>
          <FilterField label="IMEI">
            <input className={dashboardInput} value={value.deviceImei} onChange={(e) => set("deviceImei")(e.target.value)} placeholder="Device IMEI" />
          </FilterField>
        </FilterSection>

        <FilterSection title="Issue fields">
          <FilterField label="Issue type">
            <input className={dashboardInput} value={value.issueType} onChange={(e) => set("issueType")(e.target.value)} />
          </FilterField>
          <FilterField label="Motherboard issue">
            <input className={dashboardInput} value={value.motherboardIssue} onChange={(e) => set("motherboardIssue")(e.target.value)} />
          </FilterField>
          <FilterField label="PMM issue">
            <input className={dashboardInput} value={value.pmmIssue} onChange={(e) => set("pmmIssue")(e.target.value)} />
          </FilterField>
          <FilterField label="SSD issue">
            <input className={dashboardInput} value={value.ssdIssue} onChange={(e) => set("ssdIssue")(e.target.value)} />
          </FilterField>
          <FilterField label="Other issue">
            <input className={dashboardInput} value={value.otherIssue} onChange={(e) => set("otherIssue")(e.target.value)} />
          </FilterField>
          <FilterField label="Issue source">
            <input className={dashboardInput} value={value.issueSource} onChange={(e) => set("issueSource")(e.target.value)} />
          </FilterField>
        </FilterSection>

        <FilterSection title="Hardware & storage">
          <FilterField label="Motherboard type">
            <input className={dashboardInput} value={value.motherboardType} onChange={(e) => set("motherboardType")(e.target.value)} />
          </FilterField>
          <FilterField label="PMM type">
            <input className={dashboardInput} value={value.pmmType} onChange={(e) => set("pmmType")(e.target.value)} />
          </FilterField>
          <FilterField label="SSD type">
            <input className={dashboardInput} value={value.ssdType} onChange={(e) => set("ssdType")(e.target.value)} />
          </FilterField>
        </FilterSection>

        <FilterSection title="Device status">
          <FilterField label="Software version">
            <input className={dashboardInput} value={value.softwareVersion} onChange={(e) => set("softwareVersion")(e.target.value)} />
          </FilterField>
          <FilterField label="Flespi status">
            <input className={dashboardInput} value={value.flespiStatus} onChange={(e) => set("flespiStatus")(e.target.value)} />
          </FilterField>
          <FilterField label="Screen status">
            <input className={dashboardInput} value={value.screenStatus} onChange={(e) => set("screenStatus")(e.target.value)} />
          </FilterField>
          <FilterField label="Dotmatrix status">
            <input className={dashboardInput} value={value.dotmatrixStatus} onChange={(e) => set("dotmatrixStatus")(e.target.value)} />
          </FilterField>
          <FilterField label="SSH status">
            <select className={dashboardSelect} value={value.sshStatus} onChange={(e) => set("sshStatus")(e.target.value as ReportFilters["sshStatus"])}>
              {BOOL_OPTIONS.map((o) => (
                <option key={o.value || "any"} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FilterField>
        </FilterSection>

        <FilterSection title="Replacements">
          <EnumFilter label="SSD replacement" value={value.ssd} options={REPLACEMENT_SSD_OPTIONS} onChange={set("ssd")} />
          <EnumFilter
            label="Motherboard replacement"
            value={value.motherboard}
            options={REPLACEMENT_MOTHERBOARD_OPTIONS}
            onChange={set("motherboard")}
          />
          <EnumFilter
            label="SATA cable"
            value={value.sataCable}
            options={REPLACEMENT_SATA_CABLE_OPTIONS}
            onChange={set("sataCable")}
          />
          <FilterField label="IMEI changed">
            <input
              className={dashboardInput}
              value={value.imeiChanged}
              onChange={(e) => set("imeiChanged")(e.target.value)}
              placeholder="IMEI value or “No change”"
            />
          </FilterField>
          <FilterField label="SIM changed">
            <input
              className={dashboardInput}
              value={value.simChanged}
              onChange={(e) => set("simChanged")(e.target.value)}
              placeholder="SIM value or “No change”"
            />
          </FilterField>
          <BoolFilter label="Device changed" value={value.deviceChanged} onChange={set("deviceChanged")} />
        </FilterSection>

        <FilterSection title="Date range">
          <FilterField label="From">
            <input type="date" className={dashboardInput} value={value.createdFrom} onChange={(e) => set("createdFrom")(e.target.value)} />
          </FilterField>
          <FilterField label="To">
            <input type="date" className={dashboardInput} value={value.createdTo} onChange={(e) => set("createdTo")(e.target.value)} />
          </FilterField>
        </FilterSection>
      </div>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

function BoolFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ReportFilters["deviceChanged"];
  onChange: (v: ReportFilters["deviceChanged"]) => void;
}) {
  return (
    <FilterField label={label}>
      <select className={dashboardSelect} value={value} onChange={(e) => onChange(e.target.value as ReportFilters["deviceChanged"])}>
        {BOOL_OPTIONS.map((o) => (
          <option key={o.value || "any"} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FilterField>
  );
}

function EnumFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: "" | T;
  options: readonly T[];
  onChange: (v: "" | T) => void;
}) {
  return (
    <FilterField label={label}>
      <select className={dashboardSelect} value={value} onChange={(e) => onChange(e.target.value as "" | T)}>
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FilterField>
  );
}

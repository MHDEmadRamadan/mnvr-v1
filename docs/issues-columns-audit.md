# Issues Dashboard — Column Audit Report

Generated against `Issue` DTO (`src/types/issue.ts`) and table config (`src/config/issues-table-config.tsx`).

## Summary

| Metric | Count |
|--------|------:|
| DTO fields (total) | 32 |
| Internal-only (never shown) | 2 |
| Table column definitions | 30 |
| Coverage | **100%** of displayable fields |

All user-facing DTO fields are available in the column selector. No raw UUIDs or foreign keys are rendered in the table or view drawer.

---

## Internal fields (excluded from UI)

| Field | Reason |
|-------|--------|
| `id` | Primary key — used for CRUD/selection only |
| `deviceId` | Foreign key — resolved to **IMEI** + **Vehicle Number** |

---

## DTO → Column mapping

| DTO field | Column ID | Group | Default visible |
|-----------|-----------|-------|:---------------:|
| — | `_rowNum` | Device | ✓ |
| `vehicleNumber` | `vehicleNumber` | Device | ✓ (locked) |
| `deviceImei` | `deviceImei` | Device | ✓ (locked) |
| `softwareVersion` | `softwareVersion` | Status | ✓ |
| `flespiStatus` | `flespiStatus` | Status | ✓ |
| `screenStatus` | `screenStatus` | Status | ✓ |
| `dotMatrixStatus` | `dotMatrixStatus` | Status | ✓ |
| `sshStatus` | `sshStatus` | Status | |
| `pmmSoftware` | `pmmSoftware` | Status | |
| `issueType` | `issueType` | Issue | ✓ |
| `motherboardIssue` | `motherboardIssue` | Issue | ✓ |
| `pmmIssue` | `pmmIssue` | Issue | ✓ |
| `ssdIssue` | `ssdIssue` | Issue | ✓ |
| `otherIssue` | `otherIssue` | Issue | |
| `motherboardType` | `motherboardType` | Hardware | ✓ |
| `pmmType` | `pmmType` | Hardware | |
| `ssdType` | `ssdType` | Storage | ✓ |
| `diskHealth` | `diskHealth` | Storage | ✓ |
| `powerOnHours` | `powerOnHours` | Storage | ✓ |
| `powerCycles` | `powerCycles` | Storage | |
| `powerOffCount` | `powerOffCount` | Storage | |
| `lifetime` | `lifetime` | Storage | |
| `summarySsd` | `summarySsd` | Storage | |
| `newSsd` | `newSsd` | Replacements | |
| `newMotherboard` | `newMotherboard` | Replacements | |
| `newSataCable` | `newSataCable` | Replacements | |
| `imeiChanged` | `imeiChanged` | Replacements | |
| `simChanged` | `simChanged` | Replacements | |
| `deviceChanged` | `deviceChanged` | Replacements | |
| `createdAt` | `createdAt` | Meta | ✓ |
| `description` | `description` | Meta | ✓ |

---

## Previously “missing” fields

These fields were **always in the DTO and column config** but hidden by default column visibility:

- `sshStatus`, `pmmSoftware`
- `otherIssue`, `pmmType`
- `powerCycles`, `powerOffCount`, `lifetime`, `summarySsd`
- All **Replacements** flags

Use **Columns → Show all** or enable individually via the searchable column picker.

---

## Schema fields not in DTO

| Table | Field | Notes |
|-------|-------|-------|
| `issues` | — | No `updated_at` column in schema |
| `device` | `description` | Not mapped |
| `vehicles` | `description` | Not mapped |
| `device_status` | `pmm_version`, `description` | Not mapped |

**Updated At** in the View drawer shows `—` because the schema has no `updated_at` on `issues`.

---

## Data quality rules

- UUID pattern values → rendered as `—` (`sanitizeText`)
- Empty / null / undefined → `—`
- Booleans → Yes / No pills
- Status strings → color-coded badges

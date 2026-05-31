/**
 * Issues data-flow audit — run: node scripts/audit-issues.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const ISSUES_SELECT = `
  *,
  device:device_id (
    imei,
    vehicle:vehicle_id ( vehicle_number ),
    device_status ( software_version, created_at ),
    hardware ( motherboard_type, created_at ),
    storage ( ssd_type, created_at ),
    replacements ( new_ssd, created_at )
  )
`;

async function count(table, opts = {}) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (opts.gte) q = q.gte("created_at", opts.gte);
  if (opts.lte) q = q.lte("created_at", opts.lte);
  const { count: c, error } = await q;
  if (error) return { error: error.message, count: null };
  return { count: c };
}

async function fetchPage(select, { page = 1, pageSize = 10, filters = {} } = {}) {
  let q = supabase.from("issues").select(select, { count: "exact" });
  if (filters.issueType) q = q.ilike("issue_type", `%${filters.issueType}%`);
  if (filters.deviceImei) q = q.ilike("device.imei", `%${filters.deviceImei}%`);
  if (filters.createdFrom) q = q.gte("created_at", filters.createdFrom);
  if (filters.createdTo) q = q.lte("created_at", filters.createdTo);
  q = q.order("created_at", { ascending: false });
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  q = q.range(from, to);
  const { data, error, count } = await q;
  return { error: error?.message, count, rows: data?.length ?? 0, data };
}

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

console.log("=== MNVR Issues Audit ===\n");

const tables = ["issues", "device", "vehicles", "device_status", "hardware", "storage", "replacements"];
for (const t of tables) {
  const r = await count(t);
  console.log(`${t}:`, r.error ? `ERROR ${r.error}` : r.count);
}

console.log("\n--- issues: plain select (no join), limit 1000 ---");
const plain = await supabase.from("issues").select("id, device_id, created_at").order("created_at", { ascending: false }).limit(1000);
console.log("error:", plain.error?.message ?? "none");
console.log("rows returned:", plain.data?.length);
console.log("count header:", plain.count);

console.log("\n--- issues: full ISSUES_SELECT page 1 size 10 (app default) ---");
const appQuery = await fetchPage(ISSUES_SELECT, { page: 1, pageSize: 10 });
console.log("error:", appQuery.error ?? "none");
console.log("total count:", appQuery.count);
console.log("rows returned:", appQuery.rows);
if (appQuery.data?.length) {
  const imeis = appQuery.data.map((r) => r.device?.imei ?? "(no device)");
  console.log("IMEIs on page 1:", imeis.join(", "));
}

console.log("\n--- issues: select * only count ---");
const starCount = await count("issues");
console.log("issues count:", starCount);

console.log("\n--- issues: join query count (same as app) ---");
const joinCount = await supabase.from("issues").select(ISSUES_SELECT, { count: "exact", head: true });
console.log("error:", joinCount.error?.message ?? "none");
console.log("count:", joinCount.count);

console.log("\n--- current_month filter (May 2026) ---");
const month = monthRange();
console.log("range:", month.from, "->", month.to);
const monthCount = await count("issues", { gte: month.from, lte: month.to });
console.log("issues in current month:", monthCount);

console.log("\n--- device readable? sample 5 ---");
const devices = await supabase.from("device").select("id, imei").limit(5);
console.log("device error:", devices.error?.message ?? "none");
console.log("device sample:", devices.data?.map((d) => d.imei).join(", "));

console.log("\n--- issues with device join blocked test ---");
const issuesNoJoin = await supabase.from("issues").select("id, device_id").limit(20);
const issuesJoin = await supabase.from("issues").select("id, device:device_id(imei)").limit(20);
console.log("no join rows:", issuesNoJoin.data?.length, "error:", issuesNoJoin.error?.message);
console.log("with device join rows:", issuesJoin.data?.length, "error:", issuesJoin.error?.message);
if (issuesJoin.data) {
  const withDevice = issuesJoin.data.filter((r) => r.device?.imei).length;
  const withoutDevice = issuesJoin.data.filter((r) => !r.device?.imei).length;
  console.log("with IMEI:", withDevice, "without IMEI (RLS/missing):", withoutDevice);
}

console.log("\n--- all distinct IMEI prefixes in issues (via join, limit 1000) ---");
const allJoin = await supabase
  .from("issues")
  .select("id, device:device_id(imei)")
  .order("created_at", { ascending: false })
  .limit(1000);
const imeiSet = new Set(allJoin.data?.map((r) => r.device?.imei).filter(Boolean));
console.log("unique IMEIs in first 1000 issues:", imeiSet.size);
console.log("sample:", [...imeiSet].slice(0, 15).join(", "));

console.log("\n=== Done ===");

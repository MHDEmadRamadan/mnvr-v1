export type IssuesFetchDebug = {
  source: "issues-enriched" | "maintenance" | "issues";
  supabaseTotal: number;
  afterClientFilters: number;
  page: number;
  pageSize: number;
  rowsReturned: number;
  activeFilters: Record<string, string>;
};

export function logIssuesFetch(debug: IssuesFetchDebug) {
  if (process.env.NODE_ENV === "production") return;
  console.group("[mnvr/issues] fetch");
  console.table(debug);
  console.groupEnd();
}

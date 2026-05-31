export function hasActiveIssueFilters(state: {
  issueType: string;
  deviceImei: string;
  issueSource: string;
  vehicleNumber: string;
  flespiStatus: string;
  screenStatus: string;
  globalSearch: string;
  dateMode: string;
  fromDate: string;
  toDate: string;
}): boolean {
  return (
    !!state.globalSearch.trim() ||
    !!state.issueType.trim() ||
    !!state.deviceImei.trim() ||
    !!state.issueSource.trim() ||
    !!state.vehicleNumber.trim() ||
    !!state.flespiStatus.trim() ||
    !!state.screenStatus.trim() ||
    state.dateMode !== "all"
  );
}

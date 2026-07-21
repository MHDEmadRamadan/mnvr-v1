import { countActiveFilters, type IssuesFilterState } from "@/lib/issue-filters";

export function hasActiveIssueFilters(state: IssuesFilterState): boolean {
  return countActiveFilters(state) > 0;
}

export {
  ALL_FORM_SUGGESTION_FIELDS,
  FORM_SUGGESTION_FIELD_SOURCES,
  isFormSuggestionFieldName,
  resolveFieldSuggestionSource,
  type FormSuggestionFieldName,
  type FieldSuggestionSource,
} from "@/lib/form-suggestions/field-map";

export {
  getFieldSuggestions,
  getAllFieldSuggestions,
  invalidateFieldSuggestionsCache,
} from "@/lib/form-suggestions/get-field-suggestions";

export {
  getFieldSuggestions as getFieldSuggestionsClient,
  getAllFieldSuggestions as getAllFieldSuggestionsClient,
  invalidateFieldSuggestionsCache as invalidateFieldSuggestionsCacheClient,
} from "@/lib/form-suggestions/suggestions-client";

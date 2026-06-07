import { NextResponse } from "next/server";
import {
  getAllFieldSuggestions,
  getFieldSuggestions,
  invalidateFieldSuggestionsCache,
} from "@/lib/form-suggestions/get-field-suggestions";
import { isFormSuggestionFieldName } from "@/lib/form-suggestions/field-map";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get("field");
    const refresh = searchParams.get("refresh") === "1";

    if (refresh) invalidateFieldSuggestionsCache(field ?? undefined);

    if (field) {
      if (!isFormSuggestionFieldName(field)) {
        return NextResponse.json({ error: `Unknown field: ${field}` }, { status: 400 });
      }
      const values = await getFieldSuggestions(field, { refresh });
      return NextResponse.json({ field, values });
    }

    const suggestions = await getAllFieldSuggestions({ refresh });
    return NextResponse.json({ suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load field suggestions";
    console.error("[form-suggestions]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

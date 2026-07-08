import { NextResponse } from "next/server";
import {
  getAllFieldSuggestions,
  getFieldSuggestions,
  invalidateFieldSuggestionsCache,
} from "@/lib/form-suggestions/get-field-suggestions";
import { isFormSuggestionFieldName } from "@/lib/form-suggestions/field-map";
import { createSupabaseClientForUser, getBearerToken, requireAuthenticated } from "@/lib/auth-server";

export async function GET(request: Request) {
  const user = await requireAuthenticated(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseClientForUser(token);
    const { searchParams } = new URL(request.url);
    const field = searchParams.get("field");
    const refresh = searchParams.get("refresh") === "1";

    if (refresh) invalidateFieldSuggestionsCache(field ?? undefined);

    if (field) {
      if (!isFormSuggestionFieldName(field)) {
        return NextResponse.json({ error: `Unknown field: ${field}` }, { status: 400 });
      }
      const values = await getFieldSuggestions(supabase, field, { refresh });
      return NextResponse.json({ field, values });
    }

    const suggestions = await getAllFieldSuggestions(supabase, { refresh });
    return NextResponse.json({ suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load field suggestions";
    console.error("[form-suggestions]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

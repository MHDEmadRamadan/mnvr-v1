import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type IssueRealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

export type IssueRealtimeMeta = {
  /** Present for DELETE when Postgres sends the old row. */
  id?: string;
};

export type IssueRealtimeListener = (
  event: IssueRealtimeEvent,
  meta?: IssueRealtimeMeta,
) => void;

const ISSUES_CHANNEL_NAME = "issues-dashboard";
const DEBOUNCE_MS = 300;

type IssuesRealtimeState = {
  channel: RealtimeChannel | null;
  listeners: Set<IssueRealtimeListener>;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  pendingEvents: Set<IssueRealtimeEvent>;
};

const state: IssuesRealtimeState = {
  channel: null,
  listeners: new Set(),
  debounceTimer: null,
  pendingEvents: new Set(),
};

type PendingNotify = {
  event: IssueRealtimeEvent;
  meta?: IssueRealtimeMeta;
};

const pendingNotifies: PendingNotify[] = [];

function flushPendingEvents(): void {
  state.debounceTimer = null;
  if (pendingNotifies.length === 0 || state.listeners.size === 0) {
    state.pendingEvents.clear();
    pendingNotifies.length = 0;
    return;
  }

  const batch = pendingNotifies.splice(0, pendingNotifies.length);
  state.pendingEvents.clear();

  for (const listener of state.listeners) {
    for (const item of batch) {
      listener(item.event, item.meta);
    }
  }
}

function scheduleNotify(event: IssueRealtimeEvent, meta?: IssueRealtimeMeta): void {
  state.pendingEvents.add(event);
  pendingNotifies.push({ event, meta });
  if (state.debounceTimer !== null) return;
  state.debounceTimer = setTimeout(flushPendingEvents, DEBOUNCE_MS);
}

function attachChannel(): void {
  if (state.channel || state.listeners.size === 0 || !isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  const channel = supabase.channel(ISSUES_CHANNEL_NAME);

  channel
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "issues" },
      () => scheduleNotify("INSERT"),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "issues" },
      () => scheduleNotify("UPDATE"),
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "issues" },
      (payload) => {
        const id =
          payload.old && typeof payload.old === "object" && "id" in payload.old
            ? String((payload.old as { id: unknown }).id)
            : undefined;
        scheduleNotify("DELETE", id ? { id } : undefined);
      },
    )
    .subscribe();

  state.channel = channel;
}

function detachChannel(): void {
  if (state.debounceTimer !== null) {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = null;
  }
  state.pendingEvents.clear();
  pendingNotifies.length = 0;

  if (!state.channel) return;

  const supabase = getSupabaseClient();
  void supabase.removeChannel(state.channel);
  state.channel = null;
}

/** Subscribe to issue INSERT/UPDATE/DELETE. Multiplexed — one Realtime channel per app instance. */
export function subscribeToIssueChanges(listener: IssueRealtimeListener): () => void {
  state.listeners.add(listener);

  if (state.listeners.size === 1) {
    attachChannel();
  }

  return () => {
    state.listeners.delete(listener);
    if (state.listeners.size === 0) {
      detachChannel();
    }
  };
}

/** @internal Test helpers */
export function __resetIssuesRealtimeForTests(): void {
  detachChannel();
  state.listeners.clear();
}

export function __getIssuesRealtimeListenerCountForTests(): number {
  return state.listeners.size;
}

export function __isIssuesRealtimeChannelActiveForTests(): boolean {
  return state.channel !== null;
}

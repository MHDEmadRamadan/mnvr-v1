import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  __getIssuesRealtimeListenerCountForTests,
  __isIssuesRealtimeChannelActiveForTests,
  __resetIssuesRealtimeForTests,
  subscribeToIssueChanges,
  type IssueRealtimeEvent,
} from "./issues/issues-realtime";

describe("issues realtime subscription manager", () => {
  beforeEach(() => {
    __resetIssuesRealtimeForTests();
  });

  afterEach(() => {
    __resetIssuesRealtimeForTests();
  });

  it("starts with no active channel", () => {
    assert.equal(__getIssuesRealtimeListenerCountForTests(), 0);
    assert.equal(__isIssuesRealtimeChannelActiveForTests(), false);
  });

  it("multiplexes listeners onto a single channel when Supabase is configured", () => {
    if (!isSupabaseConfigured()) {
      const unsub = subscribeToIssueChanges(() => {});
      assert.equal(__getIssuesRealtimeListenerCountForTests(), 1);
      assert.equal(__isIssuesRealtimeChannelActiveForTests(), false);
      unsub();
      return;
    }

    const eventsA: IssueRealtimeEvent[] = [];
    const eventsB: IssueRealtimeEvent[] = [];

    const unsubA = subscribeToIssueChanges((event) => eventsA.push(event));
    assert.equal(__getIssuesRealtimeListenerCountForTests(), 1);
    assert.equal(__isIssuesRealtimeChannelActiveForTests(), true);

    const unsubB = subscribeToIssueChanges((event) => eventsB.push(event));
    assert.equal(__getIssuesRealtimeListenerCountForTests(), 2);
    assert.equal(__isIssuesRealtimeChannelActiveForTests(), true);

    unsubA();
    assert.equal(__getIssuesRealtimeListenerCountForTests(), 1);
    assert.equal(__isIssuesRealtimeChannelActiveForTests(), true);

    unsubB();
    assert.equal(__getIssuesRealtimeListenerCountForTests(), 0);
    assert.equal(__isIssuesRealtimeChannelActiveForTests(), false);
  });

  it("does not duplicate channel when re-subscribing after full cleanup", () => {
    if (!isSupabaseConfigured()) return;

    const unsub = subscribeToIssueChanges(() => {});
    assert.equal(__isIssuesRealtimeChannelActiveForTests(), true);
    unsub();
    assert.equal(__isIssuesRealtimeChannelActiveForTests(), false);

    const unsub2 = subscribeToIssueChanges(() => {});
    assert.equal(__isIssuesRealtimeChannelActiveForTests(), true);
    unsub2();
  });
});

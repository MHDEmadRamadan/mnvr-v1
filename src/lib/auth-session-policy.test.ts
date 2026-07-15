import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateSessionExpiry,
  getSessionExpiryMessage,
  HOUR_MS,
  type SessionPolicyConfig,
} from "./auth-session-policy";

const SHORT_POLICY: SessionPolicyConfig = {
  idleTimeoutMs: 1_000,
  maxSessionLifetimeMs: 5_000,
};

describe("evaluateSessionExpiry", () => {
  it("returns null while within idle and max lifetime", () => {
    const started = 1_000;
    const activity = 1_500;
    assert.equal(evaluateSessionExpiry(2_000, started, activity, SHORT_POLICY), null);
  });

  it("expires for idle when inactive beyond idle timeout", () => {
    const started = 0;
    const activity = 0;
    assert.equal(evaluateSessionExpiry(1_001, started, activity, SHORT_POLICY), "idle");
  });

  it("expires for max lifetime even if recently active", () => {
    const started = 0;
    const activity = 4_900;
    assert.equal(evaluateSessionExpiry(5_000, started, activity, SHORT_POLICY), "max_lifetime");
  });

  it("prefers max_lifetime over idle when both apply", () => {
    const started = 0;
    const activity = 0;
    assert.equal(evaluateSessionExpiry(10_000, started, activity, SHORT_POLICY), "max_lifetime");
  });

  it("uses production defaults of 4h idle and 24h max when config omitted", () => {
    const started = 0;
    assert.equal(evaluateSessionExpiry(4 * HOUR_MS - 1, started, started), null);
    assert.equal(evaluateSessionExpiry(4 * HOUR_MS, started, started), "idle");
    assert.equal(
      evaluateSessionExpiry(24 * HOUR_MS, started, 24 * HOUR_MS - 1),
      "max_lifetime",
    );
  });
});

describe("getSessionExpiryMessage", () => {
  it("explains inactivity vs max lifetime", () => {
    assert.match(getSessionExpiryMessage("idle"), /inactivity/i);
    assert.match(getSessionExpiryMessage("max_lifetime"), /24-hour|maximum/i);
  });
});

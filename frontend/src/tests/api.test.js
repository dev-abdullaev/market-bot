import { describe, it, expect, beforeEach } from "vitest";
import { setToken, getToken, clearToken } from "../lib/auth.js";

describe("auth token storage", () => {
  beforeEach(() => localStorage.clear());
  it("stores and reads token", () => { setToken("abc"); expect(getToken()).toBe("abc"); });
  it("clears token", () => { setToken("abc"); clearToken(); expect(getToken()).toBeNull(); });
});

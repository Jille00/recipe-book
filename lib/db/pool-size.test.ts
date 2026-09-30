import { afterEach, describe, expect, it, vi } from "vitest";
import { poolSize } from "./index";

afterEach(() => vi.unstubAllEnvs());

describe("poolSize", () => {
  it("uses one connection in session mode", () => {
    expect(poolSize("postgresql://u:p@aws-1-eu-west-1.pooler.supabase.com:5432/postgres")).toBe(1);
  });

  it("uses a few connections with the transaction pooler", () => {
    expect(poolSize("postgresql://u:p@aws-1-eu-west-1.pooler.supabase.com:6543/postgres")).toBe(5);
  });

  it("honours DATABASE_POOL_MAX", () => {
    vi.stubEnv("DATABASE_POOL_MAX", "3");
    expect(poolSize("postgresql://u:p@host:5432/db")).toBe(3);
  });

  it("falls back to one for an unparseable URL", () => {
    expect(poolSize("not a url")).toBe(1);
  });
});

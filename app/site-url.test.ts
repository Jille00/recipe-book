import { describe, it, expect, vi, afterEach } from "vitest";

// SITE_URL is computed once at import time, so each case re-imports the module
// with a stubbed NEXT_PUBLIC_APP_URL.
async function load(appUrl: string | undefined) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", appUrl as string);
  return import("@/app/site-url");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SITE_URL", () => {
  it("defaults to the www origin when unset or empty", async () => {
    expect((await load(undefined)).SITE_URL).toBe("https://www.kookboek.app");
    expect((await load("")).SITE_URL).toBe("https://www.kookboek.app");
  });

  it("normalises the apex domain to www", async () => {
    expect((await load("https://kookboek.app")).SITE_URL).toBe("https://www.kookboek.app");
    expect((await load("https://kookboek.app/")).SITE_URL).toBe("https://www.kookboek.app");
  });

  it("reduces a configured URL to its origin", async () => {
    expect((await load("https://www.kookboek.app/some/path/?q=1")).SITE_URL).toBe("https://www.kookboek.app");
    expect((await load("http://localhost:3000/")).SITE_URL).toBe("http://localhost:3000");
  });

  it("keeps other hosts (e.g. preview deployments) as-is", async () => {
    expect((await load("https://preview-123.vercel.app")).SITE_URL).toBe("https://preview-123.vercel.app");
    expect((await load("https://sub.kookboek.app")).SITE_URL).toBe("https://sub.kookboek.app");
  });

  it("falls back to the default for an invalid URL", async () => {
    expect((await load("kookboek.app")).SITE_URL).toBe("https://www.kookboek.app");
    expect((await load("not a url")).SITE_URL).toBe("https://www.kookboek.app");
  });
});

describe("absoluteUrl", () => {
  it("joins paths with exactly one slash", async () => {
    const { absoluteUrl } = await load("https://kookboek.app");
    expect(absoluteUrl("/recipes")).toBe("https://www.kookboek.app/recipes");
    expect(absoluteUrl("recipes")).toBe("https://www.kookboek.app/recipes");
    expect(absoluteUrl()).toBe("https://www.kookboek.app/");
    expect(absoluteUrl("/r/abc/pasta?x=1")).toBe("https://www.kookboek.app/r/abc/pasta?x=1");
  });
});

describe("SITE_OG_IMAGE", () => {
  it("describes a 1200x630 image", async () => {
    const { SITE_OG_IMAGE } = await load(undefined);
    expect(SITE_OG_IMAGE).toMatchObject({ url: "/og-image.png", width: 1200, height: 630 });
  });
});

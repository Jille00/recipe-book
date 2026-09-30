import { afterEach, describe, expect, it, vi } from "vitest";

// SITE_URL is computed once when the module loads, so each case sets the
// environment first and then imports a fresh copy of the module.
async function loadWithAppUrl(value: string | undefined) {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", value);
  vi.resetModules();
  return import("./site-url");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("SITE_URL", () => {
  it.each([
    ["https://kookboek.app", "https://www.kookboek.app"],
    ["https://kookboek.app/", "https://www.kookboek.app"],
    ["https://kookboek.app///", "https://www.kookboek.app"],
    ["https://www.kookboek.app", "https://www.kookboek.app"],
    ["https://www.kookboek.app/", "https://www.kookboek.app"],
    ["https://www.kookboek.app/recipes?x=1#top", "https://www.kookboek.app"],
    ["https://KOOKBOEK.app", "https://www.kookboek.app"],
  ])("normalises %j to %j", async (configured, expected) => {
    const { SITE_URL } = await loadWithAppUrl(configured);
    expect(SITE_URL).toBe(expected);
  });

  it("leaves localhost alone", async () => {
    expect((await loadWithAppUrl("http://localhost:3000/")).SITE_URL).toBe("http://localhost:3000");
  });

  it("leaves other hosts alone, including preview subdomains", async () => {
    expect((await loadWithAppUrl("https://preview.kookboek.app")).SITE_URL).toBe("https://preview.kookboek.app");
    expect((await loadWithAppUrl("https://example.com/")).SITE_URL).toBe("https://example.com");
  });

  it.each([[undefined], [""], ["not a url"], ["kookboek.app"]])(
    "falls back to the www origin for %j",
    async (configured) => {
      const { SITE_URL } = await loadWithAppUrl(configured);
      expect(SITE_URL).toBe("https://www.kookboek.app");
    }
  );
});

describe("absoluteUrl", () => {
  it("joins a site-relative path to the canonical origin", async () => {
    const { absoluteUrl } = await loadWithAppUrl("https://kookboek.app/");
    expect(absoluteUrl("/r/aB3xK9pQ/pancakes")).toBe("https://www.kookboek.app/r/aB3xK9pQ/pancakes");
  });

  it("adds a missing leading slash", async () => {
    const { absoluteUrl } = await loadWithAppUrl("https://www.kookboek.app");
    expect(absoluteUrl("recipes")).toBe("https://www.kookboek.app/recipes");
  });

  it("defaults to the home page", async () => {
    const { absoluteUrl } = await loadWithAppUrl("https://www.kookboek.app");
    expect(absoluteUrl()).toBe("https://www.kookboek.app/");
  });

  it("never produces a double slash after the origin", async () => {
    const { absoluteUrl } = await loadWithAppUrl("http://localhost:3000/");
    expect(absoluteUrl("/sitemap.xml")).toBe("http://localhost:3000/sitemap.xml");
  });
});

describe("SITE_OG_IMAGE", () => {
  it("is a site-relative 1200x630 image", async () => {
    const { SITE_OG_IMAGE } = await loadWithAppUrl(undefined);
    expect(SITE_OG_IMAGE).toMatchObject({ url: "/og-image.png", width: 1200, height: 630 });
  });
});

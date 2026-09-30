// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { guardedNavigationTarget } from "./use-link-navigation-guard";

// Links resolve against the test page, so use its origin.
const location = { origin: window.location.origin, pathname: window.location.pathname, search: "" };

function clickOn(html: string, overrides: Partial<MouseEvent> = {}) {
  document.body.innerHTML = html;
  const target = document.querySelector("[data-target]") ?? document.body.firstElementChild!;
  return {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    target,
    ...overrides,
  } as MouseEvent;
}

describe("guardedNavigationTarget", () => {
  it("holds back a plain click on an in-app link", () => {
    expect(guardedNavigationTarget(clickOn('<a href="/dashboard">x</a>'), location)).toBe("/dashboard");
  });

  it("finds the link from a child element", () => {
    const event = clickOn('<a href="/favorites?x=1"><span data-target>x</span></a>');
    expect(guardedNavigationTarget(event, location)).toBe("/favorites?x=1");
  });

  it.each([
    ["new tab", '<a href="/dashboard">x</a>', { metaKey: true }],
    ["ctrl click", '<a href="/dashboard">x</a>', { ctrlKey: true }],
    ["middle button", '<a href="/dashboard">x</a>', { button: 1 }],
    ["already handled", '<a href="/dashboard">x</a>', { defaultPrevented: true }],
  ])("ignores a %s", (_label, html, overrides) => {
    expect(guardedNavigationTarget(clickOn(html, overrides), location)).toBeNull();
  });

  it.each([
    ["another site", '<a href="https://example.com/">x</a>'],
    ["target=_blank", '<a href="/dashboard" target="_blank">x</a>'],
    ["a download", '<a href="/file.pdf" download>x</a>'],
    ["an anchor on this page", '<a href="#steps">x</a>'],
    ["a button", "<button>x</button>"],
  ])("ignores %s", (_label, html) => {
    expect(guardedNavigationTarget(clickOn(html), location)).toBeNull();
  });
});

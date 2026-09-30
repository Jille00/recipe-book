import { describe, expect, it } from "vitest";
import {
  checkFetchUrl,
  isPublicIpAddress,
  parseIPv4,
  parseIPv6,
} from "./url-safety";

describe("parseIPv4", () => {
  it("parses canonical dotted decimal", () => {
    expect(parseIPv4("93.184.216.34")).toEqual([93, 184, 216, 34]);
    expect(parseIPv4("0.0.0.0")).toEqual([0, 0, 0, 0]);
    expect(parseIPv4("255.255.255.255")).toEqual([255, 255, 255, 255]);
  });

  it.each([
    "2130706433",
    "0x7f.0.0.1",
    "0177.0.0.1",
    "127.1",
    "127.0.0.1.",
    "127.0.0.256",
    "1.2.3",
    "1.2.3.4.5",
    "01.2.3.4",
    "+1.2.3.4",
    "",
    "a.b.c.d",
  ])("rejects non-canonical form %s", (input) => {
    expect(parseIPv4(input)).toBeNull();
  });
});

describe("parseIPv6", () => {
  it("expands compressed forms", () => {
    expect(parseIPv6("::1")).toEqual([...new Array(15).fill(0), 1]);
    expect(parseIPv6("::")).toEqual(new Array(16).fill(0));
    expect(parseIPv6("[2606:4700::6810:84e5]")).toEqual([
      0x26, 0x06, 0x47, 0x00, 0, 0, 0, 0, 0, 0, 0, 0, 0x68, 0x10, 0x84, 0xe5,
    ]);
  });

  it("handles an embedded dotted IPv4 tail", () => {
    expect(parseIPv6("::ffff:127.0.0.1")).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff, 127, 0, 0, 1,
    ]);
    expect(parseIPv6("::ffff:7f00:1")).toEqual(parseIPv6("::ffff:127.0.0.1"));
  });

  it.each(["1::2::3", "12345::", "fe80::1%eth0", "::ffff:127.0.0.256", "1:2:3:4:5:6:7:8:9", "g::1", "127.0.0.1"])(
    "rejects invalid %s",
    (input) => {
      expect(parseIPv6(input)).toBeNull();
    }
  );
});

describe("isPublicIpAddress", () => {
  it.each([
    "8.8.8.8",
    "93.184.216.34",
    "1.1.1.1",
    "172.15.255.255",
    "172.32.0.0",
    "100.63.255.255",
    "100.128.0.0",
    "169.253.255.255",
    "192.167.255.255",
    "223.255.255.255",
    "2606:4700:4700::1111",
    "2a00:1450:4001:80b::200e",
    "::ffff:8.8.8.8",
    "::ffff:808:808",
    "64:ff9b::808:808",
  ])("allows public address %s", (address) => {
    expect(isPublicIpAddress(address)).toBe(true);
  });

  it.each([
    // unspecified / "this network"
    ["0.0.0.0"],
    ["0.1.2.3"],
    // loopback
    ["127.0.0.1"],
    ["127.255.255.254"],
    // private
    ["10.0.0.1"],
    ["10.255.255.255"],
    ["172.16.0.1"],
    ["172.31.255.255"],
    ["192.168.0.1"],
    ["192.168.255.255"],
    // link-local incl. cloud metadata
    ["169.254.0.1"],
    ["169.254.169.254"],
    // carrier-grade NAT
    ["100.64.0.1"],
    ["100.127.255.255"],
    // multicast and reserved
    ["224.0.0.1"],
    ["239.255.255.250"],
    ["240.0.0.1"],
    ["255.255.255.255"],
    // documentation / benchmarking / special
    ["192.0.2.1"],
    ["198.51.100.7"],
    ["203.0.113.9"],
    ["198.18.0.1"],
    ["192.0.0.170"],
    // IPv6 loopback / unspecified
    ["::1"],
    ["::"],
    // IPv6 link-local, unique local, site-local, multicast
    ["fe80::1"],
    ["febf:ffff::1"],
    ["fc00::1"],
    ["fd12:3456:789a::1"],
    ["fec0::1"],
    ["ff02::1"],
    // IPv4-mapped / compatible / translated forms of blocked addresses
    ["::ffff:127.0.0.1"],
    ["::ffff:7f00:1"],
    ["::ffff:169.254.169.254"],
    ["::ffff:a9fe:a9fe"],
    ["::ffff:10.0.0.1"],
    ["::ffff:192.168.1.1"],
    ["::127.0.0.1"],
    ["::7f00:1"],
    ["::ffff:0:127.0.0.1"],
    ["0:0:0:0:0:ffff:7f00:0001"],
    // NAT64 / 6to4 wrapping private IPv4, Teredo, documentation, discard
    ["64:ff9b::7f00:1"],
    ["64:ff9b:1::1"],
    ["2002:7f00:1::"],
    ["2002:c0a8:101::1"],
    ["2001::1"],
    ["2001:db8::1"],
    ["100::1"],
    // bracketed literal
    ["[::1]"],
    // not addresses at all
    ["2130706433"],
    ["0x7f.0.0.1"],
    ["localhost"],
    [""],
  ])("blocks %s", (address) => {
    expect(isPublicIpAddress(address)).toBe(false);
  });
});

describe("checkFetchUrl", () => {
  it.each([
    "https://www.bbcgoodfood.com/recipes/easy-chocolate-cake",
    "http://example.com/recipe?id=1#top",
    "https://example.com:443/recipe",
    "http://example.com:80/recipe",
    "https://example.com:80/recipe",
    "https://sub.domain.example.co.uk/",
    "https://8.8.8.8/",
    "https://[2606:4700:4700::1111]/",
    "  https://example.com/with-spaces-around  ",
  ])("allows %s", (url) => {
    const result = checkFetchUrl(url);
    expect(result.ok).toBe(true);
  });

  it.each([
    ["ftp://example.com/file", "protocol"],
    ["file:///etc/passwd", "protocol"],
    ["javascript:alert(1)", "protocol"],
    ["data:text/html,hi", "protocol"],
    ["gopher://example.com/", "protocol"],
    ["https://user:pass@example.com/", "credentials"],
    ["https://user@example.com/", "credentials"],
    ["https://example.com:8080/", "port"],
    ["http://example.com:22/", "port"],
    ["https://example.com:0/", "port"],
    ["http://localhost/", "hostname"],
    ["http://localhost./", "hostname"],
    ["http://LOCALHOST:80/", "hostname"],
    ["http://app.localhost/", "hostname"],
    ["http://printer.local/", "hostname"],
    ["http://metadata.google.internal/", "hostname"],
    ["http://intranet/", "hostname"],
    ["http://router.lan/", "hostname"],
    ["http://127.0.0.1/", "address"],
    ["http://127.0.0.1:80/", "address"],
    ["http://10.1.2.3/", "address"],
    ["http://169.254.169.254/latest/meta-data/", "address"],
    ["http://100.64.0.1/", "address"],
    ["http://0.0.0.0/", "address"],
    ["http://[::1]/", "address"],
    ["http://[::]/", "address"],
    ["http://[::ffff:127.0.0.1]/", "address"],
    ["http://[::ffff:7f00:1]/", "address"],
    ["http://[fe80::1]/", "address"],
    ["http://[fd00::1]/", "address"],
    // Numeric tricks some resolvers accept; the URL parser canonicalises them.
    ["http://2130706433/", "address"],
    ["http://0x7f.0.0.1/", "address"],
    ["http://0x7f000001/", "address"],
    ["http://017700000001/", "address"],
    ["http://0177.0.0.1/", "address"],
    ["http://127.1/", "address"],
    ["http://3232235777/", "address"],
    ["http://0xA9FEA9FE/", "address"],
    ["not a url", "invalid"],
    ["", "invalid"],
    ["https://", "invalid"],
    [`https://example.com/${"a".repeat(2100)}`, "invalid"],
  ])("rejects %s (%s)", (url, reason) => {
    const result = checkFetchUrl(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe(reason);
  });

  it("returns the parsed URL", () => {
    const result = checkFetchUrl("https://Example.com/Recipe");
    expect(result.ok && result.url.toString()).toBe("https://example.com/Recipe");
  });
});

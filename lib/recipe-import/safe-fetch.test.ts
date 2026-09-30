import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import zlib from "node:zlib";
import type { IncomingMessage, RequestOptions } from "node:http";
import type { LookupAddress } from "node:dns";
import { describe, expect, it } from "vitest";
import {
  IMPORTER_USER_AGENT,
  SafeFetchError,
  createSafeLookup,
  nextRedirectUrl,
  safeFetch,
  type RequestFn,
  type SafeFetchOptions,
} from "./safe-fetch";

// ---------------------------------------------------------------------------
// createSafeLookup: the DNS step that closes the rebinding gap
// ---------------------------------------------------------------------------

type LookupOutcome = { err: NodeJS.ErrnoException | null; address: unknown; family?: number };

function runLookup(
  addresses: LookupAddress[] | Error,
  options: { all?: boolean; family?: number } = {}
): Promise<LookupOutcome> {
  const lookup = createSafeLookup((_host, cb) => {
    if (addresses instanceof Error) cb(addresses, []);
    else cb(null, addresses);
  });
  return new Promise((resolve) => {
    lookup("recipes.test", options, (err, address, family) => resolve({ err, address, family }));
  });
}

describe("createSafeLookup", () => {
  it("passes a single public address to the socket", async () => {
    const out = await runLookup([{ address: "93.184.216.34", family: 4 }]);
    expect(out.err).toBeNull();
    expect(out.address).toBe("93.184.216.34");
    expect(out.family).toBe(4);
  });

  it("returns all validated addresses when asked (happy eyeballs)", async () => {
    const addresses = [
      { address: "2606:4700::6810:84e5", family: 6 },
      { address: "104.16.132.229", family: 4 },
    ];
    const out = await runLookup(addresses, { all: true });
    expect(out.err).toBeNull();
    expect(out.address).toEqual(addresses);
  });

  it.each([
    [[{ address: "127.0.0.1", family: 4 }]],
    [[{ address: "169.254.169.254", family: 4 }]],
    [[{ address: "10.0.0.5", family: 4 }]],
    [[{ address: "::1", family: 6 }]],
    [[{ address: "::ffff:127.0.0.1", family: 6 }]],
    [[{ address: "fd00::1", family: 6 }]],
    // A public record mixed with a private one must not be accepted.
    [
      [
        { address: "93.184.216.34", family: 4 },
        { address: "192.168.1.1", family: 4 },
      ],
    ],
  ])("refuses a name resolving to %j", async (addresses) => {
    for (const all of [false, true]) {
      const out = await runLookup(addresses, { all });
      expect(out.err).toBeInstanceOf(SafeFetchError);
      expect((out.err as SafeFetchError).code).toBe("blocked_address");
    }
  });

  it("filters by the requested family", async () => {
    const out = await runLookup(
      [
        { address: "2606:4700::1", family: 6 },
        { address: "93.184.216.34", family: 4 },
      ],
      { family: 4 }
    );
    expect(out.address).toBe("93.184.216.34");
  });

  it("reports an empty answer as not found and passes DNS errors on", async () => {
    const empty = await runLookup([]);
    expect(empty.err?.code).toBe("ENOTFOUND");
    const dnsError: NodeJS.ErrnoException = new Error("nope");
    dnsError.code = "ENOTFOUND";
    const failed = await runLookup(dnsError);
    expect(failed.err).toBe(dnsError);
  });
});

// ---------------------------------------------------------------------------
// nextRedirectUrl
// ---------------------------------------------------------------------------

describe("nextRedirectUrl", () => {
  const current = new URL("https://recipes.test/a/b");

  it("resolves relative locations", () => {
    expect(nextRedirectUrl(current, "/c").toString()).toBe("https://recipes.test/c");
    expect(nextRedirectUrl(current, "d").toString()).toBe("https://recipes.test/a/d");
    expect(nextRedirectUrl(current, "//other.test/x").toString()).toBe("https://other.test/x");
  });

  it.each([
    ["http://127.0.0.1/", "blocked_address"],
    ["http://169.254.169.254/latest/meta-data/", "blocked_address"],
    ["http://[::1]/", "blocked_address"],
    ["http://localhost/", "invalid_url"],
    ["https://recipes.test:8443/", "invalid_url"],
    ["file:///etc/passwd", "invalid_url"],
    ["https://user:pw@recipes.test/", "invalid_url"],
  ])("rejects a redirect to %s", (location, code) => {
    expect(() => nextRedirectUrl(current, location)).toThrowError(
      expect.objectContaining({ code })
    );
  });

  it("rejects a missing Location", () => {
    expect(() => nextRedirectUrl(current, undefined)).toThrow(SafeFetchError);
  });
});

// ---------------------------------------------------------------------------
// safeFetch with a fake transport (no network)
// ---------------------------------------------------------------------------

interface FakeResponse {
  status: number;
  headers?: Record<string, string>;
  /** Body chunks, or a function producing chunks forever. */
  body?: Buffer | string | (() => Buffer);
  remoteAddress?: string;
  hang?: boolean;
}

interface Call {
  url: string;
  options: RequestOptions;
  destroyed: boolean;
  chunksWritten: number;
}

function fakeTransport(handler: (url: URL) => FakeResponse) {
  const calls: Call[] = [];
  const request: RequestFn = (url, options, onResponse) => {
    const call: Call = { url: url.toString(), options, destroyed: false, chunksWritten: 0 };
    calls.push(call);
    const req = new EventEmitter() as EventEmitter & { end(): void; destroy(): void };
    let res: PassThrough | undefined;
    req.destroy = () => {
      call.destroyed = true;
      res?.destroy();
    };
    req.end = () => {
      setImmediate(() => {
        const spec = handler(url);
        if (spec.hang) return;
        const stream = new PassThrough();
        res = stream;
        Object.assign(stream, {
          statusCode: spec.status,
          headers: spec.headers ?? {},
          socket: { remoteAddress: spec.remoteAddress ?? "93.184.216.34" },
        });
        onResponse(stream as unknown as IncomingMessage);
        const body = spec.body;
        if (typeof body === "function") {
          const pump = () => {
            if (call.destroyed || stream.destroyed) return;
            stream.write(body());
            call.chunksWritten++;
            setImmediate(pump);
          };
          pump();
        } else {
          if (body !== undefined) stream.write(body);
          stream.end();
        }
      });
    };
    return req;
  };
  return { request, calls };
}

const htmlOptions: SafeFetchOptions = {
  maxBytes: 1024 * 1024,
  timeoutMs: 2000,
  accept: "text/html",
  acceptContentType: (ct) => ct.startsWith("text/html"),
};

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: "SafeFetchError", code });
}

describe("safeFetch", () => {
  it("returns the body, final URL and content type", async () => {
    const { request, calls } = fakeTransport(() => ({
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: "<p>hi</p>",
    }));
    const result = await safeFetch("https://recipes.test/soup", htmlOptions, { request });
    expect(result.body.toString()).toBe("<p>hi</p>");
    expect(result.url).toBe("https://recipes.test/soup");
    expect(result.contentType).toBe("text/html; charset=utf-8");
    expect(calls).toHaveLength(1);
  });

  it("sends only an identifying User-Agent, uses the validating lookup and no shared agent", async () => {
    const { request, calls } = fakeTransport(() => ({
      status: 200,
      headers: { "content-type": "text/html" },
      body: "ok",
    }));
    await safeFetch("https://recipes.test/", htmlOptions, { request });
    const { options } = calls[0];
    const headers = options.headers as Record<string, string>;
    expect(headers["User-Agent"]).toBe(IMPORTER_USER_AGENT);
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toEqual(
      expect.arrayContaining(["cookie"])
    );
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain("authorization");
    expect(typeof options.lookup).toBe("function");
    expect(options.agent).toBe(false);
    expect(options.method).toBe("GET");
  });

  it("refuses disallowed URLs without making a request", async () => {
    const { request, calls } = fakeTransport(() => ({ status: 200 }));
    await expectCode(safeFetch("http://127.0.0.1/", htmlOptions, { request }), "blocked_address");
    await expectCode(safeFetch("http://2130706433/", htmlOptions, { request }), "blocked_address");
    await expectCode(safeFetch("http://[::ffff:7f00:1]/", htmlOptions, { request }), "blocked_address");
    await expectCode(safeFetch("http://localhost/", htmlOptions, { request }), "invalid_url");
    await expectCode(safeFetch("https://recipes.test:8080/", htmlOptions, { request }), "invalid_url");
    await expectCode(safeFetch("ftp://recipes.test/", htmlOptions, { request }), "invalid_url");
    expect(calls).toHaveLength(0);
  });

  it("follows redirects, validating every hop", async () => {
    const { request, calls } = fakeTransport((url): FakeResponse =>
      url.pathname === "/old"
        ? { status: 301, headers: { location: "/new" } }
        : url.pathname === "/new"
          ? { status: 302, headers: { location: "https://www.recipes.test/final" } }
          : { status: 200, headers: { "content-type": "text/html" }, body: "done" }
    );
    const result = await safeFetch("https://recipes.test/old", htmlOptions, { request });
    expect(result.url).toBe("https://www.recipes.test/final");
    expect(calls.map((c) => c.url)).toEqual([
      "https://recipes.test/old",
      "https://recipes.test/new",
      "https://www.recipes.test/final",
    ]);
  });

  it("refuses a redirect to an internal address without requesting it", async () => {
    const { request, calls } = fakeTransport(() => ({
      status: 307,
      headers: { location: "http://169.254.169.254/latest/meta-data/" },
    }));
    await expectCode(safeFetch("https://recipes.test/", htmlOptions, { request }), "blocked_address");
    expect(calls).toHaveLength(1);
  });

  it("stops after 5 redirects", async () => {
    let n = 0;
    const { request, calls } = fakeTransport(() => ({
      status: 302,
      headers: { location: `/hop${++n}` },
    }));
    await expectCode(safeFetch("https://recipes.test/", htmlOptions, { request }), "too_many_redirects");
    expect(calls).toHaveLength(6);
  });

  it("refuses a response from a non-public remote address", async () => {
    const { request } = fakeTransport(() => ({
      status: 200,
      headers: { "content-type": "text/html" },
      body: "secret",
      remoteAddress: "10.0.0.7",
    }));
    await expectCode(safeFetch("https://recipes.test/", htmlOptions, { request }), "blocked_address");
  });

  it("maps HTTP errors with their status", async () => {
    const { request } = fakeTransport(() => ({ status: 404 }));
    await expect(safeFetch("https://recipes.test/", htmlOptions, { request })).rejects.toMatchObject({
      code: "http_status",
      status: 404,
    });
  });

  it("refuses unexpected content types before reading the body", async () => {
    const { request, calls } = fakeTransport(() => ({
      status: 200,
      headers: { "content-type": "application/pdf" },
      body: () => Buffer.alloc(1024),
    }));
    await expectCode(safeFetch("https://recipes.test/", htmlOptions, { request }), "unsupported_content_type");
    expect(calls[0].destroyed).toBe(true);
  });

  it("refuses a declared Content-Length over the cap", async () => {
    const { request } = fakeTransport(() => ({
      status: 200,
      headers: { "content-type": "text/html", "content-length": String(5 * 1024 * 1024) },
      body: "x",
    }));
    await expectCode(safeFetch("https://recipes.test/", htmlOptions, { request }), "too_large");
  });

  it("aborts a streamed body once it exceeds the cap", async () => {
    const { request, calls } = fakeTransport(() => ({
      status: 200,
      headers: { "content-type": "text/html" },
      body: () => Buffer.alloc(64 * 1024, 97),
    }));
    await expectCode(
      safeFetch("https://recipes.test/", { ...htmlOptions, maxBytes: 256 * 1024 }, { request }),
      "too_large"
    );
    expect(calls[0].destroyed).toBe(true);
    // Stopped shortly after the cap instead of reading forever.
    await new Promise((r) => setTimeout(r, 20));
    expect(calls[0].chunksWritten).toBeLessThan(20);
  });

  it("applies the cap after decompression (compression bomb)", async () => {
    const bomb = zlib.gzipSync(Buffer.alloc(8 * 1024 * 1024));
    expect(bomb.length).toBeLessThan(64 * 1024);
    const { request } = fakeTransport(() => ({
      status: 200,
      headers: { "content-type": "text/html", "content-encoding": "gzip" },
      body: bomb,
    }));
    await expectCode(safeFetch("https://recipes.test/", htmlOptions, { request }), "too_large");
  });

  it("decompresses gzip and brotli bodies", async () => {
    for (const [encoding, data] of [
      ["gzip", zlib.gzipSync("<p>gz</p>")],
      ["br", zlib.brotliCompressSync("<p>br</p>")],
      ["deflate", zlib.deflateSync("<p>df</p>")],
    ] as const) {
      const { request } = fakeTransport(() => ({
        status: 200,
        headers: { "content-type": "text/html", "content-encoding": encoding },
        body: data,
      }));
      const result = await safeFetch("https://recipes.test/", htmlOptions, { request });
      expect(result.body.toString()).toMatch(/^<p>(gz|br|df)<\/p>$/);
    }
  });

  it("times out a server that never answers", async () => {
    const { request, calls } = fakeTransport(() => ({ status: 200, hang: true }));
    const started = Date.now();
    await expectCode(
      safeFetch("https://recipes.test/", { ...htmlOptions, timeoutMs: 50 }, { request }),
      "timeout"
    );
    expect(Date.now() - started).toBeLessThan(1000);
    expect(calls[0].destroyed).toBe(true);
  });

  it("times out a body that trickles in too slowly", async () => {
    const { request } = fakeTransport(() => ({
      status: 200,
      headers: { "content-type": "text/html" },
      body: () => Buffer.from("a"),
    }));
    await expectCode(
      safeFetch("https://recipes.test/", { ...htmlOptions, timeoutMs: 50, maxBytes: 1e9 }, { request }),
      "timeout"
    );
  });

  it("maps transport errors to safe codes", async () => {
    const request: RequestFn = () => {
      const req = new EventEmitter() as EventEmitter & { end(): void; destroy(): void };
      req.destroy = () => undefined;
      req.end = () =>
        setImmediate(() => {
          const err: NodeJS.ErrnoException = new Error("getaddrinfo ENOTFOUND recipes.test");
          err.code = "ENOTFOUND";
          req.emit("error", err);
        });
      return req;
    };
    await expectCode(safeFetch("https://recipes.test/", htmlOptions, { request }), "not_found_host");
  });
});

/**
 * Fetching user-supplied URLs from the server without enabling server-side
 * request forgery.
 *
 * - Every URL (the first one and every redirect hop) must pass checkFetchUrl:
 *   http(s) only, ports 80/443, no credentials, no internal host names or
 *   non-public IP literals.
 * - DNS rebinding: global fetch resolves names itself, so a name could resolve
 *   to a public address when checked and to 127.0.0.1 when connecting. Here
 *   node:http(s) gets a custom `lookup` that resolves the name, rejects the
 *   request if ANY returned address is non-public, and hands only those
 *   validated addresses to the socket. The connected socket's remote address
 *   is checked again before anything is sent.
 * - Redirects are followed manually (max 5), a single deadline covers the
 *   whole exchange, and the body is streamed with a hard byte cap (applied
 *   after decompression, so a compression bomb cannot get around it).
 * - No cookies, no auth headers, no connection reuse.
 */

import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import type { IncomingMessage, RequestOptions } from "node:http";
import type { LookupFunction, Socket } from "node:net";
import zlib from "node:zlib";
import type { Readable } from "node:stream";
import { checkFetchUrl, isPublicIpAddress, type UrlRejection } from "./url-safety";

export const IMPORTER_USER_AGENT =
  "KookboekRecipeImporter/1.0 (+https://www.kookboek.app)";

export type SafeFetchErrorCode =
  | "invalid_url"
  | "blocked_address"
  | "timeout"
  | "too_large"
  | "too_many_redirects"
  | "http_status"
  | "unsupported_content_type"
  | "not_found_host"
  | "network";

export class SafeFetchError extends Error {
  readonly code: SafeFetchErrorCode;
  /** HTTP status for "http_status". */
  readonly status?: number;
  /** Why a URL was refused, for "invalid_url" / "blocked_address". */
  readonly reason?: UrlRejection;

  constructor(
    code: SafeFetchErrorCode,
    message: string,
    extra: { status?: number; reason?: UrlRejection } = {}
  ) {
    super(message);
    this.name = "SafeFetchError";
    this.code = code;
    this.status = extra.status;
    this.reason = extra.reason;
  }
}

export interface SafeFetchOptions {
  /** Maximum body size in bytes (after decompression). */
  maxBytes: number;
  /** Deadline for the whole exchange, redirects included. */
  timeoutMs: number;
  /** Accept header value. */
  accept: string;
  /** Checked against the Content-Type header before the body is read. */
  acceptContentType?: (contentType: string) => boolean;
  maxRedirects?: number;
}

export interface SafeFetchResult {
  /** Final URL after redirects. */
  url: string;
  status: number;
  /** Lower-cased Content-Type header ("" when absent). */
  contentType: string;
  body: Buffer;
}

type Resolver = (
  hostname: string,
  callback: (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void
) => void;

const systemResolver: Resolver = (hostname, callback) =>
  dns.lookup(hostname, { all: true, verbatim: true }, callback);

/**
 * A `lookup` for node:net that only ever yields public addresses. If DNS
 * returns any non-public address the connection fails, so a name cannot mix
 * a public and a private record and hope the private one gets picked.
 */
export function createSafeLookup(resolve: Resolver = systemResolver): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname, (err, addresses) => {
      if (err) {
        callback(err, "", 4);
        return;
      }
      const wantedFamily = options.family === 4 || options.family === 6 ? options.family : 0;
      const usable = (addresses ?? []).filter(
        (a) => wantedFamily === 0 || a.family === wantedFamily
      );
      if (usable.length === 0) {
        const notFound: NodeJS.ErrnoException = new Error(`No addresses for ${hostname}`);
        notFound.code = "ENOTFOUND";
        callback(notFound, "", 4);
        return;
      }
      if (usable.some((a) => !isPublicIpAddress(a.address))) {
        callback(
          new SafeFetchError("blocked_address", "Host resolves to a non-public address"),
          "",
          4
        );
        return;
      }
      if (options.all) {
        callback(null, usable);
      } else {
        callback(null, usable[0].address, usable[0].family);
      }
    });
  };
}

const safeLookup = createSafeLookup();

export type RequestFn = (
  url: URL,
  options: RequestOptions,
  onResponse: (res: IncomingMessage) => void
) => {
  on(event: "error", listener: (err: Error) => void): unknown;
  on(event: "socket", listener: (socket: Socket) => void): unknown;
  end(): unknown;
  destroy(error?: Error): unknown;
};

const defaultRequest: RequestFn = (url, options, onResponse) =>
  (url.protocol === "https:" ? https : http).request(url, options, onResponse);

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Resolve a redirect Location against the current URL and validate it. */
export function nextRedirectUrl(current: URL, location: string | undefined): URL {
  if (!location) {
    throw new SafeFetchError("network", "Redirect without a Location header");
  }
  let target: URL;
  try {
    target = new URL(location, current);
  } catch {
    throw new SafeFetchError("invalid_url", "Redirect to an invalid URL", { reason: "invalid" });
  }
  const check = checkFetchUrl(target);
  if (!check.ok) {
    throw new SafeFetchError(
      check.reason === "address" ? "blocked_address" : "invalid_url",
      "Redirect to a disallowed URL",
      { reason: check.reason }
    );
  }
  return check.url;
}

function decompress(res: IncomingMessage): Readable {
  const encoding = String(res.headers["content-encoding"] ?? "").trim().toLowerCase();
  if (encoding === "gzip" || encoding === "x-gzip") return res.pipe(zlib.createGunzip());
  if (encoding === "deflate") return res.pipe(zlib.createInflate());
  if (encoding === "br") return res.pipe(zlib.createBrotliDecompress());
  return res;
}

/**
 * GET a user-supplied URL safely. Throws SafeFetchError for every failure.
 * `deps` exists for tests; production code never passes it.
 */
export async function safeFetch(
  input: string,
  options: SafeFetchOptions,
  deps: { request?: RequestFn } = {}
): Promise<SafeFetchResult> {
  const request = deps.request ?? defaultRequest;
  const lookup = safeLookup;
  const maxRedirects = options.maxRedirects ?? 5;

  const initial = checkFetchUrl(input);
  if (!initial.ok) {
    throw new SafeFetchError(
      initial.reason === "address" ? "blocked_address" : "invalid_url",
      "This URL is not allowed",
      { reason: initial.reason }
    );
  }

  const deadline = Date.now() + options.timeoutMs;
  let url = initial.url;

  for (let hop = 0; ; hop++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new SafeFetchError("timeout", "Timed out");

    const outcome = await requestOnce(url, options, remaining, request, lookup);
    if (outcome.kind === "redirect") {
      if (hop >= maxRedirects) {
        throw new SafeFetchError("too_many_redirects", "Too many redirects");
      }
      url = nextRedirectUrl(url, outcome.location);
      continue;
    }
    return { ...outcome.result, url: url.toString() };
  }
}

type HopOutcome =
  | { kind: "redirect"; location: string | undefined }
  | { kind: "done"; result: Omit<SafeFetchResult, "url"> };

function requestOnce(
  url: URL,
  options: SafeFetchOptions,
  timeoutMs: number,
  request: RequestFn,
  lookup: LookupFunction
): Promise<HopOutcome> {
  return new Promise<HopOutcome>((resolve, reject) => {
    let settled = false;
    let body: Readable | null = null;

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // `req` is always assigned by now: request callbacks never run synchronously.
      req.destroy();
      body?.destroy();
      reject(toSafeFetchError(error));
    };
    const succeed = (outcome: HopOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(outcome);
    };

    const requestOptions: RequestOptions = {
      method: "GET",
      lookup,
      // A fresh connection per request: no pooled socket whose address was
      // validated for another host, and nothing kept alive afterwards.
      agent: false,
      headers: {
        "User-Agent": IMPORTER_USER_AGENT,
        Accept: options.accept,
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en;q=0.9, nl;q=0.8, *;q=0.5",
      },
    };

    const timer = setTimeout(
      () => fail(new SafeFetchError("timeout", "Timed out")),
      timeoutMs
    );

    const req = request(url, requestOptions, (res) => {
      // Defence in depth: the address actually connected to must be public.
      const remote = res.socket?.remoteAddress;
      if (remote !== undefined && !isPublicIpAddress(remote)) {
        res.resume();
        fail(new SafeFetchError("blocked_address", "Connected to a non-public address"));
        return;
      }

      const status = res.statusCode ?? 0;
      if (REDIRECT_STATUSES.has(status)) {
        res.resume();
        const location = res.headers.location;
        succeed({ kind: "redirect", location: Array.isArray(location) ? location[0] : location });
        req.destroy();
        return;
      }
      if (status < 200 || status >= 300) {
        res.resume();
        fail(new SafeFetchError("http_status", `Upstream answered ${status}`, { status }));
        return;
      }

      const contentType = String(res.headers["content-type"] ?? "").toLowerCase();
      if (options.acceptContentType && !options.acceptContentType(contentType)) {
        res.resume();
        fail(new SafeFetchError("unsupported_content_type", "Unexpected content type"));
        return;
      }

      const declaredLength = Number(res.headers["content-length"]);
      if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
        res.resume();
        fail(new SafeFetchError("too_large", "Response too large"));
        return;
      }

      const chunks: Buffer[] = [];
      let received = 0;
      body = decompress(res);
      body.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > options.maxBytes) {
          fail(new SafeFetchError("too_large", "Response too large"));
          return;
        }
        chunks.push(chunk);
      });
      body.on("error", fail);
      res.on("error", fail);
      res.on("aborted", () => fail(new SafeFetchError("network", "Connection aborted")));
      body.on("end", () =>
        succeed({ kind: "done", result: { status, contentType, body: Buffer.concat(chunks) } })
      );
    });

    req.on("socket", (socket: Socket) => {
      // Refuse before the request is written if the socket somehow connected
      // to a non-public address (e.g. an IP literal that slipped through).
      socket.once("connect", () => {
        if (socket.remoteAddress && !isPublicIpAddress(socket.remoteAddress)) {
          fail(new SafeFetchError("blocked_address", "Connected to a non-public address"));
        }
      });
    });
    req.on("error", fail);
    req.end();
  });
}

function toSafeFetchError(error: unknown): SafeFetchError {
  if (error instanceof SafeFetchError) return error;
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "EAI_NODATA") {
    return new SafeFetchError("not_found_host", "Host not found");
  }
  if (code === "ETIMEDOUT") return new SafeFetchError("timeout", "Timed out");
  return new SafeFetchError("network", "Network error");
}

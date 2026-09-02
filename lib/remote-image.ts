import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

export class RemoteImageError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RemoteImageError";
    this.status = status;
  }
}

function normalizedHostname(hostname: string) {
  const value = hostname.toLowerCase().replace(/\.$/, "");
  return value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
}

function isBlockedIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;

  const [a, b, c] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

function isBlockedIpv6(address: string) {
  const value = address.toLowerCase().split("%")[0];
  if (value === "::" || value === "::1" || value.startsWith("::ffff:")) return true;

  const firstGroup = Number.parseInt(value.split(":")[0] || "0", 16);
  if (!Number.isFinite(firstGroup)) return true;

  return (firstGroup & 0xfe00) === 0xfc00
    || (firstGroup & 0xffc0) === 0xfe80
    || (firstGroup & 0xffc0) === 0xfec0
    || (firstGroup & 0xff00) === 0xff00
    || value.startsWith("2001:db8:");
}

function isBlockedIp(address: string) {
  const kind = isIP(address);
  if (kind === 4) return isBlockedIpv4(address);
  if (kind === 6) return isBlockedIpv6(address);
  return true;
}

async function lookupWithTimeout(hostname: string, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new RemoteImageError("Timed out resolving the confirmed cover host.", 504)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function assertPublicUrl(url: URL, timeoutMs: number) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new RemoteImageError("The confirmed cover URL must use HTTP or HTTPS.");
  }
  if (url.username || url.password) {
    throw new RemoteImageError("The confirmed cover URL cannot include credentials.");
  }

  const hostname = normalizedHostname(url.hostname);
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new RemoteImageError("The confirmed cover URL points to a private or internal host.");
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new RemoteImageError("The confirmed cover URL points to a private or internal address.");
    }
    return;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookupWithTimeout(hostname, timeoutMs);
  } catch (error) {
    if (error instanceof RemoteImageError) throw error;
    throw new RemoteImageError("Could not resolve the confirmed cover host.", 502);
  }

  if (!addresses.length || addresses.some((entry) => isBlockedIp(entry.address))) {
    throw new RemoteImageError("The confirmed cover URL resolved to a private or internal address.");
  }
}

async function readLimitedBody(response: Response) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    throw new RemoteImageError("The confirmed cover image is larger than 5 MB.", 413);
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new RemoteImageError("The confirmed cover image is larger than 5 MB.", 413);
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new RemoteImageError("The confirmed cover image is larger than 5 MB.", 413);
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, totalBytes);
}

export async function fetchPublicImage(value: string) {
  let currentUrl: URL;
  try {
    currentUrl = new URL(value);
  } catch {
    throw new RemoteImageError("A valid confirmed cover URL is required.");
  }

  const deadline = Date.now() + REQUEST_TIMEOUT_MS;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const validationTimeMs = deadline - Date.now();
    if (validationTimeMs <= 0) {
      throw new RemoteImageError("Timed out loading the confirmed cover.", 504);
    }
    await assertPublicUrl(currentUrl, validationTimeMs);

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new RemoteImageError("Timed out loading the confirmed cover.", 504);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remainingMs);

    try {
      const response = await fetch(currentUrl, {
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "ShelfOfFame/1.0" },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new RemoteImageError("The confirmed cover returned an invalid redirect.", 502);
        }
        if (redirectCount >= MAX_REDIRECTS) {
          throw new RemoteImageError("The confirmed cover redirected too many times.", 502);
        }
        try {
          currentUrl = new URL(location, currentUrl);
        } catch {
          throw new RemoteImageError("The confirmed cover returned an invalid redirect.", 502);
        }
        continue;
      }

      if (!response.ok) {
        throw new RemoteImageError("Could not load the confirmed cover.", 502);
      }

      const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "";
      if (!contentType.startsWith("image/")) {
        throw new RemoteImageError("The confirmed cover URL did not return an image.");
      }

      const bytes = await readLimitedBody(response);
      return {
        contentType,
        base64: bytes.toString("base64"),
      };
    } catch (error) {
      if (controller.signal.aborted) {
        throw new RemoteImageError("Timed out loading the confirmed cover.", 504);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new RemoteImageError("The confirmed cover redirected too many times.", 502);
}

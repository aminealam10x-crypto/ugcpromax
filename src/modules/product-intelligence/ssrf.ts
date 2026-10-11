import dns from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { isIP } from "node:net";

export class SsrfError extends Error {
  constructor(message: string, public readonly code: "SSRF_DISALLOWED_TARGET" | "SSRF_INVALID_URL" | "SSRF_DNS_RESOLUTION_FAILED" = "SSRF_DISALLOWED_TARGET") {
    super(message);
    this.name = "SsrfError";
  }
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    throw new SsrfError(`Invalid IPv4 address format: ${ip}`, "SSRF_INVALID_URL");
  }
  return (((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0);
}

function isIpv4InCidr(ipInt: number, cidrIp: string, prefixLen: number): boolean {
  const cidrInt = ipv4ToInt(cidrIp);
  const mask = prefixLen === 0 ? 0 : ((0xffffffff << (32 - prefixLen)) >>> 0);
  return (ipInt & mask) === (cidrInt & mask);
}

const BANNED_IPV4_CIDRS: [string, number][] = [
  ["0.0.0.0", 8], // "This" network
  ["10.0.0.0", 8], // RFC 1918 Private
  ["100.64.0.0", 10], // Shared Address Space (CGNAT)
  ["127.0.0.0", 8], // Loopback
  ["169.254.0.0", 16], // Link-Local / Cloud Metadata (169.254.169.254)
  ["172.16.0.0", 12], // RFC 1918 Private
  ["192.0.0.0", 24], // IETF Protocol Assignments
  ["192.0.2.0", 24], // TEST-NET-1 Documentation
  ["192.88.99.0", 24], // 6to4 Relay Anycast
  ["192.168.0.0", 16], // RFC 1918 Private
  ["198.18.0.0", 15], // Benchmark Testing
  ["198.51.100.0", 24], // TEST-NET-2 Documentation
  ["203.0.113.0", 24], // TEST-NET-3 Documentation
  ["224.0.0.0", 4], // Multicast
  ["240.0.0.0", 4], // Reserved for future use
  ["255.255.255.255", 32], // Broadcast
];

function isPrivateIpv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  return BANNED_IPV4_CIDRS.some(([cidrIp, prefixLen]) => isIpv4InCidr(ipInt, cidrIp, prefixLen));
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;

  // IPv4-mapped IPv6 (::ffff:192.168.1.1 or ::ffff:c0a8:0101)
  if (normalized.startsWith("::ffff:")) {
    const rest = normalized.slice("::ffff:".length);
    if (isIP(rest) === 4) {
      return isPrivateIpv4(rest);
    }
  }

  // Unique local addresses (fc00::/7) -> starts with fc or fd
  if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) return true;

  // Link-local addresses (fe80::/10) -> starts with fe8, fe9, fea, feb
  if (/^fe[89ab][0-9a-f]:/i.test(normalized)) return true;

  // Multicast (ff00::/8) -> starts with ff
  if (/^ff[0-9a-f]{2}:/i.test(normalized)) return true;

  // Discard prefix (100::/64)
  if (normalized.startsWith("100:")) return true;

  // Documentation (2001:db8::/32)
  if (normalized.startsWith("2001:db8:") || normalized.startsWith("2001:0db8:")) return true;

  return false;
}

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true; // Unknown/invalid IP treated as unsafe
}

const BANNED_HOSTNAME_SUFFIXES = [
  ".local",
  ".internal",
  ".localhost",
  ".test",
  ".example",
  ".invalid",
  ".lan",
  ".home",
  ".corp",
];

export async function assertSafeUrl(inputUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    throw new SsrfError("Malformed URL.", "SSRF_INVALID_URL");
  }

  // 1. Strict protocol validation
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SsrfError(`Unsupported protocol '${parsed.protocol}'. Only HTTP and HTTPS are allowed.`, "SSRF_DISALLOWED_TARGET");
  }

  // 2. Reject credentials in URL
  if (parsed.username || parsed.password) {
    throw new SsrfError("Credentials in URLs are disallowed.", "SSRF_DISALLOWED_TARGET");
  }

  // 3. Port restrictions: Only allow default HTTP/HTTPS ports
  const port = parsed.port ? Number.parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;
  if (port !== 80 && port !== 443) {
    throw new SsrfError(`Port ${port} is disallowed. Product URLs must use standard ports 80 or 443.`, "SSRF_DISALLOWED_TARGET");
  }

  const hostname = parsed.hostname.toLowerCase();

  // 4. Hostname validation
  if (!hostname || hostname === "localhost") {
    throw new SsrfError("Localhost targets are disallowed.", "SSRF_DISALLOWED_TARGET");
  }

  // Reject single-label hosts or banned suffixes
  if (!hostname.includes(".") || BANNED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new SsrfError(`Internal and private hostnames ('${hostname}') are disallowed.`, "SSRF_DISALLOWED_TARGET");
  }

  // 5. If hostname is already an IP address literal
  const ipVersion = isIP(hostname);
  if (ipVersion !== 0) {
    if (isPrivateIp(hostname)) {
      throw new SsrfError(`Direct access to private IP address '${hostname}' is disallowed.`, "SSRF_DISALLOWED_TARGET");
    }
    return parsed;
  }

  // 6. DNS resolution check
  let addresses: LookupAddress[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new SsrfError(`DNS resolution failed for host '${hostname}'.`, "SSRF_DNS_RESOLUTION_FAILED");
  }

  if (addresses.length === 0) {
    throw new SsrfError(`No IP addresses resolved for host '${hostname}'.`, "SSRF_DNS_RESOLUTION_FAILED");
  }

  // Verify EVERY resolved IP address to prevent dual-stack DNS rebinding attacks
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new SsrfError(
        `Host '${hostname}' resolved to private/restricted IP address '${address}'. Request blocked for security.`,
        "SSRF_DISALLOWED_TARGET",
      );
    }
  }

  return parsed;
}

export interface OutboundUrlValidationOptions {
  allowHttp?: boolean;
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "metadata",
  "instance-data",
  "169.254.169.254",
]);

const BLOCKED_CIDRS = [
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "100.64.0.0/10",
  "198.18.0.0/15",
];

function ipToUint32(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return (((nums[0]! << 24) | (nums[1]! << 16) | (nums[2]! << 8) | nums[3]!) >>> 0);
}

function isInCidr(ip: string, cidr: string): boolean {
  const slashIdx = cidr.lastIndexOf("/");
  const networkStr = cidr.slice(0, slashIdx);
  const prefix = Number.parseInt(cidr.slice(slashIdx + 1), 10);
  const networkNum = ipToUint32(networkStr);
  const ipNum = ipToUint32(ip);
  if (networkNum === null || ipNum === null) return false;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (networkNum & mask);
}

function isIpv4Literal(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

export function validateOutboundUrl(
  url: string,
  options: OutboundUrlValidationOptions = {},
): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  const allowHttp = options.allowHttp === true;
  if (parsed.protocol !== "https:" && !(allowHttp && parsed.protocol === "http:")) {
    return {
      valid: false,
      error: allowHttp
        ? "Outbound URL must use http or https protocol"
        : "Outbound URL must use https protocol",
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return { valid: false, error: "Outbound URL must have a valid hostname" };
  }

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local")) {
    return { valid: false, error: `Hostname '${hostname}' is blocked for security reasons` };
  }

  if (isIpv4Literal(hostname)) {
    for (const cidr of BLOCKED_CIDRS) {
      if (isInCidr(hostname, cidr)) {
        return {
          valid: false,
          error: `IP address ${hostname} falls in blocked range ${cidr}`,
        };
      }
    }
  }

  return { valid: true };
}

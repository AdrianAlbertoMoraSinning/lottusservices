const dns = require("dns").promises;
const net = require("net");

function isPrivateIp(ip) {
  if (!ip) return true;
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] >= 224) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80:");
  }
  return true;
}

async function assertPublicUrl(input) {
  let u;
  try { u = new URL(input); } catch { throw new Error("Invalid portal URL."); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only HTTP/HTTPS URLs are allowed.");
  if (!u.hostname || u.username || u.password) throw new Error("Unsafe URL.");
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("Local/private hosts are not allowed.");

  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Private IP addresses are not allowed.");
  } else {
    const resolved = await dns.lookup(host, { all: true });
    if (!resolved.length || resolved.some(x => isPrivateIp(x.address))) throw new Error("Host resolves to a private/reserved address.");
  }
  return u;
}

async function safeFetch(input, options = {}, maxRedirects = 5) {
  let current = await assertPublicUrl(input);
  for (let i = 0; i <= maxRedirects; i++) {
    const r = await fetch(current, { ...options, redirect: "manual" });
    if (![301,302,303,307,308].includes(r.status)) return r;
    const location = r.headers.get("location");
    if (!location) return r;
    current = await assertPublicUrl(new URL(location, current).toString());
  }
  throw new Error("Too many redirects.");
}

module.exports = { assertPublicUrl, safeFetch };

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    },
    body: JSON.stringify(body)
  };
}

async function timedFetch(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const started = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...options, redirect: "follow", signal: controller.signal });
    const text = await r.text();
    return {
      ok: r.ok,
      status: r.status,
      ms: Date.now() - started,
      url: r.url,
      headers: Object.fromEntries(r.headers.entries()),
      bytes: Buffer.byteLength(text),
      text
    };
  } finally {
    clearTimeout(timer);
  }
}

function checkSecurityHeaders(headers) {
  const expected = [
    "strict-transport-security",
    "content-security-policy",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy"
  ];
  return expected.map(name => ({ name, present: Boolean(headers[name]), value: headers[name] || null }));
}

function pageChecks(result) {
  const text = result.text || "";
  const lower = text.toLowerCase();
  return {
    hasHtml: /<html[\s>]/i.test(text),
    hasTitle: /<title>[^<]+<\/title>/i.test(text),
    hasViewport: /<meta[^>]+name=["']viewport["']/i.test(text),
    hasDescription: /<meta[^>]+name=["']description["']/i.test(text),
    hasH1: /<h1[\s>]/i.test(text),
    obviousServerError: /(?:internal server error|application error|function invocation failed|502 bad gateway|503 service unavailable)/i.test(text),
    scriptTags: (text.match(/<script\b/gi) || []).length,
    imageTags: (text.match(/<img\b/gi) || []).length,
    containsPasswordField: /type=["']password["']/i.test(text),
    noindex: /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(lower)
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return jsonResponse(204, {});
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  const target = process.env.OCTON_PORTAL_URL || "https://pleasewebportal.netlify.app/";
  let origin;
  try { origin = new URL(target).origin; }
  catch { return jsonResponse(500, { ok: false, error: "OCTON_PORTAL_URL is invalid." }); }

  const configuredPaths = (process.env.OCTON_RUNTIME_PATHS || "/,/service-request.html,/track-request.html")
    .split(",").map(x => x.trim()).filter(Boolean).slice(0, 12);

  const results = [];
  for (const p of configuredPaths) {
    try {
      const url = new URL(p, origin).toString();
      const r = await timedFetch(url);
      const page = pageChecks(r);
      results.push({
        path: p,
        url: r.url,
        ok: r.ok && !page.obviousServerError,
        status: r.status,
        responseMs: r.ms,
        bytes: r.bytes,
        page,
        securityHeaders: checkSecurityHeaders(r.headers)
      });
    } catch (err) {
      results.push({ path: p, ok: false, error: err.message });
    }
  }

  const home = results.find(x => x.path === "/");
  const missingHeaders = home?.securityHeaders?.filter(x => !x.present).map(x => x.name) || [];
  const failed = results.filter(x => !x.ok);
  const slow = results.filter(x => typeof x.responseMs === "number" && x.responseMs > 2500);

  const findings = [];
  for (const x of failed) findings.push({
    severity: "critical",
    category: "runtime",
    title: "Production route failed health check",
    evidence: `${x.path}: ${x.status || x.error || "unknown error"}`
  });
  for (const x of slow) findings.push({
    severity: "medium",
    category: "performance",
    title: "Slow production response",
    evidence: `${x.path}: ${x.responseMs} ms`
  });
  if (missingHeaders.length) findings.push({
    severity: "medium",
    category: "security",
    title: "Recommended browser security headers missing",
    evidence: missingHeaders.join(", ")
  });

  return jsonResponse(200, {
    ok: failed.length === 0,
    mode: "READ_ONLY",
    engine: "Octon Runtime Health v1.2",
    target: origin,
    routesChecked: results.length,
    failedRoutes: failed.length,
    slowRoutes: slow.length,
    results,
    findings,
    limitations: [
      "This is an unauthenticated production smoke check.",
      "Authenticated workflows require a controlled synthetic-test account and dedicated workflow runner.",
      "No production state is modified."
    ],
    generatedAt: new Date().toISOString()
  });
};

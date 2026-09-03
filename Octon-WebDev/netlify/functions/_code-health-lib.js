const pathPosix = require("path").posix;

const STATUS_RANK = { confirmed: 3, probable: 2, needs_verification: 1 };

function verificationStatus(confidence, preferred) {
  if (preferred && STATUS_RANK[preferred]) return preferred;
  const c = Number(confidence);
  if (Number.isFinite(c) && c >= 0.92) return "confirmed";
  if (Number.isFinite(c) && c >= 0.72) return "probable";
  return "needs_verification";
}

function add(out, severity, dimension, title, file, evidence, recommendation, extra = {}) {
  const confidence = extra.confidence ?? 0.85;
  out.push({
    id: `code-${Math.random().toString(36).slice(2, 10)}`,
    fingerprint: extra.fingerprint || `${dimension}|${title}|${file || "repo"}`,
    severity,
    dimension,
    title,
    file: file || null,
    evidence,
    operationalImpact: extra.operationalImpact || null,
    commercialImpact: extra.commercialImpact || null,
    recommendation,
    affectedFiles: file ? [file] : [],
    proposedFix: extra.proposedFix || null,
    tests: extra.tests || [],
    rollback: extra.rollback || null,
    confidence,
    verificationStatus: verificationStatus(confidence, extra.verificationStatus),
    requiresHumanReview: Boolean(extra.requiresHumanReview),
    occurrences: Number(extra.occurrences || 1),
    sources: []
  });
}

function isDynamicRef(ref) {
  return /\$\{|\{\{|<%|%>|\[\[|\]\]/.test(String(ref || ""));
}

function localRef(base, ref) {
  if (!ref) return null;
  const raw = String(ref).trim();
  if (!raw || raw.startsWith("#") || raw.startsWith("//") || isDynamicRef(raw)) return null;

  // Any explicit URI scheme is not a repository-local file. This covers
  // http(s), mailto, tel, sms, data, blob, javascript, ftp, geo, intent, etc.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;

  const cleanRaw = raw.split(/[?#]/)[0];
  if (!cleanRaw) return null;
  let clean;
  try { clean = decodeURIComponent(cleanRaw); } catch { clean = cleanRaw; }

  if (/^\/?(?:\.netlify\/functions|api)\//i.test(clean.replace(/^\/+/, ""))) return null;

  const baseDir = raw.startsWith("/") ? "/" : `/${pathPosix.dirname(base || "")}`;
  const resolved = pathPosix.normalize(pathPosix.join(baseDir, clean.replace(/^\/+/, ""))).replace(/^\/+/, "");
  if (!resolved || resolved === ".") return null;
  return resolved;
}

function looksLikePlaceholder(value) {
  const v = String(value || "").trim();
  return !v || /(?:process\.env|import\.meta\.env|\$\{|\{\{|YOUR[_-]|EXAMPLE|CHANGEME|REPLACE[_-]?ME|\*\*\*)/i.test(v);
}

function detectCredentials(text, path, out) {
  const strong = [
    ["OpenAI-style API key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
    ["Stripe live secret", /\b(?:sk_live_|rk_live_)[A-Za-z0-9]{16,}\b/g],
    ["GitHub token", /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}\b/g],
    ["Webhook signing secret", /\bwhsec_[A-Za-z0-9_-]{16,}\b/g],
    ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/g],
    ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g]
  ];

  for (const [kind, re] of strong) {
    if (re.test(text)) {
      add(out, "critical", "security", "Possible hard-coded credential", path,
        `${kind} pattern detected in source. The credential value is intentionally redacted.`,
        "Verify whether the value is active. If confirmed, remove it from source, rotate it, and keep the replacement only in server-side environment variables.",
        { confidence: 0.97, verificationStatus: "needs_verification", fingerprint: `credential|strong|${path}|${kind}` });
    }
  }

  const assignment = /\b(service[_-]?role(?:[_-]?key)?|private[_-]?key|client[_-]?secret|api[_-]?key|password|access[_-]?token|auth[_-]?token|secret)\b\s*[:=]\s*["']([^"'\r\n]{12,})["']/gi;
  for (const m of text.matchAll(assignment)) {
    const name = m[1];
    const value = m[2];
    if (looksLikePlaceholder(value)) continue;
    add(out, "high", "security", "Sensitive value assigned in source", path,
      `A value assigned to “${name}” looks credential-like. The value is intentionally redacted.`,
      "Human-verify whether this is a live credential or an intentionally non-secret value. If it is a credential, rotate and move it to server-side environment variables.",
      { confidence: 0.62, verificationStatus: "needs_verification", fingerprint: `credential|generic|${path}|${String(name).toLowerCase()}` });
  }
}

function staticNetlifyFunctionRefs(text) {
  const refs = [];
  const literal = /(["'`])([^\r\n]*?\/\.netlify\/functions\/[^\r\n]*?)\1/g;
  for (const m of text.matchAll(literal)) {
    const s = m[2];
    if (isDynamicRef(s) || /["']\s*\+/.test(s)) continue;
    const fn = s.match(/\/\.netlify\/functions\/([A-Za-z0-9_-]+)(?=$|[/?#])/);
    if (fn) refs.push(fn[1]);
  }
  return [...new Set(refs)];
}

function analyze(path, text, treeSet, fnNames, out) {
  detectCredentials(text, path, out);

  if (/\beval\s*\(/.test(text) || /\bnew\s+Function\s*\(/.test(text)) {
    add(out, "high", "security", "Dynamic code execution detected", path,
      "eval() or new Function() is present in executable source.",
      "Replace dynamic execution with explicit code paths unless a reviewed use case requires it.",
      { confidence: 0.97, verificationStatus: "confirmed", fingerprint: `dynamic-exec|${path}` });
  }

  const emptyCatchCount = [...text.matchAll(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/gs)].length;
  if (emptyCatchCount) {
    add(out, "medium", "reliability", "Empty catch block", path,
      `${emptyCatchCount} empty catch block(s) can silently swallow exceptions.`,
      "Record safe telemetry or implement explicit recovery/failure behavior where the exception matters.",
      { confidence: 0.98, verificationStatus: "confirmed", occurrences: emptyCatchCount, fingerprint: "empty-catch" });
  }

  if (/\bconsole\.(?:debug|trace)\s*\(/.test(text)) {
    add(out, "low", "quality", "Debug tracing in production source", path,
      "console.debug/trace detected.", "Remove or gate debug output for production.",
      { confidence: 0.96, verificationStatus: "confirmed", fingerprint: "debug-tracing" });
  }

  if (/\.html?$/i.test(path)) {
    const ids = new Map();
    for (const m of text.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) ids.set(m[1], (ids.get(m[1]) || 0) + 1);
    for (const [id, count] of ids) {
      if (count > 1) add(out, "medium", "frontend", `Duplicate DOM id: ${id}`, path,
        `${count} occurrences of the same DOM id were detected in this document.`, "Make DOM ids unique.",
        { confidence: 0.99, verificationStatus: "confirmed", occurrences: count, fingerprint: `duplicate-id|${id}` });
    }

    const imgs = [...text.matchAll(/<img\b[^>]*>/gi)].map(x => x[0]);
    const missingAlt = imgs.filter(x => !/\balt\s*=/i.test(x)).length;
    if (missingAlt) add(out, "medium", "accessibility", "Images without alt attributes", path,
      `${missingAlt} image(s) lack an alt attribute.`, "Add meaningful alt text or alt=\"\" for decorative images.",
      { confidence: 0.99, verificationStatus: "confirmed", occurrences: missingAlt, fingerprint: "missing-img-alt" });

    for (const m of text.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi)) {
      const ref = m[1];
      const resolved = localRef(path, ref);
      if (!resolved) continue;
      if (!treeSet.has(resolved) && !treeSet.has(`${resolved}/index.html`)) {
        add(out, "high", "frontend", "Possible broken local reference", path,
          `${ref} → ${resolved} was not found in the repository tree.`,
          "Confirm the deployed path. If it is not generated at build time, correct the reference or restore the missing asset.",
          { confidence: 0.88, verificationStatus: "probable", fingerprint: `broken-ref|${resolved}` });
      }
    }
  }

  for (const fnName of staticNetlifyFunctionRefs(text)) {
    if (!fnNames.has(fnName)) {
      add(out, "high", "integration", "Referenced Netlify Function not found", path,
        `Static endpoint /.netlify/functions/${fnName} is referenced but no matching function file was detected.`,
        "Confirm whether the function is generated elsewhere. Otherwise restore/create the function or update the endpoint reference.",
        { confidence: 0.9, verificationStatus: "probable", fingerprint: `missing-netlify-fn|${fnName}` });
    }
  }
}

module.exports = { add, analyze, localRef, staticNetlifyFunctionRefs, detectCredentials, verificationStatus };

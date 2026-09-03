const OWNER_DEFAULT = "AdrianAlbertoMoraSinning";
const REPO_DEFAULT = "Please";

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

async function gh(path, token) {
  const r = await fetch(`https://api.github.com${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "Octon-WebDev-AI-Agent"
    }
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GitHub ${r.status}: ${t.slice(0, 500)}`);
  }
  return r.json();
}

function severityWeight(s) {
  return ({ critical: 25, high: 12, medium: 5, low: 2, info: 0 })[s] || 0;
}

function pushFinding(findings, finding) {
  findings.push({
    id: `${finding.category}-${findings.length + 1}`,
    severity: finding.severity || "medium",
    category: finding.category || "code",
    title: finding.title,
    file: finding.file || null,
    evidence: finding.evidence || null,
    recommendation: finding.recommendation || null
  });
}

function normalizePath(baseFile, ref) {
  if (!ref || ref.startsWith("#") || /^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(ref)) return null;
  const clean = ref.split(/[?#]/)[0].replace(/^\/+/, "");
  const baseParts = baseFile.split("/");
  baseParts.pop();
  const stack = ref.startsWith("/") ? [] : baseParts;
  for (const part of clean.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

function extractLocalRefs(text) {
  const refs = [];
  const rx = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = rx.exec(text))) refs.push(m[1]);
  return refs;
}

function findDuplicateIds(text) {
  const seen = new Map();
  const duplicates = [];
  const rx = /\bid\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = rx.exec(text))) {
    const id = m[1];
    seen.set(id, (seen.get(id) || 0) + 1);
  }
  for (const [id, count] of seen) if (count > 1) duplicates.push({ id, count });
  return duplicates;
}

function analyzeTextFile(file, text, treeSet, functionNames, findings) {
  const p = file.path;
  const lower = p.toLowerCase();

  // Generic code risks.
  const secretPatterns = [
    /(?:sk_live_|rk_live_|whsec_)[A-Za-z0-9_\-]{12,}/,
    /(?:service_role|supabase_service_role)[^A-Za-z0-9]{0,8}[A-Za-z0-9._\-]{24,}/i,
    /(?:api[_-]?key|secret|password)\s*[:=]\s*["'][^"']{12,}["']/i
  ];
  for (const rx of secretPatterns) {
    if (rx.test(text)) {
      pushFinding(findings, {
        severity: "critical", category: "security", title: "Possible hard-coded secret",
        file: p, evidence: "A high-risk credential-like pattern was detected.",
        recommendation: "Remove the value, rotate the credential, and store it only in environment variables."
      });
      break;
    }
  }

  if (/\beval\s*\(/.test(text) || /\bnew\s+Function\s*\(/.test(text)) {
    pushFinding(findings, {
      severity: "high", category: "security", title: "Dynamic code execution detected",
      file: p, evidence: "eval() or new Function() appears in source.",
      recommendation: "Replace dynamic execution with explicit code paths."
    });
  }

  if (/catch\s*\([^)]*\)\s*\{\s*\}/s.test(text)) {
    pushFinding(findings, {
      severity: "medium", category: "reliability", title: "Empty catch block",
      file: p, evidence: "An exception can be swallowed without telemetry or recovery.",
      recommendation: "Log a safe diagnostic and implement an explicit recovery/failure path."
    });
  }

  if (lower.endsWith(".html")) {
    for (const d of findDuplicateIds(text)) {
      pushFinding(findings, {
        severity: "medium", category: "frontend", title: `Duplicate DOM id: ${d.id}`,
        file: p, evidence: `${d.count} occurrences`,
        recommendation: "Make DOM ids unique to avoid selector, label and accessibility bugs."
      });
    }

    const imgs = [...text.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
    const missingAlt = imgs.filter(tag => !/\balt\s*=/i.test(tag)).length;
    if (missingAlt) {
      pushFinding(findings, {
        severity: "medium", category: "accessibility", title: "Images without alt attributes",
        file: p, evidence: `${missingAlt} <img> tag(s) have no alt attribute.`,
        recommendation: "Add meaningful alt text, or alt=\"\" for decorative images."
      });
    }

    const unsafeBlank = [...text.matchAll(/<a\b[^>]*target\s*=\s*["']_blank["'][^>]*>/gi)]
      .filter(m => !/\brel\s*=\s*["'][^"']*(?:noopener|noreferrer)/i.test(m[0])).length;
    if (unsafeBlank) {
      pushFinding(findings, {
        severity: "low", category: "security", title: "target=_blank without rel protection",
        file: p, evidence: `${unsafeBlank} link(s)`,
        recommendation: "Add rel=\"noopener noreferrer\" to external new-tab links."
      });
    }

    for (const ref of extractLocalRefs(text)) {
      const resolved = normalizePath(p, ref);
      if (!resolved) continue;
      if (!treeSet.has(resolved) && !treeSet.has(`${resolved}/index.html`)) {
        // Skip common Netlify route syntax and templated values.
        if (resolved.startsWith(".netlify/") || ref.includes("{{") || ref.includes("${")) continue;
        pushFinding(findings, {
          severity: "high", category: "frontend", title: "Possible broken local asset/page reference",
          file: p, evidence: `${ref} -> ${resolved} not found in repository tree`,
          recommendation: "Correct the path or restore the referenced file."
        });
      }
    }
  }

  // Netlify Function references from frontend source.
  const fnRx = /\/\.netlify\/functions\/([A-Za-z0-9_-]+)/g;
  let fm;
  while ((fm = fnRx.exec(text))) {
    if (!functionNames.has(fm[1])) {
      pushFinding(findings, {
        severity: "high", category: "integration", title: "Referenced Netlify Function not found",
        file: p, evidence: `/.netlify/functions/${fm[1]}`,
        recommendation: "Restore/create the function or update the frontend endpoint reference."
      });
    }
  }

  // Operational smell: permanent debug statements.
  if (/\bconsole\.(?:debug|trace)\s*\(/.test(text)) {
    pushFinding(findings, {
      severity: "low", category: "quality", title: "Debug logging left in production source",
      file: p, evidence: "console.debug/console.trace detected.",
      recommendation: "Remove debug-only output or gate it behind an environment flag."
    });
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") return jsonResponse(204, {});
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) return jsonResponse(500, { ok: false, error: "GITHUB_TOKEN is not configured." });

  try {
    const owner = process.env.OCTON_GITHUB_OWNER || OWNER_DEFAULT;
    const repo = process.env.OCTON_GITHUB_REPO || REPO_DEFAULT;
    const repoMeta = await gh(`/repos/${owner}/${repo}`, token);
    const branch = process.env.OCTON_GITHUB_BRANCH || repoMeta.default_branch || "main";
    const branchMeta = await gh(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`, token);
    const sha = branchMeta.commit.commit.tree.sha;
    const tree = await gh(`/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`, token);

    const blobs = (tree.tree || []).filter(x => x.type === "blob");
    const treeSet = new Set(blobs.map(x => x.path));
    const functionNames = new Set(
      blobs
        .filter(x => /^netlify\/functions\/[^/]+\.(?:js|mjs|cjs)$/i.test(x.path))
        .map(x => x.path.split("/").pop().replace(/\.(?:js|mjs|cjs)$/i, ""))
    );

    const textExt = /\.(?:html?|js|mjs|cjs|css|json|toml|md|sql|txt|webmanifest)$/i;
    const candidates = blobs
      .filter(x => textExt.test(x.path) && (!x.size || x.size <= 250000))
      .sort((a, b) => {
        const pa = /^netlify\/functions\//.test(a.path) ? -2 : /^js\//.test(a.path) ? -1 : 0;
        const pb = /^netlify\/functions\//.test(b.path) ? -2 : /^js\//.test(b.path) ? -1 : 0;
        return pa - pb || a.path.localeCompare(b.path);
      })
      .slice(0, Number(process.env.OCTON_CODE_SCAN_MAX_FILES || 220));

    const findings = [];
    let scannedBytes = 0;
    for (const file of candidates) {
      try {
        const blob = await gh(`/repos/${owner}/${repo}/git/blobs/${file.sha}`, token);
        if (blob.encoding !== "base64" || !blob.content) continue;
        const text = Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString("utf8");
        scannedBytes += Buffer.byteLength(text);
        analyzeTextFile(file, text, treeSet, functionNames, findings);
      } catch (err) {
        pushFinding(findings, {
          severity: "low", category: "scanner", title: "File could not be inspected",
          file: file.path, evidence: err.message,
          recommendation: "Retry the audit; if repeated, inspect GitHub API limits and file encoding."
        });
      }
    }

    // Repository-level checks.
    const packageFile = candidates.find(x => x.path === "package.json");
    if (!packageFile) {
      pushFinding(findings, {
        severity: "medium", category: "quality", title: "No root package.json detected",
        evidence: "Automated test/lint commands may not be centrally defined.",
        recommendation: "Define reproducible check/test scripts for the portal."
      });
    }

    const testFiles = blobs.filter(x => /(^|\/)(tests?|__tests__)\//i.test(x.path) || /\.(?:test|spec)\.[cm]?[jt]s$/i.test(x.path));
    if (testFiles.length === 0) {
      pushFinding(findings, {
        severity: "high", category: "testing", title: "No automated tests detected",
        evidence: "No conventional test files found in the repository tree.",
        recommendation: "Add smoke, API, workflow and regression tests before autonomous code application."
      });
    }

    const counts = findings.reduce((acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    }, {});
    const penalty = findings.reduce((n, f) => n + severityWeight(f.severity), 0);
    const score = Math.max(0, Math.min(100, 100 - Math.round(Math.min(100, penalty) * 0.55)));

    return jsonResponse(200, {
      ok: true,
      mode: "READ_ONLY",
      engine: "Octon Code Health v1.2",
      repository: `${owner}/${repo}`,
      branch,
      commit: branchMeta.commit.sha,
      filesInRepository: blobs.length,
      filesScanned: candidates.length,
      scannedBytes,
      testsDetected: testFiles.length,
      score,
      counts,
      findings: findings.slice(0, 250),
      limitations: [
        "Static review is heuristic and does not prove runtime correctness.",
        "Runtime health, browser workflows, database behavior and third-party services require separate live checks.",
        "No source file is modified by this endpoint."
      ],
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse(500, { ok: false, error: err.message });
  }
};

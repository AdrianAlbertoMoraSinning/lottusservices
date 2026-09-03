const crypto = require("crypto");

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

function appConfigured() {
  return Boolean(
    process.env.GITHUB_APP_ID &&
    process.env.GITHUB_APP_PRIVATE_KEY &&
    process.env.OCTON_GITHUB_APP_SLUG
  );
}

function appJwt() {
  const appId = process.env.GITHUB_APP_ID;
  const rawKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !rawKey) throw new Error("GitHub App credentials are not configured.");

  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iat: now - 60,
    exp: now + 9 * 60,
    iss: String(appId)
  }));
  const input = `${header}.${payload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url");
  return `${input}.${signature}`;
}

async function appRequest(path, options = {}) {
  const jwt = appJwt();
  const r = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "Octon-WebDev-GitHub-App",
      ...(options.headers || {})
    }
  });
  const raw = await r.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
  if (!r.ok) throw new Error(`GitHub App ${r.status}: ${raw.slice(0, 700)}`);
  return data;
}

async function validateInstallation(installationId) {
  const id = String(installationId || "").trim();
  if (!/^\d+$/.test(id)) throw new Error("Invalid GitHub App installation id.");
  return appRequest(`/app/installations/${id}`);
}

async function installationToken(installationId) {
  await validateInstallation(installationId);
  const data = await appRequest(`/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      permissions: { contents: "read", metadata: "read" }
    })
  });
  if (!data.token) throw new Error("GitHub did not return an installation token.");
  return data.token;
}

async function installationRequest(installationId, path, options = {}) {
  const token = await installationToken(installationId);
  const r = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "Octon-WebDev-GitHub-App",
      ...(options.headers || {})
    }
  });
  const raw = await r.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
  if (!r.ok) throw new Error(`GitHub installation ${r.status}: ${raw.slice(0, 700)}`);
  return data;
}

function installationUrl() {
  const slug = process.env.OCTON_GITHUB_APP_SLUG;
  if (!slug) return null;
  return `https://github.com/apps/${encodeURIComponent(slug)}/installations/new`;
}

module.exports = {
  appConfigured,
  appJwt,
  appRequest,
  validateInstallation,
  installationToken,
  installationRequest,
  installationUrl
};

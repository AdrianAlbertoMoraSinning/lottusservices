const { installationToken } = require("./_github-app-lib");

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, authorization"
    },
    body: JSON.stringify(body)
  };
}

function bodyOf(event) {
  try { return event?.body ? JSON.parse(event.body) : {}; } catch { return {}; }
}

function repoConfig(event) {
  const body = bodyOf(event);
  const q = event?.queryStringParameters || {};
  const owner = String(body.owner || q.owner || process.env.OCTON_GITHUB_OWNER || "AdrianAlbertoMoraSinning").trim();
  const repo = String(body.repo || q.repo || process.env.OCTON_GITHUB_REPO || "Please").trim();
  const branch = String(body.branch || q.branch || process.env.OCTON_GITHUB_BRANCH || "main").trim();
  const installationId = String(body.installationId || q.installationId || "").trim() || null;

  if (!/^[A-Za-z0-9_.-]+$/.test(owner)) throw new Error("Invalid repository owner.");
  if (!/^[A-Za-z0-9_.-]+$/.test(repo)) throw new Error("Invalid repository name.");
  if (!/^[A-Za-z0-9_./-]+$/.test(branch)) throw new Error("Invalid branch.");
  if (installationId && !/^\d+$/.test(installationId)) throw new Error("Invalid installation id.");

  return { owner, repo, branch, installationId };
}

async function authToken(installationId) {
  if (installationId) return installationToken(installationId);
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured.");
  return token;
}

async function gh(path, options = {}, installationId = null) {
  const token = await authToken(installationId);
  const r = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "Octon-WebDev-AI-Agent",
      ...(options.headers || {})
    }
  });
  const raw = await r.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${raw.slice(0, 700)}`);
  return data;
}

async function getRecursiveTree(owner, repo, branch, installationId = null) {
  const branchMeta = await gh(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`, {}, installationId);
  const treeSha = branchMeta.commit.commit.tree.sha;
  const tree = await gh(`/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`, {}, installationId);
  return { branchMeta, tree };
}

module.exports = {
  jsonResponse,
  bodyOf,
  repoConfig,
  authToken,
  gh,
  getRecursiveTree
};

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

function repoConfig() {
  return {
    owner: process.env.OCTON_GITHUB_OWNER || "AdrianAlbertoMoraSinning",
    repo: process.env.OCTON_GITHUB_REPO || "Please",
    branch: process.env.OCTON_GITHUB_BRANCH || "main"
  };
}

async function gh(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured.");
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

async function getRecursiveTree(owner, repo, branch) {
  const branchMeta = await gh(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`);
  const treeSha = branchMeta.commit.commit.tree.sha;
  const tree = await gh(`/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
  return { branchMeta, tree };
}

module.exports = { jsonResponse, repoConfig, gh, getRecursiveTree };

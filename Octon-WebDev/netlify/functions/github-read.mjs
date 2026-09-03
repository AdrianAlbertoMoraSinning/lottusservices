import {json,parseBody} from './_shared.mjs';

const PORTALS = {
  please: { repo: 'Please' }
};

async function gh(path){
  const r = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'Octon-WebDev-AI-Agent'
    }
  });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { message: text }; }
  if (!r.ok) {
    const err = new Error(body?.message || `GitHub API ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return body;
}

export async function handler(event){
  if(event.httpMethod !== 'POST') return json(405,{error:'Method not allowed'});
  if(!process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER) return json(503,{error:'GitHub read configuration incomplete'});

  const { portalId='please' } = parseBody(event);
  const portal = PORTALS[portalId];
  if(!portal) return json(404,{error:'Portal is not enabled for live repository inspection'});

  const owner = process.env.GITHUB_OWNER;
  const repo = portal.repo;
  try {
    const meta = await gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
    const branch = meta.default_branch || 'main';
    const tree = await gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
    const files = (tree.tree || []).filter(x => x.type === 'blob').map(x => ({path:x.path,size:x.size ?? null,sha:x.sha}));
    const dirs = new Set(files.map(f => f.path.split('/').slice(0,-1).join('/')).filter(Boolean));
    const extCounts = {};
    for(const f of files){
      const base=f.path.split('/').pop()||'';
      const dot=base.lastIndexOf('.');
      const ext=dot>0?base.slice(dot+1).toLowerCase():'[no-ext]';
      extCounts[ext]=(extCounts[ext]||0)+1;
    }
    return json(200,{
      mode:'live-readonly',
      portalId,
      repository:`${owner}/${repo}`,
      defaultBranch:branch,
      private:Boolean(meta.private),
      archived:Boolean(meta.archived),
      pushedAt:meta.pushed_at,
      updatedAt:meta.updated_at,
      sizeKb:meta.size,
      fileCount:files.length,
      directoryCount:dirs.size,
      truncated:Boolean(tree.truncated),
      extensions:Object.entries(extCounts).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([extension,count])=>({extension,count})),
      sampleFiles:files.slice(0,40),
      permissions:meta.permissions || null,
      checkedAt:new Date().toISOString()
    });
  } catch(e){
    return json(e.status && e.status>=400 && e.status<600 ? e.status : 502,{error:'GitHub read test failed',detail:e.message});
  }
}

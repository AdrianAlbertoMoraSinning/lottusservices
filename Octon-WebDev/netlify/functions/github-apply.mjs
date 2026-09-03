import {json,parseBody,changeHash,verifyApproval} from './_shared.mjs';

const gh = async (url, options={}) => {
  const r=await fetch(`https://api.github.com${url}`,{
    ...options,
    headers:{
      'accept':'application/vnd.github+json',
      'authorization':`Bearer ${process.env.GITHUB_TOKEN}`,
      'x-github-api-version':'2022-11-28',
      'content-type':'application/json',
      ...(options.headers||{})
    }
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.message||`GitHub error ${r.status}`);
  return data;
};

export async function handler(event){
  if(event.httpMethod!=='POST') return json(405,{error:'Method not allowed'});
  if(process.env.OCTON_GITHUB_WRITE_ENABLED!=='true') return json(403,{error:'GitHub writes are disabled by OCTON_GITHUB_WRITE_ENABLED'});
  const secret=process.env.OCTON_APPROVAL_SECRET;
  if(!secret || !process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER) return json(503,{error:'GitHub/approval configuration incomplete'});

  const {approvalToken,change}=parseBody(event);
  if(!change?.portalId || !change?.repo || !change?.path || typeof change?.content!=='string') return json(400,{error:'Complete change payload required'});
  let approval;
  try{ approval=verifyApproval(approvalToken,secret); }catch(e){ return json(403,{error:e.message}); }
  if(approval.changeHash!==changeHash(change) || approval.repo!==change.repo || approval.path!==change.path || approval.portalId!==change.portalId)
    return json(403,{error:'Approved change does not match requested GitHub write'});

  const owner=process.env.GITHUB_OWNER;
  const branch=change.branch||'main';
  const path=change.path.replace(/^\//,'');
  let sha;
  try{
    const existing=await gh(`/repos/${owner}/${change.repo}/contents/${encodeURIComponent(path).replace(/%2F/g,'/')}?ref=${encodeURIComponent(branch)}`);
    sha=existing.sha;
  }catch(e){
    if(!String(e.message).includes('Not Found')) throw e;
  }
  const result=await gh(`/repos/${owner}/${change.repo}/contents/${encodeURIComponent(path).replace(/%2F/g,'/')}`,{
    method:'PUT',
    body:JSON.stringify({
      message:change.commitMessage||`Octon approved update: ${path}`,
      content:Buffer.from(change.content,'utf8').toString('base64'),
      branch,
      ...(sha?{sha}:{})
    })
  });
  return json(200,{ok:true,commitSha:result.commit?.sha,commitUrl:result.commit?.html_url,contentUrl:result.content?.html_url,approvalId:approval.approvalId});
}

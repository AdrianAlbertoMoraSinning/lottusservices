const {jsonResponse,repoConfig,getRecursiveTree,gh}=require("./_github-lib");

exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS") return jsonResponse(204,{});
  if(!["GET","POST"].includes(event.httpMethod)) return jsonResponse(405,{ok:false,error:"Method not allowed"});
  try{
    const {owner,repo,branch}=repoConfig();
    const meta=await gh(`/repos/${owner}/${repo}`);
    const {branchMeta,tree}=await getRecursiveTree(owner,repo,branch);
    const items=tree.tree||[], blobs=items.filter(x=>x.type==="blob"), dirs=items.filter(x=>x.type==="tree");
    const ext={};
    for(const f of blobs){const m=f.path.match(/\.([A-Za-z0-9]+)$/);const k=m?m[1].toLowerCase():"(none)";ext[k]=(ext[k]||0)+1}
    return jsonResponse(200,{
      ok:true,mode:"READ_ONLY",repository:`${owner}/${repo}`,defaultBranch:meta.default_branch,
      branch,commit:branchMeta.commit.sha,files:blobs.length,directories:dirs.length,
      extensionMix:ext,sample:blobs.slice(0,80).map(x=>({path:x.path,size:x.size||null})),
      writeEnabled:String(process.env.OCTON_GITHUB_WRITE_ENABLED||"false").toLowerCase()==="true",
      generatedAt:new Date().toISOString()
    });
  }catch(err){return jsonResponse(500,{ok:false,error:err.message,mode:"READ_ONLY"})}
};

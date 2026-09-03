const {jsonResponse,repoConfig,getRecursiveTree}=require("./_github-lib");

exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="POST")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  try{
    const {owner,repo,branch,installationId}=repoConfig(event);
    const {branchMeta,tree}=await getRecursiveTree(owner,repo,branch,installationId);
    const blobs=(tree.tree||[]).filter(x=>x.type==="blob");
    const textExt=/\.(?:html?|js|mjs|cjs|jsx|ts|tsx|css|scss|json|toml|yaml|yml|md|sql|txt|webmanifest)$/i;
    const max=Math.max(20,Math.min(800,Number(process.env.OCTON_CODE_SCAN_MAX_FILES||600)));
    const allCandidates=blobs.filter(x=>textExt.test(x.path)&&(!x.size||x.size<=350000));
    const candidates=allCandidates.slice(0,max).map(x=>({path:x.path,sha:x.sha,size:x.size||null}));
    const functionNames=blobs
      .filter(x=>/^netlify\/functions\/[^/]+\.(?:js|mjs|cjs)$/i.test(x.path))
      .map(x=>x.path.split("/").pop().replace(/\.(?:js|mjs|cjs)$/i,""));
    return jsonResponse(200,{
      ok:true,mode:"READ_ONLY",engine:"Octon Code Health Planner v1.3",
      repository:`${owner}/${repo}`,owner,repo,branch,installationId:installationId||null,
      commit:branchMeta.commit.sha,
      filesInRepository:blobs.length,
      totalCandidateTextFiles:allCandidates.length,
      plannedFiles:candidates.length,
      truncated:allCandidates.length>candidates.length,
      candidates,
      treePaths:blobs.map(x=>x.path),
      functionNames,
      generatedAt:new Date().toISOString()
    });
  }catch(err){return jsonResponse(500,{ok:false,error:err.message,mode:"READ_ONLY"})}
};

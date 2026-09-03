const {jsonResponse,gh}=require("./_github-lib");

exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="GET")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  try{
    const max=Math.max(10,Math.min(100,Number(process.env.OCTON_REPO_LIST_MAX||100)));
    const items=await gh(`/user/repos?per_page=${max}&sort=updated&affiliation=owner,collaborator,organization_member`);
    const repositories=(Array.isArray(items)?items:[]).map(r=>({
      source:"PRIMARY_TOKEN",
      owner:r.owner?.login||null,
      repo:r.name,
      fullName:r.full_name,
      private:Boolean(r.private),
      defaultBranch:r.default_branch||"main",
      updatedAt:r.updated_at||null
    })).filter(x=>x.owner&&x.repo);
    return jsonResponse(200,{ok:true,mode:"READ_ONLY",repositories,generatedAt:new Date().toISOString()});
  }catch(err){return jsonResponse(500,{ok:false,error:err.message,mode:"READ_ONLY"})}
};

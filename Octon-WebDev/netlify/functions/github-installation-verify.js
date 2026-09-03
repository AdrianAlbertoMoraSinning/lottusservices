const {jsonResponse}=require("./_github-lib");
const {validateInstallation,installationRequest}=require("./_github-app-lib");

exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="POST")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  let b={};try{b=JSON.parse(event.body||"{}")}catch{return jsonResponse(400,{ok:false,error:"Invalid JSON"})}
  try{
    const installationId=String(b.installationId||"").trim();
    const installation=await validateInstallation(installationId);
    const data=await installationRequest(installationId,"/installation/repositories?per_page=100");
    const repositories=(data.repositories||[]).map(r=>({
      source:"GITHUB_APP",
      installationId,
      owner:r.owner?.login||installation.account?.login||null,
      repo:r.name,
      fullName:r.full_name,
      private:Boolean(r.private),
      defaultBranch:r.default_branch||"main",
      updatedAt:r.updated_at||null
    }));
    return jsonResponse(200,{
      ok:true,mode:"READ_ONLY",installationId,
      account:{login:installation.account?.login||null,type:installation.account?.type||null},
      repositorySelection:installation.repository_selection||null,
      permissions:installation.permissions||{},
      repositories,
      generatedAt:new Date().toISOString()
    });
  }catch(err){return jsonResponse(403,{ok:false,error:err.message,mode:"READ_ONLY"})}
};

const crypto=require("crypto");
const {jsonResponse}=require("./_github-lib");
const {appConfigured,installationUrl,appRequest}=require("./_github-app-lib");

exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="GET")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  const enabled=appConfigured();
  const base=installationUrl();
  const state=crypto.randomBytes(18).toString("base64url");
  let permissions={},permissionSource="not_configured";
  let appName=null;
  if(enabled){
    try{
      const live=await appRequest("/app");
      permissions=live.permissions||{};
      appName=live.name||null;
      permissionSource="github_live";
    }catch(err){
      permissions={};
      permissionSource="github_unavailable";
    }
  }
  return jsonResponse(200,{
    ok:true,
    enabled,
    installUrl:enabled&&base?`${base}?state=${encodeURIComponent(state)}`:null,
    appSlug:process.env.OCTON_GITHUB_APP_SLUG||null,
    appName,
    permissions,
    permissionSource,
    stateCorrelation:"best_effort",
    note:enabled
      ?"Permissions are read live from GitHub when available. The repository owner chooses which repositories Octon may read during installation."
      :"Configure GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY and OCTON_GITHUB_APP_SLUG to enable external repository authorization."
  });
};

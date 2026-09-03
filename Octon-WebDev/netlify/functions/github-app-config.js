const crypto=require("crypto");
const {jsonResponse}=require("./_github-lib");
const {appConfigured,installationUrl}=require("./_github-app-lib");

exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="GET")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  const enabled=appConfigured();
  const base=installationUrl();
  const state=crypto.randomBytes(18).toString("base64url");
  return jsonResponse(200,{
    ok:true,
    enabled,
    installUrl:enabled&&base?`${base}?state=${encodeURIComponent(state)}`:null,
    appSlug:process.env.OCTON_GITHUB_APP_SLUG||null,
    permissions:["metadata:read","contents:read"],
    note:enabled
      ?"The repository owner chooses which repositories Octon may read during GitHub App installation."
      :"Configure GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY and OCTON_GITHUB_APP_SLUG to enable external repository authorization."
  });
};

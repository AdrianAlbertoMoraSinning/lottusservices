const {jsonResponse}=require("./_github-lib");
const {appConfigured}=require("./_github-app-lib");

exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="GET")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  return jsonResponse(200,{
    ok:true,
    version:"1.4",
    mode:"READ_ONLY",
    capabilities:{
      githubAppConfigured:appConfigured(),
      openAIConfigured:Boolean(process.env.OPENAI_API_KEY),
      researchModel:process.env.OPENAI_API_KEY?(process.env.OCTON_RESEARCH_MODEL||null):null,
      pageSpeedApiKeyConfigured:Boolean(process.env.GOOGLE_PAGESPEED_API_KEY),
      approvalSecretConfigured:Boolean(process.env.OCTON_APPROVAL_SECRET),
      writeEnabled:String(process.env.OCTON_GITHUB_WRITE_ENABLED||"false").toLowerCase()==="true"
    },
    note:"Capability flags expose configuration state only. Secret values are never returned.",
    generatedAt:new Date().toISOString()
  });
};

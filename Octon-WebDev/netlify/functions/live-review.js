const {jsonResponse}=require("./_research-lib");
exports.handler=async function(event){
  return jsonResponse(200,{
    ok:true,mode:"READ_ONLY",version:"1.3",engine:"Octon Browser-Orchestrated Live Review",
    message:"v1.3 runs review components from the dashboard so each stage can report progress and one long Netlify Function cannot fail the complete review.",
    stages:["repository","code-health","runtime","portal-seo","pagespeed","technical-research","market-research","regulatory-research"],
    generatedAt:new Date().toISOString()
  });
};

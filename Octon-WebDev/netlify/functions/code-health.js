const {jsonResponse}=require("./_github-lib");
exports.handler=async function(event){
  return jsonResponse(200,{
    ok:true,mode:"READ_ONLY",deprecated:true,engine:"Octon Code Health v1.5",
    message:"The dashboard now uses chunked /api/code-health-plan + /api/code-health-batch so progress is visible and long repository scans do not depend on one long Netlify request."
  });
};

const {jsonResponse}=require("./_research-lib");
exports.handler=async function(event){
  return jsonResponse(200,{ok:true,version:"1.2",mode:"READ_ONLY",message:"Baseline audit retired. Use /api/live-review for the integrated PLEASE review.",deprecated:true});
};

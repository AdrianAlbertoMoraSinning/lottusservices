const crypto=require("crypto");
const {jsonResponse}=require("./_github-lib");
exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="POST")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  let b={};try{b=JSON.parse(event.body||"{}")}catch{return jsonResponse(400,{ok:false,error:"Invalid JSON"})}
  if(!b.path||typeof b.content!=="string")return jsonResponse(400,{ok:false,error:"path and content are required"});
  const changeHash=crypto.createHash("sha256").update(`${b.path}\n${b.content}`).digest("hex");
  return jsonResponse(200,{ok:true,changeHash,path:b.path,note:"Approval must be bound to this exact hash."});
};

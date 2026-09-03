const crypto=require("crypto");
const {jsonResponse}=require("./_github-lib");
function b64(x){return Buffer.from(x).toString("base64url")}
exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="POST")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  const secret=process.env.OCTON_APPROVAL_SECRET;if(!secret)return jsonResponse(500,{ok:false,error:"OCTON_APPROVAL_SECRET is not configured"});
  let b={};try{b=JSON.parse(event.body||"{}")}catch{return jsonResponse(400,{ok:false,error:"Invalid JSON"})}
  if(!b.changeHash||!b.approvedBy)return jsonResponse(400,{ok:false,error:"changeHash and approvedBy are required"});
  const exp=Date.now()+Math.min(60,Math.max(5,Number(b.minutes||20)))*60000;
  const payload={changeHash:String(b.changeHash),approvedBy:String(b.approvedBy),exp,issuedAt:Date.now()};
  const p=b64(JSON.stringify(payload)),sig=crypto.createHmac("sha256",secret).update(p).digest("base64url");
  return jsonResponse(200,{ok:true,token:`${p}.${sig}`,approval:payload,warning:"This token is bound only to the exact changeHash and expires."});
};

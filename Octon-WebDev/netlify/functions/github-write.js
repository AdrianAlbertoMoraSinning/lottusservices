const crypto=require("crypto");
const {jsonResponse,repoConfig,gh}=require("./_github-lib");
function hash(content){return crypto.createHash("sha256").update(content).digest("hex")}
function verify(token,changeHash,secret){
  if(!token||!secret)return{ok:false,error:"Missing approval token/secret"};const [p,s]=String(token).split(".");if(!p||!s)return{ok:false,error:"Malformed approval token"};
  const expected=crypto.createHmac("sha256",secret).update(p).digest("base64url");
  if(s.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(expected)))return{ok:false,error:"Invalid approval signature"};
  let x;try{x=JSON.parse(Buffer.from(p,"base64url").toString("utf8"))}catch{return{ok:false,error:"Invalid approval payload"}}
  if(Date.now()>x.exp)return{ok:false,error:"Approval expired"};if(x.changeHash!==changeHash)return{ok:false,error:"Approval does not match exact change hash"};return{ok:true,payload:x}
}
exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="POST")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  if(String(process.env.OCTON_GITHUB_WRITE_ENABLED||"false").toLowerCase()!=="true")return jsonResponse(403,{ok:false,error:"GitHub write switch is OFF. Safe state preserved."});
  let b={};try{b=JSON.parse(event.body||"{}")}catch{return jsonResponse(400,{ok:false,error:"Invalid JSON"})}
  if(!b.path||typeof b.content!=="string")return jsonResponse(400,{ok:false,error:"path and content are required"});
  const changeHash=hash(`${b.path}\n${b.content}`),v=verify(b.approvalToken,changeHash,process.env.OCTON_APPROVAL_SECRET);
  if(!v.ok)return jsonResponse(403,{ok:false,error:v.error,changeHash});
  try{
    const {owner,repo,branch}=repoConfig();let currentSha=null;
    try{const cur=await gh(`/repos/${owner}/${repo}/contents/${encodeURIComponent(b.path).replace(/%2F/g,"/")}?ref=${encodeURIComponent(branch)}`);currentSha=cur.sha||null}catch(err){if(!String(err.message).includes("404"))throw err}
    const payload={message:b.message||`Octon approved change: ${b.path}`,content:Buffer.from(b.content).toString("base64"),branch};if(currentSha)payload.sha=currentSha;
    const result=await gh(`/repos/${owner}/${repo}/contents/${encodeURIComponent(b.path).replace(/%2F/g,"/")}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    return jsonResponse(200,{ok:true,repository:`${owner}/${repo}`,branch,path:b.path,changeHash,approvedBy:v.payload.approvedBy,commit:result.commit?.sha||null});
  }catch(err){return jsonResponse(500,{ok:false,error:err.message,changeHash})}
};

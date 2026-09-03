const {jsonResponse,gh}=require("./_github-lib");
const {add,analyze}=require("./_code-health-lib");

async function limitedMap(items,limit,fn){
  const results=new Array(items.length);let next=0;
  async function worker(){
    while(true){const i=next++;if(i>=items.length)return;results[i]=await fn(items[i],i)}
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
  return results;
}

exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(event.httpMethod!=="POST")return jsonResponse(405,{ok:false,error:"Method not allowed"});
  let b={};try{b=JSON.parse(event.body||"{}")}catch{return jsonResponse(400,{ok:false,error:"Invalid JSON"})}
  try{
    const owner=String(b.owner||""),repo=String(b.repo||""),installationId=b.installationId?String(b.installationId):null;
    if(!/^[A-Za-z0-9_.-]+$/.test(owner)||!/^[A-Za-z0-9_.-]+$/.test(repo))throw new Error("Invalid repository.");
    const files=Array.isArray(b.files)?b.files.slice(0,24):[];
    if(!files.length)return jsonResponse(400,{ok:false,error:"No files supplied for batch scan."});
    const treeSet=new Set(Array.isArray(b.treePaths)?b.treePaths:[]);
    const fnNames=new Set(Array.isArray(b.functionNames)?b.functionNames:[]);
    const findings=[];let bytes=0,scanned=0,errors=0;

    await limitedMap(files,8,async(file)=>{
      try{
        if(!file?.sha||!file?.path)return;
        const blob=await gh(`/repos/${owner}/${repo}/git/blobs/${file.sha}`,{},installationId);
        if(blob.encoding!=="base64"||!blob.content)return;
        const text=Buffer.from(blob.content.replace(/\n/g,""),"base64").toString("utf8");
        bytes+=Buffer.byteLength(text);scanned++;
        analyze(file.path,text,treeSet,fnNames,findings);
      }catch(err){
        errors++;
        add(findings,"low","scanner","File could not be inspected",file?.path||null,err.message,"Retry the file during a later audit.",{
          confidence:.95,verificationStatus:"needs_verification",fingerprint:`scanner-error|${file?.path||"unknown"}`
        });
      }
    });

    return jsonResponse(200,{
      ok:true,mode:"READ_ONLY",engine:"Octon Code Health Batch v1.4",
      scanned,requested:files.length,errors,scannedBytes:bytes,findings,generatedAt:new Date().toISOString()
    });
  }catch(err){return jsonResponse(500,{ok:false,error:err.message,mode:"READ_ONLY"})}
};

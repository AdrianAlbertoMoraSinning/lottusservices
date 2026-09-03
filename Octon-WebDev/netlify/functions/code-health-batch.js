const {jsonResponse,gh}=require("./_github-lib");

function add(out,severity,dimension,title,file,evidence,recommendation,extra={}){
  out.push({
    id:`code-${Math.random().toString(36).slice(2,10)}`,severity,dimension,title,file:file||null,evidence,
    operationalImpact:extra.operationalImpact||null,commercialImpact:extra.commercialImpact||null,
    recommendation,affectedFiles:file?[file]:[],proposedFix:extra.proposedFix||null,tests:extra.tests||[],
    rollback:extra.rollback||null,confidence:extra.confidence??0.85,requiresHumanReview:false,sources:[]
  });
}
function localRef(base,ref){
  if(!ref||ref.startsWith("#")||/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(ref))return null;
  const clean=ref.split(/[?#]/)[0],stack=ref.startsWith("/")?[]:base.split("/").slice(0,-1);
  for(const p of clean.replace(/^\/+/,"").split("/")){if(!p||p===".")continue;if(p==="..")stack.pop();else stack.push(p)}
  return stack.join("/");
}
function analyze(path,text,treeSet,fnNames,out){
  if(/(?:sk_live_|rk_live_|whsec_)[A-Za-z0-9_-]{12,}/.test(text) ||
     /(?:service_role|api[_-]?key|secret|password)\s*[:=]\s*["'][^"']{16,}["']/i.test(text)){
    add(out,"critical","security","Possible hard-coded credential",path,"Credential-like value detected in source.","Remove and rotate the credential; keep secrets only in environment variables.",{confidence:.72});
  }
  if(/\beval\s*\(/.test(text)||/\bnew\s+Function\s*\(/.test(text))add(out,"high","security","Dynamic code execution detected",path,"eval() or new Function() detected.","Replace dynamic execution with explicit code paths.");
  if(/catch\s*\([^)]*\)\s*\{\s*\}/s.test(text))add(out,"medium","reliability","Empty catch block",path,"An exception can be silently swallowed.","Record safe telemetry and implement explicit recovery/failure behavior.");
  if(/\bconsole\.(?:debug|trace)\s*\(/.test(text))add(out,"low","quality","Debug tracing in production source",path,"console.debug/trace detected.","Remove or gate debug output.");

  if(/\.html?$/i.test(path)){
    const ids=new Map();
    for(const m of text.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi))ids.set(m[1],(ids.get(m[1])||0)+1);
    for(const [id,c] of ids)if(c>1)add(out,"medium","frontend",`Duplicate DOM id: ${id}`,path,`${c} occurrences.`,"Make DOM ids unique.");
    const imgs=[...text.matchAll(/<img\b[^>]*>/gi)].map(x=>x[0]);
    const miss=imgs.filter(x=>!/\balt\s*=/i.test(x)).length;
    if(miss)add(out,"medium","accessibility","Images without alt attributes",path,`${miss} image(s) lack alt.`,"Add meaningful alt text or alt=\"\" for decorative images.");
    for(const m of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)){
      const ref=m[1],resolved=localRef(path,ref);
      if(!resolved||resolved.startsWith(".netlify/")||ref.includes("{{")||ref.includes("${"))continue;
      if(!treeSet.has(resolved)&&!treeSet.has(`${resolved}/index.html`)){
        add(out,"high","frontend","Possible broken local reference",path,`${ref} -> ${resolved} not found in repository tree.`,"Correct the path or restore the referenced file.",{confidence:.9});
      }
    }
  }
  for(const m of text.matchAll(/\/\.netlify\/functions\/([A-Za-z0-9_-]+)/g)){
    if(!fnNames.has(m[1]))add(out,"high","integration","Referenced Netlify Function not found",path,`/.netlify/functions/${m[1]} is referenced but no matching function file was detected.`,"Restore/create the function or update the endpoint reference.");
  }
}

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
        add(findings,"low","scanner","File could not be inspected",file?.path||null,err.message,"Retry the file during a later audit.",{confidence:.95});
      }
    });

    return jsonResponse(200,{
      ok:true,mode:"READ_ONLY",engine:"Octon Code Health Batch v1.3",
      scanned,requested:files.length,errors,scannedBytes:bytes,findings,generatedAt:new Date().toISOString()
    });
  }catch(err){return jsonResponse(500,{ok:false,error:err.message,mode:"READ_ONLY"})}
};

const {jsonResponse,repoConfig,getRecursiveTree,gh}=require("./_github-lib");

function add(out,severity,dimension,title,file,evidence,recommendation,extra={}){
  out.push({id:`code-${out.length+1}`,severity,dimension,title,file:file||null,evidence,recommendation,
    operationalImpact:extra.operationalImpact||null,commercialImpact:extra.commercialImpact||null,
    affectedFiles:file?[file]:[],proposedFix:extra.proposedFix||null,tests:extra.tests||[],rollback:extra.rollback||null,
    confidence:extra.confidence??0.85,requiresHumanReview:false,sources:[]});
}
function localRef(base,ref){
  if(!ref||ref.startsWith("#")||/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(ref)) return null;
  const clean=ref.split(/[?#]/)[0]; const stack=ref.startsWith("/")?[]:base.split("/").slice(0,-1);
  for(const p of clean.replace(/^\/+/,"").split("/")){if(!p||p===".")continue;if(p==="..")stack.pop();else stack.push(p)}
  return stack.join("/");
}
function analyze(path,text,treeSet,fnNames,out){
  if(/(?:sk_live_|rk_live_|whsec_)[A-Za-z0-9_-]{12,}/.test(text) ||
     /(?:service_role|api[_-]?key|secret|password)\s*[:=]\s*["'][^"']{16,}["']/i.test(text)){
    add(out,"critical","security","Possible hard-coded credential",path,"Credential-like value detected in source.","Remove and rotate the credential; keep secrets only in environment variables.",{confidence:.72});
  }
  if(/\beval\s*\(/.test(text)||/\bnew\s+Function\s*\(/.test(text)) add(out,"high","security","Dynamic code execution detected",path,"eval() or new Function() detected.","Replace with explicit code paths.");
  if(/catch\s*\([^)]*\)\s*\{\s*\}/s.test(text)) add(out,"medium","reliability","Empty catch block",path,"An exception can be silently swallowed.","Record safe telemetry and implement an explicit recovery or failure path.");
  if(/\bconsole\.(?:debug|trace)\s*\(/.test(text)) add(out,"low","quality","Debug tracing in production source",path,"console.debug/trace detected.","Remove or gate debug output.");

  if(/\.html?$/i.test(path)){
    const ids=new Map(); for(const m of text.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi))ids.set(m[1],(ids.get(m[1])||0)+1);
    for(const [id,c] of ids) if(c>1) add(out,"medium","frontend",`Duplicate DOM id: ${id}`,path,`${c} occurrences.`,"Make DOM ids unique.");
    const imgs=[...text.matchAll(/<img\b[^>]*>/gi)].map(x=>x[0]);
    const miss=imgs.filter(x=>!/\balt\s*=/i.test(x)).length;
    if(miss) add(out,"medium","accessibility","Images without alt attributes",path,`${miss} image(s) lack alt.`,"Add meaningful alt text or alt=\"\" for decorative images.");
    for(const m of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)){
      const ref=m[1], resolved=localRef(path,ref);
      if(!resolved||resolved.startsWith(".netlify/")||ref.includes("{{")||ref.includes("${")) continue;
      if(!treeSet.has(resolved)&&!treeSet.has(`${resolved}/index.html`)){
        add(out,"high","frontend","Possible broken local reference",path,`${ref} -> ${resolved} not found in repository tree.`,"Correct the path or restore the referenced file.",{affectedFiles:[path,resolved]});
      }
    }
  }

  for(const m of text.matchAll(/\/\.netlify\/functions\/([A-Za-z0-9_-]+)/g)){
    if(!fnNames.has(m[1])) add(out,"high","integration","Referenced Netlify Function not found",path,`/.netlify/functions/${m[1]} is referenced but no function file was detected.`,"Restore/create the function or update the endpoint reference.");
  }
}

exports.handler=async function(event){
  if(event.httpMethod==="OPTIONS")return jsonResponse(204,{});
  if(!["GET","POST"].includes(event.httpMethod))return jsonResponse(405,{ok:false,error:"Method not allowed"});
  try{
    const {owner,repo,branch}=repoConfig();
    const {branchMeta,tree}=await getRecursiveTree(owner,repo,branch);
    const blobs=(tree.tree||[]).filter(x=>x.type==="blob"), treeSet=new Set(blobs.map(x=>x.path));
    const fnNames=new Set(blobs.filter(x=>/^netlify\/functions\/[^/]+\.(?:js|mjs|cjs)$/i.test(x.path)).map(x=>x.path.split("/").pop().replace(/\.(?:js|mjs|cjs)$/i,"")));
    const textExt=/\.(?:html?|js|mjs|cjs|css|json|toml|md|sql|txt|webmanifest)$/i;
    const max=Math.max(20,Math.min(400,Number(process.env.OCTON_CODE_SCAN_MAX_FILES||260)));
    const candidates=blobs.filter(x=>textExt.test(x.path)&&(!x.size||x.size<=300000))
      .sort((a,b)=>(/^netlify\/functions\//.test(a.path)?-2:0)-(/^netlify\/functions\//.test(b.path)?-2:0)||a.path.localeCompare(b.path)).slice(0,max);
    const findings=[]; let bytes=0;
    for(const file of candidates){
      try{
        const blob=await gh(`/repos/${owner}/${repo}/git/blobs/${file.sha}`);
        if(blob.encoding!=="base64"||!blob.content)continue;
        const text=Buffer.from(blob.content.replace(/\n/g,""),"base64").toString("utf8");bytes+=Buffer.byteLength(text);
        analyze(file.path,text,treeSet,fnNames,findings);
      }catch(err){add(findings,"low","scanner","File could not be inspected",file.path,err.message,"Retry the audit and inspect API limits if repeated.",{confidence:.95})}
    }
    const tests=blobs.filter(x=>/(^|\/)(tests?|__tests__)\//i.test(x.path)||/\.(?:test|spec)\.[cm]?[jt]s$/i.test(x.path));
    if(!tests.length)add(findings,"high","testing","No automated tests detected",null,"No conventional automated test files were found.","Add smoke, API, workflow and regression tests before autonomous code application.",{confidence:.95});
    const counts=findings.reduce((a,f)=>(a[f.severity]=(a[f.severity]||0)+1,a),{});
    const weights={critical:25,high:12,medium:5,low:2,info:0};
    const penalty=findings.reduce((n,f)=>n+(weights[f.severity]||0),0);
    const score=Math.max(0,100-Math.min(100,Math.round(penalty*.55)));
    return jsonResponse(200,{ok:true,mode:"READ_ONLY",engine:"Octon Code Health v1.2",repository:`${owner}/${repo}`,branch,
      commit:branchMeta.commit.sha,filesInRepository:blobs.length,filesScanned:candidates.length,scannedBytes:bytes,testsDetected:tests.length,
      score,counts,findings:findings.slice(0,300),
      limitations:["Static analysis is heuristic and does not prove runtime correctness.","Authenticated workflows and database behavior require controlled synthetic tests."],
      generatedAt:new Date().toISOString()});
  }catch(err){return jsonResponse(500,{ok:false,error:err.message,mode:"READ_ONLY"})}
};
